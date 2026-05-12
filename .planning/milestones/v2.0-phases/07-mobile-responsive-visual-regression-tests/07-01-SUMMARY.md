---
phase: 07-mobile-responsive-visual-regression-tests
plan: 01
subsystem: ui
tags: [css, responsive, mobile, safe-area, touch-target, wcag, ios-hig, viewport]

# Dependency graph
requires:
  - phase: 04-ui-overhaul
    provides: ":root token taxonomy in frontend/src/index.css (--space-*, --layout-*, --color-*) and the canonical @media (max-width: 768px) block in App.css that this plan extends"
provides:
  - "`--touch-target-min: 44px` CSS token in `:root` (frontend/src/index.css)"
  - "`viewport-fit=cover` viewport meta (frontend/index.html)"
  - "≤768px touch-target floor on every interactive control (button, [role='button'], a, radio, checkbox, .conversation-item, .quality-option) in App.css"
  - "`env(safe-area-inset-*)` threaded through `.app-header` (Header.css) and `.input-form` composer (ChatInterface.css), all wrapped in `max(env(...), fallback)` so non-notched devices keep their pre-Phase-7 padding"
  - "`touch-action: pan-y` on `.messages-container` — prerequisite for the 07-02 swipe-to-close drawer hook"
  - "App.css ≤768px block now hides desktop `.sidebar` with `display: none` (transform-based overlay drawer retired; native `<dialog>` drawer in 07-02 will own the mobile nav surface)"
