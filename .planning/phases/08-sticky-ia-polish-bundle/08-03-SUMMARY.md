---
phase: 08-sticky-ia-polish-bundle
plan: 03
subsystem: frontend
tags: [a11y, contrast, scroll-to-top, calmo, no-new-tokens]
status: paused-at-checkpoint
checkpoint_task: 3
requirements_closed_partial:
  - A11Y-V2.1-01  # code changes landed; full close pending human smoke (Task 3)
dependency_graph:
  requires: []
  provides:
    - "BackToTopButton resting symbol color = var(--color-fg-primary)"
    - "BackToTopButton visibility threshold = 600px (down from 800)"
  affects:
    - frontend/src/components/BackToTopButton.jsx
    - frontend/src/components/BackToTopButton.css
tech_stack:
  added: []
  patterns:
    - "Token-only contrast bump (no new CSS custom properties)"
    - "Threshold integer change (no architecture shift)"
key_files:
  created:
    - .planning/phases/08-sticky-ia-polish-bundle/08-03-SUMMARY.md
    - .planning/phases/08-sticky-ia-polish-bundle/deferred-items.md
  modified:
    - frontend/src/components/BackToTopButton.jsx
    - frontend/src/components/BackToTopButton.css
decisions:
  - "D-11 primary swap applied (color -> --color-fg-primary). Background escalation NOT applied — deferred to human smoke per D-11's devtools-first rule."
  - "D-12 threshold lowered to 600. JSDoc on line 5-6 updated to match."
  - "D-10 preserved verbatim: aria-label=\"Back to top\" (English) untouched on JSX line 38."
metrics:
  duration_minutes: ~6
  completed_date: 2026-05-12
  tasks_auto_completed: 2
  tasks_checkpoint_pending: 1
  files_modified: 2
  commits: 2
---

# Phase 8 Plan 3: Scroll-to-top a11y baseline Summary

One-liner: lowered the back-to-top button's reveal threshold from 800px to 600px and bumped its resting symbol color from `--color-fg-secondary` to `--color-fg-primary` to clear WCAG AA, leaving `aria-label="Back to top"` and the per-click `prefers-reduced-motion` handler untouched.

## What shipped

Two surgical edits in two files, two atomic commits. No new tokens, no behavior added, no test surface introduced.

### `frontend/src/components/BackToTopButton.jsx`

- Line 18 (effect): `setVisible(el.scrollTop > 800)` → `setVisible(el.scrollTop > 600)` (D-12).
- Lines 5-6 (JSDoc): `.messages-container.scrollTop > 800` literal updated to `> 600` so future `grep`-driven archaeology matches reality.
- **NOT touched:** line 29 (`window.matchMedia('(prefers-reduced-motion: reduce)')` per-click check) and line 38 (`aria-label="Back to top"`, D-10 conscious EN override of REQUIREMENTS.md:39) and line 39 (`tabIndex={visible ? 0 : -1}`).

### `frontend/src/components/BackToTopButton.css`

- Line 21 (resting `.back-to-top`): `color: var(--color-fg-secondary)` → `color: var(--color-fg-primary)` (D-11 primary swap).
- **NOT touched:** line 18 background (`var(--color-bg-elevated)` retained — escalation deferred to smoke), lines 26-31 (opacity transitions / motion tokens), lines 38-41 (`:hover` rule: `color: var(--color-fg-primary)` + `background: var(--color-bg-secondary)`), lines 43-46 (`:focus-visible`), nor any size/position/z-index property.
- **0 new CSS custom properties** introduced (verified via `grep -E '^\s*--[a-z-]+:'` → 0 hits).

## Commits

| Task | Commit    | Type  | Message                                                              |
| ---- | --------- | ----- | -------------------------------------------------------------------- |
| 1    | `42d4842` | feat  | feat(08-03/T1): lower BackToTopButton threshold to 600               |
| 2    | `962bc42` | style | style(08-03/T2): bump BackToTopButton color to fg-primary for AA contrast |

## Automated verification

| Check                                                                              | Expected | Actual | Status |
| ---------------------------------------------------------------------------------- | -------- | ------ | ------ |
| `grep -c "scrollTop > 600" BackToTopButton.jsx`                                    | ≥ 1      | 2      | PASS   |
| `grep -c "scrollTop > 800" BackToTopButton.jsx`                                    | 0        | 0      | PASS   |
| `grep -c "> 800" BackToTopButton.jsx`                                              | 0        | 0      | PASS   |
| `grep -c 'aria-label="Back to top"' BackToTopButton.jsx`                           | 1        | 1      | PASS   |
| `grep -c "prefers-reduced-motion" BackToTopButton.jsx`                             | ≥ 1      | 2      | PASS   |
| `grep -c "color: var(--color-fg-primary)" BackToTopButton.css`                     | ≥ 2      | 2      | PASS   |
| `grep -c "color: var(--color-fg-secondary)" BackToTopButton.css`                   | 0        | 0      | PASS   |
| New `--*` custom properties introduced in `BackToTopButton.css`                    | 0        | 0      | PASS   |
| `npx eslint src/components/BackToTopButton.jsx`                                    | 0 errors | 0 errors | PASS |
| `npm run build`                                                                    | exit 0   | exit 0 (18.54s, 541 modules) | PASS |

