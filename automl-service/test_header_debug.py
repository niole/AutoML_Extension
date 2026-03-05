import os, sys
os.chdir("/mnt/automl-service")
sys.path.insert(0, "/mnt/automl-service")
print("DOMINO_PROJECT_ID:", os.environ.get("DOMINO_PROJECT_ID"))
try:
    from mlflow.tracking.request_header.registry import _request_header_provider_registry
    print("Registry import: OK")
except Exception as e:
    print("Registry import FAILED:", e); sys.exit(1)
print("Providers before:", len(_request_header_provider_registry._registry))

# Print existing providers first
for i, p in enumerate(_request_header_provider_registry._registry):
    print("  Existing Provider %d: %s" % (i, type(p).__name__))
    try:
        print("    in_context=%s, headers=%s" % (p.in_context(), p.request_headers()))
    except Exception as e:
        print("    error: %s" % e)

# Now register ours
from app.core.experiment_tracker import _register_domino_project_header_provider
print("Providers after:", len(_request_header_provider_registry._registry))
for i, p in enumerate(_request_header_provider_registry._registry):
    print("  Provider %d: %s" % (i, type(p).__name__))
    try:
        print("    in_context=%s, headers=%s" % (p.in_context(), p.request_headers()))
    except Exception as e:
        print("    error: %s" % e)

# Test: create an experiment and check which project it lands in
import mlflow
mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:8768"))
print("\nCreating test experiment...")
try:
    exp_id = mlflow.create_experiment("debug_header_provider_test")
    print("Created experiment:", exp_id)
    import json, urllib.request
    url = "%s/api/2.0/mlflow/experiments/get?experiment_id=%s" % (
        os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:8768"), exp_id)
    resp = json.loads(urllib.request.urlopen(url).read())
    tags = {t["key"]: t["value"] for t in (resp["experiment"].get("tags") or [])}
    print("  project_id:", tags.get("mlflow.domino.project_id", "N/A"))
    print("  project_name:", tags.get("mlflow.domino.project_name", "N/A"))
except Exception as e:
    print("Error:", e)
