---
phase: 03-quality-dial-pragmatic-deep-research
plan: 05
subsystem: frontend
tags: [quality-dial, reasoning-disclosure, stage4, segmented-control, sse, download-export]
requires:
  - 03-01-SUMMARY.md  # PROFILES + reasoning kwarg
  - 03-02-SUMMARY.md  # profile-aware run_full_council + SendMessageRequest.profile
  - 03-03-SUMMARY.md  # MessageHeader + message_metadata SSE event
  - 03-04-SUMMARY.md  # research_strategy + critic + Stage 4 + new SSE events
provides:
  - "QualityToggle 3-state segmented control (Direction A footnote-style cost surfacing)"
  - "ReasoningDisclosure collapsable component (whitelist filter: reasoning.summary + reasoning.text only)"
  - "Stage4 sub-section component rendered inside the Stage 3 panel"
  - "Profile state propagation E2E: ChatInterface state → handleSendMessage → api.sendMessageStream → backend body → persisted JSON metadata → MessageHeader render"
  - "SSE event dispatch for critic_complete, stage4_start, stage4_complete (QR pipeline)"
  - "Extended download helpers: buildFinalAnswerMarkdown prefers stage4.response when refined; buildFullDeliberationMarkdown appends ## Critic + ## Stage 4 — Refinement sections plus profile footer"
affects:
  - "QUAL-03 closed (toggle UX)"
  - "RSCH-03 closed (Stage 4 visible end-to-end + extended markdown export)"
  - "RSCH-05 closed (reasoning disclosure pattern; whitelist summary/text)"
  - "All 21 v1 requirements satisfied (was 16/21 → now 21/21)"
  - "Phase 3 ROADMAP success criteria 5/5 satisfied"
  - "Phase 4 entry contract: hex placeholders in QualityToggle.css / ReasoningDisclosure.css / Stage4.css are transition tokens for Direction A swap"
tech-stack:
  added: []
  patterns:
    - "Controlled segmented control with hidden native radios + label-as-visual-control (a11y preserved via role=radiogroup + aria-label)"
    - "Whitelist-filter disclosure: caller passes raw reasoning_details, component decides null-render vs collapsed-render based on filtered length"
    - "Sub-component composition: Stage4 mounted INSIDE Stage3 panel rather than as sibling (visual subordination matches D-15 hierarchy)"
    - "Optional-chained SSE event handlers: lastMsg.loading = { ...(lastMsg.loading || {}), stage4: true } — never assumes prior shape, additive"
key-files:
  created:
    - "frontend/src/components/QualityToggle.jsx"
    - "frontend/src/components/QualityToggle.css"
    - "frontend/src/components/ReasoningDisclosure.jsx"
    - "frontend/src/components/ReasoningDisclosure.css"
    - "frontend/src/components/Stage4.jsx"
    - "frontend/src/components/Stage4.css"
    - ".planning/phases/03-quality-dial-pragmatic-deep-research/03-05-SUMMARY.md"
  modified:
    - "frontend/src/App.jsx"
    - "frontend/src/api.js"
    - "frontend/src/components/ChatInterface.jsx"
    - "frontend/src/components/ChatInterface.css"
    - "frontend/src/components/Stage1.jsx"
    - "frontend/src/components/Stage3.jsx"
    - "frontend/src/utils/download.js"
decisions:
  - "Toggle layout (CD-02): segmented control with hidden native radios — label is the visual control, role=radiogroup preserves keyboard semantics. Direction A footnote-style cost surfacing always visible (no tooltip)."
  - "Stage 4 placement (D-15): mounted INSIDE the Stage 3 panel as a child of <Stage3>, not as a sibling at ChatInterface level. Visually subordinate via .stage4 CSS reset (background: transparent, border-top dashed only) so the parent .stage3 panel's frame contains both the synthesis and the refinement."
  - "ReasoningDisclosure normalises non-array `details` (object → wrapped array; null → empty) before whitelist filter — defensive against future OpenRouter shape variations. The whitelist (summary/text only) is exact and intentional: encrypted blobs and unknown reasoning types are dropped without warning."
  - "Stage 4 spinner placed BETWEEN Stage 3 spinner and the Stage 3 panel render — fires after stage3_complete but before the refined answer arrives. Critic invocation has no spinner (it's a single fast call with no SSE start event in the strategy)."
  - "downloads.js extended signatures preserve back-compat: buildFinalAnswerMarkdown without `stage4` still works (isRefined → false → original path); buildFullDeliberationMarkdown without `critic`/`stage4`/`messageMetadata` still works (sections gated by truthy checks)."
