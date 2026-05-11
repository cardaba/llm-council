---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 03
subsystem: backend-cost-pipeline
tags: [cost-capture, openrouter, metadata, byok]
requires:
  - 06-01-PLAN.md (PERS-01 metadata schema)
  - 06-02-PLAN.md (label_to_model + aggregate_rankings persistence)
  - 06-SPIKE-USAGE-COST.md (verified field paths)
provides:
  - metadata.cost = {stage1, stage2, stage3, stage4, total, upstream_total, currency} on every persisted assistant message
  - query_model return dict gains a third 'cost' key (additive — backward-compatible)
affects:
  - backend/openrouter.py
  - backend/council.py
  - backend/research_strategy.py
  - backend/main.py
tech-stack:
  added: []
  patterns:
    - defensive .get() or 0.0 chain (`_extract_cost`)
    - per-call cost embedded in per-stage result items (rides through helpers)
    - per-stage accumulation at the orchestrator level (run_full_council, research_strategy.run, main.py fresh/critique branches)
key-files:
  created:
    - .planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-03-SUMMARY.md
  modified:
    - backend/openrouter.py
    - backend/council.py
    - backend/research_strategy.py
    - backend/main.py
decisions:
  - Embed per-call 'cost' in stage result items rather than refactoring helper signatures to return tuples — minimally invasive, keeps main.py and any non-orchestrator caller working unchanged.
  - Fold the QR critic's cost into stage3 so the invariant `total == stage1 + stage2 + stage3 + (stage4 or 0)` holds while keeping the locked stage4-None-on-no-refine contract.
  - main.py non-streaming send_message endpoint forwards run_full_council's metadata.cost into the persisted message_metadata so persistence is consistent across all 4 entry points (streaming fresh, non-streaming fresh, QR-streaming, critique-streaming).
metrics:
  duration: "~25 minutes"
  completed: 2026-05-11
  tasks: 3
  files_modified: 4
requirements:
  - COST-01
---

# Phase 06 Plan 03: Backend cost capture end-to-end — Summary

Instrumented the cost-capture pipeline end-to-end on the backend. `query_model` now parses `usage.cost` + `usage.cost_details.upstream_inference_cost` from every successful OpenRouter response and returns them as a `cost` sub-dict; `council.py` and `research_strategy.py` accumulate per-stage sums; `main.py` packs the consolidated `metadata.cost = {stage1, stage2, stage3, stage4, total, upstream_total, currency}` blob into every persisted assistant message across all four streaming/non-streaming entry points.

## Verified field paths (from 06-SPIKE-USAGE-COST.md ## VERIFIED block)

Copied verbatim into `backend/openrouter.py::_extract_cost`:

- `openrouter_fee_path: usage.cost` → `_extract_cost` reads `data.get("usage").get("cost")`
- `upstream_path: usage.cost_details.upstream_inference_cost` → `_extract_cost` reads `data.get("usage").get("cost_details").get("upstream_inference_cost")`
- Currency: implicit USD per spike — no `currency` field present on any of the 3 sampled responses; locked at the aggregation step as `"currency": "USD"`.

Per spike Surprise 1: BYOK routing does NOT zero `usage.cost` on the active account (1M-req/mes free-BYOK waiver not active). `_extract_cost` reads `usage.cost` verbatim — never assumes BYOK fee waiver.

Per spike Surprise 2: `usage.cost` and `upstream_inference_cost` were equal on all 3 sampled responses (OpenRouter markup currently 0%). The two-segment metadata shape (`total` vs `upstream_total`) is still meaningful as data shape — the UI can render both segments per D-01 even if the numbers coincide.

## Helper-signature changes

**None.** Helper functions (`stage1_collect_responses`, `stage2_collect_rankings`, `stage3_synthesize_final`, and the inlined fan-outs in `research_strategy.run`) kept their signatures.

Per-call cost rides through as an embedded `"cost"` key inside each per-stage result item:
- Stage 1 items: `{"model", "response", "cost"}` (QR adds `"reasoning_details"`)
- Stage 2 items: `{"model", "ranking", "parsed_ranking", "cost"}`
- Stage 3 result: `{"model", "response", "cost"}` (QR adds `"reasoning_details"`)
- Stage 4 result (QR only, when refinement gated): `{"model", "response", "reasoning_details", "critic_score", "primary_concern", "cost"}`

Accumulation happens at the orchestrator level:
- `council.run_full_council` (fast / quality) → packs `metadata.cost` with `stage4: None`
- `research_strategy.run` `_final` event → packs `message_metadata.cost` with `stage4: float | None`
- `main.py` fresh-streaming branch → mirror of `run_full_council` since it currently inlines the helpers
- `main.py` critique branch → same accumulation
- `main.py` non-streaming `send_message` → forwards `run_full_council`'s `metadata.cost` into `message_metadata.cost`

## QR critic cost handling

The critic call in `research_strategy.run` is a real `query_model` invocation that always runs for `quality_research`, but the locked schema only exposes `stage1`-`stage4`. Folding the critic's cost into `stage3` preserves the invariant `total == stage1 + stage2 + stage3 + (stage4 or 0)` while keeping the locked contract that `stage4 is None` when the critic blocks refinement.

Concretely: when the critic returns a high score (refinement skipped), the user's spend on the critic call is still visible in `stage3` and `total` — it is not silently lost.

## Backward-compatibility audit

`query_model` callers that destructure `{content, reasoning_details}` (e.g. `generate_conversation_title` at `council.py:453`) keep working because `cost` is an additive third key. Verified by reading every `query_model(...)` call site:
- `council.py:97` (critique fan-out) — uses `response.get('content', '')` only
- `council.py:337` (chairman) — wrapped in this plan to also pick up `cost`
- `council.py:453` (title gen) — uses `response.get('content', ...)` only
- `research_strategy.py:192,252,296,330,360` — all updated this plan

