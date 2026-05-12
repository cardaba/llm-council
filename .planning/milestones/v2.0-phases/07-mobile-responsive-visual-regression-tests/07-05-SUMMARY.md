---
phase: 07-mobile-responsive-visual-regression-tests
plan: 05
subsystem: testing
tags: [vitest, react-testing-library, jsdom, frontend-testing, readme]

requires:
  - phase: 07
    plan: 03
    provides: "@playwright/test devDep + test:visual script in frontend/package.json (sequenced before this plan to avoid devDeps merge-conflict)"
  - phase: 07
    plan: 04
    provides: "Backend pytest suite (46 tests) — referenced in README ## Testing section as the first of three local test commands"

provides:
  - "Frontend vitest harness (vitest@4.1.5 + RTL@16.3.2 + jsdom@29.1.1 + jest-dom@6.6.4 + user-event@14.5.2)"
  - "6 co-located test files at frontend/src/ covering 55 test cases"
  - "matchMedia polyfill in test-setup.js (jsdom 29 does NOT implement it)"
  - "README ## Testing section documenting all 3 local test commands (pytest / vitest / Playwright)"
  - "Reusable utility frontend/src/utils/deAnonymizeText.js extracted from Stage2.jsx (eslint-clean against react-refresh/only-export-components)"
  - "Vitest globals registered in eslint.config.js so describe/it/expect/vi do not trip no-undef on test files"
  - "Vitest discovery scoped to src/**/*.{test,spec}.{js,jsx} so 07-03 Playwright suites are not crawled by vitest"

affects:
  - "Phase 7 verification (5/5 plans complete after this lands)"
  - "v2.1 — App.test.jsx for handleStreamEvent stale-event regression coverage deferred here"

tech-stack:
  added:
    - "vitest@^4.1.5 (runner)"
    - "@testing-library/react@^16.3.2 (renderHook + render, RTL v16 wraps act() internally)"
    - "@testing-library/jest-dom@^6.6.4 (matchers — toBeInTheDocument, toBeChecked, toHaveAttribute)"
    - "@testing-library/user-event@^14.5.2 (realistic event sequences for click)"
    - "jsdom@^29.1.1 (DOM in Node, matchMedia must be polyfilled separately)"
  patterns:
    - "Co-located *.test.{js,jsx} next to source modules (matches frontend convention; vitest discovery rooted at frontend/src/)"
    - "renderHook + act() pattern for hook-state mutation tests"
    - "Find radios by .value attribute when accessible-name collisions exist (Quality vs Quality+Research)"
    - "Pure-function helpers extracted to utils/ so react-refresh/only-export-components stays green when tested"
    - "matchMedia polyfill via Object.defineProperty in setupFiles (NOT window.matchMedia = ...) per jsdom 29 resistance"
    - "Single ## Testing section in README per RESEARCH Open Question 5 resolution (no separate TESTING.md)"

key-files:
  created:
    - "frontend/src/test-setup.js"
    - "frontend/src/hooks/useTheme.test.js"
    - "frontend/src/hooks/useSettings.test.js"
    - "frontend/src/components/MessageHeader.test.jsx"
    - "frontend/src/components/QualityToggle.test.jsx"
    - "frontend/src/components/Stage2.test.jsx"
    - "frontend/src/utils/download.test.js"
    - "frontend/src/utils/deAnonymizeText.js"
    - ".planning/phases/07-mobile-responsive-visual-regression-tests/deferred-items.md"
  modified:
    - "frontend/package.json (devDeps + test scripts)"
    - "frontend/package-lock.json"
    - "frontend/vite.config.js (test block; include scope to src/)"
    - "frontend/eslint.config.js (vitest globals for **/*.test.{js,jsx})"
    - "frontend/src/components/Stage2.jsx (replace inline deAnonymizeText with import from utils/)"
    - "README.md (## Testing section, 21 lines added)"

