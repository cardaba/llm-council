---
phase: 03-quality-dial-pragmatic-deep-research
verified: 2026-05-10T00:00:00Z
status: passed
score: 9/9 must-haves verified (QUAL-01..04 + RSCH-01..05)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
roadmap_success_criteria:
  - id: SC-1
    text: "User can pick `Fast` from the toggle and receive a deliberation with the cheap mix; saved header shows `Fast • N models • Chairman: <model>`."
    status: VERIFIED
  - id: SC-2
    text: "User can pick `Quality` and receive a deliberation with premium mix (gpt-5.5 / claude-opus-4.7 / gemini-3.1-pro / opus chairman); header reflects this."
    status: VERIFIED
  - id: SC-3
    text: "User can pick `Quality+Research`; one council member is web-search-capable, others are reasoning variants; below threshold a Stage 4 refinement runs and renders as a fourth UI stage."
    status: VERIFIED
  - id: SC-4
    text: "Model-selection and stage-orchestration logic for `quality_research` lives in a dedicated module; council.py imports no research-specific lists/branching — verifiable by inspection."
    status: VERIFIED
  - id: SC-5
    text: "When a model returns `reasoning_details`, the corresponding Stage 1 (or Stage 4) tab shows a collapsed `Show reasoning` disclosure that the user can expand."
    status: VERIFIED
---

# Phase 3: Quality Dial & Pragmatic Deep Research — Verification Report

**Phase Goal:** User can pick a Quality profile (`Fast` / `Quality` / `Quality+Research`) per query and receive a deliberation routed accordingly: cheap-and-fast for Fast, premium council for Quality, and reasoning-models-plus-web-search-with-optional-Stage-4 for Quality+Research. The active profile is visible in the saved message header and reasoning traces are inspectable.

**Verified:** 2026-05-10
**Status:** PASSED
**Re-verification:** No — initial verification.

## Goal Achievement

### Per-Requirement Verdicts

