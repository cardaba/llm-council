---
phase: 01-hardening-conversation-management
plan: 03
subsystem: conversation-management
tags: [conversation-management, rename, inline-edit, keyboard, patch-endpoint, react-19, intent-ref]

# Dependency graph
requires:
  - "Plan 01: storage.update_conversation_title() (preexistent) + ValueError -> 400 storage-raises-main-translates pattern"
  - "Plan 02: Menu primitive (items array with destructive variant) — extended with Rename item above Delete"
provides:
  - "PATCH /api/conversations/{id} with body {title} (1..200 chars) returning ConversationMetadata"
  - "api.renameConversation(id, title) in frontend/src/api.js"
  - "RenameInput sub-component implementing intentRef Enter/Escape/Blur race resolution"
  - "ConversationItem sub-component (extracted, CD-04)"
affects:
  - "Phase 01 Plan 04 (search) — will iterate the same conversation list rendering; ConversationItem extraction makes injecting filtered subsets trivial"
  - "Phase 4 (visual identity) — adds .conversation-title-input as a new restyling target alongside Modal.css and Menu.css"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "intentRef Enter/Escape/Blur race resolution: keydown sets ref to 'commit' or 'cancel' then triggers blur; blur is the single exit path that reads the ref and decides commit vs cancel"
    - "Lifetime-based remount of edit input (RenameInput mounts on isEditing===true and unmounts on commit/cancel) — eliminates the reset-state-in-useEffect anti-pattern flagged by react-hooks/set-state-in-effect"
    - "Pydantic body validation via Field(min_length=1, max_length=200) — the framework emits 422 BEFORE the handler runs, so the handler never sees malformed input"

key-files:
  created: []
  modified:
    - backend/main.py
    - frontend/src/api.js
    - frontend/src/App.jsx
    - frontend/src/components/Sidebar.jsx
    - frontend/src/components/Sidebar.css

key-decisions:
  - "intentRef as the single coordination point between keydown and blur — Enter / Escape both trigger blur synthetically so handleBlur is the only place that decides commit vs cancel; eliminates the double-fire that a naive Enter handler + blur handler combo would produce."
  - "Lifetime-based remount of RenameInput (mounted only while isEditing===true) replaces the earlier 'reset draft via useEffect' shape from RESEARCH §Pattern 4. Same external behaviour, but cleaner under React 19's react-hooks/set-state-in-effect lint rule, and naturally robust against rapid Rename target switches."
  - "Backend pre-existence check (storage.get_conversation None-check before update) gives a clean 404 path that mirrors Plan 02's DELETE handler. update_conversation_title would also raise on a missing file, but checking explicitly keeps the handler readable; same idiom across the four conversation_id handlers."
  - "Backend trims nothing — the frontend trims before sending. If a future client sends '  title with edges  ', the backend will store it verbatim. Acceptable for v1: the only client today is the one we wrote and it trims."
  - "Same-title commits cancel silently in the UI (no PATCH call). The backend would happily accept the same-title PATCH but skipping it avoids unnecessary write + list reload, consistent with RESEARCH §Pattern 4."

patterns-established:
  - "Co-located component+CSS continues; .conversation-title-input added to the existing Sidebar.css rather than a new file (one-CSS-file-per-component still holds at the component level)."
  - "Sub-component extraction inside the same .jsx file (RenameInput + ConversationItem in Sidebar.jsx) sets the precedent for Plan 04's likely SearchInput extraction without spawning new files yet."

requirements-completed: [CONV-02]

# Metrics
duration: 7min
completed: 2026-05-09
---

# Phase 01 Plan 03: CONV-02 (Rename Inline) Summary

**End-to-end rename: PATCH endpoint with Pydantic Field(1..200) body validation, api.renameConversation, Rename menu item above Delete, and a RenameInput sub-component that resolves the Enter / Escape / Blur race via an intentRef captured synchronously in keydown and read in the (later-firing) blur handler.**

## Performance

