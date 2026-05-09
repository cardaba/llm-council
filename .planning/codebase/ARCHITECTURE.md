<!-- refreshed: 2026-05-09 -->
# Architecture

**Analysis Date:** 2026-05-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite :5173)                    │
│                      frontend/src/App.jsx                           │
├─────────────────┬───────────────────────────────────────────────────┤
│  Sidebar.jsx    │              ChatInterface.jsx                     │
│  Conversation   │   Stage1.jsx │ Stage2.jsx │ Stage3.jsx             │
│  list & create  │   (tab view) │ (tab+agg)  │ (chairman)            │
└────────┬────────┴──────────────────────────────────────────────────-┘
         │  HTTP REST + SSE (fetch / ReadableStream)
         │  API_BASE = http://localhost:8001
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│               FastAPI App  backend/main.py                          │
│  GET  /api/conversations                                            │
│  POST /api/conversations                                            │
│  GET  /api/conversations/{id}                                       │
│  POST /api/conversations/{id}/message          (batch)              │
│  POST /api/conversations/{id}/message/stream   (SSE)               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ await
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Council Orchestration  backend/council.py              │
│  stage1_collect_responses()   — asyncio.gather all models          │
│  stage2_collect_rankings()    — anonymize → asyncio.gather ranks   │
│  stage3_synthesize_final()    — single chairman model call         │
│  calculate_aggregate_rankings()  — pure Python, no I/O             │
│  generate_conversation_title()   — fast cheap model call           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ httpx.AsyncClient
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│          OpenRouter HTTP Client  backend/openrouter.py              │
│  query_model()               — single POST, BYOK provider header   │
│  query_models_parallel()     — asyncio.gather over query_model     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                   https://openrouter.ai/api/v1/chat/completions
                   (routes to OpenAI / Anthropic / Google AI Studio
                    via provider.only BYOK field)

┌─────────────────────────────────────────────────────────────────────┐
│                Storage  backend/storage.py                          │
│  JSON file per conversation in data/conversations/{uuid}.json      │
│  No database; no ORM; plain pathlib + json module                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| FastAPI app | HTTP routing, CORS, SSE streaming, Pydantic validation | `backend/main.py` |
| Council orchestrator | 3-stage deliberation pipeline, title generation | `backend/council.py` |
| OpenRouter client | Async HTTP calls to OpenRouter, BYOK provider routing | `backend/openrouter.py` |
| Config | Model lists, BYOK mapping, env loading | `backend/config.py` |
| Storage | Read/write JSON conversation files | `backend/storage.py` |
| App (React root) | Global state, SSE event dispatch, conversation lifecycle | `frontend/src/App.jsx` |
| api.js | Thin fetch wrapper; SSE reader loop | `frontend/src/api.js` |
| ChatInterface | Input form (textarea + file attachments), message list, loading spinners | `frontend/src/components/ChatInterface.jsx` |
| Sidebar | Conversation list, new conversation button | `frontend/src/components/Sidebar.jsx` |
| Stage1 | Tab view of individual model responses | `frontend/src/components/Stage1.jsx` |
| Stage2 | Tab view of evaluations + de-anonymization + aggregate rankings | `frontend/src/components/Stage2.jsx` |
| Stage3 | Chairman final synthesis with download button | `frontend/src/components/Stage3.jsx` |
| Markdown | ReactMarkdown wrapper with GFM + syntax highlighting | `frontend/src/components/Markdown.jsx` |
| download.js | Export helpers (full deliberation and final answer as .md files) | `frontend/src/utils/download.js` |

## Pattern Overview

**Overall:** Client-server with SSE streaming. No database. No message queue. No authentication layer.

**Key Characteristics:**
- All I/O on the backend is async (`asyncio`, `httpx.AsyncClient`); council stages fan out with `asyncio.gather`
- Streaming uses FastAPI `StreamingResponse` with `media_type="text/event-stream"`; frontend reads via `response.body.getReader()` (not `EventSource`)
- Storage is ephemeral-friendly: each conversation is one JSON file in `data/conversations/`; metadata (label_to_model, aggregate_rankings) is NOT persisted, only sent in SSE events
- BYOK routing: `backend/config.py:get_provider_for_model()` infers the provider from the `publisher/model` prefix and injects `{"provider": {"only": [provider]}}` into every OpenRouter payload

## Layers

**HTTP / API Layer:**
- Purpose: Accept requests, validate with Pydantic, orchestrate pipeline, stream results back
- Location: `backend/main.py`
- Contains: FastAPI route handlers, Pydantic models, SSE event generator
- Depends on: `backend/council.py`, `backend/storage.py`
- Used by: Frontend via `frontend/src/api.js`

