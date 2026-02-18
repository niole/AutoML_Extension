from pathlib import Path
import sys
from typing import Optional

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.job_links import _normalize_domino_ui_host


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("https://apps.example.domino.tech", "https://example.domino.tech"),
        ("apps.example.domino.tech", "https://example.domino.tech"),
        ("https://apps.example.domino.tech:8443", "https://example.domino.tech:8443"),
        ("https://example.domino.tech", "https://example.domino.tech"),
        ("http://example.domino.tech", "http://example.domino.tech"),
        ("invalid://host", None),
        ("", None),
        (None, None),
    ],
)
def test_normalize_domino_ui_host(raw: Optional[str], expected: Optional[str]) -> None:
    assert _normalize_domino_ui_host(raw) == expected
