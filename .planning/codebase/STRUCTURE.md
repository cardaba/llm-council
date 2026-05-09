# Codebase Structure

**Analysis Date:** 2026-05-09

## Directory Layout

```
llm-council/
├── backend/                   # FastAPI application (Python package)
│   ├── __init__.py            # Package marker (empty)
│   ├── config.py              # Model lists, BYOK map, env loading
│   ├── council.py             # 3-stage deliberation pipeline
│   ├── main.py                # FastAPI app, routes, SSE streaming
│   ├── openrouter.py          # Async OpenRouter HTTP client
│   └── storage.py             # JSON-file conversation persistence
├── frontend/                  # React + Vite SPA
│   ├── index.html             # Vite HTML entry
│   ├── vite.config.js         # Vite config
│   ├── eslint.config.js       # ESLint config
│   ├── package.json           # npm deps (react, react-markdown, etc.)
│   ├── package-lock.json
│   └── src/
│       ├── main.jsx           # React entry: createRoot → <App />
│       ├── App.jsx            # Root component: global state + SSE dispatch
│       ├── api.js             # fetch wrapper + SSE reader
│       ├── index.css          # Global styles, .markdown-content class
│       ├── App.css            # App-level layout
│       ├── assets/            # Static assets (images, icons)
│       ├── components/
│       │   ├── ChatInterface.jsx   # Message list, input form, file attachments
│       │   ├── ChatInterface.css
│       │   ├── Sidebar.jsx         # Conversation list + new button
│       │   ├── Sidebar.css
│       │   ├── Stage1.jsx          # Tab view: individual model responses
│       │   ├── Stage1.css
│       │   ├── Stage2.jsx          # Tab view: evaluations + aggregate rankings
│       │   ├── Stage2.css
│       │   ├── Stage3.jsx          # Chairman final answer + download
│       │   ├── Stage3.css
│       │   ├── Markdown.jsx        # ReactMarkdown wrapper (GFM + highlight.js)
│       │   └── (no Markdown.css — styles in index.css)
│       └── utils/
│           └── download.js    # Export helpers + file attachment utilities
├── data/
│   └── conversations/         # Runtime: one {uuid}.json per conversation
├── .planning/
│   └── codebase/              # Codebase maps written by gsd-map-codebase
├── .venv/                     # Python virtual environment (not committed)
├── CLAUDE.md                  # Project-level instructions for Claude
├── README.md
├── pyproject.toml             # Python project metadata + deps (uv)
├── uv.lock                    # uv lockfile
├── main.py                    # Root stub (prints hello — not the server entry)
├── start.sh                   # Convenience script to start backend + frontend
└── header.jpg                 # Project image asset
```

## Directory Purposes

**`backend/`:**
- Purpose: The entire Python/FastAPI server. Runs as a package via `python -m backend.main`.
- Contains: Route handlers, council orchestration, OpenRouter client, file storage
- Key files: `backend/main.py` (routes), `backend/council.py` (pipeline), `backend/config.py` (model config)

**`frontend/src/components/`:**
- Purpose: All React UI components. Each component has a co-located CSS file.
- Contains: One `.jsx` + one `.css` per component (except `Markdown.jsx` which has no separate CSS)
- Key files: `ChatInterface.jsx` (primary interaction), `Stage2.jsx` (most complex — de-anonymization + aggregates)

**`frontend/src/utils/`:**
- Purpose: Pure utility functions with no React imports.
- Contains: `download.js` — markdown export builders, file slugify/timestamp helpers, `readFileAsText`, `buildPromptWithAttachments`, attachment size constants

**`data/conversations/`:**
- Purpose: Runtime storage. Each file is `{uuid}.json` matching the conversation ID.
- Generated: Yes (at runtime by `backend/storage.py`)
- Committed: No (should be gitignored; contains user data)

**`.venv/`:**
- Purpose: Python virtual environment managed by `uv`.
- Generated: Yes
- Committed: No

## Key File Locations

**Entry Points:**
- `backend/main.py:197` — uvicorn server start (`host="127.0.0.1"`, `port=8001`)
- `frontend/src/main.jsx` — React app mount via `createRoot`

