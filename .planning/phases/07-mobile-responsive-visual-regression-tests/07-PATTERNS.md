# Phase 7: Mobile responsive + Visual regression + Tests — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 22 new / 5 modified
**Analogs found:** 25 / 27

---

## File Classification

### Wave 1 — Mobile (MOBL-01..04)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/index.css` (MODIFY) | config (design tokens) | static | `frontend/src/index.css:49-120` (existing `:root` block) | exact (same file) |
| `frontend/index.html` (MODIFY) | config | static | `frontend/index.html:6` (existing viewport meta) | exact (same file) |
| `frontend/src/components/SidebarDrawer.jsx` (NEW) | component | request-response (open/close state) | `frontend/src/components/SettingsPanel.jsx` | exact |
| `frontend/src/components/SidebarDrawer.css` (NEW) | style | static | `frontend/src/components/SettingsPanel.css` + Direction A backdrop delta | exact |
| `frontend/src/hooks/useTouchSwipe.js` (NEW) | hook | event-driven (touch events) | `frontend/src/hooks/useTheme.js` (shape + cleanup) | role-match |
| `frontend/src/components/Header.jsx` (MODIFY) | component | request-response (button → parent callback) | `frontend/src/components/Header.jsx:61-69` (existing gear button) | exact (same file) |
| `frontend/src/components/Header.css` (MODIFY) | style | static | `frontend/src/components/Header.css` (existing) + safe-area additions | exact (same file) |
| `frontend/src/components/ChatInterface.css` (MODIFY) | style | static | existing `.messages-container` (line 19-23) — adds `touch-action` + safe-area | exact (same file) |
| `frontend/src/components/Sidebar.css` (MODIFY) | style | static | existing tokens at top of file — adds `--touch-target-min` consumption inside ≤768px media query | exact (same file) |
| `frontend/src/components/QualityToggle.css` (MODIFY) | style | static | existing — adds touch-target min on `.quality-option` for ≤768px | exact (same file) |
| `frontend/src/App.jsx` (MODIFY) | provider | request-response | `frontend/src/App.jsx:24,494-495` (existing `settingsOpen` wiring) | exact (same file) |
| `frontend/src/App.css` (MODIFY) | style | static | `frontend/src/App.css:54-76` (existing ≤768px media query) | exact (same file) |

### Wave 2 — VRT (VRT-01..03)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/visual-tests/playwright.config.ts` (NEW) | config | n/a | none in repo — use RESEARCH.md Recipe 1 verbatim | no-analog |
| `frontend/visual-tests/_fixtures.ts` (NEW) | test fixture | event-driven | none — RESEARCH.md Recipe 2 verbatim | no-analog |
| `frontend/visual-tests/welcome-state.spec.ts` (NEW) | test | request-response (navigation + screenshot) | RESEARCH.md Recipe 2 sample | no-analog |
| `frontend/visual-tests/stage3-highlight.spec.ts` (NEW) | test | request-response | same as above | no-analog |
| `frontend/visual-tests/error-banner.spec.ts` (NEW) | test | request-response | same as above | no-analog |
| `frontend/visual-tests/sidebar-empty.spec.ts` (NEW) | test | request-response | same as above | no-analog |
| `frontend/visual-tests/theme-toggle.spec.ts` (NEW) | test | request-response | same as above | no-analog |
| `frontend/visual-tests/settings-panel.spec.ts` (NEW) | test | request-response | same + `page.route()` for SET state | no-analog |
| `frontend/visual-tests/stage2-rankings.spec.ts` (NEW) | test | request-response | same + `page.route()` for mock SSE | no-analog |
| `frontend/visual-tests/critique-loaded.spec.ts` (NEW) | test | request-response | same + `page.route()` for files-loaded fixture | no-analog |
| `frontend/visual-tests/fixtures/*.json` (NEW) | test data | static | none — see "No Analog Found" | no-analog |
| `frontend/package.json` (MODIFY) | config | static | existing `devDependencies` block | exact (same file) |

