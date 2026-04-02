"""Domino Job entrypoint for async EDA profiling."""

import argparse
import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path


def _ensure_project_root_on_path() -> None:
    """Ensure the repository root is importable when run as a Domino Job."""
    current_file = Path(__file__).resolve()
    project_root = current_file.parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    os.chdir(project_root)


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run AutoML EDA profile from Domino")
    parser.add_argument("--request-id", type=str, required=True)
    parser.add_argument("--mode", choices=["tabular", "timeseries"], default="tabular")
    parser.add_argument("--file-path", required=True)
    parser.add_argument("--experiment-name", type=str, required=True)
    parser.add_argument("--sample-size", type=int, default=50000)
    parser.add_argument("--sampling-strategy", default="random")
    parser.add_argument("--stratify-column", default=None)
    parser.add_argument("--time-column", default=None)
    parser.add_argument("--target-column", default=None)
    parser.add_argument("--id-column", default=None)
    parser.add_argument("--rolling-window", type=int, default=None)
    return parser.parse_args()


async def main() -> None:
    """CLI entrypoint."""
    args = parse_args()

    _ensure_project_root_on_path()

    from app.core.data_profiler import get_data_profiler
    from app.core.ts_profiler import get_ts_profiler
    from app.core.eda_job_metadata import (
        EDA_JOB_REQUEST_ID_TAG,
        EDA_JOB_RESULT_ARTIFACT_PATH,
        EDA_JOB_SOURCE_TAG,
        EDA_JOB_SOURCE_VALUE,
    )
    import mlflow

    try:
        if args.mode == "tabular":
            result = await get_data_profiler().profile_file(
                file_path=args.file_path,
                sample_size=args.sample_size,
                sampling_strategy=args.sampling_strategy,
                stratify_column=args.stratify_column,
            )
        else:
            if not args.time_column or not args.target_column:
                raise ValueError("time_column and target_column are required for timeseries profiling")
            result = await get_ts_profiler().profile_timeseries_file(
                file_path=args.file_path,
                time_column=args.time_column,
                target_column=args.target_column,
                id_column=args.id_column,
                sample_size=args.sample_size,
                sampling_strategy=args.sampling_strategy,
                rolling_window=args.rolling_window,
            )

        # write result to an experiment
        mlflow.set_experiment(args.experiment_name)
        run_tags = {
            EDA_JOB_REQUEST_ID_TAG: args.request_id,
            EDA_JOB_SOURCE_TAG: EDA_JOB_SOURCE_VALUE,
            "mode": args.mode,
        }
        with mlflow.start_run(run_name=f"eda_{args.request_id[:8]}", tags=run_tags):
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir) / EDA_JOB_RESULT_ARTIFACT_PATH
                with temp_path.open("w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, default=str)
                mlflow.log_artifact(str(temp_path), artifact_path=None)

    except Exception as e:
        error_message = str(e)
        raise


if __name__ == "__main__":
    asyncio.run(main())
