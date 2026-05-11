# Requirements — Milestone v2.0 Council as External Critic + Hardening

**Started:** 2026-05-10
**Locked from:** PROJECT.md "Current Milestone" + .planning/research/ (Stack, Features, Architecture, Pitfalls, Summary)
**Continuation from v1.0:** REQ-IDs continue numbering with new category prefixes; v1.0 reqs archived at `.planning/milestones/v1.0-REQUIREMENTS.md`.

---

## v2.0 Requirements

### Critique mode (CRIT) — feature A

**Goal:** Parallel entry point that lets the user upload externally-generated deep research files (one per Quality-mode council model) and have the council critique them via the existing 3-stage flow.

- [ ] **CRIT-01**: A new entry point lets the user choose between "Fresh question" and "Critique research" before starting a deliberation. The fresh-prompt flow (textarea + Quality dial) is preserved bit-for-bit when "Fresh question" is selected. Source: FEATURES.md §A entry-point pattern + PROJECT.md "Critique mode is a parallel entry point".
- [ ] **CRIT-02**: The "Critique research" mode presents 3 file-pickers, one per Quality-mode council model (`gpt-5.5`, `claude-opus-4.7`, `gemini-3.1-pro-preview`), with the model attribution determined by the order of `COUNCIL_MODELS` in `PROFILES["quality"]`. Each picker accepts `.md` and `.txt` files only, with a hard cap of 750KB per file (Pydantic-enforced server-side). Source: ARCHITECTURE.md §1.4 + PITFALLS.md §CRIT-4 cap.
- [ ] **CRIT-03**: A new endpoint `POST /api/conversations/{id}/critique/stream` accepts `multipart/form-data` with the 3 files + their model attributions + a critique instruction prompt, and emits the existing SSE event protocol (`stage1_start/complete`, `stage2_start/complete`, `stage3_start/complete`, `message_metadata`, `complete`). Source: ARCHITECTURE.md §1.1.
- [ ] **CRIT-04**: Stage 1 produces 3 individual critiques where each council member sees ALL three deep researches as context (with model authorship labels visible) plus the user's critique instruction. Implementation reuses `stage1_collect_responses` with a new `external_context: Dict[model_id, {filename, content}]` parameter; NO new isolated module. Source: ARCHITECTURE.md §1.2 + PROJECT.md "no new strategy module isolated".
- [ ] **CRIT-05**: Stage 2 anonymized peer-review of critiques strips explicit model names from the critique text (regex-replaces `"openai/gpt-5.5"` etc. with `"Author 1/2/3"` aliases) before concatenation, mitigating the attribution-leak anonymity weakness. Source: PITFALLS.md §MOD-1.
- [ ] **CRIT-06**: A pre-flight token estimate (heuristic `len(text)/4`) blocks the run with a clear UI error if estimated input exceeds 150K tokens; Stage 2 truncates each critique to its first 600 tokens with a `[…truncated, full text in Stage 1 tab]` marker before building the peer-review prompt. Source: PITFALLS.md §CRIT-1.
- [ ] **CRIT-07**: A pre-flight cost estimate appears in the critique entry-point UI, showing "Estimated upstream cost: $X.XX–$Y.YY (billed to your provider keys, not OpenRouter)" before the user submits. Soft rate-limit in localStorage prompts re-confirmation after 5 critique runs in 1 hour. Source: PITFALLS.md §CRIT-2.
- [ ] **CRIT-08**: Reloading a critique conversation hydrates the uploaded files as collapsed chips above the assistant message (filename + size + model badge); clicking expands the markdown-rendered content via the same `grid-template-rows: 0fr → 1fr` accordion technique used for `reasoning_details`. Source: ARCHITECTURE.md §1.5 + UI consistency with v1.0 ReasoningDisclosure.

### In-conversation navigation (NAV) — feature H (added by user post-research)

