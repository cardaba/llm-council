---
phase: 05
plan: 05
subsystem: frontend-navigation
tags: [frontend, react, css, navigation, scroll-spy, accessibility]
requires:
  - 05-03  # critique entry-point (gives us the message-rendering tree to wrap)
provides:
  - StageNavigationStrip (sticky scroll-spy chip strip, NAV-02)
  - BackToTopButton (floating ↑ after scrollTop > 800, NAV-04)
  - sticky stage section headers (NAV-01)
  - Stage 1 Show-more accordion (NAV-03)
affects:
  - frontend/src/components/ChatInterface.jsx (mounts strip + button + data-stage wrappers)
  - frontend/src/components/Stage1.jsx (Stage1Tab helper + defaultCollapsed prop)
  - frontend/src/components/Stage1.css (sticky title + accordion CSS)
  - frontend/src/components/Stage2.css (sticky title)
  - frontend/src/components/Stage3.css (sticky title + sticky stage3-header wrapper)
  - frontend/src/components/Stage4.css (sticky title)
  - frontend/src/components/Stage4.jsx (data-stage="stage4" on root)
  - frontend/src/components/ChatInterface.css (.chat-interface position: relative + [data-stage] scroll-margin)
tech-stack:
  added: []
  patterns:
    - "IntersectionObserver with root=ref (NOT viewport) for scroll-spy inside a custom scroll container"
    - "grid-template-rows: 0fr → 1fr CSS-only accordion (reused from ReasoningDisclosure)"
    - "Per-click matchMedia('(prefers-reduced-motion: reduce)') re-check (Safari does not auto-honor scrollTo({behavior}))"
    - "Sticky stack: outer strip at top: 0, inner section headers at top: var(--space-7) — both relative to the .messages-container scroll context"
key-files:
  created:
    - frontend/src/components/StageNavigationStrip.jsx
    - frontend/src/components/StageNavigationStrip.css
    - frontend/src/components/BackToTopButton.jsx
    - frontend/src/components/BackToTopButton.css
  modified:
    - frontend/src/components/Stage1.jsx
    - frontend/src/components/Stage1.css
    - frontend/src/components/Stage2.css
    - frontend/src/components/Stage3.css
    - frontend/src/components/Stage4.jsx
    - frontend/src/components/Stage4.css
    - frontend/src/components/ChatInterface.jsx
    - frontend/src/components/ChatInterface.css
decisions:
  - "Sticky headers use top: var(--space-7) (48px = strip height), NOT top: var(--layout-header-h) (52px). The .messages-container already sits below the global Header in the App grid layout — its top: 0 is already 52px below the viewport. Stacking under the strip needs only the strip's own height. (RESEARCH §5.1, plan W-3 fix.)"
  - "IntersectionObserver root is bound to the .messages-container ref, NOT the default viewport. Scroll-spy must observe inside the inner scroll container; using the viewport would never detect intersections since the inner container's scroll position is invisible to the outer document."
  - "Stage 4 data-stage attribute is placed on the Stage4 component's root div (not on a wrapper in ChatInterface) because Stage 4 is rendered INSIDE Stage 3 (D-15 — sub-section of the chairman panel)."
  - "Stage 2 chip is omitted entirely (not greyed out) when msg.stage2 is an empty array (n=1 critique case, D-05 collapse). buildChips guards `Array.isArray(msg.stage2) && msg.stage2.length > 0`."
  - "BackToTop button stays in the DOM at all times; visibility toggles via .is-visible (opacity + pointer-events) so the transition reads as a calm fade — never a pop-in. tabIndex=-1 when hidden so it doesn't trap focus."
metrics:
  duration_min: ~25
  completed: 2026-05-10
---

# Phase 5 Plan 5: In-Conversation Navigation Primitives Summary

Four navigation primitives that turn a 5000-word critique deliberation into a readable scroll: sticky stage section headers, a sticky scroll-spy chip strip at the top of the scroll viewport, an opt-out Show-more accordion for long Stage 1 responses, and a floating back-to-top button after 800px of scroll.

## What Shipped

