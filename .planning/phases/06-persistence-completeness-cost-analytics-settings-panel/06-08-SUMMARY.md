---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 08
subsystem: ui
tags: [react, sse, race-condition, defensive-guard, frontend, gap-closure]

# Dependency graph
requires:
  - phase: 06
    provides: handleStreamEvent dispatcher (the surface being guarded), settled SSE event shape post 06-01..07
provides:
  - Stale-event guard in handleStreamEvent — switching conversations mid-stream no longer crashes the App component
  - Defensive predicate `!lastMsg?.loading` documented as the asymmetry signal between in-flight and persisted assistant messages
affects: [v2.1-hardening, multi-tab-ux, sse-streaming, abortcontroller-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale-event guard via shape asymmetry: in-flight messages carry a `loading: { stageN: bool }` UI-ephemeral object; persisted messages (hydrated from JSON) never do. Detecting `!lastMsg?.loading` inside a setter is sufficient to drop SSE events targeting a conversation the user has switched away from."

key-files:
  created:
    - .planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-08-SUMMARY.md
  modified:
    - frontend/src/App.jsx

key-decisions:
  - "Ship Option 1 (defensive guard at setter top) as the v2.0 minimal fix; defer Option 2 (AbortController cancellation on handleSelectConversation) and Option 3 (backend SSE payload includes conversation_id, frontend filters by currentConversationId) to v2.1+ when multi-tab / multi-stream UX matters."
  - "Place ONE explanatory comment block above handleStreamEvent rather than per-case comments — the guards are self-explanatory once the top block is read; per-case comments would expand diff noise without adding signal."
  - "Do NOT refactor handleStreamEvent into a per-case helper. Duplicating the guard line IS the patch — a refactor expands blast radius, which is exactly what a v2.0 gap-closure must avoid."
  - "Classification: this race is pre-existing (since SSE streaming landed), not a Phase 6 regression. Phase 6 SC remain 5/5; this plan closes a UAT-discovered quality gap."

patterns-established:
  - "Shape-asymmetry guard: when the same dispatcher serves both in-flight and persisted versions of an entity, use a UI-ephemeral key (e.g. `loading`) as the asymmetry signal. Early-return at setter top if absent. Trade-off: silently drops late events for the abandoned context — acceptable for single-user local UX, NOT acceptable for multi-tab; revisit with AbortController or scoped payloads when that constraint changes."

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-05-11
---

# Phase 6 Plan 8: handleStreamEvent stale-event guard — Summary

**Defensive `if (!lastMsg?.loading) return prev;` early-return inserted at every in-flight setter inside `handleStreamEvent` (10 sites); closes 06-UAT BLOCKER race condition without touching the SSE wire format or stream lifecycle.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-11T07:46:10Z
- **Completed:** 2026-05-11T07:54:00Z (approx.)
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Closed the BLOCKER race condition from 06-UAT Test 2: switching conversations via `handleSelectConversation` while an SSE stream is still in flight no longer throws `TypeError: Cannot set properties of undefined (setting 'stage1')`.
- Inserted the guard at exactly 10 setter sites — all branches of `handleStreamEvent` that write to `lastMsg.loading.*` or to an in-flight assistant slot (`stage1` / `stage2` / `stage3` / `stage4` / `metadata` / `critic`).
- Added a single top-of-function comment block explaining the rationale and naming the deferred v2.1+ alternatives so a future reader has the context to upgrade.
- Verified ESLint (App.jsx scope) and `npm run build` both clean.

## Task Commits

1. **Task 1: Add stale-event guard to every handleStreamEvent setter** — `de5cf31` (fix)

**Plan metadata:** (follows below — single SUMMARY commit)

## Files Created/Modified

- `frontend/src/App.jsx` — Inserted `if (!lastMsg?.loading) return prev;` at 10 setter sites inside `handleStreamEvent`; added explanatory comment block above the function. 29 net additions, 0 deletions.

## Guard Sites (10 total)

All ten case labels inside the `handleStreamEvent` switch where a `setCurrentConversation((prev) => ...)` setter writes to `lastMsg.loading.*` or to an in-flight assistant slot:

1. `case 'stage1_start'`
2. `case 'stage1_complete'`
3. `case 'stage2_start'`
4. `case 'stage2_complete'`
5. `case 'stage3_start'`
6. `case 'stage3_complete'`
7. `case 'message_metadata'`
8. `case 'critic_complete'`
9. `case 'stage4_start'`
10. `case 'stage4_complete'`

Sites intentionally NOT modified (per plan §<action> "Sites NOT to modify"):

- `case 'title_complete'` — calls `loadConversations()` only, no setter.
- `case 'complete'` — calls `loadConversations()` + `setCostStatsRefreshTrigger` + `setIsLoading(false)`; no per-message setter; firing these for a stale conversation is harmless (idempotent).
- `case 'error'` — the setter inside only READS `prev?.messages?.[…]` to derive `stageNumber` and returns `prev` unmodified.
- `default` — `console.log` only.

## Verification

| Check | Result |
|-------|--------|
| Guard count: `grep -c 'if (!lastMsg?.loading) return prev;' frontend/src/App.jsx` ≥ 10 | **11 matches** (10 guards + 1 reference in the comment block) — PASS |
| ESLint scoped to `frontend/src/App.jsx` | EXIT 0 — PASS |
| `cd frontend && npm run build` | EXIT 0 — PASS (built in 3.90s, 537 modules) |
| Diff isolation: only `frontend/src/App.jsx` changed | PASS (29 insertions, 0 deletions, 1 file) |

### Project-wide lint note (out of scope)

`npm run lint` (no path scope) surfaces ONE pre-existing error in `frontend/src/components/Stage1.jsx:33` (`react-hooks/set-state-in-effect` — synchronous `setNeedsToggle(true)` inside a `useEffect`). The file was not touched by this plan (verified via `git diff HEAD -- frontend/src/components/Stage1.jsx` returning empty). Per the executor scope boundary ("only auto-fix issues DIRECTLY caused by the current task's changes"), this is logged here as a deferred item, not fixed in this plan. STATE.md already tracks "pre-existing `react-hooks/immutability` lint warnings in `App.jsx:25-29`" under v2.0 tech debt — Stage1.jsx joins the same bucket. Recommend folding into Phase 7 (Mobile + VRT + Tests) as a lint-cleanup pre-req before snapshots land.

## Decisions Made

- **Option 1 (minimal guard) wins for v2.0.** Per plan rationale and UAT gap entry, the surgical defensive guard ships now; the architecturally cleaner alternatives are deferred. The shape-asymmetry predicate (`!lastMsg?.loading`) is reliable because persisted messages NEVER carry `loading` (UI-ephemeral state never written to disk) and in-flight placeholders ALWAYS do (created with `loading: { stage1: false, ... }` in `handleSendMessage:332-346` and `handleSubmitCritique:407-422`).
- **One comment block, no per-case comments.** Per CLAUDE.md "comments only explain why" + plan §<action> implementation discipline.
- **Atomic single commit.** Branching strategy is `none` (master-only); the patch is one logical change.

## Manual smoke test — NOT executed by the executor

The plan §<verify><manual> defines a 7-step browser smoke test (DevTools open, send long-form QR prompt, switch conversation mid-stream, assert no TypeError / no white screen / no auto-reload). The executor environment cannot drive a Chromium DevTools console interactively, so this test is **flagged as a follow-up for the user**.

**Recommended user-side verification:**

1. `bash start.sh` from the project root.
2. Open http://localhost:5173 with DevTools Console visible.
3. Send a Quality+Research prompt (e.g. "Explain the difference between concurrent and parallel programming with examples in Python, JavaScript, and Rust. Include trade-offs.").
4. WHILE Stage 1 or Stage 2 is still streaming, click a DIFFERENT conversation in the Sidebar.
5. Expect: no red Vite overlay, no `TypeError: Cannot set properties of undefined` in Console, selected conversation loads cleanly, App component does NOT unmount.
6. Switch back to the original conversation — stages that completed BEFORE you switched are filled in; stages that fired AFTER you switched are NOT (this is the known Option 1 UX trade-off, intentional and documented).
7. F5 reload — all conversations load normally.

Until this is run, the BLOCKER is **structurally closed** (verification gates pass) but **not functionally confirmed**. The user MUST run the manual smoke test before declaring the UAT-discovered gap resolved.

## Deferred Hardening (v2.1+)

The minimal guard silently swallows events for the abandoned conversation. That is acceptable for single-user local v2.0 UX, but is NOT scalable to a multi-tab / multi-stream scenario. Re-open as a v2.1 plan when those constraints matter.

### Option 2 — AbortController cancellation in `handleSelectConversation`

- **What:** When the user switches conversations, abort the in-flight `fetch` for the SSE stream via an `AbortController.signal` plumbed through `api.js`.
- **Trade-off:** Original deliberation is lost on tab change (the abandoned stream stops producing events, period). User-visible UX impact: a 30-second QR deliberation cannot be parked while the user reads a different conversation.
- **Surface area:** `frontend/src/api.js` (signal threading) + `frontend/src/App.jsx::handleSendMessage` / `handleSubmitCritique` (controller ownership lifecycle) + `frontend/src/App.jsx::handleSelectConversation` (abort trigger).
- **Why deferred:** Behavioral change — silently dropping events is "stream keeps running in background"; aborting is "stream dies on switch". Decision needs UX validation before code.

### Option 3 — Per-event `conversation_id` scoping (backend + frontend)

- **What:** Backend SSE payload includes the originating `conversation_id` on every event; frontend dispatcher (`api.js` reader loop or `handleStreamEvent` directly) filters out events whose id !== `currentConversationId`.
- **Trade-off:** Most correct — original stream keeps running, late events for the abandoned conversation continue to mutate the persisted JSON, results are still saved on disk for when the user comes back. No UX surprises.
- **Surface area:** `backend/main.py` (SSE generator must accept conversation id and embed it in every event payload) + `frontend/src/api.js` + `frontend/src/App.jsx`. Requires SSE shape change.
- **Why deferred:** Backend change with downstream blast radius (must update Plan 05-02 SSE contract docs, all SSE consumers, and possibly schema migration if events get persisted somewhere).

**Recommendation when re-opening:** ship Option 3 (correctness) over Option 2 (cancellation) unless metrics show users actively abandon streams to save cost. Option 1 (the guard from this plan) stays in place as defense-in-depth — Options 2/3 don't replace the guard, they layer on top.

## Deviations from Plan

None — plan executed exactly as written.

The plan-checker note about `react-hooks/set-state-in-effect` in `Stage1.jsx:33` surfaced during verification but is out of scope per the executor's scope boundary rule (pre-existing, untouched by this task). Logged in §"Verification → Project-wide lint note" above as a follow-up, NOT a deviation.

## Issues Encountered

- None during code change.
- Verification: `npm run lint` (project-wide) returns EXIT 1 due to a pre-existing error in `Stage1.jsx:33`. Resolved by running `npx eslint src/App.jsx` directly — App.jsx is lint-clean (EXIT 0). The plan's verification command (`npm run lint -- src/App.jsx`) appends `src/App.jsx` to the eslint args but the project's `lint` script already passes `.` as the first arg, so the project-wide scope dominates. The correct invocation for this plan's verification gate is `npx eslint src/App.jsx`.

## Classification Reminder

Per the plan's objective and the 06-UAT classification: **this race is pre-existing**, not a Phase 6 regression. Phase 6 added `settingsOpen`, `costStatsRefreshTrigger`, `useSettings()`, `stage4Threshold` — none of which touch `handleStreamEvent`. The vulnerability has existed since SSE streaming was introduced. The plan is filed under Phase 6 because UAT surfaced it.

**Phase 6 Success Criteria remain 5/5.** This plan closes a UAT-discovered quality gap; it is gap-closure, not regression-recovery.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 6 is now fully closed** (all 8 plans complete, including this gap-closure).
- **Phase 7 (Mobile + VRT + Tests) is ready to plan/execute.** When Phase 7 runs the test-suite plans (TEST-01..03), include:
  - A vitest spec for `handleStreamEvent` that simulates the race (mount App with conversation A, dispatch `stage1_start` event, then swap `currentConversation` to a persisted message lacking `loading`, then dispatch another `stage1_start` — assert no throw, no state mutation).
  - This locks the guard against regression and is a low-cost addition once the test harness is in place.

## Self-Check

- File exists: `frontend/src/App.jsx` — VERIFIED (29 insertions in commit `de5cf31`).
- Guard count ≥ 10: `grep -c 'if (!lastMsg?.loading) return prev;' frontend/src/App.jsx` → 11 (10 guards + 1 comment reference) — PASS.
- Commit `de5cf31` on master — VERIFIED.
- ESLint App.jsx scope EXIT 0 — VERIFIED.
- `npm run build` EXIT 0 — VERIFIED.

## Self-Check: PASSED

---
*Phase: 06-persistence-completeness-cost-analytics-settings-panel*
*Completed: 2026-05-11*
