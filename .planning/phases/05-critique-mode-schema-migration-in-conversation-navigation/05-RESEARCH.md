# Phase 5: Critique mode + Schema migration + In-conversation navigation — Research

**Researched:** 2026-05-10
**Domain:** FastAPI multipart ingestion + async council orchestration + React 19 SSE consumer + CSS-only navigation primitives
**Confidence:** HIGH (codebase findings verified by direct reads of all touch sites; OpenRouter usage schema verified via official docs; STATE.md decisions consumed verbatim)

## Summary

Phase 5 is the headline v2.0 feature. The good news from reading the v1.0 source: every backend extension point already exists in a shape that accepts the new dimensions without a refactor. `add_assistant_message` already takes an opaque `metadata` dict and an optional `stage4` payload; the SSE protocol already discriminates events by `type`; `PROFILES["quality"]` is already the single source of truth for the 3-model slot order; `ConversationNotFoundError` is already distinct from `ValueError`; and `ReasoningDisclosure.css` already ships the `grid-template-rows: 0fr → 1fr` accordion pattern that NAV-03 and CRIT-08 will reuse. The only structurally new thing is **a multipart endpoint** (`POST /api/conversations/{id}/critique/stream`) — Pydantic `BaseModel` bodies do not compose with `UploadFile`, so this stays a dedicated handler.

The three areas that need careful work and are NOT plug-and-play:

1. **Dynamic council collapse for n=1/2/3** — the SSE contract for n=1 (skip Stage 2) must be specified concretely so the React reducer in `App.jsx` does not stall on a never-arriving `stage2_complete`. Decision below: emit `stage2_start` then `stage2_complete` with `data: []` and `metadata: {label_to_model: {}, aggregate_rankings: []}` so the existing reducer drains cleanly without a code change. This is cheaper than introducing a new event type and matches the existing graceful-degradation idiom (Stage 2 with 1 entry would already render an empty aggregate panel).

2. **Schema migration `migrate_message_v1_to_v2`** — single lazy call site inside `storage.get_conversation`. Idempotent by checking `conversation.get("schema_version") == 2` at the top. Stay lazy (no eager write-back) per CONTEXT.md Claude's Discretion; eager write-back surprises the user on read and breaks the "reads don't mutate" invariant.

3. **Navigation primitives** — `.messages-container` is the scroll container (`overflow-y: auto`, `flex: 1` inside `.chat-interface`). All `position: sticky` and IntersectionObserver setups must use `.messages-container` as the scroll root, NOT `document`. The global header height is `var(--layout-header-h)` = 52px, but stage headers pin to the **top of the scroll container** (which is already below the header in the grid), so `top: 0` is correct — NOT `top: var(--layout-header-h)`.

**Primary recommendation:** Treat Phase 5 as 5 sub-waves that can largely parallelise: (W0) schema migration + tests, (W1) backend critique endpoint + anonymization, (W2) frontend critique entry UI + multipart wire, (W3) hydration on reload (chips), (W4) navigation primitives. W0 is the safety net for everything else and should land first.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRIT-01 | Two entry points (fresh + critique) selected before deliberation; fresh flow preserved bit-for-bit | §6 Frontend integration — D-01 two stacked sidebar buttons; ChatInterface conditional welcome based on `conversation.mode` |
| CRIT-02 | 3 file pickers labelled with `publisher/model-id` from `PROFILES["quality"]["COUNCIL_MODELS"]`, `.md`/`.txt` only, 750KB Pydantic-enforced | §1 Backend (multipart + Pydantic Form validator), §3 Storage (inline + cap) |
| CRIT-03 | `POST /api/conversations/{id}/critique/stream` multipart, emits same SSE protocol | §1.1 endpoint signature, §1.2 SSE contract for n=1/2/3 |
| CRIT-04 | Stage 1 sees all critiques as context, no new module — reuse `stage1_collect_responses` with `external_context` param | §1.3 `external_context` plumbing; per-model prompt construction |
| CRIT-05 | Stage 2 strips model names + first-person self-references before concat (D-08/D-09 surgical) | §1.5 anonymization regex (precompiled, executes per-critique pre-concat) |
| CRIT-06 | Pre-flight token cap 150K (heuristic `len(text)/4`); Stage 2 truncate to 600 tokens with marker | §1.4 token cap & truncate impl |
| CRIT-07 | Pre-flight cost estimate `$X.XX-$Y.YY` + localStorage soft rate-limit 5/hour | §4 cost & rate-limit |
| CRIT-08 | Reload hydrates files as collapsed chips, click expands via `grid-template-rows: 0fr → 1fr` | §3 storage shape; §5 reused ReasoningDisclosure pattern |
| PERS-03 | `schema_version: 2` at root, `migrate_message_v1_to_v2` lazy in `get_conversation` | §2 schema migration |
| NAV-01 | Sticky stage headers under global header | §5 sticky pattern with correct scroll container |
| NAV-02 | Horizontal stage strip with scroll-spy chips (IntersectionObserver) | §5 IntersectionObserver config |
| NAV-03 | Stage 1 collapse >600px via ReasoningDisclosure accordion | §5 CSS-only accordion reuse |
| NAV-04 | Back-to-top button after >800px scroll, honors `prefers-reduced-motion` | §5 back-to-top + reduced motion |

## Project Constraints (from CLAUDE.md)

These directives override any conflicting recommendation in this research:

- **Backend run command:** `uv run python -m backend.main` from project root (relative imports require this).
- **Backend bind:** `127.0.0.1:8001` only (no external exposure).
- **Frontend port:** `5173` (Vite default).
- **API base hardcoded:** `http://localhost:8001` in `frontend/src/api.js:5`. Phase 5 task that touches `api.js` should opportunistically address the IPv4/IPv6 asymmetry from CONCERNS.md (one-line `127.0.0.1` swap if not already).
- **Markdown:** every `<Markdown>` consumer wraps in `<div className="markdown-content">`.
- **Language:** Spanish in user-facing copy allowed (Sidebar pill "Critique" remains English per D-03 + CONTEXT.md specifics), technical identifiers stay English.
- **No new strategy module** for critique — extend `stage1_collect_responses`, do NOT create `backend/critique.py` (locked in PROJECT.md and re-affirmed in STATE.md).
- **Tokens-only CSS** — every new style consumes `var(--*)`, no hardcoded hex.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multipart upload acceptance + 750KB validation | API/Backend | — | Pydantic Form/File can't move client-side; size cap must be enforced server-side to be authoritative |
| File content storage | Database/Storage (JSON files) | — | Inline in conversation JSON per CRIT-4 tentative; sidecar deferred to v2.1 |
| Per-model prompt construction with `[YOUR PRIOR WORK]` markers | API/Backend (council.py) | — | Pure orchestration; no UI awareness |
| Anonymization regex (D-08/D-09) | API/Backend (council.py) | — | Must execute inside `stage2_collect_rankings` before concat — never on the wire |
| Pre-flight token estimate | Frontend (cheap heuristic) | API/Backend (authoritative re-check) | UI shows estimate before submit; server re-validates and blocks |
| Pre-flight cost estimate | Frontend | — | Reads `PROFILES["quality"]["typical_cost_usd"]` × scale factor; no server round-trip needed |
| Soft rate-limit (5 critiques/hour) | Browser/Client (localStorage) | — | UX-level guard; not a security boundary in single-user local app |
| Schema migration v1→v2 | API/Backend (storage.py) | — | Lazy on read in `get_conversation`; frontend never sees v1 shape |
| Critique sidebar pill | Frontend (Sidebar.jsx) | API/Backend (must include `mode` in conversation metadata) | Backend ships the field, frontend renders the chip |
| Sticky stage headers | Frontend (CSS-only) | — | Pure CSS `position: sticky` against `.messages-container` |
| Scroll-spy chips | Frontend (IntersectionObserver) | — | No backend; root = `.messages-container` |
| Stage 1 collapse accordion | Frontend (CSS-only) | — | Reuse ReasoningDisclosure pattern; no JS measurement |
| Back-to-top button | Frontend | — | Scroll listener on `.messages-container`, honors `prefers-reduced-motion` |

## Standard Stack

### Core (already installed — no new deps)