key-decisions:
  - "Extract deAnonymizeText from Stage2.jsx to utils/ instead of exporting it from a .jsx file — keeps react-refresh/only-export-components green and the test imports a pure helper, not a component."
  - "Scope vitest discovery to src/**/*.{test,spec}.{js,jsx} so visual-tests/*.spec.ts (07-03 Playwright) is not crawled by vitest (it would crash on @playwright/test's test() builder)."
  - "Polyfill matchMedia via Object.defineProperty in setupFiles, not window.matchMedia = ... — jsdom 29 resists direct assignment to matchMedia."
  - "Register vitest globals in eslint.config.js with a files: ['**/*.test.{js,jsx}', 'src/test-setup.js'] scope so the no-undef rule does not flag describe/it/expect/vi (vite.config.js test.globals: true injects them at runtime)."
  - "Defer App.test.jsx for handleStreamEvent stale-event guard to v2.1. App.jsx tightly couples 11 child component imports, and handleStreamEvent is a useCallback (not exported). A behavioural test would require either extracting handleStreamEvent to a pure reducer module (refactor outside this plan's scope) or mounting full <App /> with mocked SSE (brittle). 06-08 already documented the guard structurally in 06-08-SUMMARY; manual smoke test pending user."

patterns-established:
  - "Vitest co-located convention: *.test.{js,jsx} next to its target module."
  - "Pure-helper extraction pattern: when a .jsx file has a non-component export that needs testing, move it to utils/ to satisfy react-refresh/only-export-components."
  - "ESLint globals for test files: declare via a second config block (files: ['**/*.test.{js,jsx}']) rather than globally — avoids leaking test globals into production code lint."
  - "README ## Testing section as the single source of truth for local test commands (no TESTING.md; no CI badge per D-04b)."

requirements-completed: [TEST-02, TEST-03]

duration: 25min
completed: 2026-05-11
---

# Phase 7 Plan 05: vitest + RTL v16 + README Testing Section Summary

**55-test vitest suite (6 co-located files) covering hooks (useTheme, useSettings), components (MessageHeader, QualityToggle, Stage2 de-anonymization), and pure utilities (download.js), plus a terse ## Testing section in README.md documenting the 3 local test commands.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-11T12:26:00Z
- **Completed:** 2026-05-11T12:43:00Z
- **Tasks:** 3 (3/3 complete)
- **Files modified:** 6 (created 9, modified 6)
- **Final vitest run:** `Test Files  6 passed (6)  Tests  55 passed (55)` — duration 11.28s

## Accomplishments

- Stood up the entire vitest + RTL v16 + jsdom 29 frontend test harness with the matchMedia polyfill that jsdom 29 omits — the structural prerequisite that would have crashed every useTheme test silently.
- Wrote 55 test cases across 6 co-located files locking the frontend critical paths against regression: theme persistence + system response + cleanup, settings defaults + validation + side-effect attributes, MessageHeader legacy fallback + profile labels + cost gating, QualityToggle onChange wiring, Stage2 de-anonymization, and download.js markdown composition + filename slugging.
- Documented all 3 test commands in a single ## Testing section in README.md (21 lines added) — Direction A "calmo" tone, no CI mention beyond the explicit "v2.1 backlog" framing per D-04b.

## Task Commits

1. **Task 1: Add vitest devDeps + vite test config + test-setup.js** — `dbd8d18` (feat)
2. **Task 2: 6 co-located vitest specs for hooks, components, utils** — `965fcc7` (test)
3. **Task 3: README ## Testing section with 3 local test commands** — `1f0dbfb` (docs)

Plan metadata commit (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates) follows.

## Files Created/Modified

### Created (9)

- `frontend/src/test-setup.js` — jest-dom matchers + afterEach cleanup + matchMedia polyfill
- `frontend/src/hooks/useTheme.test.js` — 7 tests
- `frontend/src/hooks/useSettings.test.js` — 10 tests
- `frontend/src/components/MessageHeader.test.jsx` — 12 tests
- `frontend/src/components/QualityToggle.test.jsx` — 7 tests
- `frontend/src/components/Stage2.test.jsx` — 7 tests
- `frontend/src/utils/download.test.js` — 12 tests
- `frontend/src/utils/deAnonymizeText.js` — extracted pure helper (was inline in Stage2.jsx)
- `.planning/phases/07-mobile-responsive-visual-regression-tests/deferred-items.md` — pre-existing Stage1.jsx lint warning

