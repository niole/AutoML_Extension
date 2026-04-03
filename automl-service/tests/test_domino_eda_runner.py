"""Tests for app.workers.domino_eda_runner."""

from contextlib import nullcontext
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.eda_job_metadata import EDA_JOB_REQUEST_ID_TAG, EDA_JOB_RESULT_ARTIFACT_PATH
from app.workers import domino_eda_runner


def _make_args(**overrides):
    defaults = {
        "request_id": "req-12345678",
        "mode": "tabular",
        "file_path": "/tmp/input.csv",
        "experiment_name": "eda-exp",
        "sample_size": 50000,
        "sampling_strategy": "random",
        "stratify_column": None,
        "time_column": None,
        "target_column": None,
        "id_column": None,
        "rolling_window": None,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.fixture
def make_args():
    return _make_args


@pytest.fixture
def patched_mlflow(monkeypatch):
    set_experiment = MagicMock()
    start_run = MagicMock(return_value=nullcontext())
    logged_artifact = {}

    def fake_log_artifact(path, artifact_path=None):
        logged_artifact["path"] = path
        logged_artifact["artifact_path"] = artifact_path
        logged_artifact["payload"] = json.loads(Path(path).read_text(encoding="utf-8"))

    monkeypatch.setattr("mlflow.set_experiment", set_experiment)
    monkeypatch.setattr("mlflow.start_run", start_run)
    monkeypatch.setattr("mlflow.log_artifact", fake_log_artifact)

    return SimpleNamespace(
        set_experiment=set_experiment,
        start_run=start_run,
        logged_artifact=logged_artifact,
    )


@pytest.fixture
def patched_profilers(monkeypatch):
    tabular_profiler = SimpleNamespace(profile_file=AsyncMock())
    ts_profiler = SimpleNamespace(profile_timeseries_file=AsyncMock())
    get_data_profiler = MagicMock(return_value=tabular_profiler)
    get_ts_profiler = MagicMock(return_value=ts_profiler)

    monkeypatch.setattr("app.core.data_profiler.get_data_profiler", get_data_profiler)
    monkeypatch.setattr("app.core.ts_profiler.get_ts_profiler", get_ts_profiler)

    return SimpleNamespace(
        tabular_profiler=tabular_profiler,
        ts_profiler=ts_profiler,
        get_data_profiler=get_data_profiler,
        get_ts_profiler=get_ts_profiler,
    )


@pytest.fixture
def patched_runner(monkeypatch):
    monkeypatch.setattr(domino_eda_runner, "_ensure_project_root_on_path", lambda: None)

    def _patch(args):
        monkeypatch.setattr(domino_eda_runner, "parse_args", lambda: args)

    return _patch


@pytest.mark.asyncio
async def test_main_uses_tabular_profiler_and_logs_expected_artifact(
    make_args,
    patched_mlflow,
    patched_profilers,
    patched_runner,
):
    args = make_args(
        request_id="tabular-req-1234",
        mode="tabular",
        file_path="/tmp/tabular.csv",
        sample_size=250,
        sampling_strategy="head",
        stratify_column="target",
    )
    result = {"summary": {"total_rows": 10}, "warnings": []}

    patched_runner(args)
    patched_profilers.tabular_profiler.profile_file.return_value = result

    await domino_eda_runner.main()

    patched_profilers.get_data_profiler.assert_called_once_with()
    patched_profilers.tabular_profiler.profile_file.assert_awaited_once_with(
        file_path=args.file_path,
        sample_size=args.sample_size,
        sampling_strategy=args.sampling_strategy,
        stratify_column=args.stratify_column,
    )
    patched_profilers.get_ts_profiler.assert_not_called()
    patched_profilers.ts_profiler.profile_timeseries_file.assert_not_awaited()

    patched_mlflow.set_experiment.assert_called_once_with(args.experiment_name)
    patched_mlflow.start_run.assert_called_once_with(
        run_name=f"eda_{args.request_id[:8]}",
        tags={EDA_JOB_REQUEST_ID_TAG: args.request_id},
    )
    assert patched_mlflow.logged_artifact["artifact_path"] is None
    assert Path(patched_mlflow.logged_artifact["path"]).name == EDA_JOB_RESULT_ARTIFACT_PATH
    assert patched_mlflow.logged_artifact["payload"] == result


@pytest.mark.asyncio
async def test_main_uses_timeseries_profiler_and_logs_expected_artifact(
    make_args,
    patched_mlflow,
    patched_profilers,
    patched_runner,
):
    args = make_args(
        request_id="timeseries-req-5678",
        mode="timeseries",
        file_path="/tmp/timeseries.csv",
        sample_size=1000,
        sampling_strategy="recent",
        time_column="timestamp",
        target_column="sales",
        id_column="store_id",
        rolling_window=14,
    )
    result = {"summary": {"num_series": 4}, "warnings": ["short history"]}

    patched_runner(args)
    patched_profilers.ts_profiler.profile_timeseries_file.return_value = result

    await domino_eda_runner.main()

    patched_profilers.get_ts_profiler.assert_called_once_with()
    patched_profilers.ts_profiler.profile_timeseries_file.assert_awaited_once_with(
        file_path=args.file_path,
        time_column=args.time_column,
        target_column=args.target_column,
        id_column=args.id_column,
        sample_size=args.sample_size,
        sampling_strategy=args.sampling_strategy,
        rolling_window=args.rolling_window,
    )
    patched_profilers.get_data_profiler.assert_not_called()
    patched_profilers.tabular_profiler.profile_file.assert_not_awaited()

    patched_mlflow.set_experiment.assert_called_once_with(args.experiment_name)
    patched_mlflow.start_run.assert_called_once_with(
        run_name=f"eda_{args.request_id[:8]}",
        tags={EDA_JOB_REQUEST_ID_TAG: args.request_id},
    )
    assert patched_mlflow.logged_artifact["artifact_path"] is None
    assert Path(patched_mlflow.logged_artifact["path"]).name == EDA_JOB_RESULT_ARTIFACT_PATH
    assert patched_mlflow.logged_artifact["payload"] == result
