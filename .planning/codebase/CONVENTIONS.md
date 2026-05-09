# Coding Conventions

**Analysis Date:** 2026-05-09

> Note: This project was explicitly built as a "Saturday hack" (README: "99% vibe coded").
> Conventions below are inferred from the existing code — they are not enforced by formatters,
> linters (backend), or type checkers. The only static analysis tool that runs is ESLint on
> the frontend.

## Naming Patterns

**Python modules:**
- `snake_case` filenames: `config.py`, `openrouter.py`, `council.py`, `storage.py`, `main.py`
- One logical concern per module (API client, orchestration, persistence, config, routing)

**Python functions:**
- `snake_case` for all functions: `query_model`, `stage1_collect_responses`, `parse_ranking_from_text`, `calculate_aggregate_rankings`, `get_conversation_path`
- Verb-first naming for actions: `create_conversation`, `save_conversation`, `add_user_message`, `update_conversation_title`
- Query functions prefixed with `get_`: `get_conversation`, `get_provider_for_model`

**Python constants:**
- `UPPER_SNAKE_CASE` at module level: `COUNCIL_MODELS`, `CHAIRMAN_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_API_URL`, `DATA_DIR`, `PUBLISHER_TO_PROVIDER` in `backend/config.py`
- Private utility constants at module level in JS use the same pattern: `MAX_FILE_BYTES`, `MAX_TOTAL_BYTES` in `frontend/src/utils/download.js`

**React components:**
- `PascalCase` filenames matching the default export: `ChatInterface.jsx`, `Stage1.jsx`, `Stage2.jsx`, `Stage3.jsx`, `Sidebar.jsx`, `Markdown.jsx`
- Component files live in `frontend/src/components/`

**React functions (non-component):**
- `camelCase`: `handleSubmit`, `handleKeyDown`, `handleFilesSelected`, `removeAttachment`, `scrollToBottom`, `deAnonymizeText`, `formatBytes`, `findQuestionFor`
- Event handlers always prefixed with `handle`: `handleSubmit`, `handleKeyDown`, `handleNewConversation`, `handleSelectConversation`, `handleSendMessage`, `handleDownload`

**CSS classes:**
- `kebab-case` throughout: `.chat-interface`, `.messages-container`, `.stage-loading`, `.markdown-content`, `.aggregate-item`, `.rank-position`, `.download-btn`, `.attachment-chip`

**JavaScript utility functions:**
- `camelCase` named exports from `frontend/src/utils/download.js`: `triggerDownload`, `buildFinalAnswerMarkdown`, `buildFullDeliberationMarkdown`, `buildFinalAnswerFilename`, `buildDeliberationFilename`, `readFileAsText`, `buildPromptWithAttachments`
- Private helpers (not exported) use `camelCase` too: `slugify`, `timestamp`

## Code Style

**Formatting:**
- No formatter configured. No `.prettierrc`, no Biome config at project root.
- Frontend code is consistently 2-space indented (observed in all `.jsx` and `.js` files).
- Backend code is consistently 4-space indented (PEP 8 standard, not enforced by tooling).

**Linting:**
- Frontend only: ESLint configured at `frontend/eslint.config.js`
  - Extends `@eslint/js` recommended + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
  - Custom rule: `no-unused-vars` set to `error`, with `varsIgnorePattern: '^[A-Z_]'` (allows unused module-level constants)
  - Runs via `npm run lint` (`eslint .`)
- Backend: No linting tool configured (no `.flake8`, no `ruff`, no `mypy`)

## Import Organization

**Python:**
Order observed in backend modules:
1. Standard library imports (`import os`, `import json`, `import re`, `from datetime import datetime`, `from typing import ...`, `from pathlib import Path`, `from collections import defaultdict`)
2. Third-party imports (`import httpx`, `from fastapi import ...`, `from pydantic import BaseModel`)
3. Relative package imports (`from .config import ...`, `from .openrouter import ...`, `from .council import ...`, `from . import storage`)

Relative imports are mandatory — all backend modules use `from .module import name` syntax. Running as `python -m backend.main` from project root is required. Example from `backend/openrouter.py`:
```python
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL, get_provider_for_model
```

Some stdlib imports are deferred inside functions to avoid top-level coupling:
- `import asyncio` inside `query_models_parallel` in `backend/openrouter.py`
- `import re` inside `parse_ranking_from_text` in `backend/council.py`
- `from collections import defaultdict` inside `calculate_aggregate_rankings` in `backend/council.py`

**JavaScript/React:**
Order observed:
1. React hooks (`import { useState, useEffect, useRef } from 'react'`)
2. Local component imports (`import Stage1 from './Stage1'`)
3. Utility/API imports (`import { api } from './api'`, `import { ... } from '../utils/download'`)
4. Co-located CSS (`import './ChatInterface.css'`)

**Path Aliases:**
- None configured. All imports use relative paths (`./`, `../`).

## Module Design

**Exports:**
- Python: No `__all__` declarations. Functions are exported implicitly.
- JavaScript: Named exports for utilities (`export function`, `export const` in `frontend/src/utils/download.js`). Default exports for React components (`export default function ComponentName`). Named object export for API client (`export const api = { ... }` in `frontend/src/api.js`).

