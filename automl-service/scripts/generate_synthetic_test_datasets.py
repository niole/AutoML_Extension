"""Generate synthetic datasets for all supported AutoML model families.

This script creates small and large datasets for:
- Tabular binary classification
- Tabular multiclass classification
- Tabular regression
- Time series forecasting (single series)
- Time series forecasting (multi-series panel)

Datasets are written under local_data/datasets (not uploads), so they are not
affected by upload/orphan cleanup routines.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "local_data" / "datasets" / "synthetic_generated_suite"
SEED = 20260216


@dataclass(frozen=True)
class DatasetSpec:
    name: str
    model_type: str
    problem_type: str
    target_column: str
    rows: int
    notes: str


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _base_tabular_features(n_rows: int, rng: np.random.Generator) -> pd.DataFrame:
    age = rng.integers(18, 82, size=n_rows)
    tenure_months = rng.integers(1, 121, size=n_rows)
    income_k = np.clip(rng.normal(78, 24, size=n_rows), 20, 250)
    monthly_spend = np.clip(rng.gamma(shape=3.2, scale=28.0, size=n_rows), 8, None)
    support_tickets_90d = rng.poisson(lam=1.3, size=n_rows)
    logins_30d = np.clip(rng.normal(24, 9, size=n_rows), 0, None)
    discount_rate = np.clip(rng.beta(2.2, 8.2, size=n_rows), 0, 0.55)
    auto_pay = rng.integers(0, 2, size=n_rows)
    is_enterprise = rng.binomial(1, 0.12, size=n_rows)
    region = rng.choice(
        ["north", "south", "east", "west", "central"],
        size=n_rows,
        p=[0.21, 0.2, 0.22, 0.18, 0.19],
    )
    channel = rng.choice(
        ["web", "mobile", "partner", "inside_sales"],
        size=n_rows,
        p=[0.46, 0.29, 0.13, 0.12],
    )
    product_family = rng.choice(
        ["starter", "growth", "pro", "enterprise_plus"],
        size=n_rows,
        p=[0.34, 0.33, 0.24, 0.09],
    )
    profile_note = np.where(
        support_tickets_90d > 3,
        "needs_support_followup",
        np.where(discount_rate > 0.35, "price_sensitive", "stable_account"),
    )

    df = pd.DataFrame(
        {
            "customer_id": [f"CUST_{i:08d}" for i in range(n_rows)],
            "age": age,
            "tenure_months": tenure_months,
            "income_k": income_k.round(2),
            "monthly_spend": monthly_spend.round(2),
            "support_tickets_90d": support_tickets_90d,
            "logins_30d": np.round(logins_30d, 1),
            "discount_rate": np.round(discount_rate, 4),
            "auto_pay": auto_pay,
            "is_enterprise": is_enterprise,
            "region": region,
            "channel": channel,
            "product_family": product_family,
            "profile_note": profile_note,
        }
    )

    missing_income = rng.random(n_rows) < 0.03
    missing_logins = rng.random(n_rows) < 0.02
    df.loc[missing_income, "income_k"] = np.nan
    df.loc[missing_logins, "logins_30d"] = np.nan
    return df


def generate_tabular_binary(n_rows: int, rng: np.random.Generator) -> pd.DataFrame:
    df = _base_tabular_features(n_rows, rng)
    linear = (
        -2.0
        + 0.009 * df["monthly_spend"].to_numpy()
        + 0.48 * (df["discount_rate"].to_numpy() > 0.25).astype(float)
        + 0.52 * (df["support_tickets_90d"].to_numpy() >= 3).astype(float)
        - 0.015 * df["tenure_months"].to_numpy()
        - 0.06 * df["auto_pay"].to_numpy()
        + 0.42 * (df["channel"].to_numpy() == "partner").astype(float)
        + rng.normal(0, 0.45, size=n_rows)
    )
    probability = _sigmoid(linear)
    df["churned"] = rng.binomial(1, probability)
    return df


def generate_tabular_multiclass(n_rows: int, rng: np.random.Generator) -> pd.DataFrame:
    df = _base_tabular_features(n_rows, rng)
    latent = (
        0.8 * df["is_enterprise"].to_numpy()
        + 0.012 * df["income_k"].fillna(df["income_k"].median()).to_numpy()
        + 0.026 * df["monthly_spend"].to_numpy()
        + 0.10 * (df["product_family"].to_numpy() == "pro").astype(float)
        + 0.18 * (df["product_family"].to_numpy() == "enterprise_plus").astype(float)
        - 0.12 * (df["support_tickets_90d"].to_numpy() > 4).astype(float)
        + rng.normal(0, 0.6, size=n_rows)
    )
    q1 = np.quantile(latent, 0.33)
    q2 = np.quantile(latent, 0.67)
    segments = np.where(
        latent < q1,
        "segment_basic",
        np.where(latent < q2, "segment_growth", "segment_premium"),
    )
    df["customer_segment"] = segments
    return df


def generate_tabular_regression(n_rows: int, rng: np.random.Generator) -> pd.DataFrame:
    df = _base_tabular_features(n_rows, rng)
    income = df["income_k"].fillna(df["income_k"].median()).to_numpy()
    projected = (
        220
        + 6.8 * df["monthly_spend"].to_numpy()
        + 1.9 * income
        + 3.2 * df["tenure_months"].to_numpy()
        - 95 * df["discount_rate"].to_numpy()
        + 42 * df["auto_pay"].to_numpy()
        + 180 * df["is_enterprise"].to_numpy()
        - 28 * df["support_tickets_90d"].to_numpy()
        + rng.normal(0, 120, size=n_rows)
    )
    df["next_90d_revenue"] = np.maximum(projected, 20).round(2)
    return df


def generate_timeseries_single(n_rows: int, rng: np.random.Generator, freq: str = "D") -> pd.DataFrame:
    timestamps = pd.date_range("2021-01-01", periods=n_rows, freq=freq)
    t = np.arange(n_rows)
    promo = rng.binomial(1, 0.17, size=n_rows)
    holiday = np.asarray((timestamps.dayofweek >= 5), dtype=int)
    price = 55 + np.cumsum(rng.normal(0, 0.08, size=n_rows)) + 0.15 * np.sin(2 * np.pi * t / 30)
    signal = (
        180
        + 0.03 * t
        + 16 * np.sin(2 * np.pi * t / 7)
        + 8 * np.sin(2 * np.pi * t / 30)
        + 14 * promo
        - 1.4 * price
        + 6.0 * holiday
        + rng.normal(0, 4.0, size=n_rows)
    )
    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "sales": np.maximum(signal, 5).round(2),
            "promo_flag": promo,
            "holiday_flag": holiday,
            "unit_price": np.round(price, 3),
        }
    )


def generate_timeseries_panel(
    n_series: int,
    periods: int,
    rng: np.random.Generator,
    freq: str = "D",
) -> pd.DataFrame:
    timestamps = pd.date_range("2020-01-01", periods=periods, freq=freq)
    records: list[dict[str, Any]] = []
    for sid in range(n_series):
        item_id = f"store_{sid:03d}"
        base = rng.normal(140, 25)
        trend = rng.normal(0.02, 0.01)
        seasonal_amp = rng.uniform(8, 24)
        noise_scale = rng.uniform(2.5, 6.0)
        cluster = rng.choice(["urban", "suburban", "rural"], p=[0.45, 0.35, 0.2])
        t = np.arange(periods)
        promo = rng.binomial(1, 0.14, size=periods)
        price = 52 + rng.normal(0, 1.5, size=periods) + 0.08 * sid
        inventory = np.maximum(0, rng.normal(220, 35, size=periods))
        sales = (
            base
            + trend * t
            + seasonal_amp * np.sin(2 * np.pi * t / 7)
            + 0.5 * seasonal_amp * np.sin(2 * np.pi * t / 30)
            + 11 * promo
            - 1.15 * price
            + 0.03 * inventory
            + rng.normal(0, noise_scale, size=periods)
        )
        for i, ts in enumerate(timestamps):
            records.append(
                {
                    "item_id": item_id,
                    "timestamp": ts,
                    "sales": round(float(max(1.0, sales[i])), 2),
                    "promo_flag": int(promo[i]),
                    "unit_price": round(float(price[i]), 3),
                    "inventory_on_hand": round(float(inventory[i]), 2),
                    "store_cluster": cluster,
                }
            )
    return pd.DataFrame.from_records(records)


def write_dataset(dataset_name: str, df: pd.DataFrame, out_dir: Path) -> dict[str, Any]:
    csv_path = out_dir / f"{dataset_name}.csv"
    parquet_path = out_dir / f"{dataset_name}.parquet"
    df.to_csv(csv_path, index=False)

    parquet_written = False
    parquet_error = None
    try:
        df.to_parquet(parquet_path, index=False)
        parquet_written = True
    except Exception as exc:  # pragma: no cover - environment dependent
        parquet_error = str(exc)

    return {
        "dataset": dataset_name,
        "rows": int(len(df)),
        "columns": list(df.columns),
        "csv_path": str(csv_path),
        "parquet_path": str(parquet_path) if parquet_written else None,
        "parquet_error": parquet_error,
    }


def _build_readme(specs: list[DatasetSpec], generated: list[dict[str, Any]]) -> str:
    by_name = {row["dataset"]: row for row in generated}
    lines = [
        "# Synthetic Test Dataset Suite",
        "",
        "Location: `automl-service/local_data/datasets/synthetic_generated_suite/`",
        "",
        "This folder is outside `uploads/` and is safe from upload/orphan cleanup.",
        "",
        "## Dataset Matrix",
        "",
        "| Dataset | Model Type | Problem Type | Target | Rows | Notes |",
        "|---|---|---|---|---:|---|",
    ]
    for spec in specs:
        row = by_name[spec.name]
        lines.append(
            f"| `{spec.name}` | `{spec.model_type}` | `{spec.problem_type}` | "
            f"`{spec.target_column}` | {row['rows']} | {spec.notes} |"
        )

    lines.extend(
        [
            "",
            "## Usage Tips",
            "",
            "- Tabular jobs: choose one of the `tabular_*` files and set the matching target column.",
            "- Time series jobs: use `timestamp` as time column and `sales` as target.",
            "- Multi-series forecasting: use `timeseries_panel_*` files and set `item_id` as ID column.",
            "- Each dataset is provided as CSV; Parquet is also generated when parquet support is available.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    rng = np.random.default_rng(SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    dataset_builders: list[tuple[DatasetSpec, pd.DataFrame]] = [
        (
            DatasetSpec(
                name="tabular_binary_small",
                model_type="tabular",
                problem_type="binary",
                target_column="churned",
                rows=2_500,
                notes="Includes mixed numeric/categorical/text features and missing values.",
            ),
            generate_tabular_binary(2_500, rng),
        ),
        (
            DatasetSpec(
                name="tabular_binary_large",
                model_type="tabular",
                problem_type="binary",
                target_column="churned",
                rows=200_000,
                notes="High-row-count binary classification stress test.",
            ),
            generate_tabular_binary(200_000, rng),
        ),
        (
            DatasetSpec(
                name="tabular_multiclass_small",
                model_type="tabular",
                problem_type="multiclass",
                target_column="customer_segment",
                rows=3_000,
                notes="Three classes with moderate overlap.",
            ),
            generate_tabular_multiclass(3_000, rng),
        ),
        (
            DatasetSpec(
                name="tabular_multiclass_large",
                model_type="tabular",
                problem_type="multiclass",
                target_column="customer_segment",
                rows=220_000,
                notes="Large multiclass workload for scaling tests.",
            ),
            generate_tabular_multiclass(220_000, rng),
        ),
        (
            DatasetSpec(
                name="tabular_regression_small",
                model_type="tabular",
                problem_type="regression",
                target_column="next_90d_revenue",
                rows=2_500,
                notes="Continuous target with heteroscedastic noise.",
            ),
            generate_tabular_regression(2_500, rng),
        ),
        (
            DatasetSpec(
                name="tabular_regression_large",
                model_type="tabular",
                problem_type="regression",
                target_column="next_90d_revenue",
                rows=200_000,
                notes="Large regression benchmark.",
            ),
            generate_tabular_regression(200_000, rng),
        ),
        (
            DatasetSpec(
                name="timeseries_single_small",
                model_type="timeseries",
                problem_type="forecast",
                target_column="sales",
                rows=900,
                notes="Single-series daily forecast with covariates.",
            ),
            generate_timeseries_single(900, rng, freq="D"),
        ),
        (
            DatasetSpec(
                name="timeseries_single_large",
                model_type="timeseries",
                problem_type="forecast",
                target_column="sales",
                rows=40_000,
                notes="Single-series hourly forecast with long history.",
            ),
            generate_timeseries_single(40_000, rng, freq="h"),
        ),
        (
            DatasetSpec(
                name="timeseries_panel_small",
                model_type="timeseries",
                problem_type="forecast",
                target_column="sales",
                rows=7_300,
                notes="20 series x 365 days panel forecast.",
            ),
            generate_timeseries_panel(20, 365, rng, freq="D"),
        ),
        (
            DatasetSpec(
                name="timeseries_panel_large",
                model_type="timeseries",
                problem_type="forecast",
                target_column="sales",
                rows=146_000,
                notes="200 series x 730 days panel scaling test.",
            ),
            generate_timeseries_panel(200, 730, rng, freq="D"),
        ),
    ]

    generated: list[dict[str, Any]] = []
    specs: list[DatasetSpec] = []
    for spec, frame in dataset_builders:
        specs.append(spec)
        generated.append(write_dataset(spec.name, frame, OUTPUT_DIR))

    manifest = {
        "seed": SEED,
        "output_dir": str(OUTPUT_DIR),
        "datasets": generated,
    }
    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )

    readme = _build_readme(specs, generated)
    (OUTPUT_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(f"Synthetic dataset suite generated at: {OUTPUT_DIR}")
    for row in generated:
        parquet_note = " + parquet" if row["parquet_path"] else " (csv only)"
        print(f"- {row['dataset']}: {row['rows']} rows{parquet_note}")


if __name__ == "__main__":
    main()
