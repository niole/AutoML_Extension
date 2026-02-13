# AutoML: Run Locally vs Domino Job — Implementation Plan

## 1. Overview and Goals

- **Training:** Light jobs run **in-process** (current behavior). Heavy/production jobs can run as a **Domino Job** (user choice, optional heuristic).
- **EDA:** Default is **in-process** (synchronous). Optional **"Run EDA as Domino Job"** for large files or when the user wants a job.
- **Principle:** One code path per feature (same training logic, same profiling logic); two execution modes: **local (in-app)** vs **Domino Job**. User (and optionally heuristics) decides which mode.

---

## 2. Training: Detailed Plan

### 2.1 Behavior Summary

| Mode            | When Used                          | How It Runs                                      | Progress / Status                          |
|-----------------|------------------------------------|--------------------------------------------------|-------------------------------------------|
| **Local**       | Default, or user leaves toggle off | `BackgroundTasks.add_task(run_training_job, id)` | Existing: DB + WebSocket                  |
| **Domino Job**  | User turns "Run as Domino Job" on  | `dominodatalab` `job_start` → separate run       | Same: runner updates DB; optional poll UI |

### 2.2 Backend

- **New dependency**
  - Add `dominodatalab` to `automl-service/requirements.txt` (version per Domino; e.g. `dominodatalab>=2.0.0` for 6.2+).

- **Domino job launcher** (new module)
  - **File:** `automl-service/app/core/domino_job_launcher.py`
  - **Responsibilities:**
    - Build `Domino(project=f"{owner}/{project_name}", api_key=..., host=...)` from app config (`domino_project_owner`, `domino_project_name`, effective API key, `domino_api_host`).
    - `start_training_job(job_id: str, title: str | None, hardware_tier_name: str | None) -> dict`:
      - Command: `python -m app.workers.domino_training_runner --job-id <job_id>`
      - Call `domino.job_start(command=..., title=..., hardware_tier_name=...)`
      - Return `{ "success": True, "domino_run_id": "<id>" }` or `{ "success": False, "error": "..." }`
    - `stop_training_job(domino_run_id: str) -> dict` (for cancel): call `domino.job_stop(domino_run_id)`.
  - Only call Domino when `settings.is_domino_environment()` and project/credentials are set; otherwise return a clear error.

- **Domino training runner** (entrypoint for the Domino run)
  - **File:** `automl-service/app/workers/domino_training_runner.py`
  - **Responsibilities:**
    - CLI: `python -m app.workers.domino_training_runner --job-id <uuid>`
    - Ensure project root is on `sys.path` so `app` is importable.
    - `asyncio.run(run_training_job(args.job_id))` — reuse existing `run_training_job`; no change to training logic.
  - Same env as app in Domino (DB, Domino vars, datasets, uploads path) so the runner can read job from DB and write progress/results.

- **Job creation API**
  - **Request:** Add `run_as_domino_job: bool = False` to the job-create schema (e.g. in `JobCreateRequest`).
  - **Handler** (e.g. in `app/api/routes/jobs.py`):
    - Create job record as today (status PENDING).
    - If `run_as_domino_job` and Domino env:
      - Call `start_training_job(job.id, title=job.name, ...)`.
      - On success: save `domino_run_id` on the job (new field), do **not** call `background_tasks.add_task(run_training_job, ...)`.
      - On failure: set job status to FAILED, set `error_message`, return 502 or 400 with detail.
    - Else (local):
      - `background_tasks.add_task(run_training_job, job.id)` (current behavior).
  - Return the job as today (include `domino_run_id` in response if present).

- **Cancel job API**
  - When user cancels a job:
    - If job has `domino_run_id`: call launcher's `stop_training_job(domino_run_id)` then update job status (e.g. CANCELLED/FAILED) and message in DB.
    - If no `domino_run_id`: only update DB (and any in-process cancel logic you add later for local runs).

- **Database**
  - Add nullable column `domino_run_id` (e.g. `String(255)`) to the jobs table.
  - Migration script to add the column.
  - CRUD: method to update `domino_run_id` for a job (e.g. `update_job_domino_run_id(db, job_id, domino_run_id)`); include `domino_run_id` in job serialization for API/UI.

### 2.3 Frontend (Training)

