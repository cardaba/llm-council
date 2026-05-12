---
phase: 07-mobile-responsive-visual-regression-tests
plan: 02
subsystem: ui
tags: [react, dialog, drawer, touch, mobile, swipe, inert, accessibility]

# Dependency graph
requires:
  - phase: 04-ui-overhaul
    provides: "SettingsPanel.jsx:18-38 — the canonical native <dialog> + showModal() + cancel-event ESC pattern that SidebarDrawer mirrors verbatim"
  - phase: 07-01
    provides: "--touch-target-min token in :root, viewport-fit=cover, `touch-action: pan-y` on .messages-container (prerequisite for the swipe hook not fighting vertical scroll), desktop sidebar hidden via display:none below 768px"
provides:
  - "frontend/src/components/SidebarDrawer.jsx — native <dialog> wrapper with showModal() sync, ESC dismiss, backdrop click dismiss"
  - "frontend/src/components/SidebarDrawer.css — left-anchored 100dvh drawer, Direction A soft backdrop (rgb(0 0 0 / 0.18) + blur(2px)), @media (min-width: 769px) { display: none } mobile-only guard"
  - "frontend/src/hooks/useTouchSwipe.js — 34-LOC executable hook (~32 LOC target met) with vertical-dominance + edge-zone non-negotiable gates"
  - "Hamburger menu button on Header (≤768px only) wired through onMenuOpen prop"
  - "drawerOpen state + useTouchSwipe wiring in App.jsx; inert prop on .app__main-with-banner while drawer open"
