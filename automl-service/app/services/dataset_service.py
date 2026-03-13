"""Service helpers for dataset route orchestration."""

import logging
import os
import shutil
import uuid
from functools import lru_cache
from typing import Any, Optional, Sequence

import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

from app.api.schemas.dataset import (
    DatasetListResponse,
    DatasetPreviewResponse,
    DatasetResponse,
    DatasetSchemaResponse,
    FileUploadResponse,
)
from app.config import get_settings
from app.core.dataset_mounts import resolve_dataset_mount_paths
from app.core.dataset_manager import DominoDatasetManager
from app.core.domino_datasets import (
    ensure_dataset_in_project,
    wait_for_dataset_mount,
    snapshot_dataset,
)
from app.core import domino_http

ALLOWED_UPLOAD_EXTENSIONS = (".csv", ".parquet", ".pq")
DEFAULT_PREVIEW_LIMIT = 100
MAX_PREVIEW_LIMIT = 1000

logger = logging.getLogger(__name__)


@lru_cache()
def get_dataset_manager() -> DominoDatasetManager:
    """Get dataset manager instance (cached)."""
    return DominoDatasetManager()


def _safe_int(value: Any, field_name: str) -> int:
    """Convert value to int or raise a 400 validation error."""
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"{field_name} must be an integer") from exc


def get_dataset_mount_root() -> str:
    """Resolve dataset mount root for current runtime."""
    mount_paths = resolve_dataset_mount_paths(fallback_path=get_settings().datasets_path)
    if mount_paths:
        return mount_paths[0]
    return get_settings().datasets_path


def get_dataset_mount_roots() -> list[str]:
    """Resolve all candidate dataset mount roots for the active runtime."""
    return resolve_dataset_mount_paths(fallback_path=get_settings().datasets_path)


def _extract_file_path(file_entry: Any) -> Optional[str]:
    if isinstance(file_entry, dict):
        path = file_entry.get("path")
        return str(path) if path else None
    if hasattr(file_entry, "path"):
        path = getattr(file_entry, "path")
        return str(path) if path else None
    return None


def filter_local_datasets(
    datasets: Sequence[Any],
    local_path: Optional[str] = None,
    local_paths: Optional[Sequence[str]] = None,
) -> list[Any]:
    """Return only datasets that are mounted in the active dataset path."""
    filtered_datasets: list[Any] = []
    resolved_paths = list(local_paths) if local_paths else []
    if local_path:
        resolved_paths.append(local_path)
    if not resolved_paths:
        resolved_paths = get_dataset_mount_roots()

    for ds in datasets:
        ds_name = getattr(ds, "name", None)
        ds_id = str(getattr(ds, "id", ""))
        ds_files = getattr(ds, "files", []) or []

        if not ds_name or ds_name.startswith("/") or ds_id.startswith("/"):
            continue

        found_on_mount = False
        for root in resolved_paths:
            if os.path.exists(os.path.join(root, ds_name)):
                found_on_mount = True
                break

        if not found_on_mount:
            for file_entry in ds_files:
                file_path = _extract_file_path(file_entry)
                if file_path and os.path.exists(file_path):
                    found_on_mount = True
                    break

        if found_on_mount or ds_id.startswith("domino:") or ds_id.startswith("local:"):
            filtered_datasets.append(ds)

    return filtered_datasets


async def list_datasets_response(
    dataset_manager: DominoDatasetManager,
    project_id: Optional[str] = None,
) -> DatasetListResponse:
    """List available local datasets in API response shape."""
    settings = get_settings()
    # If a Domino project is provided, list via Domino API and then filter to mounted
    if project_id and settings.is_domino_environment:
        try:
            # Use v2 listing with project filter
            # GET /api/datasetrw/v2/datasets?projectIdsToInclude=<id>&limit=1000
            path = f"/api/datasetrw/v2/datasets?projectIdsToInclude={project_id}&limit=1000&includeProjectInfo=true"
            resp = await domino_http.domino_request("GET", path)
            data = resp.json()
            items = (data or {}).get("datasets") or (data or {}).get("items") or []
            detailed: list[DatasetResponse] = []
            for it in items:
                ds_id = str(it.get("id") or it.get("datasetId") or "").strip()
                if not ds_id:
                    continue
                # Resolve full details and mounted files via manager (uses v1 getDataset + mount resolution)
                ds = await dataset_manager.get_dataset(ds_id)
                if ds:
                    detailed.append(ds)
            dataset_mount_roots = get_dataset_mount_roots()
            filtered_datasets = filter_local_datasets(detailed, local_paths=dataset_mount_roots)
            logger.info(
                "Returning %s datasets (filtered from %s) using roots %s for project %s",
                len(filtered_datasets),
                len(detailed),
                ", ".join(dataset_mount_roots) if dataset_mount_roots else "(none)",
                project_id,
            )
            return DatasetListResponse(datasets=filtered_datasets, total=len(filtered_datasets))
        except Exception as e:
            logger.warning("Failed Domino API dataset list for project %s: %s; falling back to mounted scan", project_id, e)

    datasets = await dataset_manager.list_datasets()
    dataset_mount_roots = get_dataset_mount_roots()
    filtered_datasets = filter_local_datasets(datasets, local_paths=dataset_mount_roots)

    logger.info(
        "Returning %s datasets (filtered from %s) using roots %s",
        len(filtered_datasets),
        len(datasets),
        ", ".join(dataset_mount_roots) if dataset_mount_roots else "(none)",
    )
    return DatasetListResponse(datasets=filtered_datasets, total=len(filtered_datasets))


