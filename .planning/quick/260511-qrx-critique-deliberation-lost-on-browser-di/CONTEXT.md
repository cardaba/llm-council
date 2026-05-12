# Quick Task 260511-qrx: Critique deliberation lost on browser disconnect - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Task Boundary

Bug F (critique-specific 06-09 regression). The detached-task pattern from Plan 06-09 (which made `send_message_stream` survive client disconnect and persist the assistant message) does NOT work for `send_critique_stream` despite using the same `_spawn_background_deliberation` helper.

Repro (verified 2026-05-11):
- Client connects to `/critique/stream` with valid multipart upload.
- Client disconnects after ~3s.
- After 120s: file contains user message (269 bytes) ONLY. `add_assistant_message` never ran. Title still "New Conversation".
- Control (no disconnect): completes in ~139s, 16.9KB persisted, title generated.

Fresh path control (`send_message_stream` with Fast profile, --max-time 3 abort):
- After 60s: file is 33KB with full assistant message + title.

So the deliberation task DOES survive for fresh, but NOT for critique. Same helper, different outcome.

</domain>

<decisions>
## Implementation Decisions

### Diagnostic strategy

- **D-1 — Autonomous diagnosis.** User does not run manual repro. I add temporary diagnostic logging, start a parallel uvicorn on a non-conflicting port with stderr captured to a file, run an autonomous Python repro, read the stderr file, identify the exact exception that aborts the critique deliberation, then revert the diagnostic. The cause is non-obvious enough that ship-and-iterate would be wasteful.

### Fix shape

- **D-2 — Plan-checker decides the form.** Once the root cause is identified from stderr, I draft a fix proposal and spawn `gsd-plan-checker` to evaluate whether a minimal defensive patch (`asyncio.shield` or `copy.deepcopy(external_context)`) is sufficient, or whether a structural refactor (passing bytes by argument, matching `send_message_stream` shape bit-for-bit) is warranted. Plan-checker's verdict is binding.

### VRT baseline regeneration

- **D-3 — Bundle baseline regeneration into this task.** The NAV-01 sticky fix (commit `ba2c7d3`) shipped 2 days ago and the 16 Playwright baselines from Phase 7 (commit `3a332bb`) are now diff-failing. Regenerating them as the final commit of this task closes the visual-test debt outstanding since the NAV-01 fix. Risk: if Bug F fix iterates, baselines regenerate again — accepted because the baseline regeneration command is `npx playwright test --update-snapshots` (low cost to repeat).

### Claude's Discretion

- Diagnostic instrumentation: temporary `print(... file=sys.stderr)` lines as needed; all reverted before the final commit.
- Parallel uvicorn port: 8002 (avoid clashing with user's 8001).
- After fix lands, second autonomous repro to confirm the fix works before regenerating baselines.

</decisions>

<specifics>
## Specific Ideas

- Bug E's stderr logging (`[critique title] generation failed: ...`) is already in place from quick-task 260511-mqt. Use it as a precedent; new diagnostic prints follow the same `[critique-diag] ...` prefix convention.
- `_read_and_validate_upload` in `backend/main.py:384-400` reads UploadFile content via `await upload.read()` into a plain `bytes` object stored in `external_context`. The closure captures that dict. By the time deliberation runs, all uploads are fully read into memory — there should be no reference back to the live request body. If there IS such a reference, that's the bug.
- The exception (if any) is being swallowed by the existing `except Exception as e` at line 668 — the queue.put error event goes nowhere because the client is gone. So WITHOUT instrumentation, the exception is invisible.

</specifics>

<canonical_refs>
## Canonical References

- `backend/main.py:560-680` — `send_critique_stream` handler (event_generator + deliberation closure).
- `backend/main.py:220-380` — `send_message_stream` handler (control — known to work post-06-09).
- `backend/main.py:36-42` — `_spawn_background_deliberation` helper (shared between both endpoints).
- `.planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-09-PLAN.md` — original detached-task pattern decision.
- `.planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-09-SUMMARY.md` — 06-09 implementation summary (verified against fresh path only; critique was assumed to work by same pattern but never repro-tested for disconnect).
- `frontend/visual-tests/playwright.config.ts` — VRT config; regen command `cd frontend && npx playwright test --config visual-tests/playwright.config.ts --update-snapshots`.

</canonical_refs>
