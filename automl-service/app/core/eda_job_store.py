"""Database-backed metadata/result store for async EDA jobs."""

from typing import Any, Optional

from sqlalchemy import select, delete

from app.core.utils import utc_now
from app.db.models import EDAJob
from app.dependencies import get_db_session


class EDAJobStore:
    """Persist async EDA job state in the application database."""

    @staticmethod
    def _serialize_request(record: EDAJob) -> dict[str, Any]:
        return {
            "request_id": record.request_id,
            "job_id": record.job_id,
            "status": record.status,
            "mode": record.mode,
            "request": record.request_payload,
            "domino_job_id": record.domino_job_id,
            "domino_job_status": record.domino_job_status,
            "domino_job_url": record.domino_job_url,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
            "error": record.error,
            "experiment_name": record.experiment_name,
        }

    @staticmethod
    def _serialize_result(record: EDAJob) -> Optional[dict[str, Any]]:
        if record.result_payload is None:
            return None

        return {
            "request_id": record.request_id,
            "mode": record.mode,
            "result": record.result_payload,
            "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        }

    @staticmethod
    async def _get_record(request_id: str) -> Optional[EDAJob]:
        async with get_db_session() as db:
            result = await db.execute(
                select(EDAJob).where(EDAJob.request_id == request_id)
            )
            return result.scalar_one_or_none()

    async def get_by_job(self, job_id: str, mode: str) -> Optional[dict[str, Any]]:
        async with get_db_session() as db:
            result = await db.execute(
                select(EDAJob).where(EDAJob.job_id == job_id, EDAJob.mode == mode)
            )
            record = result.scalar_one_or_none()
            if record is None:
                return None
            return self._serialize_request(record)

    async def delete_by_job(self, job_id: str, mode: str) -> None:
        async with get_db_session() as db:
            await db.execute(
                delete(EDAJob).where(EDAJob.job_id == job_id, EDAJob.mode == mode)
            )
            await db.commit()

    async def create_request(
        self,
        request_id: str,
        job_id: str,
        mode: str,
        request_payload: dict[str, Any],
        experiment_name: str,
    ) -> dict[str, Any]:
        now = utc_now()
        record = EDAJob(
            request_id=request_id,
            job_id=job_id,
            status="pending",
            mode=mode,
            request_payload=request_payload,
            domino_job_id=None,
            domino_job_status=None,
            domino_job_url=None,
            created_at=now,
            updated_at=now,
            error=None,
            experiment_name=experiment_name,
        )

        async with get_db_session() as db:
            db.add(record)
            try:
                await db.commit()
            except Exception:
                await db.rollback()
                raise
            await db.refresh(record)

        return self._serialize_request(record)

    async def get_request(self, request_id: str) -> Optional[dict[str, Any]]:
        record = await self._get_record(request_id)
        if record is None:
            return None
        return self._serialize_request(record)

    async def update_request(self, request_id: str, **updates: Any) -> Optional[dict[str, Any]]:
        async with get_db_session() as db:
            result = await db.execute(
                select(EDAJob).where(EDAJob.request_id == request_id)
            )
            record = result.scalar_one_or_none()
            if record is None:
                return None

            for key, value in updates.items():
                if key == "request":
                    record.request_payload = value
                elif key == "error":
                    record.error = value
                elif hasattr(record, key):
                    setattr(record, key, value)

            now = utc_now()
            record.updated_at = now
            if updates.get("status") == "completed":
                record.completed_at = now

            try:
                await db.commit()
            except Exception:
                await db.rollback()
                raise
            await db.refresh(record)

        return self._serialize_request(record)

    async def write_result(self, request_id: str, mode: str, result: dict[str, Any]) -> None:
        async with get_db_session() as db:
            db_result = await db.execute(
                select(EDAJob).where(EDAJob.request_id == request_id)
            )
            record = db_result.scalar_one_or_none()
            if record is None:
                raise ValueError(f"Async profile request not found: {request_id}")

            now = utc_now()
            record.mode = mode
            record.result_payload = result
            record.status = "completed"
            record.error = None
            record.completed_at = now
            record.updated_at = now

            try:
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    async def get_result(self, request_id: str) -> Optional[dict[str, Any]]:
        record = await self._get_record(request_id)
        if record is None:
            return None
        return self._serialize_result(record)

    async def write_error(self, request_id: str, error_message: str) -> None:
        await self.update_request(request_id, error=error_message)

    async def get_error(self, request_id: str) -> Optional[str]:
        record = await self._get_record(request_id)
        if record is None:
            return None
        return record.error


def get_eda_job_store() -> EDAJobStore:
    """Create a new database-backed EDA job store."""
    return EDAJobStore()