- **Wizard / job create UI**
  - Add control for execution target:
    - **Option A:** Checkbox "Run as Domino Job" with short description: "Use a Domino Job for heavier training or production runs (recommended for long time limits or large data)."
    - **Option B:** Select "Where to run: In app (faster for small jobs) | Domino Job (for heavy/production)."
  - Send `run_as_domino_job: true/false` in the job-create request (map from checkbox or select).
  - Optional: when user sets a long time limit (e.g. > 30 min) or a "production" preset, pre-check "Run as Domino Job" and show a brief explanation; user can still uncheck.

- **Job detail / list**
  - Show when a job is running as a Domino Job (e.g. badge or "Domino Job" label).
  - Optional: link to Domino run (e.g. `{DOMINO_UI_BASE}/projects/.../runs/{domino_run_id}`) using `domino_run_id`.

### 2.4 Configuration and Environment

- **App** (where the UI runs): Already has `DOMINO_PROJECT_ID`, `DOMINO_PROJECT_NAME`, `DOMINO_PROJECT_OWNER`, `DOMINO_API_HOST`, API key. Launcher uses these (project = `owner/name`).
- **Domino Job run** (training): Same project and env so that:
  - Same code (repo) and `app.workers.domino_training_runner` are available.
  - Same `DATABASE_URL` if DB is shared (e.g. SQLite on shared volume or Postgres).
  - Same Domino env vars (datasets, MLflow, etc.).
- **Data:** Domino datasets and uploads path (e.g. `/mnt/data/...` or shared volume) must be accessible from the Domino Job; upload path should be on shared storage when running on Domino so the job can read `job.file_path`.

---

## 3. EDA: Detailed Plan

### 3.1 Behavior Summary

| Mode            | When Used                    | How It Runs                          | Result for User                          |
|-----------------|-----------------------------|--------------------------------------|------------------------------------------|
| **In-process**  | Default                     | Synchronous POST → profiler in-app   | Immediate response with profile          |
| **Domino Job**  | User chooses "Run in job"   | Start Domino Job → poll until done   | Profile when job completes, then display |

### 3.2 Backend

- **Domino EDA launcher**
  - In the same launcher module or a small EDA-specific one: `start_eda_job(file_path: str, request_id: str, params: dict) -> dict`.
  - Command for the run: e.g.  
    `python -m app.workers.domino_eda_runner --request-id <id> --file-path <path> --sample-size <n> ...`  
    (pass all needed profile params as CLI args or via a small JSON file in a known path).
  - Returns `{ "success": True, "domino_run_id": "..." }` or `{ "success": False, "error": "..." }`.

- **Domino EDA runner** (entrypoint for the Domino run)
  - **File:** `automl-service/app/workers/domino_eda_runner.py`
  - **Responsibilities:**
    - Parse args: `--request-id`, `--file-path`, `--sample-size`, sampling strategy, time column/target (for TS), etc.
    - Call existing `DataProfiler().profile_file(...)` or `TimeSeriesProfiler().profile_timeseries_file(...)` (same code as in-process).
    - Write result to a known path, e.g. `/mnt/data/automl/eda_results/{request_id}.json` (or under `TEMP_PATH` / shared volume). Ensure directory exists.
    - Exit 0 on success.

- **EDA API**
  - **Existing:** Keep synchronous endpoints as-is (e.g. `POST /profile`, `POST /profile/timeseries`). No change for default "in-process" EDA.
  - **New – start async EDA job:**
    - `POST /api/v1/profile/async` (or `/profile/run-as-job`).
    - Body: same (or subset of) params as sync profile (file_path, sample_size, sampling_strategy, stratify_column; for TS: time_column, target_column, id_column, rolling_window, etc.).
    - Handler:
      - Generate a unique `request_id` (UUID).
      - Optionally create a small "EDA job" record in DB (request_id, file_path, status PENDING, created_at) if you want to track history.
      - Call `start_eda_job(file_path, request_id, params)`.
      - On success: return `{ "request_id": "<uuid>", "domino_run_id": "<id>", "status": "running" }`.
      - On failure: return 502 with error detail.
  - **New – get async EDA result:**
    - `GET /api/v1/profile/async/{request_id}` (or `/profile/job-result/{request_id}`).
    - Check if result file exists (e.g. `.../eda_results/{request_id}.json`).
    - If exists: load JSON, return profile payload (same shape as sync profile response).
    - If not: optionally check Domino job status by `domino_run_id` (if stored); return `{ "status": "running" }` or `{ "status": "failed", "error": "..." }`; otherwise `{ "status": "pending" }`.