| # | Requirement | Mechanism | Where |
|---|-------------|-----------|-------|
| NAV-01 | Sticky stage section headers | `position: sticky; top: var(--space-7); z-index: 2` on each `.stage-title` | Stage1.css / Stage2.css / Stage3.css / Stage4.css |
| NAV-02 | Scroll-spy chip strip | `StageNavigationStrip` (sticky `top: 0; z-index: 3`) + `IntersectionObserver(root=.messages-container, rootMargin='-48px 0px -50% 0px')` | StageNavigationStrip.jsx / .css |
| NAV-03 | Stage 1 Show-more | `Stage1Tab` helper measures `contentRef.scrollHeight > 600`; CSS `grid-template-rows: 0fr → 1fr` accordion | Stage1.jsx / Stage1.css |
| NAV-04 | Back-to-top button | `BackToTopButton` listens to `.messages-container.scrollTop > 800`; `scrollTo({behavior})` with per-click `matchMedia` reduced-motion check | BackToTopButton.jsx / .css |

## Chip Label Contract (verbatim from `buildChips`)

The exact chip text emitted by `StageNavigationStrip.buildChips(msg)`:

| Phase | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|-------|---------|---------|---------|---------|
| Streaming | `Stage 1 · streaming…` | `Stage 2 · evaluating…` | `Stage 3 · synthesising…` | _(no streaming label — fires post-complete only)_ |
| Complete (n responses) | `Stage 1 · N response` / `Stage 1 · N responses` | `Stage 2 · peer review` | `Stage 3 · synthesis` | `Stage 4 · refinement` |
| Absent | _(omitted from chips array)_ | _(omitted — n=1 case, `msg.stage2 = []`)_ | _(omitted)_ | _(omitted — only when refinement fired)_ |

Pluralization on Stage 1 uses `n === 1 ? '' : 's'`.

## Universality (Critique + Fresh-prompt)

The four primitives are **agnostic to conversation mode**. Both critique conversations (3-stage with anonymised peer review of user-supplied responses) and fresh-prompt conversations (3-stage council deliberation of a user question) render through the same `ChatInterface.jsx` message tree. The chip strip, sticky headers, Show-more, and back-to-top all activate for any message that has at least one populated `stage1/stage2/stage3/stage4` field. This was a bonus — Plan 05-05 set out to fix critique readability and ended up fixing the fresh-prompt path too.

## Critical CSS Confirmation

Per RESEARCH §5.1 and the plan W-3 fix block in the prompt:

```
strip:           top: 0;               z-index: 3   (inside .messages-container)
stage-title:     top: var(--space-7);  z-index: 2   (48px, stacks below strip)
[data-stage]:    scroll-margin-top: var(--space-7);
```

**NOT `top: var(--layout-header-h)`** — the global Header (52px) is outside the `.messages-container` scroll context in the App grid (`grid-template-rows: var(--layout-header-h) 1fr`). The strip's `top: 0` is already below the Header from the viewport perspective; the section header offset only needs the strip's own height.

## Edge Cases Observed

- **Short Stage 1 response (<600px)** — `Stage1Tab` short-circuits before any wrapper renders. No `Show more` button, no fade-out gradient. Direction A: never show controls that aren't useful.
- **Tab switch with key=`{activeTab}`** — `Stage1Tab` is keyed on `activeTab`, so switching tabs remounts the component and re-measures `scrollHeight` for the new response. Without the key, React would reuse the old `needsToggle`/`open` state on the new content.
- **Stage 4 sub-section** — Stage 4 lives inside Stage 3's DOM tree (D-15 sub-section), so its `data-stage="stage4"` attribute is placed directly on the Stage4 root `<div>` rather than via a wrapper `<section>` in ChatInterface.
- **First-render scroll position** — `BackToTopButton`'s effect calls `onScroll()` once on mount in case the container is already scrolled past 800px (e.g., after re-renders that preserve scroll position).
- **n=1 critique collapse** — `Array.isArray(msg.stage2) && msg.stage2.length > 0` guards both the chip and the `<Stage2>` mount. Otherwise we'd render a phantom Stage 2 section with no chip pointing to it.
- **`prefers-reduced-motion` per-call** — Both `StageNavigationStrip` chip click and `BackToTopButton` click read `matchMedia('(prefers-reduced-motion: reduce)').matches` at click time, not at component mount. Required because Safari does not auto-honor the `behavior` option in `scrollTo`/`scrollIntoView` (RESEARCH §5.5).