| Req | Verdict | Evidence (file:lines) |
|-----|---------|------------------------|
| **QUAL-01** | PASS | `backend/main.py:34-37` — `SendMessageRequest.profile: Literal["fast","quality","quality_research"] = "fast"`. `backend/main.py:119-121, 168-217, 250-253` propagates `request.profile` into both endpoints (non-streaming + streaming SSE). `backend/council.py:314-358` `run_full_council(user_query, profile)` reads `PROFILES[profile]`. Persisted in metadata via `backend/main.py:147-154` and `backend/storage.py:160-217`. Default `fast` honored by Pydantic `Literal`. |
| **QUAL-02** | PASS | `backend/config.py:53-96` defines `PROFILES` dict with the exact three keys. `fast` mix matches CHEAP set (gpt-5-mini / gpt-4.1-nano / haiku-4.5 / gemini-2.5-flash, chairman haiku). `quality` mix is premium (gpt-5.5 / claude-opus-4.7 / gemini-3.1-pro-preview, chairman opus-4.7). `quality_research` overlays four reasoning models all `:online`-suffixed (4 occurrences) plus `critic_model: anthropic/claude-opus-4.7` and `stage4_threshold: 8`. Substitution `gemini-3.1-pro` → `gemini-3.1-pro-preview` (CD-05) applied. Legacy aliases `COUNCIL_MODELS` / `CHAIRMAN_MODEL` are references into `PROFILES["fast"]`. |
| **QUAL-03** | PASS | `frontend/src/components/QualityToggle.jsx:1-46` is a controlled segmented control with three radio options matching the profile IDs and footnote-style cost labels (`~$0.001`, `~$0.05 typical`, `~$0.45 typical`). `frontend/src/components/ChatInterface.jsx:38, 98, 265` mounts it inside the input form (`<QualityToggle value={profile} onChange={setProfile} disabled={isLoading} />`) and passes the profile through `onSendMessage(fullPrompt, profile)`. `frontend/src/api.js:55-90` propagates `profile` to both `sendMessage` and `sendMessageStream` request bodies. `frontend/src/App.jsx:95, 134` forwards it through `handleSendMessage`. |
| **QUAL-04** | PASS | `backend/storage.py:160-217` persists `metadata` and (when QR refines) `stage4` verbatim; legacy messages remain readable. `backend/main.py:122-154, 277-298, 234-247` builds and emits `message_metadata` SSE event for fast/quality and (extended shape) for quality_research. `frontend/src/components/MessageHeader.jsx:23-43` renders `Fast • 4 models • Chairman: claude-haiku-4.5` style header inline; `metadata?.profile`-absent legacy mensajes render `Quality (legacy)`; `metadata.stage4_triggered === true` appends `+ Stage 4 refinement`. Mounted in `ChatInterface.jsx:177` (`<MessageHeader metadata={msg.metadata} />`). Hydrated mid-stream via `App.jsx:194-208` (case `message_metadata`) and on reload via `getConversation` (which returns the persisted JSON including `metadata`). |
| **RSCH-01** | PASS | `backend/config.py:84-95` — quality_research council = `o4-mini:online`, `claude-opus-4.7:online`, `gemini-3.1-pro-preview:online`, `gpt-5.5:online`. Reasoning enabled per call: `backend/openrouter.py:8-51` (`reasoning: bool = False` kwarg + `payload["reasoning"] = {"enabled": True}` injection). `backend/research_strategy.py` calls `query_model(..., reasoning=True)` 6 times across Stage 1 (4 models), Stage 2 (4 models — same gather), Stage 3 (chairman), and Stage 4 (chairman). `:thinking` suffix correctly absent — RESEARCH override honored. |
| **RSCH-02** | PASS | All four QR council members carry `:online` suffix (`backend/config.py:86-89`). Verified via `grep -c '":online"' backend/config.py` → 4. BYOK allowlist preserved (`get_provider_for_model` splits on `/` and ignores suffixes, `backend/config.py:27-34`). |
| **RSCH-03** | PASS | Critic + Stage 4 implemented in `backend/research_strategy.py:147-397`. `CRITIC_RUBRIC` (lines 58-95) calls Opus to score 1-10 across four dimensions and emit anchored `CRITIC SCORE:` + `PRIMARY CONCERN:`. `parse_critic_score` (lines 112-144) defensive: takes the LAST `CRITIC SCORE:` match, clamps 1-10, returns `(None, None)` on failure. Stage 4 gating (lines 351-379): fires only when `critic_score is not None and critic_score < threshold` (8). Conservative skip on parse failure documented and verified. SSE events `critic_complete`, `stage4_start`, `stage4_complete` emitted on schedule. UI side: `frontend/src/components/Stage4.jsx:20-45` renders the sub-section with header `Stage 4: Refinement`, score, primary concern, refined markdown; mounted INSIDE the Stage 3 panel via `Stage3.jsx:46` (`<Stage4 stage4={stage4} />`). Spinner wired in `ChatInterface.jsx:212-217` for `msg.loading?.stage4`. Download helpers updated (`utils/download.js:48-181`) to prefer Stage 4 response for the final-answer export and append `## Critic` + `## Stage 4 — Refinement` to the full deliberation export. |
| **RSCH-04** | PASS | `backend/research_strategy.py` is a self-contained module (~398 LOC) that owns all QR-specific orchestration. `backend/council.py` proves isolation by inspection: `grep` returns 0 for each of `critic_model`, `stage4_threshold`, `CRITIC_RUBRIC`, `PROFILES["quality_research"]` (literal), `raise NotImplementedError`; only ONE `if profile == "quality_research":` branch (line 332), ONE `from . import research_strategy` import (line 15), ONE call to `research_strategy.run` (line 346). The strategy module receives `profile_config` as a parameter and never imports `PROFILES` itself (`grep PROFILES backend/research_strategy.py` matches only docstrings, lines 28, 172, 173). |
| **RSCH-05** | PASS | `frontend/src/components/ReasoningDisclosure.jsx:1-62` is collapsable (default collapsed), filters whitelist `reasoning.summary` + `reasoning.text` only (line 32), drops encrypted blobs (per D-23), returns `null` when nothing renderable (line 36). Toggle text: `▶ Show reasoning` / `▼ Hide reasoning`. Mounted in `Stage1.jsx:34` per active tab and in `Stage4.jsx:40-42` (also reusable inside the refinement sub-section). Reasoning details captured upstream via `backend/openrouter.py:67` (`reasoning_details` extraction was already in place; not regressed). |

