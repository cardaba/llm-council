---
phase: 07-mobile-responsive-visual-regression-tests
plan: 03
subsystem: testing
tags: [playwright, vrt, visual-regression, snapshot, chromium, anti-flake, baselines]

# Dependency graph
requires:
  - phase: 07-01
    provides: "Stable Direction A skin (--touch-target-min, viewport-fit=cover, safe-area-inset paddings) — the visual surface VRT freezes"
  - phase: 07-02
    provides: "Mobile drawer + hamburger landed → desktop sidebar layout is final at 1280×800; no further DOM churn expected before baseline lock"
provides:
  - "frontend/visual-tests/playwright.config.ts — Playwright 1.59.1 config with 2 projects (chromium-light / chromium-dark), snapshotPathTemplate forced to OS-suffixed filenames"
  - "frontend/visual-tests/_fixtures.ts — Centralised anti-flake substrate: reducedMotion + global animation/transition override + caret-color transparent + settle(page) helper for fonts.ready + networkidle"
  - "frontend/visual-tests/*.spec.ts — 8 spec files covering D-02 surfaces, every spec imports test/expect/settle from './_fixtures' (D-02c structural enforcement)"
  - "frontend/visual-tests/fixtures/stage2-mock-sse.json — Deterministic hydrated conversation with 4 stage1 responses + 4 stage2 evaluations + aggregate_rankings + label_to_model + stage3.response/model + chairman metadata"
  - "16 baseline PNGs (8 surfaces × 2 themes) under frontend/visual-tests/*-snapshots/*-chromium-{light,dark}-win32.png"
  - "Pinned @playwright/test@1.59.1 in frontend/package.json devDependencies + npm script test:visual"
affects: [07-05-readme-cleanup-final-polish]

# Tech tracking
tech-stack:
  added:
    - "@playwright/test@1.59.1 (exact pin, no ^/~) — Chromium browser binary downloaded to %LOCALAPPDATA%\\ms-playwright via `npx playwright install chromium`"
  patterns:
    - "Anti-flake separation of concerns: structural enforcement of always-on measures (reducedMotion + animation override) inside _fixtures.ts page-fixture; per-call measures (threshold + maxDiffPixelRatio + settle) visible at each toHaveScreenshot site for review"
    - "Theme matrix via Playwright projects: chromium-light and chromium-dark expand 8 specs into 16 baselines with no per-theme code in any spec"
    - "Mock-route hydration for VRT: page.route() intercepts /api/conversations, /api/conversations/{id}, /api/stats/cost, and message-stream endpoint — specs run against a real vite preview build with zero backend dependency"
    - "snapshotPathTemplate with explicit {projectName} and {platform} placeholders — without {projectName}, both projects overwrite the same PNG path (8 baselines instead of 16); without {platform}, an accidental cross-OS run silently corrupts the canonical set"
    - "Visible-only locator filter (.foo:visible) for surfaces with dual-mount components (mobile drawer + desktop instance both rendered, with mobile display:none above 768px)"

