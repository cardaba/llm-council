---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 06
subsystem: frontend-settings-ui
tags: [settings, ui, dialog, useSettings, persistence, react]
requires:
  - useTheme hook (frontend/src/hooks/useTheme.js)
  - Plan 05 FOUC blocker + density/font-size CSS overrides (data-fontsize + data-density attributes on <html>)
  - Design tokens in frontend/src/index.css: --layout-header-h, --shadow-md, --color-bg-elevated, --color-border-subtle, --color-focus-ring, --color-accent, --font-size-h2, --font-size-label, --font-size-microcopy, --motion-duration-base, --motion-easing-out
provides:
  - useSettings() hook — { fontSize, density, stage4Threshold, setFontSize, setDensity, setStage4Threshold }
  - <SettingsPanel open onClose /> — native <dialog> slide-out drawer with 4 controls
  - Gear-icon entry point in Header that opens the panel via onSettingsOpen callback prop
affects:
  - frontend/src/App.jsx (settingsOpen lifted state + SettingsPanel mount + Header callback)
  - frontend/src/components/Header.jsx + .css (new actions wrapper + gear button)
tech-stack:
  added: []
  patterns:
    - "Native <dialog> + showModal() + 'cancel' event for ESC (no hand-rolled focus trap)"
    - "Click-outside dismiss via target === currentTarget (copied from Modal.jsx idiom)"
    - "Hook mirror — useSettings replicates useTheme's localStorage + readInitial + try/catch private-browsing pattern verbatim, with three state slots instead of one"
    - "Slide-out drawer via CSS transform translate3d + transition (no animation library)"
    - "Token-only CSS (zero hex literals)"
key-files:
  created:
    - frontend/src/hooks/useSettings.js
    - frontend/src/components/SettingsPanel.jsx
    - frontend/src/components/SettingsPanel.css
  modified:
    - frontend/src/App.jsx
    - frontend/src/components/Header.jsx
    - frontend/src/components/Header.css
decisions:
  - "useSettings does NOT import useTheme (Pitfall 4 — circular-dep risk). SettingsPanel.jsx composes both hooks at the component level."
  - "DEFAULT_STAGE4 = 8 mirrors backend/config.py PROFILES['quality_research']['stage4_threshold']; the only WHY-non-obvious comment in this plan (per CLAUDE.md comment discipline)."
  - "Individual localStorage keys (fontSize, density, stage4Threshold) instead of a namespaced JSON object — 1:1 mirror of useTheme per CONTEXT.md locked deferred-rejection."
  - "Slider microcopy verbatim per D-05: 'Higher = stricter; only refine when answer scores ≥{value}/10' — no dynamic per-value copy, no tick marks, no +/− buttons."
  - "Transparent ::backdrop per D-04 — no scrim darkens the area outside the 380px panel; reading the deliberation behind stays uninterrupted."
  - "Header layout wrapped in .app-header__actions flex group (Rule 3 deviation) because .app-header uses justify-content: space-between and three direct children would distribute awkwardly."
metrics:
  duration: ~25min
  completed: 2026-05-11
---

# Phase 06 Plan 06: Settings Panel UI Surface + useSettings Hook Summary

One-liner: Native `<dialog>` slide-out Settings drawer with theme/font-size/density/stage4-threshold controls, all immediate-apply and localStorage-persistent via a 30 LOC `useSettings` hook that mirrors `useTheme` 1:1.

## Scope Delivered

SET-01 (Settings UI surface) and SET-02 (useSettings hook) are implemented end-to-end:

- Gear icon in Header opens a 380px right-aligned slide-out panel.
- 4 controls in locked order: Theme · Font size (S/M/L radio) · Density (compact/comfortable radio) · Stage 4 threshold (range 1-10).
- Every onChange writes through to localStorage AND mutates state on the same tick (D-03 immediate-apply, no Save/Cancel).
- `<html data-fontsize>` and `<html data-density>` attributes mutate on every state change, which Plan 05's CSS overrides will read once that wave merges.
- Dismiss: ESC (native `cancel` event), backdrop click (`target === currentTarget`), explicit X button — three independent paths all wired.
- No scrim/overlay darkens the rest of the screen (D-04 lock — `::backdrop { background: transparent }`).
- Slider microcopy locked verbatim: `Higher = stricter; only refine when answer scores ≥{value}/10`.

SET-03 (Pydantic field + research_strategy threshold_override + request body wiring) is owned by Plan 07 and intentionally out of scope here.

## Implementation Notes

### useSettings.js (30 LOC, named export only)

Imports `{ useState, useEffect, useCallback }` from `react` — identical to useTheme. Three module-level keys, three defaults, one shared `readInitial(key, fallback, validate)` helper. Each setter is a `useCallback` that calls `setState` and wraps `localStorage.setItem` in `try { } catch { }` (private-browsing tolerance, exact mirror of useTheme.js:82-86).

Critically: **does NOT import useTheme** (Pitfall 4 dodge). The hook is concerned only with fontSize / density / stage4Threshold. Theme stays in its own hook; SettingsPanel composes both at the component level via two adjacent `const { ... } = useXxx()` calls at the top of its function body.

`DEFAULT_STAGE4 = 8` carries the only allowed comment in the plan:
```
// MIRROR: backend/config.py PROFILES["quality_research"]["stage4_threshold"]
```
This is the WHY-non-obvious case where the value is duplicated across two source-of-truth boundaries; without the comment, a future maintainer mutating one side would silently drift from the other.

Verified: `backend/config.py` line 93 declares `"stage4_threshold": 8`. The mirror holds.

### SettingsPanel.jsx (native `<dialog>`, no third-party libs)

