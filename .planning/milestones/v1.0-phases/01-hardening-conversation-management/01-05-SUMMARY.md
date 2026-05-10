---
phase: 01-hardening-conversation-management
plan: 05
subsystem: backend/storage + backend/main
tags:
  - hardening
  - storage
  - error-handling
  - uuid
  - gap-closure
gap_closure: true
closes_gaps:
  - BL-01
  - BL-02
requirements:
  - SEC-01
  - CONV-02
dependency_graph:
  requires:
    - 01-01-SUMMARY.md (UUID validation at storage boundary; this plan extends it)
    - 01-02-SUMMARY.md (DELETE handler ValueError -> 400 / FileNotFoundError -> 404 pattern)
    - 01-03-SUMMARY.md (PATCH handler shape that this plan hardens)
  provides:
    - storage.ConversationNotFoundError (domain exception for missing-file)
    - canonical UUID -> filename mapping (BL-02 closed)
    - PATCH handler 404 on TOCTOU (BL-01 closed)
    - SSE error event with `kind: 'not_found'` (BL-01 closed in streaming path)
  affects:
    - frontend/src/api.js (no change required; existing PATCH error handling already trips on non-OK responses)
    - frontend/src/App.jsx (no change required; SSE consumer treats unknown kinds as generic errors)
tech-stack:
  added: []
  patterns:
    - "Domain-specific exception class at storage boundary to disambiguate 400 vs 404 (vs collapsing both into ValueError)"
    - "UUID canonicalisation via str(uuid.UUID(id)) before path construction"
    - "Multi-except in SSE generator with structured `kind` field for client-side disambiguation"
key-files:
  created: []
  modified:
    - backend/storage.py
    - backend/main.py
decisions:
  - "Introduced ConversationNotFoundError as a domain exception rather than the minimum-fix `except ValueError -> 404` because the storage layer raised ValueError for two distinct conditions (invalid UUID and missing file); a future caller could mis-translate. The 5-line class cost is justified by the contract clarity."
  - "Canonicalised at get_conversation_path (single chokepoint) rather than inside each mutator; one place to change, no risk of asymmetric round-trip."
  - "SSE error event for the missing-file race uses `kind: 'not_found'` (structured) so the frontend can disambiguate without parsing the message string. Generic transport/generation errors keep the original shape."
  - "Did not modify the non-streaming send_message handler at backend/main.py:90-134 — its unwrapped mutator calls would now raise ConversationNotFoundError (still a 500). Out of scope per VERIFICATION.md gap definition (BL-01 was scoped to PATCH and the streaming path); tracked under Deferred Issues for a future hardening pass."
metrics:
  duration: ~12 min
  completed_date: 2026-05-09
  tasks: 2
  files_changed: 2
  insertions: 32
  deletions: 19
---

# Phase 01 Plan 05: Gap Closure (BL-01 + BL-02) Summary

Closes the two BLOCKER gaps from `01-VERIFICATION.md` / `01-REVIEW.md` so Phase 1 can flip from `gaps_found` to `verified`: PATCH on a deleted conversation now returns 404 (not 500) and braced/URN/unhyphenated UUID forms now round-trip GET/PATCH/DELETE because the on-disk filename is always canonicalised.

## What Shipped

**Task 1 — `backend/storage.py` (commit `bbb4120`):**

- New exception class `ConversationNotFoundError(Exception)` with a docstring documenting *why* it exists (resolves the ValueError ambiguity between "invalid UUID -> 400" and "missing file -> 404"). Placed between `from .config import DATA_DIR` and `ensure_data_dir()`.
- `get_conversation_path` body rewritten: `canonical = str(uuid.UUID(conversation_id))` then `os.path.join(DATA_DIR, f"{canonical}.json")`. Docstring updated to document the canonicalisation contract (any parseable UUID form maps to the same canonical hyphenated lowercase file). The `ValueError` raised by `uuid.UUID()` for invalid input is preserved — SEC-01's 400 contract is intact.
- Three `raise ValueError(f"Conversation {conversation_id} not found")` statements replaced with `raise ConversationNotFoundError(conversation_id)` inside `add_user_message`, `add_assistant_message`, and `update_conversation_title`.

`delete_conversation` (FileNotFoundError) and `get_conversation` (returns None) were intentionally NOT changed — they already feed the 404 path correctly through their existing contracts.

**Task 2 — `backend/main.py` (commit `f4d37dc`):**

- PATCH `/api/conversations/{id}` handler: `storage.update_conversation_title(...)` is now wrapped in `try/except storage.ConversationNotFoundError -> HTTPException(404)`. Docstring updated: the second try/except is the TOCTOU-race handler. The pre-existing `try: get_conversation except ValueError -> 400` still gates invalid-UUID inputs.
- `event_generator` (streaming `send_message_stream`): a dedicated `except storage.ConversationNotFoundError` branch is inserted **before** the generic `except Exception as e`, emitting a structured SSE event:
  ```json
  {"type": "error", "kind": "not_found", "message": "Conversation not found"}
  ```
  This lets the frontend disambiguate the race from transport/generation errors without parsing the message string. The generic catch-all is unchanged.

The DELETE, GET, list, and POST/message handlers are untouched (already correct or out of scope per VERIFICATION.md).

## Contract Now in Effect

