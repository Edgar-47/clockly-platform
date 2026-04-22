from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()

engine = create_engine(
    settings.database_url,
    # Keep connections alive across the pool lifespan and discard stale ones.
    pool_pre_ping=True,
    future=True,
    # Tune these to your expected concurrent-user count.
    # pool_size: persistent connections kept open at all times.
    # max_overflow: temporary extra connections allowed under load.
    # pool_recycle: discard connections older than 1h to avoid server-side timeouts.
    # pool_timeout: raise after 10s if no connection is available (fail fast).
    pool_size=20,
    max_overflow=40,
    pool_recycle=3600,
    pool_timeout=10,
    # Hard limit per statement: prevents runaway queries from blocking the pool.
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