Uses `dialog.showModal()` / `dialog.close()` via a `useRef` + two `useEffect` blocks (one keyed on `open` for show/close imperative API, one keyed on `onClose` for the `cancel`-event ESC handler). Click-outside dismiss copies the `target === e.currentTarget` idiom from Modal.jsx:84-89 (no inheritance of Modal.jsx's hand-rolled focus trap — native `<dialog>` provides focus management).

Three inline-SVG icon components are co-located in the same file: `CloseIcon` (X path), `SunIcon`, `MoonIcon` (the latter two duplicated from Header.jsx because Header doesn't export them — could be DRY'd later if Header exports them, but not in scope here).

Control layout uses semantic HTML throughout: `<fieldset>` + `<legend>` for both radio groups (Font size, Density), `<label htmlFor>` for the slider, `aria-live="polite"` on the slider value, `aria-label` on all icon-only buttons.

### SettingsPanel.css (token-only)

Verified zero hex color literals (Pattern E lock) — every color and space is a `var(--token)` reference. Slide-out animation is a `transform: translate3d(100%, 0, 0)` → `translate3d(0, 0, 0)` swap on the `[open]` attribute, with `transition: transform var(--motion-duration-base) var(--motion-easing-out)`. `::backdrop` is transparent per D-04 (no scrim).

### Header.jsx + Header.css (deviation)

The plan said the gear button should be a "sibling to the existing theme toggle" with the existing class providing geometry. In practice, `.app-header` is `display: flex; justify-content: space-between`, which means adding a third direct child (`<div brand>`, `<button theme>`, `<button gear>`) would push the theme toggle into the middle and orphan the gear at the right edge.

**Deviation applied (Rule 3 — blocking layout):** wrapped both buttons in a new `<div className="app-header__actions">` flex group. Added a one-line `.app-header__actions { display: inline-flex; gap: var(--space-1); }` rule. Folded the existing `.app-header__theme-toggle` selectors into shared `.app-header__theme-toggle, .app-header__settings-toggle` rules so both buttons inherit the same 32×32 geometry, hover, and focus-ring. No visual change to the existing theme toggle.

## Acceptance Smoke (manual — observable behavior)

The DevTools end-to-end smoke described in the plan's acceptance criteria depends on Plan 05's FOUC blocker + density/font-size CSS overrides landing first. With this plan's diff applied in isolation:

- ✅ `useSettings()` returns `{ fontSize: 'm', density: 'comfortable', stage4Threshold: 8, ... }` with no prior localStorage.
- ✅ Setting `localStorage.setItem('fontSize', 'l')` + reload → `useSettings()` returns `fontSize: 'l'` AND `<html data-fontsize="l">` is set by useSettings' `useEffect`.
- ✅ Clicking gear opens the panel (slides in from right); ESC, backdrop click, X all dismiss.
- ✅ Toggling each control writes to localStorage on the same tick and mutates `data-fontsize` / `data-density` on `<html>`.
- ⏳ The CSS overrides that translate `data-fontsize="l"` into visible font-scale changes are owned by Plan 05 in this wave. Once 05 merges to master, the full visual round-trip will be observable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Wrapped Header buttons in a flex group**

- **Found during:** Task 3
- **Issue:** `.app-header` uses `justify-content: space-between`. Adding a second top-level button child would distribute three children awkwardly (brand on the left, theme toggle in the middle, gear on the right with no gap).
- **Fix:** Wrapped both buttons in a new `<div className="app-header__actions">` flex container with `gap: var(--space-1)`. Folded the existing `.app-header__theme-toggle` styling rule into a shared selector with the new `.app-header__settings-toggle` so both share the same 32×32 geometry / hover / focus-ring tokens.
- **Files modified:** `frontend/src/components/Header.jsx`, `frontend/src/components/Header.css`
- **Commit:** `f55e7f5`

### Auth Gates

None.

## Deferred Issues

None.

## Self-Check: PASSED

Files created (verified exist):
- ✅ `frontend/src/hooks/useSettings.js`
- ✅ `frontend/src/components/SettingsPanel.jsx`
- ✅ `frontend/src/components/SettingsPanel.css`

Files modified (verified diff):
- ✅ `frontend/src/App.jsx` — `settingsOpen` useState, `onSettingsOpen` prop passed to `<Header>`, `<SettingsPanel>` mounted as sibling
- ✅ `frontend/src/components/Header.jsx` — `onSettingsOpen` prop, `GearIcon`, `app-header__actions` wrapper, settings-toggle button
- ✅ `frontend/src/components/Header.css` — `app-header__actions` rule + shared toggle styling

Automated verifies from the plan:
- ✅ `useSettings` exports `useSettings` as a named export and does NOT import `useTheme`.
- ✅ MIRROR comment naming `backend/config.py PROFILES["quality_research"]["stage4_threshold"]` is present in `useSettings.js`.
- ✅ `App.jsx` declares `settingsOpen` and references `SettingsPanel`.
- ✅ `SettingsPanel.jsx` contains `export default function SettingsPanel`, `showModal`, and the literal microcopy `Higher = stricter`.
- ✅ `SettingsPanel.css` contains `settings-panel__inner`, `::backdrop`, and `transparent` — and grep for hex literals returns no matches.
- ✅ `Header.jsx` contains `GearIcon`, `onSettingsOpen`, `app-header__settings-toggle`, and `aria-label="Open settings"`.

Commits (verified via `git log --oneline 5b2dce0..HEAD`):
- ✅ `4e38a3f` — feat(06-06): add useSettings hook + App.jsx settingsOpen state lift
- ✅ `da96937` — feat(06-06): build SettingsPanel native <dialog> slide-out drawer
- ✅ `f55e7f5` — feat(06-06): add gear icon in Header to open SettingsPanel (SET-01)
