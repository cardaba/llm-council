---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 05
subsystem: frontend-substrate
tags: [fouc, css-tokens, density, font-size, settings, ssr-substrate]
dependency_graph:
  requires: []
  provides:
    - "FOUC-sync attribute substrate (`<html data-density>`, `<html data-fontsize>`) ready for Plan 06 `useSettings` setters."
    - "CSS variable overrides on `--space-2` / `--space-3` keyed by `[data-density=\"compact\"]`."
    - "Root font-size anchors at 15/17/19px keyed by `[data-fontsize=\"s|m|l\"]` so `rem`-based type tokens cascade."
  affects:
    - "frontend/index.html FOUC IIFE — now writes three attributes (theme + density + fontsize) before first paint."
    - "frontend/src/index.css — extended with density override block + font-size root-anchor blocks."
tech_stack:
  added: []
  patterns:
    - "Sync attribute write inside the existing try/catch IIFE — single failure mode covers all three attributes (Pitfall 5 — error-tolerant)."
    - "CSS variable override via attribute selector (data-density=compact) instead of duplicating component rules."
    - "Root font-size anchor + `rem`-based token cascade (no per-component overrides)."
key_files:
  created: []
  modified:
    - "frontend/index.html — extended FOUC IIFE try block with density + fontsize sync; catch block sets all three fallback defaults."
    - "frontend/src/index.css — appended `[data-density=\"compact\"]` block (overrides `--space-2`, `--space-3`) and three `[data-fontsize=\"...\"]` blocks (15/17/19px) after the existing `[data-theme=\"dark\"]` block."
decisions:
  - "Catch block sets all three attributes (theme/density/fontsize) to documented defaults — per task action + Pitfall 5; goes beyond the patterns example which only sets data-theme in catch."
  - "Density compact retunes `--space-2` (8→6px) and `--space-3` (12→10px) only — layout grid (`--space-4..7`) and outer padding tokens intentionally unchanged per UI-SPEC."
  - "Font-size `m` is set explicitly (17px) even though it equals the v1.0 default — gives the FOUC blocker a consistent root anchor regardless of whether `localStorage.getItem('fontSize')` was ever written."
  - "No `transition: font-size ...` — single-render flicker on font-size change is acceptable per CONTEXT.md; animating the root jitters every component simultaneously."
metrics:
  duration: "~5 min"
  completed: "2026-05-11"
  tasks_complete: "2/2"
  files_changed: 2
---

# Phase 06 Plan 05: FOUC Blocker Extension + Density / Font-Size CSS Overrides — Summary

Extended the existing `index.html` FOUC IIFE to write `data-density` and `data-fontsize` to `<html>` before first paint, and appended density + font-size CSS variable overrides to `index.css` — the rendering substrate that Plan 06's `useSettings` hook will write into.

## What landed

### Task 1 — FOUC blocker IIFE extension (`frontend/index.html`)

Inside the existing `try` block (after the theme write), added:

- Density sync: read `localStorage.getItem('density')`, validate against `{'compact','comfortable'}`, default to `'comfortable'`, `setAttribute('data-density', value)`.
- Font-size sync: read `localStorage.getItem('fontSize')`, validate against `{'s','m','l'}`, default to `'m'`, `setAttribute('data-fontsize', value)`.

Inside the existing `catch (e)` block, added fallback writes for `data-density='comfortable'` and `data-fontsize='m'` so a `localStorage` exception (private browsing, sandboxed iframe) leaves the page in a documented known-good state alongside the existing `data-theme='light'` fallback.

The theme block and the `prefers-color-scheme` matchMedia fallback for theme are unchanged. Density and font-size have no system preference — defaults are pure literals.

Commit: `013b92b`.

### Task 2 — CSS variable overrides (`frontend/src/index.css`)

Two new blocks appended after the existing `[data-theme="dark"]` block (lines 128–144), so attribute selectors compose cleanly:

**Block 1 — Density override:**
```css
[data-density="compact"] {
  --space-2: 6px;   /* was 8px */
  --space-3: 10px;  /* was 12px */
}
```
Only `--space-2` and `--space-3` are overridden; layout-grid tokens (`--space-4` through `--space-7`) and `--layout-*` are intentionally untouched so the global grid and outer panel padding stay stable across density modes. This matches the UI-SPEC intent ("retune intra-component spacing only").

