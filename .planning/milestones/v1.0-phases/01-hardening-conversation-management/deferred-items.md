# Deferred Items — Phase 01

## Pre-existing eslint errors in `frontend/src/App.jsx` (not introduced by Plan 02)

`react-hooks/immutability` flags two cases of "variable accessed before declared":
- L15: `loadConversations()` called inside `useEffect` declared above the function definition.
- L21: `loadConversation()` same pattern.

These predate Plan 02 — verified by stashing my Plan 02 changes and re-running eslint.
Fix would be to either hoist the declarations or define the functions inside `useEffect`,
both of which are stylistic refactors orthogonal to CONV-01.

Owner: future cleanup; not blocking. The `npm run build` step still passes (Vite uses
its own transform pipeline; eslint is advisory in this project per repo conventions).
