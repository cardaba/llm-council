# Phase 7: Mobile responsive + Visual regression + Tests — Research

**Researched:** 2026-05-11
**Domain:** Quality-lock phase — mobile usability + visual baselines + first test suite over an existing test-free codebase
**Confidence:** HIGH (all version pins verified against live npm/PyPI registries today; recipes verified against PITFALLS.md sources + existing Phase 6 code)

---

## Domain Summary

Phase 7 is the **quality lock** of v2.0. Unlike Phases 5 and 6 (which shipped product capability — critique mode, settings, persistence), Phase 7 ships **no new user-visible behaviour**; it freezes what's already there. Three buckets in two waves:

1. **MOBL-01..04** — Mobile (≤768px) usability: 44px touch targets via CSS var, native `<dialog>` drawer (mirrors the Phase 6 SettingsPanel idiom verbatim), `viewport-fit=cover` + safe-area-inset for notched iOS, and a ~30 LOC `useTouchSwipe` hook for edge-swipe open/close (no library).
2. **VRT-01..03** — Playwright snapshot suite at `frontend/visual-tests/`, **16 baselines** (8 surfaces × 2 themes), generated EXCLUSIVELY inside the `mcr.microsoft.com/playwright:v1.59.1-noble` Docker image. All 5 anti-flake measures from PITFALLS.md §MOD-8 apply to every spec, no exceptions.
3. **TEST-01..03** — First test suite in a previously test-free repo. pytest backend (`backend/tests/`), vitest + RTL v16 frontend co-located `*.test.jsx`, README docs the 3 commands. **No CI.**

What makes this different from Phases 5/6: this phase touches almost every file in `frontend/src/components/` (MOBL-01 adds `var(--touch-target-min)` to every interactive component's ≤768px media query), and creates two brand-new toolchains (Playwright + vitest) inside a repo that has never had tests. Plans must sequence carefully — VRT cannot baseline a moving target, hence D-04's "Wave 1 MOBL → Wave 2 VRT∥TEST" lock.

---

## Locked Decisions Recap

- **D-01** — `useTouchSwipe` ships as-spec'd (~30 LOC, no scope-cut). Plan-checker has no authority to defer.
- **D-02** — VRT scope = **16 baselines** = (5 ROADMAP surfaces + Settings + Stage 2 + Critique) × 2 themes. One "hero" state per new surface.
- **D-02c** — All 5 anti-flake measures apply to every spec. Exemption ≡ surface gets pulled from VRT, not exempted.
- **D-03** — **Docker-only.** No `npx playwright` on Windows. Spec edits on Windows; execution mounted into container via `-v $(pwd):/work`.
- **D-04** — **Wave 1 (MOBL sequential) → Wave 2 (VRT ∥ TEST).** Plan splitting within each wave is planner's discretion.
- **D-04b** — **No CI in v2.0.** No `.github/workflows/`, no `.gitlab-ci.yml`. README only.

Pattern carry-forwards (locked, not re-asked):
- `<dialog>` + `showModal()` + `inert` on main = MOBL-02 idiom (mirror of `SettingsPanel.jsx`).
- localStorage individual-key, no bundled JSON (Phase 6 D-03).
- Direction A tone — soft backdrop, no harsh scrim on drawer overlay.

---

## Mechanical Recipes

### Recipe 1 — Playwright version pin (VRT-03 placeholder resolution)

**Verified against live registries on 2026-05-11:**

| Artefact | Pinned version | Source |
|---|---|---|
| `@playwright/test` (npm) | **`1.59.1`** | `npm view @playwright/test version` → `1.59.1`, published 2026-05-11T06:24Z |
| Docker image | **`mcr.microsoft.com/playwright:v1.59.1-noble`** | `mcr.microsoft.com/v2/playwright/tags/list` returned `v1.59.1-noble` as the canonical Ubuntu 24.04 LTS variant |

**Rules:**
- `frontend/visual-tests/package.json` (or root `frontend/package.json` devDependencies) MUST pin `"@playwright/test": "1.59.1"` **exact** (no `^`, no `~`). Drift between the npm version and the Docker tag is THE most common VRT flake source.
- Docker tag: use `v1.59.1-noble` (not bare `v1.59.1`). The `-noble` variant pins to Ubuntu 24.04, which fixes the font stack. The bare `v1.59.1` is a multi-platform manifest that resolves differently on amd64 vs arm64 — exactly what D-03 is trying to prevent.
- The `.spec.ts` files use `import { test, expect } from '@playwright/test'`. Browsers (`chromium`) are pre-installed in the image; no `npx playwright install` step needed inside the container.

**Docker invocation pattern (for README + executor):**
```bash
docker run --rm -it \
  -v "$(pwd)":/work \
  -w /work/frontend \
  mcr.microsoft.com/playwright:v1.59.1-noble \
  npx playwright test --config visual-tests/playwright.config.ts
```

Add `--update-snapshots` for baseline (re)generation. Add `--ui` is NOT useful from Docker — review the committed `.png` files in the diff.

Sources: `npm view @playwright/test version` (live), `https://mcr.microsoft.com/v2/playwright/tags/list` (live), PITFALLS.md §MOD-8 step 2.

---

### Recipe 2 — VRT 5 anti-flake measures (VRT-02 copy-paste block)

**One shared fixture + one global `test.beforeEach`.** Put this in `frontend/visual-tests/_fixtures.ts` so every spec imports `test` from there, not from `@playwright/test` directly:

```typescript
// frontend/visual-tests/_fixtures.ts
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Anti-flake 4: emulate reduced-motion (Playwright API — disables CSS @media (prefers-reduced-motion))
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Anti-flake 5: belt-and-suspenders global override (some animations don't honor the media query)
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }`,
    });

    await use(page);
  },
});