### Modified (6)

- `frontend/package.json` — vitest, jsdom, RTL, jest-dom, user-event devDeps + test / test:watch scripts
- `frontend/package-lock.json` — 83 new packages
- `frontend/vite.config.js` — test block (environment: jsdom, globals: true, setupFiles, css: false, include: src/)
- `frontend/eslint.config.js` — vitest globals (describe, it, expect, vi, beforeEach, afterEach) for **/*.test.{js,jsx}
- `frontend/src/components/Stage2.jsx` — replace inline deAnonymizeText with `import { deAnonymizeText } from '../utils/deAnonymizeText'`
- `README.md` — ## Testing section between "Running the Application" and "Tech Stack" (+21 lines, 0 deletions)

## Decisions Made

### Decision 1: App.test.jsx for handleStreamEvent stale-event guard → DEFERRED to v2.1

The plan offered executor discretion (STATE.md flagged it as "include"; plan-checker WARNING 1 called it optional). On review of App.jsx:

- `handleStreamEvent` is a `useCallback` inside `App` component scope, not exported.
- Testing it behaviourally requires either:
  - **(a)** Extracting `handleStreamEvent` to a pure reducer module (refactor that touches the SSE event dispatcher used by both fresh-prompt and critique flows — outside this plan's scope), OR
  - **(b)** Mounting the full `<App />` with mocked `api.sendMessageStream` and the entire 11-component child tree (Sidebar, Header, ChatInterface, SettingsPanel, ErrorBanner, etc.) — brittle, high-coupling, and 06-08 already documented the guard pattern structurally in `06-08-SUMMARY` ("`if (!lastMsg?.loading) return prev;` at every in-flight setter site, 10 sites").

Decision: defer to v2.1. When `handleStreamEvent` either (i) gets extracted as part of a future SSE shape change (e.g., Option 3 from 06-08 — backend includes conversation_id and frontend filters), or (ii) gains a clean test seam, that's the natural moment to add the regression test. The manual smoke test for 06-08 (STATE.md Active Todos) remains the user-side validation gate.

### Decision 2: Extract `deAnonymizeText` from Stage2.jsx to a separate utility module

The plan offered two options for the Stage 2 test:
- **(a)** Export `deAnonymizeText` from Stage2.jsx (one-line addition) and import directly in the test.
- **(b)** Test indirectly via `render(<Stage2 />)` + DOM assertions.

I took option (a) initially but ran into `react-refresh/only-export-components` ESLint error (a .jsx file should only export components for Fast Refresh to work correctly). Rather than disabling the rule per-line, I extracted the helper to `frontend/src/utils/deAnonymizeText.js`. This:

- Keeps the eslint-clean invariant for the whole frontend.
- Decouples the helper from React's JSX module concerns (it's a pure string transformer; nothing forces it to live in a component file).
- Lets the test import a pure helper from `utils/` — clean, isolated, no DOM rendering required.

The artifact contract in the plan frontmatter says `frontend/src/components/Stage2.test.jsx` must `contain: "deAnonymizeText"` — preserved. The test file imports from `'../utils/deAnonymizeText'` and the assertion strings reference `deAnonymizeText` by name throughout.

### Decision 3: Scope vitest to `src/**/*.{test,spec}.{js,jsx}`

First test run revealed vitest crawling `visual-tests/*.spec.ts` (Playwright suites from 07-03), which crashed on `@playwright/test`'s `test()` builder ("test must be called from a worker process"). Adding `test.include: ['src/**/*.{test,spec}.{js,jsx}']` to `vite.config.js` cleanly excludes them — the visual-tests directory stays Playwright-only, vitest stays src-only.

### Decision 4: Vitest globals declared in ESLint config for test files only

