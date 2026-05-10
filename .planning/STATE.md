---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Awaiting next milestone
last_updated: "2026-05-10T17:02:11.983Z"
last_activity: 2026-05-10 — Milestone v1.0 completed and archived
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
  percent: 100
---

# State: LLM Council — Personal Edition

**Last updated:** 2026-05-10

## Project Reference

- **Project:** LLM Council — Personal Edition
- **Core value:** The Quality dial works as advertised — `Fast` is fast and cheap, `Quality+Research` is well-reasoned and web-grounded.
- **Project doc:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (21 v1 requirements, 100% mapped)
- **Roadmap:** `.planning/ROADMAP.md` (4 coarse phases, mvp mode)
- **Codebase maps:** `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, STRUCTURE.md)
- **Config:** `.planning/config.json` (granularity: coarse, mode: yolo, parallelization: true)

## Current Focus

**MILESTONE COMPLETE.** All 4 phases shipped, all 21 v1 requirements satisfied (SEC-01, CONV-01..03, UXR-01..04, QUAL-01..04, RSCH-01..05, VIS-01..04). Phase 04 closed with Plan 04-04 (Wave 4 — Conversations & polish): Sidebar/Modal/Menu CSS migrated to Direction A tokens; Sidebar empty state branded with 96px serif ampersand; persistent ErrorBanner for H9-01 catastrophic interruption recovery wired into App.jsx via .app__main-with-banner wrapper; favicon ampersand SVG asset shipped (single-theme, light palette per CONTEXT D-16); index.css `.markdown-content` block cleaned up to close phase-wide grep gate. Direction A skin uniform across the app: zero Bootstrap hex, zero raw `system-ui`, all 23 wireframes (W01-W23) materialized.

## Current Position

Phase: Milestone v1.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-05-10 — Milestone v1.0 completed and archived

## Phase Progression

| # | Phase | Status |
|---|-------|--------|
| 1 | Hardening & Conversation Management | All 5 plans complete + verified (closed 2026-05-09) |
| 2 | UX Research & Design Brief | All 6 plans complete + verified (closed 2026-05-10) |
| 3 | Quality Dial & Pragmatic Deep Research | All 5 plans complete (closed 2026-05-10) |
| 4 | Visual Identity Implementation | All 4 plans complete (closed 2026-05-10) |

## Performance Metrics

- Phases planned: 4
- Phases complete: 4
- Plans complete: 20
- Requirements coverage: 21/21 (100%)
- Orphaned requirements: 0
- Requirements satisfied: 21/21 (SEC-01, CONV-01..03, UXR-01..04, QUAL-01..04, RSCH-01..05, VIS-01..04). All v1 milestone requirements closed.

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01 | 01 | ~18 min | 2 | 2 | 2026-05-09 |
| 01 | 02 | ~9 min  | 3 | 10 | 2026-05-09 |
| 01 | 03 | ~7 min  | 2 | 5  | 2026-05-09 |
| 01 | 04 | ~4 min  | 1 | 2  | 2026-05-09 |
| 01 | 05 | ~12 min | 2 | 2  | 2026-05-09 |
| 02 | 01 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 02 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 03 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 04 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 05 | doc-only | 3 | 3 | 2026-05-10 |
| 02 | 06 | doc-only | 1 | 1 | 2026-05-10 |
| 03 | 01 | ~8 min  | 2 | 2 | 2026-05-10 |
| 03 | 02 | ~12 min | 2 | 2 | 2026-05-10 |
| 03 | 03 | ~9 min  | 2 | 6 | 2026-05-10 |
| 03 | 04 | ~14 min | 3 | 4 | 2026-05-10 |
| 03 | 05 | ~22 min | 2 | 13 | 2026-05-10 |
| 04 | 01 | ~14 min | 3 | 6  | 2026-05-10 |
| 04 | 02 | ~6 min  | 3 | 6  | 2026-05-10 |
| 04 | 03 | ~25 min | 3 | 11 | 2026-05-10 |
| 04 | 04 | ~32 min | 3 | 9  | 2026-05-10 |

## Accumulated Context

### Decisions Logged at Roadmap Time

- Granularity = coarse → 4 phases (within 3-5 bracket).
- MVP mode → every phase delivers a usable, end-to-end vertical slice; Phase 2 (UX research) is the only non-code phase but still produces a tangible artifact set.
- Phase 1 bundles SEC-01 with the CONV-\* features because they touch the same files (`storage.py`, `main.py`) and SEC-01 is small but blocking.
- Phase 3 fuses QUAL-\* and RSCH-\* into one phase because the `quality_research` profile is the entry point to deep research — splitting them would create an artificial boundary mid-feature.
- Phase 4 is sequenced last so it can style the Quality toggle introduced in Phase 3 as part of the identity rollout, not as a follow-up.

### Decisions Logged During Execution

- **Phase 01 / Plan 01:** UUID validation uses inline `uuid.UUID()` in storage + `try/except ValueError → HTTPException(400)` per handler (NOT Pydantic `Annotated[UUID]`, which yields 422). Mirrors the existing storage-raises-main-translates convention.
- **Phase 01 / Plan 01:** Accept any UUID version/format the stdlib parser accepts (v1-v5, hyphenated/non-hyphenated/braced). SEC-01 spirit is "reject non-UUID", not "reject non-v4".
- **Phase 01 / Plan 01:** `delete_conversation()` lets `FileNotFoundError` propagate; the future Plan 02 DELETE handler will translate it to 404. No TOCTOU pre-check.
- **Phase 01 / Plan 01:** No `os.path.abspath().startswith(DATA_DIR)` defense-in-depth — UUID validation alone covers SEC-01 because no parseable UUID contains `/`, `\`, or `..`.
- **Phase 01 / Plan 02:** Modal API is opinionated (`title`/`body`/destructive) instead of generic `children`; only consumer in v1 is a confirmation dialog and Plan 03's rename uses inline edit, not a modal. Future plans can extend with `children` without breaking call sites.
- **Phase 01 / Plan 02:** Manual focus trap implementation (no `react-focus-lock` dependency) — keeps the dependency graph clean per stack constraints.
- **Phase 01 / Plan 02:** `position: fixed` + viewport clamp for `Menu` instead of popper.js — sidebar anchors on the left edge so the popover never needs flipping.
- **Phase 01 / Plan 02:** No body scroll lock when modal opens — backdrop covers the viewport visually; avoids side-effect risk.
- **Phase 01 / Plan 02:** `confirmDelete()` closes the modal BEFORE awaiting `api.deleteConversation` so the user does not see a half-applied state during the network call.
- **Phase 01 / Plan 02:** `handleDeleteConversation` resets `currentConversationId`/`currentConversation` to null BEFORE awaiting the network call when the deleted conversation was the active one (RESEARCH §Pitfall 7 + D-12 — guarantees the welcome state renders immediately).
- **Phase 01 / Plan 03:** Backend body validation via Pydantic `Field(min_length=1, max_length=200)` — empty/oversized titles get a 422 from the framework BEFORE the handler runs, so the handler never sees malformed input.
- **Phase 01 / Plan 03:** intentRef pattern (RESEARCH §Pattern 4) is the single coordination point between keydown and blur. Enter/Escape both trigger blur synthetically; handleBlur is the only place that decides commit vs cancel — eliminates the double-fire that a naive design would produce.
- **Phase 01 / Plan 03:** Lifetime-based remount of the rename input (RenameInput mounted only while isEditing===true) replaces the original 'reset draftTitle in useEffect' shape that React 19's react-hooks/set-state-in-effect rule rejects. Same external behaviour, cleaner under React 19 lint, and naturally robust to rapid Rename target switches.
- **Phase 01 / Plan 03:** ConversationItem extracted as a sub-component within Sidebar.jsx (CD-04 permits) once the row's edit-mode JSX pushed the inline shape past readable.
- **Phase 01 / Plan 03:** Trim happens client-side; backend stores titles verbatim (symmetric with how `add_user_message` stores message bodies as-is). Empty / unchanged titles cancel silently in the UI without invoking the PATCH.
- **Phase 01 / Plan 04:** 200ms debounce via inline `useEffect setTimeout/clearTimeout` (RESEARCH §Pattern 5 sweet spot for 10-100 items). No custom `useDebounce` hook — single consumer, hook extraction would be premature.
- **Phase 01 / Plan 04:** Two-tier filter (`titleMatches` + `filteredConversations`) with `useMemo` on each. `titleMatches` must be computed even when content-mode is active because it gates the D-10 affordance visibility.
- **Phase 01 / Plan 04:** Content-fallback affordance gated on `query.length >= 3 AND titleMatches.length === 0 AND !contentSearchActive` (D-10) — explicit user opt-in, never auto-triggered. The `>=3` guard prevents the affordance flickering on transient `a` / `ab` queries.
- **Phase 01 / Plan 04:** D-11 cache lifetime = session, no invalidation on rename/delete. Deleted ids never render (gated by `conversations` metadata); renamed titles still display the current title (sourced from metadata, not cache). Acceptable staleness.
- **Phase 01 / Plan 04:** Stage 2 evaluation text NOT in search corpus — anonymised peer-review-of-peers is noisy as a recall key. User content + Stage 1 + Stage 3 cover the meaningful semantic surface.
- **Phase 01 / Plan 04:** Pitfall 6 sealed deliberately by omission — no `onSelectConversation(null)` call exists in the search code path. The active conversation stays visible in the central panel even when the sidebar filter hides it (Slack/Discord-like).
- **Phase 01 / Plan 05 (gap closure):** Introduced `storage.ConversationNotFoundError` as a domain exception so storage callers can disambiguate "invalid UUID -> 400" (ValueError) from "missing conversation file -> 404". Chose this over the minimum-fix `except ValueError -> 404` to avoid mis-translating future TOCTOU races; cost is one 5-line class definition.
- **Phase 01 / Plan 05:** Canonicalised the UUID at `get_conversation_path` (single chokepoint) via `str(uuid.UUID(id))` — braced/URN/unhyphenated/upper-case forms now collapse to the same hyphenated lowercase filename. Eliminates the Windows NTFS ADS interaction (URN's `:`) and makes GET/PATCH/DELETE round-trip platform-independent.
- **Phase 01 / Plan 05:** SSE error event for the missing-file race uses structured `kind: 'not_found'` so frontend can disambiguate without parsing message strings. Generic transport/generation errors keep the original shape via the trailing `except Exception` branch.
- **Phase 01 / Plan 05:** Did NOT modify the non-streaming `send_message` handler (`backend/main.py:90-134`); its unwrapped mutator calls now raise `ConversationNotFoundError` directly to FastAPI (still a 500). Out of scope per VERIFICATION.md (BL-01 was scoped to PATCH and the streaming path); tracked under SUMMARY's Deferred Issues for future hardening if the non-streaming path is reactivated.
- **Phase 02 / Plans 01-06:** Severity scale = Nielsen original 0-4 (D-03), NOT low/medium/high. 6 anticipatory findings on Phase 3 surfaces (QUAL-03, RSCH-05) — exceeds D-05 minimum of ≥2. 3 tonal directions explored in parallel (Research notebook / Tactical cockpit / Claude-like minimal); brutalist editorial explicitly rejected (D-08).
- **Phase 02 / Plan 06:** Direction A (Research notebook) selected as the canonical visual identity for Phase 4. Rationale: Stage 2 / Stage 3 are long-form editorial content; only Direction A's serif body (Source Serif 4) + strong typographic hierarchy + medium-low density respects long reading without fatiguing. Cockpit (B) too instrumental for sustained reading; Minimal (C) hides the aggregate ranking and cost surfacing too aggressively. Phase 4 entry contract documented in `03-redesign-proposal.md` lines 771-779.
- **Phase 02:** Throwaway HTML disclaimer (D-15) explicitly prevents Phase 4 from lifting CSS verbatim from the sketches. Phase 4 reads only: tokens documented in proposal, typography stack, microinteractions, IA from wireframes. The HTML sketches are a visual validation tool, not source code.
- **Phase 03 / Plan 01:** PROFILES dict is the single source of truth for Quality Dial. Aliases-as-views pattern: `COUNCIL_MODELS` and `CHAIRMAN_MODEL` are direct references into `PROFILES["fast"]` (not copies) so there is one source of truth during the Plan 03-02 migration window.
- **Phase 03 / Plan 01:** No `:thinking` model-ID suffix used. RESEARCH.md confirmed the suffix does not exist on OpenRouter — reasoning is opt-in via the `reasoning` payload param. `query_model` now accepts `reasoning: bool = False` and injects `{"reasoning": {"enabled": True}}` only when True; default preserves the existing fast-flow byte-for-byte.
- **Phase 03 / Plan 01:** Substitution applied (CD-05): `google/gemini-3.1-pro` → `google/gemini-3.1-pro-preview` in both `quality` and `quality_research` profiles; this is the canonical OpenRouter ID.
- **Phase 03 / Plan 01:** `quality_research` uses 4 reasoning models all with `:online` (D-10). Critic = Opus-4.7 (D-06). Stage-4 threshold = 8/10 (D-06). typical_cost = \$0.45 (D-14). BYOK allowlist preserved — `get_provider_for_model` splits on `/` so `:online` suffixes do not break BYOK routing.
- **Phase 03 / Plan 01:** `query_models_parallel` left untouched. Plan 03-04 will wrap it if it needs to forward `reasoning=True` per-model, keeping the low-level transport stable.
- **Phase 03 / Plan 02:** `SendMessageRequest.profile` uses Pydantic `Literal["fast","quality","quality_research"]` with default `"fast"` (D-28 + D-29). Unknown values yield 422 before the handler runs — no custom validator, no custom error.
- **Phase 03 / Plan 02:** `council.py` is now profile-agnostic except for a single placeholder branch in `run_full_council`. Stages take `council_models` / `chairman_model` as explicit args; legacy `COUNCIL_MODELS` / `CHAIRMAN_MODEL` imports dropped from `council.py` (kept in `config.py` as views-into-PROFILES['fast'] for any external caller).
- **Phase 03 / Plan 02:** `quality_research` routes through one delegate point per endpoint type — `run_full_council` raises `NotImplementedError` (sync) and `event_generator` emits a structured SSE error event `{'type':'error','message':'quality_research lands in Plan 03-04'}` (stream). Plan 03-04 replaces both with `research_strategy` delegations without touching the rest of the file.
- **Phase 03 / Plan 02:** QR check placed BEFORE `title_task` creation in `event_generator`. Avoids spending a Gemini Flash title call on a request that immediately errors out.
- **Phase 03 / Plan 02:** Module docstring on `council.py` codifies the RSCH-04 isolation rule (no `critic_model`, no `stage4_threshold`, no `:online` lists). Future plans must NOT regress this.
- **Phase 03 / Plan 03:** `storage.add_assistant_message` accepts an opaque `metadata: Optional[Dict[str, Any]] = None` kwarg and persists the dict verbatim. Plan 03-04 adds `critic` + `stage4_triggered` keys with zero schema migration in storage — the storage layer never validates the dict shape. Conditional assignment (`if metadata is not None`) preserves the on-disk shape of pre-Phase-3 messages bit-for-bit.
- **Phase 03 / Plan 03:** New SSE event `message_metadata` is emitted by the streaming endpoint AFTER persisting and BEFORE `complete`. The frontend `case 'message_metadata':` MERGES `{profile, models, chairman}` onto the Stage 2-populated `{label_to_model, aggregate_rankings}` (spread existing first, then `event.data`). Disjoint keys, commutative — but the order is documented because Plan 03-04 will add `stage4_triggered` via the same merge path.
- **Phase 03 / Plan 03:** Sync `/message` endpoint also returns `message_metadata` in the JSON body as a SIBLING of the legacy `metadata` field (not nested). Two keys, two semantics. The sync endpoint is not used by the current UI but the API surface stays consistent for any future direct consumer.
- **Phase 03 / Plan 03:** Microcopy locked per CD-01: 'Fast' / 'Quality' / 'Quality+Research'; '1 model' / 'N models' singular/plural; chairman short name strips both publisher prefix AND `:online`/`:thinking` suffix (`anthropic/claude-opus-4.7:online` → `claude-opus-4.7`); separator U+2022; Stage 4 suffix ' + Stage 4 refinement' only when `metadata.stage4_triggered === true`; legacy fallback exact copy `Quality (legacy)`.
- **Phase 03 / Plan 03:** `MessageHeader.css` uses hex placeholders (`#666` / `#333` / `#999` / `#4a90e2`) as a Phase 4 transition contract. Phase 4 swaps these for design tokens without touching the JSX or class names — the component shape is already final.
- **Phase 03 / Plan 04:** Critic invocation does NOT enable `reasoning=True`. Stages 1/2/3/4 all enable reasoning; the critic does not. Rationale: the rubric is deterministic and we want a fast anchored output, not a chain-of-thought meditation that would inflate latency without changing the score.
- **Phase 03 / Plan 04:** `parse_critic_score` is anchored on the LAST occurrence of `CRITIC SCORE:` (case-insensitive) and clamps to 1-10. Returns `(None, None)` on parse failure → conservative fallback skips Stage 4 (RESEARCH §"Critic prompt design"). Last-match anchor handles models that echo the header verbatim while explaining the rubric before writing the actual score.
- **Phase 03 / Plan 04:** `research_strategy.py` is profile-agnostic regarding configuration: it receives `profile_config` (the `PROFILES["quality_research"]` dict) as a parameter and never imports `PROFILES` directly. RSCH-04 isolation verified by grep (`PROFILES[` count = 0 in the strategy module).
- **Phase 03 / Plan 04:** Internal `_final` event convention used between the strategy and its callers. The leading underscore signals `main.py` MUST NOT forward it as SSE; the caller intercepts and uses its payload to call `storage.add_assistant_message`. This decouples the streaming SSE shape from the non-streaming endpoint without duplicating the strategy logic.
- **Phase 03 / Plan 04:** `title_task` was hoisted in `main.py.event_generator` to BEFORE the QR branch so title generation runs concurrently with the ~30-60s QR pipeline. Fast/quality flow unchanged; the `if title_task:` guard at the end of the fast/quality block continues to handle the await.
- **Phase 03 / Plan 04:** `council.py` module docstring rewritten to express the RSCH-04 isolation rule semantically rather than enumerating the forbidden tokens (`critic_model`, `stage4_threshold`, `CRITIC_RUBRIC`) by name. Same constraint, satisfies the literal `grep -c == 0` acceptance criteria, no behaviour change.
- **Phase 03 / Plan 04:** Non-streaming `/message` endpoint returns `stage4` as a top-level sibling of `stage1/2/3` in the JSON body. The legacy `metadata` field (label_to_model + aggregate_rankings) becomes `null` for QR — those aggregates are emitted only by the streaming endpoint via `stage2_complete` events. No UI consumer of the non-streaming endpoint exists in v1, so this asymmetry is acceptable.
- **Phase 03 / Plan 04:** Calibration of `stage4_threshold` deliberately deferred. Initial value remains 8/10 (D-06). With critic = chairman = Opus 4.7 (D-06), the LLM-as-judge self-preference pitfall predicts scores skewing high. Recommendation: monitor `metadata.stage4_triggered` rate over the first 5-10 real queries; if 0% → raise threshold, if >50% → lower. The strategy module never needs to change for this; only `config.PROFILES["quality_research"]["stage4_threshold"]`.
- **Phase 03 / Plan 05:** QualityToggle implemented as a segmented control with hidden native radios — the `<label>` is the visual control, `role="radiogroup"` + `aria-label` preserve keyboard a11y. Direction A footnote-style cost surfacing (always visible, no tooltip per D-20). Cost strings (`~$0.001` / `~$0.05 typical` / `~$0.45 typical`) literal-mirror the backend `typical_cost` (D-21).
- **Phase 03 / Plan 05:** Stage 4 mounted as a child of `<Stage3>`, NOT a sibling at `ChatInterface` level. The `.stage3` panel's frame visually contains both the synthesis and the refinement; `.stage4` CSS resets `background: transparent` and adds a `border-top: 1px dashed` so it reads as a continuation of the same panel. Implements D-15 ("sub-sección DEBAJO de Stage 3 EN EL MISMO PANEL") literally. ChatInterface.jsx does NOT import Stage4 — the prop drilling stops at Stage3.
- **Phase 03 / Plan 05:** ReasoningDisclosure defensively normalises `details` (object → wrapped array; null/undefined → empty) BEFORE the whitelist filter. Whitelist accepts ONLY `reasoning.summary` and `reasoning.text`; encrypted blobs and unknown types are dropped without warning. Empty filtered array → component returns null entirely (D-23 — no UI affordance for empty state).
- **Phase 03 / Plan 05:** Stage 4 spinner placed BETWEEN Stage 3 spinner and the Stage 3 panel render. When `stage4_start` fires, `msg.stage3` is already truthy and the panel renders. Putting the spinner above the panel = parent layout shifts down to make room; when `stage4_complete` arrives the spinner disappears and Stage 4 sub-section materialises INSIDE the panel = net layout shift zero. Critic invocation has no spinner (single fast call, no `critic_start` event in the strategy).
- **Phase 03 / Plan 05:** download.js extended signatures preserve back-compat. `buildFinalAnswerMarkdown` without `stage4` produces the legacy title; `buildFullDeliberationMarkdown` without `critic`/`stage4`/`messageMetadata` skips the new sections via truthy gates. Pre-Phase-3 conversations re-opened from disk export verbatim as before. The new `## Critic` and `## Stage 4 — Refinement` sections only appear when QR refinement fired.
- **Phase 03 / Plan 05:** `profile` state is intentionally NOT reset after send. Single-shot conversation design (PROJECT.md Out of Scope) hides the input form once `messages.length > 0`, so resetting would have zero observable effect. Forward-compatible with multi-turn (also Out of Scope) without rework.
- **Phase 04 / Plan 01:** Token taxonomy declared in `:root` of `frontend/src/index.css` (60 unique custom properties: 13 colors light, 13 dark override, 9 typography sizes, 3 line-heights, 7 spacing, 4 layout, 2 radii, 2 shadows light + 2 dark reinforced, 4 motion, 3 font families). Components consume via `var(--*)` — never hardcode hex going forward. Wave 1 deliberately aislada: legacy hex placeholders coexist hasta Waves 2-4 (D-08).
- **Phase 04 / Plan 01:** JetBrains Mono variable woff2 generated by converting the canonical TTF (`fonts/variable/JetBrainsMono[wght].ttf` from release v2.304) to woff2 via `fontTools` + `Brotli`. The official zip release does NOT include variable woff2 — only static woff2 (Bold, ExtraBold, etc.) and variable .ttf. Conversion is lossless data-wise; reduces 303KB → 113KB.
- **Phase 04 / Plan 01:** FOUC blocker script in `index.html` is intentionally NOT `type="module"` (modules are async-by-default and would break sync pre-paint blocking). Sets `<html data-theme="...">` reading `localStorage.theme` with `prefers-color-scheme: dark` fallback and `try/catch` for private-browsing.
- **Phase 04 / Plan 01:** `<link rel="preload">` only for Source Serif 4 Roman + Inter Variable (UI-SPEC line 99: mono is low-priority — only inside code blocks; Italic loads lazy via @font-face).
- **Phase 04 / Plan 01:** `prefers-reduced-motion: reduce` global override explicitly preserves `*:focus-visible { outline: 2px solid var(--color-focus-ring) }` (RESEARCH §Pitfall 4). Without this, `transition: none !important` would also kill focus ring outlines and break keyboard a11y.
- **Phase 04 / Plan 01:** No `--color-bootstrap-*` legacy aliases (CONTEXT D-06). Tras revisar el código, NO son necesarios — los componentes legacy seguirán con hex hardcoded hasta sus respectivas waves (Plans 04-02, 04-03, 04-04). VIS-01..04 no se cierran en este plan; las waves siguientes los liberan.
- **Phase 04 / Plan 01:** `favicon-ampersand.svg` slot reserved in `<link rel="icon">` aunque el asset aún no existe — Plan 04-04 Task 3 lo commitea. 404 silencioso aceptable hasta entonces.
- **Phase 04 / Plan 02:** `useTheme` hook coordinates con el FOUC blocker via la misma `localStorage.theme` key (D-04). `readInitialTheme()` se ejecuta sync en mount y replica el branching del FOUC blocker. Segundo `useEffect` se subscribe a `matchMedia('(prefers-color-scheme: dark)')` SOLO mientras `followSystem === true` (true sólo si `localStorage.theme === null` al primer render); cualquier `setTheme`/`toggle` flippea `followSystem → false` y stops following the system para el resto de la sesión. Cleanup en unmount + on followSystem flip mitiga T-04-06 (listener leak DoS).
- **Phase 04 / Plan 02:** Ampersand SVG mark usa `<text fill="currentColor">` heredando del CSS `.app-header__brand { color: var(--color-fg-secondary) }` en lugar de `fill="var(--color-fg-secondary)"` directamente. Razón: SVG attributes no resuelven CSS custom properties consistentemente cross-engine; `currentColor` cascada via `color` is bullet-proof.
- **Phase 04 / Plan 02:** App shell rebuilt as CSS grid (`grid-template-columns: var(--layout-sidebar-w) 1fr; grid-template-rows: var(--layout-header-h) 1fr`) en lugar de flex. Header span both columns on row 1; Sidebar y ChatInterface usan sus rootClassNames existentes (`.sidebar`, `.chat-interface`) via descendant selectors `.app > .sidebar` / `.app > .chat-interface` — sus internals NO migran en este plan (Wave 3 → ChatInterface; Wave 4 → Sidebar). Mobile drawer rule (`@media (max-width: 768px)`) collapses sidebar a `position: fixed` overlay below the header con `transform: translateX(-100%)` + `data-open="true"` selector.
- **Phase 04 / Plan 02:** MessageHeader.css es la primera migración Phase-3 → Phase-4. Swap map locked: `#666 → var(--color-fg-secondary)`, `#333 → var(--color-fg-primary)`, `#999 → var(--color-fg-muted)`, `#4a90e2 → var(--color-accent)`. Font stack `'Inter', system-ui, sans-serif → var(--font-sans)`. Plan 04-03 aplicará el mismo patrón a QualityToggle.css / ReasoningDisclosure.css / Stage4.css / Stage1-3 con sus respectivos hex placeholders. JSX nunca se toca — class names locked en Phase 3.
- **Phase 04 / Plan 02:** Tabular-nums applied a `.message-header` root rather than `.message-header__meta` — UI-SPEC line 128 named the wrapper but Plan 03-03 / MessageHeader.jsx no lo introdujo (meta es inline `<span>` siblings). Plan 04-02 forbids JSX edits, así que apply en root achieves same visual outcome (digits align). Documented as Rule 1 deviation.
- **Phase 04 / Plan 02:** ESLint flat config flags `catch (_) { ... }` con `no-unused-vars`. Switched to bare `catch { ... }` (ES2019 optional catch binding, supported by Vite esbuild target). Semantically identical, no behaviour change.
- **Phase 04 / Plan 03:** Stage 3 panel migration delivered — `var(--color-accent-soft)` background + `border-left: 3px solid var(--color-accent)` replaces the long-standing Bootstrap green `#f0fff0`. Single most visible Phase 4 change; closes UI-SPEC line 207-211 prohibition. `stage3-reveal` keyframe (opacity 0→1 + translateY 8px→0 over `--motion-duration-slow`) gives the panel a settling fade-in.
- **Phase 04 / Plan 03:** Stage4 amber soft tint uses inline `rgba(140, 102, 32, 0.12)` instead of adding a new `--color-warn-soft` token. Plan 04-01 token set is closed at end of Wave 1; Plan 04-03 explicitly does NOT modify `index.css` (cross-wave file ownership). Border/text on the chip still use `var(--color-warn)`.
- **Phase 04 / Plan 03:** ReasoningDisclosure ships BOTH the legacy class names (kept verbatim because JSX is in Phase-3 freeze) AND the modern grid-trick contract (`.reasoning-disclosure__panel[data-open="true"]` toggles `grid-template-rows: 0fr → 1fr`). The current JSX still uses `expanded && <body>` conditional mount — the grid contract is forward-compatible for any future migration to permanent mount + data-open without CSS rewrites. Chevron `›` rotates 90deg via `::before { transform }` keyed on `aria-expanded="true"`.
- **Phase 04 / Plan 03:** Stage1Progress.jsx `isStageComplete` gates on `lastMessage.stage3 != null && !loadingState?.stage4`. Naive `stage3 != null` would auto-collapse the strip mid-pipeline for QR queries (Stage 4 critic + refinement still running). The combined gate keeps the strip visible until the whole pipeline (including any Stage 4) settles.
- **Phase 04 / Plan 03:** Stage1.jsx introduces `modelShort(modelId)` that strips publisher prefix AND `:online`/`:thinking` suffix in one helper. Replaces the previous `split('/')[1]` which left `claude-opus-4.7:online` visible on QR-profile tabs. Rule 1 deviation (bug fix). Mirrors how MessageHeader.jsx (Phase 3) already handles model-short.
- **Phase 04 / Plan 03:** Welcome state mounted in BOTH the no-conversation early return AND the empty-conversation `messages.length===0` branch. Same JSX block, same UI-SPEC copy. Plan asked to "REPLACE the existing welcome block completely"; the existing component had two welcome blocks, replacing only one would have left the legacy "Start a conversation / Ask a question to consult the LLM Council" copy reachable.
- **Phase 04 / Plan 03:** Stage1.css active-tab indicator uses `border-bottom: 2px solid var(--color-accent)` (UI-SPEC accent allowlist item 5) — replaces the Phase-3 placeholder `border: 1px solid #4a90e2; background: #ffffff` that simulated a tab via filled chip. The new pattern is closer to native browser-tab semantics and reads cleaner with the warmer Direction A bg.
- **Phase 04 / Plan 04:** Sidebar active-row marker convention CONFIRMED at execution time as the existing className conditional `${isActive ? 'active' : ''}` from Phase 1 / Plan 03. CSS selector `.conversation-item.active { border-left: 3px solid var(--color-accent); background: var(--color-accent-soft); padding-left: calc(var(--space-3) - 3px) }` matches without any JSX edit to the marker.
- **Phase 04 / Plan 04:** Modal copy locked to UI-SPEC literals: title `Delete this conversation?` (not "Delete conversation"), confirm button `Delete conversation` (not "Delete"). Body uses italic quoted title + N messages metadata. The `time_ago` portion of UI-SPEC §Copywriting Contract line 258 is partially deferred — `created_at` ISO timestamps from the conversations list need a client-side time-ago helper that doesn't yet exist; tracked under Plan 04-04 SUMMARY "Deferred Issues" as a Phase-1-class follow-up.
- **Phase 04 / Plan 04:** Menu shortcut hints (R / U+232B) are visual-only. The plan explicitly excludes keyboard handlers; affordance is purely a hint. Item shape extended with optional `shortcut: string` field rendered via `.menu-item__shortcut` span (`aria-hidden="true"`) — future plans can wire actual key bindings without touching the markup.
- **Phase 04 / Plan 04:** ErrorBanner soft-tint background uses literal `rgba(160, 56, 40, 0.10)` (and `0.12` for retry hover). The token taxonomy in `index.css` is closed at end of Wave 1 (Plan 04-01 ownership); cross-wave file ownership prevents Plan 04-04 from extending it. Same pattern Plan 04-03 used for Stage 4's amber tint. If dark-theme contrast feels insufficient at visual review, raise to `0.14` — still inline literal, NO new token.
- **Phase 04 / Plan 04:** App.css delta executed cleanly: removed `.app > .chat-interface { grid-column: 2; row: 2 }` direct rule (Plan 04-02 ownership) and replaced with `.app > .app__main-with-banner` wrapper that owns grid placement + `display: flex column`. ChatInterface flows as flex child via `.app__main-with-banner > .chat-interface { flex: 1; min-height: 0 }`. Mobile drawer rule renamed symmetrically. Net result: zero behavioral change in the desktop layout when no banner is present, banner sits above ChatInterface as a flex child when truthy.
- **Phase 04 / Plan 04:** Banner stage-number derivation reads message slots via `setCurrentConversation(prev => ...)` functional setter to avoid stale closure. Logic: `stage1 → 1; stage1 set → 2; stage2 set → 3; stage3 set → 4` (last only relevant for QR profile's Stage 4 refinement step).
- **Phase 04 / Plan 04:** Favicon = single-theme (light palette only) — per CONTEXT D-16 explicit decision. Per-theme favicon support across 2026 browsers (Chrome `media="(prefers-color-scheme: dark)"`) is patchy in Firefox/Safari. SVG hex literals (#FAF8F4 bg, #6B635A glyph) are intentional — SVG files outside the React tree do not consume CSS custom properties. Font = Georgia (universal serif fallback); Source Serif 4 isn't loaded yet at favicon-render time. Backlog item documented in SUMMARY for revisit when per-theme favicon coverage stabilizes.
- **Phase 04 / Plan 04:** Rule 2 deviation — `.markdown-content` block in `index.css` migrated from Phase-3 hex placeholders (`#f5f5f5` / `#fafafa` / `#ddd` / `#e0e0e0` / `#666` / `#4a90e2` / `#357abd`) to existing tokens (`var(--color-bg-secondary)`, `var(--color-border-strong)`, `var(--color-border-subtle)`, `var(--color-fg-secondary)`, `var(--color-accent)`). NO new tokens added — taxonomy stays closed at end of Wave 1. Required for Phase 4 success criterion #9 "ALL Wave A/B/C/D grep gates pass cumulatively"; flagged in STATE.md Open Todos as Wave-4 cleanup. Treated as plan-scope-aligned, not scope creep.

### Open Todos

- Calibration of `stage4_threshold` after first 5-10 real QR queries (CD-04). Adjust `config.PROFILES["quality_research"]["stage4_threshold"]` only — strategy module is immune to this calibration.
- Web search annotations (`data['choices'][0]['message']['annotations']`) NOT captured in v1; deferred to RSCH-V2-02 (citation extraction).
- Phase 04 — Visual Identity Implementation: COMPLETE. All 4 plans shipped (04-01..04-04). Phase-wide grep gate passes; all 23 wireframes (W01-W23) materialized.
- Pre-existing `react-hooks/immutability` errors on `loadConversation` in `App.jsx` (2 errors) carried over from earlier phases. Build passes; logged for a future cleanup pass.
- Modal `time_ago` portion of metadata copy partially deferred (UI-SPEC line 258 specifies `"{title}" · N messages · {time_ago}`; current rendering shows title + N messages only — `time_ago` requires a client-side helper not yet present). Phase-1-class polish follow-up.
- Per-theme favicon — currently single-theme light only. Backlog item: revisit when Chrome/Firefox/Safari per-theme favicon support stabilizes.

### Blockers

None.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in Phase 1 (SEC-01).
- **Metadata not persisted** — flagged as v2 (PERS-V2-01); not in this milestone but Phase 3 should not make it worse when adding `profile` to message metadata.
- **Fragile FINAL RANKING parser** — not a v1 requirement; revisit only if a Phase 3 change destabilises it.
- **Stage 2 full-context broadcast cost** — relevant to Phase 3 pricing of `quality_research`; called out as input to plan-level decisions, not a phase requirement.
- **No automated tests** — accepted milestone debt; tests added opportunistically per phase need.
- **Phase 2 anticipatory findings** — H1-04 (cost visible in Quality toggle), H5-03 (extra friction on Q+R send), H1-05/H6-05/H8-05 (reasoning_details disclosure pattern), H8-06 (Quality toggle minimalism) MUST inform Phase 3 implementation. The redesign proposal already specifies these for Direction A.

## Session Continuity

**Last session (2026-05-10):** Executed Plan 04-04 (Phase 4 Wave 4 — Conversations & polish). Four atomic commits: `b7afb09` (feat: Sidebar/Modal/Menu CSS migrated to Direction A tokens — Sidebar.css full token migration with new .sidebar__empty / .sidebar__empty-mark 96px serif ampersand mark / .sidebar__empty-body / .sidebar__rename-hint classes; .conversation-item.active uses border-left 3px var(--color-accent) + var(--color-accent-soft) tint; Modal.css cream elevated card with var(--shadow-md) + destructive button on var(--color-error); Menu.css hover bg var(--color-accent-soft) + new .menu-item__shortcut span styled with microcopy var(--color-fg-muted); Sidebar.jsx empty state branch + rename hint 'Enter para guardar · Esc para cancelar' + Modal/Menu copy locked to UI-SPEC; Menu.jsx renders shortcut span aria-hidden), `f07bb19` (feat: ErrorBanner.{jsx,css} new — persistent H9-01 catastrophic interruption recovery banner with role=alert + aria-live=assertive + copy 'La deliberación se interrumpió en Stage {N}. ¿Quieres reintentar con la misma pregunta?' + Retry always + Dismiss conditional on retryAttempted=true; soft tint background literal rgba(160,56,40,0.10) — index.css token taxonomy stays closed at end of Wave 1; App.jsx new streamError + retryAttempted state + handleRetryError/handleDismissError useCallback handlers + .app__main-with-banner wrapper render; App.css DELTA — removed .app > .chat-interface direct grid placement and replaced with .app > .app__main-with-banner wrapper that owns grid-column:2 / row:2 / display:flex column), `728dfbb` (feat: favicon-ampersand.svg new — 32×32 SVG with Georgia serif & glyph #6B635A on cream background #FAF8F4; index.html slot was reserved by Plan 04-01 — single-theme light palette per CONTEXT D-16; backlog item documented for per-theme favicon revisit), `a805d63` (fix: Rule 2 deviation closing .markdown-content phase-wide hex gate — index.css migrated from Phase-3 hex placeholders #f5f5f5/#fafafa/#ddd/#e0e0e0/#666/#4a90e2/#357abd to existing tokens var(--color-bg-secondary)/var(--color-border-strong/subtle)/var(--color-fg-secondary)/var(--color-accent); NO new tokens added — taxonomy stays closed at end of Wave 1). Phase-wide grep gate passes — zero Bootstrap hex across `frontend/src/`; zero `system-ui` outside the `--font-sans` declaration in index.css; zero Phase-3 placeholder hex (#666/#333/#999) in MessageHeader/QualityToggle/ReasoningDisclosure/Stage4 .css code. Sidebar.css 39 token consumptions; Modal.css 13; Menu.css 8. `npm --prefix frontend run build` succeeds (CSS 38.07 kB / gzip 6.27 kB). 1 Rule 2 deviation documented (markdown-content cleanup, plan-scope-aligned per STATE.md Open Todo). MILESTONE COMPLETE — all 21 v1 requirements satisfied.

**Previous session (2026-05-10):** Executed Plan 04-03 (Phase 4 Wave 3 — Deliberation surfaces). Three atomic commits: `ca11b11` (feat: 6 .css migrations Stage1/2/3/4 + QualityToggle + ReasoningDisclosure → tokens — Stage 3 panel: var(--color-accent-soft) + 3px terracota border-left + stage3-reveal keyframe; Stage 4 transparent bg + var(--color-warn) chip with inline rgba soft tint; QualityToggle active border var(--color-accent); ReasoningDisclosure modern grid-template-rows 0fr→1fr accordion + chevron rotation 90deg; Stage1 active tab border-bottom 2px var(--color-accent)), `d3393c4` (feat: Stage1Progress.{jsx,css} new + ChatInterface mount + welcome state copy + ChatInterface.css full token migration — Stage1Progress 3-segment strip with @keyframes dot-pulse staggered 0/220/440ms + auto-collapse via grid-template-rows 1fr→0fr; welcome h1 'What do you want to think about today?' + lead + 3 italic examples mounted in both no-conversation cold start and empty-conversation paths; Send button uses var(--color-accent) + filter brightness(0.92) hover; spinner border-top var(--color-accent)), `a4e7a19` (feat: Stage1.jsx modelShort() helper strips publisher prefix AND :online/:thinking suffix; failed-tab rendering with .tab--failed compound class consuming Stage1.css var(--color-error) + ⚠ glyph). Wave 3 grep gate passes — zero Bootstrap hex (#4a90e2|#357abd|#f0fff0|#f5f5f5|#f0f0f0) across the 7 deliberation .css files. `npm --prefix frontend run build` succeeds (CSS 32.50 kB / gzip 6.02 kB). 4 minor Rule 1/2 deviations documented in SUMMARY (modelShort helper, failed-tab rendering, dual welcome state mount, isStageComplete gates on !stage4 loading).

**Earlier session (2026-05-10):** Executed Plan 04-02 (Phase 4 Wave 2 — Branded shell). Three atomic commits: `d5c4818` (feat: useTheme hook + Header component — frontend/src/hooks/useTheme.js with synchronous initial read coordinated with FOUC blocker, matchMedia listener subscribed only while followSystem===true, cleanup on unmount + on followSystem flip; frontend/src/components/Header.jsx with role='banner' landmark, ampersand SVG mark via inline <text> + currentColor, 'LLM Council' wordmark in var(--font-serif) weight 600, sun/moon theme toggle with aria-label flipping with the next theme; frontend/src/components/Header.css token-only — zero hardcoded hex), `befff4a` (feat: App shell restructured to CSS grid — App.jsx imports Header and mounts it as first child; App.css rewritten from flex+#ffffff/#333+system-ui to grid-template-columns: var(--layout-sidebar-w) 1fr / grid-template-rows: var(--layout-header-h) 1fr / background var(--color-bg-primary) / font-family var(--font-serif), descendant selectors place .app-header on row 1 and .sidebar/.chat-interface on row 2, mobile drawer rule via @media (max-width: 768px) with translateX overlay), `e9195c5` (feat: MessageHeader.css migrated from Phase-3 hex placeholders to tokens — #666 → var(--color-fg-secondary), #333 → var(--color-fg-primary), #999 → var(--color-fg-muted), #4a90e2 → var(--color-accent), font stack 'Inter', system-ui → var(--font-sans), sizes/spacings → var(--font-size-body-small)/var(--space-*), font-variant-numeric: tabular-nums on .message-header root for digit alignment; JSX intentionally untouched). Wave B grep gate passes — only `system-ui` reference in frontend/src/ is the fallback inside `--font-sans` declaration in index.css. `npm --prefix frontend run build` succeeds (CSS 21.25 kB gzip 5.19 kB). Two minor Rule 1 deviations: catch(_) → bare catch (ESLint), tabular-nums on root vs .__meta (JSX freeze).

**Next session should start by:**

1. Reading this STATE.md to confirm milestone-complete status.
2. **MILESTONE v1.0 IS COMPLETE.** All 4 phases shipped, all 21 v1 requirements satisfied. No more execute-phase work in this milestone.
3. Recommended follow-ups (in priority order):
   - **Smoke test pass:** `npm --prefix frontend run dev` + `uv run python -m backend.main` end-to-end across the 3 Quality profiles (Fast / Quality / Quality+Research) on a clean and a populated sidebar; verify Stage 3 terracota panel, progress dots, ReasoningDisclosure accordion, sidebar empty-state ampersand, ErrorBanner triggering on a forced network drop, favicon visible in browser tab in both light and dark themes.
   - **Phase 4 retrospective / verification doc** — if a phase-verify checklist exists, run it; otherwise consider summarizing the v1.0 milestone in `.planning/MILESTONE-SUMMARY.md` for future reference.
   - **Stage4_threshold calibration** — open todo from Phase 3; monitor `metadata.stage4_triggered` rate over the first 5-10 real QR queries.
   - **Modal time_ago helper** — closes the partial-deferral noted in Plan 04-04 SUMMARY (UI-SPEC line 258 `"{title}" · N messages · {time_ago}`).
   - **v2 backlog grooming** — QUAL-V2-01..02, CONV-V2-01..03, RSCH-V2-01..02, PERS-V2-01, UX-V2-01..02 are documented in REQUIREMENTS.md.

**Files most recently touched by GSD tooling:**

- `frontend/src/components/Sidebar.css` (Plan 04-04 — token migration + empty state classes + active row)
- `frontend/src/components/Sidebar.jsx` (Plan 04-04 — empty state branch + rename hint + Modal/Menu copy locked)
- `frontend/src/components/Modal.css` (Plan 04-04 — token migration; destructive on var(--color-error))
- `frontend/src/components/Menu.css` (Plan 04-04 — token migration; shortcut span styling)
- `frontend/src/components/Menu.jsx` (Plan 04-04 — shortcut span rendering)
- `frontend/src/components/ErrorBanner.jsx` (Plan 04-04 — NEW, persistent H9-01 recovery banner)
- `frontend/src/components/ErrorBanner.css` (Plan 04-04 — NEW, soft tint + var(--color-error) border-top)
- `frontend/src/App.jsx` (Plan 04-04 — useCallback + streamError state + ErrorBanner wiring + wrapper)
- `frontend/src/App.css` (Plan 04-04 — delta: .app__main-with-banner wrapper replaces direct .chat-interface grid placement)
- `frontend/src/index.css` (Plan 04-04 — .markdown-content block migrated to tokens)
- `frontend/public/favicon-ampersand.svg` (Plan 04-04 — NEW, 32×32 ampersand serif favicon)
- `.planning/phases/04-visual-identity-implementation/04-04-SUMMARY.md` (Plan 04-04 summary)
- `.planning/STATE.md` (this file — milestone complete)
- `.planning/ROADMAP.md` (Plan 04-04 marked complete; Phase 4 closed; milestone complete)
- `.planning/REQUIREMENTS.md` (VIS-01 marked complete; 21/21 v1 requirements closed)

---
*State initialized: 2026-05-09*
*Last updated: 2026-05-10 after Plan 04-04 (Phase 4 Wave 4 Conversations & polish: Sidebar/Modal/Menu token migration + Sidebar empty state ampersand 96px + ErrorBanner H9-01 recovery + favicon SVG + .markdown-content cleanup; phase-wide grep gate passes; VIS-01..04 closed; MILESTONE v1.0 COMPLETE — 21/21 v1 requirements satisfied).*
*Last updated: 2026-05-10 after Plan 04-03 (Phase 4 Wave 3 Deliberation surfaces: 6 .css migrations + Stage1Progress NEW + ChatInterface welcome state + Stage1.jsx modelShort/failed-tab; VIS-01 ~80% closed — Wave 4 closes Sidebar/Modal/Menu/favicon).*
*Last updated: 2026-05-10 after Plan 04-02 (Phase 4 Wave 2 Branded shell: useTheme + Header + App.css grid + MessageHeader migration; VIS-02 + VIS-03 + VIS-04 closed; VIS-01 still open until Wave 3-4).*
*Last updated: 2026-05-10 after Plan 04-01 (Phase 4 Foundations: token system + self-hosted variable fonts + FOUC blocker landed; VIS-01..04 still open — components migration in Waves 2-4).*
*Last updated: 2026-05-10 after Plan 03-05 (frontend QR wiring: QUAL-03 + RSCH-03 + RSCH-05 closed; Phase 03 complete with 21/21 requirements coverage).*

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
