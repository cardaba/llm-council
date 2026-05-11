---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 04
subsystem: ui
tags: [cost, sse, fastapi, react, sidebar, tokens]

requires:
  - phase: 06-persistence-completeness-cost-analytics-settings-panel
    provides: "metadata.cost dict packed onto assistant messages (Plan 03 COST-01)"
provides:
  - "GET /api/stats/cost endpoint backed by read-only conversation-file walk"
  - "MessageHeader cost line beneath the profile/models/chairman row (D-01)"
  - "Sidebar dual-cap footer block + ≥80% progress bar (D-02)"
  - "Cross-component refresh trigger from App.jsx → Sidebar on every SSE `complete`"
affects: [cost-analytics, settings-panel, monthly-cap]

tech-stack:
  added: []
  patterns:
    - "Read-only filesystem aggregation in a dedicated backend module (`backend/stats.py`) — analog of `storage.list_conversations` filesystem walk"
    - "Cross-component refresh via integer prop trigger (no context, no event bus)"
    - "Hide-zero gate at the render boundary, not at the data layer (cost data always packed; UI decides visibility)"

key-files:
  created:
    - backend/stats.py
  modified:
    - backend/main.py
    - frontend/src/api.js
    - frontend/src/App.jsx
    - frontend/src/components/MessageHeader.jsx
    - frontend/src/components/MessageHeader.css
    - frontend/src/components/Sidebar.jsx
    - frontend/src/components/Sidebar.css

key-decisions:
  - "Refresh trigger is a single integer state in App.jsx bumped on `complete` SSE events; Sidebar re-fetches via useEffect dep on the prop (cheapest cross-component nudge)"
  - "Empty-state and fetch-failure both collapse to a single 'No queries this month yet.' microcopy per the PATTERNS.md analog (no separate error UI)"
  - "Per-profile sub-aggregates are rounded to 4 decimals at the boundary so the JSON payload stays compact"

patterns-established:
  - "Boundary-rounded aggregates: backend returns `round(x, 4)` for USD totals, frontend renders `.toFixed(2)` or `.toFixed(3)` for display"
  - "Read-only stats module: a single public `aggregate_current_month()` walks files synchronously inside an async handler (Pitfall 6 already accepted for single-user local)"

requirements-completed: [COST-02, COST-03, COST-04]

duration: ~25min
completed: 2026-05-11
---

# Phase 6 Plan 04: Cost UI Surface Summary

**Full vertical-slice cost visibility — per-message cost line in MessageHeader, GET /api/stats/cost aggregator, and Sidebar dual-cap footer with conditional ≥80% progress bar.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 7 (1 created + 6 modified)

## Accomplishments

- Created `backend/stats.py` with `aggregate_current_month()` — read-only walk over `data/conversations/*.json` filtering messages with non-zero `metadata.cost.total` or `metadata.cost.upstream_total`, aggregating by current UTC-month boundary, returning the locked shape with `current_month`, `current_session_estimate_for_cap`, and `currency` top-level keys.
- Added `GET /api/stats/cost` FastAPI route (no try/except — matches the `list_conversations` route style; unhandled errors surface as HTTP 500).
- Refactored `MessageHeader.jsx` to stack the existing profile/models/chairman row above a sibling cost line (`flex-direction: column` + `gap: var(--space-1)`); cost line renders bold upstream + muted fee separated by a middot per D-01, gated by `metadata.cost.total >= 0.001` to hide on Fast queries and legacy v2 messages.
- Added `api.getCostStats()` GET wrapper with the same shape as `listConversations`.
- Lifted `costStatsRefreshTrigger` integer state in `App.jsx`; bumped on every SSE `complete` event and passed as `refreshTrigger` prop to `Sidebar`.
- Added `.sidebar-footer__cost` block beneath the conversation list in `Sidebar.jsx` — two-column grid (OpenRouter cap left / Upstream BYOK right), `usageRatio >= 0.8`-gated progress bar, and a combined microcopy line `{X}% of cap · {N} queries this month`. Empty + failed-fetch states both collapse to `No queries this month yet.`
- Tokens-only CSS across both new selectors blocks; `--color-warn` drives the progress fill at ≥80% threshold; no hex literals introduced.

## Task Commits

1. **Task 1: Create backend/stats.py + GET /api/stats/cost route** — `14cd17b` (feat)
2. **Task 2: Render cost line in MessageHeader (COST-02)** — `d2c9deb` (feat)
3. **Task 3: Wire api.getCostStats + sidebar footer two-column block (COST-04)** — `a6a88b2` (feat)

## Files Created/Modified

- `backend/stats.py` (NEW) — `aggregate_current_month()` filesystem aggregator
- `backend/main.py` — `from . import stats` + new `GET /api/stats/cost` route
- `frontend/src/api.js` — `getCostStats()` GET wrapper
- `frontend/src/App.jsx` — `costStatsRefreshTrigger` state + bump on `complete` + new Sidebar prop
- `frontend/src/components/MessageHeader.jsx` — JSX refactored to stack `__row` + `__cost-line`; hide-zero gate at `>= 0.001`
- `frontend/src/components/MessageHeader.css` — `.message-header` switched to flex-column; new `.message-header__row`, `.message-header__cost-line`, `.cost-line__upstream`, `.cost-line__fee` selectors; tabular-nums cascades down
- `frontend/src/components/Sidebar.jsx` — `refreshTrigger` prop, `costStats` state + mount/refresh useEffect, footer JSX block
- `frontend/src/components/Sidebar.css` — full footer selectors block (`.sidebar-footer__cost` + cols + progress + empty/microcopy)

## Backend smoke check