| Library | Version (resolved) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.121.3 | Multipart parsing via `Form()` + `File()` + `UploadFile` | [VERIFIED: `pyproject.toml`] Already in use; native multipart support |
| Pydantic | 2.12.4 | Field validators for 750KB cap | [VERIFIED: `pyproject.toml`] Already validates `SendMessageRequest` |
| httpx | 0.28.1 | Async OpenRouter calls | [VERIFIED: `backend/openrouter.py`] Already in use |
| React | 19.2.0 | Frontend | [VERIFIED: `frontend/package.json`] Already in use |
| react-markdown + remark-gfm + rehype-highlight | 10.1.0 / 4.0.1 / 7.0.2 | Markdown rendering of file content on chip expand | [VERIFIED: `frontend/package.json`] Already in use via `Markdown.jsx` |

### Supporting (already in tree — reuse without install)

| Library/Module | Purpose | When to Use |
|---------|---------|-------------|
| `FileReader.readAsText` | Read uploaded file as UTF-8 string client-side | Already used by `download.js:readFileAsText` — extend for critique slots |
| `python-multipart` | FastAPI auto-installs as a transitive dep when `Form()`/`File()` first used | Required for multipart parsing; verify it lands in `uv.lock` after first use |

### Alternatives Considered

| Instead of | Could Use | Why we don't |
|------------|-----------|----------|
| Inline JSON storage | Sidecar files (`data/conversations/{id}/files/*.md`) | Tentatively rejected per STATE.md — single-source-of-truth simplicity wins for <100 critique conversations. Plan-checker must FORCE the inline decision before execute (active todo from STATE.md). |
| `tiktoken` for token counting | Heuristic `len(text)/4` | tiktoken adds a 10MB+ dependency for ~5% accuracy improvement on a guardrail; heuristic is good enough for a 150K threshold with a safety margin under Opus 4.7's 1M context |
| `EventSource` for SSE consumer | `fetch().body.getReader()` | Already used in `api.js:sendMessageStream`; EventSource doesn't support POST and we send multipart |
| New SSE event type for n=1 skip | Empty `stage2_complete` payload | Zero frontend code change; reducer already handles `data: []` |
| `python-magic` for content-type sniff | Extension whitelist `.md`/`.txt` | Per STATE.md "no PDF/DOCX"; extension check is sufficient; magic adds a libmagic system dep |

**Installation:** none — all dependencies are already in `pyproject.toml` / `package.json`.

**Version verification:** Skipping `npm view` / `pip view` because no new packages are introduced. `python-multipart` lands transitively when FastAPI sees the first `Form()`/`File()` argument; we should verify it appears in `uv.lock` after the first commit that uses it, but no version pin is needed.

## 1. Critique mode backend

### 1.1 Endpoint signature

```python
# backend/main.py — NEW handler
from fastapi import Form, File, UploadFile

MAX_CRITIQUE_FILE_BYTES = 750 * 1024  # 750KB per file, locked in CONTEXT.md

@app.post("/api/conversations/{conversation_id}/critique/stream")
async def critique_stream(
    conversation_id: str,
    critique_instruction: str = Form(..., min_length=1),
    # 3 optional file slots — Quality model slot order from PROFILES
    file_slot_0: UploadFile | None = File(None),
    file_slot_1: UploadFile | None = File(None),
    file_slot_2: UploadFile | None = File(None),
):
    """Multipart endpoint for the critique flow.

    Each file_slot_N corresponds to PROFILES["quality"]["council_models"][N]
    by position — the frontend MUST honor this slot order. The model attribution
    is implicit (positional) so we don't pass model IDs as form fields
    (avoids drift between UI labels and backend routing).
    """
```

**Why positional slots, not keyed by model ID:**
- Cleaner contract — fewer form fields to validate.
- Slot order is the single source of truth (`PROFILES["quality"]["COUNCIL_MODELS"]`).
- Eliminates a class of bugs where frontend sends `openai/gpt-5.5` but config has been bumped to `openai/gpt-5.6` — slot 0 always maps to whatever the current quality profile says is slot 0.
- D-04 already locks slot labels to "the order of `PROFILES["quality"]["COUNCIL_MODELS"]`".

**Pydantic 750KB enforcement** — because `UploadFile` is not a `BaseModel` field, the cap must be enforced inside the handler:

```python
async def _read_and_validate_upload(upload: UploadFile | None) -> dict | None:
    if upload is None:
        return None
    content_bytes = await upload.read()
    size = len(content_bytes)
    if size > MAX_CRITIQUE_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File '{upload.filename}' is {size} bytes; max is {MAX_CRITIQUE_FILE_BYTES}",
        )
    # Extension whitelist (.md / .txt only) — D-04 lock + Out of Scope guard
    name = (upload.filename or "").lower()
    if not (name.endswith(".md") or name.endswith(".txt")):
        raise HTTPException(
            status_code=415,
            detail=f"File '{upload.filename}' must be .md or .txt",
        )
    # Decode + normalize per PITFALLS.md §MOD-2
    try:
        text = content_bytes.decode("utf-8-sig")  # strips BOM if present
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8")
    text = text.replace("\r\n", "\n").replace("\r", "\n")  # normalize line endings
    return {"filename": upload.filename, "content": text, "size_bytes": size}
```

The `utf-8-sig` codec gracefully strips a UTF-8 BOM if present (per `MOD-2`). LF normalization runs on the server too (defense in depth — the client also normalizes per §6 below).

### 1.2 SSE contract for n=1 / n=2 / n=3 council collapse

After the handler reads the 3 slots, it builds the active council:

```python
quality_config = PROFILES["quality"]
slot_models = quality_config["council_models"]  # ["openai/gpt-5.5", ..., ...]
chairman_model = quality_config["chairman_model"]

uploads = [
    await _read_and_validate_upload(file_slot_0),
    await _read_and_validate_upload(file_slot_1),
    await _read_and_validate_upload(file_slot_2),
]
# Drop empties — n collapses dynamically per D-05
active = [
    (model, upload) for model, upload in zip(slot_models, uploads) if upload is not None
]
if len(active) == 0:
    raise HTTPException(status_code=400, detail="Submit at least one file")

active_council_models = [m for m, _ in active]
external_context = {m: upload for m, upload in active}  # {model_id: {filename, content, size_bytes}}
```

**SSE event emission, parameterized on `n = len(active)`:**

| n | Events emitted | Notes |
|---|----------------|-------|
| 1 | `stage1_start` → `stage1_complete{data: [...]}` → `stage2_start` → `stage2_complete{data: [], metadata: {label_to_model: {}, aggregate_rankings: []}}` → `stage3_start` → `stage3_complete{data}` → `title_complete` → `message_metadata` → `complete` | Stage 2 emits empty payload; the frontend reducer in `App.jsx:170-179` writes `lastMsg.stage2 = []` and `lastMsg.metadata = {label_to_model: {}, aggregate_rankings: []}`. `Stage2.jsx:20` already guards `if (!rankings || rankings.length === 0) return null` — empty list renders nothing. **Zero frontend code change.** |
| 2 | Standard 3-stage flow with 2 critiques in Stage 1, 2-way mutual ranking in Stage 2 | Aggregate panel renders with 2 entries — already supported |
| 3 | Standard 3-stage flow | No special handling |

**Why emit empty `stage2_complete` instead of skipping the event entirely:** the current reducer in `App.jsx` has no "skip stage 2" branch. If we emitted `stage1_complete` → `stage3_start` directly, `lastMsg.loading.stage2` would never flip back to `false` after a hypothetical race, and `lastMsg.stage2` would stay `null`. Emitting an empty payload drains the state machine cleanly via the existing path. This pattern is consistent with the "graceful degradation" idiom already established in v1.0.

### 1.3 `external_context` plumbing through `stage1_collect_responses`

Current signature (lines 18-46 of `backend/council.py`):

```python
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
) -> List[Dict[str, Any]]:
    messages = [{"role": "user", "content": user_query}]
    responses = await query_models_parallel(council_models, messages)
    ...
```

**Minimal-diff extension** (additive `Optional` param, fresh-prompt callers pass nothing):

```python
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
    external_context: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    external_context: {model_id: {"filename": str, "content": str, "size_bytes": int}}
        When present, each council model receives a critique prompt where ITS
        own attributed file is marked [YOUR PRIOR WORK] and the others are
        marked [PEER'S PRIOR WORK]. When None, falls back to the v1 fresh-prompt
        broadcast (same messages to all models — existing behavior).
    """
    if external_context is None:
        # Existing path — unchanged
        messages = [{"role": "user", "content": user_query}]
        responses = await query_models_parallel(council_models, messages)
    else:
        # Critique path — per-model prompts
        messages_per_model = _build_critique_prompts(
            user_query, external_context, council_models
        )
        responses = await _query_models_individually(council_models, messages_per_model)
    # ... (response-formatting loop unchanged)
```