metrics:
  duration_minutes: 22
  tasks_completed: 2
  files_changed: 13
  date: 2026-05-10
---

# Phase 03 Plan 05: Frontend Quality Dial Wiring — Summary

The Quality Dial closes the loop end-to-end. Users now have a 3-state toggle
right above the textarea with always-visible cost bands, the reasoning chains
that Opus 4.7 / Gemini 3.1 Pro / o4-mini emit are renderable on demand per
Stage 1 tab, and when the QR critic gates a synthesis below threshold the
refined answer materialises as a sub-section directly under the chairman's
output — with the critic's score and primary concern displayed inline.

## Microcopy Locked

| Surface | Microcopy |
|---------|-----------|
| Toggle option labels (CD-01 from Plan 03-03) | `Fast` / `Quality` / `Quality+Research` |
| Toggle cost bands (frontend literal-mirror of backend `typical_cost`) | `~$0.001` / `~$0.05 typical` / `~$0.45 typical` |
| Disclosure collapsed | `▶ Show reasoning` |
| Disclosure expanded | `▼ Hide reasoning` |
| Stage 4 header | `Stage 4: Refinement` |
| Stage 4 critic line (D-17) | `Critic scored synthesis N/10 — refinement triggered` |
| Stage 4 reason line | `Reason: <primary_concern>` (or `(no specific concern parsed)` fallback) |
| Stage 4 spinner | `Running Stage 4: Refining synthesis...` |
| Final-answer markdown title (no refinement) | `# LLM Council — Final Answer` |
| Final-answer markdown title (refined) | `# LLM Council — Final Answer (refined)` |
| Final-answer chairman line (refined) | `**Chairman**: \`{model}\` (with Stage 4 refinement)` |
| Final-answer footnote (refined) | `<sub>Refined after critic scored synthesis N/10. Reason: ...</sub>` |
| Full-deliberation new sections | `## Critic` and `## Stage 4 — Refinement` |
| Full-deliberation profile footer | `<sub>Profile: **Quality+Research** • 4 models • Chairman: \`...\` • Stage 4 fired</sub>` |

## ROADMAP Success Criteria — End-to-End Verification

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Quality dial 3-state toggle visible per-query** | `<QualityToggle value={profile} onChange={setProfile} disabled={isLoading} />` mounted above the input-row inside the input-form; controlled by ChatInterface's `useState('fast')`. Always visible while the input form is rendered. |
| 2 | **Profile propagated E2E (UI → backend → persisted)** | `handleSubmit → onSendMessage(fullPrompt, profile)` (ChatInterface) → `handleSendMessage(content, profile)` (App) → `api.sendMessageStream(id, content, profile, onEvent)` (api.js) → `JSON.stringify({ content, profile })` body → backend `SendMessageRequest.profile` (Plan 03-02) → persisted `metadata.profile` (Plan 03-03) → re-rendered as `MessageHeader` chip on conversation reload. Plan 03-03's MessageHeader component already supports `metadata.stage4_triggered === true` to suffix the header with `+ Stage 4 refinement` (verified by inspection — no rework needed). |
| 3 | **Pragmatic deep research with reasoning + web search + Stage 4** | QR profile (Plan 03-01) routes 4 `:online` reasoning models through `research_strategy.run` (Plan 03-04) which emits `critic_complete` + (conditionally) `stage4_start`/`stage4_complete`. App.jsx switch dispatches each event into the assistant message slots (`critic`, `loading.stage4`, `stage4`). Stage4.jsx renders the sub-section when `stage4` is truthy. |
| 4 | **Reasoning disclosure pattern (RSCH-05)** | ReasoningDisclosure.jsx whitelists `reasoning.summary` + `reasoning.text` only; renders nothing when filtered array is empty (D-23). Mounted per Stage 1 tab (`<ReasoningDisclosure details={responses[activeTab].reasoning_details} />`) and per Stage 4 panel when `stage4.reasoning_details` is present. |
| 5 | **Extended markdown export covers Stage 4 + critic** | `buildFinalAnswerMarkdown({ question, finalResponse, stage4 })` prefers `stage4.response` over `finalResponse.response` when refined and tags the title `(refined)`. `buildFullDeliberationMarkdown({ ..., stage4, critic, messageMetadata })` appends `## Critic` + `## Stage 4 — Refinement` sections plus a profile footer. ChatInterface's `handleDownloadConversation` now passes all four new fields. |

