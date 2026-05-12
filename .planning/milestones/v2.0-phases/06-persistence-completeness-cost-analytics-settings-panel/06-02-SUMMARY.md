---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 02
subsystem: backend-persistence
tags: [persistence, metadata, sse, hydration, stage2]
requires:
  - backend/main.py fresh-streaming branch (lines 277-326)
  - backend/storage.py opaque metadata contract (line 268)
  - stage2_collect_rankings local variables (label_to_model, aggregate_rankings)
provides:
  - PERS-01 (persist label_to_model + aggregate_rankings on fresh fast/quality)
  - PERS-02 (reload hydrates de-anonymized Stage 2 tabs end-to-end)
affects:
  - frontend/src/components/MessageHeader.jsx (consumer of metadata.profile chain — no code change, just stops hitting "Quality (legacy)" fallback for new conversations)
  - frontend/src/components/Stage2.jsx (consumer of metadata.label_to_model — no code change)
tech-stack:
  added: []
  patterns:
    - Direct dict-pack analog of critique branch (main.py:511-516)
    - SSE event uses same dict reference that was persisted — keeps wire shape identical to pre-Phase-6 behavior on fresh-streaming branch (per RESEARCH §Pattern G)
key-files:
  created:
    - .planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-02-SUMMARY.md
  modified:
    - backend/main.py
decisions:
  - Mirrored critique-branch ordering (label_to_model before aggregate_rankings) so all three persisted-metadata sites (QR, fresh-streaming, critique) read consistently when diffing main.py
  - Did NOT add `mode` key to fresh-streaming (unlike critique branch); fresh path keeps profile/models/chairman as its mode discriminator per D-25
  - Did NOT change add_assistant_message signature; opaque-metadata contract at storage.py:268 absorbs new keys verbatim
metrics:
  duration_minutes: 4
  tasks_completed: 1
  tasks_deferred: 1
  files_modified: 1
  lines_changed: 6
  completed_date: 2026-05-10T23:48:09Z
---

# Phase 06 Plan 02: Persist Stage 2 Metadata on Fresh-Streaming Summary

Closed the PERS-01/PERS-02 hydration gap by packing `label_to_model` and `aggregate_rankings` into the fresh-streaming branch's `message_metadata` dict — a 6-line, signature-stable analog of the Phase 5 critique-branch pattern at `backend/main.py:511-516`.

## What Changed

### `backend/main.py:307-313` — fresh-streaming `message_metadata` pack

Before (3 keys):
```python
message_metadata = {
    "profile": request.profile,
    "models": council_models,
    "chairman": chairman_model,
}
```

After (5 keys):
```python
message_metadata = {
    "profile": request.profile,
    "models": council_models,
    "chairman": chairman_model,
    "label_to_model": label_to_model,
    "aggregate_rankings": aggregate_rankings,
}
```

The local variables `label_to_model` (from `stage2_collect_rankings` at line 284) and `aggregate_rankings` (from `calculate_aggregate_rankings` at line 285) were already in scope — no new computation, no new imports.

A 4-line comment block above the dict was added to document WHY (Phase 6 PERS-01) and point at the analog branch.

### `backend/storage.py` — unchanged

`add_assistant_message`'s opaque-`metadata`-dict contract (line 268: `message["metadata"] = metadata`) absorbs the two new keys verbatim. No schema_version bump (PERS-03 unchanged), no signature delta.

### `backend/main.py:330` — SSE `message_metadata` emit

Same dict reference (`message_metadata`) is sent down the wire. The frontend reducer already drains the full dict into `currentMessage.metadata` (per Phase 5 wiring + RESEARCH §Pattern G), so no protocol change and no frontend code change.

## Tasks

### Task 1 — Pack label_to_model + aggregate_rankings into fresh-streaming metadata — DONE

- **Commit:** `8869dd0` — feat(06-02): persist label_to_model + aggregate_rankings in fresh-streaming metadata
- **Files:** `backend/main.py`
- **Verification:**
  - `grep "\"label_to_model\": label_to_model" backend/main.py` → 2 hits (lines 311 fresh-streaming + 518 critique) ✓
  - `grep "\"aggregate_rankings\": aggregate_rankings" backend/main.py` → 2 hits (lines 312 fresh-streaming + 519 critique) ✓
  - `python -c "import ast, pathlib; ast.parse(pathlib.Path('backend/main.py').read_text())"` → exit 0 ✓
  - `storage.add_assistant_message` call at line 316-322 unchanged (same positional + same `metadata=` kwarg) ✓
- **Acceptance criteria:** All four met.

### Task 2 — End-to-end hydration smoke test — DEFERRED to post-merge human verification

This task is explicitly described in the plan as a **manual smoke test (no code change)** requiring:
1. Running `uv run python -m backend.main` + `npm run dev` (live servers)
2. Browser interaction with the Quality dial + textarea
3. Live OpenRouter API calls (real money cost, requires `OPENROUTER_API_KEY`)
4. Inspecting a freshly-written JSON file in `data/conversations/` (gitignored directory)
5. UI reload validation

The parallel-executor worktree has **no running servers, no browser, no committed `data/conversations/`, and cannot make API calls on the user's behalf**. The plan's "automated" verify line (`ls data/conversations/*.json | head -1 | xargs ...`) only works **after** the human has executed the 11 manual UI steps that produce a fresh-Quality conversation.

**Why this is safe to defer:** The Task 1 change is a 2-line dict-pack that mirrors the proven critique-branch pattern (`main.py:511-516`) which has been hydrating Stage 2 successfully since Phase 5 (verified by `05-VERIFICATION.md`). The semantic delta is null — the wire shape of `message_metadata` is already what the frontend reducer expects; the only change is that two keys which previously existed **only on the wire** now also live in the persisted file. The risk surface is "did Python `dict` accept two new keys" — which `ast.parse` proves it did.

**Conversation ID for downstream plans:** N/A — to be recorded when the human runs the smoke test post-merge. Plans 03/04/06 can use any fresh-Quality conversation produced after this commit lands on master.

## Deviations from Plan

None — Task 1 executed exactly as specified; Task 2 deferred for the structural reason documented above (worktree cannot run manual UI smoke tests). No Rule 1-3 auto-fixes triggered.

## Threat Flags

None. The change persists data the SSE event already sends down the wire; no new network endpoint, no new auth surface, no schema-boundary change.

## Known Stubs

None.

## Self-Check: PASSED

- `backend/main.py` line 311-312: `label_to_model` + `aggregate_rankings` keys present ✓ (verified by grep)
- `backend/main.py` line 316-322: `add_assistant_message` signature unchanged ✓ (visual diff)
- Python AST parse: PASSED ✓
- Commit `8869dd0`: present in `git log --oneline -3` ✓
- `.planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-02-SUMMARY.md`: written ✓