`vite.config.js` `test.globals: true` injects `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` into every test at runtime. ESLint doesn't know that — it raised 199 `no-undef` errors. Fix: add a second config block in `frontend/eslint.config.js` scoped to `files: ['**/*.test.{js,jsx}', 'src/test-setup.js']` declaring those globals. Avoids leaking test globals into production code lint scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest crawled Playwright `visual-tests/*.spec.ts` and crashed**
- **Found during:** Task 2 first test run
- **Issue:** Vitest's default discovery picked up `frontend/visual-tests/*.spec.ts` (07-03 Playwright suites). They use `@playwright/test`'s `test()` builder, which throws "test must be called from a worker process" when invoked outside the Playwright runner. 10 of the 14 reported "test files" were Playwright spec files.
- **Fix:** Added `include: ['src/**/*.{test,spec}.{js,jsx}']` to the `test` block in `vite.config.js` to scope vitest discovery to `src/` only.
- **Files modified:** `frontend/vite.config.js`
- **Verification:** Re-ran `npm test --prefix frontend` — only 6 src-rooted files crawled, all 55 tests pass.
- **Committed in:** `965fcc7` (Task 2 commit)

**2. [Rule 3 - Blocking] ESLint flat config didn't recognize vitest globals**
- **Found during:** Task 2 lint pass after writing the 6 test files
- **Issue:** 199 `no-undef` errors on `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` across all test files. `vite.config.js` `test.globals: true` injects them at runtime; ESLint doesn't know that.
- **Fix:** Added a second config block in `frontend/eslint.config.js` scoped to `files: ['**/*.test.{js,jsx}', 'src/test-setup.js']` declaring the 9 vitest globals as `readonly`.
- **Files modified:** `frontend/eslint.config.js`
- **Verification:** `npx eslint` on all 6 test files + `test-setup.js` runs clean. Full repo lint still has one pre-existing error (see deferred items).
- **Committed in:** `965fcc7` (Task 2 commit)

**3. [Rule 1 - Bug] `react-refresh/only-export-components` ESLint error from exporting `deAnonymizeText` from Stage2.jsx**
- **Found during:** Task 2 lint pass
- **Issue:** After adding `export` to `function deAnonymizeText(...)` in `Stage2.jsx`, ESLint raised `react-refresh/only-export-components: Fast refresh only works when a file only exports components`. .jsx files should only export React components for HMR to work correctly.
- **Fix:** Extracted `deAnonymizeText` to a new pure-utility file `frontend/src/utils/deAnonymizeText.js`, updated `Stage2.jsx` to import it.
- **Files modified:** `frontend/src/components/Stage2.jsx`, `frontend/src/utils/deAnonymizeText.js` (new)
- **Verification:** Lint clean on the changed files; component still renders the de-anonymized output identically (no behaviour change).
- **Committed in:** `965fcc7` (Task 2 commit)

**4. [Rule 1 - Bug] useTheme `setTheme writes localStorage and stops following system` test simulated a synthetic event after listener removal**
- **Found during:** Task 2 first test run
- **Issue:** The original test captured the `change` handler registered by the hook's matchMedia listener, then after calling `setTheme('dark')` (which flips `followSystem=false` and tears down the listener), it invoked the captured handler directly with `{ matches: false }`. This bypassed the unsubscribe (the handler reference was held by the test, not by the matchMedia instance) and reset the theme back to `'light'`. The assertion `expect(result.current.theme).toBe('dark')` failed.
- **Fix:** Rewrote the test to only verify that `removeEventListener` was called on the matchMedia spy after setTheme — the unsubscribe is what the test should prove. Don't simulate the synthetic change event because the hook owns the handler reference; calling it directly proves nothing useful about the hook's behaviour.
- **Files modified:** `frontend/src/hooks/useTheme.test.js`
- **Verification:** All 7 useTheme tests pass.
- **Committed in:** `965fcc7` (Task 2 commit)

