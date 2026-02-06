"""Base trainer class with shared configuration and utilities."""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class HpoConfig:
    """Hyperparameter optimization configuration."""
    enabled: bool = False
    scheduler: str = "local"
    searcher: str = "auto"
    num_trials: int = 10
    max_t: Optional[int] = None
    grace_period: Optional[int] = None
    reduction_factor: Optional[float] = None


@dataclass
class ThresholdConfig:
    """Decision threshold calibration configuration."""
    enabled: bool = False
    metric: str = "balanced_accuracy"
    thresholds_to_try: int = 100


@dataclass
class AdvancedConfig:
    """Advanced AutoGluon configuration options."""
    # General
    num_gpus: int = 0
    num_cpus: Optional[int] = None
    verbosity: int = 2

    # Training
    num_bag_folds: Optional[int] = None
    num_bag_sets: Optional[int] = None
    num_stack_levels: Optional[int] = None
    holdout_frac: Optional[float] = None
    auto_stack: bool = False
    dynamic_stacking: bool = False

    # Model selection
    excluded_model_types: List[str] = field(default_factory=list)
    included_model_types: List[str] = field(default_factory=list)

    # Hyperparameters
    hyperparameters: Optional[Dict[str, Any]] = None
    hyperparameter_tune_kwargs: Optional[Dict[str, Any]] = None

    # NEW: Hyperparameter tuning (HPO)
    hpo_config: Optional[HpoConfig] = None

    # NEW: Per-model hyperparameters
    per_model_hyperparameters: Optional[Dict[str, Dict[str, Any]]] = None

    # Early stopping
    ag_args_fit: Optional[Dict[str, Any]] = None

    # Feature engineering
    feature_generator: Optional[str] = None
    feature_generator_kwargs: Optional[Dict[str, Any]] = None
    feature_prune: bool = False
    feature_prune_kwargs: Optional[Dict[str, Any]] = None
    feature_metadata: Optional[Dict[str, str]] = None
    drop_unique: bool = False

    # Calibration
    calibrate: bool = False

    # NEW: Decision threshold calibration
    threshold_config: Optional[ThresholdConfig] = None

    # Ensemble
    refit_full: bool = False
    set_best_to_refit_full: bool = False

    # NEW: Pseudo-labeling
    pseudo_labeling: bool = False
    unlabeled_data_path: Optional[str] = None

    # NEW: Foundation models (2025)
    use_tabular_foundation_models: bool = False
    foundation_model_preset: Optional[str] = None

    # Class imbalance
    class_imbalance_strategy: Optional[str] = None
    sample_weight_column: Optional[str] = None

    # Distillation
    distill: bool = False
    distill_time_limit: Optional[int] = None

    # Use bag holdout
    use_bag_holdout: bool = False

    # Inference limit
    infer_limit: Optional[float] = None

    # Cache data
    cache_data: bool = True


class BaseTrainer:
    """Base class for all AutoGluon trainers."""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    def load_data(self, data_path: str) -> pd.DataFrame:
        """Load data from file with format detection."""
        if data_path.endswith(".csv"):
            return pd.read_csv(data_path)
        elif data_path.endswith((".parquet", ".pq")):
            return pd.read_parquet(data_path)
        elif data_path.endswith(".json"):
            return pd.read_json(data_path)
        elif data_path.endswith((".xlsx", ".xls")):
            return pd.read_excel(data_path)
        else:
            # Try CSV as default
            try:
                return pd.read_csv(data_path)
            except Exception:
                raise ValueError(f"Unsupported file format: {data_path}")
