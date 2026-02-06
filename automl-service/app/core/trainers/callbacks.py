"""Shared training progress callback used by all trainers and the runner."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class TrainingProgressCallback:
    """Callback for tracking training progress.

    This is the single, canonical implementation used by TabularTrainer,
    TimeSeriesTrainer, MultimodalTrainer, and AutoGluonRunner.

    Basic usage (trainers):
        progress = TrainingProgressCallback(job_id, log_callback)
        progress.on_progress(10, "Starting training")

    Extended usage (runner):
        progress = TrainingProgressCallback(job_id, log_callback)
        progress.on_model_trained("LightGBM", 0.95)
        info = progress.to_dict()
    """

    def __init__(self, job_id: str, log_callback: Optional[Callable] = None):
        self.job_id = job_id
        self.log_callback = log_callback
        self.start_time = datetime.now()
        self.models_trained = 0
        self.current_model: Optional[str] = None
        self.progress_percent: float = 0
        self.metrics_history: List[Dict] = []

    def on_progress(self, percent: float, message: str):
        """Called to update progress percentage."""
        self.progress_percent = percent
        if self.log_callback:
            asyncio.create_task(self.log_callback(f"[{percent:.0f}%] {message}"))

    def on_model_trained(self, model_name: str, score: float):
        """Called when a model finishes training."""
        self.models_trained += 1
        self.current_model = model_name

        entry = {
            "timestamp": datetime.now().isoformat(),
            "model": model_name,
            "score": score,
            "models_trained": self.models_trained,
        }
        self.metrics_history.append(entry)

        if self.log_callback:
            asyncio.create_task(
                self.log_callback(f"Trained model: {model_name} (score: {score:.4f})")
            )

    def get_elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        return (datetime.now() - self.start_time).total_seconds()

    def to_dict(self) -> Dict[str, Any]:
        """Export progress info as dictionary."""
        return {
            "job_id": self.job_id,
            "models_trained": self.models_trained,
            "current_model": self.current_model,
            "progress_percent": self.progress_percent,
            "elapsed_seconds": self.get_elapsed_time(),
            "metrics_history": self.metrics_history,
        }
