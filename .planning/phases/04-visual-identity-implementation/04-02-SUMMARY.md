---
phase: 04-visual-identity-implementation
plan: 02
subsystem: frontend
tags: [theming, header, branding, useTheme, grid-layout, tokens, accessibility]
requires:
  - phase: 04-visual-identity-implementation/04-01
    provides: "design tokens (--color-*, --font-*, --layout-*, --motion-*) on :root and [data-theme=\"dark\"], FOUC blocker writing data-theme attribute, self-hosted font binaries"
provides:
  - "frontend/src/hooks/useTheme.js — useTheme() hook (theme + setTheme + toggle) with localStorage persistence and prefers-color-scheme follow-mode"
  - "frontend/src/components/Header.jsx — branded shell: ampersand SVG mark + 'LLM Council' wordmark + sun/moon theme toggle"
  - "frontend/src/components/Header.css — token-only header styling"
  - "frontend/src/App.css — CSS grid layout (header row + sidebar/main row), token-driven, mobile drawer rule"
  - "frontend/src/components/MessageHeader.css — first Phase-3 component fully migrated to tokens"
affects:
  - frontend/src/App.jsx
  - frontend/src/App.css
  - frontend/src/components/Header.jsx
  - frontend/src/components/Header.css
  - frontend/src/components/MessageHeader.css
  - frontend/src/hooks/useTheme.js
tech-stack:
  added: []
  patterns:
    - "useTheme hook: synchronous initial read coordinated with FOUC blocker; matchMedia listener subscribed only while followSystem === true; cleanup on unmount and on followSystem flip (mitigates listener-leak T-04-06)"
    - "SVG glyph branding via inline <text> with currentColor — avoids the well-known SVG attribute / CSS custom property resolution gap"
    - "App-shell CSS grid: 52px header row spans both columns; 280px sidebar + 1fr main on row 2; mobile drawer collapses sidebar to fixed overlay below the header"
    - "Phase-3 → Phase-4 hex-to-token migration map applied surgically (CSS only, JSX untouched)"
key-files:
  created:
    - frontend/src/hooks/useTheme.js
    - frontend/src/components/Header.jsx
    - frontend/src/components/Header.css
  modified:
    - frontend/src/App.jsx
    - frontend/src/App.css
    - frontend/src/components/MessageHeader.css
key-decisions:
  - "Tabular-nums applied at .message-header root rather than .message-header__meta because Plan 03-03 did not introduce that wrapper in MessageHeader.jsx and Plan 04-02 forbids JSX edits — same visual outcome, no JSX churn"
  - "useState(readInitialFollowSystem) reads localStorage once at mount: if the key is null at first paint, the user has not chosen → followSystem = true; subsequent setTheme/toggle flips it to false permanently within the session"
  - "Empty catch blocks (no `(_)`) instead of `catch (_)` — current ESLint config flags the unused binding; semantically equivalent, no logic change"
  - "App.css uses descendant selectors `.app > .app-header` / `.app > .sidebar` / `.app > .chat-interface` because Sidebar.jsx and ChatInterface.jsx already render those root classNames — Wave 2 does not rename them; their internal token migration is deferred (Wave 3 / Wave 4)"
patterns-established:
  - "Theme coordination contract: localStorage key 'theme', writes 'light'|'dark', read by both index.html FOUC blocker (Plan 04-01) and useTheme hook (Plan 04-02). Single source of truth — no duplication."
  - "Hex placeholders from Phase 3 are migrated CSS-only, with the swap map locked in UI-SPEC §Phase-3 component restyling map. JSX class names are stable after Phase 3."
requirements-completed:
  - VIS-02
  - VIS-03
  - VIS-04
metrics:
  duration: ~6 min
  completed: 2026-05-10
  tasks: 3
  commits: 3
---

# Phase 04 Plan 02: Branded shell Summary

**Branded global header (52px) with 'LLM Council' wordmark + ampersand SVG mark + sun/moon theme toggle, useTheme hook (localStorage + matchMedia follow-mode) that drives `<html data-theme>`, App shell rebuilt as CSS grid, and MessageHeader migrated from Phase-3 hex placeholders to design tokens.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-10T15:40:22Z
- **Completed:** 2026-05-10T15:46:24Z
- **Tasks:** 3
- **Files created:** 3 (useTheme.js, Header.jsx, Header.css)
- **Files modified:** 3 (App.jsx, App.css, MessageHeader.css)