| Storage condition | Storage raises | main.py translates to | HTTP |
|---|---|---|---|
| Input is not a parseable UUID | `ValueError` (from `uuid.UUID()`) | `HTTPException(400, "Invalid conversation ID")` | 400 |
| File does not exist (initial check) | `get_conversation` returns `None` | `HTTPException(404, "Conversation not found")` | 404 |
| File deleted between check and write | `ConversationNotFoundError` | `HTTPException(404, "Conversation not found")` | 404 |
| `delete_conversation` on missing file | `FileNotFoundError` (from `os.remove`) | `HTTPException(404, "Conversation not found")` | 404 |

For the streaming SSE path, the file-deleted-mid-stream case yields `{"type":"error","kind":"not_found",...}` instead of a generic error event.

## How `main.py` Consumes the New Exception

The PATCH handler now follows the same shape as the DELETE handler from Plan 02 (Wave 2 baseline): one chained translation per failure mode. The streaming generator extends the same idea with a typed SSE payload. Future handlers that call `storage.add_user_message`, `storage.add_assistant_message`, or `storage.update_conversation_title` need only:

```python
try:
    storage.update_conversation_title(conversation_id, title)
except storage.ConversationNotFoundError:
    raise HTTPException(status_code=404, detail="Conversation not found")
```

No `except ValueError` is needed at the mutator call site because UUID validation already happened upstream (either via `get_conversation` or directly via `get_conversation_path`).

## Deviations from Plan

None. Both tasks executed exactly as specified. No deviation rules triggered.

## Deferred Issues

Per `01-VERIFICATION.md` gap scope, the following are intentionally **out of scope** for this plan and remain deferred:

- **Non-streaming `send_message` handler (`backend/main.py:90-134`)** — still has unwrapped storage mutator calls (`add_user_message`, `update_conversation_title`, `add_assistant_message`). After this plan, those calls now raise `ConversationNotFoundError` directly to FastAPI, producing a 500 response on TOCTOU. The streaming variant is the primary path used by the SPA, so the user-visible behaviour is fixed; the non-streaming path is exercised only if the SSE path is unavailable. Track for a future hardening pass if the non-streaming path is reactivated.
- **WR-01 through WR-07** from `01-REVIEW.md` (D-10 affordance count, redundant 204 check, Menu ESC stopPropagation, conversations.find timing race, content cache staleness, title length cap, Modal initialFocus prop) — all classified as non-blocking in `01-VERIFICATION.md` and deferrable to Phase 4 polish.
- **IN-01 through IN-05** from `01-REVIEW.md` (filter duplication, Menu Tab trap, useMemo dep redundancy, Modal aria-labelledby uniqueness, DELETE handler `return None` style noise) — informational only; deferred to Phase 4 polish.

## Verification

All four verification scripts from `01-05-PLAN.md <verification>` pass:

1. **BL-02 round-trip:** `get_conversation_path` returns the same canonical path for hyphenated, braced, URN, and unhyphenated forms. Verified.
2. **BL-01 PATCH 404 on TOCTOU:** create conversation → `os.remove(path)` → PATCH returns 404 (not 500). Verified via FastAPI TestClient.
3. **No regression of 400/404/204 contract:** GET/PATCH/POST/DELETE on `not-a-uuid` → 400; GET/PATCH/DELETE on never-created canonical UUID → 404; DELETE on existing → 204 + file removed. All verified.
4. **No silent feature creep:** `git diff HEAD~2 --stat` shows only `backend/storage.py` (+18/-11) and `backend/main.py` (+9/-5); no frontend changes.

Acceptance-criteria grep counts (re-checked post-commit):

| Pattern | File | Expected | Observed |
|---|---|---|---|
| `class ConversationNotFoundError` | `backend/storage.py` | 1 | 1 |
| `raise ConversationNotFoundError` | `backend/storage.py` | 3 | 3 |
| `raise ValueError(f"Conversation .* not found")` | `backend/storage.py` | 0 | 0 |
| `canonical = str(uuid.UUID(conversation_id))` | `backend/storage.py` | 1 | 1 |
| `f"{conversation_id}.json"` | `backend/storage.py` | 0 | 0 |
| `except storage.ConversationNotFoundError` | `backend/main.py` | 2 | 2 |
| `'kind': 'not_found'` | `backend/main.py` | 1 | 1 |
| Order in `event_generator`: `ConversationNotFoundError` before `Exception as e` | `backend/main.py` | true | true (line 197 < line 199) |
| DELETE handler unchanged (`return None  # 204 No Content; FastAPI elides the body`) | `backend/main.py` | preserved | preserved |

App imports cleanly (`uv run python -c "from backend.main import app"` exits 0).

## Commits

| Task | Hash | Type | Message |
|---|---|---|---|
| 1 | `bbb4120` | feat | `feat(01-05): add ConversationNotFoundError and canonicalise UUID path in storage` |
| 2 | `f4d37dc` | feat | `feat(01-05): translate ConversationNotFoundError to HTTP 404 in PATCH and SSE handlers` |

## Self-Check: PASSED

- `backend/storage.py`: FOUND
- `backend/main.py`: FOUND
- Commit `bbb4120`: FOUND in `git log`
- Commit `f4d37dc`: FOUND in `git log`
- Verification scripts 1-4 (PLAN.md `<verification>` block): all printed `OK`
- Acceptance-criteria grep counts: all match expected
- No frontend files modified: confirmed via `git diff HEAD~2 --stat`

---

*Executed: 2026-05-09*
*Executor: Claude (gsd-execute-phase, sequential mode)*