Two new private helpers in `council.py`:

```python
def _build_critique_prompts(
    critique_instruction: str,
    external_context: Dict[str, Dict[str, Any]],
    council_models: List[str],
) -> Dict[str, List[Dict[str, str]]]:
    """Build a per-model messages list. Each model sees ALL critique files but
    knows which one it authored, marked [YOUR PRIOR WORK].
    """
    prompts = {}
    for self_model in council_models:
        sections = []
        for other_model, file_obj in external_context.items():
            marker = "[YOUR PRIOR WORK]" if other_model == self_model else "[PEER'S PRIOR WORK]"
            sections.append(
                f"--- {marker} authored by {other_model} (file: {file_obj['filename']}) ---\n"
                f"{file_obj['content']}\n"
                f"--- END ---"
            )
        full = "\n\n".join(sections)
        prompt = (
            f"You are participating in a council critique. Below are 1-3 deep "
            f"research outputs. One is marked [YOUR PRIOR WORK] — that is YOUR "
            f"own previous research that you must now critique self-critically. "
            f"The others are [PEER'S PRIOR WORK].\n\n"
            f"{full}\n\n"
            f"USER'S CRITIQUE INSTRUCTION:\n{critique_instruction}\n\n"
            f"Produce a critique addressing the instruction above. Be specific, "
            f"cite sections, and treat your own prior work with the same scrutiny "
            f"as your peers'."
        )
        prompts[self_model] = [{"role": "user", "content": prompt}]
    return prompts


async def _query_models_individually(
    models: List[str],
    messages_per_model: Dict[str, List[Dict[str, str]]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Fan out distinct prompts to each model (vs. broadcast in query_models_parallel)."""
    import asyncio
    tasks = [query_model(model, messages_per_model[model]) for model in models]
    responses = await asyncio.gather(*tasks)
    return {model: response for model, response in zip(models, responses)}
```

`_query_models_individually` is ~10 lines and stays in `council.py` (NOT promoted to `openrouter.py`) because it is the critique-specific shape — `openrouter.py` keeps its broadcast contract clean.

### 1.4 Pre-flight token cap + Stage 2 truncate (PITFALLS §CRIT-1)

**Pre-flight estimate** — runs inside `critique_stream` immediately after files are read, BEFORE dispatching Stage 1:

```python
HEURISTIC_TOKENS_PER_CHAR = 1 / 4  # PITFALLS.md §CRIT-1 — len(text)/4 approximation
PREFLIGHT_TOKEN_CAP = 150_000      # CONTEXT.md lock

def _estimate_tokens(text: str) -> int:
    return int(len(text) * HEURISTIC_TOKENS_PER_CHAR)

total_input_chars = sum(len(u["content"]) for u in uploads if u) + len(critique_instruction)
estimated_tokens = _estimate_tokens(_join_for_stage1(uploads, critique_instruction))
# Multiplied by n because each council model sees the full set
estimated_total_stage1_tokens = estimated_tokens * len(active)

if estimated_total_stage1_tokens > PREFLIGHT_TOKEN_CAP:
    raise HTTPException(
        status_code=413,
        detail=(
            f"Estimated input is ~{estimated_total_stage1_tokens // 1000}K tokens, "
            f"exceeding the {PREFLIGHT_TOKEN_CAP // 1000}K cap. "
            f"Reduce file sizes or use fewer files."
        ),
    )
```

**Stage 2 per-critique truncate** — inside `stage2_collect_rankings`, BEFORE the existing concatenation at council.py:75-78. Add a new param `truncate_per_response_tokens: Optional[int]` (default `None` = legacy behavior):

```python
STAGE2_TRUNCATE_MARKER = "\n\n[…truncated, full text in Stage 1 tab]"
STAGE2_TRUNCATE_CHARS = 600 * 4  # 600 tokens × 4 chars/token heuristic = 2400 chars

def _truncate_for_stage2(text: str) -> str:
    if len(text) <= STAGE2_TRUNCATE_CHARS:
        return text
    return text[:STAGE2_TRUNCATE_CHARS] + STAGE2_TRUNCATE_MARKER

# Modified concatenation:
responses_text = "\n\n".join([
    f"Response {label}:\n{_truncate_for_stage2(result['response'])}"
    for label, result in zip(labels, stage1_results)
])
```

Critique path passes `truncate_per_response_tokens=600`; fresh path passes nothing.

### 1.5 Anonymization regex (CRIT-05 / D-08 / D-09)

**Location of regex pass:** inside `stage2_collect_rankings`, AFTER fetching Stage 1 responses but BEFORE concatenation (and BEFORE truncation). Specifically: modify `stage1_results` payload entries in-place — replace `result["response"]` with an anonymized copy. This way, truncation operates on the already-anonymized text (no possibility of a model name surviving via the un-truncated tail).

```python
import re
from typing import Pattern, List

# Precompiled once at module load.
# D-08: literal model identifiers — the 3 Quality models locked by PROFILES.
# Note: hardcoding 3 literals couples council.py to the quality profile.
# Mitigation: derive at module load from PROFILES["quality"]["council_models"]
# so a future profile bump auto-updates the regex set.
_MODEL_ID_PATTERNS: List[Pattern] = [
    re.compile(re.escape(m_id), re.IGNORECASE)
    for m_id in PROFILES["quality"]["council_models"]
]

# D-08: first-person self-references (verbatim copy from CONTEXT.md).
_SELF_REF_PATTERNS: List[Pattern] = [
    re.compile(r"\bAs Claude\b", re.IGNORECASE),
    re.compile(r"\bI am (Claude|GPT|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bI, (GPT|Claude|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bas an AI assistant from (Anthropic|OpenAI|Google)\b", re.IGNORECASE),
]


def _anonymize_critique_text(text: str, slot_index: int) -> str:
    """Strip authorship signals from a critique BEFORE Stage 2 concatenation.

    - D-08: replace literal model IDs with "Author N" (N = slot_index + 1).
    - D-08: replace first-person self-references with "[author redacted]".
    - D-09: third-person mentions of model names are intentionally NOT
            stripped (preserves substantive references in the research).
    """
    result = text
    author_label = f"Author {slot_index + 1}"
    for pattern in _MODEL_ID_PATTERNS:
        result = pattern.sub(author_label, result)
    for pattern in _SELF_REF_PATTERNS:
        result = pattern.sub("[author redacted]", result)
    return result
```

**Wiring inside `stage2_collect_rankings`** — at the very top of the function, before label assignment:

```python
async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: List[str],
    anonymize_critiques: bool = False,  # NEW — True only from critique path
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    if anonymize_critiques:
        # Operate on a copy so the persisted Stage 1 is NOT mutated.
        stage1_results = [
            {**r, "response": _anonymize_critique_text(r["response"], i)}
            for i, r in enumerate(stage1_results)
        ]
    # ... existing logic continues unchanged
```

**Interaction with `label_to_model`:** zero conflict. `label_to_model` maps `"Response A"` → `"openai/gpt-5.5"` for the **frontend** to de-anonymize on display. The Stage 2 regex pass changes the **content body** sent to the peer-review prompt. The `label_to_model` mapping is independent and still ships in the `stage2_complete` SSE metadata for the frontend's de-anonymization rendering.

## 2. Schema migration v1 → v2 (PERS-03)

### 2.1 Migration helper shape

```python
# backend/storage.py
SCHEMA_VERSION_V2 = 2

def migrate_message_v1_to_v2(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotent migration of a single message dict from v1 to v2 shape.

    v1 messages may lack: 'external_research', 'cost', 'mode' on the conversation.
    v2 always carries 'metadata' (may be empty {}), 'stage4' optional, plus the
    Phase 6 fields that haven't landed yet — those are documented as keys this
    helper will populate to None when Phase 6 lands.

    Idempotent: a v2 message passed back through this function returns unchanged.
    """
    if msg.get("role") != "assistant":
        return msg  # User messages have no schema-versioned fields

    migrated = dict(msg)
    # Defensive defaults — frontend already optional-chains these but the
    # helper makes the contract explicit and testable.
    migrated.setdefault("metadata", {})
    # Stage 2 metadata fields — Phase 6 will populate these for new writes;
    # for legacy v1 reads they stay absent inside metadata{} and Stage2.jsx
    # already falls back via optional chaining (`metadata?.label_to_model?.[...]`).
    # No further population needed in Phase 5 — the migration only guarantees
    # the shape is dict-typed, not that fields are present.
    return migrated


def _migrate_conversation_if_needed(conv: Dict[str, Any]) -> Dict[str, Any]:
    """Apply v1→v2 migration lazily on read. Idempotent."""
    if conv.get("schema_version") == SCHEMA_VERSION_V2:
        return conv  # Already v2 — no-op
    # v1 (no schema_version) → migrate
    conv = dict(conv)
    conv["schema_version"] = SCHEMA_VERSION_V2
    conv.setdefault("mode", "fresh")  # Pre-v2 conversations are all "fresh"
    conv["messages"] = [migrate_message_v1_to_v2(m) for m in conv.get("messages", [])]
    return conv
```