**Block 2 — Font-size root anchors:**
```css
[data-fontsize="s"] { font-size: 15px; }
[data-fontsize="m"] { font-size: 17px; }
[data-fontsize="l"] { font-size: 19px; }
```
These set the root (`<html>`) font-size, so every `rem`-based token in the type scale (`--font-size-body` 1.0625rem, `--font-size-body-small` 0.875rem, `--font-size-label` 0.8125rem, `--font-size-microcopy` 0.75rem, plus the heading sizes) cascades automatically. No `transition` per the CONTEXT.md guidance.

Commit: `d78e614`.

## Locked numeric values used

| Token / Selector             | Value (compact / m default) | Source                                                                 |
|------------------------------|-----------------------------|------------------------------------------------------------------------|
| `--space-2` (compact)        | 6px (default 8px)           | 06-UI-SPEC §Spacing Scale — Density variant overrides                  |
| `--space-3` (compact)        | 10px (default 12px)         | 06-UI-SPEC §Spacing Scale — Density variant overrides                  |
| `[data-fontsize="s"]` root   | 15px                        | 06-UI-SPEC §Typography — font-size user override block                 |
| `[data-fontsize="m"]` root   | 17px (matches v1.0 default) | 06-UI-SPEC §Typography — anchor for consistent FOUC default            |
| `[data-fontsize="l"]` root   | 19px                        | 06-UI-SPEC §Typography — font-size user override block                 |

## Verification — DevTools-capture confirmation (developer smoke)

Per plan acceptance criteria the runtime verification is a manual DevTools smoke (no `useSettings` hook lands until Plan 06). The substrate is verified via static checks because all rendering surface is purely declarative:

1. **Static check — attribute presence on first paint**: After this change, `document.documentElement.getAttribute('data-density')` and `getAttribute('data-fontsize')` return non-null values immediately on first paint (the IIFE runs synchronously inside `<head>` before the body parses). With no prior `localStorage`, defaults are `'comfortable'` / `'m'`. Verified by reading the resulting `index.html` — the writes occur in the inline `<script>` at the top of `<head>`, before `<link rel="preload">` and before `<script type="module" src="/src/main.jsx">`.

2. **Static check — spacing token tightening**: `[data-density="compact"]` overrides resolve `--space-2` to `6px` and `--space-3` to `10px` (vs. 8/12 in `:root`). Components that consume `var(--space-2)` / `var(--space-3)` for gap / padding will pick up the new value via standard cascade — no JS plumbing required.

3. **Static check — font-size cascade**: With `[data-fontsize="l"]` setting root to 19px, `--font-size-body` (1.0625rem) becomes ~20.19px (vs. ~18.06px at the 17px default), and all other rem-based type tokens scale by the same ratio (1.117×). Tabular-nums alignment is preserved because all numeric figures share the same font and the scaling is uniform.

A manual DevTools smoke (per plan §Output) would be:
```js
document.documentElement.setAttribute('data-density', 'compact');
// → visible tightening in any component using --space-2 / --space-3 gaps
document.documentElement.setAttribute('data-fontsize', 'l');
// → all text scales up uniformly; layout grid + outer padding stable
```
This will be exercised end-to-end when Plan 06 lands `useSettings` and the Settings panel.

## Deviations from Plan

None — both tasks executed exactly as written. The one notable choice (catch block sets all three attributes vs. the patterns example which only sets `data-theme`) was explicitly mandated by the Task 1 action text per Pitfall 5, so it is not a deviation.

## Out-of-scope discoveries

None.

## Stub tracking

No stubs introduced. Density and font-size attributes are now real, observable DOM state — Plan 06 will write to them via `useSettings`; this plan does not introduce any placeholder UI that pretends to set them.

## Self-Check: PASSED

- `frontend/index.html` modified — verified (commit `013b92b`).
- `frontend/src/index.css` modified — verified (commit `d78e614`).
- Both commits present on `worktree-agent-a5e673d67614fe33d`.
- All artifacts named in plan frontmatter exist and contain the mandated patterns (`data-density`, `data-density.*compact`).
