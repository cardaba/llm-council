---
phase: 01-hardening-conversation-management
verified: 2026-05-09T00:00:00Z
status: gaps_found
score: 3/4 must-haves verified (with caveats on SC-1)
overrides_applied: 0
gaps:
  - truth: "User can click a conversation title in the sidebar, edit it in place, and the new title persists across reloads."
    status: partial
    reason: "Inline rename works in the happy path (Enter/Escape/blur via intentRef, persists via PATCH). However, BL-01 from 01-REVIEW.md is unfixed: the PATCH handler only wraps the initial get_conversation call in try/except ValueError. If the conversation file is deleted between the existence check and storage.update_conversation_title (TOCTOU race — concurrent DELETE from another tab, slow disk), update_conversation_title raises ValueError unhandled and FastAPI returns 500 with a stack trace instead of 404. Additionally, the storage layer collapses 'invalid UUID' and 'missing file' into the same ValueError type, so even if the second call were wrapped naively it would mis-translate 'file vanished' as 'Invalid conversation ID' (400)."
    artifacts:
      - path: "backend/main.py"
        issue: "Lines 232-246: storage.update_conversation_title(conversation_id, request.title) is unwrapped. TOCTOU produces 500."
      - path: "backend/storage.py"
        issue: "Lines 180-193: update_conversation_title raises plain ValueError on missing file, colliding with the 'ValueError → 400 Invalid UUID' convention. add_user_message and add_assistant_message have the same shape (used inside the streaming send_message handler)."
    missing:
      - "Either: define storage.ConversationNotFoundError and raise it from add_user_message / add_assistant_message / update_conversation_title when the file is missing (then map to 404 in main.py)."
      - "Or (minimal): wrap storage.update_conversation_title in try/except ValueError → HTTPException(404) — with a comment explaining that at this point the UUID is known valid so ValueError can only mean missing file."
  - truth: "A request to any /api/conversations/{id} endpoint with a non-UUID4 id returns HTTP 400 and never touches the filesystem."
    status: partial
    reason: "Validation is correctly placed at the storage boundary (uuid.UUID() in get_conversation_path) and the 4 conversation_id handlers (GET, POST/message, POST/message/stream, DELETE) translate ValueError → 400. BUT BL-02 from 01-REVIEW.md is unfixed: the path is built from the raw input rather than the canonical UUID. uuid.UUID() accepts hyphenated, unhyphenated, braced ({...}), and URN (urn:uuid:...) forms. Conversations are stored as canonical hyphenated, so a client that fetches via braced/URN form passes validation but reads/writes a different filename: GET → 404, PATCH → 404, DELETE → 404 / FileNotFoundError. On Windows NTFS the URN form (which contains ':') triggers Alternate Data Stream interpretation. SEC-01's spirit (no path traversal) is preserved because no parseable UUID contains '/', '\\', or '..', but the contract leaks platform-dependent behaviour and the round-trip GET/PATCH/DELETE breaks for non-canonical forms."
    artifacts:
      - path: "backend/storage.py"
        issue: "Line 38-39: uuid.UUID(conversation_id) validates but f'{conversation_id}.json' embeds the raw input. The Plan 01 SUMMARY explicitly accepted this ('any case/format the stdlib parser accepts'), but it did not consider that PATCH/DELETE wouldn't find files created with a different parseable form."
    missing:
      - "Canonicalize the UUID before embedding in the path: `canonical = str(uuid.UUID(conversation_id)); return os.path.join(DATA_DIR, f'{canonical}.json')`. One-line fix; eliminates platform-dependent characters and makes the round-trip contract explicit."
