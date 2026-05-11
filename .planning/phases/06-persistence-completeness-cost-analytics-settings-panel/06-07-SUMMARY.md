---
phase: 06-persistence-completeness-cost-analytics-settings-panel
plan: 07
subsystem: backend-frontend
tags: [SET-03, pydantic, stage4_threshold, research_strategy, useSettings, backward-compat]
requires:
  - 06-04-PLAN.md (cost capture pipeline merged into base)
  - 06-06-PLAN.md (useSettings hook + SettingsPanel — provides stage4Threshold source)
provides:
  - SET-03 end-to-end vertical: Settings slider → research_strategy.run threshold_override
affects:
  - backend/main.py (SendMessageRequest Pydantic model)
  - backend/research_strategy.py (run() signature + critic gating threshold resolution)
  - backend/council.py (run_full_council() threshold_override forwarding)
  - frontend/src/api.js (sendMessage + sendMessageStream body extension)
  - frontend/src/App.jsx (useSettings consumption + handleSendMessage threading)
  - frontend/src/components/ChatInterface.jsx (prop + submit forwarding)
tech-stack:
  added: []
  patterns:
    - "Pydantic Optional + Field constraints (ge/le) for backward-compatible per-request overrides"
    - "Override-or-fallback idiom: `x = override if override is not None else default` (Pitfall 3)"
    - "Profile-gated body extension at the API client layer (api.js) prevents leaking config to wrong endpoints"
key-files:
  created:
    - .planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-07-SUMMARY.md
  modified:
    - backend/main.py
    - backend/research_strategy.py
    - backend/council.py
    - frontend/src/api.js
    - frontend/src/App.jsx
    - frontend/src/components/ChatInterface.jsx
decisions:
  - "Threaded `stage4_threshold` through `run_full_council` too — the non-streaming `/message` endpoint is rarely used today but the contract is end-to-end consistency, not just the streaming path."
  - "Kept `useSettings()` consumption at App.jsx (single source) AND passed `stage4Threshold` as a prop to ChatInterface so the prop chain is observable in the codemap; this matches the artifact spec's `key_links` entry."
  - "App.handleSendMessage accepts an `explicitStage4Threshold` 3rd arg with `undefined`-fallback to the closure value so the retry path (handleRetryError, 2-arg call) continues to work without rewiring."
metrics:
  duration: ~10m
  completed: 2026-05-11
  tasks_complete: 2
  files_changed: 6
  loc_added: 68
  loc_removed: 11
---

# Phase 6 Plan 06-07: SET-03 — Stage 4 threshold slider end-to-end wiring

End-to-end wiring of the Settings panel `stage4_threshold` slider into the `quality_research` critic gating, with Pydantic-validated per-request override and strict backward compatibility for v1 clients.

## What landed

### Backend

- **`SendMessageRequest.stage4_threshold: Optional[int] = Field(None, ge=1, le=10)`** (backend/main.py:57). Optional with `None` default so v1 callers that omit the field continue to validate (HTTP 200) and run with `PROFILES["quality_research"]["stage4_threshold"]` = 8.
- **`research_strategy.run(..., threshold_override: Optional[int] = None)`** (backend/research_strategy.py:147–150, 185). The local `threshold` variable is now resolved at function entry as:
  ```python
  threshold = threshold_override if threshold_override is not None else profile_config["stage4_threshold"]
  ```
  This is the canonical Pitfall 3 fix from `06-RESEARCH.md` (lines 438–447): the `is not None` check guarantees `None < threshold` is never evaluated at the critic gating step. The resolved `threshold` flows into the single critic decision at `if critic_score is not None and critic_score < threshold:` — there is exactly one gating site, so "all Stage 4 critic decisions honor the override" is trivially satisfied.
- **`run_full_council(..., stage4_threshold: Optional[int] = None)`** (backend/council.py:478, 512). Threaded through so the non-streaming `/message` endpoint also honors the override. Fast / quality profiles ignore the kwarg (they never reach the QR branch).
- Both QR call sites in `main.py` (streaming endpoint at line 257, non-streaming at line 156) forward `request.stage4_threshold` unconditionally — when the Pydantic field is `None`, the chain re-falls back to the PROFILES default deep inside `research_strategy.run`.

### Frontend

- **`api.js`** — both `sendMessage` and `sendMessageStream` gained an optional `stage4Threshold = null` parameter. Body extension is gated on **both** conditions:
  ```js
  if (stage4Threshold !== null && profile === 'quality_research') {
    body.stage4_threshold = stage4Threshold;
  }
  ```
  Fast / quality / critique requests never carry the field, even if the caller passes a non-null value (defense in depth).
