"""Model-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RegisteredModelResponse(BaseModel):
    """Response schema for a registered model."""

    id: str
    name: str
    description: Optional[str] = None
    job_id: str
    version: int
    mlflow_model_uri: Optional[str] = None
    domino_model_id: Optional[str] = None
    deployed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ModelVersionResponse(BaseModel):
    """Response schema for model version."""

    version: int
    created_at: datetime
    run_id: Optional[str] = None
    status: str = "ready"
