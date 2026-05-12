---
phase: 05
plan: 03
subsystem: frontend-critique-entrypoint
tags:
  - frontend
  - critique-mode
  - multipart
  - sse
  - sidebar
  - welcome-state
requires:
  - 05-01  # mode kwarg on storage.create_conversation + CreateConversationRequest.mode
  - 05-02  # POST /critique/stream multipart endpoint with empty stage2_complete drain
provides:
  - api.createConversation(mode)
  - api.sendCritiqueStream(id, instruction, slots, onEvent)
  - critiqueRateLimit.getRecentRunCount / recordCritiqueRun / shouldReconfirm
  - download.MAX_CRITIQUE_FILE_BYTES (750 * 1024)
  - Sidebar onNewCritiqueConversation prop + .conversation-pill rendering
  - App.handleStreamEvent (shared SSE reducer for fresh + critique flows)
  - App.handleNewCritiqueConversation + handleSubmitCritique
  - ChatInterface mode-aware welcome routing
  - CritiqueWelcome component (3 slots + textarea + cost-estimate + Submit)
  - DropZoneSlot component (idle / dragover / loaded states)
affects:
  - frontend/src/components/Sidebar.jsx
  - frontend/src/components/Sidebar.css
  - frontend/src/components/ChatInterface.jsx
  - frontend/src/components/CritiqueWelcome.jsx
  - frontend/src/components/CritiqueWelcome.css
  - frontend/src/components/DropZoneSlot.jsx
  - frontend/src/components/DropZoneSlot.css
  - frontend/src/App.jsx
  - frontend/src/api.js
  - frontend/src/utils/download.js
  - frontend/src/utils/critiqueRateLimit.js
tech-stack:
  added: []
  patterns:
    - "shared SSE-event reducer via top-level useCallback (W-2 lock — no duplicated switch)"
    - "FormData multipart fetch with NO explicit Content-Type so the browser writes the boundary"
    - "localStorage timestamp-array soft rate limit with rolling 1h window"
    - "co-located component CSS (one .css per .jsx, consumed via import)"
    - "token-only CSS — zero hex literals in new component stylesheets"
    - "adjacent-sibling CSS rule (.new-conversation-btn + .new-conversation-btn) for sibling-button gap without introducing a new class"
key-files:
  created:
    - frontend/src/components/CritiqueWelcome.jsx
    - frontend/src/components/CritiqueWelcome.css
    - frontend/src/components/DropZoneSlot.jsx
    - frontend/src/components/DropZoneSlot.css
    - frontend/src/utils/critiqueRateLimit.js
  modified:
    - frontend/src/components/Sidebar.jsx (added second button + Critique pill rendering)
    - frontend/src/components/Sidebar.css (added pill style + adjacent-sibling gap rule)
    - frontend/src/components/ChatInterface.jsx (branches welcome on conversation.mode)
    - frontend/src/App.jsx (factored handleStreamEvent + added critique handlers)
    - frontend/src/api.js (createConversation accepts mode + new sendCritiqueStream)
    - frontend/src/utils/download.js (added MAX_CRITIQUE_FILE_BYTES const)
decisions:
  - "Hardcoded QUALITY_SLOT_MODELS in CritiqueWelcome.jsx with a code comment 'MUST mirror PROFILES[quality][council_models] in backend/config.py' — single-source-of-truth nudge; if backend profile changes, this array must be updated in lockstep"
  - "handleStreamEvent factored as a useCallback at module scope (W-2 lock); both handleSendMessage and handleSubmitCritique dispatch through it"
  - "Existing SSE reducer NOT modified — only relocated. The empty stage2_complete payload from Plan 05-02 drains the existing stage2 branch without any new conditional (n=1 critique case)"
  - "Critique handleSubmitCritique passes errorContext=null to handleStreamEvent — the ErrorBanner Retry path will be a no-op for critique flows until Phase 6+ extends it"
  - "Fresh-prompt input form hidden when conversation.mode === 'critique' so CritiqueWelcome owns the entire entry-point UI (D-02)"
  - "Inline modal (not the shared Modal component) used for the rate-limit reconfirm — keeps CritiqueWelcome import surface minimal; backdrop pattern mirrors Modal.css (rgba(28,26,23,0.55))"
metrics:
  duration_minutes: ~10
  tasks: 2
  files_created: 5
  files_modified: 6
  commits: 2
completed: 2026-05-10
---

# Phase 05 Plan 03: Frontend Critique Entry Point Summary

