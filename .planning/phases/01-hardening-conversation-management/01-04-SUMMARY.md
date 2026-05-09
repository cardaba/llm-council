---
phase: 01-hardening-conversation-management
plan: 04
subsystem: conversation-management
tags: [conversation-management, search, debounce, progressive-disclosure, client-side, react-19, useMemo]

# Dependency graph
requires:
  - "Plan 02: Menu primitive + post-delete welcome state pattern"
  - "Plan 03: ConversationItem + RenameInput sub-components extracted inside Sidebar.jsx (CD-04 — made the search wiring a near-trivial overlay rather than a refactor)"
  - "frontend/src/api.js api.getConversation (preexistent — unchanged this plan)"
provides:
  - "Sidebar search input with debounce-200ms title filter (CONV-03 default mode)"
  - "D-10 content-fallback affordance + D-11 per-session content cache (Map<id, fullConversation>)"
  - "Pitfall 6 seal: search filter never deselects currentConversationId"
affects:
  - "Phase 4 (visual identity) — adds .search-input + .content-search-affordance + .content-search-active-note as new restyling targets alongside Modal.css and Menu.css"
  - "Future v2 work (CONV-V2-02 tags/folders, CONV-V2-01 bulk ops) can iterate the same filteredConversations array without touching the debounce/cache machinery"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounce via useEffect setTimeout/clearTimeout (RESEARCH §Pattern 5) — no third-party hook, no lodash; the cleanup function cancels the pending timer on every keystroke and on unmount, so the search query is always the most recent stable input"
    - "Two-tier filter chain: titleMatches (cheap, always live) → filteredConversations (only meaningful when contentSearchActive); useMemo on both keeps allocations stable"
    - "Lazy resource cache via Promise.all + Map on first explicit user opt-in (D-11) — sticky for the rest of the session, no invalidation on rename/delete because the metadata list (`conversations`) gates rendering anyway"

key-files:
  created: []
  modified:
    - frontend/src/components/Sidebar.jsx
    - frontend/src/components/Sidebar.css

key-decisions:
  - "200ms debounce — RESEARCH §Pattern 5 sweet spot: imperceptible to deliberate typists yet eliminates the per-keystroke filter churn for fast typists. Implemented as inline useEffect rather than a custom useDebounce hook — one consumer in the codebase, hook extraction would be premature."
  - "Content fallback gated on `query.length >= 3` AND `titleMatches.length === 0` — D-10. The `>=3` guard prevents the affordance flickering on transient queries like 'a' or 'ab'; the `=== 0` guard prevents it appearing while the title filter is still meaningful."
  - "Cache lifetime = session. No invalidation on rename or delete (D-11 'accepts staleness'). Rationale: the rendered list is always derived from `conversations` (the freshly-loaded metadata), so a stale cache entry for a deleted conversation simply never renders. Renaming a conversation may leave the OLD title body content matching, but the row's display title is sourced from `c.title || 'New Conversation'` which uses the current metadata — so even a rename-to-cancel-content-match scenario degrades gracefully."
  - "Stage 2 evaluation text NOT in the search corpus. Stage 1 council responses + Stage 3 chairman synthesis + user content cover ~95% of the meaningful surface; Stage 2 is anonymised peer-review-of-peers, useful to the user once but unlikely to be the recall key for finding a past conversation. If it ever matters, adding it to the inner `.some(...)` is a one-line change."
  - "Pitfall 6 anti-pattern preserved by deliberate omission: there is no `if (filteredConversations.find(...) === undefined) onSelectConversation(null)` anywhere. Code was checked at commit time; the only literal substring 'onSelectConversation(null)' in the file was in a comment that I rephrased so the grep-based acceptance criterion (`grep -c == 0`) holds."

patterns-established:
  - "Search-state localisation in Sidebar.jsx (no lift to App.jsx). Following Plan 03's precedent of co-locating concerns to their consumer; App.jsx stays focused on the conversation lifecycle."
  - "Two useMemo passes over the same source list with cumulative state (titleMatches → filteredConversations) — pattern reusable in Phase 3 if the Quality dial needs progressive filtering (e.g. 'show only Quality+Research conversations') on top of the existing search."

