# Phase 5: Critique mode + Schema migration + In-conversation navigation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers three bundled capabilities, all required to ship the v2.0 headline feature without breaking v1.0 conversations:

1. **External Deep Research Critique mode** — a parallel entry-point (alongside the existing fresh-prompt flow) where the user uploads up to 3 externally-generated deep research files (one per Quality-mode council model) and launches a council-driven critique using the existing 3-stage deliberation flow.
2. **Schema migration v1 → v2** — lazy server-side migration in `get_conversation` so every v1.0 conversation continues to load without raising `TypeError` after the v2.0 deploy. All new writes carry `schema_version: 2` from the first v2 write.
3. **In-conversation navigation primitives** — sticky stage headers, a scroll-spy stage strip, "Show more" collapse on long Stage 1 responses, and a Back-to-top button — so the long deliberation output (3 critiques + peer review + synthesis + optional Stage 4) is readable end-to-end.

The fresh-prompt flow (textarea + Quality dial) is preserved bit-for-bit when the user picks the existing "+ New conversation" path.

</domain>

<decisions>
## Implementation Decisions

### Critique entry-point UX (where the user enters the critique mode)

- **D-01 — Two stacked full-width buttons in `.sidebar-header`:** the existing `+ New conversation` button stays as the primary (default, top); a sibling `+ New critique` button sits directly below it. Both buttons reuse the same `.new-conversation-btn` styling already defined in `Sidebar.css` (var(--space-2) gap between them). No segmented control, no welcome cards, no in-textarea toggle. Rationale: preserves the fresh-prompt muscle memory exactly while giving the new feature equal hierarchy. Direction A "calmo" tone respected — no chrome above the textarea, no banners.
- **D-02 — Welcome state of a critique conversation differs from a fresh one:** when the user clicks `+ New critique`, the new conversation opens in a dedicated critique welcome state (3 file slots + textarea), not the fresh-prompt welcome state. The conversation mode is fixed at creation time (no in-conversation mode switching).
- **D-03 — Critique conversations are marked in the sidebar list with a discreet "Critique" pill** next to the title (font-size: var(--font-size-microcopy); background: var(--color-accent-soft)). Fresh-prompt conversations carry no pill — the pill is the exception, not the default. No filters tabs, no icons-prefix, no separator. The user re-confirmed this after initially saying "no es necesario": the pill is in.

### File-slot interaction (the 3 deep-research uploaders)

- **D-04 — Three vertically stacked drop-zones, one per Quality-mode council model:** each drop-zone is a ≈120px-tall click-or-drop area, full-width within the welcome panel. The label above each drop-zone is the full `publisher/model-id` (e.g. `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview`); the slot order follows `PROFILES["quality"]["COUNCIL_MODELS"]` order. Empty state microcopy inside the zone: "Drop deep research here, or click to upload (.md / .txt, max 750KB)". Loaded state: file chip with `✅ filename.md  size  ✕`.
- **D-05 — Partial uploads are allowed; the council shrinks dynamically:** Submit is enabled with ≥1 file. The models whose slots are empty do NOT participate in Stage 1 (the council collapses to only the models with an attached file). Stage 2 anonymizes only between the models that actually critiqued.
  - **`n=1` case:** Stage 1 runs with a single model; **Stage 2 is skipped entirely** (peer-review of one is meaningless); Stage 3 chairman synthesises directly from the single critique. The backend MUST guard this branch — emit `stage2_complete` with empty payload or skip the event entirely (planner picks the cleaner SSE contract).
  - **`n=2` case:** full 3-stage flow but Stage 2 peer-review degrades to 2-way mutual ranking. Aggregate rankings table still renders (with 2 entries).
  - **`n=3` case:** standard flow.
- **D-06 — Re-assignment of a wrongly-uploaded file is via remove + re-upload, not drag-between-slots and not via a dropdown caret on the chip.** Consistent 100% with the v1.0 attachment behavior in `ChatInterface.jsx`. No new DnD logic, no chip caret menu. Cost is 2 actions to correct a mistake; acceptable.

### Critique instruction prompt (what the user wants the council to critique)

