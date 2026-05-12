# Phase 08 — Deferred items

Out-of-scope discoveries logged during plan execution. **Do NOT auto-fix in this phase**; record for a future plan or quick-task.

## Detected during 08-03-PLAN execution (2026-05-12)

- **Pre-existing lint error in `frontend/src/components/Stage1.jsx:33`** — `react-hooks/set-state-in-effect`: `setNeedsToggle(true)` is called synchronously inside `useEffect`. Out of scope for plan 08-03 (which only touches `BackToTopButton.{jsx,css}`). File-scoped lint on `BackToTopButton.jsx` is clean. Workaround during this plan: run `npx eslint src/components/BackToTopButton.jsx` for the per-task verify; do NOT auto-fix the unrelated file.