- **`App.jsx`** — `useSettings()` consumed at top level; `stage4Threshold` destructured and threaded down. `handleSendMessage` now takes an `explicitStage4Threshold` 3rd arg from the submit callback; if `undefined` (the retry path), falls back to the closure-captured `stage4Threshold`.
- **`ChatInterface.jsx`** — accepts `stage4Threshold` (default `null`) and forwards it as the 3rd argument to `onSendMessage(fullPrompt, profile, stage4Threshold)` from `handleSubmit`. Per CONTEXT.md "Deferred Ideas" (D-05), no current-threshold microcopy is rendered in the input area — the slider value is only visible inside the Settings panel.

## Verification

### Static (grep gates from the plan)

| Gate | Match | Notes |
| ---- | ----- | ----- |
| `SendMessageRequest.stage4_threshold: Optional[int] = Field(None, ge=1, le=10)` | backend/main.py:57 | Pydantic field present with constraints |
| `threshold_override: Optional[int] = None,` | backend/research_strategy.py:150 | Kwarg signature |
| `threshold_override if threshold_override is not None else` | backend/research_strategy.py:185 | Pitfall 3 fix idiom |
| `threshold_override=request.stage4_threshold` | backend/main.py:257 | Streaming forward |
| `stage4_threshold=request.stage4_threshold` | backend/main.py:156 | Non-streaming forward (via run_full_council) |
| `stage4Threshold = null` | frontend/src/api.js:74, 107 | Both sendMessage and sendMessageStream |
| `body.stage4_threshold = stage4Threshold` | frontend/src/api.js:77, 110 | Body extension on both paths |
| `profile === 'quality_research'` | frontend/src/api.js:76, 109 | Profile guard |
| `stage4Threshold` references in App.jsx | 5 occurrences | Hook destructure + prop pass + closure fallback |
| `stage4Threshold` references in ChatInterface.jsx | 3 occurrences | Prop default + handler forward |

### Behavioral (Pydantic + chain — documented per `<output>` requirements)

| Scenario | Request body shape | Expected backend behavior |
| -------- | ------------------ | ------------------------- |
| **v1 backward-compat** | `{ "content": "...", "profile": "fast" }` | HTTP 200. `request.stage4_threshold` defaults to `None` via Pydantic. Fast profile never enters the QR branch. |
| **v1 backward-compat QR** | `{ "content": "...", "profile": "quality_research" }` | HTTP 200. `request.stage4_threshold = None`. `research_strategy.run(threshold_override=None)` falls back to PROFILES default = 8. Identical to pre-Phase-6 behavior. |
| **Slider = 8 (default)** | `{ "content": "...", "profile": "quality_research", "stage4_threshold": 8 }` | HTTP 200. Override = 8 = PROFILES default → identical to v1 critic gating. |
| **Slider = 3 (lower)** | `{ "content": "...", "profile": "quality_research", "stage4_threshold": 3 }` | HTTP 200. Critic gates with `critic_score < 3`, so Stage 4 refines only when scores are extremely low (looser — accepts more chairman synthesis without refinement). |
| **Slider = 10 (max)** | `{ "content": "...", "profile": "quality_research", "stage4_threshold": 10 }` | HTTP 200. Critic gates with `critic_score < 10`, so Stage 4 fires for nearly every response (stricter). |
| **Invalid: 11** | `{ ..., "stage4_threshold": 11 }` | **HTTP 422** Pydantic ValidationError — `Input should be less than or equal to 10`. Endpoint handler never runs. |
| **Invalid: 0** | `{ ..., "stage4_threshold": 0 }` | **HTTP 422** Pydantic — `Input should be greater than or equal to 1`. |
| **Invalid: -3** | `{ ..., "stage4_threshold": -3 }` | **HTTP 422** Pydantic — ge=1 violation. |
| **Fast w/ override** | `{ "content": "...", "profile": "fast", "stage4_threshold": 5 }` | HTTP 200 — Pydantic accepts (range OK), but main.py forwards the value into `run_full_council` which never reaches the QR branch for fast profile. Value is silently dropped. (Frontend api.js will not send this combination — guard prevents it.) |

### Network-tab captures (expected shapes for manual smoke)

**Smoke (a) — slider at 8, send quality_research:**
```
POST /api/conversations/{id}/message/stream
Content-Type: application/json
{ "content": "<query>", "profile": "quality_research", "stage4_threshold": 8 }
```

**Smoke (b) — slider at 3, send quality_research:**
```
POST /api/conversations/{id}/message/stream
{ "content": "<query>", "profile": "quality_research", "stage4_threshold": 3 }
```
Critic gating in `research_strategy.run` resolves `threshold = 3` (override wins over PROFILES default of 8). Stage 4 refinement now triggers only when `critic_score < 3` — looser, refinement is rarer.