All five satisfied → Phase 3 closes. The 21/21 v1 requirements coverage hits
100%.

## Wireframe Adherence

| Wireframe | Adherence |
|-----------|-----------|
| W13 (Quality toggle Direction A) | EXACT. Segmented control with footnote-style cost band per option. Hidden native radio + label-as-visual-control. |
| W15 (disclosure collapsed) | EXACT label `▶ Show reasoning`; padding/colors are Phase 4 transition tokens (intentional, see "Deferred to Phase 4"). |
| W16 (disclosure expanded) | EXACT label `▼ Hide reasoning`; reasoning body uses dashed left border + soft gray background as a "muted aside" treatment (W16 specifies "set apart from the response"). |
| W17 (Stage 4 sub-section, if extant) | The plan's `<interfaces>` shape is treated as canonical here. Header "Stage 4: Refinement", critic-meta box with amber-highlighted score, refined response in white panel matching Stage 3 styling. |

No visual deviations. Direction A token swap (Phase 4) will replace the hex
literals (`#4a90e2`, `#f0fff0`, `#fffaf0`, `#d97706`, etc.) with semantic
design tokens; the JSX shape and class names are final.

## Decisions Made

### Stage 4 Mounted INSIDE the Stage 3 Panel (D-15 — Option A)

Plan listed two options:

- **Option A** (chosen): `<Stage4>` rendered as a child of `<Stage3>` so the
  Stage 3 panel's `.stage3` frame visually contains both the synthesis and
  the refinement.
- **Option B**: Stage4 as sibling at ChatInterface level, with CSS visually
  subordinating it.

Rationale: D-15 explicitly says "sub-sección DEBAJO de Stage 3 EN EL MISMO
PANEL". Option A is the literal reading; the parent `.stage3` background
(`#f0fff0`) frames the whole "final synthesis" cluster — Stage 4 is reset
inside it (`background: transparent`, `border-top: 1px dashed #c8e6c8`) so it
reads as a continuation of the same panel.

### ReasoningDisclosure Defensively Normalises Input

The contract in `<interfaces>` assumed `details` is always an array. Real
OpenRouter payloads sometimes wrap `reasoning_details` as a single object
(when only one block is emitted) or omit it entirely. The component now:

```js
const arr = Array.isArray(details) ? details : details ? [details] : [];
```

This is defensive normalisation, not a deviation — the whitelist filter still
runs on the array; behaviour for the contracted shape is identical.

### Profile is NOT Reset After Send

D-30 (implicit): the input form is hidden after `messages.length > 0` (single-
shot conversation design preserved per PROJECT.md Out of Scope). Resetting
`profile` to `'fast'` post-send would have zero observable effect in the
single-shot flow. The current design — `profile` persists across the form
lifecycle — is forward-compatible with multi-turn (also explicitly Out of
Scope) without needing rework.

### Spinner Placement: Stage 4 Above Stage 3 Render

Order in JSX:

1. Stage 1 spinner / Stage 1 panel
2. Stage 2 spinner / Stage 2 panel
3. Stage 3 spinner
4. **Stage 4 spinner** ← new
5. Stage 3 panel (which contains Stage 4 sub-section)