### Wave 2 — TEST (TEST-01..03)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `pyproject.toml` (MODIFY) | config | static | existing `[project]` block | exact (same file) |
| `backend/tests/__init__.py` (NEW) | package marker | n/a | `backend/__init__.py` | exact |
| `backend/tests/conftest.py` (NEW) | test fixture | event-driven | RESEARCH.md Recipe 3 verbatim; consumes `backend/storage.py:9` import shape | role-match |
| `backend/tests/test_storage.py` (NEW) | test | CRUD | direct target: `backend/storage.py` (`get_conversation_path`, `add_assistant_message`, `_migrate_conversation_if_needed`) | role-match |
| `backend/tests/test_council_profile.py` (NEW) | test | request-response | direct target: `backend/council.py` profile routing | role-match |
| `backend/tests/test_research_strategy.py` (NEW) | test | transform (parser) | direct target: `backend/research_strategy.py:112` (`parse_critic_score`) | role-match |
| `backend/tests/fixtures/conversation_v1_sample.json` (NEW) | test data | static | none — synthesize from `backend/storage.py:91-123` shape minus v2 fields | no-analog |
| `frontend/vite.config.js` (MODIFY) | config | static | existing 7-line config | exact (same file) |
| `frontend/src/test-setup.js` (NEW) | config | n/a | none — RESEARCH.md Recipe 4 verbatim | no-analog |
| `frontend/src/hooks/useTheme.test.js` (NEW) | test | event-driven (matchMedia mock + localStorage) | direct target: `frontend/src/hooks/useTheme.js` | role-match |
| `frontend/src/hooks/useSettings.test.js` (NEW) | test | event-driven (localStorage round-trip) | direct target: `frontend/src/hooks/useSettings.js` | role-match |
| `frontend/src/components/MessageHeader.test.jsx` (NEW) | test | request-response (render + assert) | direct target: `frontend/src/components/MessageHeader.jsx:23-62` | role-match |
| `frontend/src/components/QualityToggle.test.jsx` (NEW) | test | event-driven (click + onChange) | direct target: `frontend/src/components/QualityToggle.jsx` | role-match |
| `frontend/src/components/Stage2.test.jsx` (NEW) | test | request-response | direct target: `frontend/src/components/Stage2.jsx:5-15` (`deAnonymizeText`) | role-match |
| `frontend/src/utils/download.test.js` (NEW) | test | transform (pure helpers) | direct target: `frontend/src/utils/download.js` | role-match |
| `README.md` (MODIFY) | docs | static | existing `## Setup` section style | exact (same file) |

---

## Pattern Assignments

### `frontend/src/components/SidebarDrawer.jsx` (component, request-response)

**Analog:** `frontend/src/components/SettingsPanel.jsx` (lines 1-38, 43-53)

**Imports pattern** (SettingsPanel.jsx:1-4 — mirror exactly):
```jsx
import { useEffect, useRef } from 'react';
import './SidebarDrawer.css';
```

**`<dialog>` showModal/close effect** (SettingsPanel.jsx:18-23 — copy verbatim, no changes):
```jsx
useEffect(() => {
  const dlg = dialogRef.current;
  if (!dlg) return;
  if (open && !dlg.open) dlg.showModal();
  if (!open && dlg.open) dlg.close();
}, [open]);
```

**ESC / backdrop dismiss pattern** (SettingsPanel.jsx:25-38 — copy verbatim):
```jsx
useEffect(() => {
  const dlg = dialogRef.current;
  if (!dlg) return undefined;
  const onCancel = (e) => {
    e.preventDefault();
    onClose();
  };
  dlg.addEventListener('cancel', onCancel);
  return () => dlg.removeEventListener('cancel', onCancel);
}, [onClose]);

const handleClick = (e) => {
  if (e.target === e.currentTarget) onClose();
};
```

**Dialog element + inner wrapper** (SettingsPanel.jsx:43-53 — adapt aria-label):
```jsx
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
```