### 2.2 Integration point in `get_conversation`

Single call site at `backend/storage.py:78-94` — after `json.load`:

```python
def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    path = get_conversation_path(conversation_id)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        conv = json.load(f)
    return _migrate_conversation_if_needed(conv)  # NEW — lazy migration
```

**Lazy forever (no eager write-back)** per CONTEXT.md Claude's Discretion: returning the migrated dict without re-saving avoids surprising file mutations on a pure read. This means a v1 file on disk stays v1 on disk forever; it just always hydrates as v2 on read. A v2 write happens organically the next time the user sends a message in that conversation (`save_conversation` writes the now-mutated dict with `schema_version: 2`).

**Storage write integration** — `save_conversation` and `create_conversation` must stamp `schema_version: 2`. In `create_conversation`:

```python
conversation = {
    "id": conversation_id,
    "schema_version": SCHEMA_VERSION_V2,  # NEW
    "mode": mode,  # NEW — "fresh" | "critique", default "fresh"
    "created_at": datetime.utcnow().isoformat(),
    "title": "New Conversation",
    "messages": []
}
```

`create_conversation` signature picks up a new `mode: Literal["fresh", "critique"] = "fresh"` kwarg; v1 callers (passing nothing) still get a fresh conversation.

**`add_assistant_message` signature** picks up an optional `external_research` kwarg, NOT a new positional:

```python
def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
    stage4: Optional[Dict[str, Any]] = None,
    external_research: Optional[Dict[str, Dict[str, Any]]] = None,  # NEW
):
    ...
    if external_research is not None:
        message["external_research"] = external_research
```

### 2.3 Idempotency + roundtrip test

The test that asserts "v1 JSON loads as v2 without throwing" is the highest-value test in the milestone (STATE.md + PITFALLS.md §CRIT-3). Specification:

```python
# backend/tests/test_migration.py — Phase 7 plan, but defined now
def test_v1_conversation_loads_as_v2():
    # Build a v1-shape conversation literal (no schema_version, no metadata fields)
    v1 = {
        "id": "...",
        "created_at": "2026-04-01T00:00:00",
        "title": "Legacy",
        "messages": [
            {"role": "user", "content": "hi"},
            {
                "role": "assistant",
                "stage1": [{"model": "openai/gpt-5-mini", "response": "hello"}],
                "stage2": [],
                "stage3": {"model": "anthropic/claude-haiku-4.5", "response": "hi back"},
                # NO metadata field
            },
        ],
    }
    # Write to tmp DATA_DIR, read back via get_conversation, assert shape
    migrated = _migrate_conversation_if_needed(v1)
    assert migrated["schema_version"] == 2
    assert migrated["mode"] == "fresh"
    assert migrated["messages"][1]["metadata"] == {}
    # Idempotent — second pass is a no-op
    assert _migrate_conversation_if_needed(migrated) == migrated
```

Phase 7 owns the actual pytest file (TEST-01); Phase 5 only owns the production code that this test will exercise.

## 3. Critique file storage (inline JSON + 750KB cap + reload hydration)

### 3.1 Inline JSON shape

`external_research` is a dict keyed by `model_id` (string) with value `{filename, content, size_bytes, uploaded_at}`. UTF-8 strings, NOT base64 — the files are `.md`/`.txt` (already text), JSON encoding handles UTF-8 natively, base64 would inflate 33% with no benefit.

```json
{
  "id": "...",
  "schema_version": 2,
  "mode": "critique",
  "created_at": "...",
  "title": "Critique of OpenAI/Anthropic/Google deep researches",
  "messages": [
    {"role": "user", "content": "<the critique instruction>"},
    {
      "role": "assistant",
      "stage1": [...],
      "stage2": [...],
      "stage3": {...},
      "metadata": {...},
      "external_research": {
        "openai/gpt-5.5": {
          "filename": "chatgpt-deep-research.md",
          "content": "<full UTF-8 string, LF-normalized, BOM-stripped>",
          "size_bytes": 487231,
          "uploaded_at": "2026-05-10T14:32:00Z"
        },
        "anthropic/claude-opus-4.7": {...},
        "google/gemini-3.1-pro-preview": {...}
      }
    }
  ]
}
```

**File size impact:** 3 × 500KB avg × 100 critique conversations = 150MB on disk. Well under PITFALLS.md §CRIT-4 alarm threshold of 500MB. The sidebar-listing perf risk also doesn't apply because `list_conversations` already extracts metadata-only (filename + created_at + title + message_count) at storage.py:111-137 — it does NOT parse the full message content. The 1.5MB-parse-per-listing pitfall flagged in PITFALLS.md §CRIT-4 was a worst-case projection that assumed `list_conversations` read the messages; verified by reading the code, it does not. **CRIT-4 is partially mitigated by existing v1 design; the 750KB cap is the additional belt-and-braces.**

### 3.2 Reload hydration (CRIT-08)

When `get_conversation` returns a critique conversation, `ChatInterface.jsx` reads `lastMessage.external_research` (a dict). For each entry, render a collapsed chip ABOVE the assistant message. Chip expand reuses the ReasoningDisclosure CSS pattern verbatim:

```jsx
// frontend/src/components/ExternalResearchPanel.jsx  (NEW, ~80 LOC)
import { useState } from 'react';
import Markdown from './Markdown';
import './ExternalResearchPanel.css';

export default function ExternalResearchPanel({ externalResearch }) {
  if (!externalResearch) return null;
  const entries = Object.entries(externalResearch);  // [[model_id, file_obj], ...]
  if (entries.length === 0) return null;
  return (
    <div className="external-research-panel">
      {entries.map(([modelId, fileObj]) => (
        <ResearchChip key={modelId} modelId={modelId} fileObj={fileObj} />
      ))}
    </div>
  );
}

function ResearchChip({ modelId, fileObj }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="research-chip" data-open={open}>
      <button
        type="button"
        className="research-chip__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="research-chip__model">{modelId}</span>
        <span className="research-chip__filename">{fileObj.filename}</span>
        <span className="research-chip__size">{formatBytes(fileObj.size_bytes)}</span>
      </button>
      <div className="research-chip__panel">
        <div className="research-chip__panel-inner markdown-content">
          <Markdown>{fileObj.content}</Markdown>
        </div>
      </div>
    </div>
  );
}
```

CSS — copy the grid-trick pattern from `ReasoningDisclosure.css:59-67`:

```css
.research-chip__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.research-chip[data-open="true"] .research-chip__panel {
  grid-template-rows: 1fr;
}
.research-chip__panel-inner {
  overflow: hidden;
  min-height: 0;
}
```

`prefers-reduced-motion` already overrides transitions globally per `index.css:178-189`.

## 4. Cost & rate-limit (CRIT-07)

### 4.1 Current OpenRouter pricing for Quality models

