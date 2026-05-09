---
phase: 01-hardening-conversation-management
verified: 2026-05-09T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4 (with caveats on SC-1)
  gaps_closed:
    - "BL-01 — PATCH handler 500 on TOCTOU race (now returns 404)"
    - "BL-02 — UUID round-trip broke for braced/URN/unhyphenated forms (now canonicalised)"
  gaps_remaining: []
  regressions: []
gaps: []
human_verification: []
human_verification_approved: 2026-05-09T00:00:00Z
human_verification_uat: 01-HUMAN-UAT.md
---

# Phase 1: Hardening & Conversation Management Verification Report

**Phase Goal:** User can manage conversations from the sidebar (delete, rename, search) on a storage layer that rejects malformed conversation IDs at the boundary.
**Verified:** 2026-05-09 (re-verified after Plan 01-05 gap closure)
**Status:** passed (user approved 8/8 UAT items 2026-05-09)
**Re-verification:** Yes — after Plan 01-05 closed BL-01 and BL-02

## Resolution Notes (Plan 01-05)

The two BLOCKER gaps from the initial verification are now closed and confirmed against the live codebase:

### BL-01 Closure (PATCH 500 on TOCTOU → now 404)

**Root cause (initial verification):** `storage.update_conversation_title()` raised a plain `ValueError` on missing file, colliding with the "ValueError → 400 invalid UUID" convention. The PATCH handler in `main.py` only wrapped the initial `get_conversation` call, so a TOCTOU race (parallel DELETE between the existence check and the title write) propagated as an unhandled 500 with stack trace.

**Fix shipped (commits `bbb4120`, `f4d37dc`):**

1. New domain exception `class ConversationNotFoundError(Exception)` introduced in `backend/storage.py:12-21`. Docstring documents the *why* (resolves the ValueError ambiguity between invalid-UUID and missing-file).
2. Three `raise ValueError(f"Conversation ... not found")` statements in `add_user_message` (line 150), `add_assistant_message` (line 177), and `update_conversation_title` (line 199) replaced with `raise ConversationNotFoundError(conversation_id)`.
3. PATCH handler in `backend/main.py:240-243` now wraps `storage.update_conversation_title(...)` in `try/except storage.ConversationNotFoundError → HTTPException(404)`. Docstring (lines 229-231) updated to document that the second try/except handles the TOCTOU race.
4. Streaming `event_generator` in `backend/main.py:197-198` adds a dedicated `except storage.ConversationNotFoundError` branch BEFORE the generic `except Exception as e`, emitting a structured SSE payload `{"type": "error", "kind": "not_found", "message": "Conversation not found"}` so the frontend can disambiguate the race from transport/generation errors without parsing the message string.

**Live verification (TestClient):**

```
Created conv: ae6e9ea7-438c-4cf5-9f68-285b70b09180
File removed (TOCTOU simulated)
PATCH status: 404 {"detail":"Conversation not found"}
BL-01 PATCH 404 OK
```

### BL-02 Closure (UUID non-canonical → now canonicalised)

**Root cause (initial verification):** `get_conversation_path` validated the UUID via `uuid.UUID(conversation_id)` but embedded the **raw** input into `f"{conversation_id}.json"`. Since `uuid.UUID()` accepts hyphenated, unhyphenated, braced (`{...}`), and URN (`urn:uuid:...`) forms, a client could pass validation but read/write a different filename than the canonical form created by `uuid.uuid4()`. Round-trip GET/PATCH/DELETE broke for non-canonical forms; on Windows NTFS the URN form's `:` triggered Alternate Data Stream interpretation.

**Fix shipped (commit `bbb4120`):**

`backend/storage.py:47-48` now reads:

```python
canonical = str(uuid.UUID(conversation_id))
return os.path.join(DATA_DIR, f"{canonical}.json")
```

The raw `f"{conversation_id}.json"` embedding is gone (verified by `Grep` count = 0). Docstring (lines 30-46) documents the canonicalisation contract.

**Live verification (Python introspection):**

```
p1 = get_conversation_path('12345678-1234-4123-8123-123456789abc')
p2 = get_conversation_path('{12345678-1234-4123-8123-123456789abc}')
p3 = get_conversation_path('urn:uuid:12345678-1234-4123-8123-123456789abc')
p4 = get_conversation_path('12345678123441238123123456789ABC')
assert p1 == p2 == p3 == p4
→ data/conversations\12345678-1234-4123-8123-123456789abc.json
BL-02 OK
```

