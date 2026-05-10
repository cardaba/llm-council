# Technology Stack — v2.0 Additions

**Project:** LLM Council — Personal Edition
**Milestone:** v2.0 (External Critique + Hardening)
**Researched:** 2026-05-10
**Mode:** Project research — additive deltas only
**Overall confidence:** HIGH

## Scope

This document covers ONLY new dependencies introduced by v2.0 features (A–G). The validated v1.0 stack documented in `.planning/codebase/STACK.md` (FastAPI 0.121.3 + httpx 0.28 + uv + Pydantic 2.12 / React 19.2 + Vite 7.2.4 + react-markdown 10) is **frozen**. No migrations, no replacements, no upgrades to existing pins beyond what is strictly required for compatibility with the new dev tooling.

## TL;DR — Recommended Additions

| Feature | New deps (count) | Net new runtime deps | Net new dev deps |
|---------|------------------|----------------------|------------------|
| A. External Critique | 0 | 0 | 0 |
| B. Persist metadata | 0 | 0 | 0 |
| C. Cost analytics | 0 | 0 | 0 |
| D. Settings page | 0 | 0 | 0 |
| E. Mobile responsive | 0 | 0 | 0 |
| F. Visual regression | 1 | 0 | 1 (Playwright) |
| G. Test suite | 6 | 0 | 6 (pytest stack + vitest stack) |

**Net additions:** 7 dev dependencies, zero new runtime dependencies. The architecture in v1.0 already covers everything A–E need.

## Recommended Stack — New Additions

### Backend Testing (Feature G — backend half)

Added to `pyproject.toml` under a new `[project.optional-dependencies]` (or PEP 735 `[dependency-groups]`) `dev` group, installable via `uv sync --group dev`.

| Technology | Version pin | Purpose | Why this version |
|------------|-------------|---------|------------------|
| `pytest` | `>=8.3.0,<10.0.0` | Test runner | Latest stable is 9.0.3 (Apr 2026). Lower bound 8.3 matches the long-stable ergonomics relied on by every plugin in the FastAPI ecosystem; upper bound prevents accidental jump to a hypothetical 10.x. HIGH. |
| `pytest-asyncio` | `>=1.3.0,<2.0.0` | Run `async def test_*` against `httpx.AsyncClient` and the FastAPI app | 1.3.0 (Nov 2025) is the latest stable, supports Python 3.10–3.14 (matches our 3.10 floor). Pin `asyncio_mode = "auto"` in `pyproject.toml` so we don't decorate every test. HIGH. |
| `pytest-cov` | `>=7.0.0,<8.0.0` | Coverage reporting | 7.1.0 (Mar 2026) is stable; v7 stream uses `coverage.py` 7.x. We target ~60% on critical paths (REQUIREMENTS.md), so we only need report generation, not gates that fail CI. HIGH. |

**No `httpx` test client addition needed** — `httpx>=0.27` is already a runtime dep, and `httpx.AsyncClient(transport=httpx.ASGITransport(app=app))` is the modern in-process FastAPI test pattern (replaces the old `TestClient` + Starlette `requests` shim). Zero net adds for the HTTP test surface.

**No `httpx-mock` / `respx` addition needed** for the council pipeline tests — we already control `query_model` at the function boundary, so we can use `monkeypatch.setattr` from stdlib `unittest.mock` (built into pytest) to fake responses. This keeps tests deterministic without adding a mocking lib.

#### Pinning rationale (backend dev)

```toml
# pyproject.toml — add this section (do NOT edit the [project] dependencies array)
[dependency-groups]
dev = [
    "pytest>=8.3.0,<10.0.0",
    "pytest-asyncio>=1.3.0,<2.0.0",
    "pytest-cov>=7.0.0,<8.0.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
pythonpath = ["."]   # so `from backend.x import y` resolves
```

Run with: `uv run pytest` or `uv run pytest --cov=backend --cov-report=term-missing`.

### Frontend Testing (Feature G — frontend half)

Added to `frontend/package.json` `devDependencies`. Installed via `npm install --save-dev`.