**Surface deltas vs SettingsPanel** (per RESEARCH.md Recipe 7):
- Left-anchored, full `100dvh`, `inline-size: min(85vw, 320px)`.
- Soft backdrop (`rgb(0 0 0 / 0.18)` + `backdrop-filter: blur(2px)`) per Direction A, not transparent like SettingsPanel.
- Wrapped in `@media (min-width: 769px) { display: none }` — desktop keeps persistent sidebar.
- Props: `{ open, onClose, children }` — sidebar list is passed as `children` from `App.jsx`, NOT re-implemented inside the drawer (separation of concerns).

---

### `frontend/src/components/SidebarDrawer.css` (style, static)

**Analog:** `frontend/src/components/SettingsPanel.css` (full file — same structural pattern)

**Anchor + sizing block** (delta vs SettingsPanel.css:1-26):
```css
.sidebar-drawer {
  position: fixed;
  inset: 0 auto 0 0;             /* left-anchored, not right */
  margin: 0;
  border: none;
  padding: 0;
  block-size: 100dvh;             /* full viewport, not header-offset */
  inline-size: min(85vw, 320px);
  background: var(--color-bg-elevated);
  color: var(--color-fg-primary);
}

.sidebar-drawer::backdrop {
  background: rgb(0 0 0 / 0.18);  /* Direction A soft scrim — reveal, don't isolate */
  backdrop-filter: blur(2px);
}
```

**Inner padding with safe-area** (NEW — combines SettingsPanel.css:28-36 + Recipe 6):
```css
.sidebar-drawer__inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-block: max(env(safe-area-inset-top), 12px) max(env(safe-area-inset-bottom), 12px);
  padding-inline: max(env(safe-area-inset-left), 16px) 16px;
  overflow-y: auto;
  box-sizing: border-box;
}

@media (min-width: 769px) {
  .sidebar-drawer { display: none; }
}
```

**Focus-visible pattern** (SettingsPanel.css:169-173 — copy verbatim):
```css
.sidebar-drawer button:focus-visible,
.sidebar-drawer input:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

---

### `frontend/src/hooks/useTouchSwipe.js` (hook, event-driven)

**Analog:** `frontend/src/hooks/useTheme.js` (lines 1, 51-94 — hook shape + cleanup discipline)

**Module header docstring pattern** (useTheme.js:3-19 — mirror tone, "calmo", explains contract):
```javascript
/**
 * useTouchSwipe — left-edge swipe-right opens drawer, swipe-left closes.
 *
 * MUST be paired with `touch-action: pan-y` on `.messages-container` so
 * vertical scrolling wins over horizontal gestures (PITFALLS §MOD-5).
 *
 * Listeners are passive — `preventDefault()` is a no-op and is never called.
 * Returned handlers are stable (useCallback) so consumers can spread them
 * without re-binding on every render.
 *
 * Public API: { onTouchStart, onTouchMove, onTouchEnd }.
 */
```

**Module-level constants pattern** (useSettings.js:3-8 — UPPER_SNAKE for constants):
```javascript
const DEFAULT_THRESHOLD = 40;   // px — iOS Safari back-swipe default
const EDGE_ZONE = 24;           // px — only swipes starting in this left strip open the drawer
```

**Imports pattern** (useTheme.js:1 — same imports):
```javascript
import { useRef, useCallback } from 'react';
```

**Hook body** — see RESEARCH.md Recipe 5 lines 428-457 verbatim. Notable points the executor MUST preserve:
- `useRef` for `startX` / `startY` / `startedAtEdge` (not `useState` — no re-render needed).
- `useCallback` with explicit deps `[isOpen, onOpen, onClose, threshold]` mirrors useTheme.js:79-91 stability discipline.
- `Math.abs(dy) > Math.abs(dx)` reject branch — single most important line; without it scrolling triggers drawer close.
- `e.changedTouches[0]` in `onTouchEnd` (not `e.touches[0]`).

**No localStorage** — unlike useTheme/useSettings, this hook is stateless across reloads.

---

### `frontend/src/components/Header.jsx` (MODIFY — add hamburger button)

**Analog:** `frontend/src/components/Header.jsx:61-69` (existing gear-icon settings button)

**Add new button after the gear button** (mirror exact structure, swap icon + handler + aria-label):
```jsx
<button
  type="button"
  className="app-header__menu-toggle"
  onClick={onMenuOpen}
  aria-label="Open conversation list"
  title="Open conversation list"