### Regression Check

All previously-passing contracts still hold (verified via TestClient round-trip):

```
GET    /not-a-uuid                  → 400
DELETE /not-a-uuid                  → 400
PATCH  /not-a-uuid                  → 400
POST   /not-a-uuid/message          → 400
GET    /never-created-canonical-uuid → 404
PATCH  /never-created-canonical-uuid → 404
DELETE /never-created-canonical-uuid → 404
```

`get_conversation_path('not-a-uuid')` still raises `ValueError` → SEC-01 invariant preserved.

### Acceptance Grep Counts (post-fix)

| Pattern | File | Expected | Observed |
|---|---|---|---|
| `class ConversationNotFoundError` | `backend/storage.py` | 1 | 1 (line 12) |
| `raise ConversationNotFoundError` | `backend/storage.py` | 3 | 3 (lines 150, 177, 199) |
| `raise ValueError(f"Conversation .* not found")` | `backend/storage.py` | 0 | 0 |
| `canonical = str(uuid.UUID(conversation_id))` | `backend/storage.py` | 1 | 1 (line 47) |
| `f"{conversation_id}.json"` | `backend/storage.py` | 0 | 0 |
| `except storage.ConversationNotFoundError` | `backend/main.py` | 2 | 2 (lines 197, 242) |
| `'kind': 'not_found'` | `backend/main.py` | 1 | 1 (line 198) |
| `ConversationNotFoundError` before `Exception as e` in `event_generator` | `backend/main.py` | true | true (197 < 199) |

### Out-of-Scope Items (Acknowledged, Deferred)

Per Plan 01-05's scope (matching VERIFICATION.md gap definition):

- **Non-streaming `send_message` handler (`backend/main.py:90-134`)** — its `add_user_message`, `update_conversation_title`, `add_assistant_message` calls are still unwrapped. After this plan, those calls now raise `ConversationNotFoundError` directly to FastAPI, producing a 500 response on TOCTOU. The streaming variant is the primary path used by the SPA so the user-visible behaviour is fixed; the non-streaming path is exercised only if the SSE path is unavailable. Tracked as deferred hardening work in 01-05-SUMMARY.md "Deferred Issues".
- **WR-01 through WR-07** and **IN-01 through IN-05** from `01-REVIEW.md` — non-blocking, deferred to Phase 4 polish per the original verification.

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | A request to any `/api/conversations/{id}` endpoint with a non-UUID4 `id` returns HTTP 400 and never touches the filesystem. | VERIFIED | `backend/storage.py:47` calls `uuid.UUID(conversation_id)` BEFORE the path is constructed; line 48 embeds `canonical = str(uuid.UUID(...))` (canonicalised). 5 handlers in `backend/main.py` (GET L83, POST/message L99, POST/message/stream L146, PATCH L235, DELETE L269) translate ValueError → 400. Live TestClient confirms 400 across GET/DELETE/PATCH/POST endpoints with `not-a-uuid`. BL-02 closed: braced/URN/unhyphenated forms now canonicalise to the same on-disk file as the canonical hyphenated form, eliminating the platform-dependent file-naming leak. |
| SC-2 | User can delete a conversation from the sidebar through a confirmation step; the JSON file is removed from `data/conversations/` and the conversation disappears from the list without a manual refresh. | VERIFIED | `frontend/src/components/Sidebar.jsx`: ⋮ trigger, right-click handler, Menu with Delete item, Modal confirmation. `frontend/src/App.jsx:60-80`: `handleDeleteConversation` correctly resets local state BEFORE awaiting, calls `api.deleteConversation`, then `loadConversations()` to refresh the sidebar. `backend/main.py:253-273`: DELETE endpoint returns 204; ValueError → 400, FileNotFoundError → 404. `backend/storage.py:205-218`: `delete_conversation` calls `os.remove(path)`. Order verified: `setCurrentConversationId(null)` precedes `await api.deleteConversation`. |
| SC-3 | User can click a conversation title in the sidebar, edit it in place, and the new title persists across reloads. | VERIFIED | Happy path is implemented correctly: `RenameInput` sub-component (`Sidebar.jsx:20-76`) with intentRef pattern (Enter→commit, Escape→cancel, blur→commit unless intent='cancel'). PATCH handler at `main.py:213-250` validates body via `Field(min_length=1, max_length=200)` and calls `storage.update_conversation_title`. **BL-01 closed**: PATCH handler now wraps `storage.update_conversation_title` in `try/except storage.ConversationNotFoundError → HTTPException(404)` (lines 240-243). Live TestClient confirms PATCH on a created-then-deleted conversation returns 404 (not 500). Streaming `event_generator` (lines 197-198) gets the same treatment with a structured `kind: 'not_found'` SSE payload. |
| SC-4 | User can type into a search box at the top of the sidebar and the conversation list filters case-insensitively as they type. | VERIFIED | `Sidebar.jsx:277-303`: `<input type="search">` rendered; `setSearchQuery` updates on change. 200ms debounce via setTimeout/clearTimeout. `useMemo titleMatches` filters case-insensitively. D-10 affordance gate (>=3 chars + 0 title matches + !contentSearchActive). `activateContentSearch` does `Promise.all(conversations.map(api.getConversation))` and caches in `Map`. Pitfall 6 sealed (no `onSelectConversation(null)` anywhere in the file). |