## Deviations from Plan

None. Plan executed exactly as written. Two minor judgment calls:

1. **Stage 3 sticky scope.** The plan said "apply sticky to whatever class is the H2/H3 for that stage." Stage 3's `.stage-title` lives inside the flex row `.stage3-header` (alongside the Download button). I applied `position: sticky` to BOTH the `.stage3-header` wrapper (so title + download pin together as a unit) AND on `.stage-title` itself (to satisfy the grep acceptance criterion `position: sticky` + `top: var(--space-7)` per file). Documented inline in Stage3.css.
2. **`Stage1Tab` key.** I added `key={activeTab}` on `<Stage1Tab>` so switching tabs forces remount and re-measurement. Without it, the `useEffect([resp.response])` would still fire (because `resp.response` changes), but stale `open`/`needsToggle` state from the previous tab would briefly bleed through. This is a Rule 1 correctness fix.

## Stub Tracking

None. All four primitives wire to real data sources:

- StageNavigationStrip reads `msg.stage1/stage2/stage3/stage4` + `msg.loading` directly.
- Stage1Tab measures actual rendered DOM height via `contentRef.scrollHeight`.
- BackToTopButton observes actual `.messages-container.scrollTop`.
- Sticky headers use real CSS positioning against the real scroll container.

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | exits 0 |
| `Stage1.css` contains `position: sticky` + `top: var(--space-7)` | ✓ |
| `Stage2.css` contains `position: sticky` + `top: var(--space-7)` | ✓ |
| `Stage3.css` contains `position: sticky` + `top: var(--space-7)` | ✓ |
| `Stage4.css` contains `position: sticky` + `top: var(--space-7)` | ✓ |
| `StageNavigationStrip.jsx` uses `new IntersectionObserver(...)` with root bound to ref | ✓ |
| `rootMargin: '-48px 0px -50% 0px'` literal | ✓ |
| `StageNavigationStrip.jsx` re-checks `prefers-reduced-motion` per-click | ✓ |
| `BackToTopButton.jsx` listens for `scrollTop > 800` | ✓ |
| `BackToTopButton.jsx` aria-label "Back to top" | ✓ |
| `BackToTopButton.css` `position: absolute` + `width: 48px` + `border-radius: 50%` | ✓ |
| `Stage1.jsx` contains `scrollHeight > 600`, `Show more ⌄`, `Show less ⌃`, `stage1-collapsible`, `defaultCollapsed` | ✓ |
| `Stage1.css` contains `grid-template-rows: 0fr` + `[data-open="true"]` + `grid-template-rows: 1fr` | ✓ |
| `ChatInterface.jsx` mounts `<StageNavigationStrip>` + `<BackToTopButton>` + `data-stage="stage1"`/`stage3` + `defaultCollapsed={Boolean(msg.stage3)}` | ✓ |
| `ChatInterface.css` `.chat-interface { position: relative }` | ✓ |

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `3a39784` | feat(05-05): sticky stage headers + StageNavigationStrip (NAV-01, NAV-02) |
| 2 | `74df5bf` | feat(05-05): Stage 1 Show-more accordion + BackToTopButton (NAV-03, NAV-04) |

## Phase 5 Closeout

This is the final plan of Phase 5. With 05-05 landed, all 13 phase requirements are satisfied:

- CRIT-01..08 (critique mode + schema migration) — earlier waves
- PERS-03 (per-model persistence) — earlier waves
- NAV-01..04 (in-conversation navigation) — this plan

## Self-Check: PASSED

- [x] `frontend/src/components/StageNavigationStrip.jsx` exists
- [x] `frontend/src/components/StageNavigationStrip.css` exists
- [x] `frontend/src/components/BackToTopButton.jsx` exists
- [x] `frontend/src/components/BackToTopButton.css` exists
- [x] Commit `3a39784` exists
- [x] Commit `74df5bf` exists
- [x] `npm run build` exits 0
