"""Custom compatibility route orchestration."""

from fastapi import FastAPI

from app.api.compat.custom_datasets import register_custom_dataset_routes
from app.api.compat.custom_jobs import register_custom_job_routes
from app.api.compat.custom_misc import register_custom_misc_routes
from app.api.compat.custom_models import register_custom_model_routes


def register_custom_routes(app: FastAPI) -> None:
    """Register all custom /svc* routes."""
    register_custom_misc_routes(app)
    register_custom_job_routes(app)
    register_custom_dataset_routes(app)
    register_custom_model_routes(app)