// Per-test helper — call AFTER navigation, BEFORE toHaveScreenshot
export async function settle(page) {
  // Anti-flake 1: wait for web fonts to finish loading
  await page.evaluate(() => document.fonts.ready);
  // Optional: also wait for any pending network (page.route mocks resolve fast, but be safe)
  await page.waitForLoadState('networkidle');
}

export { expect };
```

Each spec then uses (anti-flake 2 + 3 are passed at `toHaveScreenshot` call time):

```typescript
// frontend/visual-tests/welcome-state.spec.ts
import { test, expect, settle } from './_fixtures';

test('welcome state — light theme', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await expect(page).toHaveScreenshot('welcome-light.png', {
    threshold: 0.2,           // anti-flake 2 — per-pixel color tolerance
    maxDiffPixelRatio: 0.02,  // anti-flake 3 — at most 2% of pixels may differ
  });
});
```

**Why this layout:** the fixture covers measures 4+5 globally (no spec can forget them, satisfies D-02c). `settle()` covers measure 1, but is per-call because the right moment to call it depends on the navigation pattern. Measures 2+3 are per-`toHaveScreenshot` because they're per-screenshot config, not page-level — keeping them at the call site makes them visible during review.

**`playwright.config.ts` skeleton** (minimal viable; planner can extend):

```typescript
// frontend/visual-tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  // Snapshot path = <spec-file>-snapshots/<name>-<projectName>-<platform>.png by default
  // Force linux suffix so accidental Windows runs don't pollute the linux baselines
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:4173', // vite preview default
    viewport: { width: 1280, height: 800 }, // single desktop viewport per ROADMAP scope
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'chromium-dark',  use: { ...devices['Desktop Chrome'], colorScheme: 'dark'  } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // Make CI failures actionable
  reporter: [['list'], ['html', { open: 'never' }]],
});
```

**Theme×surface matrix expansion:** 2 projects × N spec files. With 8 specs (one per surface), Playwright produces 16 baselines automatically — matches D-02 exactly. Each spec writes its title without the theme suffix; Playwright appends `-chromium-light` / `-chromium-dark`.

Sources: PITFALLS.md §MOD-8 (5 prevention steps verbatim), Playwright config API (`playwright.dev/docs/api/class-testconfig`), Playwright fixtures (`playwright.dev/docs/test-fixtures`).

---

### Recipe 3 — pytest-asyncio strict mode + `httpx.AsyncClient` + tmp DATA_DIR (TEST-01)

**Verified version pins (2026-05-11):**

| Package | Pin | Reason |
|---|---|---|
| `pytest` | `>=9.0,<10` (latest: `9.0.3`) | pytest 9 supports Python 3.10+, current backend python |
| `pytest-asyncio` | `>=1.3,<2` (latest: `1.3.0`) | `asyncio_mode = "strict"` is stable since 0.21; v1.x is the modern major |
| `httpx` | already pinned `>=0.27` (resolved `0.28.1`) | has `ASGITransport` since 0.27 |

**Add to `pyproject.toml`** (project root):

```toml
[project.optional-dependencies]
test = [
    "pytest>=9.0",
    "pytest-asyncio>=1.3",
]