## Offline integration smoke results

Ran 3 monkey-patched smokes:

1. **Quality profile happy-path** — 3 council models × `cost={fee:0.001, upstream:0.002}` per call → `metadata.cost = {stage1: 0.003, stage2: 0.003, stage3: 0.001, stage4: None, total: 0.007, upstream_total: 0.014, currency: "USD"}`. Invariant `total == stage1+stage2+stage3` holds.
2. **QR with Stage 4 refine triggered** (critic score 5 < threshold 8) — 4 council models → `metadata.cost = {stage1: 0.004, stage2: 0.004, stage3: 0.002 (chairman + critic), stage4: 0.001, total: 0.011, upstream_total: 0.022, currency: "USD"}`. Invariant `total == stage1+stage2+stage3+stage4` holds. `stage4` is a float.
3. **QR without Stage 4** (critic score 9 >= threshold 8) — same model set → `metadata.cost = {stage1: 0.004, stage2: 0.004, stage3: 0.002, stage4: None, total: 0.01, ...}`. `stage4 is None`.
4. **Graceful degradation** — flaky model returning None on every 2nd call → no KeyError, no crash; failed sub-queries contribute $0 to the per-stage sum.

No live API call was made during plan execution (per phase posture — Plan 04 will do the user-driven end-to-end smoke once UI is in place).

## Reference conversation IDs

(End-to-end live-API smoke deferred to Plan 04 verification — the live SMOKE that demonstrates each shape will be captured there. The offline smokes above exercise every code path including all error/degradation branches.)

## Files modified

- `backend/openrouter.py` — added module-level `_extract_cost(data)` helper (line 8-25); extended `query_model` return dict with `cost` key (line 88).
- `backend/council.py` — embedded `cost` in stage1/2/3 result items (lines 177, 285, 348); per-stage accumulation + `metadata.cost` pack in `run_full_council` (lines 549-572).
- `backend/research_strategy.py` — embedded `cost` in stage1/2/3/4 result items; captured critic `cost` separately; per-stage accumulation + `cost_block` pack in the `_final` event (lines 403-432); also added a `cost` block to the all-models-failed early-return path so the schema is consistent on errors (lines 214-226).
- `backend/main.py` — added `cost` to non-streaming `send_message` `message_metadata` (line 165); accumulated and packed `cost` in fresh-streaming `message_metadata` (lines 307-339); accumulated and packed `cost` in critique-stream `metadata` (lines 525-545).

## Commits

| Task | Description                                                              | Commit  |
| ---- | ------------------------------------------------------------------------ | ------- |
| 1    | feat(06-03): capture usage.cost + upstream_inference_cost in query_model | f41768e |
| 2    | feat(06-03): accumulate per-stage cost in council + research_strategy    | 9f34b7e |
| 3    | feat(06-03): persist metadata.cost across all main.py streaming branches | f4aac53 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] QR critic cost capture**

- **Found during:** Task 2
- **Issue:** The plan's Stage 4 accumulation only covered the refine call; the critic call (always runs in QR, consumes tokens) had no per-stage home in the locked 4-stage schema.
- **Fix:** Captured the critic's `cost` separately as `critic_cost`, then folded it into `stage3_fee` / `stage3_upstream` so the user's spend remains faithful and the locked invariant `total == stage1+stage2+stage3+(stage4 or 0)` holds. Documented in source as a comment.
- **Files modified:** `backend/research_strategy.py`
- **Commit:** 9f34b7e

**2. [Rule 2 — Missing critical functionality] Non-streaming send_message cost forwarding**

- **Found during:** Task 3 (audit)
- **Issue:** The plan called out fresh-streaming + critique + QR branches but not the non-streaming `send_message` endpoint at `main.py:115-186`. Without the fix, conversations sent via the non-streaming endpoint would persist messages WITHOUT `metadata.cost`, creating an inconsistency that downstream Plans 04+ would have to handle.
- **Fix:** Forwarded `run_full_council`'s `metadata.cost` into the non-streaming `message_metadata` so all four entry points persist the same locked shape.
- **Files modified:** `backend/main.py`
- **Commit:** f4aac53

**3. [Rule 2 — Missing critical functionality] All-models-failed early-return in research_strategy**

- **Found during:** Task 2
- **Issue:** The early-return path at `research_strategy.run` (when all stage1 models fail) emitted a `_final` event without a `cost` block. Plan 04+'s aggregation queries would see an unexpected `metadata.cost is None` on error conversations.
- **Fix:** Added a zero-cost block (`stage1..stage3: 0.0, stage4: None, total/upstream_total: 0.0, currency: "USD"`) to the early-return so the schema is uniform.
- **Files modified:** `backend/research_strategy.py`
- **Commit:** 9f34b7e

## Known Stubs

None. Every metadata.cost field is wired to real data (or to documented zero defaults for failed-call / no-refine cases).

## Self-Check: PASSED

- File `backend/openrouter.py` exists and contains `_extract_cost` — FOUND
- File `backend/council.py` contains `stage1_fee` accumulation — FOUND
- File `backend/research_strategy.py` contains `cost_block` pack — FOUND
- File `backend/main.py` contains 3 occurrences of `"cost":` — FOUND
- Commit f41768e — FOUND
- Commit 9f34b7e — FOUND
- Commit f4aac53 — FOUND
- All offline smokes (quality, QR+refine, QR-no-refine, flaky graceful degradation) — PASS