human_verification:
  - test: "Manual smoke: create a conversation, hover its row, verify the ⋮ trigger reveals; click it, verify Menu shows Rename above Delete; click Rename, verify the input swaps in with title selected and focused"
    expected: "Visual progressive disclosure of menu trigger; menu opens at click position; Rename converts row to input"
    why_human: "Visual hover behavior, focus state, and CSS visibility transitions cannot be verified programmatically without a live browser session"
  - test: "Manual smoke: rename a conversation to 'Test Rename', press Enter, then refresh the browser — verify the new title persists"
    expected: "After F5, the renamed conversation still shows 'Test Rename' in the sidebar"
    why_human: "Browser reload + UI inspection requires a live session; the backend persistence check verified the file is written, but the SPA re-fetch + render is not testable from grep"
  - test: "Manual smoke: rename, modify text, press Escape — verify the original title is restored and no PATCH request fires"
    expected: "Title reverts; Network panel shows zero PATCH calls"
    why_human: "intentRef='cancel' branch is verified by code inspection but the runtime non-firing of fetch() needs DevTools observation"
  - test: "Manual smoke: type 'abcdef' rapidly in the search box — verify list does NOT update on every keystroke; pause — verify list filters after ~200ms"
    expected: "Debounce is observable: filter happens once after pause, not 6 times during typing"
    why_human: "Timing-dependent behavior; 200ms debounce is invisible in static code"
  - test: "Manual smoke: with multiple conversations existing, type a query that matches no titles and >=3 chars — verify 'Search inside content (N conversations)' affordance appears; click it; verify content matches surface"
    expected: "Affordance appears, click triggers Promise.all of api.getConversation, then content-mode list shows conversations whose user/stage1/stage3 contents match"
    why_human: "Conditional UI rendering + lazy data fetch + cache population require live data to validate end-to-end"
  - test: "Manual smoke (Pitfall 6 seal): select a conversation, then type a query that does NOT match its title — verify the central panel still shows the selected conversation"
    expected: "Sidebar hides the row but the chat pane keeps rendering the conversation; clearing the query brings the row back"
    why_human: "Cross-component state behavior under filter requires interactive verification"
  - test: "Manual smoke: hover one row in the sidebar and right-click it — verify the native browser menu does NOT appear and the custom Menu opens at cursor position"
    expected: "preventDefault works; custom Menu opens; native menu suppressed"
    why_human: "Browser context menu suppression is a runtime gesture-handling check"
  - test: "Manual smoke: trigger Modal confirmation for delete; press Tab — verify focus cycles between Cancel and Delete buttons without escaping; press ESC — verify modal closes and focus returns to the ⋮ trigger"
    expected: "Focus trap cycles, ESC closes, focus restoration works"
    why_human: "A11y focus management is a tabular keystroke check that needs a live session"
---

# Phase 1: Hardening & Conversation Management Verification Report

