# CLAUDE.md - Technical Notes for LLM Council

This file contains technical details, architectural decisions, and important implementation notes for future development sessions.

## Project Overview

LLM Council is a 3-stage deliberation system where multiple LLMs collaboratively answer user questions. The key innovation is anonymized peer review in Stage 2, preventing models from playing favorites.

## Architecture

### Backend Structure (`backend/`)

**`config.py`**
- Contains `COUNCIL_MODELS` (list of OpenRouter model identifiers)
- Contains `CHAIRMAN_MODEL` (model that synthesizes final answer)
- Uses environment variable `OPENROUTER_API_KEY` from `.env`
- Backend runs on **port 8001** (NOT 8000 - user had another app on 8000)

**`openrouter.py`**
- `query_model()`: Single async model query
- `query_models_parallel()`: Parallel queries using `asyncio.gather()`
- Returns dict with 'content' and optional 'reasoning_details'
- Graceful degradation: returns None on failure, continues with successful responses

**`council.py`** - The Core Logic
- `stage1_collect_responses()`: Parallel queries to all council models
- `stage2_collect_rankings()`:
  - Anonymizes responses as "Response A, B, C, etc."
  - Creates `label_to_model` mapping for de-anonymization
  - Prompts models to evaluate and rank (with strict format requirements)
  - Returns tuple: (rankings_list, label_to_model_dict)
  - Each ranking includes both raw text and `parsed_ranking` list
- `stage3_synthesize_final()`: Chairman synthesizes from all responses + rankings
- `parse_ranking_from_text()`: Extracts "FINAL RANKING:" section, handles both numbered lists and plain format
- `calculate_aggregate_rankings()`: Computes average rank position across all peer evaluations

**`storage.py`**
- JSON-based conversation storage in `data/conversations/`
- Each conversation: `{id, created_at, messages[]}`
- Assistant messages contain: `{role, stage1, stage2, stage3}`
- Note: metadata (label_to_model, aggregate_rankings) is NOT persisted to storage, only returned via API

**`main.py`**
- FastAPI app with CORS enabled for localhost:5173 and localhost:3000
- POST `/api/conversations/{id}/message` returns metadata in addition to stages
- Metadata includes: label_to_model mapping and aggregate_rankings

### Frontend Structure (`frontend/src/`)

**`App.jsx`**
- Main orchestration: manages conversations list and current conversation
- Handles message sending and metadata storage
- Important: metadata is stored in the UI state for display but not persisted to backend JSON

**`components/ChatInterface.jsx`**
- Multiline textarea (3 rows, resizable)
- Enter to send, Shift+Enter for new line
- User messages wrapped in markdown-content class for padding

**`components/Stage1.jsx`**
- Tab view of individual model responses
- ReactMarkdown rendering with markdown-content wrapper

**`components/Stage2.jsx`**
- **Critical Feature**: Tab view showing RAW evaluation text from each model
- De-anonymization happens CLIENT-SIDE for display (models receive anonymous labels)
- Shows "Extracted Ranking" below each evaluation so users can validate parsing
- Aggregate rankings shown with average position and vote count
- Explanatory text clarifies that boldface model names are for readability only

