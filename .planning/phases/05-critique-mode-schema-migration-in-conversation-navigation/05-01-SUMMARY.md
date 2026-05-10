---
phase: 05
plan: 01
subsystem: storage / api
tags: [schema-migration, storage, persistence, wave-0, safety-net]
requires: []
provides:
  - storage.SCHEMA_VERSION_V2
  - storage.migrate_message_v1_to_v2
  - storage._migrate_conversation_if_needed
  - storage.create_conversation(mode=)
  - storage.add_assistant_message(external_research=)
  - storage.list_conversations[mode]
  - main.CreateConversationRequest(mode)
affects:
  - backend/storage.py
  - backend/main.py
tech-stack:
  added: []
  patterns:
    - lazy-migration-no-write-back
    - opaque-optional-kwarg-mirroring-metadata-stage4
    - pydantic-literal-validation
key-files:
  created: []
  modified:
    - backend/storage.py (lines 1-9, 51-122, 124-148, 156-176, 224-247)
    - backend/main.py (lines 29-39, 73-86)
decisions:
  - "D-04 LOCKED: inline JSON storage with lazy migration; sidecar deferred to v2.1"
  - "external_research kwarg is opaque (Optional[Dict[str, Dict[str, Any]]]) and follows the metadata/stage4 idiom — does NOT change positional signature"
  - "create_conversation handler accepts CreateConversationRequest() default so missing JSON body keeps v1 callers green"
metrics:
  duration_minutes: ~12
  tasks: 2
  files_modified: 2
  commits: 2
completed: 2026-05-10
---

# Phase 05 Plan 01: Schema-Migration Safety Net Summary

Land the Wave 0 schema migration helpers so every v1.0 conversation continues to load via `get_conversation` without raising, and every new write stamps `schema_version: 2` and `mode` at the root. `add_assistant_message` gains an opaque `external_research` kwarg following the existing `metadata`/`stage4` idiom; the create-conversation endpoint accepts a new optional `mode` field driven by a Pydantic `Literal["fresh","critique"]`.

## Migration Helper Signatures (verbatim from backend/storage.py)

```python
SCHEMA_VERSION_V2 = 2

def migrate_message_v1_to_v2(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotent. Assistant messages gain metadata={} if missing.
    User messages pass through unchanged."""

def _migrate_conversation_if_needed(conv: Dict[str, Any]) -> Dict[str, Any]:
    """Apply v1→v2 migration lazily on read. Idempotent.
    Stamps schema_version=2 + mode='fresh' default + migrates each message.
    File on disk is NOT rewritten — lazy forever."""

def create_conversation(
    conversation_id: str,
    mode: Literal["fresh", "critique"] = "fresh",
) -> Dict[str, Any]:
    """Stamps schema_version=2 + mode + created_at at root."""

def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
    stage4: Optional[Dict[str, Any]] = None,
    external_research: Optional[Dict[str, Dict[str, Any]]] = None,
):
    """external_research lands as message['external_research'] when not None."""
```

```python
# backend/main.py
class CreateConversationRequest(BaseModel):
    mode: Literal["fresh", "critique"] = "fresh"
```

## Storage Decision Lock Confirmation

The inline-vs-sidecar decision is **LOCKED to inline JSON + 750KB Pydantic cap** per CONTEXT.md D-04, RESEARCH.md §3, and STATE.md "Decisiones diferidas a plan-time". The sidecar option is deferred to v2.1 (REQUIREMENTS.md `PERS-V2-XX`). No deviation taken in this plan.

## v1.0 Conversation Compatibility

- The `data/conversations/` directory does not exist in this worktree (gitignored). The repo carries **0 v1.0 conversation files** to migrate locally.
- The lazy-migration path was verified with a synthetic v1 file in a temp directory: `get_conversation` returns a dict carrying `schema_version: 2` and `mode: "fresh"`, while the on-disk file's SHA-256 is byte-identical before and after the read. See verification §3 below.
- Production / dev workstation copies of `data/conversations/` (any v1.0 files there) will continue to load post-deploy without raising; the first subsequent `add_user_message` or `add_assistant_message` flushes the v2 shape back organically.

## Files Modified