key-files:
  created:
    - frontend/visual-tests/playwright.config.ts
    - frontend/visual-tests/_fixtures.ts
    - frontend/visual-tests/welcome-state.spec.ts
    - frontend/visual-tests/sidebar-empty.spec.ts
    - frontend/visual-tests/theme-toggle.spec.ts
    - frontend/visual-tests/error-banner.spec.ts
    - frontend/visual-tests/settings-panel.spec.ts
    - frontend/visual-tests/stage2-rankings.spec.ts
    - frontend/visual-tests/stage3-highlight.spec.ts
    - frontend/visual-tests/critique-loaded.spec.ts
    - frontend/visual-tests/fixtures/stage2-mock-sse.json
    - frontend/visual-tests/critique-loaded.spec.ts-snapshots/critique-loaded-chromium-light-win32.png
    - frontend/visual-tests/critique-loaded.spec.ts-snapshots/critique-loaded-chromium-dark-win32.png
    - frontend/visual-tests/error-banner.spec.ts-snapshots/error-banner-chromium-light-win32.png
    - frontend/visual-tests/error-banner.spec.ts-snapshots/error-banner-chromium-dark-win32.png
    - frontend/visual-tests/settings-panel.spec.ts-snapshots/settings-panel-chromium-light-win32.png
    - frontend/visual-tests/settings-panel.spec.ts-snapshots/settings-panel-chromium-dark-win32.png
    - frontend/visual-tests/sidebar-empty.spec.ts-snapshots/sidebar-empty-chromium-light-win32.png
    - frontend/visual-tests/sidebar-empty.spec.ts-snapshots/sidebar-empty-chromium-dark-win32.png
    - frontend/visual-tests/stage2-rankings.spec.ts-snapshots/stage2-rankings-chromium-light-win32.png
    - frontend/visual-tests/stage2-rankings.spec.ts-snapshots/stage2-rankings-chromium-dark-win32.png
    - frontend/visual-tests/stage3-highlight.spec.ts-snapshots/stage3-highlight-chromium-light-win32.png
    - frontend/visual-tests/stage3-highlight.spec.ts-snapshots/stage3-highlight-chromium-dark-win32.png
    - frontend/visual-tests/theme-toggle.spec.ts-snapshots/theme-toggle-chromium-light-win32.png
    - frontend/visual-tests/theme-toggle.spec.ts-snapshots/theme-toggle-chromium-dark-win32.png
    - frontend/visual-tests/welcome-state.spec.ts-snapshots/welcome-state-chromium-light-win32.png
    - frontend/visual-tests/welcome-state.spec.ts-snapshots/welcome-state-chromium-dark-win32.png
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - .gitignore

key-decisions:
  - "Native Windows execution (D-03 revised) — npx playwright test, no Docker. Docker deferred to v2.1+ contingency if CI or external contributors ever materialise."
  - "Critique surface hero state = path (a) setInputFiles injection (not path (b) pre-built fixtures/critique-conversation.json). DropZoneSlot uses a standard <input type='file'> (verified in DropZoneSlot.jsx:103); setInputFiles drives the real CritiqueWelcome.handleFile path and produces a baseline that exercises actual mount logic. Path (b) would have bypassed handleFile and produced a weaker baseline. As a consequence, fixtures/critique-conversation.json was NOT created."
  - "snapshotPathTemplate explicit '{arg}-{projectName}-{platform}{ext}' instead of the bare '{arg}{ext}' the plan suggested. The bare template makes both projects overwrite the same path (we discovered this empirically: first full run produced 8 baselines, not 16). Explicit projectName + platform also forces the -win32 suffix so a v2.1+ Linux regeneration writes alongside, not over."
  - "ErrorBanner trigger = mocked SSE error event over message-stream endpoint, driven by submitting a tiny message after selecting a mocked conversation. Exercises App.handleStreamEvent's 'error' branch through the real reducer path; no app-side hooks or test-only globals added."
  - "Visible-only locators (.foo:visible) for conversation-item clicks. App.jsx renders both mobile SidebarDrawer's <Sidebar> (display:none at 1280px) and the desktop <Sidebar>; drawer comes first in document order so .conversation-item.first() picks the hidden one. :visible filters to the desktop instance deterministically."

requirements-completed: [VRT-01, VRT-02, VRT-03]

# Metrics
duration: 35min
completed: 2026-05-11
---

# Phase 07 Plan 03: Playwright VRT Suite (VRT-01 + VRT-02 + VRT-03) Summary

**Playwright 1.59.1 visual-regression suite with 8 specs × 2 themes = 16 Windows-native Chromium baselines, all 5 anti-flake measures applied to every spec (4+5 enforced structurally via `_fixtures.ts`, 1+2+3 visible at each `toHaveScreenshot` call site).**

## What was built

A complete VRT toolchain at `frontend/visual-tests/`:

