from __future__ import annotations

import logging

from app.db.session import SessionLocal
from app.services.auto_clock_out_service import run_for_all_companies


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    db = SessionLocal()
    try:
        results = run_for_all_companies(db)
        closed = sum(result.closed_count for result in results)
        logger.info("Auto clock-out job completed. companies=%s closed=%s", len(results), closed)
    finally:
        db.close()


if __name__ == "__main__":
    main()
