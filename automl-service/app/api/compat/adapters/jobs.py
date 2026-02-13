"""Compat adapters for job-related /svc* routes."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.job import CleanupRequest, JobLogResponse
from app.services.job_service import (
    bulk_cleanup as bulk_cleanup_service,
    cancel_job as cancel_job_service,
    delete_job as delete_job_service,
    get_job_logs as get_job_logs_service,
    get_job_metrics_response,
    get_job_progress_response,
    get_job_response,
    get_job_status_response,
    get_queue_status as get_queue_status_service,
)


async def get_queue_status():
    """Return current queue status."""
    return get_queue_status_service()


async def bulk_cleanup(request: CleanupRequest, db: AsyncSession):
    """Bulk cleanup adapter for compat pattern routes."""
    return await bulk_cleanup_service(
        db=db,
        statuses=request.statuses,
        older_than_days=request.older_than_days,
        include_orphans=request.include_orphans,
    )


async def get_job(job_id: str, db: AsyncSession):
    """Get job adapter."""
    return await get_job_response(db, job_id)


async def cancel_job(job_id: str, db: AsyncSession):
    """Cancel job adapter."""
    return await cancel_job_service(db, job_id)


async def delete_job(job_id: str, db: AsyncSession):
    """Delete job adapter."""
    return await delete_job_service(db, job_id)


async def get_job_status(job_id: str, db: AsyncSession):
    """Get job status adapter."""
    return await get_job_status_response(db, job_id)


async def get_job_metrics(job_id: str, db: AsyncSession):
    """Get job metrics adapter."""
    return await get_job_metrics_response(db, job_id)


async def get_job_logs(job_id: str, limit: int = 100, db: AsyncSession = None):
    """Get job logs adapter."""
    logs = await get_job_logs_service(db=db, job_id=job_id, limit=limit)
    return [JobLogResponse.model_validate(log) for log in logs]


async def get_job_progress(job_id: str, db: AsyncSession):
    """Get job progress adapter."""
    return await get_job_progress_response(db, job_id)
