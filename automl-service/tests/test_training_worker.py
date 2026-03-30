"""Tests for app.workers.training_worker dispatch behaviour."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, call, patch

import pandas as pd
import pytest

from app.services.models import JobConfig
from app.db.models import JobStatus
from app.workers.training_worker import run_training_job, run_training_job_with_db


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


class TestRunTrainingJobWithDb:
    """Tests for the full training worker happy path."""

    @pytest.mark.asyncio
    async def test_happy_path_runs_to_completion(self, make_job, tmp_path):
        training_csv = tmp_path / "train.csv"
        training_csv.write_text("feature,target\n1,0\n2,1\n", encoding="utf-8")

        model_dir = tmp_path / "model_artifacts"
        model_dir.mkdir()

        job_config = JobConfig.from_job(
            make_job(
                file_path=str(training_csv),
                execution_target="local",
                experiment_name="exp-1",
            )
        )

        result = {
            "metrics": {
                "best_model": "LightGBM",
                "num_models": 3,
                "problem_type": "binary",
            },
            "leaderboard": [{"model": "LightGBM", "score_val": 0.91}],
            "model_path": str(model_dir),
        }
        diagnostics = SimpleNamespace(
            get_feature_importance=lambda **_: {
                "features": [{"feature": "feature", "importance": 1.0}]
            }
        )
        predictor = object()
        test_df = pd.DataFrame({"feature": [1, 2], "target": [0, 1]})
        mock_db = AsyncMock()
        mock_runner = SimpleNamespace(run_training=AsyncMock(return_value=result))

        with (
            patch(
                "app.workers.training_worker.get_settings",
                return_value=SimpleNamespace(standalone_mode=True),
            ),
            patch("app.workers.training_worker._check_cancelled", new_callable=AsyncMock) as mock_check_cancelled,
            patch(
                "app.workers.training_worker.AutoGluonRunner",
                return_value=mock_runner,
            ),
            patch("app.workers.training_worker.DominoDatasetManager"),
            patch(
                "app.workers.training_worker.remap_shared_path",
                return_value=str(training_csv),
            ),
            patch(
                "app.workers.training_worker.get_model_diagnostics",
                return_value=diagnostics,
            ),
            patch(
                "app.workers.training_worker.load_predictor",
                return_value=predictor,
            ) as mock_load_predictor,
            patch(
                "app.workers.training_worker.load_dataframe",
                return_value=test_df,
            ) as mock_load_dataframe,
            patch("app.workers.training_worker.crud.add_job_log", new_callable=AsyncMock) as mock_add_job_log,
            patch("app.workers.training_worker.crud.update_job_status", new_callable=AsyncMock) as mock_update_job_status,
            patch("app.workers.training_worker.crud.update_job_progress", new_callable=AsyncMock) as mock_update_job_progress,
            patch("app.workers.training_worker.crud.update_job_results", new_callable=AsyncMock) as mock_update_job_results,
        ):
            await run_training_job_with_db(job_config.id, job_config=job_config, db=mock_db)

        mock_runner.run_training.assert_awaited_once_with(
            job_id=job_config.id,
            model_type=job_config.model_type,
            data_path=str(training_csv),
            target_column=job_config.target_column,
            time_column=job_config.time_column,
            id_column=job_config.id_column,
            prediction_length=job_config.prediction_length,
            problem_type=job_config.problem_type,
            preset=job_config.preset,
            time_limit=job_config.time_limit,
            eval_metric=job_config.eval_metric,
            advanced_config=None,
            timeseries_config=None,
        )
        assert mock_check_cancelled.await_count == 4
        mock_load_predictor.assert_called_once_with(str(model_dir), job_config.model_type.value)
        mock_load_dataframe.assert_called_once_with(str(training_csv))
        mock_update_job_results.assert_awaited_once_with(
            mock_db,
            job_config.id,
            metrics=result["metrics"],
            leaderboard=result["leaderboard"],
            model_path=result["model_path"],
            experiment_run_id=None,
            experiment_name="exp-1",
        )
        assert mock_update_job_status.await_args_list[0].args[:3] == (
            mock_db,
            job_config.id,
            JobStatus.RUNNING,
        )
        assert mock_update_job_status.await_args_list[-1].args[:3] == (
            mock_db,
            job_config.id,
            JobStatus.COMPLETED,
        )
        assert mock_update_job_progress.await_args_list[-1] == call(
            mock_db,
            job_config.id,
            100,
            current_step="Complete",
            models_trained=3,
            current_model="LightGBM",
            eta_seconds=0,
        )
        assert any(
            awaited.args[1] == job_config.id and "Job completed. Best model: LightGBM" in awaited.args[2]
            for awaited in mock_add_job_log.await_args_list
        )
