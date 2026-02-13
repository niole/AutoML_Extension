"""Single-segment Domino compatibility route registration entry point."""

from fastapi import FastAPI

from app.api.compat.custom import register_custom_routes
from app.api.compat.patterns import register_pattern_routes


def register_compat_routes(app: FastAPI) -> None:
    """Register all /svc* compatibility routes."""
    register_pattern_routes(app)
    register_custom_routes(app)