| Technology | Version pin | Purpose | Why this version |
|------------|-------------|---------|------------------|
| `vitest` | `^4.0.7` | Test runner | Vitest 4.x explicitly declares `peerDependencies.vite: "^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0"` — Vite 7.2.4 is in range. Inherits `vite.config.js` automatically (single config, no Jest+Babel plumbing). Latest stable 4.0.7. HIGH. |
| `@vitest/coverage-v8` | `^4.0.7` | Coverage via V8 profiler (no Babel transform) | Must match `vitest` major. V8 backend is faster than istanbul, no extra Babel config. HIGH. |
| `@testing-library/react` | `^16.3.2` | Render React components in tests | v16.x is the React-19-compatible major (16.1.0 added React 19 support; 16.3.2 fixes `RenderOptions.onCaughtError` types for React 19). HIGH. |
| `@testing-library/dom` | `^10.4.0` | Peer dep of `@testing-library/react` v16 (was bundled in v15, hoisted in v16) | v16 explicitly moved this to peerDependency. Without it, install resolves a too-old transitive copy. HIGH. |
| `@testing-library/user-event` | `^14.6.1` | Realistic user interaction simulation (keyboard, click, paste) | 14.6.1 (Jan 2025) is current stable; v14 is the API-stable major. Required for testing `ChatInterface` Enter/Shift+Enter behavior and the QualityToggle. HIGH. |
| `@testing-library/jest-dom` | `^6.6.0` | Custom matchers (`toBeInTheDocument`, `toHaveClass`, etc.) | Not Jest-specific despite the name — works with Vitest via `expect.extend`. v6 is the current major. HIGH. |
| `jsdom` | `^29.1.0` | DOM environment for vitest | jsdom over `happy-dom`: jsdom is the spec-compliant choice (used by Jest, Storybook, Next.js test setup); `happy-dom` is faster but has subtle deviations on focus/composition events that would matter for the textarea + file-attachment tests. Cost of speed not worth the spec drift for our small suite. HIGH. |

**Excluded on purpose:**
- ~~`happy-dom`~~ — see jsdom rationale above.
- ~~`@testing-library/react-hooks`~~ — deprecated; `renderHook` is now exported from `@testing-library/react` itself (v13+).
- ~~`msw` (Mock Service Worker)~~ — not needed; we mock the `api.js` module directly with `vi.mock()`. MSW would be over-engineering for a component-level suite.

#### vitest config

```js
// frontend/vitest.config.js (new file, sibling to vite.config.js)
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,                          // describe/it/expect without imports
    setupFiles: ['./src/test/setup.js'],    // imports @testing-library/jest-dom
    css: false,                             // skip CSS for speed; styles tested via Playwright
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/**/*.test.{js,jsx}', 'src/test/**'],
    },
  },
}));
```

