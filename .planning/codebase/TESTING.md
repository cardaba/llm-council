# Testing Patterns

**Analysis Date:** 2026-05-09

> **Critical context:** This project was shipped as a "Saturday hack" (README: "99% vibe coded").
> There are zero automated tests anywhere in the codebase. This document records that gap
> and provides a concrete path forward should tests be added.

## Test Framework

**Runner:** NONE INSTALLED

Verification:
- `pyproject.toml` has no `[project.optional-dependencies]` or `[dependency-groups]` section. No `pytest`, `pytest-asyncio`, `httpx` (test use), or any test framework in the dependency list.
- `frontend/package.json` devDependencies: `@eslint/js`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `vite`. No `vitest`, `jest`, `@testing-library/react`, or any test runner.
- No `pytest.ini`, `setup.cfg`, or `[tool.pytest.ini_options]` in `pyproject.toml`.
- No `vitest.config.*` or `jest.config.*` files in the repository.
- Glob `**/test_*.py` (project source only): zero matches.
- Glob `**/*.test.{js,jsx}` (project source only): zero matches.
- Glob `**/*.spec.{js,jsx}` (project source only): zero matches.
- Glob `**/__tests__/**`: zero matches.

**npm scripts** (`frontend/package.json`):
```json
{
  "dev":     "vite",
  "build":   "vite build",
  "lint":    "eslint .",
  "preview": "vite preview"
}
```
No `test` script exists. Running `npm test` will fail with "missing script: test".

**CI/CD:** No `.github/workflows/`, no `.gitlab-ci.yml`, no CI configuration of any kind.

**Coverage:** Not tracked. No `coverage` or `pytest-cov` installed; no `c8`/`istanbul` in frontend.

**Manual test script:** `test_openrouter.py` is mentioned in `CLAUDE.md` under "Testing Notes" as a script to verify API connectivity. This file does **not exist** in the repository. It was likely deleted or never committed.

## What the Linter Does Cover

The one static-analysis tool that runs is ESLint on the frontend:

```bash
cd frontend && npm run lint    # runs: eslint .
```

Config: `frontend/eslint.config.js`
- Catches unused variables (error-level: `no-unused-vars`)
- Enforces React Hooks rules (`eslint-plugin-react-hooks`)
- Catches invalid `React.refresh` component exports (`eslint-plugin-react-refresh`)
- Does NOT type-check (no TypeScript compiler, despite `@types/react` being installed)

## Untested Critical Paths

The following logic has no test coverage and represents the highest risk areas:

**`backend/council.py` — `parse_ranking_from_text`:**
- Parses free-text LLM output to extract a `FINAL RANKING:` section using regex
- Has two fallback modes (numbered list vs. bare "Response X" scan)
- Silently returns empty list `[]` if neither pattern matches
- Regression risk: any change to regex patterns can silently break ranking aggregation

**`backend/council.py` — `calculate_aggregate_rankings`:**
- Computes average rank positions across all peer evaluations
- Depends entirely on `parse_ranking_from_text` output being correct
- No guard against models ranked by fewer peers than others

**`backend/openrouter.py` — `query_model` / `query_models_parallel`:**
- All HTTP interaction logic; no mocks or contract tests
- BYOK provider routing logic (`payload["provider"] = {"only": [provider]}`) is untested

**`backend/storage.py`:**
- File-based JSON storage with no transaction safety
- `list_conversations` reads all files from disk on every call; no tests for empty dir, malformed JSON, or concurrent writes

**`frontend/src/utils/download.js`:**
- Pure functions (`slugify`, `buildFullDeliberationMarkdown`, `buildPromptWithAttachments`) are the most naturally unit-testable code in the repo but have no tests

**`frontend/src/App.jsx` — SSE stream handler:**
- `handleSendMessage` contains a 10-case `switch` on SSE event types, with optimistic UI mutation via `setCurrentConversation`
- Complex state mutation logic is entirely untested

## Recommended Test Setup (If Tests Are Added)

### Backend — pytest

Install:
```bash
uv add --dev pytest pytest-asyncio respx
```

Config (add to `pyproject.toml`):
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["backend/tests"]
```

Suggested location: `backend/tests/`
```
backend/
  tests/
    __init__.py
    test_council.py          # parse_ranking_from_text, calculate_aggregate_rankings
    test_openrouter.py       # query_model with respx HTTP mocking
    test_storage.py          # CRUD ops using tmp_path fixture
```

Priority test: `parse_ranking_from_text` in `backend/council.py` — it is pure, deterministic, and currently the most fragile component:
```python
# backend/tests/test_council.py
from backend.council import parse_ranking_from_text

def test_numbered_list_format():
    text = "Some eval...\n\nFINAL RANKING:\n1. Response A\n2. Response C\n3. Response B"
    assert parse_ranking_from_text(text) == ["Response A", "Response C", "Response B"]

def test_missing_final_ranking_section():
    assert parse_ranking_from_text("no ranking here") == []
```

### Frontend — vitest + React Testing Library

Install:
```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom
```

Add to `frontend/package.json` scripts:
```json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

Suggested location: `frontend/src/__tests__/`
```
frontend/src/
  __tests__/
    download.test.js     # slugify, buildFinalAnswerMarkdown, buildPromptWithAttachments
    Stage1.test.jsx      # tab rendering
    Stage2.test.jsx      # deAnonymizeText, parsed ranking display
```

Priority test: utility functions in `frontend/src/utils/download.js` — they are pure and require no mocking:
```js
// frontend/src/__tests__/download.test.js
import { buildPromptWithAttachments } from '../utils/download';

test('returns prompt unchanged when no attachments', () => {
  expect(buildPromptWithAttachments('hello', [])).toBe('hello');
});

test('prepends file blocks before prompt', () => {
  const result = buildPromptWithAttachments('q', [{ name: 'f.txt', content: 'data' }]);
  expect(result).toContain('--- FILE: f.txt ---');
  expect(result).toContain('q');
});
```

## Test Types

**Unit Tests:**
- Not present. Would be most valuable for: `parse_ranking_from_text`, `calculate_aggregate_rankings`, all functions in `frontend/src/utils/download.js`.

**Integration Tests:**
- Not present. Would require a running backend + mocked OpenRouter. Best expressed as pytest tests using `httpx.AsyncClient(app=app, base_url="http://test")` with `respx` for OpenRouter mocking.

**E2E Tests:**
- Not present. No Playwright, Cypress, or similar tool installed.

---

*Testing analysis: 2026-05-09*