## A11Y-V2.1-01 closure status

| Sub-clause                                       | Status                | Evidence                                                                 |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------------------ |
| Threshold = 600                                  | DONE (code)           | T1 commit `42d4842`                                                       |
| `aria-label="Back to top"` (D-10 EN override)    | PRESERVED             | Line 38 untouched; grep confirms                                          |
| `prefers-reduced-motion` instant click-scroll    | PRESERVED             | Line 29 untouched; per-click `matchMedia` intact                          |
| WCAG AA contrast on `↑` glyph (light + dark)     | PENDING SMOKE         | T2 commit `962bc42` applied D-11 primary swap; numeric ratio must be verified in devtools at Task 3 |

**A11Y-V2.1-01 is therefore "code-complete, awaiting human contrast verification".** The requirement is NOT marked closed in REQUIREMENTS.md yet — the orchestrator should defer that mark-complete until the smoke approves the contrast numbers.

## Deviations from Plan

### Rule 3 - Blocking issue (auto-resolved)

**1. `node_modules` missing in worktree**
- **Found during:** Task 1 verify (`npm run lint`).
- **Issue:** `eslint` not on PATH; `frontend/node_modules` absent in fresh worktree.
- **Fix:** Ran `npm ci --no-audit --no-fund` (added 396 packages, ~1 min). This is install of the existing lockfile — no version drift, no `package.json` change.
- **Files modified:** none tracked (worktree-local `node_modules`, already gitignored).
- **Commit:** n/a (no source change).

### Out-of-scope discoveries (NOT auto-fixed — logged to `deferred-items.md`)

**2. Pre-existing lint error in `frontend/src/components/Stage1.jsx:33`**
- **Found during:** Task 1 verify (`npm run lint`).
- **Issue:** `react-hooks/set-state-in-effect` — `setNeedsToggle(true)` called synchronously inside `useEffect`. Pre-existing; unrelated to BackToTopButton.
- **Decision:** Per executor `SCOPE BOUNDARY` rule, deferred. Logged to `.planning/phases/08-sticky-ia-polish-bundle/deferred-items.md`. To validate this plan's verify in isolation, ran `npx eslint src/components/BackToTopButton.jsx` directly (0 errors).

## Smoke-may-surface notes (for Task 3 human verifier)

These are NOT deviations from the plan — they are anticipated questions the smoke session must answer:

1. **Will the resting symbol clear WCAG AA in both themes with the primary swap alone?** The plan's D-11 escalation rule says: if devtools reports < 4.5:1 in either theme, additionally change `background: var(--color-bg-elevated)` → `var(--color-bg-secondary)` on line 18 of `BackToTopButton.css`. The escalation is **NOT applied here** because:
   - The plan explicitly requires devtools verification before escalation ("verify with devtools during Task 3 smoke").
   - This executor cannot run Chromium / read Accessibility panel contrast ratios.
   - If escalation is needed, it is a 1-line follow-up commit (`style(08-03/T2.1): escalate BackToTopButton background to bg-secondary for AA`).
2. **If escalation is taken, the hover state collapses** (resting and hover both end up with `color: var(--color-fg-primary)` + `background: var(--color-bg-secondary)`). The plan calls this an acceptable Direction A "calmo" outcome; verifier should confirm or flag.
3. **Global `@media (prefers-reduced-motion: reduce)` for the fade transitions** is NOT in scope for Phase 8 (per the plan's own note). If the fade still animates noticeably under reduced motion, log for Phase 10 follow-up — do NOT add a new rule here.

## Measured contrast ratios (light theme / dark theme)

PENDING — populate during/after Task 3 smoke.

| Theme | Token chain                                              | Ratio | Status (AA = ≥ 4.5:1) |
| ----- | -------------------------------------------------------- | ----- | --------------------- |
| Light | `--color-fg-primary` on `--color-bg-elevated`           | TBD   | TBD                   |
| Dark  | `--color-fg-primary` on `--color-bg-elevated`           | TBD   | TBD                   |

If either row reads < 4.5:1, apply the D-11 escalation noted above.

## Known Stubs

None.

## Threat Flags

None — UI-only change, no new boundaries or surface.

## Self-Check: PASSED

- `frontend/src/components/BackToTopButton.jsx` exists with `scrollTop > 600` (verified).
- `frontend/src/components/BackToTopButton.css` exists with `color: var(--color-fg-primary)` in resting block (verified).
- Commit `42d4842` exists on `worktree-agent-aa84eb94865c8fbeb` (verified via `git log`).
- Commit `962bc42` exists on `worktree-agent-aa84eb94865c8fbeb` (verified via `git log`).
- `.planning/phases/08-sticky-ia-polish-bundle/deferred-items.md` created (verified).

## Next step

**Task 3 (`checkpoint:human-verify`) is the gating step before A11Y-V2.1-01 is marked complete.** This executor stops here and returns control to the phase orchestrator for human-smoke coordination.
