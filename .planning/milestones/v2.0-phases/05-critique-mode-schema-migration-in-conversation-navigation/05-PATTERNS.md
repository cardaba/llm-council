# Phase 5: Critique mode + Schema migration + In-conversation navigation — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 21 (12 backend / frontend modifications + 9 new components / utilities)
**Analogs found:** 21 / 21 (100% coverage — Phase 5 is largely a recombination of v1.0 patterns)

---

## File Classification

### Backend

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|----------------|---------------|
| `backend/main.py` (new route `POST /api/conversations/{id}/critique/stream`) | route handler | event-driven (SSE) + multipart-ingest | `backend/main.py:167-316` (`send_message_stream`) | exact — same SSE generator pattern, only the input shape changes (multipart instead of Pydantic JSON) |
| `backend/main.py` (extend `CreateConversationRequest`) | route handler | request-response | `backend/main.py:29-31` + `:73-78` | exact |
| `backend/main.py` (`_read_and_validate_upload` helper) | utility | transform | none in tree (FastAPI multipart is new) | no analog — model on FastAPI docs (RESEARCH §1.1) |
| `backend/council.py` (extend `stage1_collect_responses`) | service | request-response (parallel fan-out) | `backend/council.py:18-46` (existing `stage1_collect_responses`) | exact — additive `Optional` param, fresh-prompt path unchanged |
| `backend/council.py` (`_build_critique_prompts`, `_query_models_individually`) | service | request-response (per-model fan-out) | `backend/openrouter.py:75-98` (`query_models_parallel`) | role-match — per-model variant of the broadcast pattern |
| `backend/council.py` (extend `stage2_collect_rankings` + anonymization regex) | service | transform → request-response | `backend/council.py:49-128` (existing `stage2_collect_rankings`) | exact |
| `backend/storage.py` (`migrate_message_v1_to_v2`, `_migrate_conversation_if_needed`) | persistence | transform | none in tree (first migration helper) | no analog — pure helper; model on RESEARCH §2.1 |
| `backend/storage.py` (extend `get_conversation` with lazy migration) | persistence | file-I/O | `backend/storage.py:78-94` (existing `get_conversation`) | exact |
| `backend/storage.py` (extend `create_conversation` with `mode`, `schema_version`) | persistence | file-I/O | `backend/storage.py:51-75` (existing `create_conversation`) | exact |
| `backend/storage.py` (extend `add_assistant_message` with `external_research`) | persistence | file-I/O | `backend/storage.py:160-217` (existing `add_assistant_message`) | exact |
| `backend/storage.py` (extend `list_conversations` with `mode` field) | persistence | file-I/O | `backend/storage.py:111-137` (existing `list_conversations`) | exact |
| `backend/openrouter.py` | API client | request-response | n/a — no changes expected | n/a — verified in RESEARCH; broadcast contract stays clean |

### Frontend — Modified

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------|------|-----------|----------------|---------------|
| `frontend/src/components/Sidebar.jsx` (second button + pill) | UI component | event-driven | `frontend/src/components/Sidebar.jsx:273-280` (existing button) + `:117-119` (existing meta line) | exact |
| `frontend/src/components/Sidebar.css` (button gap + pill styles) | styles | n/a | `frontend/src/components/Sidebar.css:28-49` (`.new-conversation-btn`) | exact |
| `frontend/src/App.jsx` (`handleNewCritiqueConversation`, `handleSubmitCritique`, mode-aware welcome routing) | UI component (state owner) | event-driven | `frontend/src/App.jsx:49-60` (`handleNewConversation`) + `:101-299` (`handleSendMessage`) | exact |
| `frontend/src/api.js` (`createConversation` mode param + `sendCritiqueStream`) | API client | request-response (multipart) + streaming (SSE-via-fetch) | `frontend/src/api.js:22-34` (`createConversation`) + `:80-118` (`sendMessageStream`) | exact — same fetch-reader loop; only body builder changes |
| `frontend/src/components/ChatInterface.jsx` (mode branch + sticky stage scaffolding + Back-to-top mount) | UI component | event-driven + scroll | `frontend/src/components/ChatInterface.jsx:131-147` (welcome state) + `:174-277` (messages container) | exact |
| `frontend/src/components/ChatInterface.css` (sticky + scroll-spy CSS) | styles | n/a | `frontend/src/components/Stage1.css:14-21` (`.stage-title`) + `frontend/src/components/ReasoningDisclosure.css:59-67` (grid trick) | role-match (sticky is new pattern; tokens are inherited) |
| `frontend/src/components/Stage1.jsx` (Show-more wrapping per response) | UI component | request-response | `frontend/src/components/ReasoningDisclosure.jsx` (whole file) | exact — same disclosure pattern, different threshold/copy |
| `frontend/src/utils/download.js` (`MAX_CRITIQUE_FILE_BYTES = 750 * 1024`) | utility | n/a | `frontend/src/utils/download.js:5-11` (`MAX_FILE_BYTES`) | exact |

### Frontend — New