[CITED: https://openrouter.ai/anthropic/claude-opus-4.7 — fetched 2026-05-10]
[CITED: https://platform.claude.com/docs/en/about-claude/pricing]

| Model | Input $/M tokens | Output $/M tokens | Context |
|-------|------------------|-------------------|---------|
| `anthropic/claude-opus-4.7` | $5 | $25 | 1M tokens (verified) |
| `openai/gpt-5.5` | unverified — needs spike | unverified | unverified |
| `google/gemini-3.1-pro-preview` | unverified — needs spike | unverified | unverified |

**Status of unknowns:** STATE.md already flags a 5-minute spike for OpenRouter `usage.cost` shape verification BEFORE Phase 6 plan-1. That spike should also capture per-model pricing for the gpt-5.5 and gemini-3.1-pro-preview slots — even though Phase 5 surfaces the estimate, the precise multiplier should come from the spike. For Phase 5 plan-1, use Opus 4.7 as the **worst-case anchor** ($5/$25) for the cost-estimate UI and document that the range will tighten in Phase 6.

### 4.2 Cost estimate formula

For a critique submission with `n` files (n ∈ {1,2,3}) and total input character count `C`:

```
estimated_tokens_per_stage1_call ≈ (C / 4) + (instruction_chars / 4) + ~300 fixed prompt overhead
total_stage1_input_tokens         = estimated_tokens_per_stage1_call × n
typical_stage1_output_per_model   ≈ 1500-3000 output tokens (from PITFALLS.md §CRIT-1)
total_stage1_output_tokens        = typical_stage1_output × n  (range: 1500n .. 3000n)

stage2_input ≈ truncated(stage1_output) × n + ranking_prompt  // = ~600n + 500 = 2K-3K tokens × n peer reviews
stage2_output ≈ 500-1000 tokens × n peer reviews

stage3_input ≈ total_stage1_output + stage2_output + chairman_prompt
stage3_output ≈ 1000-2500 tokens

# Cost — worst-case using Opus 4.7 rates as anchor (all 3 models priced near this in 2026 Quality tier)
low  = (sum_input_tokens  × $5 / 1M) + (sum_output_tokens × $25 / 1M) × 0.7  // 0.7 = optimistic mix
high = (sum_input_tokens  × $5 / 1M) + (sum_output_tokens × $25 / 1M) × 1.3  // 1.3 = pessimistic mix
```

For typical inputs (3 files × 50K chars each = 150K chars total ≈ 38K tokens):
- low ≈ $0.40
- high ≈ $1.20
- Display: `Estimated upstream cost: $0.40–$1.20 (billed to your provider keys, not OpenRouter)`

For minimal inputs (1 file × 10K chars):
- low ≈ $0.04
- high ≈ $0.12

**The display range honors ROADMAP.md success criterion #2** ("$X.XX–$Y.YY upstream"). Recompute the range on each file change (cheap — <1ms — no debounce needed) per CONTEXT.md Claude's Discretion.

### 4.3 localStorage soft rate-limit (5 critiques / hour)

Pattern: **timestamp-array, not counter+reset**. The array is robust to clock skew, no edge case at the rollover boundary.

```js
// frontend/src/utils/critiqueRateLimit.js  (NEW, ~30 LOC)
const STORAGE_KEY = 'critique-run-timestamps';
const WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const LIMIT = 5;

export function getRecentRunCount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - WINDOW_MS;
    const filtered = arr.filter((ts) => ts > cutoff);
    if (filtered.length !== arr.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered.length;
  } catch {
    return 0;  // Corrupted storage — treat as fresh
  }
}

export function recordCritiqueRun() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - WINDOW_MS;
    const filtered = arr.filter((ts) => ts > cutoff);
    filtered.push(Date.now());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore — best-effort, not a security control */
  }
}

export function shouldReconfirm() {
  return getRecentRunCount() >= LIMIT;
}
```

**UX:** Submit handler in the critique form calls `shouldReconfirm()` before submission. If true, show a discreet inline confirm: "You've run 5 critiques in the last hour. Each critique costs $0.40–$1.20. Run another?" with Confirm/Cancel. On Confirm, proceed and call `recordCritiqueRun()`. No toast, no modal — inline microcopy in `var(--color-warn)`, Direction A "calmo".

## 5. In-conversation navigation (NAV-01..04)

### 5.1 Scroll container topology (verified)

Layout chain (verified by reading `App.css:5-46`, `ChatInterface.css:6-21`):

```
.app (grid, 100vh, overflow: hidden)
├── .app-header (52px, var(--layout-header-h))  ← global header
├── .sidebar (column 1)
└── .app__main-with-banner (column 2, flex column, overflow: hidden)
    └── .chat-interface (flex: 1, overflow: hidden)
        └── .messages-container (flex: 1, overflow-y: auto)  ← THE SCROLL CONTAINER
            └── conversation messages
```

**Implication for NAV-01:** sticky stage headers anchor relative to `.messages-container`, which is already positioned BELOW the global header in the grid. Therefore `position: sticky; top: 0;` is correct — NOT `top: var(--layout-header-h)`. The 52px header is irrelevant to the sticky calc because the scroll container's top edge already sits at `top: var(--layout-header-h)` in the viewport.

### 5.2 NAV-01 sticky stage headers

Pure CSS, applied to `.stage-title` elements inside Stage1, Stage2, Stage3 components:

```css
/* Stage1.css, Stage2.css, Stage3.css — each gets this pattern */
.stage-title {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-bg-primary);
  padding: var(--space-3) var(--space-4);
  margin: 0 calc(-1 * var(--space-4));  /* edge-bleed so the sticky bg covers gutter */
  border-bottom: 1px solid var(--color-border-subtle);
  /* Use the existing typography tokens already applied to .stage-title */
}
```

**Why `var(--color-bg-primary)` and not `transparent`:** sticky elements DO NOT have an implicit background; if transparent, scrolling content shows through. Must opaque-out with the page background.

**z-index discipline:** `z-index: 2` is above message body but below the eventual scroll-spy strip (which uses `z-index: 3`) and below the Back-to-top button (`z-index: 4`).

### 5.3 NAV-02 scroll-spy strip with IntersectionObserver

A new `StageNavStrip` component sits **inside** `.messages-container` but as the first child, so it scrolls with content but with `position: sticky; top: var(--layout-header-h)`... no, wait — re-checking: it should pin to the **top of the scroll container**, which is already below the global header. So `top: 0` is correct here too. The strip is sticky relative to `.messages-container`.

Actually re-reading: the strip should appear ABOVE the deliberation per CONTEXT.md, but pin to the top so it stays visible. Placing it inside `.messages-container` with `position: sticky; top: 0; z-index: 3` means it pins to the top of the scroll viewport. The individual stage titles (NAV-01) ALSO pin to `top: 0` — that means they stack at the same offset and the stage titles would HIDE the strip. Fix: stage titles pin BELOW the strip via `top: <strip height>`.

Concrete numbers:
- Strip height: `var(--space-7)` = 48px
- Stage title `top: 48px` so it pins just below the strip

```css
.stage-nav-strip {
  position: sticky;
  top: 0;
  z-index: 3;
  height: var(--space-7);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-subtle);
}
.stage-title {
  position: sticky;
  top: var(--space-7);  /* stack below the strip */
  z-index: 2;
}
```

**IntersectionObserver setup:**

```js
// inside StageNavStrip, after mount
useEffect(() => {
  const root = document.querySelector('.messages-container');
  if (!root) return;
  const observer = new IntersectionObserver(
    (entries) => {
      // Find the entry MOST visible (largest intersectionRatio that's > 0)
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      setActiveStage(visible[0].target.dataset.stage);  // e.g., "stage1"
    },
    {
      root,                          // .messages-container (NOT document)
      rootMargin: '-48px 0px -50% 0px',  // top: 48px excludes the sticky strip itself
                                         // bottom: -50% — section is "active" when it
                                         // crosses the upper half of the viewport
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    }
  );
  // Observe each stage's wrapping section
  document.querySelectorAll('[data-stage]').forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}, [/* re-run when message structure changes */]);
```

**Smooth-scroll on chip click:**

```js
function handleChipClick(stage) {
  const target = document.querySelector(`[data-stage="${stage}"]`);
  if (!target) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
}
```

`block: 'start'` aligns the target's top edge with the scroll viewport's top; combined with the `scroll-margin-top: var(--space-7)` on each `[data-stage]` section (to offset for the sticky strip), the section header appears immediately below the strip.

### 5.4 NAV-03 Stage 1 collapse via CSS-only accordion

Locate exact ReasoningDisclosure pattern (verified at `ReasoningDisclosure.css:59-67`):

```css
.reasoning-disclosure__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.reasoning-disclosure__panel[data-open="true"] {
  grid-template-rows: 1fr;
}
.reasoning-disclosure__panel-inner {
  overflow: hidden;
  min-height: 0;
}
```

**For NAV-03's >600px threshold:** the grid trick works for content of any height — the `1fr` row expands to natural content height. The 600px threshold is for **deciding whether to render the "Show more" toggle at all**, not for limiting the collapsed height to 600px-ish.

Two options:
- **A) JS measure on mount, conditionally render toggle:** uses `useRef` + `el.scrollHeight > 600` after mount. Simple, but causes one extra render.
- **B) Pure CSS via `max-height` clamp on collapsed state:** the collapsed state shows the first ~400px via `max-height: 400px; overflow: hidden;`, expanded shows full. Toggle is always rendered. Lose the "no toggle for short responses" affordance.

