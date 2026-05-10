---
phase: 05
plan: 02
subsystem: backend-critique-pipeline
tags:
  - backend
  - sse
  - multipart
  - anonymization
  - critique-mode
requires:
  - 05-01  # schema migration + add_assistant_message external_research kwarg
provides:
  - POST /api/conversations/{id}/critique/stream
  - council.stage1_collect_responses(external_context=...)
  - council.stage2_collect_rankings(anonymize_critiques=..., truncate_per_response_tokens=...)
  - council._anonymize_critique_text + _truncate_for_stage2 + _build_critique_prompts
affects:
  - backend/council.py
  - backend/main.py
  - pyproject.toml  # python-multipart added
tech_stack_added:
  - python-multipart 0.0.28  # required by FastAPI Form/UploadFile parsing
patterns:
  - per-model fan-out via asyncio.gather (analog of query_models_parallel but each model gets its own messages)
  - immutable-spread idiom `{**r, "response": ...}` to avoid mutating persisted Stage 1 results
  - module-level precompiled regex patterns derived from PROFILES["quality"]["council_models"]
  - n=1 SSE drain: emit empty stage2_complete so existing React reducer needs zero changes
  - pre-stream validation raises HTTPException; in-stream errors emit SSE error events
key_files_created: []
key_files_modified:
  - backend/council.py
  - backend/main.py
  - pyproject.toml
  - uv.lock
decisions:
  - "n=1 emits stage2_complete with data=[] and empty metadata (drain-not-skip per D-05)"
  - "Anonymization runs BEFORE truncation so the un-truncated tail can't leak a model name"
  - "Anonymization + truncation operate on COPIES so persisted Stage 1 tab stays un-anonymized"
  - "Title generation uses single-arg generate_conversation_title (existing signature) wrapped in try/except"
  - "Pre-stream errors (413/415/400/404) raised as HTTPException, NOT SSE events"
  - "python-multipart added as runtime dependency (Rule 3 deviation — required by FastAPI)"
metrics:
  completed: 2026-05-10
  tasks: 2
  duration: ~25min
---

# Phase 5 Plan 02: Critique-Mode Backend Pipeline Summary

Backend critique pipeline now lands the headline v2.0 feature end-to-end: a multipart POST to `/api/conversations/{id}/critique/stream` runs the same 3-stage SSE pipeline as fresh-prompt with two critique-specific behaviors (per-model file attribution + Stage 2 anonymization & truncation), council collapses to n=1/2/3 dynamically, and a pre-flight 150K token cap blocks runaway runs with HTTP 413.

## What Changed

### `backend/council.py`

**`stage1_collect_responses` signature extension (backward-compat):**

```python
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
    external_context: Optional[Dict[str, Dict[str, Any]]] = None,  # NEW
) -> List[Dict[str, Any]]
```

- `external_context=None` (default): legacy fresh-prompt broadcast — every model sees the same `messages = [{"role": "user", "content": user_query}]`. Bit-for-bit identical to v1.
- `external_context={model_id: {"filename","content","size_bytes"}}`: critique path — each model receives a per-model prompt where its own file is `[YOUR PRIOR WORK]` and peers' files `[PEER'S PRIOR WORK]`.

**`stage2_collect_rankings` signature extension (backward-compat):**

```python
async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: List[str],
    anonymize_critiques: bool = False,                 # NEW
    truncate_per_response_tokens: Optional[int] = None,  # NEW
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]
```

- Both new kwargs default to disabled — the fresh-prompt peer-review flow is unchanged.
- When enabled: anonymization runs FIRST on a copy (D-08 strips literal model IDs from `PROFILES["quality"]["council_models"]` + 4 first-person self-reference patterns; D-09 third-person mentions preserved), then truncation produces a copy with marker `[…truncated, full text in Stage 1 tab]` at 2400 chars (600 tokens × 4 chars/token).
- The persisted Stage 1 tab is **never** mutated.

**New private helpers:**
- `_build_critique_prompts(critique_instruction, external_context, council_models)` — builds the per-model prompt dict.
- `_query_models_individually(models, messages_per_model)` — `asyncio.gather` analog where each model gets a different message list.
- `_anonymize_critique_text(text, slot_index)` — applies `_MODEL_ID_PATTERNS` (literal IDs → `Author N`) then `_SELF_REF_PATTERNS` (first-person → `[author redacted]`).
- `_truncate_for_stage2(text, max_chars)` — appends `STAGE2_TRUNCATE_MARKER` when over cap.

**Module-level constants:**
- `STAGE2_TRUNCATE_MARKER = "\n\n[…truncated, full text in Stage 1 tab]"`
- `STAGE2_TRUNCATE_DEFAULT_CHARS = 600 * 4`
- `_MODEL_ID_PATTERNS` — precompiled from `PROFILES["quality"]["council_models"]` (auto-updates on profile bump).
- `_SELF_REF_PATTERNS` — 4 patterns verbatim from CONTEXT.md D-08.

### `backend/main.py`

**New endpoint:**

```
POST /api/conversations/{conversation_id}/critique/stream
Content-Type: multipart/form-data