Why above and not below: when `stage4_start` fires, `stage3_complete` has
already arrived (so `msg.stage3` is truthy and the panel renders). Putting
the spinner inside the panel would cause a layout shift on every QR query.
Putting it above the panel means: panel slides down to make room for the
spinner, then spinner disappears and the Stage 4 sub-section materialises
inside the panel — net layout shift = zero.

### Deviations from Plan

**1. [Plan-precision adjustment] Stage 4 mounted in Stage 3 instead of being prop-drilled through ChatInterface**

- **Found during:** Task 2 implementation.
- **Plan said:** "Pasar `stage4={msg.stage4}` al render de `<Stage3>`" (so the
  prop arrives in Stage3) AND "Stage4 como child de Stage 3 panel". Both true
  simultaneously; the plan was internally consistent — Stage3 receives the
  prop and renders Stage4 internally.
- **Implementation:** Stage3.jsx accepts `stage4` prop and renders
  `<Stage4 stage4={stage4} />` at the bottom of its return; ChatInterface
  passes `stage4={msg.stage4}` to `<Stage3>`. ChatInterface itself does not
  import Stage4.
- **Why this matters:** acceptance criterion `grep -c "import Stage4"
  frontend/src/components/Stage3.jsx == 1` ✓; the equivalent grep for
  ChatInterface.jsx is 0 (and that's correct).

**No other deviations.** Both tasks executed as specified.

## Self-Check: PASSED

Files claimed exist:
- `frontend/src/components/QualityToggle.jsx` — FOUND
- `frontend/src/components/QualityToggle.css` — FOUND
- `frontend/src/components/ReasoningDisclosure.jsx` — FOUND
- `frontend/src/components/ReasoningDisclosure.css` — FOUND
- `frontend/src/components/Stage4.jsx` — FOUND
- `frontend/src/components/Stage4.css` — FOUND

Modified files at expected commit hashes:
- `frontend/src/App.jsx` — modified, commit `927130e`
- `frontend/src/api.js` — modified, commit `927130e`
- `frontend/src/components/ChatInterface.jsx` — modified, commits `927130e` + `a9c043c`
- `frontend/src/components/ChatInterface.css` — modified, commit `927130e`
- `frontend/src/components/Stage1.jsx` — modified, commit `927130e`
- `frontend/src/components/Stage3.jsx` — modified, commit `a9c043c`
- `frontend/src/utils/download.js` — modified, commit `a9c043c`

Commits exist (`git log --oneline -3`):
- `927130e` feat(03-05): add QualityToggle, ReasoningDisclosure, wire profile + new SSE events — FOUND
- `a9c043c` feat(03-05): add Stage4 sub-section + extend download helpers for refined answer — FOUND

Build verification: `npm --prefix frontend run build` completed in 3.6s with
no errors and no unused-import warnings (only the pre-existing chunk-size
notice for the React bundle — unchanged from prior plans).

All grep acceptance criteria from Task 1 and Task 2 verified passing (see
commit messages for the bundled grep summary).

## Open Items (post-Phase-3)

- **Phase 4 token migration**: hex placeholders in `QualityToggle.css`,
  `ReasoningDisclosure.css`, `Stage4.css` (and the pre-existing
  `MessageHeader.css`) are intentional Phase 4 transition tokens. Direction A
  swap will replace them without touching JSX or class names.
- **CD-04 calibration of `stage4_threshold` (8/10)**: still pending real-run
  observation per Plan 03-04. Frontend is now ready to surface the rate at
  which Stage 4 fires (via `metadata.stage4_triggered` in the message header)
  so the user can monitor.
- **Web search annotations** (`data['choices'][0]['message']['annotations']`)
  remain v2 (RSCH-V2-02) as planned.
- **Backwards compat**: opening a pre-Phase-3 conversation will render the
  legacy fallback header `Quality (legacy)` (Plan 03-03), no Stage 4
  sub-section, no reasoning disclosures (the persisted messages don't have
  `reasoning_details`). Verified by inspection of the conditional renders.