`package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

### Visual Regression (Feature F)

| Technology | Version pin | Purpose | Why this version |
|------------|-------------|---------|------------------|
| `@playwright/test` | `^1.59.1` | Cross-browser E2E + built-in screenshot diffs via `expect(page).toHaveScreenshot()` | Latest stable v1.59.1 (Apr 2025). `toHaveScreenshot` ships in `@playwright/test` itself, uses `pixelmatch` internally — **no extra packages**. Self-hosted (no external service), free, integrates with the existing dev server (Playwright spawns Vite via `webServer.command`). HIGH. |

**Comparison vs alternatives** (one-line each):
- **Percy / Chromatic** — rejected: SaaS with per-snapshot pricing, requires CI keys, adds external dep on a service the user doesn't have. Conflicts with single-user-local-only constraint.
- **Storybook + test-runner** — rejected: Storybook is ~80MB of dev-only weight for a 7-component app with co-located CSS; we'd be installing a docs platform to host fixtures we don't otherwise need.
- **vitest browser mode + screenshot plugin** — rejected: still experimental in Vitest 4.x for snapshot diffing; Playwright's screenshot story is mature and battle-tested.

**Playwright is NOT integrated with vitest** — they coexist as separate test commands (`npm test` for vitest, `npm run test:visual` for Playwright). This is the standard split: vitest for unit/component, Playwright for browser-rendered visual + E2E. The user's quality gate asked about "integrates with vitest" — flagging that this is **not** how the ecosystem is structured; trying to force Playwright inside vitest would require `vitest-browser-mode` which is less mature.

```json
// package.json scripts addition
"test:visual": "playwright test",
"test:visual:update": "playwright test --update-snapshots"
```

```js
// playwright.config.js (new file at repo root or under frontend/)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.2 },
  },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile',  use: { ...devices['Pixel 7'] } },  // for Feature E mobile snapshots
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: './frontend',
  },
});
```

**Critical caveat from Playwright docs (HIGH confidence):** "Browser rendering can vary based on the host OS, version, settings, hardware, power source… For consistent screenshots, run tests in the same environment where the baseline screenshots were generated." For a single-user local app with no CI, this is fine — baselines are generated once on the dev machine and committed. If the user later runs tests on a different OS, expect a one-time re-baseline.

### Cost Analytics (Feature C)

**Net new deps: zero.**

OpenRouter automatically returns `usage.cost` and `usage.cost_details.upstream_inference_cost` in every response (the legacy `usage: {include: true}` request flag is deprecated and a no-op — full usage is always returned). The implementation is purely data plumbing:

1. `query_model` (`backend/openrouter.py`) already parses `response.json()`. Extend it to extract `usage.cost` and `usage.cost_details.upstream_inference_cost` and return them alongside `content` / `reasoning_details`.
2. `council.py` aggregates per-stage costs into a `costs` dict on the assistant message.
3. `storage.py` persists the new field — see Feature B (same persistence delta).
4. Frontend reads from existing SSE stream, no new state library needed.

**Why this matters for BYOK:** `cost_details.upstream_inference_cost` is the field the user wants to track (the actual provider charge). The top-level `cost` is the OpenRouter-side debit (5% BYOK fee). Both should be captured separately for transparent reporting against the $100/month cap. MEDIUM (verified via search; confirm exact JSON shape during implementation by logging one real response).

### Settings Page (Feature D)

**Net new deps: zero.**

The existing v1.0 codebase already uses `useState` + `localStorage` directly for the theme toggle (`frontend/src/hooks/useTheme.js` per ROADMAP/SUMMARY). Apply the same pattern for `stage4_threshold`, font-size, density:

```js
// frontend/src/hooks/useSettings.js (new, ~30 LOC)
const KEY = 'llm-council:settings';
const DEFAULTS = { stage4_threshold: 8, fontSize: 'medium', density: 'comfortable' };

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return DEFAULTS; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(settings)); }, [settings]);
  return [settings, setSettings];
}
```

**Explicitly rejected:** `zustand`, `jotai`, `redux-toolkit`, `valtio`. Total state surface in this app is `<100 keys`; current `useState` strategy in `App.jsx` works. Adding a state lib for 3 prefs would be a regression in simplicity. The "WHY NOT" rationale: bundle weight, conceptual overhead, and CONVENTIONS.md explicitly notes "All UI state lives in React `useState` in `App.jsx`; no external state manager."

**Backend coupling for `stage4_threshold`:** v1.0 has `stage4_threshold = 8` hardcoded in `research_strategy.py`. Feature D needs the frontend value to flow with the request. Add `stage4_threshold: Optional[int]` to `SendMessageRequest` Pydantic model in `main.py`; default to config value if absent. No new dep — pure schema change.

### File Upload for Critique (Feature A)

**Net new deps: zero.**

The existing `readFileAsText` in `frontend/src/utils/download.js` (per CONVENTIONS.md, validated in v1.0) handles `.md`/`.txt` upload via `FileReader.readAsText`. For Feature A:

- File is read **client-side** to UTF-8 text — no backend parsing, no `python-multipart`, no `aiofiles`, no `markdown-it-py`.
- File content is embedded directly into the Stage 1 prompt as a string segment with model-attribution preamble (e.g., `"[External research generated by openai/gpt-5.1]\n\n<file content>\n"`).
- File size cap reuses the existing `MAX_FILE_BYTES` (500KB) and `MAX_TOTAL_BYTES` (2MB) constants.

**Confirmed: text-only files do NOT need backend parsing.** A `.md` file is just UTF-8 text; the council models receive it as part of the user message. The existing prompt-building helper (`buildPromptWithAttachments` per CONVENTIONS.md) is the integration point.

**What might tempt you to add (don't):**
- ~~`python-multipart`~~ — only needed if files were POSTed as `multipart/form-data` to the backend. They're not; they're read in the browser and inlined into the prompt JSON body.
- ~~`marked` / `remark` on the backend~~ — we don't render the markdown server-side, we pass it raw to the models who handle it natively.
- ~~`pdfjs` / `mammoth`~~ — explicitly out of scope: only `.md` and `.txt` are accepted.

## Alternatives Considered (BYOK / Provider Allowlist Compliance)

The BYOK allowlist (OpenAI / Anthropic / Google AI Studio only via OpenRouter) is a **runtime billing constraint**. None of the v2.0 dev dependencies touch the OpenRouter pipeline:

| Dep | Calls OpenRouter? | BYOK conflict? |
|-----|-------------------|----------------|
| pytest / pytest-asyncio / pytest-cov | No | None |
| vitest / @vitest/coverage-v8 | No | None |
| @testing-library/* | No | None |
| jsdom | No | None |
| @playwright/test | No (it talks to localhost:5173 + spawned dev server) | None |

**Tests must NOT make real OpenRouter calls.** Mock `query_model` (backend) and `api.js` (frontend) at module boundary. Provider allowlist is not a tooling concern in v2.0.

## Installation Recipe

### Backend (uv)

```bash
# From repo root
uv add --group dev pytest pytest-asyncio pytest-cov

