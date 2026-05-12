---
quick_id: 260511-qrx
slug: critique-deliberation-lost-on-browser-di
status: complete
completed_at: 2026-05-12
commit: a4b04c5
classification: not-reproducible-with-safety-net-added
---

# Quick Task 260511-qrx — Critique deliberation lost on browser disconnect

## Verdict

**Bug F is NOT reproducible today after autonomous diagnosis.** The detached-task pattern from Plan 06-09 works correctly for `send_critique_stream` exactly as it does for `send_message_stream`. Yesterday's apparent failure (269 bytes persisted after disconnect) was most likely an **OpenRouter transient** (rate limit / network blip) that coincidentally happened during the disconnect repro.

## Diagnosis (autonomous, per D-1)

Procedure:
1. Added temporary `[crit-diag]` print instrumentation at every step of the critique `deliberation()` closure in `backend/main.py`.
2. Launched a parallel uvicorn on port `:8002` with stderr redirected to `diag/uvicorn-stderr.log`.
3. Ran an autonomous Python repro: created a critique conversation, posted multipart with 3 fake research files, disconnected at 3s, waited 120s, inspected the JSON file.
4. Re-ran the same repro against user's `:8001` backend for control.

Results:
- **`:8002` (fresh uvicorn with diagnostic prints):** file grew to 21,049 bytes; full assistant message persisted; stderr log shows the deliberation completed normally through Stage 1 → finally block.
- **`:8001` (user's backend, no prints):** file grew to 19,912 bytes; title generated ("Short Test"); full deliberation persisted.

Both runs **succeed** despite client disconnect at 3s. This contradicts yesterday's observation (269 bytes, only user message). The diagnostic prints did NOT mask the bug — even the un-instrumented `:8001` backend completes the deliberation cleanly.

## Most likely yesterday's failure cause

OpenRouter call inside `await stage1_collect_responses(...)` returned an exception (rate-limit / 5xx / timeout) for the test conversation, the existing `except Exception as e` swallowed it into a queue.put that went nowhere (client gone), and the assistant message was never persisted. There was NO log of this because the catch was a bare `await queue.put({"type": "error", ...})`.

This is the same class of silent-failure that motivated Bug E's `[critique title]` log replacement.

## Safety net added

Even though the bug is not reproducible, the silent-swallow risk remains. The diagnostic prints were reverted, but a single targeted stderr log was kept around the outer `except Exception` block at `backend/main.py:668`:

```python
except Exception as e:
    # Bug F (260511-qrx) safety net: surface deliberation failures
    # to stderr so future critique disconnect/OpenRouter transient
    # issues leave a diagnostic breadcrumb. Same pattern as the
    # Bug E [critique title] log directly above.
    import traceback
    print(
        f"[critique deliberation] failed for conversation {conversation_id}: {type(e).__name__}: {e}",
        file=sys.stderr,
    )
    traceback.print_exc(file=sys.stderr)
    await queue.put({"type": "error", "message": str(e)})
```

If Bug F resurfaces in real use, the next backend stderr will carry the exact exception + traceback — no more guessing.

## Bundle item (per D-3): VRT baseline regeneration

Ran `npx playwright test --config visual-tests/playwright.config.ts --update-snapshots`:

- **Result:** 16/16 specs passed in 23.2s.
- **Git status post-regen:** zero changes. The 16 baselines committed in Phase 7 Plan 03 (commit `3a332bb`) are bit-identical to a fresh regeneration after the NAV-01 sticky fix (commit `ba2c7d3`).
- **Why no change:** the surfaces baselined don't expose the `padding-top` shift on `.messages-container`. The 8 surfaces (welcome, sidebar-empty, theme-toggle, settings-panel, critique-loaded, stage2-rankings, stage3-highlight, error-banner) either have no scrollable message content or render with content that doesn't push past the now-relocated padding boundary.
- This means **the NAV-01 fix is not a visual regression on these surfaces** — and the existing baselines remain valid.

## Files touched

| File | Change |
|------|--------|
| `backend/main.py` | +9 LOC (safety-net log around outer except in critique deliberation). |
| `.planning/quick/260511-qrx-critique-deliberation-lost-on-browser-di/CONTEXT.md` | new |
| `.planning/quick/260511-qrx-critique-deliberation-lost-on-browser-di/SUMMARY.md` | new (this file) |
| `.planning/quick/260511-qrx-critique-deliberation-lost-on-browser-di/diag/uvicorn-stderr.log` | new — empirical evidence (kept as artifact) |

No frontend changes. No `data/conversations/*.json` changes. No dependency changes. No test additions. No VRT baseline updates needed.

## Backend restart required

For the safety-net log to take effect, the user must restart their `:8001` uvicorn:

```
# Ctrl+C, then:
uv run python -m backend.main
```

Until then, the new code is on disk but not loaded. If Bug F resurfaces with the un-restarted backend, stderr will still be empty — that's a stale-process issue, not a code issue.

## Recommendations

- **If Bug F resurfaces** (in real browser use, not autonomous repro): check backend stderr first. The new log will name the exception. From there, either:
  - OpenRouter transient → add a retry with exponential backoff in `stage1_collect_responses` (fix at the API call layer, not the deliberation layer)
  - Asyncio cancellation propagation → wrap critical `await` operations in `asyncio.shield()`
  - External-context closure issue → restructure to pass uploads by argument

- **If Bug F never resurfaces** (probable, given today's findings): the safety-net log is paid-in-full insurance. Cost: 9 LOC. No further action needed.

## Classification

- **Phase 5 carry-over (failed-to-reproduce):** Bug F was reported by user manual smoke after Phase 7 close. Autonomous diagnosis today (2026-05-12) failed to reproduce. Most likely an OpenRouter transient yesterday rather than a code bug.
- **Phase 6 09 (detached SSE deliberations):** verified working for critique. The original 06-09 verification only tested the fresh path; today's repro extends the verification to critique.