>
  <MenuIcon />
</button>
```

**Add hamburger icon component** at file bottom, mirroring `GearIcon` (Header.jsx:112-129) structure — 24×24 viewBox, `currentColor`, 3 horizontal `<path>` lines per RESEARCH.md Open Question 4 recommendation ("distinct hamburger").

**Visibility gate** — handle in `Header.css`:
```css
@media (min-width: 769px) {
  .app-header__menu-toggle { display: none; }
}
.app-header__menu-toggle {
  /* mirror .app-header__settings-toggle styling — same 32×32 box, transparent bg */
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
}
```

**Prop addition** — `Header` signature becomes `{ onSettingsOpen, onMenuOpen }`. App.jsx wires `onMenuOpen={() => setDrawerOpen(true)}` (mirrors existing `onSettingsOpen` wiring at App.jsx:494).

---

### `frontend/src/index.css` (MODIFY — add `--touch-target-min` token)

**Analog:** `frontend/src/index.css:49-120` (existing `:root` token block)

**Token insertion** — add inside `:root { ... }` next to existing `--layout-*` constants (index.css:95-99):
```css
:root {
  /* ... existing layout tokens ... */
  --layout-header-h: 52px;
  --layout-sidebar-w: 280px;
  --layout-content-max-w: 65ch;
  --layout-content-padding: clamp(24px, 5vw, 64px);

  /* MOBL-01 — minimum touch target per WCAG 2.5.5 + iOS HIG 44pt. */
  --touch-target-min: 44px;
}
```

No dark-mode override (touch target is geometry, not color).

---

### `frontend/index.html` (MODIFY — viewport-fit=cover)

**Analog:** `frontend/index.html:6` (existing viewport meta)

**Replace line 6** (RESEARCH.md Recipe 6):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Rest of FOUC blocker (lines 8-31) untouched.

---

### `frontend/src/components/Header.css` / `ChatInterface.css` (MODIFY — safe-area)

**Analog:** `Header.css:3-11` and `ChatInterface.css:19-23` (existing rules)

**Header padding-top** (Header.css:3-11 — add `max(env(...))`):
```css
.app-header {
  padding: 0 var(--space-4);
  padding-top: max(env(safe-area-inset-top), 0px);
  padding-inline: max(env(safe-area-inset-left), var(--space-4))
                  max(env(safe-area-inset-right), var(--space-4));
  height: calc(var(--layout-header-h) + env(safe-area-inset-top, 0px));
  /* ... existing background, border-bottom ... */
}
```

**ChatInterface — composer bottom + messages-container touch-action** (ChatInterface.css:19-23):
```css
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  touch-action: pan-y;  /* MOBL-04 — yield horizontal swipes to useTouchSwipe */
}