- **Storage for async EDA**
  - Shared path between app and Domino Job (e.g. `/mnt/data/automl/eda_results/` or `TEMP_PATH`). Create dir at startup; runner writes `{request_id}.json` there.

### 3.3 Frontend (EDA)

- **EDA page**
  - Keep current flow: user selects file/source and clicks "Profile" or "Run analysis" → sync request by default (current behavior).
  - Add optional control:
    - Checkbox "Run EDA as Domino Job" or "Use Domino Job for large data" with tooltip: "Use for very large files or when you want the analysis to run in the background."
  - When "Run as Domino Job" is checked:
    - Call `POST /profile/async` with same params.
    - Show "Profiling in progress…" and poll `GET /profile/async/{request_id}` every few seconds.
    - On response with profile data: render the same EDA views as for sync (overview, columns, correlations, etc.).
    - On `status: "failed"`: show error message.
    - Optional: show link to Domino run when `domino_run_id` is present.

---

## 4. Shared Implementation Checklist

### 4.1 Dependencies and Launcher

- [ ] Add `dominodatalab` to `automl-service/requirements.txt` (version per Domino).
- [ ] Implement `app/core/domino_job_launcher.py` with:
  - [ ] `Domino(project=owner/name, api_key=..., host=...)` from config.
  - [ ] `start_training_job(job_id, title, hardware_tier_name)` using `job_start`.
  - [ ] `stop_training_job(domino_run_id)` using `job_stop`.
  - [ ] (Optional) `start_eda_job(...)` and, if needed, `stop_eda_job(domino_run_id)`.

### 4.2 Training

- [ ] Add `app/workers/domino_training_runner.py` (CLI → `run_training_job(job_id)`).
- [ ] Add `domino_run_id` to job model and migration; CRUD for updating it.
- [ ] Add `run_as_domino_job` to job create schema and handler; branch to launcher vs `BackgroundTasks`.
- [ ] Update cancel-job handler to call `stop_training_job` when `domino_run_id` is set.
- [ ] UI: "Run as Domino Job" (or equivalent) and send flag; show Domino Job badge/link where useful.

### 4.3 EDA

- [ ] Add `app/workers/domino_eda_runner.py` (CLI → profile → write result JSON to shared path).
- [ ] Add `POST /profile/async` and `GET /profile/async/{request_id}` (and shared result path).
- [ ] Optional: EDA job table or minimal tracking (request_id, domino_run_id, status).
- [ ] UI: "Run EDA as Domino Job" + polling and same result view as sync.

### 4.4 Configuration and Ops

- [ ] Ensure Domino Job runs use same project, env, and (if needed) shared volume for DB and uploads.
- [ ] Document for deployers: `DATABASE_URL` (and optionally `UPLOADS_PATH` / `TEMP_PATH`) for shared access when using Domino Jobs.
- [ ] Optional: `AUTOML_TRAINING_HARDWARE_TIER_NAME` (or similar) for default Domino Job tier.

---

## 5. Testing and Rollout

- **Training**
  - Create job with `run_as_domino_job: false` → training runs in-app; progress and completion as today.
  - Create job with `run_as_domino_job: true` (in Domino) → Domino Job starts, runner updates DB, UI shows progress and completion; cancel stops the Domino run.
- **EDA**
  - Sync profile (default) unchanged.
  - Async: start EDA job, poll until result file appears, confirm response matches sync profile shape.
- **Fallback:** When not in Domino or Domino API unavailable, "Run as Domino Job" should show a clear error and not start a job; local/in-process path still works.

---

## 6. One-Page Summary

| Area             | Local / Default Behavior              | Domino Job Behavior                               |
|------------------|---------------------------------------|----------------------------------------------------|
| **Training**     | `BackgroundTasks` + `run_training_job` | `job_start` → `domino_training_runner` → same `run_training_job` |
| **EDA**          | Sync POST → profiler in-app           | POST async → `job_start` → `domino_eda_runner` → write JSON → poll GET |
| **User control** | Default                              | "Run as Domino Job" (training + EDA)               |
| **Cancel (training)** | DB only (for now)               | `job_stop(domino_run_id)` + DB                     |
| **Progress**     | DB + WebSocket (training); immediate (EDA) | Same DB (training); poll until file (EDA)    |