**Council Orchestration Layer:**
- Purpose: Implement the 3-stage deliberation logic; pure async Python with no HTTP awareness
- Location: `backend/council.py`
- Contains: `stage1_collect_responses`, `stage2_collect_rankings`, `stage3_synthesize_final`, `calculate_aggregate_rankings`, `parse_ranking_from_text`, `generate_conversation_title`, `run_full_council`
- Depends on: `backend/openrouter.py`, `backend/config.py`
- Used by: `backend/main.py`

**HTTP Client Layer:**
- Purpose: Wrap OpenRouter API calls; handle BYOK routing; graceful failure (returns None on error)
- Location: `backend/openrouter.py`
- Contains: `query_model`, `query_models_parallel`
- Depends on: `backend/config.py`
- Used by: `backend/council.py`

**Storage Layer:**
- Purpose: Persist conversations as JSON files; provide CRUD operations
- Location: `backend/storage.py`
- Contains: `create_conversation`, `get_conversation`, `save_conversation`, `list_conversations`, `add_user_message`, `add_assistant_message`, `update_conversation_title`
- Depends on: `backend/config.py` (DATA_DIR)
- Used by: `backend/main.py`

**Frontend UI Layer:**
- Purpose: Display multi-stage deliberation progressively as SSE events arrive; allow export
- Location: `frontend/src/`
- Contains: React components, CSS modules, api.js client, download utils
- Depends on: Backend via `http://localhost:8001`

## Data Flow

### Primary Request Path (SSE streaming)

1. User types prompt in textarea → `ChatInterface.handleSubmit` calls `onSendMessage(fullPrompt)` (`frontend/src/components/ChatInterface.jsx:91`)
2. `App.handleSendMessage` optimistically appends user + skeleton assistant messages to React state, then calls `api.sendMessageStream` (`frontend/src/App.jsx:60`)
3. `api.sendMessageStream` POSTs to `POST /api/conversations/{id}/message/stream`; opens `ReadableStream` reader loop (`frontend/src/api.js:76`)
4. Backend SSE generator in `send_message_stream` yields `stage1_start` event (`backend/main.py:151`)
5. `stage1_collect_responses` fans out via `asyncio.gather` to all `COUNCIL_MODELS` simultaneously (`backend/council.py:21`)
6. Backend yields `stage1_complete` with response array; frontend patches `lastMsg.stage1` and renders `Stage1` (`backend/main.py:153`, `frontend/src/App.jsx:104`)
7. Backend yields `stage2_start`; `stage2_collect_rankings` anonymizes responses (A, B, C…), builds ranking prompt, fans out again via `asyncio.gather` (`backend/council.py:50-98`)
8. Backend yields `stage2_complete` with data + metadata (`label_to_model`, `aggregate_rankings`); frontend patches `lastMsg.stage2` and `lastMsg.metadata` and renders `Stage2` (`backend/main.py:159`, `frontend/src/App.jsx:123`)
9. Backend yields `stage3_start`; `stage3_synthesize_final` sends chairman prompt to single model (`backend/council.py:115`)
10. Backend yields `stage3_complete`; frontend patches `lastMsg.stage3` and renders `Stage3` (`backend/main.py:164`, `frontend/src/App.jsx:143`)
11. If first message, title generation task (started in parallel at step 4) resolves; backend yields `title_complete`; frontend reloads conversation list (`backend/main.py:166-170`)
12. Backend yields `complete`; assistant message persisted to `data/conversations/{uuid}.json` (`backend/main.py:173-181`)

### Batch (non-streaming) Path

`POST /api/conversations/{id}/message` → `run_full_council()` runs all stages sequentially, returns `{stage1, stage2, stage3, metadata}` as a single JSON response. This endpoint exists but the frontend always uses the streaming path.

### File Attachment Path

1. User selects files in `ChatInterface` file input; `readFileAsText` reads each as UTF-8 (`frontend/src/utils/download.js:115`)
2. `buildPromptWithAttachments` prepends file contents as fenced blocks before the user prompt (`frontend/src/utils/download.js:127`)
3. Combined string is sent as `content` — no separate attachment API

**State Management:**
- All UI state lives in React `useState` in `App.jsx`; no external state manager
- `currentConversation.messages` is mutated immutably via spread inside SSE event callbacks
- Metadata (`label_to_model`, `aggregate_rankings`) is stored in the assistant message object in memory only; not sent back to backend storage

## Key Abstractions

**BYOK Provider Routing:**
- Purpose: Force OpenRouter to bill the user's own provider key rather than OpenRouter's pool
- Location: `backend/config.py:31-43`, consumed in `backend/openrouter.py:36-38`
- Pattern: `PUBLISHER_TO_PROVIDER` dict maps `"openai"` → `"openai"`, `"anthropic"` → `"anthropic"`, `"google"` → `"google-ai-studio"`; `get_provider_for_model("openai/gpt-4.1-nano")` → `"openai"`; injected as `{"provider": {"only": ["openai"]}}` in payload

