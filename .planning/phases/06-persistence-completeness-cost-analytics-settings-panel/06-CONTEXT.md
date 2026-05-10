# Phase 6: Persistence completeness + Cost analytics + Settings panel - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase ships the **visibility & control layer** that surrounds the v1.0/Phase-5 deliberation engine. Three bundled capabilities:

1. **Persistence completeness (PERS-01..02)** — Persist `label_to_model` and `aggregate_rankings` inside the existing `metadata` dict (zero signature change to `add_assistant_message`); reload of any v2.0 conversation hydrates Stage 2 metadata fully (de-anonymized model names + complete aggregate rankings table, no "Quality (legacy)" fallback).
2. **Cost analytics (COST-01..04)** — Capture `usage.cost` + `usage.cost_details.upstream_inference_cost` per `query_model` call; aggregate into `metadata.cost = {stage1, stage2, stage3, stage4, total, upstream_total, currency}`; surface as a static post-deliberation line in `MessageHeader` and as a monthly cumulative footer in the sidebar; new endpoint `GET /api/stats/cost` aggregates read-only from `data/conversations/*.json`.
3. **Settings panel (SET-01..04)** — Gear icon in `Header.jsx` opens a slide-out panel (380px desktop, full-width mobile) with 4 controls (theme toggle duplicate, font-size S/M/L, density compact/comfortable, `stage4_threshold` slider 1-10); a new `useSettings()` hook (~30 LOC mirror of `useTheme`) persists each to localStorage; density applies via the existing FOUC blocker script in `index.html` (extended), font-size applies via React state on first render; `stage4_threshold` travels in `quality_research` request bodies as Pydantic `Optional[int] = Field(None, ge=1, le=10)`.

All of this sits on top of the Phase 5 `metadata` opaque-dict contract — no signature changes downstream of `add_assistant_message`.

</domain>

<decisions>
## Implementation Decisions

### Cost display format & precision

- **D-01 — MessageHeader cost line: upstream prominent, OpenRouter fee secondary.** The post-deliberation cost line in `MessageHeader.jsx` renders the upstream BYOK cost in bold body-size (`var(--font-size-body)` weight 600) followed by the OpenRouter fee in muted microcopy weight (e.g. `$1.430 upstream · $0.024 fee`). Rationale: the upstream cost is ~95% of the real spend; visual hierarchy mirrors monetary hierarchy. Hide the entire cost line when `metadata.cost.total === 0` (Fast queries that hit cached responses or local-only paths produce no upstream spend). Use `font-variant-numeric: tabular-nums` (already established in `Sidebar.css:140 .conversation-meta`) so digit columns align across messages. Separator `·` middot (Direction A standard).
- **D-02 — Sidebar footer: two-column layout, OpenRouter left / Upstream right.** The cumulative-monthly footer in `Sidebar.jsx` renders OpenRouter (capped at $100) on the left with `$X.XX / $100` + progress bar that appears only when `≥80%` of cap (`color-warning` tint when at threshold); Upstream BYOK on the right with `$XX.XX BYOK · no cap` because BYOK costs flow through the user's own provider accounts and have no OpenRouter cap. Combined microcopy line below: `1.2% of cap · 47 queries this month`. Two-column makes the cap structure visually explicit, even though it diverges from D-01's "upstream prominent" hierarchy (this is intentional — the line context shows real cost of THIS message, the footer context shows cap pressure).

### Settings panel behavior

