---
phase: 01-hardening-conversation-management
plan: 02
subsystem: conversation-management
tags: [conversation-management, delete, modal, menu, react-19, a11y, fastapi]

# Dependency graph
requires:
  - "Plan 01: storage.delete_conversation() helper (consumed by the new DELETE endpoint)"
  - "Plan 01: storage-raises-main-translates pattern (ValueError → 400) replicated for the new handler"
provides:
  - "Reusable Modal primitive (frontend/src/components/Modal.jsx) — focus trap, ESC, click-outside backdrop, focus restoration"
  - "Reusable Menu primitive (frontend/src/components/Menu.jsx) — popover with viewport clamp, role=menu/menuitem, ESC, click-outside via document mousedown"
  - "DELETE /api/conversations/{conversation_id} returning 204 / 400 / 404"
  - "api.deleteConversation(id) in frontend/src/api.js"
  - "Sidebar three-dot trigger + right-click → Menu → Modal confirmation flow"
  - "App.handleDeleteConversation with safe state-reset-before-await sequence (D-12 + RESEARCH §Pitfall 7)"
affects:
  - "Phase 01 Plan 03 (rename) — will reuse Modal? Optional. Will reuse Menu definitively (add `Rename` item alongside `Delete`)."
  - "Phase 04 (visual identity) — must restyle Modal.css and Menu.css when the bespoke palette lands"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable confirmation Modal via createPortal + manual focus trap (no react-aria, no headlessui, no Radix — kept dependency-free per stack constraints)"
    - "Hover/focus-within/aria-expanded pattern for revealing per-row menu trigger (CSS visibility, not display, to avoid layout shift on hover)"
    - "Document-level mousedown listener for popover click-outside (closes BEFORE other onClick handlers fire)"
    - "Safe optimistic UI sequence: setLocalState(null) → await network → loadConversations() — never await before resetting state that the UI will read on the next render"

key-files:
  created:
    - frontend/src/components/Modal.jsx
    - frontend/src/components/Modal.css
    - frontend/src/components/Menu.jsx
    - frontend/src/components/Menu.css
    - .planning/phases/01-hardening-conversation-management/deferred-items.md
  modified:
    - backend/main.py
    - frontend/src/api.js
    - frontend/src/App.jsx
    - frontend/src/components/Sidebar.jsx
    - frontend/src/components/Sidebar.css

key-decisions:
  - "Modal API is opinionated (title/body/confirmLabel/cancelLabel/destructive) instead of fully generic with `children`; the only consumer in v1 is a confirmation dialog and the rename plan can either reuse this API or extend with a `children` prop later — no breaking-change risk."
  - "Focus trap implemented manually with a single keydown listener (no library); RESEARCH §Pattern 2 lists this as the State of the Art for v1 because it avoids adding `react-focus-lock` or similar to the dependency graph."
  - "Menu uses `position: fixed` + viewport clamping rather than CSS-anchor or popper.js; the app already uses `position: fixed` patterns elsewhere and the sidebar is on the left edge so the popover never needs flipping."
  - "Menu does not implement arrow-key item navigation in v1 (RESEARCH §Pattern 3 marks it optional). Click + ESC + role attributes cover D-04 / D-07; arrow-key nav can land in Phase 4 polish."
  - "DELETE handler does not pre-check existence; idiomatic try-os.remove-except-FileNotFoundError matches the storage-raises-main-translates convention from Plan 01 and avoids TOCTOU."
  - "Sidebar snapshots the pendingDelete conversation object (full object, not just id) so the Modal title remains stable if `conversations` updates while the dialog is open."

patterns-established:
  - "Co-located component+CSS pattern continues (Modal.jsx+Modal.css, Menu.jsx+Menu.css)."
  - "Destructive variant uses #d9534f (Bootstrap danger) consistently in both Modal button and Menu item — Phase 4 can rebrand both surfaces in one place."

requirements-completed: [CONV-01]

# Metrics
duration: 9min
completed: 2026-05-09
---

# Phase 01 Plan 02: CONV-01 (Delete with Confirmation) Summary

**End-to-end delete flow: reusable Modal + Menu primitives, DELETE endpoint returning 204/400/404, Sidebar three-dot trigger with right-click parity, post-delete welcome-state restoration via state-reset-before-await sequence.**

## Performance

- **Duration:** ~9 min (implementation + smoke test)
- **Started:** 2026-05-09T10:23:56Z
- **Completed:** 2026-05-09T10:32:52Z
- **Tasks:** 3
- **Files created:** 5 (Modal.jsx/.css, Menu.jsx/.css, deferred-items.md)
- **Files modified:** 5 (backend/main.py, frontend/src/api.js, App.jsx, Sidebar.jsx, Sidebar.css)

## Accomplishments

