---
phase: 05-critique-mode-schema-migration-in-conversation-navigation
verified: 2026-05-10T00:00:00Z
status: human_needed
score: 5/5 success criteria verified
overrides_applied: 0
requirements_covered: 13/13
human_verification:
  - test: "Run a full n=3 critique end-to-end with three real .md files (~50-300KB each), one per Quality slot"
    expected: "Multipart POST to /api/conversations/{id}/critique/stream returns SSE stream; Stage 1 emits 3 critiques (each reading [YOUR PRIOR WORK] vs [PEER'S PRIOR WORK]); Stage 2 anonymizes critiques in the peer-review prompt (verify by reading the raw stage2 evaluation tabs — they should refer to 'Author 1/2/3' or generic labels, not raw model IDs); Stage 3 synthesises; reload of the conversation shows 3 collapsed chips that expand on click"
    why_human: "Requires live OpenRouter API keys (BYOK), real .md files, and visual inspection of the Stage 2 tab to confirm anonymization landed in the actual concatenated prompt the models received"
  - test: "Reload a v1.0 conversation (a JSON file in data/conversations/ written before Phase 5 — i.e. without schema_version)"
    expected: "Frontend renders the conversation without TypeError; SHA-256 of the on-disk JSON file is identical before and after the read (lazy, no eager write-back); a subsequent message append organically flushes the v2 shape"
    why_human: "Requires an actual v1.0 conversation file on disk; the working tree's data/conversations/ is gitignored and may be empty. Plan 05-01 verified this synthetically with a temp DATA_DIR; production verification needs a real legacy file"
  - test: "Sticky stage headers + scroll-spy chip strip behavior in browser"
    expected: "Scrolling inside .messages-container pins each stage title 48px from the top (just under the chip strip); the chip strip itself pins to top:0 within the scroll container; the active chip highlights as the user scrolls; clicking a chip smooth-scrolls to that section (or instant scroll if prefers-reduced-motion is on)"
    why_human: "Pure UX/visual behavior that depends on viewport size, scroll container measurements, and live IntersectionObserver firing — cannot be verified by static grep"
  - test: "Back-to-top button appearance and prefers-reduced-motion respect"
    expected: "After scrolling >800px in the messages container, a circular ↑ button fades in (bottom-right); clicking it smooth-scrolls to top (or instant-scrolls with prefers-reduced-motion enabled at OS level)"
    why_human: "Requires a long deliberation rendered (>800px scroll) and an OS-level prefers-reduced-motion toggle to verify the per-click matchMedia branch fires"
  - test: "Soft rate-limit reconfirmation modal after 5 critiques in 1 hour"
    expected: "On the 6th critique submission within a rolling 1h window, the verbatim modal 'You have launched 5 critiques in the last hour. Continue?' appears; localStorage carries the timestamp array"
    why_human: "Requires running 5 real critiques (live API calls); cannot be programmatically verified without firing actual submissions"
  - test: "n=1 single-file critique end-to-end"
    expected: "Submitting with only file_slot_0 populated triggers Stage 1 with one critique, emits empty stage2_complete (data=[], empty metadata) so the React reducer drains without UI breakage, and Stage 3 synthesises directly from the single critique"
    why_human: "Requires live API call to confirm SSE event sequence renders correctly in the UI (Stage 2 panel should appear empty/absent without crashing)"
---

# Phase 5: Critique mode + Schema migration + In-conversation navigation — Verification Report

**Phase Goal (from ROADMAP.md):** El usuario puede subir 3 deep researches externos (uno por modelo del council Quality), lanzar una crítica, y leer la deliberación larga sin perderse — con todas las conversaciones v1.0 cargando sin romperse tras el deploy.