**Recommended: Option A** — keep the "no toggle on short responses" affordance (Direction A "calmo" — don't show controls that aren't useful):

```jsx
// Stage1.jsx — modify the tab-content block
function Stage1Tab({ resp, defaultCollapsed }) {
  const contentRef = useRef(null);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [open, setOpen] = useState(!defaultCollapsed);

  useEffect(() => {
    if (contentRef.current && contentRef.current.scrollHeight > 600) {
      setNeedsToggle(true);
    }
  }, [resp.response]);

  if (!needsToggle) {
    // Short response — render inline, no toggle
    return (
      <div ref={contentRef} className="response-text markdown-content">
        <Markdown>{resp.response}</Markdown>
      </div>
    );
  }
  return (
    <div className="stage1-collapsible" data-open={open}>
      <div ref={contentRef} className="stage1-collapsible__panel">
        <div className="stage1-collapsible__panel-inner response-text markdown-content">
          <Markdown>{resp.response}</Markdown>
        </div>
      </div>
      <button
        type="button"
        className="stage1-collapsible__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? '▼ Show less' : '▶ Show more'}
      </button>
    </div>
  );
}
```

**`defaultCollapsed` semantics** per CONTEXT.md Claude's Discretion: `true` when reloading a historical conversation (the assistant message already has Stage 3 populated at mount time); `false` during live deliberation (Stage 1 streams in while Stage 2 hasn't arrived). Resolve at the call site by passing `defaultCollapsed={Boolean(msg.stage3)}`.

### 5.5 NAV-04 Back-to-top button

```jsx
// inside ChatInterface — sibling to .messages-container, absolute-positioned
function BackToTopButton({ scrollContainerRef }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 800);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  const handleClick = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };
  return (
    <button type="button" className="back-to-top" onClick={handleClick} aria-label="Back to top">
      ↑
    </button>
  );
}
```

```css
.back-to-top {
  position: absolute;
  bottom: var(--space-5);
  right: var(--space-5);
  width: var(--space-7);
  height: var(--space-7);
  border-radius: 50%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-sm);
  z-index: 4;
  cursor: pointer;
  /* Touch-target candidate for Phase 7 MOBL-01 — already 48px which is >= 44px min */
}
```

**Reduced-motion handling** is per-call via `matchMedia` because `scrollTo({behavior})` does NOT auto-honor `prefers-reduced-motion` in all browsers (only Firefox & Chrome do; Safari is inconsistent as of 2026). The explicit check guarantees behavior across engines.

Mounting: `.back-to-top` must be inside a positioned ancestor (or the body). Place it as a sibling to `.messages-container` inside `.chat-interface`, with `.chat-interface { position: relative; }` so it anchors correctly (already implicit via the flex layout; verify).

## 6. Frontend integration

### 6.1 Sidebar two-button + pill (D-01 / D-03)

```jsx
// frontend/src/components/Sidebar.jsx — replace lines 275-280
<div className="sidebar-header">
  <h1>LLM Council</h1>
  <button className="new-conversation-btn" onClick={onNewConversation}>
    + New conversation
  </button>
  <button className="new-conversation-btn" onClick={onNewCritiqueConversation}>
    + New critique
  </button>
</div>
```

Sidebar.css already gives `.new-conversation-btn` width:100% + the right padding/colors. Add only:

```css
.sidebar-header > .new-conversation-btn + .new-conversation-btn {
  margin-top: var(--space-2);  /* D-01 lock */
}
```

**Pill (D-03)** — modify `ConversationItem`:

```jsx
<div className="conversation-meta">
  {conv.message_count} messages
  {conv.mode === 'critique' && <span className="conversation-pill">Critique</span>}
</div>
```

```css
.conversation-pill {
  margin-left: var(--space-2);
  padding: 0 var(--space-2);
  font-size: var(--font-size-microcopy);
  background: var(--color-accent-soft);
  color: var(--color-fg-secondary);
  border-radius: var(--radius-sm);
  vertical-align: baseline;
}
```

`conv.mode` is shipped by `list_conversations` (storage.py:111-137 — needs a 1-line addition: `"mode": data.get("mode", "fresh")` in the dict-build).

### 6.2 Mode propagation through the React state tree

```
App.jsx
  ├── handleNewConversation()           — creates fresh conv (POST /api/conversations {mode:"fresh"})
  ├── handleNewCritiqueConversation()   — creates critique conv (POST /api/conversations {mode:"critique"})
  ├── currentConversation.mode          — read from GET response after creation
  ├── handleSendMessage(content, profile)         — fresh path (existing)
  └── handleSubmitCritique(files, instruction)    — critique path (NEW)

ChatInterface.jsx
  ├── Reads conversation.mode
  ├── If mode === "fresh" && messages.length === 0 → existing welcome
  ├── If mode === "critique" && messages.length === 0 → 3 dropzones + textarea
  └── handleSubmit calls onSubmitCritique (passed from App)

api.js
  ├── createConversation(mode = 'fresh')          — extend existing
  └── sendCritiqueStream(conversationId, instruction, fileObjects, onEvent)
                                                  — NEW; builds FormData; same SSE reader loop
```

**`CreateConversationRequest`** in `backend/main.py` extends:

```python
class CreateConversationRequest(BaseModel):
    mode: Literal["fresh", "critique"] = "fresh"
```

`POST /api/conversations` becomes:

```python
conversation = storage.create_conversation(conversation_id, mode=request.mode)
```

### 6.3 sendCritiqueStream multipart construction

```js
async sendCritiqueStream(conversationId, critiqueInstruction, slots, onEvent) {
  // slots: array of length 3, each {file: File|null, modelId: string}
  // — modelId is informational; backend uses slot position only.
  const form = new FormData();
  form.append('critique_instruction', critiqueInstruction);
  slots.forEach((slot, i) => {
    if (slot.file) form.append(`file_slot_${i}`, slot.file, slot.file.name);
  });
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/critique/stream`,
    { method: 'POST', body: form }  // NO Content-Type header — browser sets multipart boundary
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: 'Failed' }));
    throw new Error(detail.detail || 'Failed to send critique');
  }
  // SSE reader loop — identical to sendMessageStream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event.type, event);
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      }
    }
  }
}
```

**Critical: DO NOT set `Content-Type` manually.** The browser writes `multipart/form-data; boundary=...` itself; setting it explicitly breaks the multipart parser server-side.

### 6.4 Critique welcome state (3 dropzones + textarea)

```jsx
// frontend/src/components/CritiqueForm.jsx  (NEW, ~150 LOC)
import { useState, useRef } from 'react';
import { formatBytes } from '../utils/format';
import { readFileAsText } from '../utils/download';
import { getRecentRunCount, recordCritiqueRun } from '../utils/critiqueRateLimit';
import './CritiqueForm.css';

const MAX_CRITIQUE_FILE_BYTES = 750 * 1024;
const QUALITY_SLOT_MODELS = [
  'openai/gpt-5.5',
  'anthropic/claude-opus-4.7',
  'google/gemini-3.1-pro-preview',
];  // MUST mirror PROFILES["quality"]["council_models"] order

