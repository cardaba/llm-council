---
phase: 01-hardening-conversation-management
plan: 01
subsystem: api
tags: [security, fastapi, uuid-validation, path-traversal, storage]

# Dependency graph
requires: []
provides:
  - "UUID validation at storage boundary in get_conversation_path()"
  - "delete_conversation(id) helper in backend/storage.py (consumed by Plan 02 DELETE endpoint)"
  - "ValueError → HTTPException(400, 'Invalid conversation ID') translation in 3 existing handlers"
affects:
  - "Phase 01 Plan 02 (DELETE /api/conversations/{id}) — inherits validation via delete_conversation"
  - "Phase 01 Plan 03 (PATCH /api/conversations/{id}) — must replicate the try/except pattern on its new handler"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline try/except ValueError → HTTPException(400) per handler (over Annotated[UUID] which yields 422)"
    - "Storage-raises-main-translates: storage layer raises ValueError; HTTP layer maps to 400"

key-files:
  created: []
  modified:
    - backend/storage.py
    - backend/main.py

key-decisions:
  - "UUID validation uses inline uuid.UUID() in storage.py (not Pydantic Annotated[UUID]) so we get 400 not 422 (RESEARCH §Pitfall 1, D-13/D-14)"
  - "Accept any UUID version (v1-v5) and any case/format the stdlib parser accepts; SEC-01 spirit is 'reject non-UUID', not 'reject non-v4' (RESEARCH §Pitfall 2/3)"
  - "delete_conversation() lets FileNotFoundError propagate; the future DELETE handler in Plan 02 will translate it to 404 (consistent with the codebase's storage-raises-main-translates convention)"
  - "No defense-in-depth os.path.abspath(p).startswith(DATA_DIR) added — UUID validation alone covers SEC-01 because no parseable UUID contains /, \\ or .."

patterns-established:
  - "Inline UUID validation pattern: storage validates at path-builder, raises ValueError; each FastAPI handler wraps storage calls in try/except ValueError → HTTPException(400)"

requirements-completed: [SEC-01]

# Metrics
duration: 18min
completed: 2026-05-09
---

# Phase 01 Plan 01: Vuln 2 Path-Traversal Hardening Summary

**UUID validation at storage boundary using `uuid.UUID()` plus inline `try/except ValueError → HTTPException(400)` in the three existing `{conversation_id}` handlers; `delete_conversation()` helper added for Plan 02 to consume.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-09T10:11:52Z (execution start)
- **Completed:** 2026-05-09T10:30:00Z (approx)
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Vulnerability 2 (path traversal via unvalidated `conversation_id`) closed at the storage layer.
- `backend/storage.py` now imports `uuid` and validates every path construction via `uuid.UUID(conversation_id)`.
- New helper `delete_conversation(id)` exported, ready for Plan 02 to wire up the `DELETE` endpoint.
- The three existing handlers (`get_conversation`, `send_message`, `send_message_stream`) translate `ValueError` from storage into `HTTPException(status_code=400, detail="Invalid conversation ID")`.
- 404 behaviour for valid-but-missing UUIDs preserved unchanged.

## Task Commits

1. **Task 1.1: UUID validation in storage.py + delete_conversation helper** — `7caf2fe` (feat)
2. **Task 1.2: Translate ValueError to HTTP 400 in conversation_id handlers** — `2064bb8` (feat)

_The plan-metadata commit (this SUMMARY + STATE/ROADMAP updates) follows below._

## Files Created/Modified

- `backend/storage.py` — added `import uuid`; `get_conversation_path` now calls `uuid.UUID(conversation_id)` raising `ValueError` on malformed input; new `delete_conversation(conversation_id)` helper (delegates UUID validation to the path builder, lets `FileNotFoundError` propagate).
- `backend/main.py` — wrapped `storage.get_conversation()` calls in three handlers (`get_conversation`, `send_message`, `send_message_stream`) with `try/except ValueError → HTTPException(400, "Invalid conversation ID")`. The 404-on-missing branch is unchanged.

## Decisions Made

- **Inline pattern over Pydantic `Annotated[UUID]`** — RESEARCH §Pitfall 1 documents that `Annotated[UUID]` produces 422; SEC-01 mandates 400. Inline `try/except` is the only path that gives the explicit status code without a global `RequestValidationError` handler.
- **No version pinning to v4** — `uuid.UUID()` accepts v1/v3/v4/v5; rejecting non-v4 would be security theatre because the backend always generates v4 internally and any v1/v5 attacker would simply 404 on a missing file.
- **No `abspath().startswith(DATA_DIR)` defense-in-depth** — RESEARCH §Alternatives explicitly leaves this optional; UUID validation is sufficient because no parseable UUID contains path-sensitive characters.
- **`delete_conversation()` does not pre-check existence** — idiomatic Python is `try os.remove except FileNotFoundError`; the handler in Plan 02 will translate the exception. Avoids TOCTOU race and stays consistent with the storage-raises-main-translates convention.