`GET /api/stats/cost` response shape for a real `data/conversations/` snapshot (no post-Plan-03 cost-tagged messages yet — empty totals returned, validating the empty-state branch):

```json
{
  "current_month": {
    "total_usd": 0.0,
    "upstream_total_usd": 0.0,
    "queries": 0,
    "by_profile": {}
  },
  "current_session_estimate_for_cap": {
    "remaining_pct": 1.0,
    "cap_usd": 100.0
  },
  "currency": "USD"
}
```

This validates the contract that drives the Sidebar empty-state branch (`No queries this month yet.`). Once Plan 03's `metadata.cost` packing produces non-zero totals for fresh queries this month, `queries` will increment and the two-column block will replace the empty microcopy.

## DOM-text capture — MessageHeader cost line

When `metadata.cost = {total: 0.024, upstream_total: 1.430}` is present:

```html
<div class="message-header">
  <div class="message-header__row">
    <span class="profile-label">Quality+Research</span>
    <span class="header-sep">•</span>
    <span>4 models</span>
    <span class="header-sep">•</span>
    <span>Chairman: claude-opus-4.7</span>
  </div>
  <div class="message-header__cost-line">
    <span class="cost-line__upstream">$1.430 upstream</span>
    <span class="header-sep">·</span>
    <span class="cost-line__fee">$0.024 fee</span>
  </div>
</div>
```

When `metadata.cost.total < 0.001` (Fast query) OR `metadata.cost` is absent (legacy v2 message), the `.message-header__cost-line` div is NOT rendered — the second `if (!metadata?.profile)` branch returns the legacy tag, and the post-render gate at `showCostLine` suppresses the cost line entirely.

## DOM-text capture — Sidebar footer

When `costStats.current_month.queries > 0`:

```html
<div class="sidebar-footer__cost">
  <div class="sidebar-footer__cols">
    <div class="sidebar-footer__col">
      <span class="sidebar-footer__label">OpenRouter</span>
      <span class="sidebar-footer__value">$1.20 / $100</span>
      <!-- progress bar NOT rendered: usageRatio (0.012) < 0.8 -->
    </div>
    <div class="sidebar-footer__col">
      <span class="sidebar-footer__label">Upstream</span>
      <span class="sidebar-footer__value">$22.40 BYOK</span>
      <span class="sidebar-footer__subtext">no cap</span>
    </div>
  </div>
  <p class="sidebar-footer__microcopy">1.2% of cap · 47 queries this month</p>
</div>
```

At ≥80% of cap (e.g., `total_usd = 85`), an extra `<div class="sidebar-footer__progress">` with a nested `.sidebar-footer__progress-fill` of `width: 85%` appears beneath the OpenRouter value, filled with `var(--color-warn)`.

## Legacy v2 message confirmation

`MessageHeader` legacy fallback at lines 26-28 is preserved verbatim from the prior plan — `if (!metadata?.profile) return <div className="message-header legacy">Quality (legacy)</div>;` short-circuits BEFORE the cost-line render block, so legacy v2 messages render WITHOUT the cost line and never invoke the `metadata.cost?.total` optional chain. The Sidebar aggregator's `if (t == 0.0 and u == 0.0): continue` branch additionally skips legacy messages (no `metadata.cost`) silently — they cannot inflate the monthly totals.

## Decisions Made

- Refresh trigger via integer state in App.jsx (not React context, not a custom event) — cheapest cross-component nudge for a single dependency.
- Empty-state and failed-fetch collapse to one microcopy string (per PATTERNS.md analog) — no separate error UI in v1.
- Per-profile sub-aggregates rounded to 4 decimals server-side so the JSON payload stays compact; frontend re-rounds to 2/3 decimals for display.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Self-Check: PASSED

- `backend/stats.py` exists (FOUND) — verified via Python `aggregate_current_month()` call returning the locked shape.
- `backend/main.py` contains `from . import stats` (FOUND at line 12) + `@app.get("/api/stats/cost")` route (FOUND at line 90).
- `frontend/src/api.js` exports `getCostStats` (FOUND).
- `frontend/src/components/MessageHeader.jsx` contains `cost-line__upstream`, `metadata.cost`, `toFixed(3)` (FOUND).
- `frontend/src/components/MessageHeader.css` contains `.cost-line__upstream` selector with `font-weight: 600`, no NEW hex literals introduced (only the pre-existing comment header references hex).
- `frontend/src/components/Sidebar.jsx` contains `sidebar-footer__cost` block + `refreshTrigger` prop + `useEffect([refreshTrigger])` (FOUND).
- `frontend/src/components/Sidebar.css` contains `sidebar-footer__progress-fill` + `var(--color-warn)` + zero hex literals (FOUND).
- `frontend/src/App.jsx` contains `costStatsRefreshTrigger` state + `setCostStatsRefreshTrigger((n) => n + 1)` in `complete` branch + `refreshTrigger={costStatsRefreshTrigger}` prop pass (FOUND).
- Commits `14cd17b`, `d2c9deb`, `a6a88b2` all exist in `git log --oneline`.

## Next Phase Readiness

- Cost UI surface complete end-to-end: data captured (Plan 03) → aggregated (Plan 04 backend) → displayed per message + per month (Plan 04 frontend).
- Refresh wiring is generic (`refreshTrigger` integer prop) and can be reused by Plan 05 (Settings panel) or any future "refetch on completed deliberation" component.
- Outstanding follow-up: until Plan 03's per-message `metadata.cost` packing fires for a fresh-quality query, the Sidebar footer will display the empty microcopy. Once a single cost-tagged query lands, both surfaces light up automatically without further code changes.

---
*Phase: 06-persistence-completeness-cost-analytics-settings-panel*
*Completed: 2026-05-11*