- **D-07 — Single freeform textarea, required, with a placeholder guide:** the textarea sits below the 3 drop-zones and above the cost-estimate + Submit row. Submit is disabled while the textarea is empty (whitespace-trimmed). Placeholder text (in `var(--color-fg-muted)`): "Identify factual errors, missing perspectives, and weak arguments in these research files…". No pre-filled default, no checkboxes, no optional-with-backend-default. Rationale: forces the user to think about what they actually want criticised, which improves output quality. Same UX contract as the fresh-prompt textarea (required).

### Anti-attribution-leak regex scope (Stage 2 anonymization — CRIT-05)

- **D-08 — Surgical strip + self-reference signatures.** Before concatenating critiques into the Stage 2 peer-review prompt, the backend runs a small regex pass that replaces:
  - **Literal model identifiers:** `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview` → `Author N` (matching the slot order assigned during Stage 1).
  - **First-person self-references** (word-boundary regexes): `\bAs Claude\b`, `\bI am (Claude|GPT|Gemini|Opus)\b`, `\bI, (GPT|Claude|Gemini|Opus)\b`, `\bas an AI assistant from (Anthropic|OpenAI|Google)\b` and a short curated list of similar canonical openings/signatures.
- **D-09 — Substantive third-person mentions are NOT stripped.** If the deep-research content discusses "GPT-4 hallucinations" as a topic, those substring matches survive. Rationale: corrupting substantive content is worse than the residual leak from a critique writing "Claude said X" in third person — the latter is rare in practice and surface-level enough that the chairman's synthesis can dilute it.

### Claude's Discretion

The following sub-decisions were not explicitly discussed and Claude has implementation flexibility — flagged for the planner to resolve at plan-time:

- **Cost-estimate live updates:** does "$X.XX–$Y.YY" recompute on each file attached, or only once on hover/blur of Submit? (Recommendation: recompute on each file change; cheap, no flicker risk with debounce.)
- **Mobile behaviour of the two stacked buttons** (≤768px sidebar drawer): both remain full-width inside the drawer; no special collapse. Spacing identical.
- **Stage 1 collapse default-state during a live deliberation** (NAV-03 nuance): roadmap mandates collapse on reload of a historical conversation; for live, recommend keeping all Stage 1 tabs expanded until Stage 2 starts streaming, then auto-collapse non-active tabs. Planner should validate.
- **`schema_version` write-back policy on migration:** the lazy migration in `get_conversation` returns the v2-shape dict; whether to write the migrated form back to disk eagerly (once-touched migration) or stay lazy forever is a planner call. Recommendation: stay lazy (no surprise file mutations on reads).
- **Sidebar pill copy:** "Critique" (selected) — but planner can shorten to "C" if the chip widens the row beyond comfortable in narrow sidebars.
- **Pre-flight cost-estimate confidence band shape:** point-estimate vs range — recommendation: range $X.XX–$Y.YY (already locked by ROADMAP.md success criterion 2).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements, and decisions
- `.planning/ROADMAP.md` — Phase 5 success criteria (5 numbered items), bundling rationale (Phase 5 bundling section), and "Decisiones diferidas a plan-time" (inline-vs-sidecar storage, OpenRouter `usage.cost` shape).
- `.planning/REQUIREMENTS.md` §CRIT (CRIT-01..08), §NAV (NAV-01..04), §PERS-03 — the 13 requirements bundled into this phase, with rationale and source references.
- `.planning/PROJECT.md` — Active scope §"External Deep Research Critique", Out of Scope (PDF/DOCX, auto-detection, real-time cost ticker, onboarding tour).
- `.planning/STATE.md` §"Accumulated Context" — locked decisions inherited from roadmap time (endpoint shape, `stage1_collect_responses` parametrization, inline JSON storage with 750KB cap, lazy migration in `get_conversation`).

