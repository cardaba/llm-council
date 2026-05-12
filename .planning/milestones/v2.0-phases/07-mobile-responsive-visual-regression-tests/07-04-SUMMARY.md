---
phase: 07
plan: 04
subsystem: backend-testing
tags: [pytest, pytest-asyncio, tdd, testing, quality-lock, schema-migration]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [TEST-01, pytest-suite, backend-tests-isolation, regression-baseline]
  affects: [pyproject.toml, backend/tests/**]
tech_stack:
  added:
    - pytest 9.0.3
    - pytest-asyncio 1.3.0 (strict mode)
  patterns:
    - "double-monkeypatch DATA_DIR (config + storage attrs) for isolation"
    - "patch_query_model factory fixture recording (model, messages) tuples"
    - "ASGITransport in-process httpx.AsyncClient for FastAPI endpoint tests"
    - "factory fixtures (make_conversation, make_assistant_message) for canonical shapes"
key_files:
  created:
    - pyproject.toml (pytest config — appended)
    - backend/tests/__init__.py (empty package marker)
    - backend/tests/conftest.py (193 lines — fixtures + factories)
    - backend/tests/test_storage.py (22 tests)
    - backend/tests/test_research_strategy.py (14 tests)
    - backend/tests/test_council_profile.py (10 tests)
    - backend/tests/fixtures/conversation_v1_sample.json (real pre-v2 shape)
  modified:
    - pyproject.toml (added [project.optional-dependencies].test + [tool.pytest.ini_options])
    - uv.lock (pytest + pytest-asyncio + transitive deps)
decisions:
  - "Test runner: pytest 9.0+ with pytest-asyncio 1.3+ in `strict` mode (every async test declares @pytest.mark.asyncio explicitly)"
  - "Isolation strategy: double-monkeypatch of DATA_DIR on BOTH `backend.config.DATA_DIR` AND `backend.storage.DATA_DIR` per autouse fixture — single-patch is a silent no-op because storage.py:9 captures DATA_DIR at import time"
  - "query_model patching: patch on every module that imported it at module load time (openrouter, council, research_strategy) + also query_models_parallel — same import-time capture trap as DATA_DIR"
  - "Stage 4 gating tests exercise research_strategy.run directly because that's where the decision lives (council.py merely forwards for the quality_research profile)"
  - "Test against REALITY, not aspiration: parser regex `\\d+` does not match a leading `-`, so `'CRITIC SCORE: -3'` returns (None, None). Documented in a dedicated test (test_parse_critic_score_negative_returns_none) instead of patching the assertion to match the wished-for clamp-to-1 behaviour. The plan called this out as the 'tests document reality' guard."
metrics:
  duration_minutes: 25
  completed_date: 2026-05-11
  test_count: 46
  test_files: 3
  fixture_files: 1
  pytest_exit_code: 0
  pytest_pass_count: 46
  pytest_fail_count: 0
  pytest_warning_count: 0
---

# Phase 07 Plan 04: pytest Backend Suite Summary

Stand up the backend pytest suite per TEST-01 — 46 tests across storage / research_strategy parser / council profile routing, with strict pytest-asyncio mode and double-monkeypatch DATA_DIR isolation that closes the v1→v2 migration regression hole.

## What was built

- `pyproject.toml`: appended `[project.optional-dependencies].test = ["pytest>=9.0", "pytest-asyncio>=1.3"]` and `[tool.pytest.ini_options]` with `asyncio_mode = "strict"`, `testpaths = ["backend/tests"]`, `python_files = ["test_*.py"]`, `asyncio_default_fixture_loop_scope = "function"` (silences the pytest-asyncio 1.x deprecation warning).
- `backend/tests/__init__.py`: empty package marker (resolves RESEARCH Open Question 2 — discoverable without `sys.path` shenanigans).
- `backend/tests/conftest.py` (193 lines):
  - `_tmp_data_dir` autouse: double-monkeypatch of `backend.config.DATA_DIR` AND `backend.storage.DATA_DIR` (CRITICAL — single-patch is a silent no-op because `storage.py:9` does `from .config import DATA_DIR` at import time and captures the value into its own module namespace).
  - `_dummy_api_key` autouse: env var + module attr patch.
  - `patch_query_model` factory fixture: returns a `_install(fake)` helper that wraps `fake(model, messages)` in an async coroutine and patches `query_model` on every module that imported it (openrouter, council, research_strategy) plus `query_models_parallel`; returns a `calls` list recording `(model, messages)` tuples.
  - `api_client` async fixture: `ASGITransport(app=app)` with LATE `backend.main` import so the autouse monkeypatches apply before app construction.
  - `make_conversation` / `make_assistant_message` factories with `None`-omission semantics matching the persisted shape (e.g., `stage4=None` ⇒ key absent, NOT `null`).
- `backend/tests/test_storage.py` (22 tests): UUID validation + canonicalisation (braced form), path-traversal rejection, create/get round-trip, `add_assistant_message` metadata/stage4/external_research persistence and absence semantics, v1→v2 migration via direct helper call AND lazy migration via `get_conversation` (the latter is "the test of greatest value of the milestone" per STATE.md PITFALLS.md §CRIT-3).
- `backend/tests/test_research_strategy.py` (14 tests): `parse_critic_score` matrix — valid input, score-only, case-insensitive header / mixed-case concern, clamp-high (99→10), clamp-zero-to-1, **negative-returns-None** (regex `\d+` does not match leading `-`; this is a deliberate documentation of actual behaviour, NOT clamp-to-1 as PATTERNS.md aspirationally implied), last-occurrence wins, missing/empty input early-return, concern boundary edge cases (blank-line stop, end-of-string).
- `backend/tests/test_council_profile.py` (10 tests): fast / quality profile model-list and chairman routing; `quality_research` delegates to `research_strategy.run` with RSCH-04 isolation verified (council's own Stage 1/2/3 query_model path is asserted untouched); Stage 4 gating below / at / above threshold + threshold_override + critic-unparseable fallback + critic_model metadata propagation.
- `backend/tests/fixtures/conversation_v1_sample.json`: real pre-v2 conversation shape (no `schema_version`, no `mode`, assistant message without `metadata` key) for the migration round-trip test.

## Discovered: migration helper name (PATTERNS.md verification)

PATTERNS.md predicted the helper would be named `_migrate_conversation_if_needed`. Verified in `backend/storage.py:72-88` — the prediction was correct. The helper IS named `_migrate_conversation_if_needed` and the message-level migration is `migrate_message_v1_to_v2` at `backend/storage.py:54-69`. Both are exercised by the test suite.

No divergence from PATTERNS.md on the storage layer.

## Discovered: parser behavior (empirical verification before assertion encoding)

Per the plan's "tests document reality" guard, I empirically called `parse_critic_score` against every input case BEFORE encoding assertions. One divergence from the plan's verbal description:

| Input | Plan said | Actual |
| --- | --- | --- |
| `"CRITIC SCORE: -3"` | clamp to 1 | `(None, None)` |

**Root cause:** the regex is `r'CRITIC SCORE:\s*(\d+)'` — `\d+` does NOT match a leading `-`. So when the critic returns a negative score, no match is found at all, and the function returns `(None, None)` (early return on no matches). The clamp logic only fires for in-range positive integers and the `>10` case.

**Decision:** Document reality. The test `test_parse_critic_score_negative_returns_none` asserts `(None, None)` and includes a comment noting that the regex would need to become `(-?\d+)` for the plan's wished-for behaviour. The `test_parse_critic_score_clamps_zero_to_one` test exercises the only sub-1 input the parser CAN see (`0`, which parses and clamps up to 1).

No change to the backend code (out of scope for Phase 7 — the suite is a quality lock, not a bug-fix lap, per plan Task 4 §1). If the project later wants to handle negatives, that's a P3 follow-up.

All other parser claims verified as written: case-insensitive header parsing, last-occurrence semantics, clamp-high, missing/empty → `(None, None)`.

## Double monkeypatch confirmation

```bash
$ grep -c 'backend.storage.DATA_DIR' backend/tests/conftest.py
2
$ grep -c 'backend.config.DATA_DIR' backend/tests/conftest.py
3
```

The `_tmp_data_dir` fixture patches BOTH attributes. The `_dummy_api_key` fixture also double-patches `backend.config.OPENROUTER_API_KEY` (env var + module attr) for the same reason. The `patch_query_model` factory triple-patches `query_model` (openrouter + council + research_strategy) AND double-patches `query_models_parallel` (openrouter + council).

## pytest run output

```
============================= test session starts =============================
platform win32 -- Python 3.10.18, pytest-9.0.3, pluggy-1.6.0
configfile: pyproject.toml
plugins: anyio-4.11.0, asyncio-1.3.0
asyncio: mode=strict, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collecting ... collected 46 items

backend/tests/test_council_profile.py::test_fast_profile_routes_to_fast_council_models PASSED
backend/tests/test_council_profile.py::test_quality_profile_routes_to_quality_council_models PASSED
backend/tests/test_council_profile.py::test_fast_and_quality_use_disjoint_chairmen PASSED
backend/tests/test_council_profile.py::test_quality_research_delegates_to_research_strategy PASSED
backend/tests/test_council_profile.py::test_quality_research_forwards_threshold_override PASSED
backend/tests/test_council_profile.py::test_stage4_triggers_below_threshold PASSED
backend/tests/test_council_profile.py::test_stage4_skipped_at_or_above_threshold PASSED
backend/tests/test_council_profile.py::test_stage4_skipped_when_critic_unparseable PASSED
backend/tests/test_council_profile.py::test_stage4_threshold_override_changes_gating PASSED
backend/tests/test_council_profile.py::test_quality_research_metadata_includes_critic_model PASSED
... (14 research_strategy tests + 22 storage tests, all PASSED) ...
============================= 46 passed in 1.01s ==============================
```

No skipped tests. No xfail. No warnings (the initial `\s` deprecation in the test_research_strategy.py module docstring was fixed in commit `bfa154a` by converting to a raw docstring).

## Verification gates (all passed)

| Gate | Status |
| --- | --- |
| `uv run pytest backend/tests/ -v` exits 0 | PASS (46 passed in 1.01s) |
| `grep -c 'backend.storage.DATA_DIR' backend/tests/conftest.py` returns ≥ 1 | PASS (2) |
| `grep -c 'backend.config.DATA_DIR' backend/tests/conftest.py` returns ≥ 1 | PASS (3) |
| No skipped tests with unexplained reasons | PASS (zero skips) |
| No `data/conversations/` files touched during run | PASS (tmp_path isolation enforced via double-monkeypatch) |
| pyproject.toml has `asyncio_mode = "strict"` | PASS |
| No CI configuration added (per D-04b) | PASS |
| Single fixture JSON file for v1 conversation | PASS (everything else factory-built) |

## Plan dependency assertion

This plan touches ONLY:
- `pyproject.toml` (pytest config block — disjoint from frontend tooling)
- `uv.lock` (test deps additions)
- `backend/tests/**` (net-new directory)

Zero overlap with 07-03 (Playwright VRT, `frontend/tests/visual/**`) or 07-05 (vitest, `frontend/tests/unit/**`). No file conflict surface — Wave 3 parallelism guarantee preserved.

## Incidental findings

None of severity moderate or critical. The negative-score parser quirk (`-3` returns None instead of clamping to 1) is cosmetic and not a bug per se — the production critic prompt anchors scores at 1-10 with an integer constraint, so a negative score in the wild would already indicate a critic gone rogue, and the conservative "skip Stage 4" fallback is appropriate. Documented in the test docstring for the future implementer.

## Commits

| SHA | Subject |
| --- | --- |
| `c808a8c` | feat(07-04): configure pytest + create backend/tests package |
| `6f82842` | feat(07-04): conftest.py with isolation fixtures + factories |
| `e074d7f` | test(07-04): storage + research_strategy + council profile + v1 fixture |
| `bfa154a` | fix(07-04): raw docstring in test_research_strategy.py |

## Deviations from Plan

None substantive. Two small adjustments documented inline:

1. **Parser negative input** — plan implied clamp-to-1; reality is `(None, None)`. Test encodes reality (Rule 1 — tests document the actual code, not aspirational behaviour). No backend change.
2. **Test count** — plan budgeted "the 5 test areas covered"; final count is 46 tests across 3 files. Larger because each parser edge case and each `add_assistant_message` permutation (metadata-only / +stage4 / +external_research, plus omission variants for stage4 + external_research) became its own test for failure localisation. No risk surface added.

## Self-Check: PASSED

- All created files exist:
  - `pyproject.toml` (modified) — FOUND
  - `backend/tests/__init__.py` — FOUND (0 bytes)
  - `backend/tests/conftest.py` — FOUND
  - `backend/tests/test_storage.py` — FOUND (22 tests)
  - `backend/tests/test_research_strategy.py` — FOUND (14 tests)
  - `backend/tests/test_council_profile.py` — FOUND (10 tests)
  - `backend/tests/fixtures/conversation_v1_sample.json` — FOUND
- All commits exist:
  - `c808a8c` — FOUND
  - `6f82842` — FOUND
  - `e074d7f` — FOUND
  - `bfa154a` — FOUND