requirements-completed: [CONV-03]

# Metrics
duration: 4min
completed: 2026-05-09
---

# Phase 01 Plan 04: CONV-03 (Progressive Search) Summary

**Búsqueda progresiva en el sidebar con debounce de 200ms: por defecto filtra por título client-side; cuando título devuelve 0 matches y la query tiene >=3 chars, expone una afordancia explícita "Search inside content (N conversations)" que carga lazy todos los bodies vía `api.getConversation` y los cachea en una `Map` para el resto de la sesión.**

## Performance

- **Duration:** ~4 min (un único task; los sub-componentes ConversationItem/RenameInput de Plan 03 hicieron que el cambio sea aditivo, sin refactor)
- **Started:** 2026-05-09T10:52:22Z
- **Completed:** 2026-05-09T10:55:34Z
- **Tasks:** 1
- **Files created:** 0
- **Files modified:** 2 (frontend/src/components/Sidebar.jsx, frontend/src/components/Sidebar.css)

## Accomplishments

- CONV-03 satisfecho: el input search aparece debajo del header del sidebar y filtra la lista por título tras 200ms de inactividad de teclado.
- D-10 implementado: la afordancia de content fallback solo aparece cuando `debouncedQuery.length >= 3 && titleMatches.length === 0 && !contentSearchActive`.
- D-11 implementado: al click se dispara `Promise.all(conversations.map(c => api.getConversation(c.id)))` y los resultados se cachean en una `Map<id, fullConversation>` que vive en estado React por toda la sesión.
- Pitfall 6 sellado: ninguna ruta de código en Sidebar.jsx invoca `onSelectConversation(null)` cuando una conversación sale del filtro; el panel central sigue mostrando la conversación activa.
- Sin nuevas dependencias: la implementación usa `useState`, `useEffect`, `useRef`, `useMemo` (ya importados o triviales de añadir) — no se trajo lodash, no se creó un custom hook.
- Backend intocado: cero modificaciones en `backend/`. El plan era explícitamente frontend-only y el endpoint `GET /api/conversations/{id}` ya existía con la validación UUID de Plan 01.

## Final Sidebar API (props)

Las props expuestas por `Sidebar` no cambiaron en este plan — todo lo nuevo es estado interno:

```jsx
<Sidebar
  conversations={conversations}                  // metadata list (preexistente)
  currentConversationId={currentConversationId}  // preexistente
  onSelectConversation={onSelectConversation}    // preexistente
  onNewConversation={onNewConversation}          // preexistente
  onDeleteConversation={onDeleteConversation}    // Plan 02
  onRenameConversation={onRenameConversation}    // Plan 03
/>
```

App.jsx no necesitó ningún cambio — el search es completamente autónomo dentro del Sidebar.

## Internal state (added by this plan)

| State | Type | Purpose |
|-------|------|---------|
| `searchQuery` | `string` | Controlled value of the `<input type="search">`. Updated on every keystroke. |
| `debouncedQuery` | `string` | Snapshot of `searchQuery` 200ms after the last keystroke. Drives the actual filter recomputation. |
| `contentSearchActive` | `boolean` | True once the user has clicked the D-10 affordance. Sticky for the session. |
| `contentCache` | `Map<id, fullConversation> \| null` | Populated by `activateContentSearch`; consulted by `filteredConversations`. |
| `isLoadingContent` | `boolean` | True while `Promise.all` of `api.getConversation` is in flight. Disables the affordance button and swaps its label. |

The previous Plan 03 state (`openMenuFor`, `pendingDelete`, `editingId`) is preserved unchanged.

## Flow diagram

