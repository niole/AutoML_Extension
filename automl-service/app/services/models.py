"""Service-layer models that should not depend on database persistence."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic_core import PydanticUndefined

from app.core.utils import utc_now
from app.db.models import Job, JobStatus, ModelType, ProblemType


class JobConfig(BaseModel):
    """Serializable training job state for worker handoff and background runners."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # keep
    name: str
    description: Optional[str] = None

    owner: Optional[str] = None
    # keep
    project_id: Optional[str] = None
    # keep
    project_name: Optional[str] = None
    project_owner: Optional[str] = None

    status: JobStatus = JobStatus.PENDING
    execution_target: str = "local"
    # keep
    domino_job_id: Optional[str] = None
    domino_job_status: Optional[str] = None
    error_message: Optional[str] = None
    progress: int = 0
    current_step: Optional[str] = None
    models_trained: int = 0
    current_model: Optional[str] = None
    eta_seconds: Optional[int] = None

    # keep
    model_type: ModelType
    # keep
    problem_type: Optional[ProblemType] = None

    # keep
    data_source: str
    # keep
    dataset_id: Optional[str] = None
    # keep
    file_path: Optional[str] = None

    # keep
    target_column: str
    # keep
    time_column: Optional[str] = None
    # keep
    id_column: Optional[str] = None
    # keep
    prediction_length: Optional[int] = None
    #keep
    preset: str = "medium_quality_faster_train"
    # keep
    time_limit: Optional[int] = None
    # keep
    eval_metric: Optional[str] = None

    #keep
    autogluon_config: Optional[dict[str, Any]] = None

    #keep
    metrics: Optional[dict[str, Any]] = None
    leaderboard: Optional[dict[str, Any] | list[dict[str, Any]]] = None
    # keep
    model_path: Optional[str] = None

    # keep
    experiment_name: Optional[str] = None
    experiment_run_id: Optional[str] = None

    # keep
    enable_mlflow: bool = False

    # keep
    auto_register: bool = False
    # keep
    register_name: Optional[str] = None

    is_registered: bool = False
    registered_model_name: Optional[str] = None
    registered_model_version: Optional[str] = None

    created_at: datetime = Field(default_factory=utc_now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @classmethod
    def from_job(cls, job: Job, **overrides: Any) -> "JobConfig":
        """Create a transport-safe config from a persisted job."""
        # TODO may not need
        payload: dict[str, Any] = {}

        for field_name, field_info in cls.model_fields.items():
            value = getattr(job, field_name, PydanticUndefined)
            if value is PydanticUndefined:
                continue

            if value is None:
                if field_info.default_factory is not None:
                    value = field_info.default_factory()
                elif field_info.default is not PydanticUndefined:
                    value = field_info.default

            payload[field_name] = value

        payload.update(overrides)
        return cls.model_validate(payload)