## Deviations from Plan

None — plan executed exactly as written. All grep-based and behavioural acceptance criteria pass.

## Issues Encountered

### Background server stale-code while running curl smoke tests

- **What happened:** First round of curl tests against `127.0.0.1:8001` returned 404 instead of 400 for invalid UUIDs. Diagnosed as a stale uvicorn process from before Task 1.2 edits; uvicorn was launched without `--reload`, so the running interpreter held a snapshot of `main.py` from before the edits.
- **Resolution:** Killed the stale `python` processes via PowerShell `Stop-Process` and restarted `uv run python -m backend.main`. Reran the full curl matrix; all behavioural assertions then passed.
- **Lesson:** Future plans that run a long-lived backend during execution should kill and restart it after every `main.py`/`storage.py` edit, or run uvicorn with `--reload` (out of scope here).

### Path-traversal curl with URL-encoded slashes returns 404, not 400

- **What happened:** The plan's smoke test `curl 'http://127.0.0.1:8001/api/conversations/..%2F..%2Fetc%2Fpasswd'` returned `404 Not Found` (`{"detail":"Not Found"}` from Starlette's default 404 handler), not `400 Invalid conversation ID`.
- **Why:** Uvicorn/Starlette normalises `..%2F..%2F...` at the routing layer **before** the path param reaches the handler. After normalisation the request no longer matches `/api/conversations/{id}` so it falls through to the framework's catch-all 404. The ValueError translation in the handler is never reached because the handler is never reached.
- **Security impact:** None. The objective of SEC-01 is "input must not reach the filesystem". URL-encoded slashes never reach the handler **and** never reach `os.path.join` — defence-in-depth at the framework level. The filesystem is untouched in either status code path.
- **Verified equivalents that DO reach the handler and DO return 400:**
  - `curl http://127.0.0.1:8001/api/conversations/not-a-uuid` → **400** ✓
  - `curl http://127.0.0.1:8001/api/conversations/..%5C..%5Cetc%5Cpasswd` (encoded backslashes) → **400** ✓
  - `curl -X POST .../not-a-uuid/message` → **400** ✓
  - `curl -X POST .../not-a-uuid/message/stream` → **400** ✓
- **Decision:** Accept the framework-level 404 for slash-bearing inputs. Documenting it here so a future test suite or auditor reading the plan does not interpret the 404 as a SEC-01 regression.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `delete_conversation()` is exported and unit-verified; Plan 02 can wire `@app.delete("/api/conversations/{conversation_id}")` directly using the same try/except pattern (`ValueError → 400`, `FileNotFoundError → 404`).
- `update_conversation_title()` was intentionally not modified in this plan; Plan 03's PATCH handler can reuse it as-is plus the same try/except wrapper.
- `backend/main.py` now has the canonical 3-handler reference for the validation pattern that Plans 02 and 03 must replicate.

## Self-Check: PASSED

Verified the following before declaring complete:

- File `backend/storage.py` exists, contains `import uuid`, `uuid.UUID(conversation_id)`, `def delete_conversation`, `os.remove(path)`. Grep counts: `import uuid` ≥ 1 ✓, `uuid.UUID(conversation_id)` ≥ 1 ✓, `def delete_conversation` == 1 ✓, `os.remove(path)` ≥ 1 ✓, `abspath` == 0 ✓ (no defense-in-depth as required).
- File `backend/main.py` exists, contains exactly 3 `HTTPException(status_code=400, ...)` raises (verified via AST walker), 3 `except ValueError:` blocks, 0 `Annotated[UUID` usages, 0 `@app.exception_handler` registrations.
- Behavioural smoke test against running server: invalid UUID GET → 400 ✓, valid-but-missing UUID GET → 404 ✓, invalid UUID POST `/message` → 400 ✓, invalid UUID POST `/message/stream` → 400 ✓, fresh-create + GET round-trip → 200 ✓.
- Commits found in `git log`: `7caf2fe` ✓, `2064bb8` ✓.

---
*Phase: 01-hardening-conversation-management*
*Plan: 01*
*Completed: 2026-05-09*
