---
phase: 08-sticky-ia-polish-bundle
plan: 01
subsystem: frontend/sticky-nav
tags: [ui, a11y, sticky-bar, breadcrumb, ia]
status: implementation-complete-pending-smoke
dependency-graph:
  requires: [260511-l5w (NAV-V2.1-01 partial fix, preserved as floor)]
  provides:
    - "Two-line sticky stage-nav-strip (breadcrumb + chips)"
    - "Stable chip ids `stage-nav-chip-stage{1..4}` for aria-labelledby"
    - "Conversation title plumbed App → ChatInterface → StageNavigationStrip"
  affects:
    - "VRT baselines (16 v2.0 × 4 viewports — owned by Phase 10 regen)"
tech-stack:
  added: []
  patterns:
    - "Single sticky element, column flex with two children (breadcrumb + chips row)"
    - "aria-labelledby on stage sections pointing at chip ids (replaces sr-only headings)"
key-files:
  created: []
  modified:
    - frontend/src/components/StageNavigationStrip.jsx
    - frontend/src/components/StageNavigationStrip.css
    - frontend/src/components/ChatInterface.jsx
    - frontend/src/components/Stage1.jsx
    - frontend/src/components/Stage2.jsx
    - frontend/src/components/Stage3.jsx
    - frontend/src/components/Stage4.jsx
decisions:
  - "Honored D-02: single sticky element, two-line layout (column flex on `.stage-nav-strip`, inner `.stage-nav-strip__chips` row)"
  - "Honored D-03: `conversation?.title || 'New Conversation'` fallback (matches Sidebar.jsx:115)"
  - "Honored D-08: 260511-l5w box-shadow + `.is-active` accent border-bottom both preserved unchanged"
  - "Honored D-09: chip strip becomes the canonical accessible-name source via aria-labelledby; no sr-only headings introduced"
  - "Left orphaned `.stage-title` CSS rule untouched (out of scope; Phase 10 VRT regen will surface cosmetic effect if any)"
metrics:
  duration_minutes: ~12
  completed: 2026-05-12
  tasks_completed: 3
  tasks_pending_checkpoint: 1
  files_modified: 7
  commits: 3
---

# Phase 8 Plan 01: Sticky stage-nav-strip breadcrumb + H3 drop Summary

Extended the existing `.stage-nav-strip` into a two-line sticky container (breadcrumb + chip row), wired `conversation.title` through ChatInterface, and removed the four redundant `<h3 className="stage-title">` headings from Stage1/2/3/4 — preserving accessible naming via `aria-labelledby` pointing at stable chip ids. The 260511-l5w drop-shadow and the active-chip 2px accent bottom border coexist unchanged (D-08 "tab connected to panel" pattern).

## Files Touched

