---
quick_id: 260511-l5w
slug: arreglar-el-bug-sticky-nav-01
status: complete
completed_at: 2026-05-11
commit: ba2c7d3
files_changed: 2
---

# Quick Task 260511-l5w — Sticky NAV-01 ghost-strip fix

**Description:** Fix the sticky stage-header positioning bug uncovered during v2.0 milestone-close manual smoke. Content above the sticky bar scrolled into view ("ghost strip") because `.messages-container` had a `padding: var(--space-5)` shorthand that applied 20px on the top side INSIDE the scroll container, above the sticky's `top: 0`.

## Diff

| File | Change |
|------|--------|
| `frontend/src/components/ChatInterface.css:19-31` | `.messages-container` — `padding: var(--space-5)` shorthand replaced with `padding-inline: var(--space-5); padding-bottom: var(--space-5);` (top side dropped). 4-line WHY comment added explaining the NAV-01 fix. `touch-action: pan-y` (Phase 7 MOBL-04) preserved. |
| `frontend/src/components/StageNavigationStrip.css:23-24` | `.stage-nav-strip` — added `box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.08);` for perceptible layering. Single-line comment. Static shadow per Direction A "calmo" precedent (matches v1.0/v2.0 `ReasoningDisclosure` CSS-only pattern). |

Net: +8 lines, −1 line, zero JSX, zero JS, zero new dependencies.

## Why

User's manual smoke during v2.0 milestone close (2026-05-11) found that scrolling within a conversation showed lines of code (`println!("Start CPU {}", id);`, `import asyncio`) peeking ABOVE the sticky stage-header chip strip. Diagnosis (user-supplied, code-confirmed by planner): the sticky container and the scroll container did not share the same top edge. The 20px top-padding inside `.messages-container` was the "ghost strip" — content scrolled through that strip while the sticky pinned at `top: 0`.

Fix shape: remove the top side of the padding so the scroll container's top edge coincides with the sticky's `top: 0`. The shorthand → longhand split also makes future audits trivial (`grep '^\s*padding:' ChatInterface.css` returns nothing on this rule).

Box-shadow added so the layering is unambiguous even without scroll-progressive feedback. Static shadow matches Direction A "calmo" — IntersectionObserver-driven "shadow only when stuck" upgrade deferred to v2.1+.

## Verification (all PASS)

- `grep 'padding-inline: var\(--space-5\)' frontend/src/components/ChatInterface.css` → match on line 26.
- `grep 'padding-bottom: var\(--space-5\)' frontend/src/components/ChatInterface.css` → match on line 27.
- `grep '^\s*padding: var\(--space-5\)' frontend/src/components/ChatInterface.css` → only line 174 (`.input-form`, unrelated); no shorthand on `.messages-container`.
- `grep 'box-shadow' frontend/src/components/StageNavigationStrip.css` → match on line 24 (new); line 53 unchanged (focus-ring).
- `cd frontend && npx vite build` → exit 0 (541 modules, dist/index-*.css 57.09 kB).
- Stage1/2/3/4.css `top: var(--space-7)` offsets unchanged (inner stickies were never the bug).
- `touch-action: pan-y` on `.messages-container` preserved (Phase 7 MOBL-04 not regressed).

ESLint baseline preserved — pre-existing `react-hooks/set-state-in-effect` on `Stage1.jsx:33` (from 05-05 NAV-03 accordion height probe) untouched, no new warnings introduced.

## Manual smoke — pending user

The fix is visual; only a real browser can confirm.

1. `bash start.sh` → http://localhost:5173
2. Open / create a conversation; send a Fast-profile prompt that produces multiple stages. Wait for Stage 1 to populate.
3. Scroll the central panel up and down.
4. Expected: sticky chip strip pins flush against the panel top edge; NO line of text/code visible above it; soft shadow perceptible below the strip when content has scrolled past.
5. Resize to ≤768px (or DevTools mobile emulation): sticky still flush; global app-header unaffected; safe-area-inset on composer preserved.
6. Toggle dark theme: sticky still legible; shadow still subtle, not loud.

If any check fails, most likely cause: an unexpected `padding-top` on an inner wrapper (`.message-group`, `.assistant-message`) reintroducing the gap. Inspect via DevTools "Computed" on the topmost element inside `.messages-container` at scroll-top=0.

## Deferred to v2.1+

Tracked in `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md`:

1. **Playwright VRT baseline regeneration** — the 16 baselines from Phase 7 (07-03) WILL diff-fail against this fix (they captured the bug). Regenerate via `npx playwright test --update-snapshots` as part of v2.1 phase 1.
2. **"Shadow only when stuck" IntersectionObserver upgrade** — current static shadow is adequate per Direction A "calmo". Upgrade is enhancement, not bug.
3. **Tab + H2 redundancy collapse** (P1) — JSX + a11y change, separate task.
4. **Sticky breadcrumb with conversation title / active model** (P1) — JSX change, separate task.

## Classification

This is a v2.0 NAV-01 regression closure executed as a quick task post-milestone-close. NAV-01 letter was satisfied in Phase 5 (`position: sticky` applied); spirit was violated by the padding-top trap. Phase 5 success criteria remain 5/5 — this is a UAT-class finding the v2.0 milestone audit would have flagged had it been run before close.
