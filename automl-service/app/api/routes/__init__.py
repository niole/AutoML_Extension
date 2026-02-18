"""API routes module."""

from app.api.routes import (
    health,
    jobs,
    datasets,
    predictions,
    profiling,
    registry,
    export,
    deployments,
)

__all__ = [
    "health",
    "jobs",
    "datasets",
    "predictions",
    "profiling",
    "registry",
    "export",
    "deployments",
]