```
[ user types in <input type="search"> ]
        │
        ▼
   setSearchQuery(value)
        │
        ▼
   useEffect — setTimeout 200ms (cleanup cancels pending timer on every re-keystroke)
        │
        ▼
   setDebouncedQuery(searchQuery)
        │
        ▼
   useMemo titleMatches:                                 ← always cheap (10-100 items × .toLowerCase().includes)
       conversations.filter(c => c.title.includes(q))
        │
        ▼
   if (debouncedQuery.length >= 3
       && titleMatches.length === 0
       && !contentSearchActive)
       → render <button.content-search-affordance>      ← D-10 explicit affordance
                  "Search inside content (N conversations)"
                       │
                       ▼ click
              activateContentSearch()
                       │
                       ▼
              setIsLoadingContent(true)
                       │
                       ▼
              Promise.all(conversations.map(c => api.getConversation(c.id)))
                       │
                       ▼
              new Map(fulls.map(c => [c.id, c]))
                       │
                       ▼
              setContentCache(cache); setContentSearchActive(true); setIsLoadingContent(false)
        │
        ▼
   useMemo filteredConversations:
       if (!contentSearchActive || !contentCache) → titleMatches
       else conversations.filter(c => titleMatches OR
                                       cache.get(c.id).messages
                                            .some(m => user.content || stage3.response || stage1[*].response))
        │
        ▼
   render filteredConversations.map(<ConversationItem>)   ← Plan 03 row, untouched
   render `currentConversationId` row even if absent      ← Pitfall 6 sealed (the central panel uses currentConversationId, not filteredConversations)
```

## Decisions Made

- **200ms debounce** — RESEARCH §Pattern 5 explicitly identifies this as the sweet spot for 10-100-item lists. 100ms feels frantic on slower CPUs; 300ms feels laggy when the user pauses to read the filtered result. 200ms is the published default in most React debounce hook libraries (use-debounce, useDebounce-react) for the same reason.
- **Inline `useEffect` rather than a custom `useDebounce` hook.** One consumer in the codebase. A hook would add an indirection layer (hook → state inside hook → return tuple → destructure in caller) without removing any code from `Sidebar.jsx`. CONVENTIONS allows it; future second consumer triggers the extraction at that point.
- **Two `useMemo` passes** — `titleMatches` is the source of the affordance's gating condition (`titleMatches.length === 0`), so it must be computed even when content search is active. `filteredConversations` is the rendered list. Sharing one memo would tangle the two concerns.
- **No `useDeferredValue` / `useTransition`** — for 10-100 items the filter is sub-ms; the debounce alone is sufficient to prevent jitter. RESEARCH explicitly noted these as overkill for the scale of conversation lists in this app.
- **Content cache invalidation = none.** D-11 accepted staleness explicitly. The two staleness scenarios are:
  1. **Conversation deleted while in cache** — never renders because `conversations` (metadata) is the iteration source; deleted ids are gone from it.
  2. **Conversation renamed while in cache** — body still matches old text. The display title is read from `c.title` (current metadata), not from the cache, so the user sees the new title even when their query matches old body content. Visually consistent.
  If a future plan needs invalidation, the hook is `setContentCache(prev => { const next = new Map(prev); next.delete(id); return next; })` after the relevant mutation in App.jsx.
- **Stage 2 NOT in search corpus** — the anonymised peer evaluations are noisy as a recall key. User content + Stage 1 + Stage 3 cover the meaningful semantic surface. One-line change to add if it ever matters.
- **Search query never persisted** — RESEARCH §Anti-Patterns line 588 explicitly prohibits localStorage / URL persistence of search state. Implemented as `useState`-only. Browser refresh resets the field, which matches the user's expectation of an ephemeral filter.
- **`type="search"` input element** — gives the user the native browser "clear" affordance (the small × inside the input on most platforms) without us having to render one. Free UX win.

## Pitfall 6 sealed — explicit walkthrough

The anti-pattern would have been:

```jsx
useEffect(() => {
  if (!filteredConversations.some(c => c.id === currentConversationId)) {
    onSelectConversation(null);  // ← THIS DOES NOT EXIST in Sidebar.jsx
  }
}, [filteredConversations, currentConversationId, onSelectConversation]);
```

Why it's tempting: "the conversation isn't visible, so it shouldn't be selected." Why it's wrong: in Slack / Discord / VS Code's file search, the active item stays focused even when the filter hides it — when the user clears the search, the same conversation remains open. Auto-deselect would force the user to re-find their conversation after every search.

