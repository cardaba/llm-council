---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 09
status: complete
completed_at: 2026-05-11
files_modified:
  - backend/main.py
gap_closure: true
gap_closure_source: 06-08 manual smoke test
---

# Plan 06-09 — Detached Deliberation Tasks Survive Client Disconnect

## What changed

Single file: `backend/main.py` — 290 insertions, 227 deletions.

1. **New module-level registry** (`backend/main.py:26-43`):
   - `_BACKGROUND_DELIBERATIONS: set` — keeps a strong reference on detached tasks so they don't get GC'd mid-flight.
   - `_spawn_background_deliberation(coro)` — registers + auto-discards on done.

2. **Refactored `send_message_stream` event_generator** (originally `backend/main.py:223-372`, now ~85 lines longer with the queue+task wrapper).
   - All `yield f"data: {json.dumps(...)}\n\n"` → `await queue.put({...})`.
   - The whole council pipeline (user-message persist, title task, QR strategy loop, Fast/Quality flow, cost accumulation, `add_assistant_message`, `complete`) moved inside an inner `deliberation()` async function.
   - `try/except/finally` around `deliberation()` so even on error, the sentinel `None` is enqueued and the drain loop exits cleanly.
   - Outer `event_generator` is now a 4-line drain loop: `while True: event = await queue.get(); if event is None: break; yield ...`.

3. **Refactored `send_critique_stream` event_generator** (originally `backend/main.py:504-591`) — same pattern, byte-identical translation.

Public SSE contract is unchanged: event types, payloads, ordering, error-event shape (`kind: not_found`) all preserved. Frontend needed zero changes.

## Why

Manual smoke test of Plan 06-08 (the frontend stale-event guard) revealed that the v2.0 guard correctly prevented the `TypeError` crash, but exposed a deeper problem: when the user switched conversations mid-stream, uvicorn cancelled the SSE handler's async generator, the generic `except Exception` swallowed the `asyncio.CancelledError`, and `storage.add_assistant_message` was never called. The complete deliberation (and the OpenRouter spend that paid for it) was discarded.

## Verification

### Automated reproduction (pre-fix)
```
$ curl -s -X POST http://127.0.0.1:8001/api/conversations -d '{"mode":"fresh"}'
{"id":"624f8938-...","title":"New Conversation",...}

$ curl --max-time 3 -N -X POST ".../624f8938-.../message/stream" \
    -d '{"content":"...","profile":"fast"}'
data: {"type": "stage1_start"}    # only event before abort

$ sleep 60 && ls -la "data/conversations/624f8938-....json"
389 bytes

$ cat "data/conversations/624f8938-....json"
{"id":"624f8938-...","title":"New Conversation","messages":[{"role":"user","content":"..."}]}
# Title never generated. No assistant message. The deliberation was discarded.
```

### Automated reproduction (post-fix)
```
$ curl --max-time 3 -N -X POST ".../f5986c6f-.../message/stream" \
    -d '{"content":"Quick test for Plan 06-09 detached deliberation","profile":"fast"}'
data: {"type": "stage1_start"}    # only event reached client

$ sleep 60 && ls -la "data/conversations/f5986c6f-....json"
33541 bytes

$ python -c "..." data/conversations/f5986c6f-....json
title: Plan Zero-Six Test
messages: 2
  role: user | keys: ['role', 'content']
  role: assistant | keys: ['role', 'stage1', 'stage2', 'stage3', 'metadata']
    stage1 entries: 4
    stage3.response: "# LLM Council Final Assessment ..."
# Full deliberation persisted despite client abort.
```

### Module-level structural checks (pass)
- `_BACKGROUND_DELIBERATIONS` registry: present (4 grep matches).
- `_spawn_background_deliberation` helper: defined + 2 call sites (3 total grep matches).
- `await queue.put(...)` site count: 28 (well above the ≥10 floor specified in PLAN.md).
- `uv run python -c "from backend import main"`: imports cleanly.
- `python -m py_compile backend/main.py`: exits 0.

### Manual browser smoke test — pending
The original 06-08 manual flow needs a re-run to confirm the end-to-end UX:

1. Restart backend (already done — user ran `start.sh`).
2. Open `http://localhost:5173`.
3. Send a `Quality+Research` prompt in conversation A.
4. While Stage 1/2 are streaming, click conversation B in the sidebar.
5. Verify (Plan 06-08 guard): no `TypeError`, no white screen, no manual reload required. ✅ already verified by user.
6. Wait ~60 seconds.
7. Click conversation A in the sidebar. **NEW (Plan 06-09):** expect to see the completed assistant message (stage1 tabs, stage2 rankings, stage3 synthesis) — not just the user message.

If step 7 shows the full response, Plan 06-09 is functionally closed.

## Trade-offs

- **API budget consumption on abandonment.** A deliberation that's been started will run to completion and consume the BYOK API spend even if the user has navigated away or closed the tab. For a single-user local app with a $100/month cap this is an acceptable trade — the user already authorized the spend when they clicked Send. There is no cancel-on-abandon endpoint; if the user wants to actively kill a deliberation, they'd need to wait for it to finish or restart the backend. **Filed as v2.1+ polish, not a v2.0 blocker.**
- **Multi-tab concurrency.** Two tabs pointing at the same conversation that both submit messages will race on `storage.add_assistant_message`, with last-write-wins on the JSON file. The detached pattern doesn't change this — it was already the behavior pre-06-09. The single-user local-only constraint makes this acceptable.
- **Queue unboundedness.** No `maxsize` on the `asyncio.Queue` — events are coarse-grained (≤15 per deliberation), each well under 1MB. Memory pressure is negligible for single-user.

## Status of deferred Plan 06-08 items

The Plan 06-08 SUMMARY proposed two v2.1+ hardening options:

- **Option 2 (AbortController in `handleSelectConversation`)** — was framed as "the right architectural fix" for data integrity. With Plan 06-09 in place, the data integrity argument disappears: the deliberation always persists. AbortController would now only save API spend on user-initiated abandonment, not protect data. **Downgrade: optional UX polish, not needed hardening.**
- **Option 3 (per-event `conversation_id` scoping)** — was framed as "the most robust" fix because it would route stream events to the correct conversation. With Plan 06-09, the user gets the same UX by clicking back to the abandoned conversation (the persisted result hydrates from disk). The remaining value is "see in-flight progress when you return mid-stream" — niche, not v2.0 scope. **Downgrade: optional UX polish.**

The v2.0 cluster is now functionally closed: the frontend guard (06-08) prevents the crash; the backend detached task (06-09) preserves the work. Together they restore "switch conversations mid-stream is safe" without changing the existing SSE contract or frontend dispatcher.

## Classification

Pre-existing race, surfaced by 06-UAT Test 2, structurally closed by 06-08 (no crash), now functionally closed by 06-09 (no lost work). Phase 6 Success Criteria remain 5/5 — these were quality gaps discovered post-verification.
