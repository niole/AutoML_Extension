from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import JobStatus


@pytest.mark.asyncio
async def test_svcjobregister_rejects_non_owner(app_client, async_engine, make_job):
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    job = make_job(status=JobStatus.COMPLETED, owner="someone-else")

    async with session_factory() as session:
        session.add(job)
        await session.commit()

    response = await app_client.post(
        "/svcjobregister",
        json={"job_id": job.id, "model_name": "registered-model"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


@pytest.mark.asyncio
async def test_svcjobregister_allows_owner(app_client, async_engine, make_job, monkeypatch):
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    job = make_job(status=JobStatus.COMPLETED, owner="test-user")

    async with session_factory() as session:
        session.add(job)
        await session.commit()

    monkeypatch.setattr(
        "app.services.job_service.register_trained_model",
        AsyncMock(
            return_value={
                "model_name": "automlapp-registered-model",
                "version": "1",
                "run_id": "run-1",
                "artifact_uri": "s3://bucket/path",
                "stage": "Staging",
            }
        ),
    )

    response = await app_client.post(
        "/svcjobregister",
        json={
            "job_id": job.id,
            "model_name": "registered-model",
            "description": "compat route",
            "stage": "Staging",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["model_name"] == "automlapp-registered-model"
    assert body["version"] == "1"