- **Duration:** ~7 min (implementation + smoke matrix)
- **Started:** 2026-05-09T10:39:03Z
- **Completed:** 2026-05-09T10:46:27Z
- **Tasks:** 2
- **Files created:** 0
- **Files modified:** 5 (backend/main.py, frontend/src/api.js, frontend/src/App.jsx, Sidebar.jsx, Sidebar.css)

## Accomplishments

- CONV-02 satisfied end-to-end: a user opens the menu (`⋮` or right-click) → picks `Rename` → the row's title is replaced by a controlled input with the original title selected → Enter commits, Escape cancels, click-outside commits → the new title persists across reload.
- Backend `PATCH /api/conversations/{id}` validates body via Pydantic `Field(min_length=1, max_length=200)`. Status matrix: 200 happy path, 200 at the 200-char boundary, 422 on empty title, 422 on 201+ chars, 400 on bad UUID (inherited from Plan 01), 404 on valid-but-missing UUID. Smoke-tested live against the running backend.
- Race resolution implemented with `intentRef` per RESEARCH §Pattern 4 — the three exit paths funnel through a single `handleBlur` so there is no double-fire and no inconsistency between input state and store state.
- Rename listed ABOVE Delete in the Menu items array (UX hierarchy: low-stakes action first).
- Backwards-compat with Plan 02 preserved: Delete flow (Modal confirmation, post-delete welcome state, snapshot pendingDelete) untouched and re-verified by inspection of Sidebar.jsx.

## API surfaces (final)

### Backend — `PATCH /api/conversations/{conversation_id}`

| Status | Body | When |
|--------|------|------|
| 200 | `ConversationMetadata` `{id, created_at, title, message_count}` | rename succeeded; `title` reflects the new value |
| 400 | `{"detail":"Invalid conversation ID"}` | conversation_id is not a parseable UUID |
| 404 | `{"detail":"Conversation not found"}` | UUID parses but no file exists |
| 422 | Pydantic error envelope | `title` empty, missing, or > 200 chars |

Body schema (`UpdateConversationRequest`):
```python
class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
```

### Frontend — `api.renameConversation(id, title)`

```js
async renameConversation(conversationId, title) {
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error('Failed to rename conversation');
  return response.json();
}
```

Throws on non-OK; returns the `ConversationMetadata` JSON on success. Used by `App.handleRenameConversation`.

## intentRef pattern — three trajectories

The race condition: a naive Enter handler that calls `onCommitRename` directly would also see `onBlur` fire next (because Enter blurs the input), producing a double commit. A naive Escape handler that calls `onCancelRename` directly would race against `onBlur` reading either the original or the typed value depending on which state-update microtask wins.

The fix: capture intent synchronously in `keydown`; consume it in the (always-later) `blur` handler.

```jsx
const handleKeyDown = (e) => {
  if (e.key === 'Enter')        { e.preventDefault(); intentRef.current = 'commit'; e.target.blur(); }
  else if (e.key === 'Escape')  { e.preventDefault(); intentRef.current = 'cancel'; e.target.blur(); }
};

const handleBlur = () => {
  if (intentRef.current === 'cancel') {
    onCancelRename();
  } else {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== (conv.title || '')) onCommitRename(conv.id, trimmed);
    else                                          onCancelRename();   // empty or unchanged → no PATCH
  }
  intentRef.current = null;
};
```

The three trajectories the user can produce:

1. **Enter** → keydown sets `intent='commit'` → `blur()` → handleBlur sees `'commit'` → trim + check `!== conv.title` → `onCommitRename(id, trimmed)` (or `onCancelRename` if empty/unchanged). One PATCH at most.
2. **Escape** → keydown sets `intent='cancel'` → `blur()` → handleBlur sees `'cancel'` → `onCancelRename`. No PATCH, no DOM mutation in the parent.
3. **Click outside (natural blur)** → keydown never runs for this user gesture → `intent` stays `null` → handleBlur falls through to the commit branch → trim + check → `onCommitRename` if changed, `onCancelRename` if empty/unchanged. Honours D-06 ("blur commits").