**`components/Stage3.jsx`**
- Final synthesized answer from chairman
- Green-tinted background (#f0fff0) to highlight conclusion

**Styling (`*.css`)**
- Light mode theme (not dark mode)
- Primary color: #4a90e2 (blue)
- Global markdown styling in `index.css` with `.markdown-content` class
- 12px padding on all markdown content to prevent cluttered appearance

## Key Design Decisions

### Stage 2 Prompt Format
The Stage 2 prompt is very specific to ensure parseable output:
```
1. Evaluate each response individually first
2. Provide "FINAL RANKING:" header
3. Numbered list format: "1. Response C", "2. Response A", etc.
4. No additional text after ranking section
```

This strict format allows reliable parsing while still getting thoughtful evaluations.

### De-anonymization Strategy
- Models receive: "Response A", "Response B", etc.
- Backend creates mapping: `{"Response A": "openai/gpt-5.1", ...}`
- Frontend displays model names in **bold** for readability
- Users see explanation that original evaluation used anonymous labels
- This prevents bias while maintaining transparency

### Error Handling Philosophy
- Continue with successful responses if some models fail (graceful degradation)
- Never fail the entire request due to single model failure
- Log errors but don't expose to user unless all models fail

### UI/UX Transparency
- All raw outputs are inspectable via tabs
- Parsed rankings shown below raw text for validation
- Users can verify system's interpretation of model outputs
- This builds trust and allows debugging of edge cases

## Important Implementation Details

### Relative Imports
All backend modules use relative imports (e.g., `from .config import ...`) not absolute imports. This is critical for Python's module system to work correctly when running as `python -m backend.main`.

### Port Configuration
- Backend: 8001 (changed from 8000 to avoid conflict)
- Frontend: 5173 (Vite default)
- Update both `backend/main.py` and `frontend/src/api.js` if changing

### Markdown Rendering
All ReactMarkdown components must be wrapped in `<div className="markdown-content">` for proper spacing. This class is defined globally in `index.css`.

### Model Configuration
Models are hardcoded in `backend/config.py`. Chairman can be same or different from council members. The current default is Gemini as chairman per user preference.

## Common Gotchas

1. **Module Import Errors**: Always run backend as `python -m backend.main` from project root, not from backend directory
2. **CORS Issues**: Frontend must match allowed origins in `main.py` CORS middleware
3. **Ranking Parse Failures**: If models don't follow format, fallback regex extracts any "Response X" patterns in order
4. **Missing Metadata**: Metadata is ephemeral (not persisted), only available in API responses

## Future Enhancement Ideas

- Configurable council/chairman via UI instead of config file
- Streaming responses instead of batch loading
- Export conversations to markdown/PDF
- Model performance analytics over time
- Custom ranking criteria (not just accuracy/insight)
- Support for reasoning models (o1, etc.) with special handling

## Testing Notes

Use `test_openrouter.py` to verify API connectivity and test different model identifiers before adding to council. The script tests both streaming and non-streaming modes.

## Data Flow Summary

```
User Query
    ↓
Stage 1: Parallel queries → [individual responses]
    ↓
Stage 2: Anonymize → Parallel ranking queries → [evaluations + parsed rankings]
    ↓
Aggregate Rankings Calculation → [sorted by avg position]
    ↓
Stage 3: Chairman synthesis with full context
    ↓
Return: {stage1, stage2, stage3, metadata}
    ↓
Frontend: Display with tabs + validation UI
```

The entire flow is async/parallel where possible to minimize latency.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**LLM Council — Personal Edition**

A personal multi-LLM deliberation app forked from `karpathy/llm-council`, extended into a useful daily tool for asking questions with a cost-aware "council mode": fast for trivial queries, premium for important ones, and a research mode that mixes reasoning models with web search when answers need to be grounded. Single-user, runs locally, BYOK against OpenAI / Anthropic / Google AI Studio via OpenRouter.

**Core Value:** **The Quality dial works as advertised at every level.** A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce. Everything else can fail before this does.

### Constraints

- **Tech stack**: FastAPI + httpx + uv on backend, React 19 + Vite 7 + react-markdown on frontend — *fixed; no migration to other frameworks in this milestone*.
- **Cadence**: 1-2 working sessions per week — *standard granularity (5-8 medium phases) so each session has a clear deliverable*.
- **Budget**: $100/month OpenRouter cap, BYOK so the cap covers BYOK fees only (~5% of provider spend) — *Quality+Research can run multi-dollar queries; selector design must surface cost so the user picks consciously*.
- **Privacy**: BYOK on the three big providers, no free-tier models, no third-party providers (Together, Fireworks, Venice, etc.) — *imposed by the OpenRouter account allowlist; respected by the existing `PUBLISHER_TO_PROVIDER` map and must continue to be respected when adding research models*.
- **Single-user, local-only**: backend bound to `127.0.0.1`, no auth, no rate limiting — *acceptable because the only attacker model is "another process on the same machine", and Vuln 2 fix closes that surface*.
- **UX-first**: visible-UI work cannot start until the UX research phase has produced artifacts — *avoids the "rebrand by guessing" failure mode the user explicitly wants to avoid*.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.10 — Backend API, LLM orchestration, storage logic
- JavaScript (ESM) — Frontend application (React SPA)
- Bash — Dev startup script (`start.sh`)
## Runtime
- Python 3.10 (pinned in `.python-version`)
- Minimum: `>=3.10` (declared in `pyproject.toml`)
- Node.js (version not pinned; determined by local install)
- npm (lockfile version 3 — npm 7+)
- Backend: `uv` — runs via `uv run python -m backend.main`; lockfile `uv.lock` present and committed
- Frontend: `npm` — lockfile `frontend/package-lock.json` present and committed
## Frameworks
- FastAPI `>=0.115.0` (resolved: `0.121.3`) — REST API + SSE streaming; `backend/main.py`
- Uvicorn `>=0.32.0` (resolved: `0.38.0`) — ASGI server, standard extras (websockets, watchfiles)
- Pydantic `>=2.9.0` (resolved: `2.12.4`) — request/response models in `backend/main.py`
- React `^19.2.0` — UI framework; entry at `frontend/src/main.jsx`
- Vite `^7.2.4` — dev server and build tool; config at `frontend/vite.config.js`
- `@vitejs/plugin-react` `^5.1.1` — Babel-based Fast Refresh
- `react-markdown` `^10.1.0` — Markdown rendering in `frontend/src/components/Markdown.jsx`
- `remark-gfm` `^4.0.1` — GitHub Flavored Markdown plugin
- `rehype-highlight` `^7.0.2` — syntax highlighting via highlight.js
- `highlight.js` `^11.11.1` — syntax highlighting engine
- ESLint `^9.39.1` — flat config via `eslint.config.*`
- `eslint-plugin-react-hooks` `^7.0.1`
- `eslint-plugin-react-refresh` `^0.4.24`
- `globals` `^16.5.0`
## Key Dependencies
- `httpx` `>=0.27.0` (resolved: `0.28.1`) — async HTTP client for all LLM API calls; `backend/openrouter.py`
- `python-dotenv` `>=1.0.0` — loads `.env` at startup; `backend/config.py`
- `pydantic-core` `2.41.5` — Pydantic v2 Rust core (transitive)
- `anyio` `4.11.0` — async backend for httpx/FastAPI (transitive)
- `certifi` `2025.11.12` — TLS certificates (transitive via httpx)
## Configuration
- Single `.env` file at project root (gitignored)
- Template provided at `.env.example`
- Only required variable: `OPENROUTER_API_KEY` (format: `sk-or-v1-...`)
- Loaded at import time via `load_dotenv()` in `backend/config.py:6`
- Model list: `backend/config.py` — `COUNCIL_MODELS` list and `CHAIRMAN_MODEL` string
- Ports: backend `8001`, frontend `5173` (Vite default)
- CORS origins: `http://localhost:5173`, `http://localhost:3000` — `backend/main.py:19-24`
- Data directory: `data/conversations/` (JSON flat files)
- Frontend build: `vite build` (output: `frontend/dist/`)
- No backend build step; runs directly with `uv run`
## Platform Requirements
- Python 3.10+ with `uv` installed
- Node.js with npm (lockfile v3 requires npm 7+)
- Start both servers: `bash start.sh` or manually per `start.sh:10,19`
- Backend: `uv run python -m backend.main` (must run from project root — relative imports)
- Frontend: `cd frontend && npm run dev`
- No containerization detected
- Backend binds to `127.0.0.1:8001` only (localhost-only, no external exposure) — `backend/main.py:199`
- No reverse proxy, CI/CD, or cloud deployment configuration detected
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- `snake_case` filenames: `config.py`, `openrouter.py`, `council.py`, `storage.py`, `main.py`
- One logical concern per module (API client, orchestration, persistence, config, routing)
- `snake_case` for all functions: `query_model`, `stage1_collect_responses`, `parse_ranking_from_text`, `calculate_aggregate_rankings`, `get_conversation_path`
- Verb-first naming for actions: `create_conversation`, `save_conversation`, `add_user_message`, `update_conversation_title`
- Query functions prefixed with `get_`: `get_conversation`, `get_provider_for_model`
- `UPPER_SNAKE_CASE` at module level: `COUNCIL_MODELS`, `CHAIRMAN_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_API_URL`, `DATA_DIR`, `PUBLISHER_TO_PROVIDER` in `backend/config.py`
- Private utility constants at module level in JS use the same pattern: `MAX_FILE_BYTES`, `MAX_TOTAL_BYTES` in `frontend/src/utils/download.js`
- `PascalCase` filenames matching the default export: `ChatInterface.jsx`, `Stage1.jsx`, `Stage2.jsx`, `Stage3.jsx`, `Sidebar.jsx`, `Markdown.jsx`
- Component files live in `frontend/src/components/`
- `camelCase`: `handleSubmit`, `handleKeyDown`, `handleFilesSelected`, `removeAttachment`, `scrollToBottom`, `deAnonymizeText`, `formatBytes`, `findQuestionFor`
- Event handlers always prefixed with `handle`: `handleSubmit`, `handleKeyDown`, `handleNewConversation`, `handleSelectConversation`, `handleSendMessage`, `handleDownload`
- `kebab-case` throughout: `.chat-interface`, `.messages-container`, `.stage-loading`, `.markdown-content`, `.aggregate-item`, `.rank-position`, `.download-btn`, `.attachment-chip`
- `camelCase` named exports from `frontend/src/utils/download.js`: `triggerDownload`, `buildFinalAnswerMarkdown`, `buildFullDeliberationMarkdown`, `buildFinalAnswerFilename`, `buildDeliberationFilename`, `readFileAsText`, `buildPromptWithAttachments`
- Private helpers (not exported) use `camelCase` too: `slugify`, `timestamp`
## Code Style
- No formatter configured. No `.prettierrc`, no Biome config at project root.
- Frontend code is consistently 2-space indented (observed in all `.jsx` and `.js` files).
- Backend code is consistently 4-space indented (PEP 8 standard, not enforced by tooling).
- Frontend only: ESLint configured at `frontend/eslint.config.js`
- Backend: No linting tool configured (no `.flake8`, no `ruff`, no `mypy`)
## Import Organization
- `import asyncio` inside `query_models_parallel` in `backend/openrouter.py`
- `import re` inside `parse_ranking_from_text` in `backend/council.py`
- `from collections import defaultdict` inside `calculate_aggregate_rankings` in `backend/council.py`
- None configured. All imports use relative paths (`./`, `../`).
## Module Design
- Python: No `__all__` declarations. Functions are exported implicitly.
- JavaScript: Named exports for utilities (`export function`, `export const` in `frontend/src/utils/download.js`). Default exports for React components (`export default function ComponentName`). Named object export for API client (`export const api = { ... }` in `frontend/src/api.js`).
- Not used. Each file is imported directly by path.
## Co-located Styles
- `frontend/src/components/ChatInterface.jsx` → `import './ChatInterface.css'`
- `frontend/src/components/Stage1.jsx` → `import './Stage1.css'`
- `frontend/src/components/Stage2.jsx` → `import './Stage2.css'`
- `frontend/src/components/Stage3.jsx` → `import './Stage3.css'`
- `frontend/src/components/Sidebar.jsx` → `import './Sidebar.css'`
- `frontend/src/App.jsx` → `import './App.css'`
## Docstrings
## Type Hints
## React Patterns
- All components are function components with hooks; no class components.
- Hooks used: `useState`, `useEffect`, `useRef` (imported from `'react'`).
- Props are destructured directly in the function signature:
- A shared `Markdown` wrapper component lives at `frontend/src/components/Markdown.jsx`. It encapsulates `ReactMarkdown` with `remarkGfm` and `rehypeHighlight` plugins.
- Plugin arrays are hoisted as module-level constants to avoid re-creation on render:
- All `<Markdown>` usages must be wrapped in `<div className="markdown-content">` for global spacing rules defined in `frontend/src/index.css`. Example from `Stage1.jsx`:
- Guard clauses return `null` early when required data is absent:
- Model identifiers (`"openai/gpt-4o"`) are trimmed to the short name for display:
## Error Handling
- `backend/openrouter.py`: Broad `except Exception as e` in `query_model`, prints to stdout, returns `None`. No logging library — raw `print()` only.
- Callers in `backend/council.py` filter out `None` results, enabling graceful degradation when individual models fail.
- `backend/storage.py` raises `ValueError` (not `HTTPException`) on missing conversation in `add_user_message`, `add_assistant_message`, `update_conversation_title`.
- `backend/main.py`: Uses `HTTPException(status_code=404, detail="Conversation not found")` for missing conversations in API handlers. SSE endpoint wraps entire generator in `try/except` and emits `{"type": "error", "message": str(e)}` on failure.
- `frontend/src/App.jsx`: All async calls are wrapped in `try/catch` with `console.error(...)`. No toast notifications, no UI error state exposed to the user.
- `frontend/src/api.js`: Throws `new Error(...)` on non-OK HTTP responses; does not inspect the response body for error details.
- `frontend/src/components/ChatInterface.jsx`: File read errors surface as `attachError` state string rendered inline; all other errors silently log to console.
## Comments
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- All I/O on the backend is async (`asyncio`, `httpx.AsyncClient`); council stages fan out with `asyncio.gather`
- Streaming uses FastAPI `StreamingResponse` with `media_type="text/event-stream"`; frontend reads via `response.body.getReader()` (not `EventSource`)
- Storage is ephemeral-friendly: each conversation is one JSON file in `data/conversations/`; metadata (label_to_model, aggregate_rankings) is NOT persisted, only sent in SSE events
- BYOK routing: `backend/config.py:get_provider_for_model()` infers the provider from the `publisher/model` prefix and injects `{"provider": {"only": [provider]}}` into every OpenRouter payload
## Layers
- Purpose: Accept requests, validate with Pydantic, orchestrate pipeline, stream results back
- Location: `backend/main.py`
- Contains: FastAPI route handlers, Pydantic models, SSE event generator
- Depends on: `backend/council.py`, `backend/storage.py`
- Used by: Frontend via `frontend/src/api.js`
- Purpose: Implement the 3-stage deliberation logic; pure async Python with no HTTP awareness
- Location: `backend/council.py`
- Contains: `stage1_collect_responses`, `stage2_collect_rankings`, `stage3_synthesize_final`, `calculate_aggregate_rankings`, `parse_ranking_from_text`, `generate_conversation_title`, `run_full_council`
- Depends on: `backend/openrouter.py`, `backend/config.py`
- Used by: `backend/main.py`
- Purpose: Wrap OpenRouter API calls; handle BYOK routing; graceful failure (returns None on error)
- Location: `backend/openrouter.py`
- Contains: `query_model`, `query_models_parallel`
- Depends on: `backend/config.py`
- Used by: `backend/council.py`
- Purpose: Persist conversations as JSON files; provide CRUD operations
- Location: `backend/storage.py`
- Contains: `create_conversation`, `get_conversation`, `save_conversation`, `list_conversations`, `add_user_message`, `add_assistant_message`, `update_conversation_title`
- Depends on: `backend/config.py` (DATA_DIR)
- Used by: `backend/main.py`
- Purpose: Display multi-stage deliberation progressively as SSE events arrive; allow export
- Location: `frontend/src/`
- Contains: React components, CSS modules, api.js client, download utils
- Depends on: Backend via `http://localhost:8001`
## Data Flow
### Primary Request Path (SSE streaming)
### Batch (non-streaming) Path
### File Attachment Path
- All UI state lives in React `useState` in `App.jsx`; no external state manager
- `currentConversation.messages` is mutated immutably via spread inside SSE event callbacks
- Metadata (`label_to_model`, `aggregate_rankings`) is stored in the assistant message object in memory only; not sent back to backend storage
## Key Abstractions
- Purpose: Force OpenRouter to bill the user's own provider key rather than OpenRouter's pool
- Location: `backend/config.py:31-43`, consumed in `backend/openrouter.py:36-38`
- Pattern: `PUBLISHER_TO_PROVIDER` dict maps `"openai"` → `"openai"`, `"anthropic"` → `"anthropic"`, `"google"` → `"google-ai-studio"`; `get_provider_for_model("openai/gpt-4.1-nano")` → `"openai"`; injected as `{"provider": {"only": ["openai"]}}` in payload
- Purpose: Prevent models from exhibiting brand bias when evaluating peers
- Location: `backend/council.py:49-56`
- Pattern: `labels = [chr(65 + i) for i in range(len(stage1_results))]` produces `["A","B","C","D"]`; `label_to_model = {"Response A": "openai/gpt-5-mini", ...}`; mapping sent to frontend in SSE metadata, never to the ranking models
- Purpose: Minimize wall-clock latency for stages that call multiple models
- Location: `backend/openrouter.py:62-85`
- Pattern: `tasks = [query_model(model, messages) for model in models]`; `responses = await asyncio.gather(*tasks)`; individual failures return `None` and are filtered out by callers
- Purpose: Progressive rendering of long-running pipeline
- Location: `backend/main.py:140-193` (generator), `frontend/src/api.js:76-114` (consumer)
- Pattern: Each event is `data: <JSON>\n\n`; JSON always has a `type` field; frontend switches on `type` to update the correct stage in React state
## Entry Points
- Location: `backend/main.py:197-199`
- Triggers: `python -m backend.main` from project root (or via `start.sh`)
- Responsibilities: Starts uvicorn on `127.0.0.1:8001`; mounts FastAPI app
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
### Metadata loss on reload
## Error Handling
- `query_model` catches all exceptions, logs to stdout, returns `None` (`backend/openrouter.py:57-59`)
- `stage1_collect_responses` filters out `None` responses; continues with whatever succeeded (`backend/council.py:25-31`)
- `stage3_synthesize_final` has an explicit fallback response if the chairman fails (`backend/council.py:164-169`)
- `run_full_council` returns early with an error dict if all stage1 models failed (`backend/council.py:309-313`)
- SSE generator catches all exceptions and yields an `error` type event rather than crashing the stream (`backend/main.py:183-185`)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