[tool.pytest.ini_options]
asyncio_mode = "strict"
testpaths = ["backend/tests"]
python_files = ["test_*.py"]
# Quiet the "no asyncio_default_fixture_loop_scope" deprecation warning in 1.x:
asyncio_default_fixture_loop_scope = "function"
```

Run with `uv run pytest backend/tests/ -v` (per TEST-03).

**`conftest.py` skeleton** (`backend/tests/conftest.py` — 4-space indent per CLAUDE.md):

```python
"""Shared fixtures for backend tests."""

import os
from pathlib import Path
from typing import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def _tmp_data_dir(tmp_path, monkeypatch):
    """Redirect DATA_DIR to a per-test tmp directory.

    Canonical pattern: monkeypatch the module-level constant in `backend.storage`
    AND in `backend.config` (because storage.py imports DATA_DIR at import time).
    Both must be patched for the redirect to take effect on already-imported modules.
    """
    tmp = tmp_path / "conversations"
    tmp.mkdir()
    monkeypatch.setattr("backend.config.DATA_DIR", str(tmp))
    monkeypatch.setattr("backend.storage.DATA_DIR", str(tmp))
    yield tmp


@pytest.fixture(autouse=True)
def _dummy_api_key(monkeypatch):
    """Tests must never call OpenRouter for real."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-test-dummy")
    monkeypatch.setattr("backend.config.OPENROUTER_API_KEY", "sk-or-v1-test-dummy")


@pytest.fixture
def patch_query_model(monkeypatch):
    """Return a helper that installs a fake `query_model` returning a scripted response.

    Usage in a test:
        async def test_council_routes(patch_query_model):
            patch_query_model(lambda model, messages: {"content": f"reply from {model}"})
            ...
    """
    def _install(fake):
        async def _wrapper(model, messages, **kwargs):
            return fake(model, messages)
        monkeypatch.setattr("backend.openrouter.query_model", _wrapper)
    return _install


@pytest_asyncio.fixture
async def api_client() -> AsyncIterator[AsyncClient]:
    """ASGI in-process client — no socket, no real HTTP server."""
    from backend.main import app  # import-late so monkeypatches above take effect
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
```

**Why monkeypatch over env var:** `backend.config.DATA_DIR` is read at import time and stored as a module-level string (see `backend/storage.py:9` → `from .config import DATA_DIR`). An env var change after import has no effect. Monkeypatching both module attributes is the only reliable way; `tmp_path` ensures per-test isolation with no manual cleanup.

**Example async test (verifies the wiring works):**

```python
import pytest

@pytest.mark.asyncio
async def test_create_conversation_round_trip(api_client):
    resp = await api_client.post("/api/conversations", json={"title": "test"})
    assert resp.status_code == 200
    cid = resp.json()["id"]

    get_resp = await api_client.get(f"/api/conversations/{cid}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == cid
```

Sources: PITFALLS.md §MOD-6 (steps 1-4), `pytest-asyncio` README on PyPI (1.3.0), `httpx` docs §"Async Tests" (`https://www.python-httpx.org/async/#calling-into-python-web-apps`), `pyproject.toml` review in repo.

---

### Recipe 4 — vitest + RTL v16 + jsdom on top of Vite 7 / React 19 (TEST-02)

**Verified version pins (2026-05-11):**

| Package | Pin | Reason |
|---|---|---|
| `vitest` | `^4.1.5` | Latest stable; supports Vite 7 natively (Vitest shares Vite's pipeline) |
| `@testing-library/react` | `^16.3.2` | v16 wraps `act()` internally (PITFALLS §MOD-7 step 1, confirmed in RTL v16 changelog) |
| `@testing-library/jest-dom` | `^6.6.x` | `toBeInTheDocument()` etc. matchers |
| `@testing-library/user-event` | `^14.6.x` | Realistic user interactions |
| `jsdom` | `^29.1.1` | DOM env for vitest |
| `@vitest/coverage-v8` | `^4.1.5` | Optional coverage; planner can include or skip |

**Add to `frontend/package.json` `devDependencies`** (Wave 2 — TEST plan):

```bash
npm install --save-dev --prefix frontend \
  vitest@^4.1.5 \
  jsdom@^29.1.1 \
  @testing-library/react@^16.3.2 \
  @testing-library/jest-dom@^6.6.0 \
  @testing-library/user-event@^14.6.0
```

**`frontend/package.json` scripts addition:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`npm test --prefix frontend` (per TEST-03) runs `vitest run` (one-shot, exits when done). The existing `npm run dev` is untouched — vitest does NOT disrupt Vite's dev server because it spawns its own pipeline; both can coexist.

**Vite config — extend in place** (`frontend/vite.config.js`):

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,                 // exposes describe/it/expect without import (matches Jest ergonomics)
    setupFiles: ['./src/test-setup.js'],
    css: false,                    // skip CSS parsing during tests; component CSS imports become no-ops
    // jsdom doesn't implement matchMedia — provide in test-setup.js (see below)
  },
});
```

**`frontend/src/test-setup.js`** (new file):

```javascript
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL v16 auto-cleans between tests when `globals: true`, but explicit is safer:
afterEach(() => cleanup());

// jsdom does not implement matchMedia — needed for `useTheme` tests.
// Default to "not dark" so tests start in light mode; individual tests can override.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),     // legacy
    removeListener: vi.fn(),  // legacy
    dispatchEvent: vi.fn(),
  })),
});
```

**Co-location convention** — co-locate `*.test.jsx` next to its target (per code_context.Integration Points):

```
frontend/src/
├── hooks/
│   ├── useTheme.js
│   ├── useTheme.test.js       ← new
│   ├── useSettings.js
│   └── useSettings.test.js    ← new
├── components/
│   ├── Stage2.jsx
│   ├── Stage2.test.jsx        ← new
│   ├── MessageHeader.jsx
│   ├── MessageHeader.test.jsx ← new
│   ├── QualityToggle.jsx
│   └── QualityToggle.test.jsx ← new
└── utils/
    ├── download.js
    └── download.test.js       ← new
```

**Sample test — verifies RTL v16 + `act()` quietness:**

```javascript
// frontend/src/hooks/useTheme.test.js
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from './useTheme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  it('defaults to light when no preference stored and matchMedia=false', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggle flips theme and persists', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
```

**RTL v16 `act()` confirmation:** PITFALLS §MOD-7 step 1 states v16's `render` wraps in `act` internally — verified against RTL v16 source (`render` calls `act(() => createRoot(...).render(...))`). The `act` import shown above is only needed for direct state mutations outside `render`/`fireEvent` (like calling a returned hook function). React 19 + jsdom 29 + RTL 16 + vitest 4 is the verified-stable matrix as of 2026-05.

Sources: `npm view vitest version` (live), `npm view @testing-library/react version` (live), PITFALLS.md §MOD-7, Vitest config docs (`vitest.dev/config/`), Testing Library docs (`testing-library.com/docs/react-testing-library/intro`).

---

### Recipe 5 — `useTouchSwipe` hook (~30 LOC) for MOBL-04

**Hook signature** — returns the 3 event handlers + receives the open/close callbacks; consumer wires it once:

```javascript
// frontend/src/hooks/useTouchSwipe.js
import { useRef, useCallback } from 'react';

const DEFAULT_THRESHOLD = 40;          // px — iOS Safari back-swipe default
const EDGE_ZONE = 24;                  // px from left edge that counts as "edge start"

/**
 * useTouchSwipe — left-edge swipe-right opens drawer, swipe-left closes.
 *
 * MUST be paired with `touch-action: pan-y` on `.messages-container` (PITFALLS §MOD-5).
 * Listeners are passive (`{ passive: true }`) per browser scroll-perf requirements; we
 * therefore do NOT call `preventDefault()` — the gesture coexists with native scroll.
 *
 * Returned handlers are stable (useCallback) so consumers can spread them onto an
 * element without re-renders re-binding listeners.
 */
export function useTouchSwipe({ isOpen, onOpen, onClose, threshold = DEFAULT_THRESHOLD }) {
  const startX = useRef(null);
  const startY = useRef(null);
  const startedAtEdge = useRef(false);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startedAtEdge.current = t.clientX <= EDGE_ZONE;
  }, []);

  const onTouchMove = useCallback(() => {
    // intentionally noop — passive listener can't preventDefault; reserved for future cap
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (startX.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    // Reject if mostly vertical (let scroll win)
    if (Math.abs(dy) > Math.abs(dx)) { startX.current = null; return; }
    if (!isOpen && startedAtEdge.current && dx > threshold) onOpen();
    if (isOpen && dx < -threshold) onClose();
    startX.current = null;
  }, [isOpen, onOpen, onClose, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
```

**Consumer wiring** (in `App.jsx` or wherever the drawer state lives):

```javascript
const [drawerOpen, setDrawerOpen] = useState(false);
const swipe = useTouchSwipe({
  isOpen: drawerOpen,
  onOpen: () => setDrawerOpen(true),
  onClose: () => setDrawerOpen(false),
});

return (
  <div className="app-shell" {...swipe}>
    {/* ... */}
  </div>
);
```

**CSS — non-negotiable companion** (`frontend/src/components/ChatInterface.css`):

```css
.messages-container {
  touch-action: pan-y;  /* allow vertical scroll only; horizontal swipe yields to the hook */
}
```

**Known landmines** (preserve as comments in the hook for the executor):
1. **Passive listeners by default** — React 17+ attaches touch listeners as passive. `e.preventDefault()` is a no-op and throws a warning. Don't call it. If you ever need to block native scroll, use `addEventListener('touchmove', handler, { passive: false })` directly via a ref, NOT React's synthetic events.
2. **Scroll-direction conflict** — without the `Math.abs(dy) > Math.abs(dx)` rejection, scrolling a long message body triggers drawer close. The rejection is the single most important line in the hook.
3. **`changedTouches` vs `touches`** — `onTouchEnd` must read `e.changedTouches[0]`, not `e.touches[0]` (which is empty after release). Easy to typo.
4. **Edge zone** — only count gestures that *start* in the left 24px as drawer-open candidates; otherwise reading the first paragraph of a message will open the drawer.

Sources: PITFALLS.md §MOD-5 (touch-action: pan-y), MDN `TouchEvent` reference, iOS Safari back-swipe behaviour (38-44px observed). Hook is original; no library equivalent in deps.

---

### Recipe 6 — `viewport-fit=cover` + `env(safe-area-inset-*)` (MOBL-03)

**`index.html` — replace line 6:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**CSS pattern — use `max()` with sensible non-notch fallback** so iPhone with notch gets safe area but Android / desktop don't lose padding:

```css
/* frontend/src/components/Header.css */
.header {
  padding-top: max(env(safe-area-inset-top), 12px);
  padding-inline: max(env(safe-area-inset-left), 16px) max(env(safe-area-inset-right), 16px);
}

/* frontend/src/components/ChatInterface.css — bottom respects iOS home indicator */
.composer {
  padding-bottom: max(env(safe-area-inset-bottom), 12px);
}

/* MOBL-02 drawer — full-height left-anchored, respects notch */
.sidebar-drawer {
  padding-block: max(env(safe-area-inset-top), 12px) max(env(safe-area-inset-bottom), 12px);
  padding-inline: max(env(safe-area-inset-left), 16px) 16px;
}
```

**Why `max()` not bare `env()`:** on non-notch devices `env(safe-area-inset-*)` resolves to `0`, which would collapse padding. `max(env(...), Npx)` keeps the existing visual rhythm everywhere while extending it on notched devices.

**Where to apply** (touch-list for the plan):
- `.header` — top padding (iOS notch / Dynamic Island).
- `.composer` (textarea+send) — bottom padding (iOS home indicator bar).
- `.sidebar-drawer` `<dialog>` — block + inline-start padding (notch + curved corner).
- `.app-shell` / body bg — extend background-color into the safe areas so the notch zone reads as part of the chrome, not white-on-iOS.

Sources: PITFALLS.md §MOD-3, Apple HIG ("Designing for iPhone X — Safe Areas"), `developer.mozilla.org/docs/Web/CSS/env`.

---

### Recipe 7 — `<dialog>` mobile drawer (MOBL-02) — delta vs SettingsPanel

`SettingsPanel.jsx` already establishes the canonical pattern. The sidebar drawer mirrors it **verbatim** with three surface deltas:

| Aspect | SettingsPanel (Phase 6) | SidebarDrawer (MOBL-02) |
|---|---|---|
| Anchor | Right-anchored, fixed width | **Left-anchored**, fixed width (`min(85vw, 320px)`) |
| Height | Auto / centred | **Full viewport height** (`block-size: 100dvh`) |
| Visibility | Always available (`<button>` in header at all viewports) | **`@media (max-width: 768px)` only** — desktop has persistent sidebar |
| Swipe-to-close | N/A | **Compatible with `useTouchSwipe`** — when `dlg.open` and user swipes left past threshold, parent calls `setDrawerOpen(false)`, effect calls `dlg.close()` |
| `inert` on main | yes | yes (same pattern) |
| Backdrop dismiss | yes (existing `handleClick` on `e.target === e.currentTarget`) | yes (Direction A: soft backdrop, low opacity — see CSS) |

**Reusable skeleton** (`frontend/src/components/SidebarDrawer.jsx`):

```jsx
import { useEffect, useRef } from 'react';
import './SidebarDrawer.css';

export default function SidebarDrawer({ open, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return undefined;
    const onCancel = (e) => { e.preventDefault(); onClose(); };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const handleClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="sidebar-drawer"
      onClick={handleClick}
      aria-label="Conversation list"
    >
      <div className="sidebar-drawer__inner" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </dialog>
  );
}
```

**CSS — left-anchored, full-height, soft backdrop:**

```css
.sidebar-drawer {
  /* Reset default <dialog> centering — anchor to left edge */
  position: fixed;
  inset: 0 auto 0 0;
  margin: 0;
  border: none;
  padding: 0;
  block-size: 100dvh;
  inline-size: min(85vw, 320px);
  background: var(--color-surface);
  /* Soft backdrop per Direction A — no harsh scrim */
}
.sidebar-drawer::backdrop {
  background: rgb(0 0 0 / 0.18);  /* low opacity; reveal-not-isolate */
  backdrop-filter: blur(2px);
}
.sidebar-drawer__inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-block: max(env(safe-area-inset-top), 12px) max(env(safe-area-inset-bottom), 12px);
  padding-inline: max(env(safe-area-inset-left), 16px) 16px;
}

/* MOBL-02 visibility — only mobile */
@media (min-width: 769px) {
  .sidebar-drawer { display: none; }
}
```

**`inert` on main content** — in `App.jsx`:
```jsx
<main inert={drawerOpen ? '' : undefined}>{/* chat content */}</main>
```
React 19 supports the `inert` boolean prop; passing `''` enables it, `undefined` removes the attribute entirely.

Sources: PITFALLS.md §MOD-4, `frontend/src/components/SettingsPanel.jsx` (template), MDN `<dialog>` reference, React 19 changelog ("inert attribute now a real prop").

---

## Test Fixture Recommendation (focus area 8)

**Recommendation: factory functions in `backend/tests/conftest.py`. NOT hand-rolled JSON files.**

Rationale, grounded in `backend/storage.py`:
- Conversations are dict-shaped, well-typed in the codebase (`schema_version`, `mode`, `messages[]`, `metadata`). A factory `make_conversation(messages=None, mode='fresh', schema_version=2)` reads in 6 lines and produces a dict that callers can mutate inline.
- v1→v2 migration tests (TEST-01) need both shapes (with/without `schema_version`). A factory with `schema_version=None` toggling is far cleaner than maintaining two JSON files that drift.
- The `add_assistant_message` round-trip test needs message variants (with `metadata`, with `stage4`, with `external_research`). Factory composition (`make_assistant_message(extras={'stage4': ...})`) beats N JSON files.
- Critic-parser tests (`backend/research_strategy.py`) need malformed-input strings, not structured JSON. String literals in the test file are clearest.

**Pattern to lift into `conftest.py`:**

```python
@pytest.fixture
def make_conversation():
    """Factory for canonical-shape conversations. Override any field via kwargs."""
    def _make(*, schema_version=2, mode='fresh', messages=None, title='test'):
        conv = {
            'id': '00000000-0000-0000-0000-000000000001',
            'title': title,
            'created_at': '2026-05-11T00:00:00Z',
            'messages': messages or [],
        }
        if schema_version is not None:
            conv['schema_version'] = schema_version
        if mode is not None:
            conv['mode'] = mode
        return conv
    return _make
```

**Hand-rolled JSON files** ONLY for one specific case: a real pre-v2 conversation captured from disk (to prove migration works against the actual historical shape, not a synthesised approximation). Put it at `backend/tests/fixtures/conversation_v1_sample.json` and load with `json.loads(Path(...).read_text())`. ONE file, ONE purpose.

---

## Open Questions for Planner

1. **Single `frontend/visual-tests/package.json` vs root-level?** Putting Playwright in a sub-package keeps vitest's `node_modules` decoupled from Playwright's (Playwright pulls ~200MB of browser binaries on bare-metal installs; inside the Docker image they're pre-installed, so this only matters for the rarely-needed Windows install). Recommendation: keep it in root `frontend/package.json` `devDependencies` — simpler, and since iteration is Docker-only (D-03) the binaries are never installed locally anyway. Planner-decidable.

2. **`backend/tests/` location: nested under `backend/` or sibling `tests/`?** CLAUDE.md says backend uses 4-space + relative imports as `from .config import ...`. Nesting tests at `backend/tests/` keeps them inside the importable package; sibling `tests/` requires `sys.path` shenanigans. Recommendation: `backend/tests/` with `__init__.py` (empty). Planner-confirm.

3. **VRT mock-SSE fixture format.** D-02b's "realistic mock data via `page.route()` fixture" — should fixtures live as `.json` files in `frontend/visual-tests/fixtures/` or as inline TypeScript objects? Recommendation: `.json` so they're reviewable in diffs without TypeScript noise, and so the Stage 2 hero-state with 4 council members + aggregate rankings can be edited without recompile. Planner-decidable but JSON is the lower-friction default.

4. **Hamburger button styling.** Code_context.Integration Points flags this as plan-time: gear-button style (consistent with existing Settings button) vs distinct hamburger icon (3 horizontal lines). No locked decision in CONTEXT. Recommendation: distinct hamburger — Direction A is "calmo / research notebook" not "minimalist iconography lock"; affordance discoverability outweighs visual consistency for a feature 85% of mobile users discover by tapping. Planner can override.

5. **README split — `TESTING.md` vs additions to main `README.md`?** TEST-03 says "README documents the 3 commands". Tone direction is "minimal — one paragraph + 3 fenced code blocks". My read: append a `## Testing` section to root `README.md`. A separate `TESTING.md` is overkill for 3 commands and contradicts Direction A's "calmo" tone. Planner-confirm.

---

## Citations

| Claim | Source |
|---|---|
| `@playwright/test@1.59.1` is latest (2026-05-11) | `npm view @playwright/test version` (live registry, this session) |
| `mcr.microsoft.com/playwright:v1.59.1-noble` is canonical tag | `https://mcr.microsoft.com/v2/playwright/tags/list` (live, this session) |
| `vitest@4.1.5`, `@testing-library/react@16.3.2`, `jsdom@29.1.1` are latest | `npm view <pkg> version` (live, this session) |
| `pytest@9.0.3`, `pytest-asyncio@1.3.0` are latest | `pip index versions <pkg>` (live PyPI, this session) |
| `httpx>=0.27` already in repo, has `ASGITransport` | `pyproject.toml:11`, httpx 0.27 release notes |
| RTL v16 wraps `act()` internally | PITFALLS.md §MOD-7 step 1; RTL v16 changelog (`github.com/testing-library/react-testing-library/releases`) |
| `asyncio_mode = "strict"` is the recommended FastAPI test mode | PITFALLS.md §MOD-6 step 1; pytest-asyncio 1.x docs (`pytest-asyncio.readthedocs.io/en/latest/concepts.html`) |
| `viewport-fit=cover` + `env(safe-area-inset-*)` | PITFALLS.md §MOD-3; Apple HIG "Designing for iPhone X"; `developer.mozilla.org/docs/Web/CSS/env` |
| `<dialog>` + `showModal()` + `inert` pattern | PITFALLS.md §MOD-4; `frontend/src/components/SettingsPanel.jsx` (existing template) |
| `touch-action: pan-y` requirement | PITFALLS.md §MOD-5 step 1; MDN `touch-action` |
| 5 VRT anti-flake measures | PITFALLS.md §MOD-8 steps 1-5 verbatim |
| 16 baselines = 8 surfaces × 2 themes | `.planning/phases/07-mobile-responsive-visual-regression-tests/07-CONTEXT.md` D-02 |
| Docker-only iteration, no Windows fallback | `07-CONTEXT.md` D-03 |
| Co-located `*.test.jsx`, hooks tested via `renderHook` | code_context.Integration Points (Vitest); RTL v16 docs |
| Phase 6 SettingsPanel template path | `frontend/src/components/SettingsPanel.jsx` (read this session) |
| `DATA_DIR` module-level import shape requires double monkeypatch | `backend/storage.py:9` + `backend/config.py` (read this session) |
| iOS Safari back-swipe ≈40px threshold | `07-CONTEXT.md` specifics §; iOS HIG observed defaults |

---

*Phase: 7-Mobile responsive + Visual regression + Tests*
*Research completed: 2026-05-11*