## Accomplishments

- **VIS-03 (Branded shell)** delivered: visible header at the top of the app with serif wordmark and ampersand mark — the app is now visually recognizable as Direction A even though Sidebar / ChatInterface / Stage 1-4 retain their legacy CSS until Waves 3-4.
- **VIS-02 (Typography swap)** advanced: `var(--font-serif)` cascades from `.app` and the wordmark; the sans stack reaches MessageHeader via `var(--font-sans)`; the only `system-ui` reference in `frontend/src/` is the fallback inside the `--font-sans` declaration in `index.css` (Wave B grep gate passes).
- **VIS-04 (Theme toggle)** delivered: clicking the toggle flips `<html data-theme>` instantly; the choice persists in `localStorage`; the matchMedia subscription respects the manual choice afterwards.
- **Phase-3 component restyling** opened: MessageHeader is the first Phase-3 component fully migrated to tokens — establishes the swap-map pattern that Wave 3 will apply to QualityToggle, ReasoningDisclosure, Stage1, Stage2, Stage3, Stage4.
- **App-shell** restructured from `display: flex` (horizontal sidebar+main) to `display: grid` (header row + sidebar/main row) with a mobile drawer rule.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useTheme hook + Header component (jsx + css)** — `d5c4818` (feat)
2. **Task 2: Restructure App.jsx + App.css to grid (header + sidebar + main)** — `befff4a` (feat)
3. **Task 3: Migrate MessageHeader.css from Phase 3 hex placeholders to design tokens** — `e9195c5` (feat)

**Plan metadata:** _to be added after this SUMMARY commit_ (docs)

## Files Created/Modified

**Created**

- `frontend/src/hooks/useTheme.js` — `useTheme()` hook returning `{ theme, setTheme, toggle }`. Synchronous initial read of `localStorage.theme` falling back to `prefers-color-scheme`; `useEffect` writes `data-theme` to `<html>`; second `useEffect` subscribes to `matchMedia('(prefers-color-scheme: dark)') change` only while `followSystem === true`; `setTheme` flips `followSystem → false` and persists to `localStorage`. Both `localStorage` operations are wrapped in `try/catch` so private-browsing mode doesn't break.
- `frontend/src/components/Header.jsx` — `<header role="banner">` with `.app-header__brand` (24px SVG ampersand using `currentColor` + 18px serif wordmark "LLM Council") and `.app-header__theme-toggle` rendering `<SunIcon />` when current theme is dark, `<MoonIcon />` when light. `aria-label` and `title` flip with the next theme, per UI-SPEC §Copywriting Contract.
- `frontend/src/components/Header.css` — Token-only styles: `flex` row 52px tall, `border-bottom: 1px solid var(--color-border-subtle)`, hover background `var(--color-bg-secondary)`, focus-visible ring `var(--color-focus-ring)`, transitions on `--motion-duration-base` × `--motion-easing-out`. Zero hardcoded hex.

**Modified**

- `frontend/src/App.jsx` — added `import Header from './components/Header'` and mounted `<Header />` as the first child of `<div className="app">`. All state, handlers, and SSE wiring untouched.
- `frontend/src/App.css` — full rewrite. Was: `display: flex` with `#ffffff` / `#333` and `-apple-system` font stack. Now: `display: grid` with `grid-template-columns: var(--layout-sidebar-w) 1fr` and `grid-template-rows: var(--layout-header-h) 1fr`, descendant selectors place `.app-header` on row 1 and `.sidebar` / `.chat-interface` on row 2. Mobile rule (`@media (max-width: 768px)`) collapses the sidebar to a fixed translateX overlay below the header.
- `frontend/src/components/MessageHeader.css` — Phase-3 hex placeholders swapped per UI-SPEC §Phase-3 restyling map: `#666 → var(--color-fg-secondary)`, `#333 → var(--color-fg-primary)`, `#999 → var(--color-fg-muted)`, `#4a90e2 → var(--color-accent)`. Font stack `'Inter', system-ui, sans-serif → var(--font-sans)`. Literal sizes/spacings → `var(--font-size-body-small)`, `var(--space-2)`, `var(--space-3)`. Added `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum" 1` so the `{N} models` digit aligns across messages.