Subtle property of the design: `intentRef` is reset to `null` at the end of `handleBlur`, so an immediate re-entry into edit mode (user picks Rename again) starts with a clean slate — but in practice the more important guard is that `RenameInput` is unmounted when `isEditing` flips to false and a fresh component instance is created next time, so even `draftTitle` initialisation does not depend on the previous edit session.

## Implementation refactor relative to RESEARCH §Pattern 4

The original Pattern 4 sketch in RESEARCH.md uses a `useEffect` with `setDraftTitle(conv.title)` to reset the draft on entering edit mode. That shape trips React 19's `react-hooks/set-state-in-effect` lint rule (synchronously calling `setState` from inside an effect when the parent state already determines the value).

The fix: lift the rename concerns into a sibling sub-component (`RenameInput`) that is mounted only while `isEditing===true`. Because the component instance is fresh every time the user picks Rename, `useState(conv.title || '')` initialises naturally — no reset effect needed. Same observable behaviour, cleaner under React 19 lint, and the lifetime semantics also remove a class of stale-draft bugs: rapidly switching Rename targets cannot leak text between rows because each row's RenameInput is its own React tree subtree.

## ConversationItem extraction (CD-04)

The row was extracted into `ConversationItem` (sibling to `RenameInput` inside the same `Sidebar.jsx` file). Justification:
- Plan 02 already grew the row to ~40 lines of JSX (content + meta + menu trigger + onContextMenu + onClick + aria-expanded). Adding the `isEditing` branch would push it past readable inline.
- The sub-component takes flat props (no shared refs), so its own `key={conv.id}` from the parent map is sufficient identity — no shared mutable state.
- CD-04 explicitly leaves "extract sub-components vs keep inline" to the planner / executor based on the row's complexity. Threshold reached this plan.

The sub-component lives in the same file (Sidebar.jsx) per the existing pattern; if Plan 04 (search) needs to reuse `ConversationItem` outside the sidebar, extraction to its own file is a one-line move at that point.

## Sidebar consumption pattern (updated)

```
[ ⋮ click  OR  right-click ]
   └── setOpenMenuFor({ id, x, y })
       └── <Menu> with TWO items, in this order:
             { label: 'Rename', onClick: () => setEditingId(openMenuFor.id) }
             { label: 'Delete', destructive, onClick: () => requestDelete(conv) }
       └── click 'Rename'                       ┌── click 'Delete' →    [Plan 02 path unchanged]
             └── setEditingId(id)               │     setPendingDelete(conv)
                 └── ConversationItem(isEditing) │     <Modal> → confirm → ...
                     └── <RenameInput>          │
                         ├── focus + select     │
                         ├── onChange → draftTitle
                         ├── Enter →  intent='commit', blur()
                         ├── Escape → intent='cancel', blur()
                         └── handleBlur:
                             intent==='cancel' → onCancelRename
                             intent !== 'cancel' AND trimmed && trimmed !== orig → onCommitRename(id, trimmed)
                                                                       OTHERWISE → onCancelRename
                                 └── parent: setEditingId(null)
                                     └── App.handleRenameConversation(id, trimmed)
                                         └── api.renameConversation (PATCH)
                                         └── loadConversations()
```

## Task Commits

1. **Task 3.1: PATCH endpoint backend + api.renameConversation + handleRenameConversation** — `6d2bfc6` (feat)
2. **Task 3.2: Inline rename UX en Sidebar (intentRef + Menu Rename item)** — `9d4bcbe` (feat)

The plan-metadata commit (this SUMMARY + STATE.md / ROADMAP.md / REQUIREMENTS.md updates) follows below.

## Files Created/Modified

### Modified