**Configuration:**
- `backend/config.py` — `COUNCIL_MODELS` list, `CHAIRMAN_MODEL`, `PUBLISHER_TO_PROVIDER` BYOK map
- `frontend/src/api.js:5` — `API_BASE = 'http://localhost:8001'` (hardcoded)
- `pyproject.toml` — Python deps and project metadata
- `frontend/package.json` — npm deps

**Core Logic:**
- `backend/council.py` — The deliberation pipeline (stages 1–3, ranking parser, aggregate calculator)
- `backend/openrouter.py` — `query_model` and `query_models_parallel`

**Styling:**
- `frontend/src/index.css` — Global resets and `.markdown-content` class (applied to all markdown renders)
- `frontend/src/components/*.css` — Component-scoped styles

**Testing:**
- None present (`test_openrouter.py` referenced in `CLAUDE.md` but not found in repo)

## Naming Conventions

**Python files:** `snake_case` module names (`council.py`, `openrouter.py`, `storage.py`)

**Python functions:** `snake_case` (`stage1_collect_responses`, `query_models_parallel`, `get_provider_for_model`)

**Python constants:** `UPPER_SNAKE_CASE` (`COUNCIL_MODELS`, `CHAIRMAN_MODEL`, `OPENROUTER_API_KEY`)

**React component files:** `PascalCase.jsx` (`ChatInterface.jsx`, `Stage1.jsx`, `Markdown.jsx`)

**CSS files:** Same name as co-located component (`ChatInterface.css`, `Stage1.css`)

**CSS classes:** `kebab-case` (`.stage-title`, `.tab-content`, `.markdown-content`, `.aggregate-item`)

**JavaScript utilities:** `camelCase` functions in `utils/download.js` (`buildFinalAnswerMarkdown`, `triggerDownload`, `slugify`)

**Data files:** `{uuid}.json` — UUID v4 filenames, no human-readable names

## Where to Add New Code

**New backend endpoint:**
- Add route handler to `backend/main.py`
- If it needs new orchestration logic, add functions to `backend/council.py`
- Reuse `backend/storage.py` for persistence; `backend/openrouter.py` for model calls

**New council stage or model:**
- Add model identifier to `COUNCIL_MODELS` in `backend/config.py`
- Add publisher → provider mapping in `PUBLISHER_TO_PROVIDER` if the publisher is new
- New deliberation stage: add async function to `backend/council.py`; wire into `run_full_council` and the SSE generator in `backend/main.py`

**New React component:**
- Add `ComponentName.jsx` and `ComponentName.css` to `frontend/src/components/`
- Import and use in `ChatInterface.jsx` or `App.jsx`
- Wrap any markdown text in `<div className="markdown-content"><Markdown>...</Markdown></div>`

**New utility function:**
- If it is pure (no React): add to `frontend/src/utils/download.js` or create a new file in `frontend/src/utils/`
- If it is an API call: add method to the `api` object in `frontend/src/api.js`

**New SSE event type:**
- Backend: yield `f"data: {json.dumps({'type': 'your_event', ...})}\n\n"` inside `event_generator` in `backend/main.py`
- Frontend: add a `case 'your_event':` to the switch in `App.handleSendMessage` (`frontend/src/App.jsx:94`)

**Persistent storage changes:**
- Modify the conversation JSON schema in `backend/storage.py`
- Update `add_assistant_message` signature if adding new per-message fields
- Note: `data/conversations/` files are not versioned; existing files won't have new fields (handle with `.get()` / defaults)

## Special Directories

**`data/conversations/`:**
- Purpose: One JSON file per conversation; keyed by UUID
- Generated: Yes, at runtime
- Committed: No (should be in `.gitignore`)
- Schema: `{id, created_at, title, messages: [{role: "user", content}, {role: "assistant", stage1, stage2, stage3}]}`

**`.planning/codebase/`:**
- Purpose: Codebase map documents generated by GSD tooling
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes

**`.venv/`:**
- Purpose: Python virtual environment (managed by `uv`)
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-05-09*
