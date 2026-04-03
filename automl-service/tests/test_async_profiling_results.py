"""Tests for async EDA result resolution via MLflow."""

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Optional

import mlflow
import pytest
from fastapi import HTTPException

from app.api.routes.profiling import _build_async_status_response, _resolve_eda_job_result
from app.core.eda_job_metadata import EDA_JOB_REQUEST_ID_TAG, EDA_JOB_RESULT_ARTIFACT_PATH


class DummyStore:
    def __init__(
        self,
        *,
        initial_state: dict[str, Any],
        initial_result: Optional[dict[str, Any]] = None,
        initial_error: Optional[str] = None,
    ):
        self.metadata = dict(initial_state)
        self.result_payload = dict(initial_result) if initial_result is not None else None
        self.error = initial_error if initial_error is not None else self.metadata.get("error")
        self.writes: list[tuple[str, str, dict[str, Any]]] = []
        self.update_calls: list[dict[str, Any]] = []

    async def get_request(self, incoming_request_id: str) -> dict[str, Any]:
        assert incoming_request_id == self.metadata["request_id"]
        return dict(self.metadata)

    async def get_result(self, incoming_request_id: str) -> Optional[dict[str, Any]]:
        assert incoming_request_id == self.metadata["request_id"]
        if self.result_payload is None:
            return None
        return dict(self.result_payload)

    async def update_request(self, incoming_request_id: str, **updates: Any) -> dict[str, Any]:
        assert incoming_request_id == self.metadata["request_id"]
        self.update_calls.append(dict(updates))
        self.metadata.update(updates)
        if "error" in updates:
            self.error = updates["error"]
        return dict(self.metadata)

    async def write_result(self, incoming_request_id: str, mode: str, result: dict[str, Any]) -> None:
        assert incoming_request_id == self.metadata["request_id"]
        self.writes.append((incoming_request_id, mode, result))
        self.result_payload = {
            "request_id": incoming_request_id,
            "mode": mode,
            "result": result,
        }

    async def get_error(self, incoming_request_id: str) -> Optional[str]:
        assert incoming_request_id == self.metadata["request_id"]
        return self.error


class DummyLauncher:
    def __init__(
        self,
        *,
        job_status_result: Optional[dict[str, Any]] = None,
        expected_domino_job_id: Optional[str] = None,
    ):
        self.job_status_result = dict(job_status_result) if job_status_result is not None else {}
        self.expected_domino_job_id = expected_domino_job_id

    async def get_job_status(self, domino_job_id: str) -> dict[str, Any]:
        if self.expected_domino_job_id is not None:
            assert domino_job_id == self.expected_domino_job_id
        return dict(self.job_status_result)


class DummyMlflowClient:
    def __init__(
        self,
        *,
        experiment: Optional[Any] = None,
        runs: Optional[list[Any]] = None,
        artifacts: Optional[list[Any]] = None,
        list_artifacts_error: Optional[Exception] = None,
    ):
        self.experiment = experiment
        self.runs = list(runs) if runs is not None else []
        self.artifacts = list(artifacts) if artifacts is not None else []
        self.list_artifacts_error = list_artifacts_error

    def get_experiment_by_name(self, experiment_name: str) -> Optional[Any]:
        return self.experiment

    def search_runs(self, **_: Any) -> list[Any]:
        return list(self.runs)

    def list_artifacts(self, run_id: str) -> list[Any]:
        if self.list_artifacts_error is not None:
            raise self.list_artifacts_error
        return list(self.artifacts)


def _patch_mlflow_client(monkeypatch, client: DummyMlflowClient) -> None:
    monkeypatch.setattr(
        "app.api.routes.profiling.mlflow.client.MlflowClient",
        lambda: client,
    )


def test_resolve_eda_job_result_downloads_artifact_by_request_id_tag(tmp_path, monkeypatch):
    tracking_uri = str(tmp_path / "mlruns")
    experiment_name = "eda-results-exp"
    request_id = "req-123"
    expected_result = {
        "summary": {"total_rows": 2},
        "warnings": [],
    }

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)
    artifact_dir = tmp_path / "artifact_src"
    artifact_dir.mkdir()
    artifact_path = artifact_dir / EDA_JOB_RESULT_ARTIFACT_PATH
    artifact_path.write_text(json.dumps(expected_result), encoding="utf-8")

    with mlflow.start_run(tags={EDA_JOB_REQUEST_ID_TAG: request_id}):
        mlflow.log_artifact(str(artifact_path))

    assert _resolve_eda_job_result(request_id, experiment_name) == expected_result