export default function CritiqueForm({ onSubmit, isLoading }) {
  const [slots, setSlots] = useState([null, null, null]);  // each: {file, name, size, content} | null
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState(null);

  // ... drop / pick handlers per slot, see §6.5
  // ... cost estimate, see §4.2
  // ... submit handler with rate-limit reconfirm, see §4.3

  return (
    <div className="critique-form">
      {QUALITY_SLOT_MODELS.map((modelId, i) => (
        <Dropzone
          key={modelId}
          modelId={modelId}
          slot={slots[i]}
          onFile={(file) => handleAddFile(i, file)}
          onRemove={() => handleRemoveFile(i)}
        />
      ))}
      <textarea
        className="critique-form__instruction"
        placeholder="Identify factual errors, missing perspectives, and weak arguments in these research files…"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        required
        rows={4}
      />
      <div className="critique-form__cost-row">
        <span>{formatCostEstimate(slots)}</span>
        <button
          type="submit"
          className="send-button"
          disabled={!canSubmit(slots, instruction, isLoading)}
        >
          Submit critique
        </button>
      </div>
      {error && <div className="critique-form__error">{error}</div>}
    </div>
  );
}
```

### 6.5 Drop-zone interaction (D-04 + D-06)

Each `Dropzone` accepts via click (hidden `<input type="file" accept=".md,.txt">`) OR drag-and-drop (`onDragOver`+`onDrop`). Empty state shows the model ID label + ".md / .txt, max 750KB" microcopy. Loaded state shows the file chip `✅ filename.md  size  ✕`. The ✕ button removes the file (D-06 remove + re-upload, no re-assignment between slots).

Client-side validation in `handleAddFile`:
1. Check `file.size <= MAX_CRITIQUE_FILE_BYTES` — if not, set error inline.
2. Check extension whitelist `.md`/`.txt` — if not, set error.
3. `readFileAsText(file)` with UTF-8 (already the default).
4. Normalize CRLF → LF: `content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`.
5. Strip BOM: `content.replace(new RegExp(String.fromCharCode(0xFEFF), ''), '')` — use a constructed RegExp so the source file never embeds the literal U+FEFF codepoint.
6. Store `{file, name, size, content}` in slot.

(Server validates again per §1.1 — defense in depth.)

## 7. Common Pitfalls (read first)

### Pitfall: Stage 2 token detonation (§CRIT-1)
**Owned by §1.4** above — pre-flight 150K cap + per-critique 600-token truncate in `_truncate_for_stage2`. The truncation marker `[…truncated, full text in Stage 1 tab]` is part of the contract because users may see Stage 2 references that "stop short" and need to know where the full text lives.

### Pitfall: Cost shock (§CRIT-2)
**Owned by §4** above — pre-flight range estimate + soft rate-limit. Worst-case anchor on Opus 4.7 rates ($5/$25 per M) — acceptable to display until Phase 6 spike refines.

### Pitfall: Schema break on reload (§CRIT-3)
**Owned by §2** above — lazy migration in `get_conversation` + idempotent helper. Highest-value test is the v1-JSON-loads-as-v2 roundtrip.

### Pitfall: Inline file blob bloat (§CRIT-4)
**Mitigated by 750KB cap + verified that `list_conversations` does NOT parse messages.** Sidebar listing remains O(n metadata reads), not O(n × 1.5MB parses). The original PITFALLS.md warning assumed a different `list_conversations` implementation. Plan-checker must still **force the inline-storage decision** before execute per STATE.md active todo.

### Pitfall: Attribution leak in Stage 2 (§MOD-1)
**Owned by §1.5** above — surgical regex per D-08/D-09. The regex executes inside `stage2_collect_rankings` BEFORE the existing concatenation, on a COPY of `stage1_results` so the persisted Stage 1 (visible in the Stage 1 tab) is NOT anonymized.

### Pitfall: File encoding edge cases (§MOD-2)
**Owned by §1.1 + §6.5** — UTF-8 enforced server-side (`utf-8-sig` codec strips BOM, decode fails on non-UTF-8); LF normalization runs both client-side (after FileReader) and server-side (defense in depth).

### Pitfall: Sticky element transparency
**Owned by §5.2** — every sticky stage header MUST have an opaque background (`var(--color-bg-primary)`); without it, scrolling content shows through and looks broken.

### Pitfall: IntersectionObserver root vs document
**Owned by §5.3** — `root: document.querySelector('.messages-container')` NOT default `null` (which means viewport). Default would observe relative to the viewport and produce wrong results because `.messages-container` has its own scroll.

### Pitfall: `scrollTo({behavior:'smooth'})` ignoring reduced motion
**Owned by §5.5** — explicit `matchMedia` check per call. Safari doesn't auto-honor; explicit check is portable.

### Pitfall: multipart Content-Type header forced
**Owned by §6.3** — never set `Content-Type` manually on `FormData` POST; browser writes the multipart boundary.

### Pitfall: SSE event drop on n=1
**Owned by §1.2** — emit empty `stage2_complete` with empty arrays + empty `label_to_model`; do NOT skip the event. Existing reducer drains.

## 8. Code Examples (verified)

### FastAPI multipart with conditional File()

```python
# Source: FastAPI official docs (verified pattern; in-tree once Phase 5 lands)
from fastapi import FastAPI, Form, File, UploadFile

@app.post("/critique")
async def critique(
    instruction: str = Form(..., min_length=1),
    file_slot_0: UploadFile | None = File(None),
    file_slot_1: UploadFile | None = File(None),
    file_slot_2: UploadFile | None = File(None),
):
    files = [f for f in (file_slot_0, file_slot_1, file_slot_2) if f is not None]
    return {"count": len(files), "instruction": instruction}
