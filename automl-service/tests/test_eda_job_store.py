"""Tests for the database-backed async EDA job store."""

from contextlib import asynccontextmanager

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.eda_job_store import get_eda_job_store


@pytest.mark.asyncio
async def test_eda_job_store_persists_to_database(async_engine, monkeypatch):
    session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    @asynccontextmanager
    async def override_get_db_session():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    monkeypatch.setattr("app.core.eda_job_store.get_db_session", override_get_db_session)

    store = get_eda_job_store()

    await store.create_request(
        request_id="eda-req-1",
        job_id="job-1",
        mode="tabular",
        request_payload={"dataset_id": "dataset-1", "file_path": "train.csv"},
        experiment_name="eda-exp-1",
    )

    metadata = await store.get_request("eda-req-1")

    assert metadata is not None
    assert metadata["status"] == "pending"
    assert metadata["mode"] == "tabular"
    assert metadata["request"] == {"dataset_id": "dataset-1", "file_path": "train.csv"}
    assert metadata["experiment_name"] == "eda-exp-1"

    await store.write_result(
        request_id="eda-req-1",
        mode="tabular",
        result={"summary": {"total_rows": 42}},
    )

    result_payload = await store.get_result("eda-req-1")

    assert result_payload is not None
    assert result_payload["mode"] == "tabular"
    assert result_payload["result"] == {"summary": {"total_rows": 42}}