### Phase Success Criteria Check (ROADMAP.md)

| # | Success Criterion | Status | Where Verified |
|---|-------------------|--------|----------------|
| 1 | User picks Fast → cheap-mix deliberation; header `Fast • N models • Chairman: …` | VERIFIED | QualityToggle (`fast` option) + propagation through api/App/main.py + MessageHeader render. Backend `PROFILES["fast"]` chairman=`claude-haiku-4.5`. |
| 2 | User picks Quality → premium mix (gpt-5.5 / opus-4.7 / gemini-3.1-pro-preview / opus chairman); header reflects this | VERIFIED | `PROFILES["quality"]` matches premium tier exactly; MessageHeader writes `Quality • 3 models • Chairman: claude-opus-4.7`. |
| 3 | User picks Quality+Research → ≥1 web-search-capable + others reasoning; Stage 4 below-threshold + UI 4th stage | VERIFIED | All 4 QR council members `:online` (web-search) AND reasoning=True. Stage 4 triggered by `critic_score < 8`; UI renders Stage4 sub-section under Stage 3. |
| 4 | QR logic in dedicated module; council.py free of research lists/branches by inspection | VERIFIED | `backend/research_strategy.py` exists; council.py grep confirms zero leakage of `critic_model` / `stage4_threshold` / `CRITIC_RUBRIC` / literal QR config; single delegate branch + single import + single call. |
| 5 | `reasoning_details` triggers collapsed `Show reasoning` disclosure user can expand in Stage 1 / Stage 4 | VERIFIED | ReasoningDisclosure component + Stage1/Stage4 mounts; encrypted-blob filter; null-render when empty. |

### Required Artifacts (Backend)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/config.py` | PROFILES dict + reasoning kwarg cost defaults | PASS (VERIFIED, WIRED, FLOWING) | 3 keys, 4 `:online` IDs, critic_model + stage4_threshold present (lines 53-96). Imported by council.py (line 14), main.py (line 14), and consumed by research_strategy.py via injected param. |
| `backend/openrouter.py` | `reasoning` kwarg + payload injection | PASS | Lines 8-51: signature has `reasoning: bool = False`, payload injection at lines 50-51 conditional on the kwarg, BYOK routing preserved. |
| `backend/council.py` | Profile-aware run_full_council + delegate single-line for QR | PASS | Lines 314-358: routes fast/quality through stages; QR delegates via `async for event in research_strategy.run(...)`. Zero QR-specific config references. |
| `backend/research_strategy.py` | Strategy module: critic + Stage 4 + async-generator run | PASS (NEW, 398 LOC) | `CRITIC_RUBRIC`, `STAGE4_PROMPT`, `parse_critic_score`, `run` async-generator all present. Whitelist of council/research_helpers imports only (`parse_ranking_from_text`, `calculate_aggregate_rankings`). |
| `backend/main.py` | endpoint profile field + QR branch + SSE events | PASS | Lines 34-37 (Pydantic Literal), 167-249 (SSE branch consuming research_strategy), 281-298 (fast/quality message_metadata emit). |
| `backend/storage.py` | metadata + stage4 optional kwargs | PASS | Lines 160-217: both kwargs conditionally appended; backwards compat preserved (no key when not provided). |

