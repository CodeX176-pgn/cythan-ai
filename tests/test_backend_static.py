"""Lightweight static checks for CyThan AI's production backend.

These checks intentionally use only Python's standard library so they can
run in constrained deployment environments.
"""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "main.py"

def test_main_compiles():
    ast.parse(MAIN.read_text(encoding="utf-8"))

def test_required_routes_are_present():
    source = MAIN.read_text(encoding="utf-8")
    for route in ('@app.get("/")', '@app.get("/health")',
                  '@app.get("/api/status")', '@app.get("/api/metrics")',
                  '@app.post("/api/chat")'):
        assert route in source

def test_streaming_metrics_and_cancellation_are_present():
    source = MAIN.read_text(encoding="utf-8")
    assert "gemini_first_token_total" in source
    assert "asyncio.CancelledError" in source
    assert 'X-Accel-Buffering' in source