Wave 2 of phase 5 lands the frontend critique entry point end-to-end. A second sidebar button now creates a `mode: "critique"` conversation; the chat panel renders a dedicated welcome state with 3 model-labeled drop-zones, a required instruction textarea, a live cost-estimate line, and a Submit button; the Submit dispatches a multipart POST to the Wave-1 backend endpoint whose SSE events drain into a shared `handleStreamEvent` reducer that ALSO services the existing fresh-prompt flow — no reducer branching for critique-vs-fresh.

## Locked Verbatim Strings Preserved in Code

All UI-SPEC §"Copywriting Contract" strings landed verbatim in the source:

| String | File | Source line |
|--------|------|-------------|
| `+ New critique` | `frontend/src/components/Sidebar.jsx:283` | UI-SPEC sidebar second button |
| `Critique` (pill text) | `frontend/src/components/Sidebar.jsx:118` | UI-SPEC D-03 pill |
| `Critique research` | `frontend/src/components/CritiqueWelcome.jsx:175` | UI-SPEC welcome title |
| `Upload up to three deep-research files. The council will read them all, critique each one, then synthesise.` | `frontend/src/components/CritiqueWelcome.jsx:176-178` | UI-SPEC welcome lead |
| `Drop deep research here, or click to upload (.md / .txt, max 750KB)` | `frontend/src/components/DropZoneSlot.jsx:96-98` | UI-SPEC drop-zone empty state |
| `Identify factual errors, missing perspectives, and weak arguments in these research files…` | `frontend/src/components/CritiqueWelcome.jsx:194` | UI-SPEC textarea placeholder (D-07) |
| `Estimated upstream: $X.XX–$Y.YY (billed to your provider keys, not OpenRouter)` | `frontend/src/components/CritiqueWelcome.jsx:217-219` | UI-SPEC cost microcopy |
| `Submit critique` | `frontend/src/components/CritiqueWelcome.jsx:227` | UI-SPEC primary CTA |
| `Attach at least one file and write a critique instruction to submit` | `frontend/src/components/CritiqueWelcome.jsx:91-93` (tooltip) | UI-SPEC disabled tooltip |
| `{filename} is {size_kb} KB — maximum is 750 KB. Trim the file or split it.` | `frontend/src/components/CritiqueWelcome.jsx:102-103` | UI-SPEC file-too-large error |
| `{filename} must be .md or .txt. PDF and DOCX are not supported.` | `frontend/src/components/CritiqueWelcome.jsx:111-112` | UI-SPEC unsupported-extension error |
| `These files total ≈{N}K tokens, above the 150K cap. Remove one file or trim the largest.` | `frontend/src/components/CritiqueWelcome.jsx:152-155` | UI-SPEC over-token-cap error |
| `You have launched 5 critiques in the last hour. Continue?` | `frontend/src/components/CritiqueWelcome.jsx:244-246` | UI-SPEC rate-limit reconfirm |
| `✅ {filename}  {size_kb} KB  ✕` (chip layout) | `frontend/src/components/DropZoneSlot.jsx:77-89` | UI-SPEC drop-zone loaded chip |

## Slot Model Order — Single-Source-of-Truth Nudge

The 3 drop-zone slot labels are hardcoded at the top of `CritiqueWelcome.jsx`:

```js
// MUST mirror PROFILES["quality"]["council_models"] order in backend/config.py
const QUALITY_SLOT_MODELS = [
  'openai/gpt-5.5',
  'anthropic/claude-opus-4.7',
  'google/gemini-3.1-pro-preview',
];
```

Slot index `i` maps to model `QUALITY_SLOT_MODELS[i]`, which is the same convention Plan 05-02's `MAX_CRITIQUE_FILE_BYTES` server-side enforces (the multipart `file_slot_i` form field lands at slot index `i`, which is then assigned to `slot_models[i]` via the same `PROFILES["quality"]["council_models"]` list). If the backend profile changes, this array MUST be updated in lockstep — flagged for code review.

## Shared SSE Reducer (W-2 Plan-Checker Lock)

The previously-inline switch statement from `handleSendMessage` (App.jsx) is now a top-level `useCallback`-wrapped helper:

```js
const handleStreamEvent = useCallback((eventType, event, errorContext) => {
  switch (eventType) {
    case 'stage1_start': /* ... */
    case 'stage1_complete': /* ... */
    case 'stage2_start': /* ... */
    case 'stage2_complete': /* n=1 case (critique): event.data === [], metadata empty — drained identically */
    /* ... full set of fresh-prompt cases preserved verbatim ... */
  }
}, []);
```

Both `handleSendMessage` and `handleSubmitCritique` dispatch through it:

```js
// fresh-prompt
await api.sendMessageStream(id, content, profile,
  (eventType, event) => handleStreamEvent(eventType, event, { originalContent, originalProfile }));

// critique
await api.sendCritiqueStream(id, instruction, slots,
  (eventType, event) => handleStreamEvent(eventType, event, null));
```

