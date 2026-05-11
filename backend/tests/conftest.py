"""Shared fixtures for backend tests."""

import os
from pathlib import Path
from typing import AsyncIterator, Any, Callable, Dict, List, Optional

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


# ---------------------------------------------------------------------------
# Isolation fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _tmp_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate each test in a fresh tmp DATA_DIR.

    CRITICAL: must patch BOTH `backend.config.DATA_DIR` AND
    `backend.storage.DATA_DIR`. `backend/storage.py:9` does
    `from .config import DATA_DIR` at IMPORT time, so the storage module
    captures the value in its own namespace. Patching only `backend.config.DATA_DIR`
    is a silent no-op — storage will keep using the captured original value
    and tests will accidentally read/write the real `data/conversations/` directory.

    Per RESEARCH Recipe 3 + PATTERNS.md "double-monkeypatch" trap.
    """
    target = tmp_path / "conversations"
    target.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("backend.config.DATA_DIR", str(target))
    monkeypatch.setattr("backend.storage.DATA_DIR", str(target))
    return target


@pytest.fixture(autouse=True)
def _dummy_api_key(monkeypatch: pytest.MonkeyPatch) -> str:
    """Inject a dummy OpenRouter API key so import-time loads don't fail.

    Same double-attr pattern as `_tmp_data_dir`: `backend.openrouter` reads
    `OPENROUTER_API_KEY` from `backend.config` at module level, so we patch
    both the env var (for future re-imports) and the captured attribute.
    """
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test-dummy")
    monkeypatch.setattr("backend.config.OPENROUTER_API_KEY", "sk-or-v1-test-dummy")
    return "sk-or-v1-test-dummy"


# ---------------------------------------------------------------------------
# query_model patching factory
# ---------------------------------------------------------------------------


@pytest.fixture
def patch_query_model(monkeypatch: pytest.MonkeyPatch) -> Callable[[Callable], List[tuple]]:
    """Factory: install an async fake for `backend.openrouter.query_model`.

    Returns a helper `_install(fake)` that:
    - Wraps `fake(model, messages)` (synchronous) in an async coroutine
    - Patches `backend.openrouter.query_model` AND `backend.council.query_model`
      AND `backend.research_strategy.query_model` because each module captured
      it at import time (same trap as DATA_DIR).
    - Returns a `calls` list that records every (model, messages) tuple invoked

    Usage:
        def test_routing(patch_query_model):
            calls = patch_query_model(lambda model, messages: {
                "content": "ok",
                "cost": {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
            })
            # ... run council code ...
            assert [c[0] for c in calls] == [...]
    """
    def _install(fake: Callable[[str, list], Optional[Dict[str, Any]]]) -> List[tuple]:
        calls: List[tuple] = []

        async def _async_wrapper(model, messages, *args, **kwargs):
            calls.append((model, messages))
            return fake(model, messages)

        # Patch every module that imported query_model at module load time.
        monkeypatch.setattr("backend.openrouter.query_model", _async_wrapper)
        monkeypatch.setattr("backend.council.query_model", _async_wrapper)
        monkeypatch.setattr("backend.research_strategy.query_model", _async_wrapper)

        # query_models_parallel is built on top of query_model but council.py
        # imported it directly — patch it too with an implementation that fans
        # out via the recording wrapper so council Stage 1/2 routes go through
        # the recorder.
        async def _async_parallel(models, messages, *args, **kwargs):
            import asyncio
            tasks = [_async_wrapper(m, messages) for m in models]
            responses = await asyncio.gather(*tasks)
            return {m: r for m, r in zip(models, responses)}

        monkeypatch.setattr("backend.openrouter.query_models_parallel", _async_parallel)
        monkeypatch.setattr("backend.council.query_models_parallel", _async_parallel)
        return calls

    return _install


# ---------------------------------------------------------------------------
# ASGI test client
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def api_client() -> AsyncIterator[AsyncClient]:
    """In-process ASGI client for FastAPI endpoint tests.

    Imports `backend.main.app` LATE (inside the fixture body) so the autouse
    `_tmp_data_dir` and `_dummy_api_key` monkeypatches have already been
    applied before the FastAPI app and its sub-modules capture their
    module-level config. Top-level imports would freeze the original DATA_DIR
    into the storage helpers before isolation kicked in.
    """
    from backend.main import app  # late import: see docstring
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


# ---------------------------------------------------------------------------
# Factory fixtures (canonical-shape builders)
# ---------------------------------------------------------------------------


@pytest.fixture
def make_conversation() -> Callable[..., Dict[str, Any]]:
    """Build a canonical-shape conversation dict.

    Defaults produce a v2 conversation. Callers can construct pre-v2 shapes
    by passing `schema_version=None` and/or `mode=None` (omitted from the
    returned dict entirely — NOT set to None).
    """
    def _make(
        *,
        id: str = "00000000-0000-0000-0000-000000000001",
        schema_version: Optional[int] = 2,
        mode: Optional[str] = "fresh",
        created_at: str = "2026-05-11T00:00:00Z",
        title: str = "test conversation",
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        conv: Dict[str, Any] = {
            "id": id,
            "created_at": created_at,
            "title": title,
            "messages": messages if messages is not None else [],
        }
        if schema_version is not None:
            conv["schema_version"] = schema_version
        if mode is not None:
            conv["mode"] = mode
        return conv

    return _make


@pytest.fixture
def make_assistant_message() -> Callable[..., Dict[str, Any]]:
    """Build a canonical-shape assistant message dict.

    Mirrors the shape produced by `backend.storage.add_assistant_message`:
    `metadata`, `stage4`, `external_research` keys are OMITTED when None
    (not set to null), matching the persisted form.
    """
    def _make(
        *,
        stage1: Optional[List[Dict[str, Any]]] = None,
        stage2: Optional[List[Dict[str, Any]]] = None,
        stage3: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        stage4: Optional[Dict[str, Any]] = None,
        external_research: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        msg: Dict[str, Any] = {
            "role": "assistant",
            "stage1": stage1 if stage1 is not None else [],
            "stage2": stage2 if stage2 is not None else [],
            "stage3": stage3 if stage3 is not None else {"model": "test", "response": "ok"},
        }
        if metadata is not None:
            msg["metadata"] = metadata
        if stage4 is not None:
            msg["stage4"] = stage4
        if external_research is not None:
            msg["external_research"] = external_research
        return msg

    return _make