**Goal:** A long deliberation (Stage 1 individual responses + Stage 2 evaluations + Stage 3 synthesis + optional Stage 4 refinement) can easily exceed 5,000 words. Users currently lose track of which section they're reading and must scroll repeatedly. v2.0 adds in-conversation navigation primitives so reading long deliberations stays oriented.

- [ ] **NAV-01**: Stage section headers ("Stage 1 — Individual responses", "Stage 2 — Peer review", "Stage 3 — Final synthesis", optional "Stage 4 — Refinement") become **sticky** when scrolling — the active stage's header pins to the top of the main panel (just below the global Header at 52px) until the next stage scrolls into view. Pure CSS via `position: sticky` (no JS scroll listener needed for the basic case).
- [ ] **NAV-02**: A horizontal **stage navigation strip** sits above the deliberation, showing chips for each stage present in the message ("Stage 1 · 4 responses", "Stage 2 · evaluating", "Stage 3 · synthesis", optional "Stage 4 · refinement"). Clicking a chip smooth-scrolls to that section. The strip uses scroll-spy logic (IntersectionObserver-driven) to highlight the chip corresponding to the section currently in viewport. This extends/replaces the existing v1.0 `Stage1Progress` strip with a richer navigation role.
- [ ] **NAV-03**: Long Stage 1 individual model responses (>600px height) collapse to a "Show more" preview with the first ~400px visible plus a chevron expansion (reusing the `grid-template-rows: 0fr → 1fr` accordion technique from v1.0 `ReasoningDisclosure`). Once Stage 2 or Stage 3 has arrived, Stage 1 tabs default to collapsed state on first render of the historical conversation (so reload doesn't dump 4×800px wall of text). User can still expand any tab.
- [ ] **NAV-04**: A "Back to top" floating button appears in the bottom-right of the main panel after the user scrolls >800px down within a conversation. Click smooth-scrolls to the top of the deliberation. Hidden when scroll position is at the top. Honors `prefers-reduced-motion` (instant scroll instead of smooth).

### Persistence completeness (PERS) — feature B

**Goal:** Persist all metadata produced during deliberation (including Stage 2 anonymization mappings) so that historical conversations hydrate fully on reload.

- [ ] **PERS-01**: `label_to_model` and `aggregate_rankings` are persisted inside the existing `metadata` dict on every assistant message (no new kwargs to `add_assistant_message`). Both fast/quality and quality_research pipelines pack them into `metadata` before persisting. Source: ARCHITECTURE.md §2.1.
- [ ] **PERS-02**: Reloading a v2.0 conversation hydrates Stage 2 metadata fully — de-anonymized model names appear in Stage 2 tabs and the aggregate rankings table renders correctly without any "Quality (legacy)" fallback. Source: ARCHITECTURE.md §2.2.
- [ ] **PERS-03**: Conversation JSON files written by v2.0 carry a `schema_version: 2` field at the root; v1.0 conversations (without this field) are lazily migrated server-side in `get_conversation` via a `migrate_message_v1_to_v2(msg)` helper that defaults missing fields, so the frontend never sees a v1 shape after the v2 deploy. Source: PITFALLS.md §CRIT-3.

### Cost analytics (COST) — feature C

**Goal:** Capture, aggregate, and surface real OpenRouter spend per profile per session; help the user see the BYOK upstream cost (which is NOT covered by the $100/month cap).

- [ ] **COST-01**: `query_model` captures the `usage.cost` and `usage.cost_details.upstream_inference_cost` fields from every OpenRouter response and propagates them through the council/research_strategy pipelines into `metadata.cost = {stage1, stage2, stage3, stage4, total, upstream_total, currency}`. Source: ARCHITECTURE.md §3.1 + STACK.md "OpenRouter usage already returned".
- [ ] **COST-02**: `MessageHeader` displays a static cost microcopy line below the profile/models metadata (e.g. "$0.024 OpenRouter · $1.43 upstream · 4.2s"). No animated tickers (anti-pattern AA2 violates Direction A "calmo" tone). Source: FEATURES.md §C + ANTI-FEATURES.
- [ ] **COST-03**: A new endpoint `GET /api/stats/cost` returns `{current_month: {total_usd, queries, by_profile, upstream_total_usd}, current_session_estimate_for_cap: {remaining_pct, cap_usd}}`. Aggregation is read-only from `data/conversations/*.json` filtered by `created_at` (no top-level persisted total). Source: ARCHITECTURE.md §3.2.
- [ ] **COST-04**: A sidebar footer section displays cumulative cost for the current month ("$12.34 this month · 47 queries · 12% of cap") with a discreet progress bar appearing at ≥80% of the $100 OpenRouter fee cap. Source: FEATURES.md §C + PROJECT.md "v1.0 backlog".

### Settings page (SET) — feature D

**Goal:** A dedicated UI for tunable preferences that don't fit elsewhere — stage4 threshold, font size, density, and a duplicate of the theme toggle for discoverability.

- [ ] **SET-01**: A gear icon in `Header.jsx` opens a slide-out panel from the right (380px width on desktop, full-width on mobile) containing the settings UI. No React Router; pure `useState` boolean in `App.jsx`. Source: FEATURES.md §D + ARCHITECTURE.md §4.1.
- [ ] **SET-02**: The settings panel exposes 4 controls: theme toggle (duplicate of Header toggle), font-size S/M/L radio (15/17/19px), density compact/comfortable, and `stage4_threshold` slider (1-10, default 8 from `PROFILES["quality_research"]["stage4_threshold"]`). All persist in localStorage via a new `useSettings()` hook (~30 LOC, mirror of `useTheme`). Source: ARCHITECTURE.md §4.2.
- [ ] **SET-03**: The `stage4_threshold` value travels from frontend localStorage to backend on every `quality_research` request as `SendMessageRequest.stage4_threshold: Optional[int] = Field(None, ge=1, le=10)`. Backend `research_strategy.run` accepts an optional `threshold_override` parameter; falls back to the PROFILES default if absent. Existing v1 requests (without the field) continue to succeed unchanged. Source: ARCHITECTURE.md §4.2 + PITFALLS.md §MIN-2.
- [ ] **SET-04**: The density preference applies via the existing FOUC blocking script in `index.html` (extended to read `localStorage.getItem('density')` and set `data-density` on `<html>` synchronously before first paint), avoiding layout flicker on app load. Font-size applies via React state on first render (acceptable single-render flicker for type-scale). Source: PITFALLS.md §MIN-1.

### Mobile responsive (MOBL) — feature E

**Goal:** Make the app fully usable on tablet and phone (≤768px), beyond v1.0's basic drawer-only support.

- [x] **MOBL-01**: Touch targets across the entire UI (buttons, sidebar items, QualityToggle segments, attachment chips, file pickers) are ≥44×44px on viewports ≤768px, enforced via a `--touch-target-min: 44px` CSS variable consumed in component CSS. Source: ARCHITECTURE.md §5.1 + WCAG 2.5.5.
- [x] **MOBL-02**: The mobile sidebar drawer uses the native `<dialog>` element with `showModal()` for focus trap + ESC-to-close + native modal semantics, plus the `inert` attribute on the main content while open. NO hand-rolled focus trap, NO library dependency. Source: PITFALLS.md §MOD-4.
- [x] **MOBL-03**: `index.html` declares `viewport-fit=cover` in its viewport meta, and CSS uses `env(safe-area-inset-*)` for header / drawer / message input padding to respect notched devices and the iOS home indicator. Source: PITFALLS.md §MOD-3.
- [x] **MOBL-04**: A custom `useTouchSwipe` hook (~30 LOC) opens the sidebar drawer on left-edge swipe-right and closes it on swipe-left, with `touch-action: pan-y` on `.messages-container` to prevent gesture conflicts with vertical scroll. **Scope-cut candidate** if Phase 8 budget is tight — tap-to-open via hamburger button is the floor. Source: ARCHITECTURE.md §5.1 + PITFALLS.md §MOD-5.

### Visual regression testing (VRT) — feature F

**Goal:** Lock the Direction A skin via Playwright snapshot tests, catching unintended visual changes during future development.

- [x] **VRT-01**: A `frontend/visual-tests/` directory contains Playwright snapshot specs for 5 surfaces × 2 themes (= 10 baselines): welcome state, Stage 3 highlight, ErrorBanner, sidebar empty state, theme toggle. Each spec mocks backend SSE via `page.route()` with fixture data. Source: ARCHITECTURE.md §6.3 + FEATURES.md §F.
- [x] **VRT-02**: Snapshot tests apply mandatory anti-flake measures: `await page.evaluate(() => document.fonts.ready)`, `threshold: 0.2`, `maxDiffPixelRatio: 0.02`, `reducedMotion: 'reduce'`, and a CSS override `*, *::before, *::after { animation: none !important; transition: none !important }` injected via `page.addStyleTag`. Source: PITFALLS.md §MOD-8 (5 prevention steps).
- [x] **VRT-03**: Snapshots are baselined exclusively on Linux (Docker `mcr.microsoft.com/playwright:v1.X.X` image); Windows local development uses `--update-snapshots` only as a last resort, and PR review validates updated snapshots in CI-equivalent Linux. Source: PITFALLS.md §MOD-8.

### Automated test suite (TEST) — feature G

**Goal:** Backend pytest + frontend vitest covering ~60% of critical paths, runnable locally. CI is out of scope for v2.0.

- [x] **TEST-01**: `backend/tests/` contains pytest suite with `conftest.py` fixtures (tmp DATA_DIR, dummy `OPENROUTER_API_KEY`, monkeypatched `query_model`) and tests for: storage UUID validation + canonicalisation + path-traversal rejection, `add_assistant_message` round-trip with metadata + stage4 + external_research, council profile routing branches, research_strategy critic parser tolerance to malformed responses, and the v1→v2 migration helper roundtrip. `pytest-asyncio` configured in mode `strict` per `pyproject.toml`. Source: ARCHITECTURE.md §6.1 + PITFALLS.md §MOD-6.
- [ ] **TEST-02**: Frontend co-located `*.test.jsx` files use vitest + `@testing-library/react` v16+ + jsdom env to test: `useTheme` (matchMedia + localStorage round-trip), `useSettings` (same pattern), `MessageHeader` legacy fallback rendering, `QualityToggle` onChange wiring, `Stage2` de-anonymization rendering, and `download.js` pure helpers. Source: ARCHITECTURE.md §6.2 + PITFALLS.md §MOD-7.
- [ ] **TEST-03**: README documents the three test commands (`uv run pytest backend/tests/ -v`, `npm test --prefix frontend`, `npx playwright test --config frontend/visual-tests/playwright.config.ts`) so the user can run them locally. NO CI configuration in v2.0; tagged as backlog for v2.1. Source: ARCHITECTURE.md §6.4.

---

## Future Requirements (deferred)

- **PERS-V2-XX:** Sidecar file storage for critique attachments if conversation file size becomes a bottleneck (>100 critique conversations). Currently inlined per CRIT-4 with 750KB cap.
- **TEST-V2-XX:** GitHub Actions CI matrix (uv + node) running pytest + vitest + playwright on PR to master.
- **CRIT-V2-XX:** OCR of PDF deep research exports (e.g. Claude.ai exports as PDF). v2.0 only accepts `.md`/`.txt`.
- **CRIT-V2-XX:** Auto-detect model attribution from file footer/metadata (e.g. ChatGPT exports include "Generated by ChatGPT o3" footer).
- **MOBL-V2-XX:** Full landscape tablet layout, swipe gestures with `setPointerCapture`, virtual keyboard avoidance for the textarea on iOS.
- **DOMAIN-V2-XX:** Multi-turn within a conversation (revisits the "1 conversation = 1 deliberation" lock; out of scope for v2 unless user demands).

---

## Out of Scope

- **CI/CD pipeline (GitHub Actions)** — v2.0 ships local test commands only. CI is documented as v2.1 backlog (TEST-V2-XX).
- **Full mobile-first redesign** — Direction A is desktop-first; v2.0 adds tablet/phone usability via responsive CSS but does not redesign the IA for mobile.
- **PDF/DOCX upload** — v2.0 critique mode accepts only `.md` and `.txt`. Backend parsing of binary formats is explicit scope-cut.
- **Auto-detect model attribution** — User picks the model per file slot manually. Auto-detection is fragile (export formats change without notice).
- **OpenRouter changelog automation** — v2.0 documents the `:online` deprecation risk in CONCERNS.md but does not implement automated upstream change detection.
- **Real-time animated cost ticker** — Anti-pattern AA2 from FEATURES.md (violates Direction A "calmo"). Static post-deliberation microcopy only.
- **Onboarding tour / LLM-powered settings explainer** — Anti-patterns AA1/AA13. Settings UI must be obvious without explainers.
- **Visual regression on Windows or macOS dev machines** — Linux Docker only baseline. Cross-platform pixel diffs would render every PR red.

---

## Traceability

(Filled by gsd-roadmapper during roadmap creation.)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRIT-01 | Phase 5 | Pending |
| CRIT-02 | Phase 5 | Pending |
| CRIT-03 | Phase 5 | Pending |
| CRIT-04 | Phase 5 | Pending |
| CRIT-05 | Phase 5 | Pending |
| CRIT-06 | Phase 5 | Pending |
| CRIT-07 | Phase 5 | Pending |
| CRIT-08 | Phase 5 | Pending |
| PERS-03 | Phase 5 | Pending |
| NAV-01 | Phase 5 | Pending |
| NAV-02 | Phase 5 | Pending |
| NAV-03 | Phase 5 | Pending |
| NAV-04 | Phase 5 | Pending |
| PERS-01 | Phase 6 | Pending |
| PERS-02 | Phase 6 | Pending |
| COST-01 | Phase 6 | Pending |
| COST-02 | Phase 6 | Pending |
| COST-03 | Phase 6 | Pending |
| COST-04 | Phase 6 | Pending |
| SET-01 | Phase 6 | Pending |
| SET-02 | Phase 6 | Pending |
| SET-03 | Phase 6 | Pending |
| SET-04 | Phase 6 | Pending |
| MOBL-01 | Phase 7 | Complete |
| MOBL-02 | Phase 7 | Complete |
| MOBL-03 | Phase 7 | Complete |
| MOBL-04 | Phase 7 | Complete |
| VRT-01 | Phase 7 | Complete |
| VRT-02 | Phase 7 | Complete |
| VRT-03 | Phase 7 | Complete |
| TEST-01 | Phase 7 | Complete |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |

**Phase distribution:**
- Phase 5 (Critique mode + Schema migration + In-conversation navigation): 13 reqs (CRIT-01..08 + PERS-03 + NAV-01..04)
- Phase 6 (Persistence completeness + Cost analytics + Settings panel): 10 reqs (PERS-01..02 + COST-01..04 + SET-01..04)
- Phase 7 (Mobile responsive + Visual regression + Tests): 10 reqs (MOBL-01..04 + VRT-01..03 + TEST-01..03)

**Coverage:** 33/33 requirements mapped, 0 orphans, 0 duplicates.

**Total v2.0 requirements:** 33 (8 CRIT + 4 NAV + 3 PERS + 4 COST + 4 SET + 4 MOBL + 3 VRT + 3 TEST)
