"""Custom compatibility dataset routes."""

from fastapi import Body, FastAPI, File, UploadFile, Request, HTTPException
from typing import Optional
from app.services.dataset_service import (
    build_compat_dataset_preview_payload,
    get_dataset_manager,
    list_datasets_response,
    save_uploaded_file,
)


def register_custom_dataset_routes(app: FastAPI) -> None:
    """Register custom /svc* dataset routes."""

    @app.get("/svcdatasets")
    async def svc_list_datasets(project_id: Optional[str] = None):
        if not project_id:
            raise HTTPException(status_code=400, detail="Project ID must be provided")

        return await list_datasets_response(get_dataset_manager(), project_id)

    @app.post("/svcdatasetpreview")
    async def svc_dataset_preview(body: dict = Body(default={})):
        return await build_compat_dataset_preview_payload(get_dataset_manager(), body)

    @app.post("/svcupload")
    async def svc_upload_file(file: UploadFile = File(...)):
        raise HTTPException(status_code=501, detail="File upload is disabled")

        #result = await save_uploaded_file(file)
        #return result.model_dump() if hasattr(result, "model_dump") else result