affects: [07-02-mobile-drawer, 07-03-visual-regression-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "max(env(safe-area-inset-X), fallback) idiom — preserves desktop/Android padding rhythm while raising notched-iOS content above safe-area edges"
    - "Broad ≤768px touch-target selector list — single enforcement block in App.css covers every interactive control without component-by-component opt-in"
    - "Defensive co-location of touch-target rules in component CSS (Sidebar.css, QualityToggle.css) — App.css is the single source of truth, component files mirror for discoverability"

key-files:
  created: []
  modified:
    - frontend/src/index.css
    - frontend/index.html
    - frontend/src/App.css
    - frontend/src/components/Header.css
    - frontend/src/components/ChatInterface.css
    - frontend/src/components/Sidebar.css
    - frontend/src/components/QualityToggle.css

key-decisions:
  - "Composer (.input-form) padding fallback raised from var(--space-3) (plan-stated) to var(--space-5) (current desktop value) to honor the must_have 'Non-notched devices keep their pre-Phase-7 padding rhythm' — Rule 1 deviation documented below"
  - "Every env(safe-area-inset-*) call wrapped in max(...) — zero bare env() calls — even on padding-top where env(...,0px) would be functionally equivalent, kept for plan-consistency"
  - "Desktop sidebar hidden via display:none on ≤768px (per plan); transform-based overlay drawer rule deleted, native <dialog> drawer in 07-02 owns mobile nav"

patterns-established:
  - "Pattern A: Header chrome height extends into notch — height = calc(--layout-header-h + env(safe-area-inset-top)) keeps content row at 52px while background fills the notch zone"
  - "Pattern B: Composer wrapper uses max(env(safe-area-inset-bottom), --space-5) for padding-bottom — non-notched devices see 24px, iOS home-indicator devices see at least 24px (or the inset, whichever is larger)"
  - "Pattern C: Single App.css selector-list block (button, [role='button'], a, input[type='radio'], input[type='checkbox'], .conversation-item, .quality-option) inside @media (max-width: 768px) is the canonical touch-target enforcer"

requirements-completed: [MOBL-01, MOBL-03]

# Metrics
duration: 5min
completed: 2026-05-11
---

# Phase 07 Plan 01: Responsive Substrate (MOBL-01 + MOBL-03) Summary

**`--touch-target-min: 44px` token + `viewport-fit=cover` viewport meta + `max(env(safe-area-inset-*), fallback)` wired through Header / composer / App.css, no .jsx touched.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-11T11:32:45Z
- **Completed:** 2026-05-11T11:37:41Z
- **Tasks:** 2 / 2
- **Files modified:** 7

## Accomplishments
- Declared `--touch-target-min: 44px` in `:root` next to the existing layout token cluster (frontend/src/index.css).
- Switched viewport meta to `viewport-fit=cover` so `env(safe-area-inset-*)` returns non-zero on notched iOS (frontend/index.html).
- `.app-header` padding-top + inline padding use `max(env(safe-area-inset-*), fallback)`; header chrome extends into the notch zone while the content row stays at 52px.
- `.messages-container` gets `touch-action: pan-y` (prerequisite for the 07-02 swipe-to-close drawer hook).
- `.input-form` composer wraps all four padding sides in `max(env(safe-area-inset-*), --space-5)` — non-notched devices keep their pre-Phase-7 24px rhythm; iOS home-indicator devices see the inset.
- `App.css` ≤768px block now hides desktop `.sidebar` with `display: none` and applies the broad touch-target floor selector list.
- Sidebar.css + QualityToggle.css carry defensive ≤768px touch-target rules (App.css is canonical; component files mirror for discoverability).

## Task Commits

1. **Task 1: Declare --touch-target-min token + viewport-fit=cover meta** — `c0ca438` (feat)
2. **Task 2: Thread safe-area-inset + touch-action into Header / ChatInterface / App / Sidebar / QualityToggle CSS** — `f325b09` (feat)

**Plan metadata commit:** (next step — SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `frontend/src/index.css` — added `--touch-target-min: 44px` in `:root` with a WHY comment.
- `frontend/index.html` — viewport meta gained `viewport-fit=cover`.
- `frontend/src/App.css` — replaced transform-based mobile drawer rule with `display: none`; appended broad-selector touch-target floor block.
- `frontend/src/components/Header.css` — `.app-header` padding-top/right/left now use `max(env(safe-area-inset-*), fallback)`; height extended by `max(env(safe-area-inset-top), 0px)`.
- `frontend/src/components/ChatInterface.css` — `.messages-container` gains `touch-action: pan-y`; `.input-form` padding wraps all four sides in `max(env(...), --space-5)`.
- `frontend/src/components/Sidebar.css` — appended `@media (max-width: 768px)` with touch-target floor on `.new-conversation-btn`, `.conversation-item`, `.content-search-affordance`, `.conversation-item .menu-trigger`.
- `frontend/src/components/QualityToggle.css` — appended `@media (max-width: 768px)` with `.quality-option { min-height: var(--touch-target-min); }`.

## Composer / textarea-row class discovery (for 07-02)

For 07-02's `inert` wiring on the main app shell while the drawer is open:

- The composer **outer wrapper** is `<form className="input-form">` at `frontend/src/components/ChatInterface.jsx:333`.
- The textarea **row** inside the form is `<div className="input-row">` at `frontend/src/components/ChatInterface.jsx:357`.
- The form's safe-area-aware padding lives on `.input-form` (the outer form), NOT on `.input-row`. 07-02 does not need to touch either — the drawer wiring acts on the main shell wrapper (`.app__main-with-banner`), not the composer.

## Decisions Made

- **Composer padding fallback raised from `--space-3` to `--space-5`** (Rule 1 deviation — see below). Kept desktop rhythm intact per must_have.
- **All four sides of `.input-form` padding use `max(env(safe-area-inset-X), --space-5)`** — not just bottom. Inset-left/right kick in on landscape iPhone, which the user will encounter the moment they rotate. Zero cost on portrait / non-notched.
- **`env(safe-area-inset-top)` wrapped in `max(...)` even though `env(..., 0px)` is functionally equivalent for top** — plan rule "zero bare env() calls" honored verbatim for consistency with reviewer expectations.
- **Sidebar.css + QualityToggle.css carry their own ≤768px touch-target rules** (defensive co-location). App.css is canonical; these mirror per plan's "defensive co-location" instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Composer padding-bottom fallback would have collapsed desktop padding**
- **Found during:** Task 2 (`.input-form` rule).
- **Issue:** Plan action text said `padding-bottom: max(env(safe-area-inset-bottom), var(--space-3))`. Current `.input-form` padding is `var(--space-5)` (24px). Using `--space-3` (12px) as the fallback would have shrunk desktop padding by 12px — a visible regression and a direct violation of the must_have truth: *"Non-notched devices keep their pre-Phase-7 padding rhythm (no collapsed padding)"*. Must_haves take priority over action text per execute-plan deviation rules.
- **Fix:** Used `var(--space-5)` (= current desktop value) as the fallback on all four padding sides of `.input-form`. Result: desktop visually unchanged; iOS home-indicator devices get `env()` inset (typically 34px on iPhone 14 Pro) which is larger than 24px so `max()` picks the inset there.
- **Files modified:** `frontend/src/components/ChatInterface.css`
- **Verification:** `grep -n "input-form" frontend/src/components/ChatInterface.css` shows `max(env(safe-area-inset-bottom), var(--space-5))`. Manual DevTools check pending (see "Manual verification pending" below).
- **Committed in:** `f325b09` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added safe-area-inset-left / safe-area-inset-right to composer wrapper**
- **Found during:** Task 2 (`.input-form` rule).
- **Issue:** Plan action mentioned only `padding-bottom: max(env(safe-area-inset-bottom), …)` on the composer. iOS landscape orientation puts the notch/dynamic-island on the side, and `safe-area-inset-left` / `safe-area-inset-right` become non-zero. Without horizontal safe-area handling, the textarea row would be partially obscured by the notch when the user rotates the phone. This is a correctness requirement for the must_have "Notched iPhones render … composer … inside the safe area (not under notch …)".
- **Fix:** Wrapped all four padding sides of `.input-form` in `max(env(safe-area-inset-X), var(--space-5))`.
- **Files modified:** `frontend/src/components/ChatInterface.css`
- **Verification:** All four `env(safe-area-inset-*)` calls present on `.input-form`; non-notched fallback is `--space-5` (= current value, no regression).
- **Committed in:** `f325b09` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 2 missing critical)
**Impact on plan:** Both auto-fixes necessary to satisfy the must_haves. No scope creep; all changes stay within the files listed in plan frontmatter.

## Issues Encountered
- None blocking. Pre-existing line-ending warnings from git on Windows (`LF will be replaced by CRLF`) on `App.css` and `QualityToggle.css` during commit — informational only, no action needed.

## Confirmation: No .jsx files modified

`git diff --name-only c0ca438~1 HEAD` returns only the 7 files listed in plan frontmatter (all `.css` + `index.html` + `index.css`). **Zero `.jsx` files touched.** The hamburger button and `<dialog>` drawer remain unowned by this plan and will be wired by 07-02.

## Manual verification pending

Per the plan's manual checks (DevTools device-mode toggling between iPhone 14 Pro / iPhone SE / desktop), the visual verification is the **next step before 07-02 starts** — recommend the user spot-checks:

1. Desktop (>768px): layout identical to pre-Phase-7.
2. iPhone 14 Pro (notched): header background extends into notch, composer raised above home indicator.
3. iPhone SE (non-notched, 375×667): padding identical to desktop (`max()` fallback wins).
4. ≤768px: every button / `.quality-option` / `.conversation-item` has computed `min-width` and `min-height` = 44px.

No automated VRT exists yet — that's the 07-03 deliverable, which this plan is the substrate for.

## Next Phase Readiness

- **07-02 (drawer)**: token + viewport meta in place; can mount `<dialog>` drawer immediately.
- **07-03 (VRT)**: surface is at final mobile geometry — safe to baseline.
- No blockers.

## Self-Check: PASSED

- File `frontend/src/index.css` exists and contains `--touch-target-min: 44px` (line 102). FOUND.
- File `frontend/index.html` exists and contains `viewport-fit=cover` (line 6). FOUND.
- File `frontend/src/App.css` exists and contains `var(--touch-target-min)` (2 occurrences in ≤768px block). FOUND.
- File `frontend/src/components/Header.css` exists and contains `env(safe-area-inset-` (4 occurrences). FOUND.
- File `frontend/src/components/ChatInterface.css` exists and contains `touch-action: pan-y` + `env(safe-area-inset-` (4 occurrences total). FOUND.
- File `frontend/src/components/Sidebar.css` exists and contains `var(--touch-target-min)` (1 occurrence). FOUND.
- File `frontend/src/components/QualityToggle.css` exists and contains `var(--touch-target-min)` (1 occurrence). FOUND.
- Commit `c0ca438` exists in git log. FOUND.
- Commit `f325b09` exists in git log. FOUND.

---
*Phase: 07-mobile-responsive-visual-regression-tests*
*Completed: 2026-05-11*