- **D-03 — Immediate apply for all 4 controls (no Save/Cancel buttons).** Each control change writes through `useSettings()` to `localStorage` and applies to the DOM/state on the same tick. This mirrors v1.0 `useTheme` (which already applies on toggle, no save button) and respects Direction A "calmo". `stage4_threshold` changes only take effect on the NEXT `quality_research` request — no in-flight queries are affected — so reversibility is trivial (slide it back). The `QualityToggle` or Submit-row can surface a projected-cost microcopy based on the current threshold to prevent "didn't realize" surprises, but no gate is added in this phase.
- **D-04 — Panel dismiss: permissive (backdrop click + ESC + explicit X) WITHOUT scrim/overlay darkening.** The 380px slide-out panel uses native `<dialog>` semantics + focus trap (per the Phase 7 MOBL-02 lookahead — already planned to use `<dialog>` + `showModal()`). The area outside the panel is NOT scrim-darkened — the deliberation behind stays readable, which is the "research notebook" tone of Direction A. Click outside dismisses, ESC dismisses, the X button in the panel header dismisses. Mobile (≤768px, Phase 7) the panel becomes full-width and backdrop click degrades gracefully (no outside area) — ESC and X still work.

### stage4_threshold slider UX (SET-02)

- **D-05 — Minimal HTML range slider 1-10 + current value adjacent + fixed microcopy.** Native `<input type="range" min="1" max="10" step="1">` with the integer value rendered next to the track (`tabular-nums`). Single fixed microcopy line below: `Higher = stricter; only refine when answer scores ≥{value}/10`. No tick marks, no `+/-` buttons, no dynamic copy that changes per value. Direction A "calmo" at maximum.
- **D-06 — Default value: 8 (inherited from `PROFILES["quality_research"]["stage4_threshold"]`).** Initial slider position on first mount = 8. localStorage key `stage4Threshold` (camelCase, matching the `useTheme` pattern with `theme`). When absent or invalid (non-integer / out of [1,10]), `useSettings()` falls back to the PROFILES default.

### Claude's Discretion (planner can resolve at plan-time)

- **Cost decimal precision exact rules:** recommended 3 decimals for OpenRouter (`$0.024`), 3 decimals for upstream (`$1.430`) — both small and large amounts need the precision to be honest. Currency symbol prefix `$` (USD only — no i18n in v2.0; reflected `cost.currency: "USD"` in metadata.cost).
- **Cost line hide-zero threshold:** total `< 0.001` (i.e. less than a tenth of a cent) rounds to `$0.000` — recommend hiding the line at that point (any non-zero amount the user could perceive after rounding gets shown).
- **Progress bar color at ≥80%:** recommend `var(--color-warning)` (whatever the token-system value is) for the filled portion when `≥80%`, `var(--color-accent)` below threshold. Falls back to whatever the existing tokens-only palette in v1.0 Phase 4 exposes; if there is no `--color-warning` token, propose it as the first new token in v2.0 and document in the planner notes.
- **Panel slide-out transition:** recommend 200ms `ease-out` for entry, 150ms for exit — matches Direction A motion tokens already used in v1.0 (`var(--motion-duration-base) var(--motion-easing-out)` per `Sidebar.css`).
- **Font-size token mapping (S/M/L = 15/17/19px):** lock to `rem` after applying root size — recommend `--font-size-body: 0.9375rem | 1rem | 1.1875rem` keyed by `data-fontsize` attribute on `<html>`. Plan-time may pick `px` to avoid root-cascade surprises; both are acceptable.
- **Settings panel control ordering:** recommend top→bottom = theme · font-size · density · stage4_threshold (most-frequently-toggled at top, most-impactful-on-cost at bottom). Plan-time may reorder if UI-SPEC dictates otherwise.
- **OpenRouter `usage.cost` shape:** UNVERIFIED until the spike. STATE.md active TODO carries this. Plan-1 of Phase 6 MUST include the 5-min spike (log one real response from each Quality model) before any cost-aggregation code lands.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements, and locked decisions
- `.planning/ROADMAP.md` §"Phase 6" — success criteria (5 numbered items), bundling rationale ("tooling alrededor del motor de deliberación").
- `.planning/REQUIREMENTS.md` §PERS (PERS-01..02), §COST (COST-01..04), §SET (SET-01..04) — the 10 requirements bundled into this phase.
- `.planning/PROJECT.md` — anti-feature AA2 (animated cost ticker forbidden), AA1/AA13 (no onboarding tour, no LLM-powered settings explainer), and Out-of-Scope items (no real-time animated cost ticker, no CI).
- `.planning/STATE.md` §"Accumulated Context" — locked roadmap-time decisions (dual-column cost, 380px slide-out, mirror of `useTheme`, ge=1/le=10 Pydantic on stage4_threshold, density via FOUC blocker).
- `.planning/STATE.md` §"Open Decisions (deferred to plan-time)" — OpenRouter `usage.cost` shape spike (REQUIRED in plan-1).