**Phase Goal:** User can manage conversations from the sidebar (delete, rename, search) on a storage layer that rejects malformed conversation IDs at the boundary.
**Verified:** 2026-05-09
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | A request to any `/api/conversations/{id}` endpoint with a non-UUID4 `id` returns HTTP 400 and never touches the filesystem. | PARTIAL (BL-02) | `backend/storage.py:38` calls `uuid.UUID(conversation_id)`; 4 handlers in `backend/main.py` (GET L78, POST/message L90, POST/message/stream L137, DELETE L249, PATCH L211) translate ValueError → 400. Filesystem is not touched: validation runs before `os.path.join`. **BUT**: get_conversation_path embeds the raw `conversation_id` in the filename (line 39), not the canonical form returned by `str(uuid.UUID(...))`. Braced/URN forms parse OK and pass validation but produce a filename that differs from what was created (always canonical via `uuid.uuid4()`), so GET/PATCH/DELETE on non-canonical forms returns 404 instead of round-tripping. SEC-01 path-traversal goal is technically met (no parseable UUID contains traversal chars), but the contract advertised in the SUMMARY ("any parseable form is accepted") leaks platform-dependent behavior on Windows NTFS (URN's `:` triggers ADS interpretation). |
| SC-2 | User can delete a conversation from the sidebar through a confirmation step; the JSON file is removed from `data/conversations/` and the conversation disappears from the list without a manual refresh. | VERIFIED | `frontend/src/components/Sidebar.jsx`: ⋮ trigger (L119), right-click handler (L323), Menu with Delete item (L364), Modal confirmation (L377). `frontend/src/App.jsx:60-80`: `handleDeleteConversation` correctly resets local state BEFORE awaiting (L67-70), calls `api.deleteConversation`, then `loadConversations()` to refresh the sidebar. `backend/main.py:249-269`: DELETE endpoint returns 204; ValueError → 400, FileNotFoundError → 404. `backend/storage.py:196-209`: `delete_conversation` calls `os.remove(path)`. Order verified: setCurrentConversationId(null) precedes await api.deleteConversation. |
| SC-3 | User can click a conversation title in the sidebar, edit it in place, and the new title persists across reloads. | PARTIAL (BL-01) | Happy path is implemented correctly: `RenameInput` sub-component (`Sidebar.jsx:20-76`) with intentRef pattern (Enter→commit, Escape→cancel, blur→commit unless intent='cancel'). PATCH handler at `main.py:211-246` validates body via Pydantic Field(min_length=1, max_length=200) and calls `storage.update_conversation_title`. `frontend/src/api.js:134-147`: `renameConversation` sends PATCH JSON. `App.jsx:82-93`: `handleRenameConversation` awaits PATCH then `loadConversations`. **BUT BL-01 (unfixed)**: PATCH handler wraps `storage.get_conversation()` in try/except ValueError but `storage.update_conversation_title()` (called next, line 239) is unwrapped. TOCTOU window: parallel DELETE between the existence check and the write triggers `update_conversation_title`'s internal `if conversation is None: raise ValueError(...)` (storage.py:189-190) which propagates as unhandled 500 with stacktrace, not 404. Same shape exists inside `send_message_stream` for `add_user_message` / `add_assistant_message` / `update_conversation_title` calls but is partially absorbed by the SSE error generator. |
| SC-4 | User can type into a search box at the top of the sidebar and the conversation list filters case-insensitively as they type. | VERIFIED | `Sidebar.jsx:277-303`: `<input type="search">` rendered; `setSearchQuery` updates on change. `Sidebar.jsx:171-174`: 200ms debounce via setTimeout/clearTimeout. `Sidebar.jsx:177-183`: `useMemo titleMatches` filters case-insensitively (`.toLowerCase().includes(q)`). `Sidebar.jsx:188-191`: D-10 affordance gate (>=3 chars + 0 title matches + !contentSearchActive). `Sidebar.jsx:230-245`: `activateContentSearch` does `Promise.all(conversations.map(api.getConversation))` and caches in `Map`. Pitfall 6 sealed (no `onSelectConversation(null)` anywhere in the file — verified by `Grep` count = 0). |

**Score:** 2/4 truths fully verified, 2/4 partial. Counting partial truths as half: ~3/4. Counting strictly: 2/4.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/storage.py` | uuid.UUID validation, delete_conversation helper, update_conversation_title intact | WIRED + functional | `import uuid` (L5), `uuid.UUID(conversation_id)` (L38), `def delete_conversation` (L196), `os.remove(path)` (L209), `update_conversation_title` (L180-193) preserved |
| `backend/main.py` | 5 handlers (GET, POST/message, POST/message/stream, PATCH, DELETE) wrap storage calls in try/except ValueError → 400; PATCH validates body via Field(1..200); DELETE returns 204 | WIRED with caveat | All routes registered (verified via app.routes introspection); 4 of 5 handlers have try/except. PATCH (L211-246) wraps only get_conversation, NOT update_conversation_title (BL-01). |
| `frontend/src/components/Modal.jsx` | createPortal, focus trap, ESC, click-outside (target===currentTarget), focus restoration | WIRED | All elements present: `createPortal` (L91), `useEffect` keydown listener (L43-80), `previouslyFocused` (L41, L78), `e.target === e.currentTarget` (L88), `role="dialog"` (L96), `aria-modal="true"` (L97). Imported and used in Sidebar.jsx (L4, L377). |
| `frontend/src/components/Menu.jsx` | popover with viewport clamp, role=menu/menuitem, ESC, document mousedown click-outside | WIRED | `addEventListener('mousedown'` (L38), `role="menu"` (L64), `role="menuitem"` (L72), viewport clamp (L51-58), `Escape` handler (L33-36). Imported and used in Sidebar.jsx (L3, L352). |
| `frontend/src/api.js` | deleteConversation (DELETE), renameConversation (PATCH) | WIRED | `deleteConversation` (L120-128) with `method: 'DELETE'`, `renameConversation` (L134-147) with `method: 'PATCH'` and JSON body. WR-02 (info): redundant `&& response.status !== 204` check after `!response.ok` is dead code but does not break behavior. |
| `frontend/src/App.jsx` | handleDeleteConversation (with state-reset-before-await), handleRenameConversation, props passed to Sidebar | WIRED | `handleDeleteConversation` (L60-80) — `setCurrentConversationId(null)` at L68 precedes `await api.deleteConversation(id)` at L72 (verified via line ordering). `handleRenameConversation` (L82-93). Both passed as props to Sidebar (L226-227). |
| `frontend/src/components/Sidebar.jsx` | trigger ⋮, right-click, Menu integration, Modal confirmation, RenameInput sub-component with intentRef, search input with debounce + content fallback | WIRED | All listed elements present and wired. `editingId` state (L149), `intentRef` (L22), `'commit'`/`'cancel'` labels (L37, L41), Menu items array with Rename above Delete (L356-373), Modal usage (L377-395), search input (L277-303), debounce useEffect (L171-174), titleMatches/filteredConversations memos (L177-224). |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| Sidebar trigger ⋮ | Menu popover | setOpenMenuFor | WIRED (Sidebar.jsx:330-340 + 351-375) |
| Menu Delete item | Modal confirmation | requestDelete → setPendingDelete | WIRED (Sidebar.jsx:364-372 + 247-249 + 377) |
| Modal confirm | App.handleDeleteConversation | onConfirm prop | WIRED (Sidebar.jsx:251-258, App.jsx:60) |
| App.handleDeleteConversation | api.deleteConversation | fetch DELETE | WIRED (App.jsx:72, api.js:120-128) |
| api.deleteConversation | backend DELETE | /api/conversations/{id} method:DELETE | WIRED (api.js:122-123, main.py:249) |
| backend DELETE | storage.delete_conversation | imported function | WIRED (main.py:264) |
| Menu Rename item | Sidebar setEditingId | items prop callback | WIRED (Sidebar.jsx:357-362) |
| RenameInput onKeyDown/onBlur | onCommitRename / onCancelRename | intentRef + callback | WIRED (Sidebar.jsx:34-60, 102-105) |
| onCommitRename | App.handleRenameConversation | onRenameConversation prop | WIRED (Sidebar.jsx:341-344, App.jsx:227) |
| App.handleRenameConversation | api.renameConversation | fetch PATCH | WIRED (App.jsx:88, api.js:134-147) |
| api.renameConversation | backend PATCH | /api/conversations/{id} method:PATCH | WIRED (api.js:138, main.py:211) |
| backend PATCH | storage.update_conversation_title | imported function | WIRED (main.py:239) — but unwrapped (BL-01) |
| input onChange | searchQuery state | controlled input | WIRED (Sidebar.jsx:283) |
| searchQuery | debouncedQuery (200ms) | useEffect setTimeout/clearTimeout | WIRED (Sidebar.jsx:171-174) |
| debouncedQuery | titleMatches | useMemo filter | WIRED (Sidebar.jsx:177-183) |
| titleMatches.length===0 && q>=3 | content fallback affordance | render condicional | WIRED (Sidebar.jsx:188-191, 286-297) |
| afordancia click | Promise.all → Map cache | activateContentSearch | WIRED (Sidebar.jsx:230-245) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Sidebar.jsx (conversation list render) | `conversations` (prop) | App.jsx loadConversations → api.listConversations → backend GET /api/conversations → storage.list_conversations() reads `data/conversations/*.json` | YES — real DB (filesystem) read | FLOWING |
| Sidebar.jsx (filtered list) | `filteredConversations` (useMemo) | derived from `conversations` + `debouncedQuery` + `contentCache` | YES — derives from flowing source | FLOWING |
| Sidebar.jsx (content cache) | `contentCache` (Map) | Promise.all(api.getConversation(id)) → backend GET /api/conversations/{id} → storage.get_conversation reads JSON | YES | FLOWING (lazy, opt-in) |
| RenameInput (draftTitle) | `draftTitle` (useState) | initialised from `conv.title || ''` | YES | FLOWING |
| Modal (pendingDelete.title) | `pendingDelete` (snapshotted full object) | `requestDelete(conv)` from Menu Delete onClick | YES | FLOWING |

### Behavioral Spot-Checks

Backend not running during verification; ran Python introspection of the imported module:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| storage.get_conversation_path raises ValueError on invalid UUID | `uv run python -c "from backend import storage; storage.get_conversation_path('not-a-uuid')"` | ValueError raised | PASS |
| storage.get_conversation_path accepts canonical UUID | `storage.get_conversation_path('00000000-0000-4000-8000-000000000000')` | returns `data/conversations\00000000-...json` | PASS |
| storage.delete_conversation validates UUID | `storage.delete_conversation('not-a-uuid')` | ValueError raised | PASS |
| FastAPI app has PATCH route registered | introspection of `app.routes` | `PATCH /api/conversations/{conversation_id}` present | PASS |
| FastAPI app has DELETE route registered | introspection of `app.routes` | `DELETE /api/conversations/{conversation_id}` present | PASS |
| UpdateConversationRequest rejects empty title | `UpdateConversationRequest(title='')` | ValidationError raised | PASS |
| UpdateConversationRequest rejects 201-char title | `UpdateConversationRequest(title='x'*201)` | ValidationError raised | PASS |
| Live curl matrix (BL-01 TOCTOU) | requires running server + race | not executed | SKIP (would require concurrent DELETE + PATCH; the static analysis BL-01 is sufficient) |
| Live curl matrix (BL-02 round-trip with braced UUID) | requires running server + custom POST + GET round-trip | not executed | SKIP (static analysis: line 39 embeds raw `conversation_id`, not canonical form — sufficient evidence) |
| Frontend build | not executed in this verification run | — | SKIP (already verified by SUMMARY's `npm run build exit 0` at the time of each plan) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 01-01-PLAN | UUID validation at storage boundary, 400 on invalid input | SATISFIED with caveat | uuid.UUID + 5 handler wrappers; BL-02 is a contract correctness issue, not a SEC-01 regression — no path traversal possible |
| CONV-01 | 01-02-PLAN | Delete with confirmation, file removed, list updates | SATISFIED | Modal + Menu + DELETE endpoint + post-delete welcome state all wired |
| CONV-02 | 01-03-PLAN | Rename inline, persists across reloads | PARTIAL | Happy path works; BL-01 leaves a 500-on-TOCTOU defect |
| CONV-03 | 01-04-PLAN | Search filters case-insensitively as user types | SATISFIED | 200ms debounce + title filter + D-10 content fallback + Pitfall 6 sealed |

No requirement was orphaned — every requirement ID declared in the plans (SEC-01, CONV-01, CONV-02, CONV-03) is mapped in REQUIREMENTS.md to Phase 1, and all are marked complete in REQUIREMENTS.md (lines 10, 36-38). REQUIREMENTS.md does NOT claim any extra IDs for Phase 1 beyond these four.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| backend/main.py | 232-246 | PATCH handler does not wrap storage.update_conversation_title in try/except (BL-01) | BLOCKER | TOCTOU race produces 500 with stack trace instead of 404 |
| backend/storage.py | 38-39 | get_conversation_path embeds raw conversation_id, not canonical form (BL-02) | BLOCKER | Round-trip GET/PATCH/DELETE breaks for braced/URN UUID forms; Windows NTFS ADS interaction with URN |
| backend/storage.py | 180-193, 131-148, 151-177 | update_conversation_title / add_user_message / add_assistant_message raise plain ValueError on missing file — collides with the "ValueError → 400 invalid UUID" convention | WARNING | Even a naive try/except wrap of these calls would mis-translate "missing file" as "invalid UUID" (400 instead of 404). Suggested fix: ConversationNotFoundError. |
| frontend/src/api.js | 125 | Redundant `&& response.status !== 204` after `!response.ok` (WR-02) | INFO | Dead code; misleads future readers. No behavioral impact. |
| frontend/src/components/Menu.jsx | 32-37 | ESC handler uses `e.stopPropagation()` on a document-level listener; comment claims this prevents Modal from also receiving ESC — but stopPropagation does not stop sibling document listeners (WR-03) | INFO | Latent: in current architecture Menu and Modal are not simultaneously open. If a future plan opens Modal above Menu, both will close on ESC. |
| frontend/src/components/Sidebar.jsx | 367-371 | Menu Delete item runs `conversations.find(...)` at click time, not at menu-open time (WR-04) | INFO | If conversation array refetches between menu-open and Delete-click, click silently swallows the no-op case. Not a regression of the goal. |
| frontend/src/components/Sidebar.jsx | 230-245 | activateContentSearch snapshots conversations at click time but renders against current — new conversations created during the load silently miss the cache (WR-05) | INFO | Acknowledged staleness per D-11; CONV-03 goal is met. Cache backfill on conversations growth would be a Phase 1.5 polish. |
| backend/storage.py | 180-193 | update_conversation_title has no length cap; auto-generated titles from `generate_conversation_title()` can exceed the 200-char invariant the PATCH endpoint advertises (WR-06) | INFO | Defense-in-depth gap. Phase 1 PATCH handler enforces 200 chars; auto-title path bypasses. Latent. |
| frontend/src/components/Modal.jsx | 50, 60-70 | Initial focus = first-element (Cancel) is hardcoded; no `initialFocus` prop (WR-07) | INFO | Non-blocking. v1 only consumer is destructive flow where Cancel-first is the safe default. |
| frontend/src/components/Sidebar.jsx | 200-201 | `filteredConversations` re-computes the title-includes filter inside the content branch even though `titleMatches` already has it (IN-01) | INFO | Minor perf and clarity; not blocking. |
| frontend/src/components/Modal.jsx | 98, 102 | Hardcoded `id="modal-title"` (IN-04) | INFO | Latent — would matter if two Modals coexisted. |
| backend/main.py | 269 | Explicit `return None` after raising in DELETE handler (IN-05) | INFO | Style noise; FastAPI handles missing return. |

### Human Verification Required

8 items need a live browser session — see `human_verification` in the YAML frontmatter above. These cover: hover progressive disclosure of `⋮`, persistence after F5, network-tab observation of PATCH non-firing on Escape, debounce timing, content-fallback affordance + lazy load, Pitfall 6 seal (selected conversation stays in central pane), context-menu native suppression, Modal focus trap + ESC + focus restoration.

### Gaps Summary

The phase delivered all four success criteria functionally; users can delete, rename, search conversations, and the storage layer rejects malformed IDs at the boundary. **However, two BLOCKER issues from the code review (01-REVIEW.md) remain unfixed:**

1. **BL-01 (affects SC-3 / CONV-02)**: PATCH handler's TOCTOU window between `get_conversation` and `update_conversation_title` produces a 500 with stack trace on a concurrent delete, instead of a clean 404. The root cause is the storage layer using `ValueError` for both "invalid UUID" (intended → 400) and "missing file" (intended → 404), so even wrapping the second call needs care to avoid mis-translating to 400. Recommended fix: introduce `storage.ConversationNotFoundError` (5-line change) and let main.py distinguish the two cases. Minimal fix: wrap `storage.update_conversation_title` in `try/except ValueError → HTTPException(404)` with an explanatory comment that at this point the UUID is known valid.

2. **BL-02 (affects SC-1 / SEC-01 contract leak)**: `get_conversation_path` embeds the raw `conversation_id` in the filename rather than the canonical form `str(uuid.UUID(...))`. SEC-01's path-traversal goal is met (no parseable UUID contains `..`, `/`, or `\\`), but the contract advertised by the SUMMARY ("any case/format the stdlib parser accepts") leaks platform-dependent behaviour: a client that fetches with braced or URN form gets 404 instead of 200, and on Windows NTFS the URN form's `:` triggers Alternate Data Stream interpretation. One-line fix: `canonical = str(uuid.UUID(conversation_id))` then embed `canonical` in the path.

Both gaps are localised, well-understood, and have minimal-fix paths documented in 01-REVIEW.md. None requires architectural rework. Recommendation: address both before declaring Phase 1 complete (a 1-task closure plan via `/gsd-plan-phase --gaps` would be sufficient).

The remaining 7 WARNING and 5 INFO findings from 01-REVIEW.md are NOT goal-blocking and can be deferred to a future hardening pass or Phase 4 polish.

---

*Verified: 2026-05-09*
*Verifier: Claude (gsd-verifier)*