/* When/if a .composer class exists (or whatever wraps the textarea row) */
.composer {
  padding-bottom: max(env(safe-area-inset-bottom), var(--space-3));
}
```

**Rationale for `max()` not bare `env()`** (RESEARCH.md Recipe 6): on non-notch devices `env(safe-area-inset-*)` resolves to `0`, which would collapse padding. Keep visual rhythm everywhere; extend only on notched devices.

---

### `frontend/src/App.css` (MODIFY — drawer state + touch-target gating)

**Analog:** `frontend/src/App.css:54-76` (existing `@media (max-width: 768px)` block)

The current ≤768px block already does `transform: translateX(-100%)` on `.sidebar` and reveals on `[data-open="true"]`. This pre-existing pattern is **replaced** by the native `<dialog>` drawer — leave the rule structure but swap target from `.sidebar` to a no-op (drawer manages its own visibility through `dlg.showModal()`). Add touch-target enforcement:

```css
@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;
  }
  .app > .sidebar {
    /* Desktop sidebar hidden on mobile — drawer takes over (mounted at root via App.jsx). */
    display: none;
  }
  .app > .app__main-with-banner {
    grid-column: 1;
  }
  /* MOBL-01 — touch-target enforcement (44×44 floor) for every interactive control */
  button, [role='button'], a, input[type='radio'], input[type='checkbox'],
  .conversation-item, .quality-option {
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
  }
}
```

---

### `frontend/src/App.jsx` (MODIFY — drawer state + touch swipe wiring)

**Analog:** `frontend/src/App.jsx:24,494-495` (existing `settingsOpen` state + SettingsPanel mount)

**State pattern** (App.jsx:24 — mirror exactly):
```jsx
const [drawerOpen, setDrawerOpen] = useState(false);
const swipe = useTouchSwipe({
  isOpen: drawerOpen,
  onOpen: () => setDrawerOpen(true),
  onClose: () => setDrawerOpen(false),
});
```

**Render delta** (App.jsx:492-524 — wrap with swipe handlers + mount drawer):
```jsx
return (
  <div className="app" {...swipe}>
    <Header
      onSettingsOpen={() => setSettingsOpen(true)}
      onMenuOpen={() => setDrawerOpen(true)}
    />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => { handleSelectConversation(id); setDrawerOpen(false); }}
        onNewConversation={() => { handleNewConversation(); setDrawerOpen(false); }}
        onNewCritiqueConversation={() => { handleNewCritiqueConversation(); setDrawerOpen(false); }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        refreshTrigger={costStatsRefreshTrigger}
      />
    </SidebarDrawer>
    {/* desktop sidebar — hidden by App.css ≤768px rule */}
    <Sidebar /* same props ... */ />
    <main inert={drawerOpen ? '' : undefined} className="app__main-with-banner">
      {/* existing content ... */}
    </main>
  </div>
);
```

**`inert` prop on main** — React 19 supports passing `''` to enable, `undefined` to remove (Recipe 7).

Plan-time decision: rather than duplicate `<Sidebar>`, the cleanest split is to mount ONE Sidebar inside the drawer and rely on the `@media (min-width: 769px) { .sidebar-drawer { display: block } }` flip so the drawer becomes the persistent sidebar on desktop. Planner picks — RESEARCH.md prefers the duplication path because the existing `.app > .sidebar` grid rule keeps desktop layout untouched.

---

## VRT Pattern Assignments

### `frontend/visual-tests/playwright.config.ts`

**No analog in repo.** Copy from RESEARCH.md Recipe 1 / Recipe 2 lines 125-151 verbatim. Pin `@playwright/test@1.59.1` (exact, no `^`/`~`) in `frontend/package.json` devDependencies. Docker image: `mcr.microsoft.com/playwright:v1.59.1-noble`.

**Critical config field** — `snapshotPathTemplate` forces consistent paths so accidental Windows runs don't pollute the Linux baselines:
```typescript
snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
```

### `frontend/visual-tests/_fixtures.ts`

**No analog in repo.** Copy from RESEARCH.md Recipe 2 lines 72-103 verbatim. This file centralises anti-flake measures 4+5 (`reducedMotion` + global animation/transition override) so no individual spec can forget them — directly satisfies D-02c ("no exemption").

### `frontend/visual-tests/*.spec.ts` (8 files)

**Pattern per spec** (Recipe 2 sample lines 107-119):
```typescript
import { test, expect, settle } from './_fixtures';

test('welcome state', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await expect(page).toHaveScreenshot('welcome.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
```

The two `projects` (`chromium-light` / `chromium-dark`) declared in `playwright.config.ts` automatically expand 8 specs × 2 themes → 16 baselines (D-02).

**Per-surface deltas** (mock data via `page.route()`):
- `settings-panel.spec.ts` — navigate to `/` and click gear button to open SettingsPanel (no SSE mock needed).
- `stage2-rankings.spec.ts` — intercept `/api/conversations/{id}/message` SSE; replay the JSON fixture below.
- `critique-loaded.spec.ts` — pre-stage 3 mock files into the slot UI via `page.evaluate` or use the existing `DropZoneSlot` mount path with `FileSystemHandle` stubs.

---

## Backend TEST Pattern Assignments

### `backend/tests/conftest.py` (test fixture, event-driven)

**No analog in repo (codebase is test-free).** Use RESEARCH.md Recipe 3 lines 190-246 verbatim.

**Critical lines that depend on the existing codebase shape:**

Storage `DATA_DIR` import shape (`backend/storage.py:9`):
```python
from .config import DATA_DIR
```

Because `DATA_DIR` is captured at import time, the monkeypatch MUST hit BOTH attributes:
```python
monkeypatch.setattr("backend.config.DATA_DIR", str(tmp))
monkeypatch.setattr("backend.storage.DATA_DIR", str(tmp))
```

API key dummy fixture must hit both module attrs too (mirror of the `DATA_DIR` reasoning):
```python
monkeypatch.setattr("backend.config.OPENROUTER_API_KEY", "sk-or-v1-test-dummy")
```

### `backend/tests/test_storage.py` (test, CRUD)

**Direct target functions and lines:**

`backend/storage.py:32-51` — `get_conversation_path` UUID validation:
- Test: `get_conversation_path("not-a-uuid")` raises `ValueError`.
- Test: `get_conversation_path("../evil")` raises `ValueError` (path traversal rejection — same code path as invalid UUID).
- Test: round-trip — `create_conversation(id)` then `get_conversation(id)` returns matching dict.

`backend/storage.py:215-275` — `add_assistant_message` round-trip:
- Test: with `metadata={"profile": "fast", ...}` + `stage4=None` → persisted message has `metadata` key, no `stage4` key.
- Test: with `stage4={...}` → both `metadata` and `stage4` persisted.
- Test: with `external_research={...}` → `external_research` persisted.

`backend/storage.py:72-88` — `_migrate_conversation_if_needed` (TEST-01 v1→v2 migration):
- Test: dict with no `schema_version` → returned dict has `schema_version: 2` and `mode: "fresh"`.
- Test: dict with `schema_version: 2` returned unchanged (idempotent).
- Test: assistant message without `metadata` → returned message has `metadata: {}`.

**Factory fixture pattern** — use RESEARCH.md "Test Fixture Recommendation" lines 647-664 (factory in conftest, NOT JSON files except for the one captured-from-disk v1 sample).

### `backend/tests/test_research_strategy.py` (test, transform)

**Direct target:** `backend/research_strategy.py:112-144` (`parse_critic_score`).

**Test matrix** — string-literal inputs (no JSON fixtures needed):
- Valid input: `"CRITIC SCORE: 7\nPRIMARY CONCERN: needs more detail"` → `(7, "needs more detail")`.
- Case-insensitive: `"critic score: 5"` → `(5, None)`.
- Clamping: `"CRITIC SCORE: 99"` → `(10, None)`. `"CRITIC SCORE: -3"` → score capped at 1.
- Last-occurrence: `"CRITIC SCORE: 3 ... actually CRITIC SCORE: 8"` → `(8, ...)`.
- Missing header: `"no score here"` → `(None, None)`.
- Empty: `""` → `(None, None)`.

### `backend/tests/test_council_profile.py` (test, request-response)

**Direct target:** `backend/council.py` profile routing — uses `patch_query_model` fixture from conftest (Recipe 3 lines 224-237).

**Test cases:**
- `fast` profile → 4 council models per `backend/config.py:58-63`, chairman `claude-haiku-4.5`.
- `quality` profile → 3 models per `backend/config.py:72-77`.
- `quality_research` profile → delegates to `research_strategy.run()`; council.py NEVER hits its own stages.
- Critic + Stage 4 gating threshold respected — score below threshold triggers Stage 4, score at-or-above does not.

---

## Frontend TEST Pattern Assignments

### `frontend/src/hooks/useTheme.test.js` (test, event-driven)

**Direct target:** `frontend/src/hooks/useTheme.js`. RESEARCH.md Recipe 4 sample (lines 376-399) covers the core pattern.

**Test setup** (RESEARCH.md Recipe 4 — `test-setup.js` lines 327-350) mocks `window.matchMedia` because jsdom 29 doesn't implement it.

**Test cases:**
- Default to `'light'` when no localStorage and `matchMedia.matches === false`.
- Default to `'dark'` when `matchMedia.matches === true` (override the mock per-test).
- `toggle()` flips theme and writes to localStorage with key `'theme'` (matches useTheme.js:21).
- `setTheme('dark')` sets `followSystem = false`; later matchMedia change events do NOT override.
- Cleanup — unmount removes the matchMedia listener (verify via mock `removeEventListener` call count).

### `frontend/src/hooks/useSettings.test.js`

**Direct target:** `frontend/src/hooks/useSettings.js`.

**Test cases:**
- Defaults — fontSize `'m'`, density `'comfortable'`, stage4Threshold `8` (matches useSettings.js:7-8; the `8` mirrors backend `PROFILES["quality_research"]["stage4_threshold"]`).
- `setFontSize('l')` writes `'l'` to localStorage key `'fontSize'` AND sets `document.documentElement` attr `data-fontsize="l"` (useSettings.js:41-43).
- Validation — corrupt localStorage value (`'xyz'` for fontSize) falls back to default `'m'` (useSettings.js:24-28).
- `setStage4Threshold(12)` — out-of-range writes are NOT rejected by the setter (only the reader validates); document this behaviour in the test.

### `frontend/src/components/MessageHeader.test.jsx`

**Direct target:** `frontend/src/components/MessageHeader.jsx:23-62`.

**Test cases:**
- Legacy fallback (`metadata` undefined or `metadata.profile` undefined) → renders `<div class="message-header legacy">Quality (legacy)</div>` (MessageHeader.jsx:26-28).
- `profile: 'fast'` → label `'Fast'`, count `'4 models'`, chairman short name (e.g. `'claude-haiku-4.5'`).
- `stage4_triggered: true` → renders ` + Stage 4 refinement` suffix.
- Cost line gating — `cost.total >= 0.001` shows line; below threshold hides it (MessageHeader.jsx:39-41).

### `frontend/src/components/QualityToggle.test.jsx`

**Direct target:** `frontend/src/components/QualityToggle.jsx`.

**Test cases:**
- Renders 3 options (fast / quality / quality_research) with cost labels.
- Click `'Quality'` calls `onChange('quality')` exactly once (use `@testing-library/user-event`).
- `disabled` prop disables all radios.
- `value` controls which radio is `checked`.

### `frontend/src/components/Stage2.test.jsx`

**Direct target:** `frontend/src/components/Stage2.jsx:5-15` (`deAnonymizeText`) — pure function, easy to test.

**Test cases:**
- `deAnonymizeText("Response A is great", { "Response A": "openai/gpt-5.5" })` → `"**gpt-5.5** is great"`.
- Multiple occurrences replaced.
- No mapping → text returned unchanged (Stage2.jsx:6).
- Model with no `/` → full id used as short name (Stage2.jsx:11).

### `frontend/src/utils/download.test.js`

**Direct target:** `frontend/src/utils/download.js` — pure helpers, no DOM needed for most.

**Test cases:**
- `buildFinalAnswerMarkdown({ question, finalResponse, stage4: null })` → contains question + response, no `(refined)` suffix.
- With `stage4.response` set → title contains `(refined)`, body uses `stage4.response` not `finalResponse.response` (download.js:52-73).
- `buildFinalAnswerFilename` — slugifies title, appends timestamp.
- `buildPromptWithAttachments` — composes prompt + attached file contents (verify ordering).

---

## Shared Patterns

### CSS variable consumption (all MOBL CSS files)

**Source:** `frontend/src/index.css:49-120` token block.

**Apply to:** Every new/modified CSS file in Wave 1.

**Rule:** No magic numbers. Spacing → `var(--space-N)`. Touch targets → `var(--touch-target-min)`. Colors → `var(--color-*)`. Motion → `var(--motion-duration-*)` + `var(--motion-easing-out)`.

Example (Sidebar.css:6-13 already follows this):
```css
.sidebar {
  width: var(--layout-sidebar-w);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border-subtle);
}
```

### `<dialog>` + `showModal()` + ESC dismiss (Phase 6 carry-forward)

**Source:** `frontend/src/components/SettingsPanel.jsx:18-38`.

**Apply to:** `SidebarDrawer.jsx`. Mirror the two `useEffect` blocks verbatim — one for open/close sync, one for the `cancel` event (ESC key). No hand-rolled focus trap; native `<dialog>` provides it.

### localStorage individual-key persistence (Phase 6 carry-forward)

**Source:** `frontend/src/hooks/useSettings.js:3-8` (KEY_FONT / KEY_DENSITY / KEY_STAGE4 — one key per setting).

**Apply to:** Any new persisted state in Phase 7. RESEARCH expects none, but if a "swipe hint dismissed" flag is added, follow this pattern (one key: `'swipe-hint-dismissed'`), NOT bundled JSON.

### Error handling — graceful degradation

**Source:** `backend/openrouter.py` `query_model` (per CLAUDE.md "Error Handling Philosophy") + `frontend/src/hooks/useTheme.js:31` (try/catch around `localStorage.getItem`).

**Apply to:** Test fixtures that exercise corrupted localStorage / missing files / API failures — assert the app degrades gracefully rather than crashing.

### Backend test isolation — `tmp_path` + monkeypatch

**Source:** RESEARCH.md Recipe 3 lines 202-214 (the `_tmp_data_dir` autouse fixture).

**Apply to:** Every pytest test file. Never touches the real `data/conversations/` directory. Module-level `DATA_DIR` requires double monkeypatch (`backend.config.DATA_DIR` AND `backend.storage.DATA_DIR`) because `storage.py:9` captures it at import time.

### Frontend test cleanup — `afterEach(() => cleanup())`

**Source:** RESEARCH.md Recipe 4 `test-setup.js` lines 327-334.

**Apply to:** Implicitly via global `setupFiles`. Test authors do NOT need to call `cleanup()` per file.

---

## No Analog Found

Files with no close match in the codebase (planner uses RESEARCH.md recipes verbatim):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/visual-tests/playwright.config.ts` | config | n/a | No Playwright test infra exists. RESEARCH.md Recipe 1 + 2 fully specifies it. |
| `frontend/visual-tests/_fixtures.ts` | test fixture | event-driven | Same — VRT is greenfield. |
| `frontend/visual-tests/*.spec.ts` (8 files) | test | request-response | Same — first VRT specs in the repo. |
| `frontend/visual-tests/fixtures/*.json` | test data | static | Mock SSE / mock conversation fixtures are new (no `data/conversations/` examples committed). Planner per RESEARCH.md Open Question 3 — JSON files in `frontend/visual-tests/fixtures/`. |
| `backend/tests/conftest.py` | test fixture | event-driven | No backend tests exist. RESEARCH.md Recipe 3 verbatim. |
| `backend/tests/fixtures/conversation_v1_sample.json` | test data | static | One file, one purpose (real pre-v2 shape). Synthesize from `backend/storage.py:91-123` minus `schema_version` + `mode` fields. |
| `frontend/src/test-setup.js` | config | n/a | No vitest config exists. RESEARCH.md Recipe 4 `test-setup.js` block verbatim. |

For all rows above, the **fallback** is to copy RESEARCH.md recipe blocks verbatim. The recipes were verified against live registries on 2026-05-11 and against the existing Phase 6 code shape.

---

## Metadata

**Analog search scope:**
- `frontend/src/components/*.{jsx,css}` (21 components + 20 stylesheets)
- `frontend/src/hooks/*.js` (2 hooks)
- `frontend/src/utils/*.js` (2 utilities)
- `backend/*.py` (7 modules)
- Top-level config (`pyproject.toml`, `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `README.md`)

**Files scanned:** ~55

**Pattern extraction date:** 2026-05-11

**Key takeaway for planner:** Wave 1 has strong analogs in the codebase — every MOBL file builds on an existing template (SettingsPanel, useTheme, Header gear button, existing media-query block in App.css). Wave 2 (VRT + TEST) is greenfield infrastructure; planner copies RESEARCH.md recipes verbatim because no in-repo precedent exists, but the **targets** of those tests are well-mapped to specific functions and line ranges.