### Phase 5 artefacts (this phase builds on top)
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-CONTEXT.md` — `metadata` dict opaque contract; `schema_version: 2` already lands on writes; `mode` field at root; `external_research` opaque kwarg pattern (PERS-01 mirrors the pattern: extend `metadata` dict without changing `add_assistant_message` signature).
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-VERIFICATION.md` — confirms PERS-03 lazy migration is in place; PERS-01/02 in this phase consume the same migration path for hydration on reload.
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-RESEARCH.md` — `migrate_message_v1_to_v2` defaulting behavior (the planner should confirm v1 messages with no `label_to_model` get an empty dict, no a `null`; tests need that).
- `.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-PATTERNS.md` — `query_model` analog and SSE event-type discriminator analog (relevant for COST-01 instrumentation of `query_model`).

### Research artifacts (v2.0 milestone-level)
- `.planning/research/ARCHITECTURE.md` §2 (persistence), §3 (cost capture pipeline), §4 (settings panel architecture) — design decisions per requirement bucket.
- `.planning/research/PITFALLS.md` §MIN-1 (FOUC blocker correctness — density must apply sync before first paint), §MIN-2 (Pydantic optional field backward-compat for stage4_threshold), §MOD-2/MOD-3 (anti-patterns for cost analytics — no animated tickers).
- `.planning/research/FEATURES.md` §C (cost analytics), §D (settings panel) — feature definitions + ANTI-FEATURES AA1/AA2/AA13.
- `.planning/research/STACK.md` — OpenRouter `usage` response shape (UNVERIFIED — needs spike); `pyproject.toml` httpx version.

### Codebase touch sites (read before modifying)
- `backend/openrouter.py` — `query_model` is the instrumentation site for COST-01 (capture `usage.cost` + `usage.cost_details.upstream_inference_cost` from each response and return as a tuple/dict alongside the content).
- `backend/council.py` — propagate cost per-stage from `query_model` returns into the metadata bag (Phase 5 already extended this for `external_context`; same parameter-flow pattern applies to cost).
- `backend/storage.py:268` — `metadata` dict opaque persistence path; PERS-01 packs `label_to_model` + `aggregate_rankings` here. No signature change.
- `backend/main.py` — new route `GET /api/stats/cost` aggregates from `data/conversations/*.json` read-only; SSE generator pattern is reusable but this endpoint is a normal JSON GET, not SSE.
- `backend/research_strategy.py` — `research_strategy.run(..., threshold_override: Optional[int] = None)` consumes SET-03's request-body field; falls back to `PROFILES["quality_research"]["stage4_threshold"]` when absent.
- `backend/config.py` — `PROFILES["quality_research"]["stage4_threshold"]` is the source-of-truth default. SET-02 slider initial value derives from this.
- `frontend/src/hooks/useTheme.js` (or wherever it lives) — `useSettings()` is the mirror; same `matchMedia` + `localStorage` round-trip pattern.
- `frontend/src/components/Header.jsx` — gear icon mount site for SET-01; lives alongside the existing theme toggle.
- `frontend/src/components/MessageHeader.jsx` — cost line append site for COST-02 (after the existing profile/models/time line).
- `frontend/src/components/Sidebar.jsx` — footer mount site for COST-04 (after the conversation-list section, before the close of `.sidebar`).
- `frontend/src/api.js` — extend `sendMessage` (quality_research path) to include `stage4_threshold` in the body when set; add `getCostStats()` GET wrapper.
- `frontend/index.html` — FOUC script at line 8-17 already handles theme; extend it to also read `localStorage.getItem('density')` and set `data-density` on `<html>` synchronously before first paint (SET-04). Theme block is the analog.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useTheme` hook** — the EXACT mirror for `useSettings()`. Use the same `localStorage` round-trip pattern, the same `matchMedia` guard for system-preferred fallback (theme has `prefers-color-scheme`; density has no system pref — falls back to `'comfortable'`).
- **FOUC blocker IIFE in `index.html:8-17`** — the analog for D-04's density-sync-pre-paint requirement. Extending the IIFE with one `localStorage.getItem('density')` + `setAttribute('data-density', value)` block matches the existing pattern verbatim.
- **`.conversation-meta` tabular-nums class** in `Sidebar.css:140` — already establishes `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`. The cost line (`MessageHeader.jsx`) and the footer (`Sidebar.jsx`) MUST reuse this class or the same property — non-tabular digits would jiggle the layout when totals update.
- **`metadata` opaque dict pattern** in `backend/storage.py:268` — PERS-01 extends the dict, never the signature. Phase 5 PERS-03 already validated this contract.
- **Native `<dialog>` + `showModal()` pattern** (planned in Phase 7 MOBL-02 for mobile sidebar drawer) — same pattern for the Settings panel desktop scrim/dismiss UX. The Settings panel lands first, so it gets to set the convention; Phase 7 reuses.
- **Direction A motion tokens** (`var(--motion-duration-base)`, `var(--motion-easing-out)`) — already in use in `Sidebar.css:39` for the new-conversation-btn transition. Slide-out panel entry/exit uses these same tokens for consistency.
- **`Modal.jsx` v1.0 component** — already exists. May be the base for the slide-out drawer, OR a new `SettingsPanel.jsx` component can be created if the geometry (full-height fixed-right vs centered modal) doesn't match. Planner decides.

### Established Patterns

- **Direction A "calmo"** (locked v1.0 Phase 4) — no animated cost tickers (AA2), no onboarding tours (AA1), no LLM-powered settings explainers (AA13). Static post-deliberation displays only. Honored across all of Area 1.
- **PROFILES dict single-source-of-truth** — the `stage4_threshold` default (8) flows from `backend/config.py PROFILES["quality_research"]` → SET-02 slider initial value. NO hardcoding of `8` in the frontend.
- **Pydantic optional fields with backward-compat** — `SendMessageRequest.stage4_threshold: Optional[int] = Field(None, ge=1, le=10)` per SET-03. Existing v1 requests (no field) continue to validate and `research_strategy.run` uses the PROFILES default.
- **localStorage individual keys** (not single namespaced JSON object) — `'theme'` already exists; `'fontSize'`, `'density'`, `'stage4Threshold'` follow the same pattern. Three benefits: (a) `useTheme` mirror is true 1:1, (b) one `storage` event per setting (granular reactivity), (c) FOUC blocker IIFE script doesn't need a JSON.parse on first paint.
- **Native HTML `<input type="range">` for sliders** — accessibility, mobile touch, and `prefers-reduced-motion` all handled by the browser. No third-party slider library (would violate the registry-safety dimension).

### Integration Points

- **`query_model` (backend/openrouter.py)** — needs to return cost alongside content. Recommended signature evolution: `{"content": str, "reasoning_details": dict | None, "cost": {"openrouter_fee_usd": float, "upstream_usd": float}, "latency_ms": int}`. Backward-compat: existing callers that destructure `{"content"}` keep working.
- **`council.py` stage1/stage2/stage3** — collect per-stage cost from `query_model` returns; aggregate into `metadata.cost` before persisting.
- **`research_strategy.py run()`** — accepts `threshold_override` parameter (kwarg, defaults to None); uses PROFILES fallback when None.
- **`add_assistant_message` (storage.py)** — NO signature change. `metadata` dict is the only delta surface. `metadata.cost` and `metadata.label_to_model` and `metadata.aggregate_rankings` all live here.
- **`GET /api/stats/cost` (main.py)** — new route, reads all `data/conversations/*.json` synchronously (single-user local app; OK for v2.0 — Phase 7 testing can validate latency). Filter by `created_at` >= start-of-current-month; agglomerate. Response shape: `{current_month: {total_usd, queries, by_profile, upstream_total_usd}, current_session_estimate_for_cap: {remaining_pct, cap_usd}}`. No persisted total — every call recomputes.
- **App.jsx settings open state** — `useState` boolean for `settingsOpen`; gear button in Header sets it true; panel close handlers set it false. NO router, NO context provider — local state is sufficient because no other component needs to read `settingsOpen`.
- **FOUC blocker extension** — `index.html` script (lines 8-17) gets one extra line: `try { document.documentElement.setAttribute('data-density', localStorage.getItem('density') || 'comfortable'); } catch(e) {}`. CSS in `index.css` adds `[data-density="compact"] { --space-2: 6px; --space-3: 10px; ... }` to retune the spacing scale at compact level (the exact mapping is plan-time).

</code_context>

<specifics>
## Specific Ideas

- **Cost line example (locked verbatim format):** `$1.430 upstream · $0.024 fee` — body-size bold for `$1.430 upstream`, microcopy weight for `$0.024 fee`. Hide entire line if total < $0.001.
- **Footer example (locked layout):** two columns, left = `OpenRouter\n$1.20 / $100\n[progress bar visible only ≥80%]`; right = `Upstream\n$42.55 BYOK\n(no cap)`. Combined microcopy beneath: `1.2% of cap · 47 queries this month`.
- **Slider microcopy verbatim:** `Higher = stricter; only refine when answer scores ≥{value}/10` (the `{value}` interpolates the current slider value). Default 8.
- **Settings panel control order (recommendation):** Theme · Font size · Density · Stage 4 threshold (top to bottom). Theme is the most frequently toggled; stage4_threshold has the highest cost impact and lives at the bottom where it's the "advanced" knob.
- **`useSettings()` API shape (recommendation):** `{ theme, fontSize, density, stage4Threshold, setTheme, setFontSize, setDensity, setStage4Threshold }` — four read values + four setters, mirroring `useTheme`'s `{theme, toggle}` style but with explicit setters (since these are non-binary).

</specifics>

<deferred>
## Deferred Ideas

- **Single-namespaced localStorage object** (`{theme, fontSize, density, stage4Threshold}` under one key) — rejected in favour of individual keys to mirror `useTheme` pattern (D-03 implies this).
- **Save/Cancel buttons on Settings panel** — rejected (D-03 immediate apply).
- **Scrim/overlay darkening on panel open** — rejected (D-04 preserves Direction A "calmo" reading context).
- **Animated cost ticker** — already declared anti-feature AA2 (violates "calmo"). Static line only.
- **Dynamic slider microcopy that changes per value** ("1-3 = refinar casi siempre…") — rejected (D-05 minimal chrome). If user-testing shows confusion about what "8" means, revisit by adding a tooltip rather than dynamic copy.
- **Numeric input + `+/-` buttons for stage4_threshold** — rejected (D-05 slider is more touch-friendly + standard).
- **Tick marks on slider** — rejected (D-05 minimal). Could be added later if UX-testing reveals users miss discreteness.
- **Per-conversation cost stats panel** (drill-down beyond the monthly footer) — out of scope for v2.0. The MessageHeader line is the per-message stat; sidebar footer is monthly. No middle aggregation in this phase.
- **Cost currency conversion (EUR/GBP)** — out of scope. v2.0 is USD-only (OpenRouter bills in USD, BYOK upstream typically USD). `metadata.cost.currency: "USD"` is locked.
- **Settings export/import** — out of scope. No "backup my settings" affordance.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 6 scope.

</deferred>

---

*Phase: 6 - Persistence completeness + Cost analytics + Settings panel*
*Context gathered: 2026-05-11*