**Barrel Files:**
- Not used. Each file is imported directly by path.

## Co-located Styles

Every component has a matching CSS file imported at the bottom of its imports:
- `frontend/src/components/ChatInterface.jsx` → `import './ChatInterface.css'`
- `frontend/src/components/Stage1.jsx` → `import './Stage1.css'`
- `frontend/src/components/Stage2.jsx` → `import './Stage2.css'`
- `frontend/src/components/Stage3.jsx` → `import './Stage3.css'`
- `frontend/src/components/Sidebar.jsx` → `import './Sidebar.css'`
- `frontend/src/App.jsx` → `import './App.css'`

The `Markdown.jsx` component does not have its own CSS; it imports `highlight.js/styles/github.css` for syntax highlighting.

## Docstrings

All public Python functions have Google-style docstrings with `Args:` and `Returns:` sections. Example from `backend/openrouter.py`:
```python
async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
```

Module-level docstrings are present on all backend files (e.g., `"""3-stage LLM Council orchestration."""`).

JavaScript utilities use JSDoc `/** ... */` block comments on exported functions in `frontend/src/utils/download.js`. Inline `// comment` style used for brief explanations in `frontend/src/api.js`.

## Type Hints

Python type hints are present in all function signatures in `backend/` using `typing` module imports:
```python
from typing import List, Dict, Any, Optional, Tuple
```

No `mypy` or Pyright type-checking is configured. Python 3.10+ union shorthand (`str | None`) appears in `backend/config.py` (`get_provider_for_model` return type), but the rest of the codebase uses `Optional[T]` from `typing`.

React components have no TypeScript — all files are plain `.jsx`/`.js`. The `@types/react` and `@types/react-dom` dev dependencies are installed (see `frontend/package.json`) but provide no enforcement without a TypeScript compiler.

## React Patterns

**Component style:**
- All components are function components with hooks; no class components.
- Hooks used: `useState`, `useEffect`, `useRef` (imported from `'react'`).
- Props are destructured directly in the function signature:
  ```jsx
  export default function ChatInterface({ conversation, onSendMessage, isLoading }) { ... }
  ```

**Markdown rendering:**
- A shared `Markdown` wrapper component lives at `frontend/src/components/Markdown.jsx`. It encapsulates `ReactMarkdown` with `remarkGfm` and `rehypeHighlight` plugins.
- Plugin arrays are hoisted as module-level constants to avoid re-creation on render:
  ```js
  const REMARK_PLUGINS = [remarkGfm];
  const REHYPE_PLUGINS = [rehypeHighlight];
  ```
- All `<Markdown>` usages must be wrapped in `<div className="markdown-content">` for global spacing rules defined in `frontend/src/index.css`. Example from `Stage1.jsx`:
  ```jsx
  <div className="response-text markdown-content">
    <Markdown>{responses[activeTab].response}</Markdown>
  </div>
  ```

**Conditional rendering:**
- Guard clauses return `null` early when required data is absent:
  ```jsx
  if (!responses || responses.length === 0) return null;
  if (!finalResponse) return null;
  ```

**Model name display:**
- Model identifiers (`"openai/gpt-4o"`) are trimmed to the short name for display:
  ```js
  resp.model.split('/')[1] || resp.model
  ```
  This pattern appears in `Stage1.jsx`, `Stage2.jsx`, `Stage3.jsx`, and `Sidebar.jsx`.

## Error Handling

**Backend (Python):**
- `backend/openrouter.py`: Broad `except Exception as e` in `query_model`, prints to stdout, returns `None`. No logging library — raw `print()` only.
  ```python
  except Exception as e:
      print(f"Error querying model {model}: {e}")
      return None
  ```
- Callers in `backend/council.py` filter out `None` results, enabling graceful degradation when individual models fail.
- `backend/storage.py` raises `ValueError` (not `HTTPException`) on missing conversation in `add_user_message`, `add_assistant_message`, `update_conversation_title`.
- `backend/main.py`: Uses `HTTPException(status_code=404, detail="Conversation not found")` for missing conversations in API handlers. SSE endpoint wraps entire generator in `try/except` and emits `{"type": "error", "message": str(e)}` on failure.

**Frontend (JavaScript):**
- `frontend/src/App.jsx`: All async calls are wrapped in `try/catch` with `console.error(...)`. No toast notifications, no UI error state exposed to the user.
- `frontend/src/api.js`: Throws `new Error(...)` on non-OK HTTP responses; does not inspect the response body for error details.
- `frontend/src/components/ChatInterface.jsx`: File read errors surface as `attachError` state string rendered inline; all other errors silently log to console.

## Comments

Inline comments explain non-obvious logic:
```python
# Force routing through the user's BYOK key for known publishers,
# so usage bills the provider account directly (not OpenRouter's pool).
```
```python
# Create anonymized labels for responses (Response A, Response B, etc.)
labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...
```

React JSX uses `{/* Stage 1 */}` block comments as section dividers in `ChatInterface.jsx`.

---

*Convention analysis: 2026-05-09*