**Anonymized Ranking:**
- Purpose: Prevent models from exhibiting brand bias when evaluating peers
- Location: `backend/council.py:49-56`
- Pattern: `labels = [chr(65 + i) for i in range(len(stage1_results))]` produces `["A","B","C","D"]`; `label_to_model = {"Response A": "openai/gpt-5-mini", ...}`; mapping sent to frontend in SSE metadata, never to the ranking models

**Parallel Fan-out:**
- Purpose: Minimize wall-clock latency for stages that call multiple models
- Location: `backend/openrouter.py:62-85`
- Pattern: `tasks = [query_model(model, messages) for model in models]`; `responses = await asyncio.gather(*tasks)`; individual failures return `None` and are filtered out by callers

**SSE Event Protocol:**
- Purpose: Progressive rendering of long-running pipeline
- Location: `backend/main.py:140-193` (generator), `frontend/src/api.js:76-114` (consumer)
- Pattern: Each event is `data: <JSON>\n\n`; JSON always has a `type` field; frontend switches on `type` to update the correct stage in React state

## Entry Points

**Backend Server:**
- Location: `backend/main.py:197-199`
- Triggers: `python -m backend.main` from project root (or via `start.sh`)
- Responsibilities: Starts uvicorn on `127.0.0.1:8001`; mounts FastAPI app

**Frontend Dev Server:**
- Location: `frontend/src/main.jsx`
- Triggers: `npm run dev` in `frontend/`
- Responsibilities: Renders `<App />` into `#root` via React 18 `createRoot`

## Architectural Constraints

- **Threading:** Single-threaded async event loop (uvicorn + asyncio). All concurrency via `asyncio.gather`. No threads, no worker processes.
- **Global state:** `COUNCIL_MODELS`, `CHAIRMAN_MODEL`, `OPENROUTER_API_KEY` are module-level singletons loaded once at import in `backend/config.py`. Runtime model changes require process restart.
- **No streaming per-token:** SSE events fire once per completed stage, not per token. Each model call is a full blocking round-trip inside `query_model`.
- **Storage concurrency:** `backend/storage.py` uses synchronous file I/O (`open`/`json.dump`) inside an async app. Fine for single-user local use; would need async file I/O or a DB under concurrent load.
- **Metadata not persisted:** `label_to_model` and `aggregate_rankings` exist only in SSE events and React memory. Loading a historical conversation from storage will not show Stage 2 metadata.
- **API base hardcoded:** `frontend/src/api.js:5` hardcodes `http://localhost:8001`. Must be changed for non-local deployment.
- **CORS origins hardcoded:** `backend/main.py:19-24` allows only `localhost:5173` and `localhost:3000`.

## Anti-Patterns

### Sync file I/O inside async handlers

**What happens:** `storage.py` functions (`get_conversation`, `save_conversation`, etc.) use blocking `open()` and `json.load()` called directly from async FastAPI route handlers.

**Why it's wrong:** Blocks the entire asyncio event loop during file reads/writes, preventing concurrent request handling.

**Do this instead:** Wrap with `asyncio.run_in_executor` or replace with `aiofiles`; or migrate to SQLite with `aiosqlite`. Reference: `backend/storage.py:48-64`.

### Metadata loss on reload

**What happens:** `label_to_model` and `aggregate_rankings` are never written to `data/conversations/{id}.json` (see `backend/storage.py:130-156` — `add_assistant_message` takes only stage1/stage2/stage3).

**Why it's wrong:** Reloading a past conversation via `GET /api/conversations/{id}` returns stage2 data without the metadata needed for de-anonymization and aggregate display in `Stage2.jsx`.

**Do this instead:** Include `label_to_model` and `aggregate_rankings` in the persisted assistant message. Add them to `add_assistant_message` signature and to the JSON structure.

## Error Handling

**Strategy:** Graceful degradation per model; fail the whole request only if storage is unavailable.

**Patterns:**
- `query_model` catches all exceptions, logs to stdout, returns `None` (`backend/openrouter.py:57-59`)
- `stage1_collect_responses` filters out `None` responses; continues with whatever succeeded (`backend/council.py:25-31`)
- `stage3_synthesize_final` has an explicit fallback response if the chairman fails (`backend/council.py:164-169`)
- `run_full_council` returns early with an error dict if all stage1 models failed (`backend/council.py:309-313`)
- SSE generator catches all exceptions and yields an `error` type event rather than crashing the stream (`backend/main.py:183-185`)

## Cross-Cutting Concerns

**Logging:** `print()` only (e.g., `backend/openrouter.py:58`). No structured logging framework.
**Validation:** Pydantic models in `backend/main.py` (request bodies only). No input sanitization on content sent to models.
**Authentication:** None. The API is open to any origin matching CORS rules.

---

*Architecture analysis: 2026-05-09*
