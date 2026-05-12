from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest

from app.services.storage import (
    LocalStorageBackend,
    R2StorageBackend,
    StorageBackendError,
    StorageNotFoundError,
)


def test_local_storage_upload_download_exists_and_delete():
    storage = LocalStorageBackend(_local_test_root("roundtrip"))
    key = "companies/co-1/expense-tickets/2026/05/file.pdf"

    storage.upload_file(key, b"%PDF-test", content_type="application/pdf")

    assert storage.exists(key) is True
    downloaded = storage.download_file(key)
    assert downloaded.body.read() == b"%PDF-test"
    downloaded.body.close()

    storage.delete_file(key)
    assert storage.exists(key) is False
    with pytest.raises(StorageNotFoundError):
        storage.download_file(key)


def test_local_storage_rejects_path_traversal():
    storage = LocalStorageBackend(_local_test_root("traversal"))

    with pytest.raises(StorageBackendError):
        storage.upload_file("../escape.pdf", b"bad")


def test_r2_storage_uses_s3_compatible_client():
    client = FakeS3Client()
    storage = R2StorageBackend(
        bucket="private-bucket",
        endpoint_url="https://example.r2.cloudflarestorage.com",
        region="auto",
        client=client,
    )
    key = "companies/co-1/expense-tickets/2026/05/file.png"

    storage.upload_file(key, b"\x89PNG\r\n\x1a\nbody", content_type="image/png")

    assert storage.exists(key) is True
    downloaded = storage.download_file(key)
    assert downloaded.content_type == "image/png"
    assert downloaded.content_length == 12
    assert downloaded.body.read() == b"\x89PNG\r\n\x1a\nbody"

    storage.delete_file(key)
    assert storage.exists(key) is False
    with pytest.raises(StorageNotFoundError):
        storage.download_file(key)


class FakeS3Missing(Exception):
    response = {
        "Error": {"Code": "NoSuchKey"},
        "ResponseMetadata": {"HTTPStatusCode": 404},
    }


class FakeS3Client:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], tuple[bytes, str | None]] = {}

    def put_object(self, *, Bucket, Key, Body, ContentType=None, Metadata=None):
        self.objects[(Bucket, Key)] = (Body, ContentType)

    def get_object(self, *, Bucket, Key):
        try:
            body, content_type = self.objects[(Bucket, Key)]
        except KeyError as exc:
            raise FakeS3Missing() from exc
        return {
            "Body": BytesIO(body),
            "ContentType": content_type,
            "ContentLength": len(body),
            "ETag": '"fake"',
        }

    def delete_object(self, *, Bucket, Key):
        self.objects.pop((Bucket, Key), None)

    def head_object(self, *, Bucket, Key):
        if (Bucket, Key) not in self.objects:
            raise FakeS3Missing()
        return {}


def _local_test_root(name: str) -> Path:
    temp_base = Path(os.environ.get("LOCALAPPDATA", ".")) / "Temp" / "clockly-storage-tests"
    root = temp_base / name / str(uuid4())
    root.mkdir(parents=True, exist_ok=True)
    return root
