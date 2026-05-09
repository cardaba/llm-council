# Technology Stack

**Analysis Date:** 2026-05-09

## Languages

**Primary:**
- Python 3.10 — Backend API, LLM orchestration, storage logic
- JavaScript (ESM) — Frontend application (React SPA)

**Secondary:**
- Bash — Dev startup script (`start.sh`)

## Runtime

**Backend Environment:**
- Python 3.10 (pinned in `.python-version`)
- Minimum: `>=3.10` (declared in `pyproject.toml`)

**Frontend Environment:**
- Node.js (version not pinned; determined by local install)
- npm (lockfile version 3 — npm 7+)

**Package Managers:**
- Backend: `uv` — runs via `uv run python -m backend.main`; lockfile `uv.lock` present and committed
- Frontend: `npm` — lockfile `frontend/package-lock.json` present and committed

## Frameworks

**Backend Core:**
- FastAPI `>=0.115.0` (resolved: `0.121.3`) — REST API + SSE streaming; `backend/main.py`
- Uvicorn `>=0.32.0` (resolved: `0.38.0`) — ASGI server, standard extras (websockets, watchfiles)
- Pydantic `>=2.9.0` (resolved: `2.12.4`) — request/response models in `backend/main.py`

**Frontend Core:**
- React `^19.2.0` — UI framework; entry at `frontend/src/main.jsx`
- Vite `^7.2.4` — dev server and build tool; config at `frontend/vite.config.js`
- `@vitejs/plugin-react` `^5.1.1` — Babel-based Fast Refresh

**Markdown Rendering:**
- `react-markdown` `^10.1.0` — Markdown rendering in `frontend/src/components/Markdown.jsx`
- `remark-gfm` `^4.0.1` — GitHub Flavored Markdown plugin
- `rehype-highlight` `^7.0.2` — syntax highlighting via highlight.js
- `highlight.js` `^11.11.1` — syntax highlighting engine

**Frontend Dev / Linting:**
- ESLint `^9.39.1` — flat config via `eslint.config.*`
- `eslint-plugin-react-hooks` `^7.0.1`
- `eslint-plugin-react-refresh` `^0.4.24`
- `globals` `^16.5.0`

## Key Dependencies

**Critical:**
- `httpx` `>=0.27.0` (resolved: `0.28.1`) — async HTTP client for all LLM API calls; `backend/openrouter.py`
- `python-dotenv` `>=1.0.0` — loads `.env` at startup; `backend/config.py`

**Infrastructure:**
- `pydantic-core` `2.41.5` — Pydantic v2 Rust core (transitive)
- `anyio` `4.11.0` — async backend for httpx/FastAPI (transitive)
- `certifi` `2025.11.12` — TLS certificates (transitive via httpx)

## Configuration

**Environment:**
- Single `.env` file at project root (gitignored)
- Template provided at `.env.example`
- Only required variable: `OPENROUTER_API_KEY` (format: `sk-or-v1-...`)
- Loaded at import time via `load_dotenv()` in `backend/config.py:6`

**Backend:**
- Model list: `backend/config.py` — `COUNCIL_MODELS` list and `CHAIRMAN_MODEL` string
- Ports: backend `8001`, frontend `5173` (Vite default)
- CORS origins: `http://localhost:5173`, `http://localhost:3000` — `backend/main.py:19-24`
- Data directory: `data/conversations/` (JSON flat files)

**Build:**
- Frontend build: `vite build` (output: `frontend/dist/`)
- No backend build step; runs directly with `uv run`

## Platform Requirements

**Development:**
- Python 3.10+ with `uv` installed
- Node.js with npm (lockfile v3 requires npm 7+)
- Start both servers: `bash start.sh` or manually per `start.sh:10,19`
- Backend: `uv run python -m backend.main` (must run from project root — relative imports)
- Frontend: `cd frontend && npm run dev`

**Production:**
- No containerization detected
- Backend binds to `127.0.0.1:8001` only (localhost-only, no external exposure) — `backend/main.py:199`
- No reverse proxy, CI/CD, or cloud deployment configuration detected

---

*Stack analysis: 2026-05-09*