| File | Change | Rationale |
|------|--------|-----------|
| `frontend/src/components/StageNavigationStrip.jsx` | +`conversationTitle` prop; breadcrumb `<div>` rendered when truthy; chips wrapped in `.stage-nav-strip__chips`; each chip gets `id="stage-nav-chip-stage{N}"` | D-02 two-line layout; D-09 stable id targets for aria-labelledby |
| `frontend/src/components/StageNavigationStrip.css` | `.stage-nav-strip` → `flex-direction: column`; moved `overflow-x: auto` to new `.stage-nav-strip__chips`; added `.stage-nav-strip__breadcrumb` (microcopy + truncation); box-shadow + chip accent border-bottom preserved | D-02 host; D-08 coexistence |
| `frontend/src/components/ChatInterface.jsx` | `conversationTitle={conversation?.title \|\| 'New Conversation'}` on `<StageNavigationStrip>`; `aria-labelledby="stage-nav-chip-stage{1,2,3}"` on the three `<section data-stage="...">` wrappers | D-03 title source + EN fallback; D-09 a11y plumbing |
| `frontend/src/components/Stage1.jsx` | Removed `<h3 className="stage-title">Stage 1: Individual Responses</h3>` | NAV-V2.1-03 |
| `frontend/src/components/Stage2.jsx` | Removed `<h3 className="stage-title">Stage 2: Peer Rankings</h3>` | NAV-V2.1-03 |
| `frontend/src/components/Stage3.jsx` | Removed `<h3 className="stage-title">Stage 3: Final Council Answer</h3>` from inside `.stage3-header` flex container; download button preserved | NAV-V2.1-03 (header div + download-btn intentionally preserved) |
| `frontend/src/components/Stage4.jsx` | Removed `<h3 className="stage-title">Stage 4: Refinement</h3>`; added `aria-labelledby="stage-nav-chip-stage4"` on the outer `.stage stage4` wrapper (Stage 4 lives inside Stage 3's DOM subtree and is not wrapped by a `<section>` in ChatInterface) | NAV-V2.1-03 + D-09 |

`App.jsx` was NOT modified: `<ChatInterface conversation={currentConversation} />` already flows `.title` downstream (App.jsx:568-574).

## Commits

| Task | SHA | Subject |
|------|-----|---------|
| T1 | `005394c` | `feat(08-01/T1): add breadcrumb line + chip ids to StageNavigationStrip` |
| T2 | `bef774d` | `feat(08-01/T2): wire conversationTitle prop and add aria-labelledby on stage sections` |
| T3 | `9471a16` | `feat(08-01/T3): drop redundant h3.stage-title and label Stage4 via chip id` |

## Requirement Status

| Req | Status | Notes |
|-----|--------|-------|
| **NAV-V2.1-01** | implementation preserved — *pending human smoke* | 260511-l5w fix preserved verbatim (`box-shadow: 0 4px 8px -4px rgba(0,0,0,0.08)` on `.stage-nav-strip`; `.messages-container` `padding-top` NOT re-added). Task 4 manual smoke (3 stages × 2 themes × ≥2 viewports) closes this requirement formally. |
| **NAV-V2.1-02** | implementation preserved — *pending human smoke* | `.stage-nav-strip__chip { border-bottom: 2px solid transparent }` + `.is-active { border-bottom-color: var(--color-accent) }` untouched. Coexists with the strip box-shadow per D-08. Task 4 visual check confirms. |
| **NAV-V2.1-03** | code-complete — *pending human smoke* | All four `<h3 className="stage-title">` instances removed. Accessible naming preserved via aria-labelledby pointing at chip ids. |
| **IA-V2.1-01** | code-complete — *pending human smoke* | Breadcrumb line renders `conversation.title` (or `'New Conversation'` fallback) above the chip row inside the same sticky container. Single sticky element, no height jump on stick/unstick. `title=` attribute on the breadcrumb for hover-reveal of truncated titles. |

All 4 requirements transition from "open" to "closed" once Task 4's human smoke approves the visual + a11y behaviour.

## Automated Verification

| Check | Command | Result |
|-------|---------|--------|
| Breadcrumb className present (JSX) | `grep -c "stage-nav-strip__breadcrumb" src/components/StageNavigationStrip.jsx` | 1 ✔ |
| Breadcrumb rule present (CSS) | `grep -c "stage-nav-strip__breadcrumb" src/components/StageNavigationStrip.css` | 1 ✔ |
| Chip id template present | `grep -c "stage-nav-chip-" src/components/StageNavigationStrip.jsx` | 1 ✔ |
| 260511-l5w shadow preserved | `grep -c "box-shadow: 0 4px 8px -4px" src/components/StageNavigationStrip.css` | 1 ✔ |
| Active chip accent border preserved | `grep -c "border-bottom-color: var(--color-accent)" src/components/StageNavigationStrip.css` | 1 ✔ |
| `conversationTitle=` wired in ChatInterface | `grep -c "conversationTitle=" src/components/ChatInterface.jsx` | 1 ✔ |
| 3× `aria-labelledby` in ChatInterface (sections 1-3) | `grep -c "aria-labelledby=\"stage-nav-chip-" src/components/ChatInterface.jsx` | 3 ✔ |
| `'New Conversation'` fallback present | `grep -c "conversationTitle.*New Conversation" src/components/ChatInterface.jsx` | 1 ✔ |
| Zero remaining `stage-title` in Stage 1-4 | `grep -c "stage-title" src/components/Stage{1,2,3,4}.jsx` | 0, 0, 0, 0 ✔ |
| Stage 4 aria-labelledby present | `grep -c 'aria-labelledby="stage-nav-chip-stage4"' src/components/Stage4.jsx` | 1 ✔ |
| Stage 3 download button preserved | `grep -c "download-btn" src/components/Stage3.jsx` | 1 ✔ |
| Stage 3 header wrapper preserved | `grep -c "stage3-header" src/components/Stage3.jsx` | 1 ✔ |
| No new design tokens in CSS | `grep -E "^\s*--(color\|space\|font)-" src/components/StageNavigationStrip.css` | no matches ✔ |
| No re-addition of `.messages-container { padding-top }` | `grep -c "padding-top" src/components/ChatInterface.css` | 1 (pre-existing on `.input-form` only — not on `.messages-container`) ✔ |
| Build | `npm run build` | exit 0 ✔ |
| Lint (touched files) | `npx eslint <task files>` | 0 errors on Plan 08-01 changes; pre-existing Stage1.jsx:33 `react-hooks/set-state-in-effect` carry-over is NOT a regression ✔ |

## Deviations from Plan

**None.** The plan executed exactly as written, including the explicit pick of layout option (a) for D-02 (inner `.stage-nav-strip__chips` wrapper) and the EN fallback `'New Conversation'` for D-03.

Notes on the plan's `<verify>` block that are not deviations, just clarifications:

- The plan's first verify on Task 1 says *"at least 3 matches"* for `stage-nav-strip__breadcrumb` across the JSX + CSS pair. Actual count: 2 (1 className usage in JSX + 1 CSS rule). The plan's expected count appears to anticipate a JSX comment or import-side string that the implementation did not need to add; the acceptance criteria items (className present, CSS rule present, ellipsis truncation) all pass. No deviation in functional outcome.

## Pre-existing Issues NOT Addressed (Scope Boundary)

- `Stage1.jsx:33` `react-hooks/set-state-in-effect` lint error — pre-existing tech debt, explicitly out of scope per the orchestrator prompt. Not modified.
- The `.stage-title` CSS rule (defined in shared CSS) becomes orphaned after Task 3. The plan explicitly allows this and defers any cosmetic fallout to Phase 10 VRT regen. Not removed.

## Pending Work

- **Task 4 (`checkpoint:human-verify`)** — manual smoke covering 8 verification steps across light + dark themes, desktop + mobile-portrait viewports, and devtools a11y inspector. Orchestrator coordinates the user smoke; this executor PAUSES here and does NOT prompt the user directly. After "approved" lands, the four requirements above flip to closed in REQUIREMENTS.md.

## Self-Check: PASSED

- All 7 modified files verified present on disk in the worktree.
- All 3 commits verified in `git log --oneline -5` (`005394c`, `bef774d`, `9471a16`).
- `npm run build` exit code 0 confirmed against the post-Task-3 tree.
- Acceptance grep counts match the table above.