The implementation simply doesn't perform the check. `currentConversationId` is owned by `App.jsx` and only `onSelectConversation` from Plan 02's row click can change it. The search code path never invokes that callback.

Verified at commit time: `grep -c "onSelectConversation(null)" frontend/src/components/Sidebar.jsx` → `0`.

## Threat Surface Update

No new endpoints. The existing `GET /api/conversations/{id}` is invoked N times in parallel on first activation; each call passes through the Plan 01 UUID validation. No new attack surface.

The `searchQuery` state never leaves the browser (no localStorage, no URL hash, no telemetry). React escapes the `${debouncedQuery}` interpolation in the "No matches for ..." string automatically — no XSS sink.

## Manual Smoke Checklist

The 8-step manual smoke is specified by the plan's acceptance criteria. Steps verified by code inspection (the executor did not have a live browser session in this run; verification was by static analysis of the implementation against each step). The user (or a downstream verifier) should execute steps 1-8 against the live app for full functional confirmation.

| # | Step | Verification mechanism |
|---|------|------------------------|
| 1 | Sidebar shows input search at top, list below | `<div className="sidebar-search">` rendered between `<div className="sidebar-header">` and `<div className="conversation-list">` ✓ |
| 2 | Type "test" → after ~200ms, list filters by title | `useEffect setTimeout 200` → `setDebouncedQuery` → `useMemo titleMatches` ✓ |
| 3 | Type "abcdef" rapidly → list NOT updated per keystroke | `clearTimeout` in cleanup cancels each pending snapshot ✓ |
| 4 | Title-only matches 0 + query >= 3 chars → affordance appears | `showContentFallback` formula: `debouncedQuery.length >= 3 && titleMatches.length === 0 && !contentSearchActive` ✓ |
| 5 | Click affordance → "Loading..." → "Searching titles + content" + content matches | `activateContentSearch` sets isLoadingContent → Promise.all → setContentCache + setContentSearchActive ✓ |
| 6 | Clear query → full list returns; cache reused for next query | filteredConversations branch `if (!q) return conversations` when content-mode is active ✓ |
| 7 | New query with body-only substring → matches via cache without reload | filteredConversations second branch reads from contentCache.get(c.id).messages ✓ |
| 8 | Pitfall 6: select a conversation, type non-matching query → still visible in central panel | `currentConversationId` is owned by App.jsx; no `onSelectConversation(null)` exists in Sidebar.jsx ✓ |

## Deviations from Plan

**1. [Trivial] Comment rewrite to satisfy acceptance grep**
- **Found during:** Acceptance grep verification post-edit
- **Issue:** The plan's acceptance criterion `grep -c "onSelectConversation(null)" frontend/src/components/Sidebar.jsx == 0` was triggered by a *comment* I had written that referenced the anti-pattern by quoting its exact form. The runtime code has zero such call.
- **Fix:** Rephrased the comment so it documents the anti-pattern in prose ("there is no auto-deselect call anywhere in the search code path") rather than quoting the literal substring.
- **Files modified:** `frontend/src/components/Sidebar.jsx` (comment-only change)
- **Why this is not a substantive deviation:** No behavior change, no new code, no decision shift. The comment still documents the same Pitfall 6 seal — it just no longer happens to contain the literal grep pattern that the acceptance check used as a proxy for "no auto-deselect call exists."

No other deviations. Auto-fix attempts: 1 of 3 budget. Rules 1-3 not triggered (no bugs, no missing critical functionality, no blocking issues).

## Issues Encountered

None this plan. The Plan 03 ConversationItem extraction made the search wiring purely additive — no need to refactor the row, no risk of regressing rename / delete logic.

## Acceptance grep — full results