**Score:** 4/4 truths fully verified (was 2/4 fully + 2/4 partial pre-Plan-05).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/storage.py` | uuid.UUID validation + canonicalisation, ConversationNotFoundError class, delete_conversation helper, update_conversation_title intact | WIRED + functional | `import uuid` (L5), `class ConversationNotFoundError` (L12-21), `canonical = str(uuid.UUID(...))` (L47), `def delete_conversation` (L205), `os.remove(path)` (L218), `update_conversation_title` (L189-202) raises ConversationNotFoundError on missing file (L199) |
| `backend/main.py` | 5 handlers wrap storage calls in try/except ValueError → 400; PATCH validates body via Field(1..200); DELETE returns 204; PATCH and SSE translate ConversationNotFoundError → 404 | WIRED | All routes registered; all 5 handlers have try/except for ValueError. PATCH (L213-250) wraps both `get_conversation` AND `update_conversation_title`. SSE event_generator (L154-201) has `except storage.ConversationNotFoundError` (L197) BEFORE generic `except Exception as e` (L199). |
| `frontend/src/components/Modal.jsx` | createPortal, focus trap, ESC, click-outside, focus restoration | WIRED | (unchanged from initial verification) |
| `frontend/src/components/Menu.jsx` | popover with viewport clamp, role=menu/menuitem, ESC, document mousedown click-outside | WIRED | (unchanged from initial verification) |
| `frontend/src/api.js` | deleteConversation (DELETE), renameConversation (PATCH) | WIRED | (unchanged from initial verification) |
| `frontend/src/App.jsx` | handleDeleteConversation, handleRenameConversation, props passed to Sidebar | WIRED | (unchanged from initial verification) |
| `frontend/src/components/Sidebar.jsx` | trigger ⋮, right-click, Menu, Modal, RenameInput with intentRef, search with debounce + content fallback | WIRED | (unchanged from initial verification) |

### Key Link Verification

(All links from initial verification still WIRED — re-listed only the previously-flagged one:)

| From | To | Via | Status |
|------|-----|-----|--------|
| backend PATCH | storage.update_conversation_title | imported function | WIRED + 404 on TOCTOU (was: WIRED but unwrapped) |
| backend SSE event_generator | storage mutators | through ConversationNotFoundError | WIRED + structured `kind: 'not_found'` (new) |

### Behavioral Spot-Checks (Plan 01-05 Re-verification)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| BL-02: canonical UUID round-trip across forms | `uv run python -c "...assert p1==p2==p3==p4..."` | All four forms map to canonical hyphenated file | PASS |
| SEC-01: invalid UUID still raises ValueError | `uv run python -c "storage.get_conversation_path('not-a-uuid')"` | ValueError raised | PASS |
| BL-01: PATCH on TOCTOU returns 404 | `TestClient: create → os.remove → PATCH → status_code` | 404 (was 500 pre-fix) | PASS |
| Contract regression — invalid UUID across all handlers | `TestClient: GET/PATCH/DELETE/POST on 'not-a-uuid'` | 400 across all | PASS |
| Contract regression — never-created canonical UUID | `TestClient: GET/PATCH/DELETE on fresh uuid4()` | 404 across all | PASS |
| Acceptance grep counts | Grep | All 8 patterns match expected counts | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 01-01-PLAN, 01-05-PLAN | UUID validation at storage boundary, 400 on invalid input, canonical filename | SATISFIED | uuid.UUID + canonicalisation + 5 handler wrappers; BL-02 closed |
| CONV-01 | 01-02-PLAN | Delete with confirmation, file removed, list updates | SATISFIED | Modal + Menu + DELETE endpoint + post-delete welcome state all wired |
| CONV-02 | 01-03-PLAN, 01-05-PLAN | Rename inline, persists across reloads, no 500 on TOCTOU | SATISFIED | PATCH + ConversationNotFoundError → 404 path complete; BL-01 closed |
| CONV-03 | 01-04-PLAN | Search filters case-insensitively as user types | SATISFIED | 200ms debounce + title filter + D-10 content fallback + Pitfall 6 sealed |

### Anti-Patterns Found (Post-Fix)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| backend/main.py | 90-134 | Non-streaming `send_message` handler still has unwrapped storage mutator calls | INFO (was BLOCKER scope) | Out of scope per Plan 01-05; primary path (streaming) is fixed. ConversationNotFoundError will surface as 500 on the legacy non-stream path; tracked in 01-05-SUMMARY "Deferred Issues" for future hardening. |
| backend/storage.py | 189-202 | update_conversation_title has no length cap | INFO (WR-06) | Defense-in-depth gap; Phase 1 PATCH handler enforces 200 chars; auto-title path bypasses. Latent. Deferred to Phase 4 polish. |
| frontend/src/api.js | 125 | Redundant `&& response.status !== 204` after `!response.ok` | INFO (WR-02) | Dead code; no behavioral impact. Deferred. |
| frontend/src/components/Menu.jsx | 32-37 | ESC handler uses `e.stopPropagation()` on document-level listener | INFO (WR-03) | Latent; Menu and Modal not simultaneously open in current architecture. Deferred. |
| frontend/src/components/Sidebar.jsx | 367-371 | Menu Delete item runs `conversations.find(...)` at click time | INFO (WR-04) | Click-time staleness; not a regression. Deferred. |
| frontend/src/components/Sidebar.jsx | 230-245 | activateContentSearch snapshots conversations at click time | INFO (WR-05) | Acknowledged staleness per D-11. Deferred. |
| frontend/src/components/Modal.jsx | 50, 60-70 | Initial focus = first-element hardcoded; no `initialFocus` prop | INFO (WR-07) | Non-blocking; Cancel-first is safe default for destructive flows. Deferred. |
| frontend/src/components/Sidebar.jsx | 200-201 | `filteredConversations` re-computes title-includes filter inside content branch | INFO (IN-01) | Minor perf; not blocking. Deferred. |
| frontend/src/components/Modal.jsx | 98, 102 | Hardcoded `id="modal-title"` | INFO (IN-04) | Latent; would matter if two Modals coexisted. Deferred. |
| backend/main.py | 273 | Explicit `return None` after raising in DELETE handler | INFO (IN-05) | Style noise; FastAPI handles missing return. Deferred. |

**No new BLOCKERs or WARNINGs introduced by Plan 01-05. All previously-listed BL findings are CLOSED.**

### Human Verification Required

8 items still need a live browser session — see `human_verification` in the YAML frontmatter above. These cover: hover progressive disclosure of `⋮`, persistence after F5, network-tab observation of PATCH non-firing on Escape, debounce timing, content-fallback affordance + lazy load, Pitfall 6 seal (selected conversation stays in central pane), context-menu native suppression, Modal focus trap + ESC + focus restoration. None of these were affected by Plan 01-05 (backend-only change, no frontend modifications).

### Gaps Summary

**No gaps remain.** Both BL-01 and BL-02 are closed with live runtime evidence (TestClient round-trip + Python introspection). All four ROADMAP success criteria are now fully verified, all four phase requirements (SEC-01, CONV-01, CONV-02, CONV-03) are SATISFIED. The phase goal — "User can manage conversations from the sidebar (delete, rename, search) on a storage layer that rejects malformed conversation IDs at the boundary" — is achieved end-to-end.

Status flips from `gaps_found` (3/4 with caveats) to `human_needed` (4/4 verified, awaiting live browser smoke for 8 UX items). The `human_verification` items are unchanged from the initial verification and are not blocked by code review — they require a live browser session that the verifier cannot perform programmatically.

---

*Initial verification: 2026-05-09 (status: gaps_found, score: 3/4 with caveats)*
*Re-verified: 2026-05-09 (status: human_needed, score: 4/4) — after Plan 01-05 closed BL-01 + BL-02*
*Verifier: Claude (gsd-verifier)*