async def get_dataset_or_404(
    dataset_manager: DominoDatasetManager,
    dataset_id: str,
) -> DatasetResponse:
    """Get dataset details or raise a 404."""
    dataset = await dataset_manager.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


async def preview_dataset_response(
    dataset_manager: DominoDatasetManager,
    dataset_id: str,
    file_name: Optional[str] = None,
    rows: int = DEFAULT_PREVIEW_LIMIT,
) -> DatasetPreviewResponse:
    """Preview a dataset file via manager."""
    return await dataset_manager.preview_dataset(dataset_id, file_name=file_name, rows=rows)


async def get_dataset_schema_response(
    dataset_manager: DominoDatasetManager,
    dataset_id: str,
    file_name: Optional[str] = None,
) -> DatasetSchemaResponse:
    """Get dataset schema via manager."""
    return await dataset_manager.get_schema(dataset_id, file_name=file_name)


def normalize_preview_pagination(
    limit: Optional[Any] = None,
    rows: Optional[Any] = None,
    offset: Optional[Any] = 0,
) -> tuple[int, int]:
    """Normalize preview pagination params with sensible bounds."""
    # Keep parity with existing route semantics:
    # - falsy `limit` falls back to `rows` then default
    # - negative offsets are clamped to zero
    resolved_limit_raw = limit if limit else rows
    if not resolved_limit_raw:
        resolved_limit_raw = DEFAULT_PREVIEW_LIMIT

    resolved_limit = _safe_int(resolved_limit_raw, "limit")
    if resolved_limit < 1:
        resolved_limit = DEFAULT_PREVIEW_LIMIT

    resolved_offset = _safe_int(offset or 0, "offset")
    if resolved_offset < 0:
        resolved_offset = 0

    return min(resolved_limit, MAX_PREVIEW_LIMIT), resolved_offset


def build_preview_payload(
    file_path: str,
    limit: int = DEFAULT_PREVIEW_LIMIT,
    offset: int = 0,
    include_dtypes: bool = False,
) -> dict[str, Any]:
    """Read and paginate a local CSV/Parquet file preview."""
    if not file_path:
        raise HTTPException(status_code=400, detail="file_path is required")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == ".csv":
        with open(file_path, "r") as f:
            total_rows = max(sum(1 for _ in f) - 1, 0)
        if offset > 0:
            df = pd.read_csv(file_path, skiprows=range(1, offset + 1), nrows=limit)
        else:
            df = pd.read_csv(file_path, nrows=limit)
    elif file_ext in [".parquet", ".pq"]:
        df_full = pd.read_parquet(file_path)
        total_rows = len(df_full)
        df = df_full.iloc[offset : offset + limit]
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    safe_df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
    payload: dict[str, Any] = {
        "dataset_id": file_path,
        "file_path": file_path,
        "file_name": os.path.basename(file_path),
        "columns": list(df.columns),
        "rows": safe_df.to_dict(orient="records"),
        "total_rows": total_rows,
        "preview_rows": len(df),
    }
    if include_dtypes:
        payload["dtypes"] = {col: str(dtype) for col, dtype in df.dtypes.items()}

    return payload


def preview_file_response(
    file_path: str,
    limit: Optional[Any] = None,
    rows: Optional[Any] = None,
    offset: Optional[Any] = 0,
) -> DatasetPreviewResponse:
    """Build typed dataset preview response for a local file path."""
    normalized_limit, normalized_offset = normalize_preview_pagination(
        limit=limit,
        rows=rows,
        offset=offset,
    )
    return DatasetPreviewResponse(
        **build_preview_payload(
            file_path=file_path,
            limit=normalized_limit,
            offset=normalized_offset,
        )
    )