| New File | Role | Data Flow | Closest Analog | Match Quality |
|---------|------|-----------|----------------|---------------|
| `frontend/src/components/CritiqueForm.jsx` (welcome state container) | UI component | event-driven | `frontend/src/components/ChatInterface.jsx:131-147` (welcome) + `:280-332` (input form) | role-match — same welcome geometry, different child controls |
| `frontend/src/components/CritiqueForm.css` | styles | n/a | `frontend/src/components/ChatInterface.css:27-67` (welcome) + `:149-340` (input form) | role-match |
| `frontend/src/components/Dropzone.jsx` (single drop-zone slot) | UI component | event-driven (file ingest) | `frontend/src/components/ChatInterface.jsx:55-93` (`handleFilesSelected` + `removeAttachment`) | role-match — same file-read + chip + ✕ pattern, single-file shape |
| `frontend/src/components/ExternalResearchPanel.jsx` (reload-hydration chips) | UI component | request-response | `frontend/src/components/ReasoningDisclosure.jsx` (whole file) | exact — same accordion pattern + identical CSS grid trick |
| `frontend/src/components/ExternalResearchPanel.css` | styles | n/a | `frontend/src/components/ReasoningDisclosure.css:59-77` (grid trick) | exact |
| `frontend/src/components/StageNavigationStrip.jsx` (NAV-02 scroll-spy) | UI component | event-driven (IntersectionObserver) | none in tree (first IO usage) | no analog — model on RESEARCH §5.3 |
| `frontend/src/components/StageNavigationStrip.css` | styles | n/a | `frontend/src/components/Stage1.css:23-58` (tabs) | role-match — same chip / active-state shape, different layout (sticky strip) |
| `frontend/src/components/BackToTopButton.jsx` (NAV-04) | UI component | event-driven (scroll listener) | none in tree (first scroll-listener usage) | no analog — model on RESEARCH §5.5 |
| `frontend/src/components/BackToTopButton.css` | styles | n/a | `frontend/src/components/ChatInterface.css:262-280` (`.download-btn`) | role-match — round button replaces rectangular but tokens identical |
| `frontend/src/utils/critiqueRateLimit.js` (5/hour timestamp-array) | utility | localStorage CRUD | none in tree (first localStorage usage) | no analog — model on RESEARCH §4.3 |

---

## Pattern Assignments

### `backend/main.py` — `POST /api/conversations/{id}/critique/stream` (route handler, SSE)

**Analog:** `backend/main.py:167-316` (`send_message_stream`)

**Imports + handler signature pattern** (lines 1-11, 167-180 of analog):
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
import uuid
import json
import asyncio

from . import storage
from .config import PROFILES
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings

@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    # Check if conversation exists
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
```

**Divergence for critique:** signature uses `Form()` + `File()` + `UploadFile` instead of a `BaseModel` body (FastAPI cannot mix multipart + JSON in one handler). Add new imports: `from fastapi import Form, File, UploadFile`.

**SSE event-generator pattern** (lines 184-307 of analog — copy structure verbatim):
```python
async def event_generator():
    try:
        # Add user message
        storage.add_user_message(conversation_id, request.content)

        # Stage 1: Collect responses
        yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
        stage1_results = await stage1_collect_responses(request.content, council_models)
        yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

        # Stage 2: Collect rankings
        yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
        stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results, council_models)
        aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
        yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

        # Stage 3: Synthesize final answer
        yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
        stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results, chairman_model)
        yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"
        # ... title_complete, message_metadata, complete
    except storage.ConversationNotFoundError:
        yield f"data: {json.dumps({'type': 'error', 'kind': 'not_found', 'message': 'Conversation not found'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

return StreamingResponse(
    event_generator(),
    media_type="text/event-stream",
    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
)
```

**Critique-specific divergence:**
1. Read + validate 3 `UploadFile | None` slots before yielding any SSE event (RESEARCH §1.1). Raise `HTTPException(413/415/400)` for file errors — these become HTTP responses, NOT SSE error events, because they fire before `StreamingResponse` is returned.
2. Build `external_context` dict (model_id → {filename, content, size_bytes}) from active slots (RESEARCH §1.2).
3. Emit pre-flight token cap check (`HTTPException(413)` if estimated > 150K).
4. Pass `external_context` to `stage1_collect_responses` (extended signature — see council.py pattern below).
5. Pass `anonymize_critiques=True` to `stage2_collect_rankings`.
6. For `n=1`: still emit `stage2_start` then `stage2_complete{data: [], metadata: {label_to_model: {}, aggregate_rankings: []}}` — DO NOT skip the events (existing reducer in App.jsx requires the drain).
7. `storage.add_assistant_message(...)` call gains the `external_research=external_context` kwarg.

**Existence-check + UUID-validity pattern** (copy verbatim from lines 173-179 of analog) — reused unchanged.

---

### `backend/main.py` — `_read_and_validate_upload` helper (utility, transform)

**Analog:** none in tree (first FastAPI multipart usage). Model on RESEARCH §1.1 verbatim.

**Pattern (RESEARCH §1.1, locked):**
```python
MAX_CRITIQUE_FILE_BYTES = 750 * 1024  # 750KB cap, locked in CONTEXT.md D-04

async def _read_and_validate_upload(upload: UploadFile | None) -> dict | None:
    if upload is None:
        return None
    content_bytes = await upload.read()
    size = len(content_bytes)
    if size > MAX_CRITIQUE_FILE_BYTES:
        raise HTTPException(status_code=413, detail=f"File '{upload.filename}' is {size} bytes; max is {MAX_CRITIQUE_FILE_BYTES}")
    name = (upload.filename or "").lower()
    if not (name.endswith(".md") or name.endswith(".txt")):
        raise HTTPException(status_code=415, detail=f"File '{upload.filename}' must be .md or .txt")
    try:
        text = content_bytes.decode("utf-8-sig")  # strips BOM
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return {"filename": upload.filename, "content": text, "size_bytes": size}
```

**Co-locate** with the new `critique_stream` handler in `backend/main.py` (single file). No new module.

---

### `backend/council.py` — `stage1_collect_responses` extension (service, fan-out)

**Analog:** `backend/council.py:18-46` (existing `stage1_collect_responses`)

**Existing pattern (lines 18-46) — copy unchanged for the `external_context is None` branch:**
```python
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
) -> List[Dict[str, Any]]:
    messages = [{"role": "user", "content": user_query}]
    responses = await query_models_parallel(council_models, messages)
    stage1_results = []
    for model, response in responses.items():
        if response is not None:  # Only include successful responses
            stage1_results.append({
                "model": model,
                "response": response.get('content', '')
            })
    return stage1_results