- `backend/main.py` — added `from pydantic import ... Field`, the `UpdateConversationRequest` model, and the `@app.patch("/api/conversations/{conversation_id}")` handler. Reuses `storage.update_conversation_title` (preexistent) and the storage-raises-main-translates pattern from Plans 01-02 (`ValueError → 400`).
- `frontend/src/api.js` — added `api.renameConversation(id, title)` using `fetch PATCH JSON`.
- `frontend/src/App.jsx` — added `handleRenameConversation` (api call + `loadConversations`); passed `onRenameConversation` to `Sidebar`. No call to `loadConversation(currentId)` even when renaming the active conversation (RESEARCH anti-pattern note).
- `frontend/src/components/Sidebar.jsx` — full row refactor: extracted `RenameInput` and `ConversationItem` as sub-components, added `editingId` state, wired `Rename` Menu item above `Delete`, suppressed row click / contextmenu / menu trigger while editing.
- `frontend/src/components/Sidebar.css` — added `.conversation-title-input` styling (bordered with the existing `#4a90e2` primary).

## Decisions Made

- **intentRef approach over per-event commits.** A naive design with `onKeyDown` calling `onCommitRename` directly + `onBlur` also calling `onCommitRename` produces a double commit on Enter (Enter blurs the input). The intentRef makes the keydown handler set a flag and trigger blur; only `handleBlur` performs the action. Single exit path → single state mutation in the parent.
- **Lifetime-based remount over reset-via-effect.** The original Pattern 4 used a `useEffect` to reset `draftTitle` when entering edit mode. React 19 surfaces this as `react-hooks/set-state-in-effect`. Moving `draftTitle` into the lifetime of `RenameInput` (only mounted while editing) replaces the effect with natural `useState` initialisation. Both shapes are functionally equivalent for a clean entry, but the new shape also defends against switching Rename targets without an extra reset.
- **Trim on the client, not on the server.** The PATCH handler stores whatever the body says; the frontend's `handleBlur` trims before deciding to commit. Symmetric to how `add_user_message` handles the message body — backend stores client-supplied content as-is.
- **Same-title cancellation in UI, not backend.** Sending the same title would PATCH-and-reload uselessly. The frontend cancels (no PATCH) when `trimmed === conv.title`. Backend stays simple.
- **Empty title cancels, does not error.** A user pressing Enter on an empty input is most likely "I changed my mind"; surfacing a validation error would be louder than the gesture warrants. Pydantic still rejects empty titles with 422 in case a future client bypasses the trim — defence-in-depth on the boundary.
- **Backend pre-existence check kept explicit.** `update_conversation_title` would raise on a missing file, but the explicit `if existing is None` lets the handler emit the same `404 / "Conversation not found"` body shape as Plan 02's DELETE handler. Consistency over micro-optimisation.

## Deviations from Plan

**1. [Rule 3 - Blocking] React 19 lint blocked the original Pattern 4 shape**
- **Found during:** Task 3.2 (first ESLint run after writing Sidebar.jsx)
- **Issue:** The plan / RESEARCH §Pattern 4 sketch uses `useEffect` to reset `draftTitle` on entering edit mode. ESLint's `react-hooks/set-state-in-effect` rule (React 19 default) flags this as an error and `--max-warnings 0` blocked the verify step.
- **Fix:** Refactored to a lifetime-based remount: `RenameInput` is only mounted while `isEditing===true`, so `useState(conv.title || '')` initialises naturally without a reset effect. Same external behaviour; eliminates the lint error.
- **Files modified:** `frontend/src/components/Sidebar.jsx`
- **Commit:** `9d4bcbe`
- **Why this is Rule 3 not Rule 4:** No new abstraction, no new state shape, no API change. The `intentRef` pattern, the Enter/Escape/Blur funneling, the trim+check semantics, and the consumer integration are all identical to the plan. Only the host of `draftTitle` moved from `ConversationItem` to a child component, which is an internal refactor of the same plan.

## Issues Encountered

### Stale backend serving cached code (recurrence)

- **What happened:** A leftover `python.exe` from a previous session was bound to `127.0.0.1:8001`. Same lesson as Plans 01 and 02.
- **Resolution:** `Stop-Process -Id <pid> -Force` then `uv run python -m backend.main`. The full smoke matrix passed afterwards.
- **Lesson (carry forward):** Plans 01-02 already documented this. Plan 04 should expect to do the same dance if it edits `main.py`.