# Then in pyproject.toml, ensure version constraints match the table above.
# Run tests:
uv run pytest                                    # all tests
uv run pytest --cov=backend --cov-report=term    # with coverage
uv run pytest tests/test_storage.py -v           # single file
```

### Frontend (npm)

```bash
cd frontend
npm install --save-dev \
  vitest@^4.0.7 \
  @vitest/coverage-v8@^4.0.7 \
  @testing-library/react@^16.3.2 \
  @testing-library/dom@^10.4.0 \
  @testing-library/user-event@^14.6.1 \
  @testing-library/jest-dom@^6.6.0 \
  jsdom@^29.1.0 \
  @playwright/test@^1.59.1

# Install Playwright browsers (one-time, ~200MB):
npx playwright install chromium

# Run tests:
npm test                  # vitest watch mode
npm run test:run          # vitest single run
npm run test:coverage     # vitest with v8 coverage
npm run test:visual       # Playwright screenshots
```

## Integration with `start.sh` / dev workflow

- **No change to `start.sh`** — tests are not part of the dev server bring-up.
- **CI: out of scope** — there is no CI in v1.0, none added in v2.0. Tests are run locally on demand.
- **Lockfiles:** `uv.lock` and `frontend/package-lock.json` will both grow; commit both per existing convention.

## Risk Flags

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vitest 4.x is recent (vs the more battle-tested 3.x) | LOW | Peer dep range is explicit (`^7.0.0` for Vite); rollback path is `vitest@^3.2.4` (also valid for Vite 7) if issues surface. |
| Playwright screenshots are OS/font-dependent | MEDIUM | Self-hosted variable woff2 fonts (already in v1.0) reduce font-rendering drift. Run baselines + assertions on the same machine; tolerate one-time re-baseline if user switches hardware. |
| `uv add --group dev` requires uv >= 0.4.27 | LOW | User already runs uv per `start.sh`; if `--group` flag is missing, fall back to manual `[dependency-groups]` block in `pyproject.toml` then `uv sync`. |
| @testing-library/dom must be explicitly installed for v16 of @testing-library/react | LOW | Documented above; install command lists it explicitly. Without it, peer-dep warnings → confusing test failures. |
| OpenRouter `usage` JSON shape may differ slightly from search results | LOW | Verify with one real logged response during Feature C implementation; the field names `cost` and `cost_details.upstream_inference_cost` are documented in OpenRouter's usage-accounting page (HIGH for existence, MEDIUM for exact shape until logged). |

## Sources

- [Vitest releases (GitHub)](https://github.com/vitest-dev/vitest/releases) — confirmed v4.x stream is current
- [Vitest packages/vitest/package.json (GitHub)](https://github.com/vitest-dev/vitest/blob/main/packages/vitest/package.json) — confirmed `peerDependencies.vite: "^6.4.0 || ^7.0.0 || ^8.0.0"`
- [Vitest guide](https://vitest.dev/guide/) — "Vitest requires Vite >=v6.0.0 and Node >=v20.0.0"
- [@testing-library/react releases (GitHub)](https://github.com/testing-library/react-testing-library/releases) — v16.3.2 (Jan 2026), React 19 support added in 16.1.0
- [@testing-library/user-event releases (GitHub)](https://github.com/testing-library/user-event/releases) — v14.6.1 latest stable
- [jsdom releases (GitHub)](https://github.com/jsdom/jsdom/releases) — v29.1.1 latest
- [Playwright releases (GitHub)](https://github.com/microsoft/playwright/releases) — v1.59.1 latest stable (Apr 2025)
- [Playwright Visual Comparisons docs](https://playwright.dev/docs/test-snapshots) — confirms `toHaveScreenshot` ships in `@playwright/test`, uses pixelmatch internally
- [pytest PyPI](https://pypi.org/project/pytest/) — v9.0.3 latest (Apr 2026)
- [pytest-asyncio PyPI](https://pypi.org/project/pytest-asyncio/) — v1.3.0 latest (Nov 2025), Python 3.10–3.14
- [pytest-cov PyPI](https://pypi.org/project/pytest-cov/) — v7.1.0 latest (Mar 2026)
- [OpenRouter Usage Accounting docs](https://openrouter.ai/docs/cookbook/administration/usage-accounting) — confirms `usage.cost` + `cost_details.upstream_inference_cost` returned automatically; `usage:{include:true}` deprecated
- [LiteLLM issue #11626 (BerriAI/litellm)](https://github.com/BerriAI/litellm/issues/11626) — third-party confirmation of OpenRouter `cost` / `is_byok` field shape

---

*Confidence: HIGH on all version pins (cross-referenced against official releases pages and PyPI/GitHub package.json). MEDIUM on exact OpenRouter `usage` JSON shape (verified via documentation + community sources, but recommend logging one real response during Feature C implementation for absolute certainty).*