def coerce_preview_response(preview: Any, include_dtypes: bool = False) -> dict[str, Any]:
    """Normalize preview object into a dict payload for compat endpoints."""
    if hasattr(preview, "model_dump"):
        payload = preview.model_dump()
    elif hasattr(preview, "dict"):
        payload = preview.dict()
    elif isinstance(preview, dict):
        payload = dict(preview)
    else:
        payload = dict(preview)

    payload.setdefault("file_path", payload.get("dataset_id"))
    if include_dtypes:
        payload.setdefault("dtypes", {})
    return payload


async def build_compat_dataset_preview_payload(
    dataset_manager: DominoDatasetManager,
    body: dict[str, Any],
) -> dict[str, Any]:
    """Build compat dataset preview payload from request body."""
    file_path = body.get("file_path")
    dataset_id = body.get("dataset_id")
    limit, offset = normalize_preview_pagination(
        limit=body.get("limit"),
        rows=body.get("rows"),
        offset=body.get("offset", 0),
    )

    if file_path:
        return build_preview_payload(
            file_path=file_path,
            limit=limit,
            offset=offset,
            include_dtypes=True,
        )

    if dataset_id:
        preview = await preview_dataset_response(dataset_manager, dataset_id, rows=limit)
        return coerce_preview_response(preview, include_dtypes=True)

    raise HTTPException(status_code=400, detail="Either file_path or dataset_id is required")


async def save_uploaded_file(file: UploadFile, project_id: Optional[str] = None) -> FileUploadResponse:
    """Save an uploaded dataset file and return metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {list(ALLOWED_UPLOAD_EXTENSIONS)}",
        )

    settings = get_settings()
    safe_filename = f"{str(uuid.uuid4())[:8]}_{file.filename}"
    file_path: Optional[str] = None

    # Prefer Domino Dataset flow when Domino environment is available
    if settings.is_domino_environment and project_id:
        try:
            # 1) Ensure a dataset named 'automl_ext' exists in the specified project
            dataset_name = "automl_ext"
            ds = await ensure_dataset_in_project(
                project_id=project_id,
                dataset_name=dataset_name,
                description="AutoML Extension staging dataset",
            )
            dataset_id = ds.get("id") or ds.get("datasetId")
            dataset_name = ds.get("name") or ds.get("datasetName") or dataset_name

            # do not use shared dataset linking

            # 2) Wait briefly for mount to appear, then write file into mount root
            mount_path = await wait_for_dataset_mount(dataset_name, timeout_s=20.0)
            if not mount_path:
                # Fall back to first candidate path
                roots = resolve_dataset_mount_paths(fallback_path=settings.datasets_path)
                mount_path = os.path.join(roots[0], dataset_name) if roots else None
            if not mount_path:
                raise RuntimeError("Dataset mount path could not be resolved")

            os.makedirs(mount_path, exist_ok=True)
            file_path = os.path.join(mount_path, safe_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # 3) Create a snapshot including this file
            try:
                await snapshot_dataset(dataset_id, [safe_filename])
            except Exception as e:
                # Not fatal for preview; log and continue
                logger.warning("Failed to snapshot dataset %s: %s", dataset_id, e)
        except Exception as exc:
            logger.warning("Domino dataset upload flow failed, falling back to local save: %s", exc)
            # Reset file stream to start before saving locally
            try:
                file.file.seek(0)
            except Exception:
                pass
            # Save under local uploads directory
            upload_dir = settings.uploads_path
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, safe_filename)
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            except Exception as inner_exc:
                raise HTTPException(status_code=500, detail=f"Failed to save file: {inner_exc}") from inner_exc
    else:
        # Standalone/local behavior — write into uploads directory
        upload_dir = settings.uploads_path
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, safe_filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}") from exc

    try:
        if file_ext == ".csv":
            header_df = pd.read_csv(file_path, nrows=0)
            with open(file_path, "r") as f:
                row_count = max(sum(1 for _ in f) - 1, 0)
        else:
            header_df = pd.read_parquet(file_path)
            row_count = len(header_df)

        columns = list(header_df.columns)
        file_size = os.path.getsize(file_path)
    except Exception as exc:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {exc}") from exc

    return FileUploadResponse(
        success=True,
        file_path=file_path,
        file_name=file.filename,
        file_size=file_size,
        columns=columns,
        row_count=row_count,
    )