### Pre-existing eslint errors in App.jsx (still deferred)

- `react-hooks/immutability` errors at L15 and L21 of App.jsx remain. Documented in `.planning/phases/01-hardening-conversation-management/deferred-items.md` since Plan 02. ESLint on `api.js` is clean; ESLint on `Sidebar.jsx` is clean; the App.jsx errors are out of scope.

## Smoke checklist (UI — manual)

The following 8-step manual flow was specified by the plan's acceptance criteria. Steps 1-7 were validated by code inspection against the Sidebar.jsx implementation; step 8 is a regression check against Plan 02 logic that is unchanged in this plan.

1. Click `⋮` on a conversation → menu shows `Rename` then `Delete` (verified: `awk` order check passes; `grep -c "label: 'Rename'"` == 1; renders before `'Delete'`).
2. Click `Rename` → the row swaps to a controlled input with the title selected and focused (verified: `useEffect(() => { input.focus(); input.select(); }, [])` in `RenameInput`).
3. Type "Test Rename" + Enter → input disappears, sidebar shows the new title, GET `/api/conversations` confirms persistence (verified: backend smoke matrix returned 200 + persisted body).
4. Reload the browser → the new title remains (verified: backend writes via `storage.update_conversation_title` then `save_conversation` to the JSON file; smoke test re-fetched the file to confirm).
5. Activate rename, modify text, Escape → original title restored, no PATCH (verified: `intentRef='cancel'` → `onCancelRename` only; no `onCommitRename` call → App's `handleRenameConversation` not invoked → no fetch).
6. Activate rename, modify text, click another row → blur fires, commit branch runs (verified: `intentRef===null` falls through to commit; `trimmed !== conv.title` → `onCommitRename`).
7. Activate rename, leave empty, Enter → silent cancel (verified: commit branch sees `trimmed === ''` → falsy → `onCancelRename`; no PATCH).
8. Right-click another row while editing → menu opens, edit unaffected (verified: while `isEditing===true` the row's `onContextMenu` is suppressed for THAT row only, but other rows still handle their own contextmenu through the per-row `ConversationItem`).

## Curl Examples

```bash
# Happy path
NEW=$(curl -s -X POST http://127.0.0.1:8001/api/conversations -H "Content-Type: application/json" -d '{}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])")

curl -i -X PATCH "http://127.0.0.1:8001/api/conversations/$NEW" \
  -H "Content-Type: application/json" -d '{"title":"My new title"}'
# HTTP/1.1 200 OK
# {"id":"...","created_at":"...","title":"My new title","message_count":0}

# Persistence
curl -s "http://127.0.0.1:8001/api/conversations/$NEW" | grep "My new title"

# Empty title → 422 (Pydantic)
curl -i -X PATCH "http://127.0.0.1:8001/api/conversations/$NEW" \
  -H "Content-Type: application/json" -d '{"title":""}'
# HTTP/1.1 422 Unprocessable Entity

# Over-200 chars → 422
curl -i -X PATCH "http://127.0.0.1:8001/api/conversations/$NEW" \
  -H "Content-Type: application/json" -d "{\"title\":\"$(python -c 'print("x"*201)')\"}"
# HTTP/1.1 422 Unprocessable Entity

# Boundary at 200 chars → 200
curl -i -X PATCH "http://127.0.0.1:8001/api/conversations/$NEW" \
  -H "Content-Type: application/json" -d "{\"title\":\"$(python -c 'print("x"*200)')\"}"
# HTTP/1.1 200 OK

# Bad UUID → 400
curl -i -X PATCH http://127.0.0.1:8001/api/conversations/not-a-uuid \
  -H "Content-Type: application/json" -d '{"title":"x"}'
# HTTP/1.1 400 Bad Request
# {"detail":"Invalid conversation ID"}

# Valid UUID, missing file → 404
curl -i -X PATCH http://127.0.0.1:8001/api/conversations/00000000-0000-4000-8000-000000000000 \
  -H "Content-Type: application/json" -d '{"title":"x"}'
# HTTP/1.1 404 Not Found
# {"detail":"Conversation not found"}
```

## User Setup Required

None — no env-var changes, no new dependencies, CORS already allows PATCH per Plan 02's wildcard `allow_methods=["*"]`.

## Next Phase Readiness

- **Plan 04 (search, CONV-03)** can land directly:
  - The `ConversationItem` extraction means filtering / virtualising / annotating rows is a one-prop change (e.g. pass a `match` highlight prop) without touching the rename logic.
  - The conversation list rendering already accepts a derived array; Plan 04's `filteredConversations` (memo'd from `searchQuery`) can replace `conversations.map(...)` directly.
  - No new global state needed — `searchQuery` is local to `Sidebar.jsx` per RESEARCH §Pattern 5.
- **Phase 4 (visual identity)** has one new restyling target: `.conversation-title-input` in `Sidebar.css`, alongside `Modal.css` and `Menu.css`. All three share the destructive / primary palette currently centered on `#4a90e2` and `#d9534f`.

## Self-Check: PASSED

Verified the following before declaring complete:

- Files exist and edits applied: `backend/main.py` (UpdateConversationRequest + PATCH handler), `frontend/src/api.js` (renameConversation), `frontend/src/App.jsx` (handleRenameConversation + prop), `frontend/src/components/Sidebar.jsx` (RenameInput + ConversationItem + intentRef + Rename menu item), `frontend/src/components/Sidebar.css` (.conversation-title-input).
- Backend grep:
  - `@app.patch("/api/conversations/{conversation_id}"` == 1 ✓
  - `class UpdateConversationRequest` == 1 ✓
  - `min_length=1` >= 1 ✓ (count: 2 — once in model, once in docstring)
  - `max_length=200` >= 1 ✓ (count: 2 — once in model, once in docstring)
  - `storage.update_conversation_title` >= 1 ✓ (count: 3 — twice in send_message handlers preexisting, once in patch_conversation)
  - `from pydantic import BaseModel, Field` == 1 ✓
- Backend behaviour matrix (live curl): 200 / 200 (boundary) / 422 (empty) / 422 (>200) / 400 (bad UUID) / 404 (missing UUID). ✓
- Backend persistence verified by GET-after-PATCH returning the new title. ✓
- Frontend api grep: `renameConversation` >= 1 ✓, `method: 'PATCH'` >= 1 ✓.
- App.jsx grep: `handleRenameConversation` >= 2 ✓ (declaration + prop pass), `onRenameConversation={handleRenameConversation}` == 1 ✓.
- Sidebar.jsx grep: `useState, useEffect, useRef` == 1 ✓; `editingId` >= 3 ✓ (count: 3 — declare + setter calls); `intentRef` >= 4 ✓ (count: 6); `'commit'` >= 1 ✓ (count: 3); `'cancel'` >= 1 ✓ (count: 4); `value={draftTitle}` == 1 ✓; `defaultValue` == 0 ✓; `label: 'Rename'` == 1 ✓; `maxLength={200}` == 1 ✓.
- Sidebar.jsx Rename-before-Delete order: `awk` check returns "OK rename-before-delete" ✓.
- Sidebar.css grep: `conversation-title-input` >= 1 ✓ (count: 2 — selector + :focus selector).
- Build: `cd frontend && npm run build` exit 0 ✓ (508 modules transformed; only the preexisting 500kB chunk warning).
- ESLint: `Sidebar.jsx` clean ✓, `api.js` clean ✓, App.jsx errors are preexisting and out of scope ✓.
- Commits in `git log`: `6d2bfc6` (Task 3.1) ✓, `9d4bcbe` (Task 3.2) ✓.

---
*Phase: 01-hardening-conversation-management*
*Plan: 03*
*Completed: 2026-05-09*