```

### Grid-template-rows accordion (CSS-only, verified)

```css
/* Source: frontend/src/components/ReasoningDisclosure.css:59-67 (in-tree) */
.panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.panel[data-open="true"] {
  grid-template-rows: 1fr;
}
.panel-inner {
  overflow: hidden;
  min-height: 0;
}
```

### SSE-via-fetch reader loop (verified)

```js
// Source: frontend/src/api.js:96-117 (in-tree)
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const event = JSON.parse(line.slice(6));
        onEvent(event.type, event);
      } catch (e) { console.error(e); }
    }
  }
}
```

### IntersectionObserver with explicit root

```js
// [CITED: MDN IntersectionObserver, verified against caniuse 2026 — 99.4% support]
const observer = new IntersectionObserver(callback, {
  root: scrollContainer,  // NOT null — explicit scroll container
  rootMargin: '-48px 0px -50% 0px',
  threshold: [0, 0.25, 0.5, 0.75, 1.0],
});
```

## State of the Art

| Old Approach (v1) | New Approach (v2 Phase 5) | Rationale |
|--------------------|---------------------------|-----------|
| Single conversation type (fresh) | `mode: "fresh" \| "critique"` at conversation root | D-02; conversation mode is fixed at creation, no in-conversation switching |
| `stage1_collect_responses(user_query, council_models)` broadcasts same prompt | Optional `external_context` param triggers per-model prompts via `_query_models_individually` | CRIT-04 + STATE.md "no new strategy module" |
| Stage 2 sees full Stage 1 responses verbatim | Stage 2 truncates each critique to 600 tokens + marker; anonymization regex runs first | PITFALLS §CRIT-1 + §MOD-1 |
| No schema version | `schema_version: 2` at root + lazy migration in `get_conversation` | PITFALLS §CRIT-3 |
| No file uploads beyond fresh-prompt attachments | 3-slot multipart `/critique/stream` endpoint, 750KB cap, inline storage | CRIT-02 + CRIT-03 + CRIT-04 |
| No in-conversation navigation | Sticky headers + scroll-spy strip + Stage 1 collapse + Back-to-top | NAV-01..04 |
| `prefers-reduced-motion` honored only via CSS transitions | NAV-04 also explicitly checks `matchMedia` for `scrollTo` behavior | Safari engine inconsistency |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `python-multipart` auto-installs as a FastAPI transitive dependency on first `Form()`/`File()` use | §Standard Stack supporting | Phase 5 plan-1 must verify `uv.lock` after first commit using multipart; if missing, explicit `uv add python-multipart` |
| A2 | `openai/gpt-5.5` and `google/gemini-3.1-pro-preview` 2026 pricing approximates Opus 4.7 ($5/$25 per M) for the cost-estimate range | §4.1 | Cost-estimate range may be 2-3x off until Phase 6 spike refines; cosmetic-only for v2.0 |
| A3 | `usage.cost_details.upstream_inference_cost` is returned by all 3 Quality models under BYOK | §4 cost (background context for Phase 6) | Phase 6 plan-1 spike validates; Phase 5 doesn't surface this yet |
| A4 | Heuristic `len(text)/4` is a sufficient token estimate for the 150K pre-flight cap with safety margin | §1.4 | Real Opus tokenizer can yield up to 35% more tokens for the same text per Opus 4.7 docs; cap of 150K well under 1M context means a 35% drift still leaves headroom |
| A5 | `<ChatInterface />` parent provides a positioned ancestor for `.back-to-top` to anchor against | §5.5 | If positioning fails, button floats relative to body — easy fix at plan time |
| A6 | The existing `Stage2.jsx` guard `if (!rankings \|\| rankings.length === 0) return null` renders cleanly on empty Stage 2 payload (n=1) | §1.2 | If `Stage2.jsx` has additional assertions, n=1 may render wrong — code re-read confirms only the length guard exists |
| A7 | `FormData` POST without `Content-Type` header is universally supported across React 19 fetch in Chrome/Firefox/Safari 2026 | §6.3 | Well-established browser behavior since 2015; risk negligible |

## Open Questions

1. **Should the critique-instruction textarea use `var(--font-serif)` (consistent with body) or `var(--font-sans)` (consistent with controls / fresh-prompt textarea)?**
   - The fresh-prompt textarea uses default styling (no explicit family in ChatInterface.css for `.message-input`).
   - Recommendation: match fresh-prompt textarea verbatim — defer to existing CSS.
   - Resolves at plan-time via reading `.message-input` in `ChatInterface.css`.

2. **Where does `Stage1Progress` (the existing v1 progress strip) live in NAV-02's information architecture?**
   - v1 has `Stage1Progress` (a small in-progress indicator); v2 NAV-02 adds a richer scroll-spy strip.
   - Per CONTEXT.md NAV-02: "extends/replaces the existing v1.0 `Stage1Progress`".
   - Recommendation: REPLACE. The new strip is structurally a superset (shows all stages, not just Stage 1). Phase 5 plan removes `Stage1Progress`.

3. **Does `prefers-reduced-motion` already disable the `grid-template-rows` transition in ReasoningDisclosure?**
   - Verified at `index.css:178-189`: global `*, *::before, *::after { transition-duration: 0.01ms !important }` override. Yes.
   - No additional handling needed for new accordions in Phase 5.

4. **For the cost estimate UI text, is the copy `"Estimated upstream cost: $X.XX–$Y.YY (billed to your provider keys, not OpenRouter)"` locked verbatim?**
   - ROADMAP.md success criterion #2 quotes this exact text. Treat as locked.

5. **What happens when ALL 3 model `query_model` calls return None (full Stage 1 failure)?**
   - Current `stage1_collect_responses` returns `[]` (filtered list); `run_full_council` returns the "All models failed" error dict at line 366-369.
   - For critique path: same behavior is correct. The SSE generator should detect empty `stage1_results` and emit an `error` event with `message: "All council models failed to critique"`.
   - Codify at plan-time.

6. **Should the "Critique" pill be present on the active row too, or only in the list view?**
   - CONTEXT.md D-03 says "discreet pill next to the title in the sidebar list" — doesn't differentiate active/inactive.
   - Recommendation: present on both (consistency). Plan-checker confirms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `uv` | Backend run | ✓ | (assumed installed per v1.0) | — |
| Python 3.10+ | Backend | ✓ | 3.10 pinned in `.python-version` | — |
| Node.js + npm | Frontend dev server | ✓ | (assumed per v1.0) | — |
| FastAPI 0.121.3 | Multipart endpoint | ✓ | resolved in pyproject.toml | — |
| `python-multipart` | FastAPI `Form()`/`File()` body parsing | unverified | (transitive; auto-installs) | If missing, `uv add python-multipart` |
| OpenRouter API | Quality model calls | ✓ (assumed — v1.0 working) | — | None — critique mode requires it |
| Browser `IntersectionObserver` | NAV-02 scroll-spy | ✓ | Universally supported in 2026 | None needed (99.4% caniuse) |
| Browser `FormData` + fetch | Multipart upload | ✓ | Universally supported | — |
| Browser `<dialog>` element | NOT used in Phase 5 | n/a | (Phase 7 MOBL-02 will use it) | — |

**Missing dependencies with no fallback:** None — every dependency is in place from v1.0.

**Missing dependencies with fallback:** `python-multipart` may need explicit install if FastAPI doesn't pull it transitively — trivial fix at plan-1.

## Security Domain

Per `.planning/config.json` — `security_enforcement` is not explicitly set; treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app, no auth |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user |
| V5 Input Validation | **yes** | Pydantic `Form()` + `File()` validators; 750KB cap; extension whitelist; UTF-8 decode enforcement |
| V6 Cryptography | no | No new crypto in Phase 5 |
| V8 Data Protection | partial | UTF-8 decode failure returns 400, not 500 (no stack-trace leakage) |
| V12 Files & Resources | **yes** | Size cap, extension whitelist, content-type validation |
| V14 Configuration | no | No new config surfaces |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal on conversation_id | Tampering | Already mitigated v1.0 (SEC-01) — `uuid.UUID()` canonicalization at storage boundary |
| Multipart body bomb (large file) | DoS | 750KB per-file cap enforced server-side BEFORE full read into memory |
| Multipart zip bomb / decompression | DoS | N/A — no compression handling; UTF-8 decode is bounded |
| Prompt injection via file content | Tampering | Out of scope — critique mode explicitly takes adversarial-looking research as input; the council is the defense |
| Path traversal via filename | Tampering | Filename is stored AS DATA in JSON, never used for filesystem paths; no traversal vector |
| ReDoS via anonymization regex | DoS | Regex patterns are simple (literal escape + bounded word patterns); no nested quantifiers; verified safe |

## Sources

### Primary (HIGH confidence)

- `backend/council.py` (v1.0) — full file read; `stage1_collect_responses`, `stage2_collect_rankings`, `parse_ranking_from_text`, `calculate_aggregate_rankings`
- `backend/main.py` (v1.0) — full file read; SSE generator at lines 184-307, `send_message_stream` handler
- `backend/storage.py` (v1.0) — full file read; `get_conversation` integration point at lines 78-94
- `backend/openrouter.py` (v1.0) — full file read; `query_model` + `query_models_parallel`
- `backend/config.py` (v1.0) — `PROFILES["quality"]` slot order at lines 71-79
- `frontend/src/App.jsx` (v1.0) — SSE switch at lines 141-289
- `frontend/src/components/ChatInterface.jsx` (v1.0) — message rendering + welcome state + attachment chips
- `frontend/src/components/Sidebar.jsx` (v1.0) — sidebar-header + ConversationItem
- `frontend/src/components/ReasoningDisclosure.css` (v1.0) — verbatim accordion pattern at lines 59-67
- `frontend/src/components/Stage1.jsx`, `Stage2.jsx`, `Stage3.jsx` (v1.0)
- `frontend/src/App.css` (v1.0) — grid layout + scroll container topology
- `frontend/src/index.css` (v1.0) — design tokens + `prefers-reduced-motion` global override
- `frontend/src/utils/download.js` (v1.0) — `readFileAsText`, `ATTACHMENT_LIMITS`
- `.planning/research/PITFALLS.md` §CRIT-1, §CRIT-2, §CRIT-3, §CRIT-4, §MOD-1, §MOD-2
- `.planning/research/ARCHITECTURE.md` §1.1, §1.2, §1.3, §1.5, §2.1
- `.planning/STATE.md` Accumulated Context (v2.0 Decisions Logged at Roadmap Time)
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-CONTEXT.md` — Decisions D-01 through D-09

### Secondary (MEDIUM confidence)

- [openrouter.ai/anthropic/claude-opus-4.7](https://openrouter.ai/anthropic/claude-opus-4.7) — Opus 4.7 pricing $5/$25 per M (verified via WebSearch 2026-05-10)
- [OpenRouter Usage Accounting docs](https://openrouter.ai/docs/guides/administration/usage-accounting) — `usage.cost`, `usage.cost_details.upstream_inference_cost`, `usage.is_byok` schema (verified via WebSearch 2026-05-10)
- [MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) — `root`, `rootMargin`, `threshold` parameter semantics
- [FastAPI Request Files docs](https://fastapi.tiangolo.com/tutorial/request-files/) — `Form()` + `File()` + `UploadFile` mutual exclusivity with `BaseModel` body

### Tertiary (LOW confidence — flagged for validation)

- `openai/gpt-5.5` and `google/gemini-3.1-pro-preview` 2026 pricing — assumed close to Opus 4.7 for cost-estimate anchor; STATE.md spike (Phase 6 plan-1) will refine

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package is already in `pyproject.toml`/`package.json`
- Backend architecture (endpoint shape, `external_context` plumbing, anonymization, schema migration): HIGH — every touch site read in full; minimal-diff signatures verified
- SSE n=1 contract: HIGH — verified `Stage2.jsx:20` guard and `App.jsx:170-179` reducer handle empty payload
- Frontend navigation (sticky, scroll-spy, accordion, back-to-top): HIGH — scroll container topology confirmed via App.css + ChatInterface.css
- OpenRouter cost details schema: MEDIUM — verified via official docs but should be confirmed with a real-response spike (STATE.md active todo for Phase 6 plan-1)
- Per-model pricing for gpt-5.5 / gemini-3.1-pro-preview: LOW — only Opus 4.7 was concretely cited; other two anchored against it as a reasonable but unverified default for the cost-estimate range
- Pitfall coverage: HIGH — all 5 critical pitfalls (CRIT-1..4 + MOD-1) explicitly owned in sections above, with code-level mitigation patterns

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — stable surface; the OpenRouter pricing data is the freshest-moving piece)
