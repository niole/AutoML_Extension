"""Model registry endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.db import crud
from app.core.domino_registry import get_domino_registry
from app.api.schemas.model import (
    RegisteredModelResponse,
    DeployModelRequest,
    DeploymentResponse,
)
from app.services.model_service import list_registered_models_response

router = APIRouter()


@router.get("", response_model=list[RegisteredModelResponse])
async def list_models(db: AsyncSession = Depends(get_db)):
    """List all registered models."""
    return await list_registered_models_response(db)


@router.get("/{model_name}", response_model=RegisteredModelResponse)
async def get_model(model_name: str, db: AsyncSession = Depends(get_db)):
    """Get a registered model by name."""
    model = await crud.get_registered_model(db, model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.get("/{model_name}/versions")
async def list_model_versions(model_name: str):
    """List all versions of a model."""
    try:
        registry = get_domino_registry()
        versions = registry.get_model_versions(model_name)
        return versions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list model versions: {str(e)}",
        )


@router.post("/{model_name}/deploy", response_model=DeploymentResponse)
async def deploy_model(
    model_name: str,
    request: DeployModelRequest,
    db: AsyncSession = Depends(get_db),
):
    """Deploy a model to Domino Model API."""
    model = await crud.get_registered_model(db, model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        from app.core.domino_model_api import get_domino_model_api
        api = get_domino_model_api()
        result = await api.deploy_model(
            model_name=model_name,
            model_version=request.model_version,
            description=request.description,
        )
        return DeploymentResponse(
            success=result.get("success", False),
            model_name=model_name,
            model_version=request.model_version,
            status=result.get("status", "pending"),
            message=result.get("message", ""),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to deploy model: {str(e)}",
        )


@router.get("/{model_name}/deployments")
async def list_deployments(model_name: str):
    """List active deployments for a model."""
    try:
        from app.core.domino_model_api import get_domino_model_api
        api = get_domino_model_api()
        result = await api.list_deployments()
        return {"model_name": model_name, "deployments": result.get("data", [])}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list deployments: {str(e)}",
        )