1. **Config + anti-flake substrate** — `playwright.config.ts` (2 projects, vite preview webServer, OS-suffixed snapshot paths) + `_fixtures.ts` (reducedMotion + global animation override + caret-color transparent + `settle(page)` helper).
2. **8 spec files** covering the D-02 locked surfaces, each producing 2 baselines (light + dark theme):
   - `welcome-state.spec.ts` — empty conversation list, ChatInterface welcome copy.
   - `sidebar-empty.spec.ts` — same backend state, framed for sidebar empty surface.
   - `theme-toggle.spec.ts` — header theme toggle button focused.
   - `error-banner.spec.ts` — ErrorBanner mounted via real SSE 'error' event from mocked stream.
   - `settings-panel.spec.ts` — gear icon opened, all controls at defaults (theme=system/M/comfortable/8).
   - `stage2-rankings.spec.ts` — 4 evaluations + populated aggregate rankings (fixture).
   - `stage3-highlight.spec.ts` — same fixture, Stage 3 panel scrolled into view.
   - `critique-loaded.spec.ts` — 3 files via setInputFiles + instruction typed, pre-submit.
3. **1 fixture file** — `fixtures/stage2-mock-sse.json` carrying the canonical quality-profile council shape (4 stage1 responses + 4 stage2 evaluations + aggregate_rankings + label_to_model + stage3.response/model + chairman metadata).
4. **16 baseline PNGs** under `frontend/visual-tests/*.spec.ts-snapshots/` (Windows-native Chromium render).
5. **package.json** changes: pinned `@playwright/test@1.59.1` (exact, no `^`/`~`) and added `npm run test:visual`.

## Canonical command for 07-05 (README)

The bare command the README must document for `npm run test:visual` and for `--update-snapshots` baseline regeneration:

```bash
cd frontend
npx playwright test --config visual-tests/playwright.config.ts
```

Add `--update-snapshots` ONLY when intentionally regenerating baselines. The first-time install also requires `npx playwright install chromium` to download the browser binary (~290 MiB total, cached at `%LOCALAPPDATA%\ms-playwright`).

## Critique surface — hero state strategy chosen

**Path (a) — `setInputFiles()`** (not path (b) `page.route` + fixture JSON).

Rationale: DropZoneSlot.jsx:103 renders a standard `<input type="file" style="display:none">`. Playwright's `setInputFiles()` drives hidden file inputs by design (it sets the input value directly; visibility is irrelevant). This exercises the real `CritiqueWelcome.handleFile` validation path (size check, extension check, line-ending normalisation, slot state mutation) and produces a baseline that catches drift in the real mount logic. Path (b) would have bypassed `handleFile` entirely.

The 3 deterministic files injected are `model-{a,b,c}-notes.md` with ~3-5 line content each. The textarea is filled with `"Evaluate the depth of each research file and flag any missing primary sources."` via `.fill()` (instantaneous — `.type()` would have introduced keystroke timing noise).

Consequence: `fixtures/critique-conversation.json` was NOT created. The plan's frontmatter `files_modified` originally listed it; this SUMMARY corrects the as-built list.

## 16-baseline file listing

All 16 PNGs (8 surfaces × {light, dark} × Windows render):

```
frontend/visual-tests/critique-loaded.spec.ts-snapshots/critique-loaded-chromium-light-win32.png
frontend/visual-tests/critique-loaded.spec.ts-snapshots/critique-loaded-chromium-dark-win32.png
frontend/visual-tests/error-banner.spec.ts-snapshots/error-banner-chromium-light-win32.png
frontend/visual-tests/error-banner.spec.ts-snapshots/error-banner-chromium-dark-win32.png
frontend/visual-tests/settings-panel.spec.ts-snapshots/settings-panel-chromium-light-win32.png
frontend/visual-tests/settings-panel.spec.ts-snapshots/settings-panel-chromium-dark-win32.png
frontend/visual-tests/sidebar-empty.spec.ts-snapshots/sidebar-empty-chromium-light-win32.png
frontend/visual-tests/sidebar-empty.spec.ts-snapshots/sidebar-empty-chromium-dark-win32.png
frontend/visual-tests/stage2-rankings.spec.ts-snapshots/stage2-rankings-chromium-light-win32.png
frontend/visual-tests/stage2-rankings.spec.ts-snapshots/stage2-rankings-chromium-dark-win32.png
frontend/visual-tests/stage3-highlight.spec.ts-snapshots/stage3-highlight-chromium-light-win32.png
frontend/visual-tests/stage3-highlight.spec.ts-snapshots/stage3-highlight-chromium-dark-win32.png
frontend/visual-tests/theme-toggle.spec.ts-snapshots/theme-toggle-chromium-light-win32.png
frontend/visual-tests/theme-toggle.spec.ts-snapshots/theme-toggle-chromium-dark-win32.png
frontend/visual-tests/welcome-state.spec.ts-snapshots/welcome-state-chromium-light-win32.png
frontend/visual-tests/welcome-state.spec.ts-snapshots/welcome-state-chromium-dark-win32.png
```