The empty `stage2_complete` payload from Plan 05-02 (when `n=1`) drains the existing `stage2_complete` branch with `lastMsg.stage2 = []` and `lastMsg.metadata = {label_to_model: {}, aggregate_rankings: []}`. The Stage2 component renders nothing useful in that case but the reducer doesn't care.

**No new SSE event types added. No new reducer branches added.**

## Fresh-Prompt Path — Bit-for-Bit Preserved

Verified by code inspection + build:

- `+ New conversation` button still calls `handleNewConversation` → `api.createConversation()` (no args). `api.createConversation(mode='fresh')` defaults to `'fresh'` server-side, identical to v1 wire behavior.
- The existing fresh-prompt `<form className="input-form">` still renders when `conversation.messages.length === 0 && conversation.mode !== 'critique'`. For fresh conversations (`mode === 'fresh'` or undefined for v1 conversations), this evaluates to `true` and the textarea renders.
- `handleSendMessage`'s entire optimistic-message setup is byte-identical; only the inline switch was relocated into `handleStreamEvent`.
- `api.sendMessageStream`'s implementation is untouched.

## Cost-Estimate Heuristic

`CritiqueWelcome.estimateCostRange(slots, instruction)` follows RESEARCH §4.2:

- Input chars = sum of all attached file `.content.length` + `instruction.length`.
- Input tokens = `activeChars * 0.25 * n` (each of n active models sees the full prompt).
- Output tokens = `2000 * n + 1500` (per-model Stage 1/2 + shared Stage 3).
- Worst-case anchor rates: Opus 4.7 at `$5/M` input + `$25/M` output.
- Display range: `[base * 0.7, base * 1.3]` formatted to 2 decimals.

Recomputes on every slot or textarea change via `useMemo`. When no files are attached, the cost line is hidden (cleaner UX than `$0.00–$0.00`).

## Soft Rate Limit (CRIT-07)

`frontend/src/utils/critiqueRateLimit.js`:

```js
const STORAGE_KEY = 'critique-run-timestamps';
const WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const LIMIT = 5;
```

- `getRecentRunCount()` — reads + filters + returns count; corrupted JSON returns 0.
- `recordCritiqueRun()` — appends `Date.now()` to the filtered array.
- `shouldReconfirm()` — returns `count >= LIMIT`.

On the 6th submit within the rolling hour, the welcome state shows a verbatim-copy reconfirm modal. T-05-09 accepted: clearing localStorage bypasses the gate (UX guard only, not security).

## Token Usage Discipline (UI-SPEC §Color tokens-only rule)

Both new component stylesheets pass the "no hex" acceptance criterion:

| File | `#[0-9A-Fa-f]{3,6}` matches |
|------|-----------------------------|
| `frontend/src/components/CritiqueWelcome.css` | 0 |
| `frontend/src/components/DropZoneSlot.css` | 0 |