### Research artifacts (read before plan-1)
- `.planning/research/ARCHITECTURE.md` §1 (critique mode), §2 (schema migration), §5 (mobile patterns relevant later) — design decisions per requirement bucket.
- `.planning/research/PITFALLS.md` §CRIT-1 (token detonation), §CRIT-2 (cost surprise), §CRIT-3 (schema migration mandatory bundling), §CRIT-4 (file-storage shape), §MOD-1 (attribution leak) — the 5 critical pitfalls Phase 5 must own. **Mandatory read before plan-1.**
- `.planning/research/FEATURES.md` §A (critique entry-point pattern) and §ANTI-FEATURES (AA1, AA2, AA13 — onboarding tours, animated cost tickers, LLM explainers — all forbidden by Direction A "calmo").
- `.planning/research/STACK.md` — `httpx` async client patterns, OpenRouter `usage.cost` shape (treat as unverified until 5-min spike confirms before Phase 6).
- `.planning/research/SUMMARY.md` — synthesis of the four research docs; bundling rationale to override its 6-phase recommendation.

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` — current backend/frontend architecture (council pipeline, SSE, BYOK routing).
- `.planning/codebase/STRUCTURE.md` — directory layout, naming conventions, where to add new endpoints / components / SSE event types.
- `.planning/codebase/CONCERNS.md` — Vuln 2 already closed (v1.0); metadata-not-persisted is owned by Phase 6 PERS-01..02 (Phase 5 must produce the shape that Phase 6 will persist).
- `.planning/codebase/CONVENTIONS.md` — naming, error handling, React patterns to keep aligned with existing surface.

### Reusable v1.0 components (in code)
- `frontend/src/components/Sidebar.jsx:139-280` — the existing sidebar header + button styling that D-01 extends (add a second sibling button using the same `.new-conversation-btn` class).
- `frontend/src/components/ChatInterface.jsx` — current attachment handling (file picker, `attachError` state inline rendering, chip + ✕ pattern); reusable scaffolding for D-04/D-06.
- `frontend/src/utils/download.js` — `readFileAsText`, `MAX_FILE_BYTES` constants; extend with a parallel `MAX_CRITIQUE_FILE_BYTES = 750 * 1024` for the 750KB v2 cap (do not raise the existing 500KB fresh-attachment cap).
- `frontend/src/index.css` — `.markdown-content` global wrapper used by `Markdown.jsx`; file chips with expandable accordion (CRIT-08) reuse the `grid-template-rows: 0fr → 1fr` technique already established in `ReasoningDisclosure` (v1.0 Phase 3).
- `backend/council.py` — `stage1_collect_responses` (extend signature with `external_context: Optional[Dict[model_id, {filename, content}]]`), `stage2_collect_rankings` (anonymization site for D-08/D-09 regex), `parse_ranking_from_text`.
- `backend/storage.py` — `get_conversation` is the lazy migration site; `add_assistant_message` signature stays unchanged (metadata dict opaque).
- `backend/main.py:140-193` — SSE generator pattern; new `/api/conversations/{id}/critique/stream` endpoint follows the same shape with multipart/form-data input.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Sidebar button styling (`.new-conversation-btn`)** — D-01 adds a sibling button with identical class; zero new CSS.
- **Sidebar pill styling** — `.conversation-meta` already uses `var(--font-size-microcopy)`; reuse the same scale + `var(--color-accent-soft)` background for the "Critique" pill in D-03.
- **Attachment chip + ✕ pattern** — already implemented for fresh-prompt attachments in `ChatInterface.jsx`; D-04 reuses the chip with an additional model-attribution label.
- **`readFileAsText` + `MAX_FILE_BYTES`** in `frontend/src/utils/download.js` — extend for `.md`/`.txt` 750KB cap, do not regress the 500KB fresh-attachment cap.
- **ReasoningDisclosure CSS-only accordion (`grid-template-rows: 0fr → 1fr`)** — confirmed reusable in CRIT-08 (file chip expand on reload) and NAV-03 (Stage 1 "Show more").
- **SSE generator pattern** in `backend/main.py` — `/critique/stream` follows the same `data: {json}\n\n` event protocol; no new SSE event types required for the critique flow (`stage2_start`/`stage2_complete` are emitted as empty/skipped when `n=1`, per D-05).
- **`stage1_collect_responses` / `stage2_collect_rankings`** in `backend/council.py` — parametrize the former with `external_context` (per ARCHITECTURE.md §1.2); insert the D-08/D-09 regex pass inside the latter before concatenation.
- **`get_conversation` in `backend/storage.py`** — single lazy-migration site; recommended return-without-write-back (see Claude's Discretion above).

### Established Patterns

- **Direction A "calmo"** (locked in v1.0 Phase 4): serif body (Source Serif 4), max-width 65ch, no animations beyond CSS transitions, `prefers-reduced-motion` honored. NAV-01..04 must follow.
- **Pure CSS over JS where possible** — sticky stage headers (NAV-01) need zero JS; scroll-spy (NAV-02) needs IntersectionObserver but no scroll listener; Show-more (NAV-03) reuses the CSS-only accordion.
- **Single-source-of-truth for council profiles** (PROFILES dict in `backend/config.py`) — the slot order in the critique UI MUST derive from `PROFILES["quality"]["COUNCIL_MODELS"]`, not be hardcoded in the frontend.
- **Graceful degradation on per-model failures** in `query_model` (returns `None`); Stage 1 critique must keep this behavior — if the model assigned to slot 2 fails mid-stream, the deliberation continues with the surviving critiques.

### Integration Points

- **Sidebar.jsx** — add `+ New critique` button + pill rendering on `ConversationItem` rows (needs `mode: 'fresh' | 'critique'` field from the conversation metadata).
- **App.jsx** — add `onNewCritiqueConversation` handler + route the welcome state to either fresh or critique based on the new conversation's mode.
- **api.js** — add `createCritiqueConversation` (or extend `createConversation` with a `mode` param) + add `sendCritiqueMessage` (multipart/form-data; SSE reader stays identical).
- **storage.py** — `add_assistant_message` stays single-signature; `metadata` dict carries the new fields (`external_research`, `mode`, `schema_version: 2`).
- **council.py** — `stage1_collect_responses(messages, models, external_context=None)`; the existing fresh-prompt path passes `external_context=None`; the critique path passes the dict.

</code_context>

<specifics>
## Specific Ideas

- **The "Critique" pill copy** is locked at "Critique" (full word, not "C") in narrow sidebars unless visual testing on ≤320px proves it breaks the row.
- **Slot label format** is the full `publisher/model-id` literal (e.g. `openai/gpt-5.5`) — not a shortened nickname — so the user sees exactly which OpenRouter model receives which file. This same identifier is the one the anonymization regex strips in D-08.
- **Placeholder copy** for the critique-instruction textarea: "Identify factual errors, missing perspectives, and weak arguments in these research files…" — keep this copy verbatim unless UX testing surfaces something better; this exact wording was selected during discussion as the prompt-guide.
- **The two stacked sidebar buttons** must reuse `.new-conversation-btn` styling — no new CSS class. Gap: `var(--space-2)`. The `+ New conversation` stays on top (default, muscle memory).

</specifics>

<deferred>
## Deferred Ideas

- **Drag-between-slots and dropdown-caret-on-chip** for file reassignment — discarded in favour of remove + re-upload (D-06). Note for future: if user studies show >3 reassignments per critique session, consider adding drag-between-slots.
- **Checkboxes-of-aspects + optional textarea** for the critique instruction — discarded in favour of plain freeform required textarea (D-07). Note: if users report producing low-quality critique prompts, revisit with a checkbox-assisted variant.
- **Aggressive anonymization** (strip all commercial names: "Opus", "Claude", "GPT", "Gemini", "OpenAI", "Anthropic", "Google") — discarded in favour of surgical + self-reference (D-08/D-09). Note for future: if leak observations in real Stage 2 outputs prove material, expand the regex list incrementally rather than going aggressive in one step.
- **Filters tabs above the sidebar list ("All / Fresh / Critique")** — discarded because expected critique-to-fresh ratio is low; meta-chrome over a low-frequency case violates Direction A "calmo".
- **Auto-detection of model attribution from filename or footer** — already declared Out of Scope in PROJECT.md (v2.0); user manually picks via slot order.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 5 scope.

</deferred>

---

*Phase: 5 - Critique mode + Schema migration + In-conversation navigation*
*Context gathered: 2026-05-10*