## Validation

- **Baseline generation:** `cd frontend && npx playwright test --config visual-tests/playwright.config.ts --update-snapshots` → 16/16 written in ~36s.
- **Clean second run** (without `--update-snapshots`): 16/16 passed in ~31s, zero flake. All anti-flake measures hold against the freshly-generated baselines.
- **D-02c structural compliance:** `grep -L "from './_fixtures'" frontend/visual-tests/*.spec.ts` returns empty — every spec uses the centralised fixture.
- **Threshold + ratio compliance:** Every `toHaveScreenshot()` call carries `threshold: 0.2` AND `maxDiffPixelRatio: 0.02` (8 instances of each).
- **`settle(page)` compliance:** Every spec calls `await settle(page)` before the screenshot (8 instances).

## Surfaces pulled from VRT scope

**None.** All 8 D-02 surfaces produced stable baselines on the first clean second run. No D-02c exemption clause invoked.

## Compliance check vs success criteria

- ✅ 8 spec files cover the 8 D-02 surfaces, one hero state per surface (D-02b).
- ✅ 16 baseline PNGs committed.
- ✅ All 5 anti-flake measures applied to every spec (4+5 structurally via `_fixtures.ts`; 1+2+3 visible at call site).
- ✅ `@playwright/test@1.59.1` pinned exactly (no `^`/`~`).
- ✅ Playwright runs natively on Windows (D-03 revised — no Docker required).
- ✅ Clean second-run validation passes (no flake).
- ✅ No CI configuration (no `.github/workflows/`, no `.gitlab-ci.yml`).

VRT-01 (8 surfaces × 2 themes baselined), VRT-02 (5 anti-flake measures applied), VRT-03 (Windows-native execution per revised D-03) are all structurally satisfied.

## Deviations from Plan

### Auto-fixed Issues

Five Rule 1/3 bugs surfaced during Task 4 baseline generation. All were authored-by-this-plan defects — not pre-existing surface drift — so they fall squarely inside the executor's auto-fix mandate. Fix details:

**1. [Rule 1 — Bug] ESM `__dirname` undefined in spec module scope**
- **Found during:** Task 4, first baseline run.
- **Issue:** `stage2-rankings.spec.ts` and `stage3-highlight.spec.ts` used bare `__dirname` to resolve `fixtures/stage2-mock-sse.json`. `frontend/package.json` declares `"type": "module"`, so Playwright loaded the specs as ESM and `__dirname` was undefined.
- **Fix:** Added `const __dirname = path.dirname(fileURLToPath(import.meta.url));` at module scope in both specs.
- **Files modified:** `frontend/visual-tests/stage2-rankings.spec.ts`, `frontend/visual-tests/stage3-highlight.spec.ts`.
- **Commit:** `da90ed2`.

**2. [Rule 1 — Bug] `.conversation-item.first()` picked hidden drawer instance**
- **Found during:** Task 4, second baseline run (after fix 1).
- **Issue:** `App.jsx` renders both the mobile `<SidebarDrawer>`'s `<Sidebar>` instance (display:none at 1280px viewport per `SidebarDrawer.css`) AND the desktop `<Sidebar>`. The drawer's instance precedes the desktop instance in document order, so `page.locator('.conversation-item').first()` resolved to the hidden one and `click()` timed out.
- **Fix:** Replaced `.conversation-item` with `.conversation-item:visible` in 4 specs.
- **Files modified:** `frontend/visual-tests/error-banner.spec.ts`, `frontend/visual-tests/stage2-rankings.spec.ts`, `frontend/visual-tests/stage3-highlight.spec.ts`, `frontend/visual-tests/critique-loaded.spec.ts`.
- **Commit:** `da90ed2`.