Form fields:
  critique_instruction: str (required, min_length=1)
  file_slot_0: UploadFile (optional)
  file_slot_1: UploadFile (optional)
  file_slot_2: UploadFile (optional)
```

**Pre-stream errors (HTTPException — normal HTTP responses):**
| Status | Trigger |
|--------|---------|
| 400 | invalid UUID, no files submitted, file not UTF-8 |
| 404 | conversation not found |
| 413 | file > 750KB, or estimated input > 150K tokens (multiplied by n active members) |
| 415 | file extension not .md / .txt |

**New helper:** `_read_and_validate_upload(upload)` — enforces all per-file caps, normalizes line endings, strips BOM via `utf-8-sig`.

**Module-level constants:**
- `MAX_CRITIQUE_FILE_BYTES = 750 * 1024`
- `PREFLIGHT_TOKEN_CAP = 150_000`
- `HEURISTIC_TOKENS_PER_CHAR = 0.25`

**Council collapse (D-05):** Only slots that received an upload contribute a council member. `slot_models = PROFILES["quality"]["council_models"]` is zipped with the 3 upload slots; `None` slots are filtered out before computing `external_context` and `active_council_models`.

### Dependency added

`python-multipart 0.0.28` — required by FastAPI for `Form` / `UploadFile` parsing. Added via `uv add python-multipart`. Rule 3 deviation (blocking issue: endpoint failed to register without it).

## SSE Event Sequences

### n=1 (single file) — empty Stage 2 drain (D-05)

```
data: {"type": "stage1_start"}
data: {"type": "stage1_complete", "data": [{"model": "openai/gpt-5.5", "response": "..."}]}
data: {"type": "stage2_start"}
data: {"type": "stage2_complete", "data": [], "metadata": {"label_to_model": {}, "aggregate_rankings": []}}
data: {"type": "stage3_start"}
data: {"type": "stage3_complete", "data": {"model": "anthropic/claude-opus-4.7", "response": "..."}}
data: {"type": "title_complete", "data": {"title": "..."}}
data: {"type": "message_metadata", "data": {"label_to_model": {}, "aggregate_rankings": [], "mode": "critique"}}
data: {"type": "complete"}
```

The empty `stage2_complete` payload (`data: []` + empty `metadata`) lets the existing React reducer drain the Stage 2 step without any frontend conditional. Plan 05-03 wires the UI without touching the reducer.

### n=3 (full council) — standard flow

```
data: {"type": "stage1_start"}
data: {"type": "stage1_complete", "data": [3 entries — one per slot model]}
data: {"type": "stage2_start"}
data: {"type": "stage2_complete", "data": [3 rankings], "metadata": {"label_to_model": {"Response A": "openai/gpt-5.5", ...}, "aggregate_rankings": [...]}}
data: {"type": "stage3_start"}
data: {"type": "stage3_complete", "data": {"model": "anthropic/claude-opus-4.7", "response": "..."}}
data: {"type": "title_complete", "data": {"title": "..."}}
data: {"type": "message_metadata", "data": {"label_to_model": {...}, "aggregate_rankings": [...], "mode": "critique"}}
data: {"type": "complete"}
```

n=2 follows the same shape; just two entries in `data` and `label_to_model`.

### Stage 2 transforms (n≥2 only)

Each Stage 1 response is anonymized then truncated **on a copy** before peer-review concatenation:

1. `_anonymize_critique_text(r["response"], slot_index)` — replaces literal `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview` with `Author 1`/`Author 2`/`Author 3` (slot_index+1) and replaces `As Claude`, `I am {Claude|GPT|Gemini|Opus}`, etc. with `[author redacted]`. Third-person mentions like `GPT-4 hallucinations` are preserved (D-09).
2. `_truncate_for_stage2(text, 2400)` — truncates to 2400 chars with marker if longer.

Both transforms use the immutable-spread idiom:
```python
stage1_results = [{**r, "response": _anonymize_critique_text(r["response"], i)} for i, r in enumerate(stage1_results)]
```

## Persistence

Successful runs land an assistant message via:
```python
storage.add_assistant_message(
    conversation_id,
    stage1_results,
    stage2_results,
    stage3_result,
    metadata={"label_to_model": ..., "aggregate_rankings": ..., "mode": "critique"},
    external_research={model_id: {filename, content, size_bytes}, ...},
)
```

Stage 1 results persist **un-anonymized** so the Stage 1 tab on reload shows the readable text. Anonymization is purely an in-memory transform feeding the Stage 2 prompt.

## Fresh-Prompt Path Verification

`POST /api/conversations/{id}/message/stream` was tested unchanged:
- `stage1_collect_responses` called without `external_context` → broadcast path identical to v1.
- `stage2_collect_rankings` called without the two new kwargs → defaults disable anonymization + truncation; existing peer-review flow unchanged.
- Test client confirms `POST /api/conversations/{id}/message` returns 200 with the standard `{stage1, stage2, stage3, metadata, message_metadata}` shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added python-multipart dependency**
- **Found during:** Task 2 verify (boot import)
- **Issue:** `RuntimeError: Form data requires "python-multipart" to be installed.` raised at app-init time when the new endpoint was decorated with `Form(...)` / `File(...)`.
- **Fix:** `uv add python-multipart` (resolved 0.0.28; pyproject.toml + uv.lock updated).
- **Files modified:** `pyproject.toml`, `uv.lock`
- **Commit:** `a046e62`

**2. [Plan typo correction] generate_conversation_title is single-arg**
- **Found during:** Task 2 implementation
- **Issue:** Plan task action snippet calls `generate_conversation_title(critique_instruction, stage3_result)` but the existing function in `backend/council.py` takes only `user_query`.
- **Fix:** Used the actual single-arg signature. Wrapped in try/except so title failure stays non-fatal.
- **Files modified:** `backend/main.py`

No other deviations. Threat model mitigations (T-05-01 through T-05-03) are all in place.

## Verification Performed

| Check | Result |
|-------|--------|
| `uv run python -c "import backend.main"` boots clean | OK |
| `len(_MODEL_ID_PATTERNS) == 3` | OK |
| `len(_SELF_REF_PATTERNS) == 4` | OK |
| D-08: model-ID strip → `Author N` | OK |
| D-08: first-person strip → `[author redacted]` | OK |
| D-09: third-person preserved (`GPT-4 hallucinations` survives) | OK |
| `_truncate_for_stage2` no-op on short text | OK |
| `_truncate_for_stage2` 3000 chars → 2400 + marker | OK |
| `_build_critique_prompts` marks self `[YOUR PRIOR WORK]` and peers `[PEER'S PRIOR WORK]` | OK |
| Route `/api/conversations/{conversation_id}/critique/stream` registered | OK |
| 404 for nonexistent conversation | OK |
| 400 for invalid UUID | OK |
| 400 for no files submitted | OK |
| 415 for `.pdf` extension | OK |
| 413 for file > 750KB | OK |
| 413 for token cap exceeded (~175K with 700KB file) | OK |
| n=1 stream emits empty `stage2_complete` (`data=[]`, empty metadata) | OK |
| n=3 stream emits 3 rankings + populated `label_to_model` + `aggregate_rankings` | OK |
| `external_research` persisted on assistant message | OK |
| Fresh-prompt `POST /message` path returns 200 with standard shape | OK |

## Threat Surface

No new surfaces beyond the planned `<threat_model>` register. T-05-01 through T-05-03 mitigations are concrete code in this plan; T-05-04/05/06 remain accepted as-documented.

## Self-Check: PASSED

- Files created/modified:
  - `backend/council.py`: FOUND (modified, commit `d43be76`)
  - `backend/main.py`: FOUND (modified, commit `a046e62`)
  - `pyproject.toml`: FOUND (modified, commit `a046e62`)
  - `uv.lock`: FOUND (modified, commit `a046e62`)
- Commits exist:
  - `d43be76`: FOUND
  - `a046e62`: FOUND