```
useMemo                            : 3   (>= 1 ✓; titleMatches + filteredConversations + import)
import { api }                     : 1   (== 1 ✓)
searchQuery                        : 7   (>= 3 ✓)
debouncedQuery                     : 11  (>= 3 ✓)
setTimeout                         : 1   (>= 1 ✓)
clearTimeout                       : 1   (>= 1 ✓)
"200" (literal)                    : 4   (>= 1 ✓; debounce delay + maxLength + line numbers in comments)
">= 3"                             : 2   (>= 1 ✓; the D-10 gate + summary comment)
Promise.all                        : 2   (>= 1 ✓; one in code, one in comment)
new Map                            : 1   (>= 1 ✓)
stage3                             : 3   (>= 1 ✓)
stage1                             : 3   (>= 1 ✓)
onSelectConversation(null)         : 0   (== 0 ✓)
type="search"                      : 1   (== 1 ✓)
search-input (jsx)                 : 1   (>= 1 ✓)
content-search-affordance (jsx)    : 1   (>= 1 ✓)
"Search inside content"            : 1   (== 1 ✓)
search-input (css)                 : 2   (>= 1 ✓; selector + :focus)
content-search-affordance (css)    : 3   (>= 1 ✓; selector + :hover + :disabled)
```

Build: `cd frontend && npm run build` exit 0 (508 modules transformed; preexisting >500kB chunk warning unchanged).
ESLint: `Sidebar.jsx --max-warnings 0` exit 0.

## Task Commits

1. **Task 4.1: Search input + debounce + filtro título + content fallback con cache** — `f0736a9` (feat)

The plan-metadata commit (this SUMMARY + STATE.md / ROADMAP.md / REQUIREMENTS.md updates) follows below.

## Files Created/Modified

### Modified

- `frontend/src/components/Sidebar.jsx` — added `useMemo` to React import, added `import { api } from '../api'`, introduced 5 new state hooks (`searchQuery`, `debouncedQuery`, `contentSearchActive`, `contentCache`, `isLoadingContent`), the 200ms debounce `useEffect`, two `useMemo` filters (`titleMatches` and `filteredConversations`), the `activateContentSearch` async handler, the `<div className="sidebar-search">` block (input + conditional affordance + active-mode note), and switched the conversation-list render from `conversations.map` to a tri-branch `if (no convos) elif (no matches) else (filteredConversations.map)`.
- `frontend/src/components/Sidebar.css` — appended four selectors: `.sidebar-search` (container layout), `.search-input` (with `:focus` variant), `.content-search-affordance` (with `:hover:not(:disabled)` and `:disabled` variants), `.content-search-active-note`.

## Self-Check

Verified before declaring complete:

- `frontend/src/components/Sidebar.jsx`: FOUND, edits applied (197 insertions per `git diff --stat`).
- `frontend/src/components/Sidebar.css`: FOUND, edits applied.
- `.planning/phases/01-hardening-conversation-management/01-04-SUMMARY.md`: FOUND (this file, written via Write tool).
- Commit `f0736a9` exists in `git log`: ✓ (verified via `git log --oneline | grep f0736a9`).
- All 19 acceptance grep counts match expectations (table above).
- ESLint clean on Sidebar.jsx.
- `npm run build` exit 0.
- No backend file modified (`git status --short` post-commit shows only `.planning/` files pending for the metadata commit).

## Self-Check: PASSED

## Phase 01 Closure Note

This is the last plan of Phase 1. With Plans 01-04 all shipped:

- ROADMAP §Phase 1 success criterion 1 (UUID validation) — Plan 01 ✓
- ROADMAP §Phase 1 success criterion 2 (delete with confirmation) — Plan 02 ✓
- ROADMAP §Phase 1 success criterion 3 (inline rename persists across reloads) — Plan 03 ✓
- ROADMAP §Phase 1 success criterion 4 (sidebar search filters case-insensitively as user types) — Plan 04 ✓ (this plan)

Recommend the user runs `/gsd-verify-phase 1` (if available) or performs the 8-step manual smoke from the Plan 04 acceptance criteria against a live frontend before marking the phase complete and proceeding to Phase 2 (UX Research & Design Brief).

---
*Phase: 01-hardening-conversation-management*
*Plan: 04*
*Completed: 2026-05-09*
