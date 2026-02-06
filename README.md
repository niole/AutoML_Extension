# AutoML Studio

A full-stack AutoML platform built on [AutoGluon](https://auto.gluon.ai/) and [Domino Data Lab](https://www.dominodatalab.com/). Provides a web UI for training, evaluating, and deploying ML models across tabular, time series, and multimodal data types.

## Architecture

```
automl-service/          FastAPI backend (Python 3.11, AutoGluon 1.5, MLflow)
automl-ui/               React frontend (TypeScript, Vite, Tailwind CSS)
sample_projects/         Example datasets (customer churn)
app.sh                   Combined startup script for Domino Apps
Dockerfile               Container build for Domino deployment
```

### Backend (`automl-service/`)

**~11,400 LOC** across 43 Python files. Async FastAPI with SQLAlchemy ORM, AutoGluon ML, and MLflow tracking.

| Layer | Files | Purpose |
|-------|-------|---------|
| `app/api/routes/` | 9 routers | REST endpoints (50+ routes) + WebSocket |
| `app/api/schemas/` | 3 files | Pydantic request/response models |
| `app/core/` | 12 services | Predictions, diagnostics, export, MLflow, Domino integration |
| `app/core/trainers/` | 4 trainers | Tabular, timeseries, multimodal training (split from monolithic runner) |
| `app/db/` | 3 files | SQLAlchemy models, async CRUD, migrations |
| `app/workers/` | 1 file | Background training orchestration |

### Frontend (`automl-ui/`)

**~13,500 LOC** across 70 TypeScript files. React 18 with React Query for server state and Zustand for UI state.

| Layer | Files | Purpose |
|-------|-------|---------|
| `src/pages/` | 4 pages | Dashboard, NewJob wizard, JobDetail, EDA Analysis |
| `src/components/` | 37 components | Common UI, wizard steps, diagnostics, charts, EDA |
| `src/hooks/` | 10 hooks | Data fetching (jobs, datasets, models, diagnostics, progress) |
| `src/utils/` | 3 files | Shared formatters, notebook generator, error handling |
| `src/api/` | 4 files | Fetch-based API client with Domino endpoint mapping |
| `src/types/` | 8 files | TypeScript type definitions |

## Features

- **Training Wizard**: 4-step workflow (data source, model type, configuration, review) with advanced AutoGluon config (bagging, stacking, HPO, pseudo-labeling, distillation)
- **Model Diagnostics**: Feature importance, leaderboard, confusion matrix, ROC/PR curves, SHAP explanations, learning curves
- **Exploratory Data Analysis**: Interactive data profiling, column explorer, correlation matrix, data quality checks, notebook export
- **Dataset Management**: Upload CSV/Parquet or connect to Domino Datasets
- **Model Registry**: MLflow integration for versioning and stage transitions
- **Model Export**: ONNX, PMML, and pickle formats
- **Deployment**: Deploy trained models to Domino Model APIs
- **Experiment Tracking**: MLflow logging of per-model hyperparameters, metrics, and artifacts
- **Real-time Progress**: WebSocket-based training progress updates

## Quick Start

### Prerequisites

- Python 3.11 (recommended for AutoGluon compatibility)
- Node.js 20+
- [uv](https://github.com/astral-sh/uv) (recommended for Python dependency installation)

### Backend

```bash
cd automl-service

# Option A: Using uv (recommended — handles AutoGluon's 200+ transitive deps)
pip install uv
VIRTUAL_ENV=../.venv uv pip install -r requirements.txt

# Option B: Using pip (may hit resolution-too-deep on complex dep graphs)
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd automl-ui
npm install
npm run dev        # Dev server on http://localhost:5173
npm run build      # Production build
```

### Domino Deployment

The `app.sh` script starts both backend and frontend as a combined Domino App:
```bash
# Runs automatically when deployed as a Domino App
./app.sh
```

## API Reference

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jobs` | Create training job |
| GET | `/api/v1/jobs` | List jobs (filter by status, owner, project) |
| GET | `/api/v1/jobs/{id}` | Get job details |
| DELETE | `/api/v1/jobs/{id}` | Delete job |
| POST | `/api/v1/jobs/{id}/cancel` | Cancel running job |
| GET | `/api/v1/jobs/{id}/progress` | Get training progress |
| GET | `/api/v1/jobs/{id}/logs` | Get job logs |
| POST | `/api/v1/jobs/{id}/register` | Register model to MLflow |
| WS | `/ws/jobs/{id}` | Real-time progress updates |

### Datasets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/datasets` | List local datasets |
| POST | `/api/v1/datasets/upload` | Upload CSV/Parquet |
| GET | `/api/v1/datasets/{id}` | Get dataset metadata |
| GET | `/api/v1/datasets/{id}/preview` | Preview rows |
| GET | `/api/v1/datasets/{id}/download` | Download file |
| DELETE | `/api/v1/datasets/{id}` | Delete dataset |
| GET | `/api/v1/domino-datasets` | List Domino Datasets |

### Model Diagnostics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/models/{id}/diagnostics/feature-importance` | Feature importance |
| GET | `/api/v1/models/{id}/diagnostics/leaderboard` | Model leaderboard |
| GET | `/api/v1/models/{id}/diagnostics/confusion-matrix` | Confusion matrix |
| GET | `/api/v1/models/{id}/diagnostics/roc-curve` | ROC curve |
| GET | `/api/v1/models/{id}/diagnostics/precision-recall` | PR curve |
| GET | `/api/v1/models/{id}/diagnostics/regression` | Regression metrics |
| GET | `/api/v1/models/{id}/diagnostics/shap` | SHAP explanations |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/predict/{id}` | Single/batch prediction |
| POST | `/api/v1/predict/{id}/file` | Predict from CSV upload |
| POST | `/api/v1/batch-predict/{id}` | Batch prediction |
| POST | `/api/v1/forecast/{id}` | Time series forecast |

### Registry & Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/registry/register` | Register model to MLflow |
| GET | `/api/v1/registry/models` | List registered models |
| POST | `/api/v1/export/{id}/onnx` | Export to ONNX |
| POST | `/api/v1/export/{id}/pmml` | Export to PMML |
| POST | `/api/v1/export/{id}/pickle` | Export to pickle |

### Deployments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/deployments/deploy/{id}` | Deploy to Domino Model API |
| GET | `/api/v1/deployments` | List deployments |
| POST | `/api/v1/deployments/{id}/start` | Start deployment |
| POST | `/api/v1/deployments/{id}/stop` | Stop deployment |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite URL (default: `sqlite:///./automl.db`) |
| `MODELS_PATH` | No | Model storage directory |
| `DATASETS_PATH` | No | Dataset storage directory |
| `UPLOADS_PATH` | No | Upload directory |
| `TEMP_PATH` | No | Temp directory |
| `DOMINO_USER_API_KEY` | Domino only | Domino API key |
| `DOMINO_API_HOST` | Domino only | Domino API endpoint |
| `DOMINO_PROJECT_ID` | Domino only | Current project ID |
| `DOMINO_PROJECT_NAME` | Domino only | Current project name |
| `MLFLOW_TRACKING_URI` | Domino only | MLflow tracking server |

## Technology Stack

### Backend
- **Python 3.11** with async FastAPI
- **AutoGluon 1.5** (Tabular, TimeSeries, Multimodal)
- **SQLAlchemy 2.0** + aiosqlite (async SQLite)
- **MLflow 3.9** for experiment tracking
- **Ray Tune** for hyperparameter optimization
- **PyTorch 2.9** (underlying ML framework)

### Frontend
- **React 18** with TypeScript
- **Vite 5** (build tool)
- **Tailwind CSS 3.4** (utility-first styling)
- **TanStack React Query 5** (server state)
- **Zustand 4** (UI state)
- **Recharts 2** (charting)
- **Headless UI** + **Heroicons** (accessible components)

## License

MIT License