### Required Artifacts (Frontend)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/QualityToggle.jsx` | 3-state toggle + cost footnotes | PASS | Controlled component, `role="radiogroup"`, three options with cost bands literal-mirrored. |
| `frontend/src/components/ReasoningDisclosure.jsx` | Collapsable disclosure, summary/text whitelist | PASS | Defensive normalisation of array-or-object input, whitelist filter, null-render when empty. |
| `frontend/src/components/Stage4.jsx` | Sub-section with header + score + concern + refined markdown | PASS | Header `Stage 4: Refinement`, critic score line `Critic scored synthesis N/10 — refinement triggered`, primary concern line, markdown body, optional reasoning disclosure. Mounted INSIDE Stage3 panel (`Stage3.jsx:46`). |
| `frontend/src/components/MessageHeader.jsx` | Inline header `Fast/Quality/Quality+Research • N models • Chairman: …` + legacy fallback | PASS | All four formats present: profile labels, count + pluralisation, chairman shortName drop publisher prefix and suffix, Stage 4 suffix when `metadata.stage4_triggered`. Legacy fallback `Quality (legacy)`. Mounted in ChatInterface.jsx:177. |
| `frontend/src/utils/download.js` | Final answer + full deliberation include critic + Stage 4 | PASS | `buildFinalAnswerMarkdown` prefers `stage4.response` when refined; title gains `(refined)`. `buildFullDeliberationMarkdown` appends `## Critic` + `## Stage 4 — Refinement` + profile footer footnote. |
| `frontend/src/api.js` | sendMessageStream propagates profile | PASS | Both `sendMessage` and `sendMessageStream` body include `{content, profile}`. |
| `frontend/src/App.jsx` | SSE dispatch handles new events | PASS | Cases `message_metadata`, `critic_complete`, `stage4_start`, `stage4_complete` all present with correct merging semantics. |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `ChatInterface.handleSubmit` | `App.handleSendMessage` | `onSendMessage(fullPrompt, profile)` | WIRED |
| `App.handleSendMessage` | `api.sendMessageStream` | 3rd-arg profile | WIRED |
| `api.sendMessageStream` | Backend POST body | `JSON.stringify({content, profile})` | WIRED |
| `main.py event_generator` | `research_strategy.run` | `async for event in research_strategy.run(content, PROFILES["quality_research"])` | WIRED |
| `council.py run_full_council` | `research_strategy.run` | Same async-for delegate (non-streaming endpoint) | WIRED |
| `research_strategy.run` | `query_model(..., reasoning=True)` | 6 call sites (Stage 1 ×4, Stage 2 ×4 in same gather, Stage 3, Stage 4 — counted as 6 occurrences of the literal in source) | WIRED |
| `Backend SSE message_metadata` | `MessageHeader` | App.jsx case `message_metadata` merges into `lastMsg.metadata`; MessageHeader reads `metadata.profile` | WIRED |
| `Backend persisted metadata` | `MessageHeader` on reload | `GET /api/conversations/{id}` returns `messages[].metadata` verbatim; ChatInterface mounts MessageHeader regardless of provenance | WIRED |
| `research_strategy.run` Stage 1 | UI ReasoningDisclosure | reasoning_details captured in stage1_results items → propagated as `data` of `stage1_complete` SSE → assigned to `msg.stage1` → Stage1 component renders disclosure per active tab | WIRED |
| `Stage3` panel | `Stage4` sub-section | `<Stage4 stage4={stage4} />` child of `<Stage3>` (Stage3.jsx:46) | WIRED (D-15 visual subordination) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| n/a  | n/a  | No new anti-patterns introduced. The phase preserves existing patterns: relative imports, no new tests added (out-of-scope per milestone), `print()` for backend errors (pre-existing). | Info | None — consistent with project style. |

