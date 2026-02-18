from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.deployment_service import _is_valid_python_identifier


@pytest.mark.parametrize(
    "name,expected",
    [
        ("predict", True),
        ("predict_v2", True),
        ("_predict", True),
        ("2predict", False),
        ("predict-model", False),
        ("class", False),
        ("", False),
    ],
)
def test_is_valid_python_identifier(name: str, expected: bool) -> None:
    assert _is_valid_python_identifier(name) is expected
