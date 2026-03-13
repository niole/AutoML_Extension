"""Helpers for creating and linking Domino Datasets via Public API.

This module centralizes minimal API interactions needed to:
- ensure a per-user project named "automl_ext" exists (owned by caller)
- create a new dataset within that project for an uploaded file
- link that dataset to the current (extension) project so it mounts
- optionally create a snapshot including the uploaded file

It relies on the Domino Public API as embedded in AGENTS.md and the
shared domino_http utilities for auth and base URL resolution.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Optional

import httpx

from app.config import get_settings
from app.core.domino_http import domino_request, resolve_domino_project_id
from app.core.dataset_mounts import resolve_dataset_mount_paths

logger = logging.getLogger(__name__)


async def _get_json(resp: httpx.Response) -> dict:
    try:
        return resp.json()
    except Exception:
        return {}


async def ensure_user_project(project_name: str = "automl_ext") -> dict:
    """Find or create a Domino Project owned by the calling user.

    Uses beta endpoint GET/POST /api/projects/beta/projects.
    Returns the project object (ProjectV1) envelope's `project` field.
    """
    # Try to find existing project by name visible to the user
    try:
        resp = await domino_request("GET", "/api/projects/beta/projects?limit=500&offset=0")
        data = await _get_json(resp)
        projects = (data or {}).get("projects", []) or (data or {}).get("items", [])
        for p in projects:
            proj = p.get("project") if isinstance(p, dict) and "project" in p else p
            if not isinstance(proj, dict):
                continue
            if str(proj.get("name")) == project_name:
                logger.info("Found existing user project '%s' with id %s", project_name, proj.get("id"))
                return proj
    except httpx.HTTPStatusError as e:
        logger.warning("Failed to list projects (%s): %s", e.response.status_code, e)
    except Exception as e:
        logger.warning("Failed to list projects: %s", e)

    # Create the project owned by the caller
    body = {
        "name": project_name,
        "description": "AutoML Extension data staging project",
        "visibility": "private",
    }
    resp = await domino_request("POST", "/api/projects/beta/projects", json=body)
    data = await _get_json(resp)
    proj = data.get("project", data)
    if not isinstance(proj, dict) or not proj.get("id"):
        raise RuntimeError("Failed to create or resolve Domino project for uploads")
    logger.info("Created user project '%s' with id %s", project_name, proj.get("id"))
    return proj


async def create_dataset(project_id: str, dataset_name: str, description: Optional[str] = None) -> dict:
    """Create a new Domino Dataset in the given project.

    POST /api/datasetrw/v1/datasets with NewDatasetRwV1.
    Returns the dataset envelope's dataset (or response body) with id/name.
    """
    body = {
        "name": dataset_name,
        "projectId": project_id,
    }
    if description:
        body["description"] = description

    resp = await domino_request("POST", "/api/datasetrw/v1/datasets", json=body)
    data = await _get_json(resp)
    # Envelope variations observed in spec; normalize
    ds = data.get("dataset", data)
    # Also flatten common fields
    dataset_id = ds.get("id") or ds.get("datasetId")
    if not dataset_id:
        raise RuntimeError("Dataset creation response missing id")
    return ds


async def find_dataset_in_project(project_id: str, dataset_name: str) -> Optional[dict]:
    """Find a dataset by name within a specific project using v2 listing."""
    try:
        path = f"/api/datasetrw/v2/datasets?projectIdsToInclude={project_id}&limit=1000&includeProjectInfo=true"
        resp = await domino_request("GET", path)
        data = await _get_json(resp)
        items = (data or {}).get("datasets") or (data or {}).get("items") or []
        for it in items:
            nm = str(it.get("name") or it.get("datasetName") or "").strip()
            if nm == dataset_name:
                return it
    except Exception as e:
        logger.warning("Failed to search dataset '%s' in project %s: %s", dataset_name, project_id, e)
    return None


async def ensure_dataset_in_project(project_id: str, dataset_name: str, description: Optional[str] = None) -> dict:
    """Return an existing dataset by name in project, or create it."""
    existing = await find_dataset_in_project(project_id, dataset_name)
    if existing:
        # normalize id/name keys
        ds_id = existing.get("id") or existing.get("datasetId")
        if ds_id:
            return {"id": ds_id, "name": existing.get("name") or existing.get("datasetName") or dataset_name}
    return await create_dataset(project_id=project_id, dataset_name=dataset_name, description=description)

async def get_dataset_by_id(dataset_id: str) -> Optional[dict]:
    try:
        resp = await domino_request("GET", f"/api/datasetrw/v1/datasets/{dataset_id}")
        data = await _get_json(resp)
        return data
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return None
        raise


async def link_dataset_to_current_project(dataset_id: str) -> None:
    """Link a shared dataset to the current extension project so it mounts.

    POST /api/projects/v1/projects/{projectId}/shared-datasets with body {datasetId}.
    """
    project_id = resolve_domino_project_id()
    body = {"datasetId": dataset_id}
    await domino_request("POST", f"/api/projects/v1/projects/{project_id}/shared-datasets", json=body)


def _resolve_dataset_mount_path(dataset_name: str) -> Optional[str]:
    for root in resolve_dataset_mount_paths(fallback_path=get_settings().datasets_path):
        candidate = os.path.join(root, dataset_name)
        if os.path.isdir(candidate):
            return candidate
        # If not yet mounted, directory may not exist; return first path for creation attempt
        # but callers should handle waiting for mount
    # Default to first configured root
    roots = resolve_dataset_mount_paths(fallback_path=get_settings().datasets_path)
    if roots:
        return os.path.join(roots[0], dataset_name)
    return None


async def wait_for_dataset_mount(dataset_name: str, timeout_s: float = 20.0) -> Optional[str]:
    """Wait for a dataset to be mounted and return its path, or None on timeout."""
    deadline = time.time() + timeout_s
    path = _resolve_dataset_mount_path(dataset_name)
    while time.time() < deadline:
        if path and os.path.isdir(path):
            return path
        await asyncio.sleep(1.0)
        path = _resolve_dataset_mount_path(dataset_name)
    return path if path and os.path.isdir(path) else None


async def snapshot_dataset(dataset_id: str, relative_paths: list[str]) -> None:
    """Create a snapshot including the provided relative file paths.

    POST /api/datasetrw/v1/datasets/{datasetId}/snapshots with body {relativeFilePaths}.
    """
    body = {"relativeFilePaths": relative_paths}
    await domino_request("POST", f"/api/datasetrw/v1/datasets/{dataset_id}/snapshots", json=body)