**3. [Rule 1 — Bug] Wrong dropzone slot class in critique-loaded selector**
- **Found during:** Task 4, second baseline run.
- **Issue:** `critique-loaded.spec.ts` selected `.dropzone-slot input[type="file"]`. Actual class in `DropZoneSlot.jsx:65` is `.drop-zone-slot` (kebab-case with the additional hyphen).
- **Fix:** Replaced `.dropzone-slot` with `.drop-zone-slot`.
- **Files modified:** `frontend/visual-tests/critique-loaded.spec.ts`.
- **Commit:** `da90ed2`.

**4. [Rule 1 — Bug] Fixture missing `stage3.model` crashed React tree**
- **Found during:** Task 4, third baseline run (after fixes 1–3).
- **Issue:** `Stage3.jsx:37` calls `finalResponse.model.split('/')` unconditionally. The Stage 2 fixture's `stage3` block carried only `response`, no `model`. React tree unmounted with `Cannot read properties of undefined (reading 'split')` after the user clicked the mocked conversation; `<div id="root">` went empty and the `stage2`/`stage3` section waits timed out. Captured via `page.on('pageerror')` instrumentation.
- **Fix:** Added `"model": "anthropic/claude-opus-4.7"` to the fixture's `stage3` object.
- **Files modified:** `frontend/visual-tests/fixtures/stage2-mock-sse.json`.
- **Commit:** `da90ed2`.

**5. [Rule 1 — Bug] `snapshotPathTemplate` missing `{projectName}` placeholder**
- **Found during:** Task 4, fourth baseline run.
- **Issue:** The bare template `{testDir}/{testFilePath}-snapshots/{arg}{ext}` does NOT auto-append the project name. `chromium-light` and `chromium-dark` projects both wrote to the same PNG path → second project overwrote first → only 8 baselines existed at the end of the first complete run, not 16.
- **Fix:** Changed template to `{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}` so the filename carries both theme and OS suffix. This also forces the `-win32` suffix the plan required for cross-OS coexistence.
- **Files modified:** `frontend/visual-tests/playwright.config.ts`.
- **Commit:** `da90ed2`.

### Files added to .gitignore

`frontend/playwright-search-report/` and `frontend/test-results/` are runtime artefacts (HTML report + per-test debug context, regenerated on every run). Added to `.gitignore` so accidental `git add .` does not pollute the repo. The committed baselines under `frontend/visual-tests/*-snapshots/` are explicitly NOT ignored.

### Task 1 sub-step (browser binary install)

The plan called for `npm install --prefix frontend` to download both `@playwright/test@1.59.1` and the Chromium binary. In practice, npm install only installs the npm package; the browser binary itself requires the separate `npx playwright install chromium` step. Documented this in the SUMMARY's "Canonical command" section so the README in 07-05 includes it as a first-run prerequisite.

## Known Stubs

None. All 8 specs are wired against the real app via mocked routes; the Stage 2 fixture contains hydrated content; no placeholder text or empty arrays leak into rendered baselines.

## Threat Flags

None. The VRT spec/fixture additions:
- Do not introduce network endpoints (specs only intercept existing endpoints via `page.route`).
- Do not introduce auth paths or schema changes at trust boundaries.
- Do not introduce file-access patterns at runtime; spec/fixture I/O is bounded by Node's test process inside `frontend/visual-tests/`.

The `frontend/test-results/` and `frontend/playwright-report/` paths added to `.gitignore` are local-only runtime output, not shared state.

## Self-Check: PASSED

All claimed files exist on disk; all 5 commit hashes are reachable in the local git history; all 16 baseline PNGs are present under `frontend/visual-tests/*-snapshots/`; the canonical second-run validation has been executed and produced 16/16 passing.

- `frontend/visual-tests/playwright.config.ts` — FOUND
- `frontend/visual-tests/_fixtures.ts` — FOUND
- 8 `*.spec.ts` files — FOUND (verified `ls frontend/visual-tests/*.spec.ts | wc -l = 8`)
- `frontend/visual-tests/fixtures/stage2-mock-sse.json` — FOUND
- 16 PNGs under `*-snapshots/` — FOUND (verified `find frontend/visual-tests -name '*.png' | wc -l = 16`)
- Commits: `363c8f3`, `a7421be`, `2ab41c7`, `da90ed2`, `3a332bb` — all FOUND in `git log`.
