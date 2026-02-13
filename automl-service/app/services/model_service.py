"""Service helpers for model registry routes."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.model import RegisteredModelResponse
from app.db import crud


async def list_registered_models_response(db: AsyncSession) -> list[RegisteredModelResponse]:
    """Return all registered models in API response shape."""
    models = await crud.get_registered_models(db)
    return [RegisteredModelResponse.model_validate(m) for m in models]
