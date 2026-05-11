# Phase 07 — Deferred Items

Items surfaced during execution that are **out of scope** for the current plan.

## Discovered in 07-05 (2026-05-11)

### Pre-existing ESLint error: `react-hooks/set-state-in-effect` in `frontend/src/components/Stage1.jsx:33`

- **Source:** `setNeedsToggle(true)` inside `useEffect` (Show-more accordion height probe).
- **Introduced by:** Plan 05-05 (NAV-03 Stage 1 Show-more accordion).
- **Why deferred:** Pre-existing, unrelated to TEST-02/TEST-03 scope. Refactoring the height probe to a `useLayoutEffect` + `useRef` non-render pattern (or to a single-render `useState(() => ...)` initializer with a `ResizeObserver`) is a structural change that touches Stage 1 rendering behaviour — out of scope for the test scaffolding plan.
- **Severity:** Low. The cascading-render warning is a perf hint, not a correctness bug; the component re-renders at most twice per stage 1 response.
- **Suggested home:** v2.1 backlog or a future Stage 1 polish plan.
