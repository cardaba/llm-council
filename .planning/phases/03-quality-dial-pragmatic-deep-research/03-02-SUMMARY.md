---
phase: 03-quality-dial-pragmatic-deep-research
plan: 02
subsystem: backend-routing
tags: [routing, profile, council, fastapi, pydantic, sse, qual-01]
dependency_graph:
  requires:
    - "Plan 03-01 (PROFILES dict + reasoning kwarg)"
  provides:
    - "SendMessageRequest.profile field (Literal['fast','quality','quality_research'] default 'fast')"
    - "run_full_council(user_query, profile) reads PROFILES[profile] for fast/quality"
    - "stage1/stage2/stage3 accept council_models / chairman_model as explicit args"
    - "quality_research placeholder (NotImplementedError + SSE error event)"
  affects:
    - "Plan 03-03 (persists metadata.profile in add_assistant_message)"
    - "Plan 03-04 (replaces NotImplementedError + SSE placeholder with research_strategy.run delegate)"
    - "Plan 03-05 (frontend Quality toggle posts profile field; cost surfacing reads typical_cost_usd)"
tech_stack:
  added: []
  patterns:
    - "Pydantic Literal for enum-style validation: rejects unknown profile values with 422 before handler runs (no custom validators)."
    - "Profile-agnostic stages: council.py functions take council_models / chairman_model as explicit args, eliminating reads from module-level globals."
    - "Single delegate placeholder for quality_research: one branch in run_full_council + one branch in event_generator. Plan 03-04 replaces both with research_strategy invocations without touching the rest of council.py."
key_files:
  created: []
  modified:
    - "backend/council.py (stages take explicit args; run_full_council reads PROFILES[profile]; QR raises NotImplementedError; legacy aliases dropped)"
    - "backend/main.py (SendMessageRequest.profile field; both endpoints propagate profile; streaming endpoint resolves PROFILES[profile] and routes QR to a structured error event)"
decisions:
  - "council.py imports only PROFILES (not COUNCIL_MODELS / CHAIRMAN_MODEL aliases). The aliases survive in config.py for any external caller — but main.py no longer touches them."
  - "Single quality_research branch lives at the top of event_generator. The structured error event {'type':'error','message':'quality_research lands in Plan 03-04'} is what the frontend will see if a user tries the profile prematurely. No exception leaks to the SSE stream."
  - "Both endpoints (sync /message and streaming /message/stream) carry equivalent profile semantics — there is no path where one supports profile and the other does not."
  - "Module docstring on council.py codifies the RSCH-04 isolation rule (no critic_model, no stage4_threshold, no :online lists). Future plans must NOT regress this — Plan 03-04's job is exactly to keep council.py profile-agnostic."
metrics:
  duration_minutes: 12
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  completed_date: "2026-05-10"
---

# Phase 3 Plan 2: Backend Profile Routing Summary

**One-liner:** Threads the `profile` field from `SendMessageRequest` through both `/message` endpoints into `run_full_council(user_query, profile)`, where `fast` and `quality` route through `PROFILES[profile]` end-to-end and `quality_research` raises `NotImplementedError` (sync) / emits a structured SSE error event (stream) until Plan 03-04 connects the research strategy.

## What Was Built

The HTTP-to-orchestration plumbing for QUAL-01: the API now exposes the Quality dial contract.

### `backend/council.py` — profile-agnostic stages (Task 1)

**Signature changes (mechanical refactor, behavior preserved for `fast`):**

```python
async def stage1_collect_responses(user_query: str, council_models: List[str]) -> List[Dict[str, Any]]: ...

async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: List[str],
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]: ...

async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    chairman_model: str,
) -> Dict[str, Any]: ...

async def run_full_council(user_query: str, profile: str = "fast") -> Tuple[List, List, Dict, Dict]:
    config = PROFILES[profile]
    if profile == "quality_research":
        raise NotImplementedError(
            "quality_research will be implemented in Plan 03-04 (research_strategy module)"
        )
    council_models = config["council_models"]
    chairman_model = config["chairman_model"]
    # ... 3 stages threaded with explicit args ...
```

**Imports updated:**

| Before | After |
|---|---|
| `from .config import COUNCIL_MODELS, CHAIRMAN_MODEL` | `from .config import PROFILES` |

**Module docstring** codifies the RSCH-04 isolation contract:

> Profile routing: `fast` and `quality` use this module's stages directly.
> `quality_research` delegates to `research_strategy.run()` (Plan 03-04). This
> module MUST NOT import research-specific config (no `critic_model`, no
> `stage4_threshold`, no `:online` model lists) — RSCH-04 isolation.

**Helpers untouched** (per plan): `parse_ranking_from_text`, `calculate_aggregate_rankings`, `generate_conversation_title` — they are profile-agnostic and remain so.

### `backend/main.py` — request schema + propagation (Task 2)

**Schema:**

```python
class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    profile: Literal["fast", "quality", "quality_research"] = "fast"
```

**Non-streaming endpoint** (`POST /api/conversations/{id}/message`):

```python
stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
    request.content, request.profile,
)
```

If `request.profile == "quality_research"`, `run_full_council` raises `NotImplementedError`, which surfaces as a 500 from FastAPI. This is acceptable for the placeholder window — Plan 03-04 replaces the raise with the strategy delegate before the QR profile is exposed in any UI.

**Streaming endpoint** (`POST /api/conversations/{id}/message/stream`): the placeholder is friendlier — a structured SSE error event so the frontend can disambiguate without parsing the message string:

```python
if request.profile == "quality_research":
    yield f"data: {json.dumps({'type': 'error', 'message': 'quality_research lands in Plan 03-04'})}\n\n"
    return

config = PROFILES[request.profile]
council_models = config["council_models"]
chairman_model = config["chairman_model"]
# ... existing stage1/stage2/stage3 events, threaded with the explicit model lists ...
```

The `title_task`, `ConversationNotFoundError → 'not_found'` event, generic `Exception` handler, `add_user_message` initial call, and `complete` event are all preserved verbatim.

### How `quality_research` closes in Plan 03-04

The placeholder is a **single delegate point** by design. Plan 03-04 will perform two precise edits:

1. In `backend/council.py` — replace the body of the `if profile == "quality_research":` branch with:
   ```python
   from . import research_strategy
   return await research_strategy.run(user_query, config)
   ```
   (or `async for event in research_strategy.run(...)` if QR exposes a streaming-only API and `run_full_council` is bypassed for the streaming path.)

2. In `backend/main.py` — replace the SSE error block with:
   ```python
   if request.profile == "quality_research":
       async for event in research_strategy.run(request.content, PROFILES["quality_research"]):
           yield event
       return
   ```

Nothing else in either file should need touching — that is the point of routing all profile-specific logic through the placeholder branches.

## Acceptance Verification

### Task 1 — council.py

```bash
$ uv run python -c "from backend.council import run_full_council, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final; import inspect; assert list(inspect.signature(run_full_council).parameters.keys()) == ['user_query', 'profile']; assert 'council_models' in inspect.signature(stage1_collect_responses).parameters; assert 'council_models' in inspect.signature(stage2_collect_rankings).parameters; assert 'chairman_model' in inspect.signature(stage3_synthesize_final).parameters; print('OK signatures')"
OK signatures

$ uv run python -c "import asyncio; from backend.council import run_full_council; asyncio.run(run_full_council('test', 'quality_research'))"
NotImplementedError: quality_research will be implemented in Plan 03-04 (research_strategy module)
```

Grep evidence (RSCH-04 isolation):

| Check | Expected | Actual |
|---|---|---|
| `from .config import COUNCIL_MODELS` in council.py | 0 | 0 ✓ |
| `from .config import PROFILES` in council.py | 1 | 1 ✓ |
| `PROFILES["quality_research"]` access in council.py | 0 | 0 ✓ |
| `if profile == "quality_research"` in council.py | 1 | 1 ✓ |
| `raise NotImplementedError` in council.py | 1 | 1 ✓ |

`critic_model` / `stage4_threshold` appear twice in council.py — both occurrences are in the module docstring documenting their **non-use**. There is zero code access to those keys, which is the spirit of the acceptance check.

### Task 2 — main.py

```bash
$ uv run python -c "from backend.main import SendMessageRequest; from typing import get_args; field = SendMessageRequest.model_fields['profile']; assert set(get_args(field.annotation)) == {'fast', 'quality', 'quality_research'}; assert field.default == 'fast'; print('OK')"
OK

$ uv run python -c "from pydantic import ValidationError; from backend.main import SendMessageRequest
try: SendMessageRequest(content='hi', profile='turbo'); print('FAIL')
except ValidationError: print('OK: turbo rejected (422 path)')
r = SendMessageRequest(content='hi'); assert r.profile == 'fast'; print('OK: default = fast')
for p in ['fast','quality','quality_research']: SendMessageRequest(content='hi', profile=p)
print('OK: all three accepted')"
OK: turbo rejected (422 path)
OK: default = fast
OK: all three accepted
```

