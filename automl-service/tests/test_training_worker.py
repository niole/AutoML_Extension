"""Tests for app.workers.training_worker dispatch behaviour."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.models import JobConfig
from app.workers.training_worker import run_training_job


class TestRunTrainingJob:
    """Tests for the top-level training worker entrypoint."""

    @pytest.mark.asyncio
    async def test_local_job_config_opens_db_session_and_delegates(self, make_job):
        job_config = JobConfig.from_job(make_job(execution_target="local"))
        advanced_config = {"num_gpus": 1}

        mock_db = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_db)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("app.workers.training_worker.async_session_maker", return_value=mock_ctx) as mock_session_maker,
            patch("app.workers.training_worker.run_training_job_with_db", new_callable=AsyncMock) as mock_run_with_db,
        ):
            await run_training_job(job_config.id, job_config, advanced_config)

        mock_session_maker.assert_called_once_with()
        mock_run_with_db.assert_awaited_once_with(
            job_config.id,
            job_config,
            advanced_config,
            mock_db,
        )

    @pytest.mark.asyncio
    async def test_domino_job_config_skips_db_session_and_delegates(self, make_job):
        job_config = JobConfig.from_job(make_job(execution_target="domino_job"))
        advanced_config = {"num_gpus": 1}

        with (
            patch("app.workers.training_worker.async_session_maker") as mock_session_maker,
            patch("app.workers.training_worker.run_training_job_with_db", new_callable=AsyncMock) as mock_run_with_db,
        ):
            await run_training_job(job_config.id, job_config, advanced_config)

        mock_session_maker.assert_not_called()
        mock_run_with_db.assert_awaited_once_with(
            job_config.id,
            job_config,
            advanced_config,
        )