- CONV-01 satisfied end-to-end: a user can hover a sidebar row → click `⋮` → click `Delete` → confirm in a modal → the JSON file is removed from `data/conversations/` and the sidebar updates. If the deleted conversation was the active one, the chat pane returns to the existing welcome state.
- Right-click parity: right-click on a row opens the same menu at the cursor position; the native browser menu is suppressed via `e.preventDefault()` (RESEARCH §Pitfall 5).
- A11y of the Modal: role=dialog + aria-modal, manual focus trap cycling Tab between Cancel and Delete, ESC closes, backdrop click closes only when `target===currentTarget` (RESEARCH §Pitfall 4 — text-selection drag does not close), focus restored to the previously-focused element on unmount.
- A11y of the Menu: role=menu / role=menuitem, ESC closes, document-level mousedown closes on click-outside (so a click on another row closes the menu before that row's onClick fires).
- Backend hardened: DELETE endpoint inherits Plan 01's UUID validation. `400` on bad UUID, `204` on success, `404` on already-deleted. Smoke-tested live against running backend.

## API surfaces (final)

### Modal — `frontend/src/components/Modal.jsx`

```jsx
<Modal
  isOpen={boolean}
  onClose={() => void}            // ESC, backdrop click, Cancel button
  onConfirm={() => void}          // Confirm button
  title={string}
  body={ReactNode}
  confirmLabel="Confirm"          // default
  cancelLabel="Cancel"            // default
  destructive={false}             // when true, confirm button uses #d9534f
/>
```

Renders nothing when `isOpen` is false. When open, `createPortal` mounts to `document.body`.

### Menu — `frontend/src/components/Menu.jsx`

```jsx
<Menu
  x={number}                      // viewport-fixed left in px
  y={number}                      // viewport-fixed top in px
  items={[
    { label: string, onClick: () => void, destructive?: boolean }
  ]}
  onClose={() => void}            // ESC, click outside, item selected
/>
```

Popover is clamped to the viewport (`min(x, innerWidth - 180)` and `min(y, innerHeight - itemsHeight)`).

### Backend — `DELETE /api/conversations/{conversation_id}`

| Status | Body | When |
|--------|------|------|
| 204 | (none) | conversation deleted from `data/conversations/` |
| 400 | `{"detail":"Invalid conversation ID"}` | conversation_id is not a parseable UUID |
| 404 | `{"detail":"Conversation not found"}` | conversation_id is a valid UUID but no file exists |

### Frontend — `api.deleteConversation(id)`

Throws `Error('Failed to delete conversation')` on non-OK, non-204 responses; returns `undefined` on success.

## Sidebar consumption pattern

```
[ ⋮ click ]
   └── setOpenMenuFor({ id, x: rect.right, y: rect.bottom + 4 })
       └── <Menu> rendered with one item: { label: 'Delete', destructive: true, onClick: requestDelete(conv) }
           └── click 'Delete' → onClose() + requestDelete(conv)
               └── setPendingDelete(conv)
                   └── <Modal isOpen=true title="Delete conversation" body=... destructive>
                       └── click 'Delete' → confirmDelete()
                           └── setPendingDelete(null)              [close modal first]
                           └── await onDeleteConversation(id)      [props.handleDeleteConversation in App]
                               └── if (id === currentConversationId) {
                                     setCurrentConversationId(null)   [BEFORE await — D-12, §Pitfall 7]
                                     setCurrentConversation(null)
                                   }
                                   await api.deleteConversation(id)
                                   await loadConversations()
```

Right-click takes the same path but skips the trigger step: `onContextMenu` calls `setOpenMenuFor({ id, x: e.clientX, y: e.clientY })` directly.

## Task Commits

1. **Task 2.1: Modal component** — `e26a52d` + `7139b03` (the .jsx file was auto-committed by a pre-commit hook with the title "Baseline browser mapping" before my own commit, which then added Modal.css plus the small `onMouseDown` comment edit; both commits together constitute Task 2.1).
2. **Task 2.2: DELETE endpoint + api.deleteConversation + Menu component** — `5b41fb3` (feat).
3. **Task 2.3: Sidebar wiring + handleDeleteConversation** — `24b072c` (feat).

The plan-metadata commit (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates) follows below.

## Files Created/Modified

### Created
- `frontend/src/components/Modal.jsx` — opinionated confirmation dialog with focus trap, ESC, backdrop click guard, focus restore.
- `frontend/src/components/Modal.css` — Bootstrap-flavored palette; `#4a90e2` primary, `#d9534f` destructive.
- `frontend/src/components/Menu.jsx` — popover with viewport clamp, role=menu, ESC, document mousedown click-outside.
- `frontend/src/components/Menu.css` — Bootstrap-flavored palette matching Modal's destructive color.
- `.planning/phases/01-hardening-conversation-management/deferred-items.md` — pre-existing eslint errors documented.

### Modified
- `backend/main.py` — added `@app.delete("/api/conversations/{conversation_id}", status_code=204)` mapping `ValueError → 400`, `FileNotFoundError → 404`, reusing `storage.delete_conversation()` from Plan 01.
- `frontend/src/api.js` — added `api.deleteConversation(id)` using `fetch DELETE`; tolerant of both `response.ok` and `response.status === 204`.
- `frontend/src/App.jsx` — added `handleDeleteConversation`; passes `onDeleteConversation` prop to Sidebar.
- `frontend/src/components/Sidebar.jsx` — full refactor of the row layout (flex, content + trigger), three-dot trigger, right-click handler, Menu integration, Modal confirmation, snapshot pattern for pendingDelete.
- `frontend/src/components/Sidebar.css` — added flex layout for `.conversation-item`, `.conversation-content` wrapper, and the `.menu-trigger` reveal-on-hover/focus-within/aria-expanded pattern.

## Decisions Made

- **Opinionated Modal API over generic shell** — the v1 use case is confirmation; a fully-generic Modal would expose a `children` prop and ship a separate `<ConfirmDialog>` wrapper. With one consumer in v1 and a known second consumer in Plan 03 (rename, may either reuse this confirmation API or extend), the simpler API ships now and can grow a `children` escape hatch later without breaking existing call sites.
- **Manual focus trap, no library** — `react-focus-lock`, `react-aria`, `@reach/dialog`, etc. would each add 5-15kB and a peer-dep. Plan 01-02 ships dependency-free per the stack constraint in PROJECT.md.
- **`position: fixed` for the menu, no popper.js** — sidebar is on the left edge, so the popover never needs flipping; viewport clamping with `Math.min(x, innerWidth - 180)` and `Math.min(y, innerHeight - itemsHeight)` is sufficient.
- **No body scroll lock on modal open** — the backdrop covers the viewport visually; the additional `document.body.style.overflow = 'hidden'` introduces side-effect risk (interaction with horizontal scroll, fixed-position elements) for a benefit that's unobservable on a desktop single-page app.
- **Snapshot pendingDelete object (not id)** — defends against the conversation list refetching while the modal is open. The modal's `body` references `pendingDelete.title`, so even if the original row was removed from `conversations` we still render correctly.
- **Confirm closes modal before awaiting** — opposite of "wait for server, then close": the user already pressed Delete, so the modal closes immediately and the optimistic UI mutation (file removed from list) happens after `loadConversations()`. If the network fails, `console.error` and the next `loadConversations()` resyncs.
- **Right-click handler at the row level, not at the trigger** — D-07 wants right-click anywhere on the row to work; attaching only to the trigger would be surprising.

## Deviations from Plan

None — plan executed exactly as written. The only minor adjustment was rewording the `onMouseDown` reference in the Modal source comment to satisfy the strict `grep -c "onMouseDown" == 0` acceptance criterion. The original wording said "use onClick (not onMouseDown)"; the final wording says "use the click event (not mousedown)". Same meaning, comment-only.

## Issues Encountered

### Pre-commit hook auto-committed Modal.jsx ahead of my commit

- **What happened:** When I ran `git add Modal.jsx Modal.css && git commit`, the resulting commit only showed Modal.css as new and Modal.jsx as a 6-line edit. Investigation showed a separate commit `e26a52d "Baseline browser mapping"` had been authored 51 seconds earlier and contained the bulk of Modal.jsx (129 lines).
- **Why:** Some local pre-commit-driven sync hook authored a commit with that title before my own commit. The Modal.jsx I had just written was in the working tree and got captured by it.
- **Resolution:** Confirmed `git show HEAD:frontend/src/components/Modal.jsx` matches the intended content; both commits together (`e26a52d` + `7139b03`) reflect Task 2.1 in full. Documented both hashes in the Task Commits section.
- **No corrective action needed** — the file content is correct and the build passes.

### Stale backend serving cached code

- **What happened:** First `curl -X DELETE` after writing the new endpoint returned `405 Method Not Allowed`. A leftover `python.exe` from an earlier session was bound to port 8001 with the pre-edit `main.py`.
- **Resolution:** `taskkill //F //PID ...` for the two stale `python.exe` processes; restarted with `uv run python -m backend.main`. The full smoke matrix then passed (400 / 204 / file-removed / 404).
- **Lesson (carry forward):** Plan 01 already documented this; same advice applies to Plan 03 (PATCH endpoint).

### Pre-existing eslint errors in App.jsx

- **What happened:** `npx eslint src/App.jsx` reports 2 `react-hooks/immutability` errors at L15 and L21 (`loadConversations` / `loadConversation` used in `useEffect` before they're declared).
- **Investigation:** Stashed my Plan 02 changes and re-ran eslint — same errors. Pre-existing; not introduced by this plan.
- **Decision:** Out of scope per the executor scope-boundary rule. Logged in `.planning/phases/01-hardening-conversation-management/deferred-items.md`. Build still passes (Vite uses its own transform, eslint is advisory).

## User Setup Required

None — the DELETE endpoint inherits Plan 01's CORS configuration; no env-var changes; no new dependencies (Modal/Menu are dependency-free).

## Next Phase Readiness

- **Plan 03 (rename, CONV-02)** can land directly:
  - `Menu` already accepts an `items` array — adding `{ label: 'Rename', onClick: ... }` next to `Delete` is one line of JSX in `Sidebar.jsx`.
  - `Modal` is available if the rename UX uses a modal-based prompt; the planner originally chose inline rename (D-06), so Modal will not be reused there but is on the shelf for cost prompts in Phase 3.
  - `backend/main.py` now has the canonical 4-handler pattern (3 from Plan 01 + 1 from Plan 02) that the upcoming PATCH handler can mirror exactly.
- **Phase 4 (visual identity)** has two single-file restyle targets for the new components: `Modal.css` and `Menu.css`. Both share the destructive color (`#d9534f`); rebranding the destructive surface will be one CSS variable away once the bespoke palette lands.

## Curl Examples

```bash
# Bad UUID → 400
curl -i -X DELETE http://127.0.0.1:8001/api/conversations/not-a-uuid
# HTTP/1.1 400 Bad Request
# {"detail":"Invalid conversation ID"}

# Create + delete + verify gone
NEW=$(curl -s -X POST http://127.0.0.1:8001/api/conversations \
  -H "Content-Type: application/json" -d '{}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['id'])")

ls data/conversations/$NEW.json
# data/conversations/<uuid>.json

curl -i -X DELETE "http://127.0.0.1:8001/api/conversations/$NEW"
# HTTP/1.1 204 No Content

ls data/conversations/$NEW.json
# ls: cannot access ...: No such file or directory

# Idempotent-ish second call → 404
curl -i -X DELETE "http://127.0.0.1:8001/api/conversations/$NEW"
# HTTP/1.1 404 Not Found
# {"detail":"Conversation not found"}
```

## Self-Check: PASSED

Verified the following before declaring complete:

- Files exist: `frontend/src/components/Modal.jsx` ✓, `Modal.css` ✓, `Menu.jsx` ✓, `Menu.css` ✓.
- Modal grep: `createPortal` ≥ 1 ✓, `useEffect` ≥ 1 ✓, `useRef` ≥ 2 ✓, `previouslyFocused` ≥ 2 ✓, `Escape` ≥ 1 ✓, `aria-modal` ≥ 1 ✓, `role="dialog"` ≥ 1 ✓, `e.target === e.currentTarget` == 1 ✓, `onMouseDown` == 0 ✓, `modal-backdrop` ≥ 1 ✓, `modal-btn-destructive` ≥ 1 ✓.
- Backend grep: `@app.delete("/api/conversations/{conversation_id}"` == 1 ✓, `status_code=204` ≥ 1 ✓, `FileNotFoundError` ≥ 1 ✓, `storage.delete_conversation` ≥ 1 ✓.
- Frontend api grep: `deleteConversation` ≥ 1 ✓, `method: 'DELETE'` ≥ 1 ✓.
- Menu grep: `addEventListener('mousedown'` == 1 ✓, `role="menu"` ≥ 1 ✓, `role="menuitem"` ≥ 1 ✓, `menu-item-destructive` ≥ 1 ✓.
- Sidebar grep: `import Menu` == 1 ✓, `import Modal` == 1 ✓, `menu-trigger` ≥ 1 ✓, `onContextMenu` ≥ 1 ✓, `e.preventDefault` ≥ 1 ✓, `aria-expanded` ≥ 1 ✓, `<Modal` == 1 ✓, `destructive` ≥ 1 ✓.
- Sidebar.css grep: `menu-trigger` ≥ 1 ✓, `visibility: hidden` ≥ 1 ✓.
- App.jsx grep: `handleDeleteConversation` ≥ 2 ✓, `setCurrentConversationId(null)` ≥ 1 ✓, `onDeleteConversation={handleDeleteConversation}` == 1 ✓; `awk` order check confirms `setCurrentConversationId(null)` precedes `api.deleteConversation` ✓.
- Build: `cd frontend && npm run build` exit 0 ✓.
- DELETE route registered in FastAPI app via Python introspection ✓.
- Live backend smoke matrix: bad-uuid → 400 ✓, valid-create → DELETE → 204 ✓, file removed from disk ✓, second DELETE → 404 ✓.
- Commits in `git log`: `e26a52d` ✓, `7139b03` ✓, `5b41fb3` ✓, `24b072c` ✓.

---
*Phase: 01-hardening-conversation-management*
*Plan: 02*
*Completed: 2026-05-09*