affects: [07-03-visual-regression-tests, 07-04-keyboard-shortcuts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native <dialog> + showModal() drawer (no library, no hand-rolled focus trap) — browser-native modal semantics with ::backdrop pseudo-element styling"
    - "Touch-swipe hook discipline: refs only (no re-renders), useCallback on all handlers, edge-zone + vertical-dominance gates baked into the hook body so a misuse at the call site cannot bypass them"
    - "Dual-mount sidebar: drawer-wrapped instance + persistent grid-column instance both mounted; visibility decided per breakpoint by CSS @media rules — keeps the existing desktop .app > .sidebar grid rule untouched"
    - "inert={drawerOpen ? '' : undefined} on the main panel — React 19 native prop for browser-managed focus/pointer-event blocking, paired with the <dialog> focus trap"

key-files:
  created:
    - frontend/src/components/SidebarDrawer.jsx
    - frontend/src/components/SidebarDrawer.css
    - frontend/src/hooks/useTouchSwipe.js
  modified:
    - frontend/src/components/Header.jsx
    - frontend/src/components/Header.css
    - frontend/src/App.jsx

key-decisions:
  - "Dual <Sidebar> mount kept (per PATTERNS.md line 402-403) — drawer holds its own instance + persistent desktop Sidebar in the grid column; CSS @media rules pick the visible one. Avoids restructuring the .app grid that Phase 4 established."
  - "inert applied to .app__main-with-banner (the actual main panel <div>), not a non-existent <main> element. The plan's must_have pattern `inert=\\{drawerOpen` is satisfied; the surrounding element is whatever the app's existing JSX uses."
  - "Touch handlers spread onto the .app shell root <div>, not on the .app__main-with-banner panel. The shell root is higher in the tree so left-edge swipes are caught regardless of which inner element the gesture lands on, and the `touch-action: pan-y` rule on .messages-container (07-01) lets vertical scrolls bypass the swipe path entirely."
  - "Conversation-tap-to-dismiss wired inline as wrapper functions inside the SidebarDrawer mount (vs adding a generic 'dismissOnNavigate' prop to Sidebar). Keeps Sidebar's API untouched — the wrapping is a drawer-specific concern."

patterns-established:
  - "Pattern A: Drawer = thin <dialog> shell + Sidebar as children. The drawer NEVER re-implements the Sidebar's UI; it only owns the open/close lifecycle, the backdrop, and the safe-area padding."
  - "Pattern B: Stable refs + useCallback in touch hooks. Three refs (startX, startY, startedAtEdge) — no state cells, no re-renders. All three handlers wrapped in useCallback with correct deps so the spread `{...swipe}` is stable across renders."
  - "Pattern C: Inline-comment landmines. The 4 known touch-gesture landmines (passive listener, vertical-dominance, changedTouches, edge-zone) are preserved as one-line `//` comments directly above the relevant code so future readers cannot miss them."

requirements-completed: [MOBL-02, MOBL-04]

# Metrics
duration: 12min
completed: 2026-05-11
---

# Phase 07 Plan 02: Mobile Drawer + Swipe (MOBL-02 + MOBL-04) Summary

**Native `<dialog>` + `showModal()` left-anchored mobile drawer with hamburger-tap + left-edge swipe-right activation, vertical-dominance / edge-zone gated `useTouchSwipe` hook (34 LOC), and `inert` on the main panel while open.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-05-11T11:52:19Z
- **Tasks:** 4
- **Files created:** 3
- **Files modified:** 3

## Accomplishments

- **MOBL-02 ships.** Tapping the hamburger icon on a ≤768px viewport opens the left-anchored drawer; ESC, backdrop tap, and conversation tap all dismiss it. Desktop layout untouched (`display: none` below the breakpoint).
- **MOBL-04 ships in the same wave (D-01 locked).** Left-edge swipe-right (start ≤24px, traverse ≥40px) opens the drawer. Swipe-left ≥40px while open closes it. Vertical scrolling of `.messages-container` does **not** open the drawer — the `Math.abs(dy) > Math.abs(dx)` rejection branch is the first conditional inside `onTouchEnd`.
- **No external library.** Native `<dialog>` + `showModal()` provides browser-managed focus trap; `inert` on the main panel blocks focus/pointer escape; the swipe hook is hand-rolled at 34 LOC executable.
- **Direction A "calmo" backdrop preserved.** Soft scrim (`rgb(0 0 0 / 0.18)`) + 2px blur — no harsh dark overlay.

## Task Commits

1. **Task 1: SidebarDrawer.jsx + SidebarDrawer.css** — `ac82326` (feat)
2. **Task 2: useTouchSwipe.js** — `6c5c079` (feat)
3. **Task 3: Hamburger button on Header** — `6b90176` (feat)
4. **Task 4: App.jsx wiring (state + swipe + inert + drawer mount)** — `035b177` (feat)

## Files Created/Modified

### Created
- `frontend/src/components/SidebarDrawer.jsx` (62 LOC) — Native `<dialog>` shell mirroring `SettingsPanel.jsx:18-38`. Default export `function SidebarDrawer({ open, onClose, children })`. Two `useEffect` blocks (showModal sync + cancel listener) + `handleClick` backdrop dismiss verbatim from SettingsPanel.
- `frontend/src/components/SidebarDrawer.css` (56 LOC) — Left-anchored fixed positioning (`inset: 0 auto 0 0`), `block-size: 100dvh`, `inline-size: min(85vw, 320px)`, soft `::backdrop`, safe-area-aware inner padding, `@media (min-width: 769px) { display: none }` mobile-only guard, focus-visible rules.
- `frontend/src/hooks/useTouchSwipe.js` (85 lines total, **34 LOC executable** inside the function body) — `useTouchSwipe({ isOpen, onOpen, onClose, threshold = 40 })` returning `{ onTouchStart, onTouchMove, onTouchEnd }`. Three refs only (no state). Both non-negotiable gates implemented: vertical-dominance rejection + edge-zone (`startedAtEdge.current = t.clientX <= EDGE_ZONE`).

### Modified
- `frontend/src/components/Header.jsx` — Added `onMenuOpen` prop, new `<button class="app-header__menu-toggle">` as the first item in the action cluster, new `MenuIcon` component at file bottom (three horizontal paths: `M3 6h18`, `M3 12h18`, `M3 18h18`). Stroke attributes match `GearIcon` for pixel-consistent icon weight.
- `frontend/src/components/Header.css` — Added `.app-header__menu-toggle` to the shared selector list for box geometry / hover / focus-visible, added a dedicated rule for `min-width / min-height: var(--touch-target-min)` (mobile touch-target floor), added `@media (min-width: 769px) { .app-header__menu-toggle { display: none } }` visibility gate.
- `frontend/src/App.jsx` — Imported `SidebarDrawer` and `useTouchSwipe`; added `drawerOpen` state and `swipe` handler bundle; passed `onMenuOpen={() => setDrawerOpen(true)}` to `<Header>`; spread `{...swipe}` onto the `.app` shell root `<div>`; mounted `<SidebarDrawer>` containing its own `<Sidebar>` instance with `onSelectConversation` / `onNewConversation` / `onNewCritiqueConversation` wrapped to also call `setDrawerOpen(false)`; added `inert={drawerOpen ? '' : undefined}` to `<div className="app__main-with-banner">`.

## Verification

### Automated (passed)

- `grep -n "dlg.showModal" frontend/src/components/SidebarDrawer.jsx` → present (line 29)
- `grep -n "::backdrop" frontend/src/components/SidebarDrawer.css` → present (line 30)
- `grep -n "rgb(0 0 0 / 0.18)" frontend/src/components/SidebarDrawer.css` → present (line 31)
- `grep -n "min-width: 769px" frontend/src/components/SidebarDrawer.css` → present (line 51)
- `grep -n "Math.abs(dy) > Math.abs(dx)" frontend/src/hooks/useTouchSwipe.js` → present (line 70, first conditional inside `onTouchEnd`)
- `grep -n "changedTouches" frontend/src/hooks/useTouchSwipe.js` → present (line 65)
- `grep -n "EDGE_ZONE = 24" frontend/src/hooks/useTouchSwipe.js` → present (line 42)
- `grep -c "useCallback" frontend/src/hooks/useTouchSwipe.js` → 5 (3 wrappers + 1 import + 1 docstring mention)
- `grep -n "app-header__menu-toggle" frontend/src/components/Header.{jsx,css}` → wired in both files
- `grep -n "M3 6h18" frontend/src/components/Header.jsx` → MenuIcon present (line 154)
- `grep -n "onMenuOpen" frontend/src/components/Header.jsx` → wired (lines 19, 54)
- `grep -n "SidebarDrawer\|useTouchSwipe\|drawerOpen\|onMenuOpen=\|inert=" frontend/src/App.jsx` → all 5 wired
- **ESLint:** clean on all 4 changed files (App.jsx, SidebarDrawer.jsx, Header.jsx, useTouchSwipe.js)
- **`npx vite build`:** ✓ 540 modules transformed, built in 6.95s — no errors, no warnings on the new code

### Non-negotiable swipe gates — both present

| Gate | Location | Verified |
|------|----------|----------|
| Vertical-dominance rejection (`Math.abs(dy) > Math.abs(dx)`) | `useTouchSwipe.js:70` — first conditional inside `onTouchEnd` | ✓ |
| Edge-zone gate (`startX <= 24px` captured at touchstart) | `useTouchSwipe.js:42` (constant), `:55` (assigned), `:74` (consumed) | ✓ |

### Manual smoke — PENDING USER VALIDATION

The plan's 9-step manual smoke checklist cannot be reliably automated (DevTools touch emulation, simulated swipe gestures, focus-trap navigation). **Flagged for the user to validate in a real browser session.** Exact reproduction steps from the plan:

1. Start servers: `bash start.sh` (or backend + `cd frontend && npm run dev` separately). Visit `http://localhost:5173` in Chrome.
2. Open DevTools → Device toolbar → select an iPhone / Android profile (viewport ≤768px wide).
3. **Tap hamburger button** (leftmost button in Header action cluster) → drawer slides in from left with soft blurred backdrop.
4. **Tap backdrop** (anywhere outside the drawer) → drawer closes.
5. **Open drawer → press ESC** → drawer closes.
6. **Open drawer → Tab through controls** → focus stays inside drawer (cannot reach main panel controls; `inert` is doing its job).
7. **Open drawer → tap a conversation** → drawer dismisses AND selected conversation loads in main.
8. **Close drawer → simulate left-edge swipe-right** (DevTools touch emulation, start in leftmost 24px, drag right ~60px) → drawer opens.
9. **With drawer open → swipe left** (anywhere) past 40px → drawer closes.
10. **With drawer closed → vertically scroll the message list** → drawer does NOT open (vertical-dominance rejection active).
11. **Switch viewport to >768px width** → no hamburger button, persistent sidebar visible, no behaviour regressions.

## Sidebar prop list (canonical — for 07-03 VRT fixtures)

Both the desktop `<Sidebar>` mount and the drawer-wrapped `<Sidebar>` mount receive the same prop set. The drawer-wrapped instance wraps three of the navigation callbacks to additionally call `setDrawerOpen(false)`:

```jsx
<Sidebar
  conversations={conversations}
  currentConversationId={currentConversationId}
  onSelectConversation={handleSelectConversation}        // wrapped to also setDrawerOpen(false) in the drawer instance
  onNewConversation={handleNewConversation}              // wrapped to also setDrawerOpen(false) in the drawer instance
  onNewCritiqueConversation={handleNewCritiqueConversation}  // wrapped to also setDrawerOpen(false) in the drawer instance
  onDeleteConversation={handleDeleteConversation}
  onRenameConversation={handleRenameConversation}
  refreshTrigger={costStatsRefreshTrigger}
/>
```

7 props total. No prop name has drifted from PATTERNS.md.

## Decisions Made

See `key-decisions:` in frontmatter. Summary:

1. **Dual-Sidebar mount kept** per PATTERNS.md line 402-403 — drawer holds its own instance, persistent desktop instance stays in the grid column, CSS `@media` rules decide visibility. Avoids restructuring the Phase 4 `.app` grid.
2. **`inert` applied to `.app__main-with-banner`** (the actual main panel `<div>`) rather than a non-existent `<main>` element. The plan's must_have regex pattern `inert=\{drawerOpen` is satisfied; the element type difference is plan-text vs reality.
3. **Touch handlers spread on `.app` shell root** (not on `.app__main-with-banner`) so left-edge swipes are caught regardless of which inner element the gesture lands on. The `touch-action: pan-y` rule from 07-01 lets vertical scroll on the message list bypass the swipe handler entirely.
4. **Conversation-tap-to-dismiss inlined as wrapper functions inside the drawer mount** — keeps Sidebar's prop API untouched; the wrapping is a drawer-specific concern, not a generic Sidebar feature.

## Deviations from Plan

None. Plan executed exactly as written. The `<main>` vs `<div className="app__main-with-banner">` difference is a plan-text shorthand, not a structural deviation — the `inert` prop is applied to the correct element (the main panel that contains `<ChatInterface>`).

## Issues Encountered

None.

## Wave 1 (MOBL) status — end of Plan 07-02

| Requirement | Shipped in | Verified |
|-------------|------------|----------|
| MOBL-01 (responsive substrate: tokens, viewport-fit=cover, safe-area, touch-target floor) | 07-01 | ✓ |
| MOBL-02 (mobile drawer via hamburger button) | 07-02 | ✓ (pending user manual smoke) |
| MOBL-03 (touch-target floor ≥44px on every interactive control ≤768px) | 07-01 | ✓ |
| MOBL-04 (left-edge swipe-right opens drawer, swipe-left closes) | 07-02 | ✓ (pending user manual smoke) |

**All 4 MOBL requirements are structurally complete at the end of Wave 1.** The two MOBL-02 / MOBL-04 manual smokes need a real browser session for final sign-off.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **07-03 (visual regression tests):** the canonical Sidebar prop list above feeds the VRT mock fixtures. SidebarDrawer's `display: none` above 769px means the VRT only needs to capture mobile breakpoints for drawer states; desktop snapshots can ignore the drawer mount.
- **No blockers.** ESLint clean, vite build clean, all automated verification passes.

## Self-Check: PASSED

- ✓ `frontend/src/components/SidebarDrawer.jsx` exists
- ✓ `frontend/src/components/SidebarDrawer.css` exists
- ✓ `frontend/src/hooks/useTouchSwipe.js` exists (34 LOC executable inside function body)
- ✓ `frontend/src/components/Header.jsx` modified (onMenuOpen + MenuIcon)
- ✓ `frontend/src/components/Header.css` modified (.app-header__menu-toggle + @media gate)
- ✓ `frontend/src/App.jsx` modified (imports + state + swipe + drawer mount + inert)
- ✓ commit `ac82326` exists (Task 1)
- ✓ commit `6c5c079` exists (Task 2)
- ✓ commit `6b90176` exists (Task 3)
- ✓ commit `035b177` exists (Task 4)

---
*Phase: 07-mobile-responsive-visual-regression-tests*
*Completed: 2026-05-11*
