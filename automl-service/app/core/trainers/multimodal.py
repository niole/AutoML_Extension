"""Multimodal prediction trainer."""

import logging
from typing import Any, Dict, Optional

import pandas as pd

from app.db.models import ProblemType
from .base import BaseTrainer, AdvancedConfig

logger = logging.getLogger(__name__)


class TrainingProgressCallback:
    """Callback for tracking training progress."""

    def __init__(self, job_id: str, log_callback=None):
        self.job_id = job_id
        self.log_callback = log_callback

    def on_progress(self, percent: float, message: str):
        """Called to update progress percentage."""
        if self.log_callback:
            import asyncio
            asyncio.create_task(self.log_callback(f"[{percent:.0f}%] {message}"))


class MultimodalTrainer(BaseTrainer):
    """Trainer for multimodal prediction models."""

    async def train(
        self,
        df: pd.DataFrame,
        target_column: str,
        model_path: str,
        problem_type: Optional[ProblemType] = None,
        preset: str = "medium_quality",
        time_limit: Optional[int] = None,
        eval_metric: Optional[str] = None,
        advanced_config: Optional[AdvancedConfig] = None,
        multimodal_config: Optional[Dict[str, Any]] = None,
        progress: Optional[TrainingProgressCallback] = None,
    ) -> Dict[str, Any]:
        """Run multimodal prediction training."""
        from autogluon.multimodal import MultiModalPredictor

        logger.info("Starting MultiModalPredictor training")
        if progress:
            progress.on_progress(5, "Initializing MultiModalPredictor")

        # Configure predictor
        predictor_kwargs = {
            "label": target_column,
            "path": model_path,
            "verbosity": advanced_config.verbosity if advanced_config else 2,
        }

        if problem_type:
            predictor_kwargs["problem_type"] = problem_type.value

        if eval_metric:
            predictor_kwargs["eval_metric"] = eval_metric

        # Create predictor
        predictor = MultiModalPredictor(**predictor_kwargs)

        # Configure fit parameters
        fit_kwargs = {
            "train_data": df,
            "presets": preset,
        }

        if time_limit:
            fit_kwargs["time_limit"] = time_limit

        # Apply advanced configuration
        if advanced_config:
            if advanced_config.num_gpus > 0:
                fit_kwargs["num_gpus"] = advanced_config.num_gpus

            if advanced_config.hyperparameters:
                fit_kwargs["hyperparameters"] = advanced_config.hyperparameters

        # Apply multimodal-specific config
        if multimodal_config:
            # Build hyperparameters for multimodal
            hyperparameters = fit_kwargs.get("hyperparameters", {})

            # Text model configuration
            if multimodal_config.get("text_backbone"):
                hyperparameters["model.hf_text.checkpoint_name"] = multimodal_config["text_backbone"]
            if multimodal_config.get("text_max_length"):
                hyperparameters["data.text.max_len"] = multimodal_config["text_max_length"]

            # Image model configuration
            if multimodal_config.get("image_backbone"):
                hyperparameters["model.timm_image.checkpoint_name"] = multimodal_config["image_backbone"]
            if multimodal_config.get("image_size"):
                hyperparameters["data.image.image_size"] = multimodal_config["image_size"]

            # Training configuration
            if multimodal_config.get("learning_rate"):
                hyperparameters["optimization.learning_rate"] = multimodal_config["learning_rate"]
            if multimodal_config.get("batch_size"):
                hyperparameters["env.per_gpu_batch_size"] = multimodal_config["batch_size"]
            if multimodal_config.get("max_epochs"):
                hyperparameters["optimization.max_epochs"] = multimodal_config["max_epochs"]
            if multimodal_config.get("warmup_steps"):
                hyperparameters["optimization.warmup_steps"] = multimodal_config["warmup_steps"]
            if multimodal_config.get("weight_decay"):
                hyperparameters["optimization.weight_decay"] = multimodal_config["weight_decay"]
            if multimodal_config.get("gradient_clip_val"):
                hyperparameters["optimization.gradient_clip_val"] = multimodal_config["gradient_clip_val"]

            # Fusion method
            if multimodal_config.get("fusion_method"):
                if multimodal_config["fusion_method"] == "early":
                    hyperparameters["model.fusion.strategy"] = "early"
                else:
                    hyperparameters["model.fusion.strategy"] = "late"

            if hyperparameters:
                fit_kwargs["hyperparameters"] = hyperparameters
                logger.info(f"Multimodal hyperparameters: {hyperparameters}")

        if progress:
            progress.on_progress(10, "Starting model training")

        # Train
        predictor.fit(**fit_kwargs)

        if progress:
            progress.on_progress(90, "Training complete")

        # Get results
        metrics = {
            "problem_type": getattr(predictor, 'problem_type', None),
            "eval_metric": getattr(predictor, 'eval_metric', None),
        }

        # Try to get additional model info
        try:
            model_info = predictor.get_model_info() if hasattr(predictor, 'get_model_info') else {}
            metrics.update(model_info)
        except Exception:
            pass

        # Return leaderboard as list (schema expects List[Dict])
        leaderboard_list = [{"model": "MultiModalPredictor", "info": "Single model predictor"}]

        if progress:
            progress.on_progress(100, "Training completed successfully")

        logger.info("Multimodal training completed")

        return {
            "metrics": metrics,
            "leaderboard": leaderboard_list,
            "model_path": model_path,
            "predictor": predictor,
        }