**Smoke (c) — slider at any value, send fast:**
```
POST /api/conversations/{id}/message/stream
{ "content": "<query>", "profile": "fast" }
```
**No `stage4_threshold` key.** The api.js guard `if (stage4Threshold !== null && profile === 'quality_research')` is false for fast profile.

**Smoke (d) — slider at any value, send quality (non-research):**
```
POST /api/conversations/{id}/message/stream
{ "content": "<query>", "profile": "quality" }
```
**No `stage4_threshold` key.** Same guard.

### Critic gating site (research_strategy.py:353 unchanged)

```python
if critic_score is not None and critic_score < threshold:
    yield {"type": "stage4_start"}
    ...
```

This line was NOT modified by this plan. It already reads the local `threshold` variable, which is now resolved at function entry (line 185) using `threshold_override if threshold_override is not None else profile_config["stage4_threshold"]`. The override flows transparently into the existing critic decision.

## Deviations from Plan

**1. [Rule 3 - Plumbing extension] Threaded `stage4_threshold` through `run_full_council` for non-streaming endpoint parity.**
- **Found during:** Task 1, after `grep -n "research_strategy.run" backend/main.py backend/council.py` revealed a second call site inside `run_full_council` (council.py:507) reached by the non-streaming POST `/api/conversations/{id}/message` endpoint at main.py:156.
- **Issue:** The plan's "Edit (b)" assumed both QR call sites live in `main.py`. They don't: the non-streaming endpoint calls `run_full_council` which delegates to `research_strategy.run`. Without forwarding the kwarg through `run_full_council`, the non-streaming endpoint would silently fall back to the PROFILES default regardless of slider position — a contract violation.
- **Fix:** Added `stage4_threshold: Optional[int] = None` to `run_full_council`'s signature (backend/council.py:478) and forwarded as `threshold_override=stage4_threshold` at line 512. main.py:156 passes `request.stage4_threshold`.
- **Files modified:** backend/council.py, backend/main.py.
- **Commit:** 31e898d.

**2. [Rule 2 - Backward-compat preservation] App.handleSendMessage accepts an `explicitStage4Threshold` 3rd arg with `undefined`-fallback to closure value.**
- **Found during:** Task 2, when wiring ChatInterface → onSendMessage. The retry path (`handleRetryError` at App.jsx) calls `handleSendMessage(originalContent, originalProfile)` with only 2 arguments. If the signature only took 2 args, ChatInterface's new 3-arg call would work but retry would still pass the closure value (which is fine). If the signature took 3 args strictly, the retry call would pass `undefined` for the threshold, breaking the chain.
- **Fix:** Made the 3rd arg optional with `undefined`-vs-`null` semantics: `undefined` → use closure-captured `stage4Threshold` (retry case); explicit value (including `null`) → use it directly (ChatInterface case).
- **Files modified:** frontend/src/App.jsx.
- **Commit:** ea57b14.

## Known limitations

- **`/api/conversations/{id}/message` (non-streaming) is rarely exercised in production** — the frontend always uses `/message/stream`. The non-streaming threading is for contract consistency, not user-facing behavior. Manual curl tests against the non-streaming endpoint with `stage4_threshold` in the body will correctly route through `run_full_council`.
- **No UI feedback when the slider value is sent** — per CONTEXT.md "Deferred Ideas," displaying the active threshold in ChatInterface is out of scope. The Settings panel is the single source of truth for the user to see/change the value.
- **The override is applied at the entire `research_strategy.run` invocation level, not per-message-in-a-conversation.** This matches the plan's intent: the slider value at the moment of submit becomes the threshold for that request. Subsequent submits read the fresh `useSettings()` value via the closure.

## Self-Check

Static verification of all claims:

```
[FOUND] backend/main.py — SendMessageRequest.stage4_threshold line 57
[FOUND] backend/main.py — run_full_council call with stage4_threshold kwarg line 156
[FOUND] backend/main.py — research_strategy.run call with threshold_override kwarg line 257
[FOUND] backend/research_strategy.py — threshold_override signature line 150
[FOUND] backend/research_strategy.py — Pitfall 3 fallback idiom line 185
[FOUND] backend/council.py — run_full_council stage4_threshold parameter line 478
[FOUND] backend/council.py — research_strategy.run call with threshold_override line 512
[FOUND] frontend/src/api.js — sendMessage stage4Threshold param + guard
[FOUND] frontend/src/api.js — sendMessageStream stage4Threshold param + guard
[FOUND] frontend/src/App.jsx — useSettings import + destructure + closure-fallback wiring
[FOUND] frontend/src/components/ChatInterface.jsx — prop accept + onSendMessage forward
[FOUND] commit 31e898d (backend wiring)
[FOUND] commit ea57b14 (frontend wiring)
[FOUND] python -c "import ast; ..." parses backend/main.py + backend/research_strategy.py + backend/council.py OK
```

## Self-Check: PASSED
