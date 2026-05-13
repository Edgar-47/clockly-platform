from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    # Tune via CLOCKLY_DB_POOL_SIZE / CLOCKLY_DB_MAX_OVERFLOW.
    # Default (5+10) is safe for Neon free/launch. Use the Neon pooler endpoint
    # (ep-xxx-pooler.*.neon.tech) to allow higher values without hitting DB limits.
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    pool_timeout=10,
    connect_args={"options": "-c statement_timeout=30000"},
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