def test_resolve_eda_job_result_raises_when_experiment_missing(monkeypatch):
    request_id = "req-missing-exp"
    experiment_name = "missing-exp"

    _patch_mlflow_client(monkeypatch, DummyMlflowClient(experiment=None))

    with pytest.raises(HTTPException) as exc_info:
        _resolve_eda_job_result(request_id, experiment_name)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == (
        f"MLflow experiment {experiment_name} not found while resolving EDA request {request_id}"
    )


def test_resolve_eda_job_result_raises_when_no_runs_found(monkeypatch):
    request_id = "req-no-runs"
    experiment_name = "eda-exp"

    _patch_mlflow_client(
        monkeypatch,
        DummyMlflowClient(
            experiment=SimpleNamespace(experiment_id="exp-1"),
            runs=[],
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        _resolve_eda_job_result(request_id, experiment_name)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == (
        f"No MLflow runs found for experiment {experiment_name} and EDA request {request_id}"
    )


def test_resolve_eda_job_result_raises_when_listing_artifacts_fails(monkeypatch):
    request_id = "req-artifacts"
    experiment_name = "eda-exp"
    run_id = "run-123"

    _patch_mlflow_client(
        monkeypatch,
        DummyMlflowClient(
            experiment=SimpleNamespace(experiment_id="exp-1"),
            runs=[SimpleNamespace(info=SimpleNamespace(run_id=run_id))],
            list_artifacts_error=RuntimeError("artifact listing failed"),
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        _resolve_eda_job_result(request_id, experiment_name)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == f"Failed listing MLflow artifacts for run {run_id}"


def test_resolve_eda_job_result_raises_when_artifact_download_fails(monkeypatch):
    request_id = "req-download"
    experiment_name = "eda-exp"
    run_id = "run-456"
    artifact_path = EDA_JOB_RESULT_ARTIFACT_PATH

    _patch_mlflow_client(
        monkeypatch,
        DummyMlflowClient(
            experiment=SimpleNamespace(experiment_id="exp-1"),
            runs=[SimpleNamespace(info=SimpleNamespace(run_id=run_id))],
            artifacts=[SimpleNamespace(path=artifact_path)],
        ),
    )
    monkeypatch.setattr(
        "app.api.routes.profiling.mlflow.artifacts.download_artifacts",
        lambda **_: (_ for _ in ()).throw(RuntimeError("download failed")),
    )

    with pytest.raises(HTTPException) as exc_info:
        _resolve_eda_job_result(request_id, experiment_name)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == (
        f"Failed downloading MLflow artifact {artifact_path} "
        f"for EDA request {request_id} from run {run_id}"
    )


@pytest.mark.asyncio
async def test_build_async_status_response_marks_eda_job_running_when_domino_job_not_completed(monkeypatch):
    request_id = "req-running"
    store = DummyStore(
        initial_state={
            "request_id": request_id,
            "status": "running",
            "mode": "tabular",
            "domino_job_id": "domino-job-1",
            "domino_job_status": "Queued",
            "experiment_name": "eda-exp",
            "error": None,
        },
    )
    launcher = DummyLauncher(
        job_status_result={
            "success": True,
            "domino_job_status": "Pending",
        },
        expected_domino_job_id="domino-job-1",
    )

    def fail_if_called(incoming_request_id, experiment_name):
        raise AssertionError(
            f"_resolve_eda_job_result should not be called while job {incoming_request_id} is still running"
        )

    monkeypatch.setattr("app.api.routes.profiling.get_eda_job_store", lambda: store)
    monkeypatch.setattr("app.api.routes.profiling.get_domino_job_launcher", lambda: launcher)
    monkeypatch.setattr("app.api.routes.profiling._resolve_eda_job_result", fail_if_called)

    response = await _build_async_status_response(request_id)

    assert response.request_id == request_id
    assert response.status == "running"
    assert response.mode == "tabular"
    assert response.domino_job_status == "Pending"
    assert response.result is None
    assert response.error is None


@pytest.mark.asyncio
async def test_build_async_status_response_marks_eda_job_failed_for_failed_domino_status(monkeypatch):
    request_id = "req-failed"
    store = DummyStore(
        initial_state={
            "request_id": request_id,
            "status": "running",
            "mode": "tabular",
            "domino_job_id": "domino-job-2",
            "domino_job_status": "Running",
            "experiment_name": "eda-exp",
            "error": None,
        },
    )
    launcher = DummyLauncher(
        job_status_result={
            "success": True,
            "domino_job_status": "Failed",
        },
        expected_domino_job_id="domino-job-2",
    )
    expected_error = "Domino profiling job ended with status: Failed"

    def fail_if_called(incoming_request_id, experiment_name):
        raise AssertionError(
            f"_resolve_eda_job_result should not be called for failed job {incoming_request_id}"
        )

    monkeypatch.setattr("app.api.routes.profiling.get_eda_job_store", lambda: store)
    monkeypatch.setattr("app.api.routes.profiling.get_domino_job_launcher", lambda: launcher)
    monkeypatch.setattr("app.api.routes.profiling._resolve_eda_job_result", fail_if_called)

    response = await _build_async_status_response(request_id)

    assert response.request_id == request_id
    assert response.status == "failed"
    assert response.mode == "tabular"
    assert response.domino_job_status == "Failed"
    assert response.result is None
    assert response.error == expected_error


@pytest.mark.asyncio
async def test_build_async_status_response_marks_eda_job_completed_for_successful_domino_status_and_fetches_results(monkeypatch):
    request_id = "req-completed"
    resolved_result = {"summary": {"total_rows": 10}}
    store = DummyStore(
        initial_state={
            "request_id": request_id,
            "status": "running",
            "mode": "tabular",
            "domino_job_id": "domino-job-3",
            "domino_job_status": "Running",
            "experiment_name": "eda-exp",
            "error": None,
        },
    )
    launcher = DummyLauncher(
        job_status_result={
            "success": True,
            "domino_job_status": "Succeeded",
        },
        expected_domino_job_id="domino-job-3",
    )

    monkeypatch.setattr("app.api.routes.profiling.get_eda_job_store", lambda: store)
    monkeypatch.setattr("app.api.routes.profiling.get_domino_job_launcher", lambda: launcher)
    monkeypatch.setattr(
        "app.api.routes.profiling._resolve_eda_job_result",
        lambda incoming_request_id, experiment_name: resolved_result
        if experiment_name == "eda-exp" and incoming_request_id == request_id
        else None,
    )

    response = await _build_async_status_response(request_id)

    assert response.request_id == request_id
    assert response.status == "completed"
    assert response.result == resolved_result
    assert response.domino_job_status == "Succeeded"


@pytest.mark.asyncio
async def test_build_async_status_response_requires_experiment_name(monkeypatch):
    request_id = "req-789"
    store = DummyStore(
        initial_state={
            "request_id": request_id,
            "status": "completed",
            "mode": "tabular",
            "domino_job_id": "domino-job-2",
            "domino_job_status": "Succeeded",
            "experiment_name": None,
            "error": None,
        },
    )
    resolve_called = False

    def fail_if_called(incoming_request_id, experiment_name):
        nonlocal resolve_called
        resolve_called = True
        raise AssertionError("experiment_name is required to resolve EDA results")

    monkeypatch.setattr("app.api.routes.profiling.get_eda_job_store", lambda: store)
    monkeypatch.setattr(
        "app.api.routes.profiling.get_domino_job_launcher",
        lambda: DummyLauncher(),
    )
    monkeypatch.setattr("app.api.routes.profiling._resolve_eda_job_result", fail_if_called)

    with pytest.raises(HTTPException) as exc_info:
        await _build_async_status_response(request_id)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == (
        f"An experiment name wasn't created for EDA job request {request_id}"
    )
    assert not resolve_called
    assert store.writes == []