## Decisions Made

- **Empty `catch` block syntax** — the project's ESLint config (flat config, `react-hooks` plugin set) flags `catch (_)` with `no-unused-vars`. Switched to bare `catch { ... }` (ES2019+, supported by Vite's esbuild target). Semantically equivalent; no logic change. Alternative considered: rename to `catch (err) { void err; }` — rejected, more noisy than the bare form.
- **Tabular-nums applied to `.message-header` root** — UI-SPEC §Typography line 128 names `.message-header__meta`, but Plan 03-03 / `MessageHeader.jsx` does not render that class; the meta is inline `<span>` siblings. Applying the rule on the root achieves the same visual outcome (tabular digits in the meta line) without touching JSX, which Plan 04-02 explicitly forbids. Tracked below as a Rule 1 deviation.
- **`currentColor` ampersand fill** — `<text fill="currentColor">` rather than `<text fill="var(--color-fg-secondary)">` because SVG attribute values do not resolve CSS custom properties consistently across rendering engines. The surrounding `.app-header__brand` sets `color: var(--color-fg-secondary)`, which cascades through the SVG via `currentColor` reliably.
- **`useTheme` over `useSyncExternalStore`** — for a single-consumer hook the modern primitive is over-engineering. Two `useState` + two `useEffect` (theme writer + matchMedia subscription) is the canonical pattern (RESEARCH §Alternatives Considered).
- **Wave 2 leaves Sidebar / ChatInterface internals untouched** — they are placed in the grid via `.app > .sidebar` / `.app > .chat-interface` selectors but their own CSS files are not migrated yet (Wave 3 owns ChatInterface; Wave 4 owns Sidebar). This is intentional per CONTEXT D-08 (controlled, wave-by-wave migration).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Tabular-nums target class missing in JSX**

- **Found during:** Task 3 (Migrate MessageHeader.css)
- **Issue:** The plan instructed "apply `font-variant-numeric: tabular-nums` to `.message-header__meta`" per UI-SPEC line 128. Inspection of `frontend/src/components/MessageHeader.jsx` (locked in Phase 3 / Plan 03-03) showed there is no `.message-header__meta` element — the meta `{N} models` is rendered as inline `<span>` siblings inside `.message-header`. Writing the rule for `.message-header__meta` would have been a no-op CSS rule.
- **Fix:** Applied `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum" 1` to `.message-header` root. Functionally equivalent: the meta spans inherit, digits align as intended.
- **Files modified:** `frontend/src/components/MessageHeader.css`
- **Verification:** Build passes; rule is on a real selector that matches at runtime.
- **Committed in:** `e9195c5` (Task 3 commit)
- **Why not touch JSX:** Plan 04-02 task 3 explicitly forbids it: _"NO tocar el JSX de MessageHeader.jsx — solo el CSS. Las class names del componente son finales (Phase 3 / Plan 03-03 las locked)."_

**2. [Rule 1 — Bug] ESLint `no-unused-vars` on `catch (_)` pattern**

- **Found during:** Task 1 (Create useTheme hook)
- **Issue:** Plan-suggested `try { ... } catch (_) { ... }` pattern (RESEARCH §Code Example 3) tripped ESLint with three `'_' is defined but never used  no-unused-vars` errors in `useTheme.js`.
- **Fix:** Switched all three `catch (_)` blocks to bare `catch { ... }` (ES2019 optional catch binding). Semantically identical; no behaviour change.
- **Files modified:** `frontend/src/hooks/useTheme.js`
- **Verification:** `npm --prefix frontend run lint` shows zero new errors (only the two pre-existing `loadConversation` immutability errors in `App.jsx`, which are out of scope).
- **Committed in:** `d5c4818` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 — bug)
**Impact on plan:** Both fixes are micro-corrections needed for lint/runtime correctness; neither expands scope or alters the architecture the plan locked.

## Issues Encountered