```

**Divergence — additive `Optional` param + branch (RESEARCH §1.3):**
```python
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
    external_context: Optional[Dict[str, Dict[str, Any]]] = None,  # NEW
) -> List[Dict[str, Any]]:
    if external_context is None:
        # Existing path — unchanged broadcast (lines 32-35 above)
        messages = [{"role": "user", "content": user_query}]
        responses = await query_models_parallel(council_models, messages)
    else:
        # Critique path — per-model prompts (each marks its own file [YOUR PRIOR WORK])
        messages_per_model = _build_critique_prompts(user_query, external_context, council_models)
        responses = await _query_models_individually(council_models, messages_per_model)
    # ... response-formatting loop unchanged
```

**Type imports needed:** add `Optional` to existing `from typing import List, Dict, Any, Tuple` (line 12).

---

### `backend/council.py` — `_query_models_individually` helper (service, fan-out)

**Analog:** `backend/openrouter.py:75-98` (`query_models_parallel`)

**Reference pattern (lines 89-98 of analog):**
```python
async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    import asyncio
    tasks = [query_model(model, messages) for model in models]
    responses = await asyncio.gather(*tasks)
    return {model: response for model, response in zip(models, responses)}
```

**Divergence — per-model messages (each model gets DIFFERENT prompt):**
```python
async def _query_models_individually(
    models: List[str],
    messages_per_model: Dict[str, List[Dict[str, str]]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    import asyncio
    tasks = [query_model(model, messages_per_model[model]) for model in models]
    responses = await asyncio.gather(*tasks)
    return {model: response for model, response in zip(models, responses)}
```

**Co-locate** in `backend/council.py` (per CLAUDE.md / PROJECT.md "no new strategy module for critique"). The broadcast pattern stays in `openrouter.py`; the per-model variant lives next to its only caller.

---

### `backend/council.py` — anonymization regex pass in `stage2_collect_rankings` (service, transform)

**Analog:** `backend/council.py:49-128` (existing `stage2_collect_rankings`)

**Existing concatenation pattern (lines 65-78) — extend at the top with anonymization:**
```python
async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: List[str],
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...
    label_to_model = {
        f"Response {label}": result['model']
        for label, result in zip(labels, stage1_results)
    }
    responses_text = "\n\n".join([
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    ])
```

**Divergence — add `anonymize_critiques: bool = False` param + pre-concat regex pass (RESEARCH §1.5 + D-08/D-09):**
```python
# Module-level — precompiled once at import (RESEARCH §1.5)
import re
from typing import Pattern

_MODEL_ID_PATTERNS: List[Pattern] = [
    re.compile(re.escape(m_id), re.IGNORECASE)
    for m_id in PROFILES["quality"]["council_models"]
]
_SELF_REF_PATTERNS: List[Pattern] = [
    re.compile(r"\bAs Claude\b", re.IGNORECASE),
    re.compile(r"\bI am (Claude|GPT|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bI, (GPT|Claude|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bas an AI assistant from (Anthropic|OpenAI|Google)\b", re.IGNORECASE),
]

def _anonymize_critique_text(text: str, slot_index: int) -> str:
    result = text
    author_label = f"Author {slot_index + 1}"
    for pattern in _MODEL_ID_PATTERNS:
        result = pattern.sub(author_label, result)
    for pattern in _SELF_REF_PATTERNS:
        result = pattern.sub("[author redacted]", result)
    return result

# Inside stage2_collect_rankings — at the very top (before label assignment):
if anonymize_critiques:
    # Operate on a COPY so persisted Stage 1 (Stage1.jsx tab) is NOT anonymized
    stage1_results = [
        {**r, "response": _anonymize_critique_text(r["response"], i)}
        for i, r in enumerate(stage1_results)
    ]
```

**Critical:** the copy-not-mutate idiom (`{**r, ...}`) is the existing v1 pattern (App.jsx uses spread for same reason at lines 144, 153, 163). Persisted `stage1_results` flow into both Stage 1 tab (un-anonymized, full text) and Stage 2 prompt (anonymized + truncated).

---

### `backend/storage.py` — `migrate_message_v1_to_v2` + `_migrate_conversation_if_needed` (persistence, transform)

**Analog:** none in tree (first migration helper). Model on RESEARCH §2.1.

**Pattern (RESEARCH §2.1):**
```python
SCHEMA_VERSION_V2 = 2

def migrate_message_v1_to_v2(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotent migration of a single message dict from v1 to v2 shape."""
    if msg.get("role") != "assistant":
        return msg
    migrated = dict(msg)
    migrated.setdefault("metadata", {})
    return migrated

def _migrate_conversation_if_needed(conv: Dict[str, Any]) -> Dict[str, Any]:
    """Apply v1→v2 migration lazily on read. Idempotent."""
    if conv.get("schema_version") == SCHEMA_VERSION_V2:
        return conv
    conv = dict(conv)
    conv["schema_version"] = SCHEMA_VERSION_V2
    conv.setdefault("mode", "fresh")
    conv["messages"] = [migrate_message_v1_to_v2(m) for m in conv.get("messages", [])]
    return conv
```

**Idempotency property — the highest-value test in the milestone (per STATE.md + PITFALLS §CRIT-3).** Phase 7 owns the test file; Phase 5 owns the production code.

---

### `backend/storage.py` — `get_conversation` lazy-migration integration (persistence, file-I/O)

**Analog:** `backend/storage.py:78-94` (existing `get_conversation`)

**Existing pattern (lines 78-94):**
```python
def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    path = get_conversation_path(conversation_id)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return json.load(f)
```

**Divergence — single-line addition at the bottom (RESEARCH §2.2):**
```python
def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    path = get_conversation_path(conversation_id)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        conv = json.load(f)
    return _migrate_conversation_if_needed(conv)  # NEW — lazy migration; no eager write-back
```

**Lazy forever** — no `save_conversation` after read (CONTEXT.md Claude's Discretion). The migrated dict stays on disk as v1 until the user sends a new message in that conversation, at which point `save_conversation` persists the now-v2 shape.

---

### `backend/storage.py` — `create_conversation` extension (persistence, file-I/O)

**Analog:** `backend/storage.py:51-75` (existing `create_conversation`)

**Existing pattern (lines 51-75):**
```python
def create_conversation(conversation_id: str) -> Dict[str, Any]:
    ensure_data_dir()
    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)
    return conversation
```

**Divergence (RESEARCH §2.2) — add `mode` kwarg + stamp `schema_version`:**
```python
def create_conversation(
    conversation_id: str,
    mode: Literal["fresh", "critique"] = "fresh",  # NEW — default keeps v1 callers green
) -> Dict[str, Any]:
    ensure_data_dir()
    conversation = {
        "id": conversation_id,
        "schema_version": SCHEMA_VERSION_V2,  # NEW
        "mode": mode,                          # NEW
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }
    # ... rest unchanged
```

**Type import:** add `Literal` to existing `from typing import List, Dict, Any, Optional`.

---

### `backend/storage.py` — `add_assistant_message` extension (persistence, file-I/O)

**Analog:** `backend/storage.py:160-217` (existing `add_assistant_message`)

**Existing optional-kwarg pattern (lines 160-217) — already handles `metadata` and `stage4` opaquely:**
```python
def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
    stage4: Optional[Dict[str, Any]] = None,
):
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ConversationNotFoundError(conversation_id)
    message = {
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
    }
    if metadata is not None:
        message["metadata"] = metadata
    if stage4 is not None:
        message["stage4"] = stage4
    conversation["messages"].append(message)
    save_conversation(conversation)
```

**Divergence (RESEARCH §2.2) — append `external_research` opt kwarg following the same idiom:**
```python
    external_research: Optional[Dict[str, Dict[str, Any]]] = None,  # NEW
):
    # ... existing body
    if external_research is not None:
        message["external_research"] = external_research
```

---

### `backend/storage.py` — `list_conversations` `mode` field (persistence, file-I/O)

**Analog:** `backend/storage.py:111-137` (existing `list_conversations`)

**Existing pattern (lines 124-132):**
```python
conversations.append({
    "id": data["id"],
    "created_at": data["created_at"],
    "title": data.get("title", "New Conversation"),
    "message_count": len(data["messages"])
})
```

**Divergence — single-line addition (RESEARCH §6.1):**
```python
conversations.append({
    "id": data["id"],
    "created_at": data["created_at"],
    "title": data.get("title", "New Conversation"),
    "message_count": len(data["messages"]),
    "mode": data.get("mode", "fresh"),  # NEW — drives D-03 sidebar pill
})
```

**Note:** v1 files lack `mode`; `.get("mode", "fresh")` defaults correctly. This works because pre-v2 conversations are all fresh-prompt by definition.

---

### `frontend/src/components/Sidebar.jsx` — second button + pill (UI component)

**Analog (button):** `frontend/src/components/Sidebar.jsx:273-280` + Sidebar.css `.new-conversation-btn`

**Existing pattern (lines 273-280):**
```jsx
<div className="sidebar-header">
  <h1>LLM Council</h1>
  <button className="new-conversation-btn" onClick={onNewConversation}>
    + New Conversation
  </button>
</div>
```

**Divergence (RESEARCH §6.1, D-01 lock) — append sibling button using the same class:**
```jsx
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

**Props extension:** the existing `Sidebar({...onNewConversation,...})` signature (line 143) gains `onNewCritiqueConversation`.

**Analog (pill):** `frontend/src/components/Sidebar.jsx:117-119` (existing `.conversation-meta`)

**Existing pattern (lines 117-119):**
```jsx
<div className="conversation-meta">
  {conv.message_count} messages
</div>
```

**Divergence (D-03 lock) — render pill inline only when mode is critique:**
```jsx
<div className="conversation-meta">
  {conv.message_count} messages
  {conv.mode === 'critique' && <span className="conversation-pill">Critique</span>}
</div>
```

---

### `frontend/src/components/Sidebar.css` — gap + pill styles (styles)

**Analog:** `frontend/src/components/Sidebar.css:28-49` (`.new-conversation-btn`) — keep entirely unchanged

**Add (RESEARCH §6.1):**
```css
/* Adjacent-sibling rule — only fires for the SECOND button. Token-only gap. */
.sidebar-header > .new-conversation-btn + .new-conversation-btn {
  margin-top: var(--space-2);  /* D-01 lock */
}

/* Critique pill — UI-SPEC §Color line 89 (`--color-accent-soft` background)
   + §Typography line 66 (`--font-size-microcopy`). */
.conversation-pill {
  margin-left: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--font-size-microcopy);
  background: var(--color-accent-soft);
  color: var(--color-fg-secondary);
  border-radius: var(--radius-sm);
  vertical-align: baseline;
}
```

---

### `frontend/src/App.jsx` — mode dispatch + `handleSubmitCritique` (state owner)

**Analog (handler):** `frontend/src/App.jsx:49-60` (`handleNewConversation`)

**Existing pattern (lines 49-60):**
```jsx
const handleNewConversation = async () => {
  try {
    const newConv = await api.createConversation();
    setConversations([
      { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
      ...conversations,
    ]);
    setCurrentConversationId(newConv.id);
  } catch (error) {
    console.error('Failed to create conversation:', error);
  }
};
```

**Divergence — add critique sibling that passes `mode: 'critique'`:**
```jsx
const handleNewCritiqueConversation = async () => {
  try {
    const newConv = await api.createConversation('critique');  // NEW — mode arg
    setConversations([
      { id: newConv.id, created_at: newConv.created_at, message_count: 0, mode: 'critique' },
      ...conversations,
    ]);
    setCurrentConversationId(newConv.id);
  } catch (error) {
    console.error('Failed to create critique conversation:', error);
  }
};
```

**Analog (SSE dispatch):** `frontend/src/App.jsx:101-299` (`handleSendMessage`) — copy entire reducer pattern verbatim. Same `setCurrentConversation((prev) => { const messages = [...prev.messages]; const lastMsg = messages[messages.length - 1]; lastMsg.stageN = event.data; ... })` idiom for every event type. The new `handleSubmitCritique` calls `api.sendCritiqueStream(...)` instead of `api.sendMessageStream(...)` but routes events through the **same switch statement**. Critical: the SSE contract is identical (RESEARCH §1.2 — empty `stage2_complete` for n=1 drains the existing reducer at lines 170-179).

**Pass-through to ChatInterface:** the existing prop `onSendMessage` stays for fresh-prompt; add `onSubmitCritique` as a sibling prop. ChatInterface branches by `conversation.mode`.

---

### `frontend/src/api.js` — `createConversation(mode)` + `sendCritiqueStream` (API client)

**Analog (createConversation):** `frontend/src/api.js:22-34`

**Existing pattern (lines 22-34):**
```js
async createConversation() {
  const response = await fetch(`${API_BASE}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error('Failed to create conversation');
  }
  return response.json();
},
```

**Divergence — accept optional `mode` arg, ship in body:**
```js
async createConversation(mode = 'fresh') {
  const response = await fetch(`${API_BASE}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
},
```

**Analog (sendCritiqueStream):** `frontend/src/api.js:80-118` (`sendMessageStream`) — the SSE-via-fetch reader loop is verified at RESEARCH §6.3.

**Existing reader loop (lines 96-118 — copy unchanged for the new method):**
```js
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      try {
        const event = JSON.parse(data);
        onEvent(event.type, event);
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    }
  }
}
```

**Divergence — body builder uses `FormData` instead of JSON; DO NOT set Content-Type (RESEARCH §6.3, hard rule):**
```js
async sendCritiqueStream(conversationId, critiqueInstruction, slots, onEvent) {
  const form = new FormData();
  form.append('critique_instruction', critiqueInstruction);
  slots.forEach((slot, i) => {
    if (slot?.file) form.append(`file_slot_${i}`, slot.file, slot.file.name);
  });
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/critique/stream`,
    { method: 'POST', body: form }   // NO 'Content-Type' header — browser writes the multipart boundary
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: 'Failed' }));
    throw new Error(detail.detail || 'Failed to send critique');
  }
  // ... reader loop identical to sendMessageStream above
}
```

---

### `frontend/src/components/CritiqueForm.jsx` (NEW — welcome state container)

**Analog (welcome geometry):** `frontend/src/components/ChatInterface.jsx:131-147`

**Existing welcome (lines 131-147):**
```jsx
if (!conversation) {
  return (
    <div className="chat-interface">
      <div className="chat-interface__welcome">
        <h1 className="chat-interface__welcome-title">What do you want to think about today?</h1>
        <p className="chat-interface__welcome-lead">
          Ask one question. Three models answer. They peer-review each other's work anonymously. A chairman synthesizes.
        </p>
        <ul className="chat-interface__welcome-examples">...</ul>
      </div>
    </div>
  );
}
```

**Divergence — render 3 dropzones + textarea + cost line + Submit (UI-SPEC §Component Inventory + §Copywriting Contract). Reuse `.chat-interface__welcome` geometry tokens for muscle-memory match.**

**Analog (form layout):** `frontend/src/components/ChatInterface.jsx:280-332` (input form) — Submit-disabled idiom reused:
```jsx
<button
  type="submit"
  className="send-button"
  disabled={!input.trim() || isLoading}
>
  Send
</button>
```

**Critique-specific submit-eligibility (UI-SPEC §Interaction Contracts table) — extend the existing pattern:**
```jsx
const canSubmit = slots.some((s) => s !== null) && instruction.trim().length > 0 && !isLoading;
<button type="submit" className="send-button" disabled={!canSubmit}>Submit critique</button>
```

---

### `frontend/src/components/Dropzone.jsx` (NEW — single drop-zone slot)

**Analog:** `frontend/src/components/ChatInterface.jsx:55-93` (`handleFilesSelected` + `removeAttachment` + chip)

**Existing file-read pattern (lines 55-88):**
```jsx
const handleFilesSelected = async (e) => {
  setAttachError(null);
  const picked = Array.from(e.target.files || []);
  if (!picked.length) return;
  const next = [...attachments];
  for (const file of picked) {
    if (file.size > ATTACHMENT_LIMITS.perFile) {
      setAttachError(`"${file.name}" exceeds per-file limit (${formatBytes(file.size)} > ${formatBytes(ATTACHMENT_LIMITS.perFile)})`);
      continue;
    }
    try {
      const content = await readFileAsText(file);
      next.push({ name: file.name, size: file.size, content });
    } catch (err) {
      setAttachError(`Failed to read "${file.name}": ${err.message}`);
    }
  }
  setAttachments(next);
  if (fileInputRef.current) fileInputRef.current.value = '';
};
```

**Existing chip pattern (lines 282-300):**
```jsx
<span className="attachment-chip">
  <span className="attachment-name">{att.name}</span>
  <span className="attachment-size">{formatBytes(att.size)}</span>
  <button
    type="button"
    className="attachment-remove"
    onClick={() => removeAttachment(idx)}
    aria-label={`Remove ${att.name}`}
  >
    ×
  </button>
</span>
```

**Divergence (D-04 / D-06 / RESEARCH §6.5):**
1. **Single-file slot, not multi-attachment list** — `slot: {file, name, size, content} | null` instead of an array.
2. **Add drag-and-drop handlers** — `onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}`, `onDrop={(e) => { e.preventDefault(); handleAddFile(e.dataTransfer.files[0]); }}`. The empty `<input type="file" accept=".md,.txt">` stays for click fallback.
3. **Cap is 750KB, not 500KB** — read from a NEW constant `MAX_CRITIQUE_FILE_BYTES = 750 * 1024` in `download.js` (DO NOT regress `MAX_FILE_BYTES = 500 * 1024`).
4. **Empty-state copy + chip format** locked verbatim in UI-SPEC §Copywriting Contract:
   - Empty: `Drop deep research here, or click to upload (.md / .txt, max 750KB)`
   - Loaded: `✅ {filename}  {size_kb} KB  ✕`
5. **CRLF normalization + BOM strip** client-side (RESEARCH §6.5).

---

### `frontend/src/components/ExternalResearchPanel.jsx` (NEW — reload-hydration chips)

**Analog:** `frontend/src/components/ReasoningDisclosure.jsx` (whole file) + `ReasoningDisclosure.css:59-67` (grid trick)

**Existing accordion pattern (ReasoningDisclosure.jsx:39-61):**
```jsx
return (
  <div className="reasoning-disclosure">
    <button
      type="button"
      className="reasoning-toggle"
      onClick={() => setExpanded((e) => !e)}
      aria-expanded={expanded}
    >
      {expanded ? '▼ Hide reasoning' : '▶ Show reasoning'}
    </button>
    {expanded && (
      <div className="reasoning-body">
        {renderable.map((d, i) => (
          <div key={i} className="reasoning-block markdown-content">
            <Markdown>{d.type === 'reasoning.summary' ? d.summary || '' : d.text || ''}</Markdown>
          </div>
        ))}
      </div>
    )}
  </div>
);
```

**Existing CSS grid trick (ReasoningDisclosure.css:59-71) — copy verbatim, rename class:**
```css
.reasoning-disclosure__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.reasoning-disclosure__panel[data-open="true"],
.reasoning-disclosure[data-open="true"] .reasoning-disclosure__panel {
  grid-template-rows: 1fr;
}
.reasoning-disclosure__panel-inner {
  overflow: hidden;
  min-height: 0;
}
```

**Divergence (RESEARCH §3.2):**
1. **Iterate over `Object.entries(externalResearch)`** instead of one toggle — render N chips (1..3).
2. **Chip header text format (UI-SPEC §Copywriting line 152):**
   ```jsx
   <span className="research-chip__model">{modelId}</span>          {/* JetBrains Mono */}
   <span className="research-chip__filename">{fileObj.filename}</span>
   <span className="research-chip__size">{formatBytes(fileObj.size_bytes)}</span>
   ```
3. **Chevron `⌄` / `⌃`** (UI-SPEC) instead of ReasoningDisclosure's `▶ / ▼`.
4. **Each chip independent** (multiple can be expanded — UI-SPEC §Interaction line 261).
5. **Mount above the assistant message** in ChatInterface — sibling to `<MessageHeader>`.

---

### `frontend/src/components/Stage1.jsx` — Show-more wrapping (NAV-03)

**Analog:** `frontend/src/components/ReasoningDisclosure.jsx` (whole file) + `frontend/src/components/Stage1.jsx:45-52` (existing tab-content)

**Existing Stage1 tab-content (lines 45-52):**
```jsx
<div className="tab-content">
  <div className="model-name">{responses[activeTab].model}</div>
  <div className="response-text markdown-content">
    <Markdown>{responses[activeTab].response}</Markdown>
  </div>
  <ReasoningDisclosure details={responses[activeTab].reasoning_details} />
</div>
```

**Divergence (RESEARCH §5.4 — Option A "JS measure on mount, conditionally render toggle"):**
Wrap the markdown content in a conditional collapsible div whose collapse state is driven by `useRef + scrollHeight > 600`. Reuse the same grid trick as ReasoningDisclosure:
```jsx
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
        {open ? 'Show less ⌃' : 'Show more ⌄'}
      </button>
    </div>
  );
}
```

**`defaultCollapsed` semantics (RESEARCH §5.4 + UI-SPEC §Stage 1 collapse):** `defaultCollapsed={Boolean(msg.stage3)}` — true on historical reload (Stage 3 already there), false during live streaming.

---

### `frontend/src/components/StageNavigationStrip.jsx` (NEW — NAV-02 scroll-spy)

**Analog (chip styling):** `frontend/src/components/Stage1.css:23-58` (`.tabs` + `.tab` + `.tab.active`)

**Existing chip + active-state pattern (Stage1.css:31-53):**
```css
.tab {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-fg-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--font-size-label);
  font-weight: 500;
  transition: color var(--motion-duration-base) var(--motion-easing-out),
              border-color var(--motion-duration-base) var(--motion-easing-out);
}
.tab.active {
  color: var(--color-fg-primary);
  border-bottom: 2px solid var(--color-accent);
  font-weight: 600;
}
```

**Divergence — sticky strip + IntersectionObserver-driven active state (RESEARCH §5.3, no in-tree analog):**
```css
.stage-nav-strip {
  position: sticky;
  top: 0;
  z-index: 3;
  height: var(--space-7);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  /* mobile horizontal-scroll fallback per UI-SPEC mobile contract */
  overflow-x: auto;
}
/* active chip — UI-SPEC §Color line 102 */
.stage-nav-strip__chip.active {
  border-bottom: 2px solid var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
}
```

**Critical (RESEARCH §5.3 + Pitfall):** `IntersectionObserver` MUST use `root: document.querySelector('.messages-container')`, NOT default `null` (viewport). Stage sections marked with `data-stage="stage1|stage2|stage3|stage4"`.

---

### `frontend/src/components/BackToTopButton.jsx` (NEW — NAV-04)

**Analog (button style):** `frontend/src/components/ChatInterface.css:262-280` (`.download-btn`)

**Existing button-with-token-styling pattern:**
```css
.assistant-header .download-btn {
  background: var(--color-bg-elevated);
  color: var(--color-accent);
  border: 1px solid var(--color-border-subtle);
  font-family: var(--font-sans);
  font-size: var(--font-size-label);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--motion-duration-base) var(--motion-easing-out),
              color var(--motion-duration-base) var(--motion-easing-out);
}
```

**Divergence — round, fixed/absolute-positioned, scroll-listener-gated (RESEARCH §5.5):**
```jsx
function BackToTopButton({ scrollContainerRef }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 800);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);
  if (!visible) return null;
  const handleClick = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };
  return (
    <button type="button" className="back-to-top" onClick={handleClick} aria-label="Back to top">↑</button>
  );
}
```

**CSS — round button, 44x44 touch-target floor (UI-SPEC §Component Inventory):**
```css
.back-to-top {
  position: absolute;
  bottom: var(--space-5);
  right: var(--space-5);
  width: var(--space-7);                    /* 48px ≥ 44px touch floor */
  height: var(--space-7);
  border-radius: 50%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-sm);
  z-index: 4;
  cursor: pointer;
}
```

**Critical (Pitfall + RESEARCH §5.5):** `scrollTo({behavior:'smooth'})` does NOT auto-honor `prefers-reduced-motion` in Safari. Use `matchMedia` per-call.

---

### `frontend/src/utils/critiqueRateLimit.js` (NEW — soft 5/hour rate-limit)

**Analog:** none in tree (first localStorage usage). Model on RESEARCH §4.3.

**Pattern (RESEARCH §4.3 — timestamp-array, NOT counter+reset):**
```js
const STORAGE_KEY = 'critique-run-timestamps';
const WINDOW_MS = 60 * 60 * 1000;
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
    return 0;
  }
}

export function recordCritiqueRun() { /* push Date.now(), filter, save */ }
export function shouldReconfirm() { return getRecentRunCount() >= LIMIT; }
```

---

### `frontend/src/utils/download.js` — `MAX_CRITIQUE_FILE_BYTES` (utility)

**Analog:** `frontend/src/utils/download.js:5-11`

**Existing pattern (lines 5-11):**
```js
const MAX_FILE_BYTES = 500 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

export const ATTACHMENT_LIMITS = {
  perFile: MAX_FILE_BYTES,
  total: MAX_TOTAL_BYTES,
};
```

**Divergence — add a new sibling constant (DO NOT raise the existing 500KB cap; CRIT-04 is locked to fresh-prompt flow):**
```js
export const MAX_CRITIQUE_FILE_BYTES = 750 * 1024;  // 750KB cap per critique slot — CONTEXT.md D-04
```

`readFileAsText` (lines 194-201) is reused unchanged.

---

## Shared Patterns

### Authentication / Authorization
**Source:** none (single-user local app, bound to 127.0.0.1, no auth — declared in CLAUDE.md project §"Constraints"). No middleware, no guards.
**Apply to:** all new endpoints inherit "no auth" by default. The `_read_and_validate_upload` helper IS the authoritative input boundary.

### Error Handling — backend
**Source:** `backend/main.py:84-89` (existing UUID-validity + 404 pattern)
```python
try:
    conversation = storage.get_conversation(conversation_id)
except ValueError:
    raise HTTPException(status_code=400, detail="Invalid conversation ID")
if conversation is None:
    raise HTTPException(status_code=404, detail="Conversation not found")
```
**Apply to:** `critique_stream` route — copy verbatim before reading uploads.

**Source:** `backend/main.py:303-307` (SSE error event idiom)
```python
except storage.ConversationNotFoundError:
    yield f"data: {json.dumps({'type': 'error', 'kind': 'not_found', 'message': 'Conversation not found'})}\n\n"
except Exception as e:
    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
```
**Apply to:** the new SSE generator. Inline the same try/except wrapper around the entire generator body.

**Source:** `backend/openrouter.py:70-72` (graceful degradation — return None on per-model failure)
```python
except Exception as e:
    print(f"Error querying model {model}: {e}")
    return None
```
**Apply to:** `_query_models_individually` — same idiom; callers in `stage1_collect_responses` already filter `None` (line 40).

### Error Handling — frontend
**Source:** `frontend/src/components/ChatInterface.jsx:64-75` (inline error banner pattern)
```jsx
if (file.size > ATTACHMENT_LIMITS.perFile) {
  setAttachError(`"${file.name}" exceeds per-file limit (...)`);
  continue;
}
// ... rendered as:
{attachError && <div className="attachment-error">{attachError}</div>}
```
**Apply to:** Dropzone slot errors (file too large, wrong extension), CritiqueForm submit errors (token cap). Same `--color-error` token, same inline-microcopy idiom.

**Source:** `frontend/src/App.jsx:259-284` (SSE `error` event handler)
**Apply to:** `handleSubmitCritique` reuses the SAME error reducer — no new branch needed.

### State Mutation Idiom (immutable spread)
**Source:** `frontend/src/App.jsx:142-178` (every SSE callback uses `[...prev.messages]` then mutates `lastMsg.stageN`)
```jsx
setCurrentConversation((prev) => {
  const messages = [...prev.messages];
  const lastMsg = messages[messages.length - 1];
  lastMsg.stage1 = event.data;
  lastMsg.loading.stage1 = false;
  return { ...prev, messages };
});
```
**Apply to:** All new SSE branches in `handleSubmitCritique`. The same reducer drains n=1/2/3 critique flows because the SSE contract is identical (RESEARCH §1.2).

### Markdown Rendering Wrapper
**Source:** `frontend/src/components/Stage1.jsx:47-49` + global `.markdown-content` rules in `index.css`
```jsx
<div className="response-text markdown-content">
  <Markdown>{resp.response}</Markdown>
</div>
```
**Apply to:** ExternalResearchPanel chip-expanded body, Stage1 Show-more wrapper inner. Every `<Markdown>` consumer MUST wrap in `<div className="markdown-content">`.

### CSS-Only Accordion (grid trick)
**Source:** `frontend/src/components/ReasoningDisclosure.css:59-71`
```css
.panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.panel[data-open="true"] { grid-template-rows: 1fr; }
.panel-inner { overflow: hidden; min-height: 0; }
```
**Apply to:**
1. `ExternalResearchPanel` chip body (CRIT-08).
2. `Stage1` Show-more wrapper (NAV-03).

`prefers-reduced-motion` handled globally by `index.css:178-189` (verified by RESEARCH §3.2).

### Validation
**Backend source:** `backend/main.py:34-37` (Pydantic field validation)
```python
class SendMessageRequest(BaseModel):
    content: str
    profile: Literal["fast", "quality", "quality_research"] = "fast"
```
**Apply to:** `CreateConversationRequest` extension — `mode: Literal["fresh", "critique"] = "fresh"`.

**Multipart:** Pydantic does NOT compose with `UploadFile`; size + extension validation lives inside `_read_and_validate_upload` (RESEARCH §1.1).

**Frontend source:** `frontend/src/components/ChatInterface.jsx:97` (whitespace-trim on submit)
```jsx
if (input.trim() && !isLoading) { ... }
```
**Apply to:** CritiqueForm submit-eligibility (textarea required, whitespace-trimmed).

### Token-Only Styling (project-wide invariant)
**Source:** `frontend/src/index.css` (var(--color-*), var(--space-*), var(--font-*) — single source of truth declared in CLAUDE.md "Constraints" + UI-SPEC §Design System)
**Apply to:** every new CSS rule. Zero hardcoded hex / px values, except the four declared exceptions in UI-SPEC §Spacing Scale (drop-zone 120px height, NAV-03 600px collapse threshold, NAV-04 800px scroll trigger, 44px touch-target floor).

### BYOK Routing (do not regress)
**Source:** `backend/config.py:31-43` (`get_provider_for_model`) + `backend/openrouter.py:43-45`
```python
provider = get_provider_for_model(model)
if provider is not None:
    payload["provider"] = {"only": [provider]}
```
**Apply to:** Critique flow uses `query_model` via `_query_models_individually`, which inherits BYOK routing automatically. No code changes needed — this is a constraint to respect, not a pattern to copy.

### SSE Event Contract (preserved)
**Source:** `backend/main.py:255-301` (event order + payload shape) → `frontend/src/App.jsx:140-289` (reducer)
**Apply to:** Critique stream emits the SAME 7-event sequence (`stage1_start` → `stage1_complete` → `stage2_start` → `stage2_complete` → `stage3_start` → `stage3_complete` → `complete`), plus `title_complete` + `message_metadata`. The n=1 case emits `stage2_complete{data: [], metadata: {label_to_model: {}, aggregate_rankings: []}}` — guaranteed to drain the existing reducer at App.jsx:170-179 with zero frontend changes. Stage2.jsx already guards `if (!rankings || rankings.length === 0) return null` (line 21) — empty list renders nothing.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/main.py:_read_and_validate_upload` | utility | transform | First FastAPI multipart usage in the project. Model on FastAPI docs verbatim (RESEARCH §1.1). |
| `backend/storage.py:migrate_message_v1_to_v2` + `_migrate_conversation_if_needed` | persistence | transform | First schema-migration helper. Pattern locked in RESEARCH §2.1. |
| `frontend/src/components/StageNavigationStrip.jsx` | UI component | event-driven (IntersectionObserver) | First IntersectionObserver in the project. Model on RESEARCH §5.3 (config: `root: .messages-container`, `rootMargin: '-48px 0px -50% 0px'`, `threshold: [0, 0.25, 0.5, 0.75, 1.0]`). |
| `frontend/src/components/BackToTopButton.jsx` | UI component | event-driven (scroll listener) | First scroll-listener handler in the project. Model on RESEARCH §5.5 (passive listener + per-call matchMedia for reduced motion). |
| `frontend/src/utils/critiqueRateLimit.js` | utility | localStorage CRUD | First localStorage usage in the project. Model on RESEARCH §4.3 (timestamp-array). |

For these 5 files, the planner should reference RESEARCH.md sections directly rather than an in-tree analog. All five patterns are well-specified in RESEARCH.md with verbatim code excerpts.

---

## Metadata

**Analog search scope:**
- Backend: `backend/*.py` (5 files: config, council, openrouter, storage, main)
- Frontend components: `frontend/src/components/*.{jsx,css}` (verified Sidebar, ChatInterface, Stage1, Stage2, Stage3, ReasoningDisclosure, MessageHeader, Modal, Menu)
- Frontend utilities: `frontend/src/utils/*.js` (verified download.js)
- Frontend root: `frontend/src/{App.jsx, App.css, api.js, index.css}`

**Files scanned (full read):** 14
**Files scanned (targeted read):** 4 (RESEARCH.md in 3 ranges + Stage2.jsx prefix + Stage1.css + openrouter.py)
**Pattern extraction date:** 2026-05-10

**Coverage by tier:**
- Backend modifications (4 files): 4/4 exact analogs
- Backend new (3 helpers in existing files): 1/3 exact analog (anonymization regex pass), 2/3 modeled on RESEARCH (multipart, schema migration)
- Frontend modifications (8 files): 8/8 exact analogs
- Frontend new (10 files): 5/10 exact analogs (CritiqueForm, Dropzone, ExternalResearchPanel, BackToTopButton style, critique CSS), 5/10 modeled on RESEARCH (StageNavigationStrip, BackToTopButton handler, critiqueRateLimit, plus the inner mechanics — IntersectionObserver, scroll listener, localStorage CRUD)

**Phase 5 is high-confidence:** every backend extension point already exists in a shape that accepts the new dimensions without a refactor (`add_assistant_message` opaque metadata dict, `stage1_collect_responses` parametrizable, SSE protocol discriminated by `type`, `PROFILES["quality"]` is the slot-order single source of truth, `ConversationNotFoundError` distinct from `ValueError`, ReasoningDisclosure ships the grid-template-rows accordion). Most "new" components are recombinations of v1.0 patterns with tightened copy.