Declared exceptions: the 120px `min-height` on `.drop-zone-slot__area` (UI-SPEC §Spacing exception 1 — content-area dimension). The reconfirm-modal backdrop uses `rgba(28, 26, 23, 0.55)` — same pattern as `Modal.css`, NOT a hex color (so it doesn't trigger the acceptance regex).

## Critical Decision Locks Validated

| Lock | Check |
|------|-------|
| D-01 — second button reuses `.new-conversation-btn` class; no new CSS class for it | PASS — `Sidebar.jsx:282-287`, gap via adjacent-sibling rule in `Sidebar.css:153-155` |
| D-03 — `<span class="conversation-pill">Critique</span>` ONLY when `conv.mode === 'critique'` | PASS — `Sidebar.jsx:117-119` |
| D-04 — 3 DropZoneSlot in QUALITY_SLOT_MODELS order, labels are full `publisher/model-id`, empty microcopy verbatim | PASS — `CritiqueWelcome.jsx:11-15, 184-192`, `DropZoneSlot.jsx:96-98` |
| D-05 — Submit enabled with ≥1 file (not requiring all 3) + whitespace-trimmed instruction | PASS — `CritiqueWelcome.jsx:81-84` |
| D-06 — no drag-between-slots, no dropdown caret on chip; only remove + re-upload | PASS — `DropZoneSlot.jsx:31-32` (slot ? return) blocks re-pick on loaded; no caret-menu code anywhere |
| D-07 — textarea placeholder verbatim; Submit disabled while textarea whitespace-empty | PASS — `CritiqueWelcome.jsx:194, 82-84` |
| W-2 — `handleStreamEvent` is top-level helper; both handlers dispatch through it; no inline-copy | PASS — `App.jsx:101-227`, called from `handleSendMessage` at 264 and `handleSubmitCritique` at 322 |

## Build & Lint

| Check | Result |
|-------|--------|
| `npm run build` | OK — `[32m✓ built in 3.98s[39m`, 528 modules transformed, no errors |
| ESLint on all new + touched files | clean — no errors, no warnings |
| All Task 1 acceptance greps | PASS |
| All Task 2 acceptance greps | PASS |
| No hex colors in CritiqueWelcome.css | PASS (0 matches) |
| No hex colors in DropZoneSlot.css | PASS (0 matches) |
| No `Content-Type` on `sendCritiqueStream` fetch | PASS (0 matches in 30-line window around method) |
| `MAX_FILE_BYTES = 500 * 1024` still present (existing cap NOT regressed) | PASS (`download.js:5`) |

## Threat Surface

No new surfaces beyond the planned `<threat_model>`:

- **T-05-07** (client-side validation defense in depth) — mitigated. `CritiqueWelcome.handleFile` enforces size + extension client-side; server is authoritative per Plan 05-02.
- **T-05-08** (cost-estimate recompute DoS) — accepted, `useMemo` is cheap (<1ms).
- **T-05-09** (rate-limit via localStorage bypass) — accepted, UX guard only.
- **T-05-10** (no audit log) — accepted, single-user local app.

No new threat flags introduced. No new network endpoints, no new auth paths, no new file-access patterns at trust boundaries.

## Known Stubs

None at the welcome state level. The `external_research` dict in the optimistic assistant message is keyed by `slot.modelId` so that Plan 05-04 hydration (CRIT-08 ExternalResearchPanel) has the canonical shape to consume on reload.

The shape currently lives only in component state during the live stream; persistence is handled server-side via `add_assistant_message(external_research=...)` (Plan 05-01 + 05-02). On reload, the assistant message will carry `external_research` from disk — but rendering the chips requires the `ExternalResearchPanel` component which is Plan 05-04 scope (deferred).

Critique flow ErrorBanner Retry is a no-op (passes `errorContext=null`); documented in App.jsx code comment. Phase 6+ may extend it.

## Manual Smoke Test Checklist (for code reviewer)

1. Start backend + frontend dev server.
2. Sidebar shows two stacked buttons; `+ New critique` is below `+ New Conversation` with `var(--space-2)` gap.
3. Click `+ New critique` → conversation appears in sidebar with `Critique` pill; chat panel shows CritiqueWelcome (title + lead + 3 dropzones + textarea + Submit disabled).
4. Click `+ New conversation` → conversation appears WITHOUT pill; chat panel shows fresh welcome + textarea (unchanged from v1).
5. In critique welcome: try uploading a `.pdf` → inline error `... must be .md or .txt. PDF and DOCX are not supported.`
6. Try uploading a file >750KB → inline error `... maximum is 750 KB. Trim the file or split it.`
7. Upload a small `.md` + write instruction → Submit enables; cost line shows `Estimated upstream: $X.XX–$Y.YY (billed to your provider keys, not OpenRouter)`.
8. Click Submit → DevTools Network shows POST `/api/conversations/{id}/critique/stream` as `multipart/form-data; boundary=...`; SSE events flow; Stage1/2/3 panels render via the shared reducer.
9. n=1 case (single file): Stage 2 renders empty (event.data === []) without crashing the reducer.
10. n=3 case (all 3 files): full council with anonymized peer review + aggregate rankings + chairman synthesis.
11. Submit 5 critiques in <1 hour → 6th click opens the verbatim reconfirm modal.
12. Existing fresh-prompt flow: bit-for-bit unchanged.

## Deviations from Plan

None — plan executed exactly as written, including the W-2 plan-checker lock on the shared SSE reducer.

## Commits

- `1de5538` — `feat(05-03): add critique sidebar entry point + multipart api + rate-limit util` (Task 1)
- `2875b4d` — `feat(05-03): wire CritiqueWelcome + DropZoneSlot + shared SSE reducer` (Task 2)

## Self-Check: PASSED

Files created — all FOUND:
- `frontend/src/components/CritiqueWelcome.jsx`
- `frontend/src/components/CritiqueWelcome.css`
- `frontend/src/components/DropZoneSlot.jsx`
- `frontend/src/components/DropZoneSlot.css`
- `frontend/src/utils/critiqueRateLimit.js`
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-03-SUMMARY.md`

Files modified — all FOUND:
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/Sidebar.css`
- `frontend/src/components/ChatInterface.jsx`
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `frontend/src/utils/download.js`

Commits exist:
- `1de5538` — FOUND in `git log --oneline --all`
- `2875b4d` — FOUND in `git log --oneline --all`