**Verified:** 2026-05-10
**Status:** human_needed (5/5 success criteria PASS on static analysis; 6 items require live testing)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User can pick "Fresh question" vs "Critique research" before starting a deliberation; fresh-prompt flow preserved bit-for-bit when "Fresh question" is picked (D-01 override: two stacked sidebar buttons, not segmented control) | ✓ VERIFIED | `frontend/src/components/Sidebar.jsx:281-291` — two sibling `.new-conversation-btn` buttons; first is `+ New Conversation` (calls `onNewConversation`), second is `+ New critique` (calls `onNewCritiqueConversation`). `Sidebar.css:153-155` adjacent-sibling rule adds `margin-top: var(--space-2)` only to the second button. `App.jsx:73-89` `handleNewCritiqueConversation` → `api.createConversation('critique')`; `App.jsx:75` confirms `mode: 'critique'` stamped at creation. Fresh-prompt path (`handleNewConversation`) uses `api.createConversation()` with no args; backend `CreateConversationRequest.mode = 'fresh'` default. |
| SC-2 | In critique mode: 1-3 .md/.txt files (one per Quality model slot, attribution visible), pre-flight cost estimate, multipart POST to `/critique/stream`, 3 models critique with all researches + attribution, Stage 2 anonymizes (model-name + self-reference strip), Stage 3 synthesises | ✓ VERIFIED | (a) `CritiqueWelcome.jsx:15-19` declares `QUALITY_SLOT_MODELS = ['openai/gpt-5.5', 'anthropic/claude-opus-4.7', 'google/gemini-3.1-pro-preview']` matching `backend/config.py:72-76` PROFILES["quality"]["council_models"]; renders 3 `DropZoneSlot` at L170. (b) Cost line at L217-219 verbatim "Estimated upstream: $X.XX–$Y.YY (billed to your provider keys, not OpenRouter)". (c) `api.js:141-153` `sendCritiqueStream` builds FormData with `critique_instruction` + `file_slot_0..2`, no explicit Content-Type. (d) `main.py:378-384` `POST /api/conversations/{conversation_id}/critique/stream` declares `Form(..., min_length=1)` + 3 `UploadFile = File(None)`. (e) `council.py:43-83` `_build_critique_prompts` includes ALL files in every model's prompt with `[YOUR PRIOR WORK]` (self) and `[PEER'S PRIOR WORK]` (peers) markers + `authored by {other_model}` attribution. (f) `main.py:483-489` Stage 2 invoked with `anonymize_critiques=True, truncate_per_response_tokens=600`. (g) `main.py:497-500` Stage 3 chairman synthesis from `PROFILES["quality"]["chairman_model"]` = `anthropic/claude-opus-4.7`. |
| SC-3 | Reloading a critique conversation shows 3 collapsed chips above assistant message; click expands markdown via CSS `grid-template-rows: 0fr → 1fr` accordion | ✓ VERIFIED | `ExternalResearchPanel.jsx:54-56` accepts `externalResearch` prop, returns `null` on empty; iterates `Object.entries(externalResearch)`. `ExternalResearchPanel.jsx:31` chip has `data-open={open}`. `ExternalResearchPanel.css:84-97` (per SUMMARY 05-04) `.research-chip__panel { display: grid; grid-template-rows: 0fr; transition: ... }` + `.research-chip[data-open="true"] .research-chip__panel { grid-template-rows: 1fr }` — same trick as ReasoningDisclosure. `ChatInterface.jsx:225` mounts `<ExternalResearchPanel externalResearch={msg.external_research} />` guarded by `msg.external_research && ...`. Backend persists via `storage.add_assistant_message(external_research=external_context)` at `main.py:516-523`. |
| SC-4 | All v1.0 conversations load without TypeError; `get_conversation` detects missing `schema_version` and applies `migrate_message_v1_to_v2` lazily; new writes carry `schema_version: 2` at root | ✓ VERIFIED | `backend/storage.py:12` `SCHEMA_VERSION_V2 = 2`. `storage.py:54-69` `migrate_message_v1_to_v2` — idempotent, user-message passthrough, assistant gains `metadata={}` if missing. `storage.py:72-88` `_migrate_conversation_if_needed` — early-return on `schema_version == 2`, otherwise stamps `schema_version`, `mode='fresh'` default, migrates each message. `storage.py:126-148` `get_conversation` calls `_migrate_conversation_if_needed(conv)` on the JSON-loaded dict and returns immediately — verified by reading entire function body: **no `save_conversation(` call inside** (lazy forever, no eager write-back, per D-04 of CONTEXT). `create_conversation` at L91-123 stamps `schema_version: SCHEMA_VERSION_V2` and `mode` at root on every new write. |
| SC-5 | Long deliberations readable: sticky stage headers under global Header; horizontal chip strip with scroll-spy; Stage 1 >600px collapses to "Show more" on reload; Back-to-top after >800px scroll, honors `prefers-reduced-motion` | ✓ VERIFIED | (NAV-01) `Stage1.css:29-30`, `Stage2.css:13-14`, `Stage3.css:50-51 + 61-62`, `Stage4.css:25-26` all carry `position: sticky; top: var(--space-7)`. (NAV-02) `StageNavigationStrip.jsx:64-79` `new IntersectionObserver` with `root: scrollContainerRef.current` (NOT viewport — confirmed at L60-61) + `rootMargin: '-48px 0px -50% 0px'`. `StageNavigationStrip.css:13` `position: sticky` (top:0 in container). Per-click `matchMedia('(prefers-reduced-motion: reduce)')` at L93. (NAV-03) `Stage1.jsx:32` `contentRef.current.scrollHeight > 600` gates the accordion; L61 chevron text "Show less ⌃" / "Show more ⌄"; `Stage1.css:96-130` uses `grid-template-rows: 0fr → 1fr` keyed on `data-open="true"`. `ChatInterface.jsx:260` passes `defaultCollapsed={Boolean(msg.stage3)}` — collapsed on reload of completed conversations. (NAV-04) `BackToTopButton.jsx:18` `setVisible(el.scrollTop > 800)`; L29 per-click `matchMedia('(prefers-reduced-motion: reduce)')` re-check; L38 `aria-label="Back to top"`. `ChatInterface.jsx:324` `<BackToTopButton scrollContainerRef={messagesContainerRef} />`. |

**Score:** 5/5 success criteria verified

### Required Artifacts (key files)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/storage.py` | Migration helpers + lazy invocation in `get_conversation` + no eager write-back + `external_research` kwarg | ✓ VERIFIED | All four contract points present (L12, L54-69, L72-88, L91-123, L126-148, L215-275). Grep confirmed no `save_conversation(` inside `get_conversation` body. |
| `backend/council.py` | `external_context` plumbing + Stage 2 anonymization regex + helpers | ✓ VERIFIED | L23 truncate marker, L28-31 `_MODEL_ID_PATTERNS` precompiled from PROFILES (auto-updates with profile bump), L35-40 `_SELF_REF_PATTERNS` (4 patterns: As Claude / I am X / I, X / as an AI assistant from Y), L43-83 `_build_critique_prompts`, L86-99 `_query_models_individually`, L102-123 `_anonymize_critique_text` (surgical, runs on copy via `{**r, ...}` spread), L126-133 `_truncate_for_stage2` (runs AFTER anonymize so tail can't leak), L136-... `stage1_collect_responses(external_context=None)` extended, L186-188 `stage2_collect_rankings(anonymize_critiques=False, truncate_per_response_tokens=None)` extended — both default-disabled for v1 fresh path. |
| `backend/main.py` | `/critique/stream` endpoint, multipart, 150K cap, `create_conversation(mode)` | ✓ VERIFIED | L21 `MAX_CRITIQUE_FILE_BYTES = 750*1024`, L22 `PREFLIGHT_TOKEN_CAP = 150_000`, L29-39 `CreateConversationRequest.mode: Literal["fresh","critique"] = "fresh"`, L341-375 `_read_and_validate_upload` enforces 750KB/415/utf-8 with HTTPException, L378-537 `/critique/stream` endpoint — pre-stream 400/404/413/415 errors as HTTPException, in-stream `stage1_start → stage2_start → stage2_complete (empty for n=1) → stage3_start → stage3_complete → title_complete → message_metadata → complete`. n=1 branch at L478-481 emits `stage2_results=[], label_to_model={}, aggregate_rankings=[]` (drain-not-skip per D-05). Persistence at L516-523 includes `external_research=external_context` AND `metadata.mode="critique"`. |
| `frontend/src/components/Sidebar.jsx` + `.css` | Two stacked full-width buttons + Critique pill | ✓ VERIFIED | Sidebar.jsx:281 first button (`+ New Conversation`), L285-289 second button (`+ New critique`), both `.new-conversation-btn`. L117 `<span className="conversation-pill">Critique</span>` rendered only when `conv.mode === 'critique'`. Sidebar.css:140-149 `.conversation-pill` uses `var(--font-size-microcopy)` + `var(--color-accent-soft)`. Sidebar.css:153-155 adjacent-sibling gap rule. |
| `frontend/src/App.jsx` | `handleStreamEvent` factored as shared reducer | ✓ VERIFIED | L140 `const handleStreamEvent = useCallback((eventType, event, errorContext) => { ... }, [])` — top-level. L340 fresh-prompt dispatches through it. L362-410 `handleSubmitCritique` → L405-409 `api.sendCritiqueStream(...)` dispatches through it too. No inline reducer duplication. |
| `frontend/src/components/CritiqueWelcome.jsx` | 3 model-labelled slots + required textarea + cost line + Submit gated | ✓ VERIFIED | QUALITY_SLOT_MODELS hardcoded at L15-19 (with code comment "MUST mirror PROFILES[quality][council_models] in backend/config.py" per SUMMARY 05-03). Three `DropZoneSlot` rendered in PROFILES order at L170 via `.map((modelId, i) => ...)`. Textarea + cost-line + Submit verbatim per UI-SPEC strings table in SUMMARY 05-03. |
| `frontend/src/components/DropZoneSlot.jsx` | Idle / dragover / loaded states, no drag-between-slots, no caret menu | ✓ VERIFIED via SUMMARY | Reused chip+✕ pattern from v1.0 ChatInterface attachments (no new DnD). |
| `frontend/src/api.js` | `sendCritiqueStream` multipart with NO Content-Type | ✓ VERIFIED | L141-153 FormData built with `critique_instruction` + `file_slot_${i}` (when slot.file present); fetch body uses FormData with no headers — browser writes `multipart/form-data; boundary=...` itself. SSE reader loop at L162-183 identical to fresh-prompt sendMessageStream. |
| `frontend/src/utils/critiqueRateLimit.js` | LocalStorage timestamp array, 1h rolling window, 5-run threshold | ✓ VERIFIED via SUMMARY | Per SUMMARY 05-03: `STORAGE_KEY='critique-run-timestamps'`, `WINDOW_MS=3600000`, `LIMIT=5`; `getRecentRunCount` / `recordCritiqueRun` / `shouldReconfirm` exported. |
| `frontend/src/components/ExternalResearchPanel.jsx` + `.css` | CSS-only accordion via grid-template-rows | ✓ VERIFIED | L31 `data-open={open}`, L55-56 null guards; CSS uses `grid-template-rows: 0fr → 1fr` keyed on `[data-open="true"]` (per SUMMARY 05-04 verbatim mirror of ReasoningDisclosure). |
| `frontend/src/components/StageNavigationStrip.jsx` | IntersectionObserver with root=scrollContainerRef + per-click matchMedia | ✓ VERIFIED | L60-61 root bound to `scrollContainerRef.current` (NOT viewport); L74-78 `rootMargin: '-48px 0px -50% 0px'`; L93 per-click reduced-motion re-check. Chip omission for empty stage2 (n=1 case): `buildChips` checks `Array.isArray(msg.stage2) && msg.stage2.length > 0` per SUMMARY 05-05. |
| `frontend/src/components/BackToTopButton.jsx` | scrollTop > 800 + per-click matchMedia + aria-label | ✓ VERIFIED | L18 `setVisible(el.scrollTop > 800)`, L29 per-click matchMedia, L38 `aria-label="Back to top"`. |
| `frontend/src/components/Stage1.jsx` + `.css` | scrollHeight > 600 + Show more/less + grid accordion + defaultCollapsed | ✓ VERIFIED | Stage1.jsx:26 `Stage1Tab({ resp, defaultCollapsed })`, L29 `useState(!defaultCollapsed)`, L32 `scrollHeight > 600`, L46 `data-open`, L61 `Show less ⌃ / Show more ⌄`. Stage1.css:106-126 `grid-template-rows: 0fr → 1fr` accordion. |
| `frontend/src/components/Stage{1,2,3,4}.css` | `position: sticky; top: var(--space-7)` on stage titles | ✓ VERIFIED | Confirmed via grep across all four files. |
| `frontend/src/components/ChatInterface.jsx` | Mounts ExternalResearchPanel + StageNavigationStrip + BackToTopButton + data-stage wrappers + messagesContainerRef | ✓ VERIFIED | L9 import StageNavigationStrip, L10 import BackToTopButton, L12 import ExternalResearchPanel. L49 scroll container ref. L225 ExternalResearchPanel mount. L246 StageNavigationStrip mount. L259/272/297 data-stage="stage1"/stage2/stage3 wrappers. L260 `defaultCollapsed={Boolean(msg.stage3)}` (collapsed when Stage 3 has arrived — historical reload). L324 BackToTopButton mount. |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| Sidebar `+ New critique` button | App `handleNewCritiqueConversation` | onClick prop | ✓ WIRED — Sidebar.jsx:287, App.jsx:447 |
| App `handleNewCritiqueConversation` | Backend `POST /api/conversations` (mode=critique) | `api.createConversation('critique')` | ✓ WIRED — App.jsx:75; api.js + main.py `CreateConversationRequest.mode` |
| CritiqueWelcome Submit | App `handleSubmitCritique` | onSubmitCritique prop | ✓ WIRED — App.jsx:362, App.jsx:463 |
| App `handleSubmitCritique` | Backend `POST /critique/stream` | `api.sendCritiqueStream` (multipart) | ✓ WIRED — App.jsx:405-410, api.js:141-153, main.py:378 |
| Backend SSE events | App `handleStreamEvent` | onEvent callback | ✓ WIRED — App.jsx:140, dispatched from both fresh + critique paths |
| Backend persistence | Frontend reload hydration | `add_assistant_message(external_research=...)` → `msg.external_research` → `<ExternalResearchPanel>` | ✓ WIRED — main.py:516-523 → storage.py:215-275 → ChatInterface.jsx:225 |
| StageNavigationStrip click | scrollContainerRef.current.scrollIntoView | per-click matchMedia | ✓ WIRED — StageNavigationStrip.jsx:86-95 |
| BackToTopButton click | scrollContainerRef.current.scrollTo({top:0, behavior}) | per-click matchMedia | ✓ WIRED — BackToTopButton.jsx (per SUMMARY 05-05) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| CritiqueWelcome | slots (3 files + modelId) | Local useState driven by DropZoneSlot onFileSelected | Yes — files are read in-browser, attached to FormData on Submit | ✓ FLOWING |
| ExternalResearchPanel | externalResearch dict | Persisted by main.py:522 (`external_research=external_context`) into `assistant_message["external_research"]` → loaded by `get_conversation` (post-migration) → bound via `msg.external_research` at ChatInterface.jsx:225 | Yes — real file content + filename + size_bytes round-trip through disk | ✓ FLOWING |
| StageNavigationStrip | chips array + activeId | `buildChips(assistantMsg)` reads `msg.stage1/stage2/stage3/stage4 + msg.loading` directly; activeId driven by real IntersectionObserver entries observing real `[data-stage]` DOM elements in `.messages-container` | Yes — observes actual rendered DOM | ✓ FLOWING |
| BackToTopButton | visible state | `.messages-container.scrollTop > 800` real scroll listener; initial `onScroll()` call on mount handles post-reload scroll-preserved position | Yes — real scroll position | ✓ FLOWING |
| Stage1Tab | needsToggle + open | `contentRef.current.scrollHeight > 600` measures real rendered DOM height after content mount; re-keyed by `activeTab` so tab switches re-measure | Yes — real DOM measurement | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend imports cleanly with critique endpoint | (attested by SUMMARY 05-02 verify table: `uv run python -c "import backend.main"` → OK) | Attested | ✓ PASS (attested, not re-run) |
| Frontend builds | (attested by SUMMARY 05-03 / 05-04 / 05-05: `npm run build` exits 0; 528 modules transformed) | Attested | ✓ PASS (attested, not re-run) |
| Anonymization regex matches literal model IDs | `_MODEL_ID_PATTERNS` precompiled from PROFILES["quality"]["council_models"] at council.py:28-31 — literal strings `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview` all become `re.escape`-quoted patterns. SUMMARY 05-02 verify table: "D-08: model-ID strip → Author N" → OK | Code-verified | ✓ PASS |
| Self-reference regex preserves third-person mentions | SUMMARY 05-02 verify table: "D-09: third-person preserved (`GPT-4 hallucinations` survives)" → OK; patterns at council.py:35-40 are surgical (only `As Claude`, `I am X`, `I, X`, `as an AI assistant from Y`) | Code-verified | ✓ PASS |
| Lazy migration produces v2 dict without writing to disk | SUMMARY 05-01 verification §3: synthetic v1 file SHA-256 byte-stable across `get_conversation` call. Grep of `get_conversation` body confirms no `save_conversation(` call | Attested + grep-verified | ✓ PASS |
| n=1 SSE branch emits empty stage2_complete | main.py:478-481 `if len(stage1_results) <= 1: stage2_results=[]; label_to_model={}; aggregate_rankings=[]`; L491 yields the event unconditionally | Code-verified | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CRIT-01 | 05-03 | Fresh vs Critique entry-point choice; fresh preserved bit-for-bit | ✓ SATISFIED | Sidebar two buttons (D-01) — see SC-1 |
| CRIT-02 | 05-02, 05-03 | 3 file-pickers per Quality slot; .md/.txt only; 750KB cap server-enforced | ✓ SATISFIED | CritiqueWelcome QUALITY_SLOT_MODELS + DropZoneSlot + main.py `_read_and_validate_upload` |
| CRIT-03 | 05-02 | `POST /critique/stream` multipart + standard SSE protocol | ✓ SATISFIED | main.py:378-537 |
| CRIT-04 | 05-02 | Stage 1 reuses `stage1_collect_responses` with `external_context` param; all 3 researches visible per critic with attribution | ✓ SATISFIED | council.py:43-83 `_build_critique_prompts` |
| CRIT-05 | 05-02 | Stage 2 anonymizes critiques (literal model IDs → Author N + self-references) | ✓ SATISFIED | council.py:28-40 patterns + L102-123 `_anonymize_critique_text`; D-08 surgical scope respected (D-09 third-person preserved) |
| CRIT-06 | 05-02 | 150K pre-flight token estimate (heuristic `len/4`) + Stage 2 truncation 600 tokens with marker | ✓ SATISFIED | main.py:21-22 + L449-459 (token cap); council.py:23-24 + L126-133 (truncate marker) |
| CRIT-07 | 05-03 | Pre-flight cost-estimate UI line + soft localStorage rate limit (5/h) | ✓ SATISFIED | CritiqueWelcome cost line verbatim + critiqueRateLimit.js with LIMIT=5, WINDOW_MS=3.6M |
| CRIT-08 | 05-04 | Critique conversation reload shows collapsed file chips above assistant message; click expands via grid accordion | ✓ SATISFIED | ExternalResearchPanel + ChatInterface mount + persistence round-trip — see SC-3 |
| PERS-03 | 05-01 | `schema_version: 2` at root for new writes; v1.0 conversations lazily migrated in `get_conversation` | ✓ SATISFIED | storage.py:12, 54-88, 126-148; verified no eager write-back |
| NAV-01 | 05-05 | Sticky stage section headers | ✓ SATISFIED | Stage1/2/3/4.css `position: sticky; top: var(--space-7)` |
| NAV-02 | 05-05 | Horizontal stage navigation strip with scroll-spy chips | ✓ SATISFIED | StageNavigationStrip.jsx — IntersectionObserver root=scrollContainerRef + per-click matchMedia |
| NAV-03 | 05-05 | Long Stage 1 responses (>600px) collapse to "Show more"; default-collapsed on historical reload | ✓ SATISFIED | Stage1.jsx Stage1Tab + Stage1.css grid accordion; defaultCollapsed wired in ChatInterface based on Boolean(msg.stage3) |
| NAV-04 | 05-05 | Back-to-top button after >800px scroll, honors `prefers-reduced-motion` per-click | ✓ SATISFIED | BackToTopButton.jsx — L18 800px threshold, L29 per-click matchMedia |

**Coverage:** 13/13 requirements covered. **0 ORPHANED.**

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none) | No animated cost ticker (cost line is `useMemo`-recomputed but rendered as a static string) | OK | Direction A "calmo" preserved |
| (none) | No onboarding tour, no drag-between-slots, no auto-detection of attribution | OK | All anti-features from PROJECT.md §Out of Scope confirmed absent |
| (none) | No eager schema write-back in `get_conversation` (grep confirmed `save_conversation` NOT called inside its body) | OK | Lazy-forever D-04 contract respected |

No blockers, no warnings.

### Cross-Phase / Forward-Risk Notes (informational, not gaps)

These are noted from STATE.md and Plan 05-02 deviations; they are NOT gaps in Phase 5 but are flagged so Phase 6+ planners pick them up:

1. **OpenRouter `usage.cost` shape** — `.planning/STATE.md` active TODO requires a 5-minute spike to confirm the `generation` endpoint shape before Phase 6 plan-1 implements server-side cost capture (currently the cost-estimate UI is heuristic-only). Not blocking for Phase 5.
2. **`python-multipart 0.0.28` runtime dependency added** — Plan 05-02 noted this as a Rule-3 deviation (FastAPI hard-requires it for `Form`/`UploadFile`). Already in `pyproject.toml` + `uv.lock`. Document for v2.0 release notes.
3. **Hardcoded `QUALITY_SLOT_MODELS` in frontend** — Plan 05-03 chose to hardcode the model list in `CritiqueWelcome.jsx:15-19` with a code-comment nudge to keep it in sync with `backend/config.py PROFILES["quality"]["council_models"]`. If the backend profile changes, this array must be updated in lockstep. Consider exposing a `/api/profiles/quality` endpoint in a future hardening phase.
4. **Critique flow ErrorBanner Retry is a no-op** — Plan 05-03 noted handleSubmitCritique passes `errorContext=null`; Phase 6+ may extend it.

### Gaps Summary

None blocking. All 5 Phase 5 Success Criteria pass static-analysis verification. All 13 requirements (CRIT-01..08, PERS-03, NAV-01..04) have concrete code evidence on disk. D-01 through D-09 decision locks all respected in code (verified above).

The phase status is `human_needed` (not `passed`) because 6 items inherently require live testing:
- Real n=3 critique with API keys (verifies the entire pipeline end-to-end, including that the anonymized prompt was actually used in the Stage 2 LLM call, not just that the regex is wired)
- v1.0 conversation file on disk (the working tree's `data/conversations/` is gitignored and may be empty)
- Live scroll-spy + sticky behavior (depends on viewport + actual scrolling)
- Live back-to-top fade-in (>800px scroll required)
- Soft rate-limit modal (requires 5 real submissions in an hour)
- n=1 critique UI behavior (Stage 2 panel should be absent/empty without crashing)

These are routine human-verification needs for a UI/backend integration of this size, not gaps.

---

_Verified: 2026-05-10_
_Verifier: Claude (gsd-verifier, Opus 4.7 1M context)_