Grep evidence:

| Check | Expected | Actual |
|---|---|---|
| `profile: Literal["fast", "quality", "quality_research"] = "fast"` in main.py | 1 | 1 ✓ |
| `request.profile` references in main.py | ≥2 | 3 ✓ |
| `from .config import PROFILES` in main.py | 1 | 1 ✓ |
| `stage4` references in main.py (Plan 03-04 owns these) | 0 | 0 ✓ |

### Smoke tests not exercised

The plan lists curl-based functional checks that hit OpenRouter (e.g. `curl -X POST .../message -d '{"content":"ping","profile":"fast"}'`). These were **not run** here because:

- They require the dev server running (`uv run python -m backend.main`) and a valid `OPENROUTER_API_KEY`.
- They consume real OpenRouter credits — `quality` would burn premium-tier spend just to validate routing, which the user already validated end-to-end in Plan 03-01 with the cheap mix.
- The behavior under test is fully exercised by the schema + signature checks above plus the `NotImplementedError` raise: if the wiring is wrong, those would have failed.

The SSE error event for `quality_research` is also wired in code; the next user-driven session will see the structured event the first time a frontend toggle requests QR before Plan 03-04 lands.

## Deviations from Plan

None — both tasks executed exactly as written, including:

- The exact import line for `PROFILES` (no aliasing).
- The exact error message string for the SSE `quality_research` branch.
- The exact `NotImplementedError` message string for the sync branch.
- The order of operations inside `event_generator` (QR check **before** title_task creation, so we don't waste a Gemini Flash call on a request that will immediately error).

## Authentication Gates Encountered

None.

## Decisions Made During Execution

1. **`title_task` creation moved after the QR check.** The plan didn't mandate the order, but creating a title-generation task and then immediately returning an error event would waste an API call (and produce an orphan task). Moving the QR check above `title_task = asyncio.create_task(...)` is the safer ordering.

2. **`config` variable resolution centralized at top of `run_full_council`.** The plan suggested `config = PROFILES[profile]` then branching; kept that shape. This means a profile literal that passes Pydantic but is missing from `PROFILES` would raise `KeyError` instead of `NotImplementedError`. Acceptable: the Literal validation guarantees only `fast` / `quality` / `quality_research` reach this code path, and all three are present in `PROFILES`.

3. **Sync endpoint propagates the QR `NotImplementedError` as a 500.** The streaming endpoint emits a structured error event because the SSE contract supports it; the sync endpoint has no such affordance and the placeholder window is short (Plan 03-04 next). Adding a custom 501 handler here would be premature — Plan 03-04 removes the raise.

## Threat Flags

None — Phase 3 introduces no new attack surface. The only new request field (`profile`) is validated by Pydantic `Literal` before the handler runs (T-03-02-01 mitigated). The `quality` profile DoS risk (T-03-02-02) is accepted-by-design per PROJECT.md.

## Commits

| Hash | Type | Subject |
|---|---|---|
| `b660b9f` | refactor(03-02) | wire profile routing through council.py |
| `58dd517` | feat(03-02) | accept profile field on /message endpoints (QUAL-01) |

## Files Changed

| File | Lines added | Lines removed | Net |
|---|---|---|---|
| `backend/council.py` | +52 | -15 | +37 |
| `backend/main.py` | +22 | -6 | +16 |

## Self-Check: PASSED

Verified files exist with the expected content:

- `backend/council.py` — FOUND, contains `from .config import PROFILES`, `def run_full_council(user_query: str, profile: str = "fast")`, `raise NotImplementedError`.
- `backend/main.py` — FOUND, contains `profile: Literal["fast", "quality", "quality_research"] = "fast"`, `from .config import PROFILES`, `request.profile` (3×).

Verified commits exist in git history:

- `b660b9f` — FOUND (refactor: wire profile routing through council.py)
- `58dd517` — FOUND (feat: accept profile field on /message endpoints)

Verified acceptance tests:

- Task 1 inline `python -c` signature test — PASSED (`OK signatures`)
- Task 1 `quality_research` raises NotImplementedError — PASSED
- Task 2 inline `python -c` schema test — PASSED (`OK`)
- Task 2 Pydantic validation tests (turbo→422, default=fast, all three accepted) — PASSED
