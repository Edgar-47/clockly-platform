from __future__ import annotations

from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import time
from typing import Any, BinaryIO, Protocol

from app.core.config import get_settings


class StorageBackendError(Exception):
    """Base error for storage backends."""


class StorageConfigurationError(StorageBackendError):
    """Raised when the selected storage backend is not configured correctly."""


class StorageNotFoundError(StorageBackendError):
    """Raised when an object does not exist in the selected storage backend."""


class StorageUnsupportedOperation(StorageBackendError):
    """Raised when a backend does not support an optional storage operation."""


@dataclass(slots=True)
class StoredObject:
    body: BinaryIO
    content_type: str | None = None
    content_length: int | None = None
    etag: str | None = None

    def iter_chunks(self, chunk_size: int = 64 * 1024) -> Iterator[bytes]:
        try:
            while True:
                chunk = self.body.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            close = getattr(self.body, "close", None)
            if callable(close):
                close()


class StorageBackend(Protocol):
    name: str

    def upload_file(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> None:
        ...

    def download_file(self, key: str) -> StoredObject:
        ...

    def delete_file(self, key: str) -> None:
        ...

    def exists(self, key: str) -> bool:
        ...

    def generate_private_access(self, key: str, *, expires_in_seconds: int = 300) -> str:
        ...


class LocalStorageBackend:
    """Private filesystem storage for development and tests only."""

    name = "local"

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def upload_file(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> None:
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def download_file(self, key: str) -> StoredObject:
        path = self._path_for_key(key)
        if not path.is_file():
            raise StorageNotFoundError("Storage object was not found.")
        return StoredObject(body=path.open("rb"), content_length=path.stat().st_size)

    def delete_file(self, key: str) -> None:
        path = self._path_for_key(key)
        for attempt in range(5):
            try:
                path.unlink(missing_ok=True)
                return
            except PermissionError as exc:
                if attempt == 4:
                    raise StorageBackendError("Local storage delete failed.") from exc
                time.sleep(0.05)

    def exists(self, key: str) -> bool:
        return self._path_for_key(key).is_file()

    def generate_private_access(self, key: str, *, expires_in_seconds: int = 300) -> str:
        raise StorageUnsupportedOperation("Local storage does not generate signed URLs.")

    def _path_for_key(self, key: str) -> Path:
        clean_key = validate_object_key(key)
        path = (self.root / clean_key).resolve()
        try:
            path.relative_to(self.root)
        except ValueError as exc:
            raise StorageBackendError("Storage key escapes local storage root.") from exc
        return path


class R2StorageBackend:
    """Cloudflare R2 backend using the S3-compatible API."""

    name = "r2"

    def __init__(
        self,
        *,
        bucket: str,
        endpoint_url: str,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        region: str = "auto",
        client: Any | None = None,
    ) -> None:
        self.bucket = bucket
        self.endpoint_url = endpoint_url
        self.region = region
        self._client = client or self._build_client(
            endpoint_url=endpoint_url,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            region=region,
        )

    def upload_file(
        self,
        key: str,
        content: bytes,
        *,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> None:
        clean_key = validate_object_key(key)
        put_args: dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": clean_key,
            "Body": content,
        }
        if content_type:
            put_args["ContentType"] = content_type
        if metadata:
            put_args["Metadata"] = {str(k): str(v) for k, v in metadata.items()}
        try:
            self._client.put_object(**put_args)
        except Exception as exc:  # boto3/botocore exceptions are optional at import time.
            raise StorageBackendError("Storage upload failed.") from exc

    def download_file(self, key: str) -> StoredObject:
        clean_key = validate_object_key(key)
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=clean_key)
        except Exception as exc:
            if _is_not_found_error(exc):
                raise StorageNotFoundError("Storage object was not found.") from exc
            raise StorageBackendError("Storage download failed.") from exc

        body = response.get("Body")
        if body is None:
            raise StorageBackendError("Storage download returned no body.")
        return StoredObject(
            body=body,
            content_type=response.get("ContentType"),
            content_length=response.get("ContentLength"),
            etag=response.get("ETag"),
        )

    def delete_file(self, key: str) -> None:
        clean_key = validate_object_key(key)
        try:
            self._client.delete_object(Bucket=self.bucket, Key=clean_key)
        except Exception as exc:
            raise StorageBackendError("Storage delete failed.") from exc

    def exists(self, key: str) -> bool:
        clean_key = validate_object_key(key)
        try:
            self._client.head_object(Bucket=self.bucket, Key=clean_key)
        except Exception as exc:
            if _is_not_found_error(exc):
                return False
            raise StorageBackendError("Storage exists check failed.") from exc
        return True

    def generate_private_access(self, key: str, *, expires_in_seconds: int = 300) -> str:
        clean_key = validate_object_key(key)
        if expires_in_seconds <= 0 or expires_in_seconds > 3600:
            raise StorageBackendError("Private access expiry must be between 1 and 3600 seconds.")
        try:
            return str(
                self._client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket, "Key": clean_key},
                    ExpiresIn=expires_in_seconds,
                )
            )
        except Exception as exc:
            raise StorageBackendError("Storage private access generation failed.") from exc

    @staticmethod
    def _build_client(
        *,
        endpoint_url: str,
        access_key_id: str | None,
        secret_access_key: str | None,
        region: str,
    ) -> Any:
        if not access_key_id or not secret_access_key:
            raise StorageConfigurationError("R2 credentials are required.")
        try:
            import boto3
            from botocore.config import Config
        except ModuleNotFoundError as exc:
            raise StorageConfigurationError("boto3 is required when CLOCKLY_STORAGE_BACKEND=r2.") from exc

        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )


def validate_object_key(key: str) -> str:
    clean = key.strip()
    if not clean:
        raise StorageBackendError("Storage key cannot be empty.")
    if clean.startswith("/") or "\\" in clean:
        raise StorageBackendError("Storage key must be relative and use forward slashes.")
    parts = clean.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise StorageBackendError("Storage key contains an unsafe path segment.")
    if len(clean) > 500:
        raise StorageBackendError("Storage key is too long.")
    return clean


@lru_cache
def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend == "local":
        return LocalStorageBackend(_resolve_local_root(settings.storage_local_root))
    if settings.storage_backend == "r2":
        return R2StorageBackend(
            bucket=settings.s3_bucket or "",
            endpoint_url=settings.s3_endpoint_url or "",
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
            region=settings.s3_region,
        )
    raise StorageConfigurationError(f"Unsupported storage backend: {settings.storage_backend}")


def _resolve_local_root(value: str) -> Path:
    root = Path(value)
    if root.is_absolute():
        return root
    backend_dir = Path(__file__).resolve().parents[2]
    return backend_dir / root


def _is_not_found_error(exc: Exception) -> bool:
    response = getattr(exc, "response", None)
    if not isinstance(response, dict):
        return False
    error = response.get("Error") or {}
    metadata = response.get("ResponseMetadata") or {}
    code = str(error.get("Code") or "").lower()
    status_code = metadata.get("HTTPStatusCode")
    return code in {"404", "nosuchkey", "notfound"} or status_code == 404