### backend/storage.py
- Lines 7-12: imports extended with `Literal`; added `SCHEMA_VERSION_V2 = 2` constant
- Lines 51-87: new `migrate_message_v1_to_v2` (idempotent single-message helper)
- Lines 90-106: new `_migrate_conversation_if_needed` (idempotent conversation-level helper, lazy no-write-back)
- Lines 109-141: `create_conversation` signature extended with `mode` kwarg; dict body stamps `schema_version` and `mode`
- Lines 136-148 (read path): `get_conversation` wraps the loaded dict through `_migrate_conversation_if_needed` (NO `save_conversation` call inside)
- Lines 175-176: `list_conversations` appends `"mode": data.get("mode", "fresh")` to each item
- Lines 224-247: `add_assistant_message` signature extended with `external_research` kwarg; conditional write into `message["external_research"]`

### backend/main.py
- Lines 29-39: `CreateConversationRequest` extended with `mode: Literal["fresh","critique"] = "fresh"`
- Lines 73-86: handler signature defaults `request` to `CreateConversationRequest()` (so empty body still works); call site threads `mode=request.mode` to `storage.create_conversation`

## Verification Performed

1. **Imports / SCHEMA_VERSION_V2 round-trip** — `uv run python -c "from backend.storage import SCHEMA_VERSION_V2, migrate_message_v1_to_v2, _migrate_conversation_if_needed, create_conversation, get_conversation, add_assistant_message, list_conversations; assert SCHEMA_VERSION_V2 == 2"` → OK
2. **Migration helper unit tests (inline Python from Task 1 verify block)** — user pass-through, assistant gains `metadata={}`, idempotency on already-migrated messages and conversations → all OK
3. **Lazy-migration disk-mutation guarantee** — wrote a synthetic v1 file in a temp `DATA_DIR`, snapshotted SHA-256, called `get_conversation`, re-snapshotted SHA-256: identical hashes confirmed file is byte-stable.
4. **End-to-end storage integration** — fresh + critique creation, `mode` reads back from disk, `list_conversations` returns sorted `['critique','fresh']`, `add_assistant_message` with `external_research` lands it verbatim, omitting the kwarg leaves the key absent → OK
5. **CreateConversationRequest** — default `mode == 'fresh'`, `CreateConversationRequest(mode='critique').mode == 'critique'`, `CreateConversationRequest(mode='invalid')` raises `ValidationError` → all OK
6. **Backend module loads** — `from backend import main` succeeds without import errors → OK

## Acceptance Criteria Grep Results

All Task 1 acceptance criteria satisfied:
- `SCHEMA_VERSION_V2 = 2` present (backend/storage.py:12)
- `def migrate_message_v1_to_v2(` present (backend/storage.py:51)
- `def _migrate_conversation_if_needed(` present (backend/storage.py:69)
- `_migrate_conversation_if_needed(conv)` invoked inside `get_conversation` body (backend/storage.py:148, after `json.load`)
- `save_conversation(` does NOT appear inside `get_conversation` body (lines 126-148) — verified by grep + visual inspection
- `mode: Literal["fresh", "critique"]` in `create_conversation` signature (backend/storage.py:110)
- `"schema_version": SCHEMA_VERSION_V2` in `create_conversation` dict body (backend/storage.py:127)
- `external_research: Optional[Dict[str, Dict[str, Any]]] = None` in `add_assistant_message` signature (backend/storage.py:232)
- `message["external_research"] = external_research` guarded by `if external_research is not None` (backend/storage.py:289-290)
- `"mode": data.get("mode", "fresh")` in `list_conversations` append (backend/storage.py:175)

All Task 2 acceptance criteria satisfied:
- `class CreateConversationRequest(BaseModel):` present (backend/main.py:29)
- `mode: Literal["fresh", "critique"] = "fresh"` present (backend/main.py:39)
- `storage.create_conversation(...)` call threads `mode=request.mode` (backend/main.py:85)
- Pydantic `Literal` validation rejects `mode='invalid'` with `ValidationError`
- Default `CreateConversationRequest()` has `mode == 'fresh'`

## Commits

- `2fc370e` — feat(05-01): add schema v2 migration helpers + mode field to storage
- `0046684` — feat(05-01): extend CreateConversationRequest with mode field

## Known Stubs

None. All wiring is functional; the `mode="critique"` value is accepted, stamped, persisted, and round-tripped through `list_conversations`. Wave 1 plans consume this contract directly.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-01-SUMMARY.md` FOUND
- Commit `2fc370e` FOUND in git log
- Commit `0046684` FOUND in git log
- `backend/storage.py` modifications FOUND (migration helpers + signature changes)
- `backend/main.py` modifications FOUND (`CreateConversationRequest.mode` + handler threading)