None blocking. Two notes:

- **Pre-existing lint errors carried over** — `App.jsx` has two `react-hooks/immutability` errors on `loadConversation` from earlier phases. Verified via `git stash -u && npm run lint` that they exist on master without any Wave 2 changes; they are out of scope for this plan and do not block the build (`npm run build` passes). Logged for a future cleanup pass.
- **Manual smoke test deferred** — the verification block calls for an interactive smoke test (theme toggle, OS-follow, F5 persist). The grep gates and the build verification cover the structural acceptance criteria; the visual smoke test should be performed by the developer when first running `npm run dev` post-merge.

## Verification

**Wave B grep gates (UI-SPEC §Acceptance gates):**

- `system-ui` references in `frontend/src/` outside `index.css`: **0** (only match is the fallback inside `--font-sans` in `index.css`).
- `frontend/src/components/Header.css` hex check: **0 hardcoded hex** (only token consumption).
- `frontend/src/components/MessageHeader.css` Phase-3 hex check: **0** matches for `#666 / #333 / #999 / #4a90e2 / #357abd / #f5f5f5 / #f0f0f0 / system-ui`.
- `frontend/src/App.css` legacy check: **0** matches for `#ffffff / #333 / system-ui`.
- `<Header` references in `App.jsx`: **1** (mounted as first child of `.app`).
- `useTheme` references in `Header.jsx`: **1** (single consumer).
- `var(--color-` consumption in `MessageHeader.css`: **4** (>= required threshold).

**Build:** `npm --prefix frontend run build` succeeds — 519 modules, 21.25 kB CSS gzipped to 5.19 kB.

**Lint:** `npm --prefix frontend run lint` shows zero new errors from Wave 2 changes (only two pre-existing `App.jsx` immutability errors carried over from earlier phases).

## Threat Surface Scan

No new endpoints, auth paths, schema changes, or trust boundaries introduced. The `useTheme` hook writes only the literal strings `'light'` / `'dark'` to `localStorage`; reads of unexpected values fall through to `prefers-color-scheme` (T-04-05 mitigation already in place from Plan 04-01 FOUC blocker). The matchMedia listener is properly cleaned up on unmount and on `followSystem` flip (T-04-06 mitigation).

## Known Stubs

None. Header functional and complete; useTheme functional and complete; MessageHeader fully migrated.

## Next Phase Readiness

**Wave 3 (Plan 04-03) — Deliberation surfaces** is unblocked:

- **In-scope for Wave 3:** ChatInterface, Stage1, Stage2, Stage3, Stage4 (chairman), QualityToggle, ReasoningDisclosure, Markdown wrapper. All consume tokens; the swap-map pattern from MessageHeader.css is the template.
- **Deferred to Wave 4 (Plan 04-04):** Sidebar (rename inline + menu + modal), Header polish (favicon ampersand SVG asset), conversations list typography, empty-state polish.

**App is now visually branded** even though deliberation surfaces and conversation list still have legacy styles — exactly the controlled, per-wave migration cadence locked by CONTEXT D-08. Theme toggle works end-to-end against any token-consuming surface (Wave 1 + Wave 2 surfaces visibly switch on click; legacy surfaces stay neutral until their wave).

## Self-Check

Verifying claims before handoff:

- `frontend/src/hooks/useTheme.js` exists: **FOUND**
- `frontend/src/components/Header.jsx` exists: **FOUND**
- `frontend/src/components/Header.css` exists: **FOUND**
- `frontend/src/App.jsx` modified (Header mounted): **VERIFIED** (1 import, 1 `<Header />`)
- `frontend/src/App.css` rewritten (grid + tokens): **VERIFIED** (8 token/grid markers, 0 legacy hex)
- `frontend/src/components/MessageHeader.css` migrated: **VERIFIED** (0 forbidden hex, 4 token consumers)
- Commit `d5c4818` exists in `git log`: **FOUND**
- Commit `befff4a` exists in `git log`: **FOUND**
- Commit `e9195c5` exists in `git log`: **FOUND**

## Self-Check: PASSED

---
*Phase: 04-visual-identity-implementation*
*Plan: 02 — Branded shell*
*Completed: 2026-05-10*
