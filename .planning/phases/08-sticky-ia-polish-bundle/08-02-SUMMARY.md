---
phase: 08-sticky-ia-polish-bundle
plan: 02
subsystem: frontend-sidebar
tags: [ia, sidebar, date-grouping, metadata-demote, active-row]
status: paused-at-checkpoint
requires:
  - IA-V2.1-02 (verify only — structurally pre-shipped)
  - IA-V2.1-03 (date grouping)
  - IA-V2.1-04 (metadata demote)
provides:
  - module-level `bucketFor(createdAtIso, now)` helper
  - module-level `groupByDateBucket(conversations, now)` helper
  - module-level `BUCKET_ORDER` constant (`['Today', 'This week', 'This month', 'Older']`)
  - `groupedConversations` useMemo (render-time transformation over `filteredConversations`)
  - `.conversation-group` + `.conversation-group-header` CSS rules
affects:
  - frontend/src/components/Sidebar.jsx (date-grouping logic + JSX + meta-demote)
  - frontend/src/components/Sidebar.css (new group-header + group container styles)
tech-stack:
  added: []
  patterns: ["module-level pure helpers above component (CLAUDE.md React pattern)"]
key-files:
  created: []
  modified:
    - frontend/src/components/Sidebar.jsx
    - frontend/src/components/Sidebar.css
decisions:
  - "D-04 honored: bucket field is `conv.created_at`, local-time calendar math"
  - "D-05 honored: English bucket labels (`Today` / `This week` / `This month` / `Older`) — conscious override of REQUIREMENTS.md ES literals"
  - "D-06 honored: unicode bullet `•` glyph, single space separator, color inherits from `.conversation-meta` (no extra rule)"
  - "D-07 honored: `.conversation-meta` block hidden when `conv.message_count === 0` (explicit `> 0` guard, not truthy)"
  - "D-08 (NAV strip box-shadow) not in scope here"
metrics:
  duration_minutes: ~25
  tasks_completed: 2
  tasks_remaining: 1 (checkpoint:human-verify)
  files_modified: 2
  commits: 2
completed_date: null
---

# Phase 8 Plan 02: Sidebar Date-Grouping + Metadata Demote — Execution Summary

**One-liner:** Sidebar conversations grouped under four English date headers (`Today` / `This week` / `This month` / `Older`) computed from `created_at` local-time, message-count metadata demoted to bullet glyph + count, zero-count rows omit the meta line entirely. Active-row 3px accent border verified structurally intact.

**Status:** Paused at Task 3 (`checkpoint:human-verify`). Awaiting orchestrator-coordinated user smoke.

## Tasks Executed

| Task | Status | Commit | Files |
|------|--------|--------|-------|
| T1 — Date-grouping logic + grouped render + meta demote | done | `7a046fc` | `frontend/src/components/Sidebar.jsx` |
| T2 — `.conversation-group-header` CSS rule | done | `27623dd` | `frontend/src/components/Sidebar.css` |
| T3 — Manual smoke checkpoint | paused | — | (UI verification) |

## Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| **IA-V2.1-02** (active-row 3px accent border) | structural verify pending checkpoint | No CSS edit — `.conversation-item.active { border-left: 3px solid var(--color-accent) }` line 121-125 verified intact via `grep` (still returns 1 match). Visual prominence to be confirmed at the human-verify checkpoint; if user reports "too thin / low contrast", surface as Phase 9/10 follow-up per the plan's smoke instructions. |
| **IA-V2.1-03** (sidebar date grouping) | done structurally; smoke pending | English headers per D-05. Empty buckets skipped (only buckets present in `filteredConversations` render). Bucket math is local-time and runs once per render via `useMemo`. |
| **IA-V2.1-04** (sidebar metadata demote) | done structurally; smoke pending | Glyph is `•` (U+2022) + single space + `{message_count}`. Explicit `> 0` guard hides the meta line on freshly-created conversations. Color inherits from existing `.conversation-meta` rule per D-06's note. |

## Bucket-Boundary Math (chosen)

The four buckets are computed in **local time** from `conv.created_at`:

- **Today** — `diffDays <= 0` (same calendar day as `now`).
- **This week** — `1 <= diffDays <= 6` (previous 6 calendar days, exclusive of today).
- **This month** — `diffDays > 6` AND the created date falls in the same calendar year + month as `now` (rest of the current calendar month, before the 7-day window).
- **Older** — anything else (earlier months / years).

`diffDays` is computed as `Math.floor((today_midnight - created_midnight) / 86_400_000)` where both `Date` objects are reduced to `YYYY-MM-DD 00:00:00` local. This matches the CONTEXT.md "Claude's discretion" rolling-7-day spec verbatim.

Invalid / unparseable `created_at` → `'Older'` bucket (graceful degradation).

## Deviations from Plan

None for Tasks 1 and 2. The plan was followed verbatim.

## Deferred / Out-of-Scope Issues

- **Pre-existing lint error in `frontend/src/components/Stage1.jsx:33`** — `react-hooks/set-state-in-effect` (calling `setNeedsToggle(true)` synchronously within `useEffect`). NOT touched by this plan (Sidebar.jsx + Sidebar.css only). Logged here for visibility; recommend Phase 9 or v2.1 polish backlog for cleanup. Confirmed pre-existing on master before this plan's changes.

## Known Stubs

None.

## Threat Flags

None. UI-only changes, no new attack surface, no new persistence, no new boundaries crossed.

## Verification Results

- `cd frontend && npx eslint src/components/Sidebar.jsx` — clean (0 errors, only a baseline-browser-mapping notice unrelated to source).
- `cd frontend && npm run build` — succeeds. `dist/assets/index-*.css` = 57.38 kB (gzip 8.62 kB); `dist/assets/index-*.js` = 586.94 kB (gzip 179.27 kB). No build-time regressions.
- All Task 1 automated greps green: `groupByDateBucket` = 2, `conversation-group-header` = 1, bucket-string regex matches = 6 (BUCKET_ORDER literal + bucketFor returns), `conv.message_count > 0` = 1, `• {conv.message_count}` = 1, `{conv.message_count} messages` = 0 (demoted text gone), `💬` = 0 (no emoji).
- All Task 2 automated greps green: `conversation-group-header` = 1, `text-transform: uppercase` = 1, `border-left: 3px solid var(--color-accent)` = 1 (active-row preserved), `border-left: 3px solid transparent` = 1 (reservation preserved), new design tokens introduced = 0 (same count as master).

## Self-Check

**FOUND:** `frontend/src/components/Sidebar.jsx` (modified).
**FOUND:** `frontend/src/components/Sidebar.css` (modified).
**FOUND:** commit `7a046fc` — `feat(08-02-PLAN/T1): group sidebar by date bucket + demote meta line`.
**FOUND:** commit `27623dd` — `style(08-02-PLAN/T2): add subdued group-header CSS, leave 3px active border untouched`.

## Self-Check: PASSED

## Paused — Awaiting Human-Verify Checkpoint

Task 3 (the manual smoke checkpoint) is the human-coordinated step per the plan's `<resume-signal>` block. The executor returns control to the orchestrator; the orchestrator coordinates the user smoke. Once the user signals approval, this SUMMARY is updated with the IA-V2.1-02 visual-prominence verdict (and any "active border feels too soft" observation surfaced for Phase 10 follow-up).