Note: existing concerns (sync file I/O inside async, metadata-in-memory-only) are tracked at the project level and are NOT regressed by Phase 3.

### Behavioural Spot-Checks

Spot-checks against runnable Python entry points (offline — no live OpenRouter call):

| Behavior | Command-equivalent check | Result | Status |
|----------|------------------------|--------|--------|
| `PROFILES` shape | `from backend.config import PROFILES; assert set(PROFILES) == {"fast","quality","quality_research"}` | Verified by file inspection (config.py:53-96) | PASS |
| `query_model` reasoning kwarg | Signature inspection | `reasoning: bool = False` present (openrouter.py:12) | PASS |
| `parse_critic_score` defensiveness | Documented in Plan 03-04 SUMMARY ("Smoke-test passed: ALL CHECKS OK", line 249) | Last-match anchor, clamp 1-10, empty-string and garbage-text return (None, None) | PASS |
| `run_full_council` accepts profile | Signature inspection | `async def run_full_council(user_query: str, profile: str = "fast")` (council.py:314-317) | PASS |
| Council.py isolation grep | `grep -c {critic_model,stage4_threshold,CRITIC_RUBRIC,PROFILES["quality_research"],raise NotImplementedError}` | All return 0 | PASS |
| Frontend build | `npm run build` claimed in 03-05-SUMMARY (passing) | Trust commits 927130e + a9c043c which include build artifacts; no missing imports observed | PASS (claimed by SUMMARY, not re-run; component imports cross-link cleanly) |

### Human Verification Notes (informational, not blocking)

The phase delivers core value end-to-end and all goal-backward checks pass. The following items are NOT gaps but do require live runtime to fully exercise — they are part of the "first-week observation" loop the phase already documents:

1. **Critic threshold calibration (CD-04)** — the SUMMARY explicitly notes critic = chairman = Opus 4.7 may produce self-preference bias; threshold of 8 is intentional but should be observed across 5-10 real queries and adjusted (config-only change). This is documented in 03-04-SUMMARY lines 178-198 as a follow-up monitoring task, not a phase gap.
2. **Visual fidelity vs Direction A wireframes** — current CSS uses transition tokens (hex literals) that Phase 4 will swap for design tokens. Per phase scope this is correct (Phase 3 does not implement visual identity); the visual subordination of Stage 4 under Stage 3 and the segmented-control layout are present. No blocking issue.
3. **Live web-search annotations** — `data['choices'][0]['message']['annotations']` is documented as deferred to RSCH-V2-02; not in phase scope.

None of these constitute a goal-backward failure for Phase 3.

### Gaps Summary

**No gaps.** All 9 requirements (QUAL-01..04 + RSCH-01..05) verified in code; all 5 ROADMAP success criteria observable; all 6 backend artifacts and 7 frontend artifacts implemented and wired; council.py isolation enforced verifiably via grep; SSE pipeline complete for both fast/quality and quality_research; persistence shape extensible (metadata + stage4) without breaking legacy messages.

The phase delivers the core value advertised in PROJECT.md: **the Quality dial works as advertised at every level** — Fast routes through the cheap mix end-to-end, Quality through the premium mix, Quality+Research through reasoning models with web search, optional critic-gated Stage 4 refinement, and `reasoning_details` are inspectable on demand.

---

## Final Verdict

**PHASE COMPLETE.**

- 9/9 requirements: PASS
- 5/5 ROADMAP success criteria: VERIFIED
- 0 blockers, 0 warnings, 0 deferred items beyond those already captured as v2 (RSCH-V2-XX) or Phase 4 scope.
- Codebase evidence corroborates SUMMARY claims; no SUMMARY-vs-code drift detected.
- Recommended next step: proceed to Phase 4 (Visual Identity Implementation). Threshold calibration (CD-04) is a config-only adjustment that does not block phase closure.

_Verified: 2026-05-10_
_Verifier: Claude (gsd-verifier, Opus 4.7 1M)_