**5. [Rule 1 - Bug] QualityToggle radio lookup by accessible name conflated "Quality" with "Quality+Research"**
- **Found during:** Task 2 first test run
- **Issue:** Used `screen.getByRole('radio', { name: /^quality\b/i })` to find the Quality radio. The regex matched both `Quality` and `Quality+Research` because `\b` matches the boundary between `y` and `+`. `getByRole` threw "found multiple elements".
- **Fix:** Switched to `screen.getAllByRole('radio').find((r) => r.value === '...')` — selects by the `value` attribute, which is unique per radio. Cleaner and decoupled from label-formatting cosmetic decisions.
- **Files modified:** `frontend/src/components/QualityToggle.test.jsx`
- **Verification:** All 7 QualityToggle tests pass.
- **Committed in:** `965fcc7` (Task 2 commit)

---

**Total deviations:** 5 auto-fixed (2 blocking, 3 bugs in test setup)
**Impact on plan:** All 5 fixes were necessary for the suite to pass and stay maintainable. No scope creep — every fix was scoped to the test harness or the immediate test file. The `deAnonymizeText` extraction is the only one with downstream production code impact, and it's a clean refactor (no behavioural change).

## Issues Encountered

None beyond the 5 auto-fixed deviations above.

## Known Stubs

None. The 6 test files exercise real hook / component / utility behaviour against live source code. The deferred App.test.jsx is not a stub — it's an explicit v2.1 backlog decision documented above.

## Deferred Issues (Out of Scope)

1. **Pre-existing `react-hooks/set-state-in-effect` lint error in `frontend/src/components/Stage1.jsx:33`** — introduced in plan 05-05 (NAV-03 Stage 1 Show-more accordion). Documented in `.planning/phases/07-mobile-responsive-visual-regression-tests/deferred-items.md`. Out of scope per scope-boundary rule (not introduced by this plan).

## User Setup Required

None — no external service configuration required. The Playwright first-run binary download (`npx playwright install chromium`, ~290 MiB) is documented in the README ## Testing section as a one-off prerequisite; not strictly required for 07-05 success criteria (which is just the vitest suite passing).

## TEST-02 + TEST-03 Verification

- **TEST-02 (vitest harness + frontend tests)** — SATISFIED. 6 co-located files, 55 tests, `npm test --prefix frontend` exits 0.
- **TEST-03 (README ## Testing section with 3 commands)** — SATISFIED. Section at README.md:82, all 3 commands present (lines 88, 93, 98), Direction A "calmo" tone preserved, no CI configuration added.

## Phase 7 Closure Readiness

All 10 Phase 7 requirements now satisfied across the 5 plans:

| Req | Plan | Status |
|-----|------|--------|
| MOBL-01 | 07-01 | Complete |
| MOBL-02 | 07-02 | Complete |
| MOBL-03 | 07-01 | Complete |
| MOBL-04 | 07-02 | Complete |
| VRT-01 | 07-03 | Complete |
| VRT-02 | 07-03 | Complete |
| VRT-03 | 07-03 | Complete |
| TEST-01 | 07-04 | Complete |
| TEST-02 | 07-05 | Complete (this plan) |
| TEST-03 | 07-05 | Complete (this plan) |

**Phase 7 ready for `/gsd-verify-phase 7`.**

## Self-Check: PASSED

- `frontend/src/test-setup.js` — exists
- `frontend/src/hooks/useTheme.test.js` — exists (7 tests, all pass)
- `frontend/src/hooks/useSettings.test.js` — exists (10 tests, all pass)
- `frontend/src/components/MessageHeader.test.jsx` — exists (12 tests, all pass)
- `frontend/src/components/QualityToggle.test.jsx` — exists (7 tests, all pass)
- `frontend/src/components/Stage2.test.jsx` — exists (7 tests, all pass)
- `frontend/src/utils/download.test.js` — exists (12 tests, all pass)
- `frontend/src/utils/deAnonymizeText.js` — exists
- README.md ## Testing section — exists at line 82
- Commits dbd8d18 + 965fcc7 + 1f0dbfb — all present in git log

---
*Phase: 07-mobile-responsive-visual-regression-tests*
*Plan: 05*
*Completed: 2026-05-11*
