# LLM Council — Personal Edition

## What This Is

A personal multi-LLM deliberation app forked from `karpathy/llm-council`, extended into a useful daily tool for asking questions with a cost-aware "council mode": fast for trivial queries, premium for important ones, and a research mode that mixes reasoning models with web search when answers need to be grounded. Single-user, runs locally, BYOK against OpenAI / Anthropic / Google AI Studio via OpenRouter.

## Core Value

**The Quality dial works as advertised at every level.** A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce. Everything else can fail before this does.

## Current State

**v2.0 shipped 2026-05-11.** v1.0 MVP closed 2026-05-10 (21 reqs, audit PASSED); v2.0 added external-critique mode + persistence completeness + cost analytics + settings panel + mobile responsive + visual regression + local test suite (33 reqs, 19 plans, 98 commits since v1.0). Combined codebase: backend (FastAPI + httpx + uv) + frontend (React 19 + Vite 7 + react-markdown + 3 self-hosted variable woff2 fonts) + Playwright VRT (16 baselines) + pytest 46 + vitest 55 = 101 local tests + 16 visual baselines.

The Quality dial works at every level (Fast / Quality / Quality+Research), and now there is a parallel **Critique research** entry point: upload 3 external deep researches (one per Quality-mode council model), the council critiques via the existing 3-stage flow with anonymised peer-review, and the result hydrates on reload as collapsible chips above the assistant message. v1→v2 schema migration is lazy and transparent — every v1.0 conversation loads without `TypeError`. Direction A "Research notebook" preserved end-to-end.

## Previous Milestone (archived): v2.0 Council as External Critic + Hardening

See `milestones/v2.0-ROADMAP.md` and `milestones/v2.0-REQUIREMENTS.md` for full record (3 phases, 19 plans, 33 reqs).

<details>
<summary>Original v2.0 goal + target features (for historical reference)</summary>

**Goal:** Convert the council from "fresh-deliberation only" into a tool that ALSO accepts externally-generated deep research as input and uses the council to critique it — closing simultaneously the v1.0 backlog (persistence completeness, observability, mobile, minimum testing).

**Target features (all shipped):**

A. **External Deep Research Critique (NEW core feature, PARALLEL entry point)** — shipped in Phase 5 (Plans 02 backend pipeline + 03 frontend entry + 04 reload hydration). 3-file upload, `multipart/form-data` to `/critique/stream`, council sees all 3 researches with authorship labels, Stage 2 anonymises model names before peer-review, ExternalResearchPanel hydrates collapsible chips on reload. Fresh-prompt flow preserved bit-for-bit.

B. **Persistence completeness** — shipped in Phase 6 Plan 02. `label_to_model` + `aggregate_rankings` pack into `metadata` dict; no `add_assistant_message` signature change.

C. **Cost analytics & observability** — shipped in Phase 6 Plans 03 + 04. `usage.cost` + `upstream_inference_cost` captured per `query_model` call, aggregated into `metadata.cost = {stage1..stage4, total, upstream_total, currency}`, surfaced in MessageHeader (static, no animated ticker) + sidebar footer (cap progress bar at ≥80%). Cost-footer placement flagged for v2.1 polish.

D. **Settings/Preferences page** — shipped in Phase 6 Plans 05-07. Gear icon → 380px slide-out panel; 4 controls (theme dup, font-size, density, stage4_threshold slider 1-10); `useSettings()` hook (~30 LOC mirror of `useTheme`); density via FOUC blocker, font-size via React state.

E. **Mobile responsive ≤768px** — shipped in Phase 7 Plans 01 + 02. `--touch-target-min: 44px` token, native `<dialog>` + `showModal()` drawer (same pattern as SettingsPanel), `useTouchSwipe` (34 LOC, edge-zone + vertical-dominance gates), `viewport-fit=cover` + `env(safe-area-inset-*)`. MOBL-04 swipe shipped (resolved "scope-cut candidate" flag as NO CUT).

F. **Visual regression** — shipped in Phase 7 Plan 03. 8 surfaces × 2 themes = 16 baselines (override of ROADMAP 5×2=10 default); 5 anti-flake measures structurally enforced via `_fixtures.ts`; native Windows execution (D-03 revised mid-Phase-7 — Docker tagged as v2.1+ contingency).

G. **Automated test suite (minimum)** — shipped in Phase 7 Plans 04 + 05. 46 pytest + 55 vitest = 101 tests local. `pytest-asyncio` mode `strict`; double-`DATA_DIR` monkeypatch in conftest; RTL v16 + jsdom 29 + `matchMedia` polyfill. README `## Testing` section documents 3 commands. NO CI (explicit D-04b lock).

**Gap closures during execution:**
- 06-08: frontend `handleStreamEvent` stale-event guard (defensive `if (!lastMsg?.loading) return prev;` at 10 setter sites). Closes 06-UAT BLOCKER race.
- 06-09: backend detached SSE deliberations via `asyncio.create_task` + queue. Deliberation survives client disconnect; persistence always reached.

**Mid-flight overrides:**
- VRT scope expansion (D-02): 10 → 16 baselines (added Settings + Stage 2 + Critique).
- VRT execution path (D-03 revised): Docker-only → native Windows. Cross-OS guarantee theoretical for single-user no-CI posture.

</details>

## Current Milestone: v2.1 UX Polish + IA Gaps

**Goal:** Cerrar la deuda UX/IA detectada en el manual smoke de v2.0 — regresión P0 del sticky header, redundancias y pérdida de contexto al scrollear, jerarquía del sidebar, reubicación del cost footer, y a11y del scroll-to-top. Eliminar la fricción residual antes de añadir cualquier feature nueva.

**Target features:**

- **P0 Sticky header fix** — formalizar el cierre de NAV-V2.1-01 (solución parcial ya aplicada en quick-task 260511-l5w: drop `.messages-container` `padding-top` + box-shadow en `.stage-nav-strip`). Regenerar baselines VRT.
- **P1 Information architecture** — drop H2 redundante con tabs; surface conversation/model context en sticky bar (breadcrumb); sidebar item hierarchy (3px left border activo + date grouping "Hoy" / "Esta semana" + demote `N messages` a icon + smaller font).
- **P2 Cost footer relocation** — revisitar formalmente el lock D-02 de Phase 6 (sidebar dual-column). Mover a popover desde icono o sub-sección en Settings panel.
- **P2 Scroll-to-top a11y** — `aria-label="Volver al inicio"`, contraste raised (Direction A calmo ≠ invisible), umbral >600px scroll + fade-in.
- **P2 Tab active-state visual connection** — 2px bottom border continuo conectando tab activo con panel ("tab connected" pattern).
- **Carry-over v2.0** — `App.test.jsx` para `handleStreamEvent` stale-event guard regression (deferido formalmente desde 07-05); VRT baseline regeneration (24 PNGs × 4 viewports diff-fail esperado tras sticky fix).

**Out of scope for v2.1 (defer):**

- **P3 scroll-spy en sticky** → v2.2 (enhancement, no fix).
- **CI pipeline GitHub Actions** → mantener lock D-04b. Decisión consciente de no automatizar tests en CI dado posture single-user.
- **PDF/DOCX critique upload + auto-detect model attribution** → v2.2 si surge necesidad.
- **Option 2 (AbortController) + Option 3 (per-event conversation_id SSE scoping)** → downgraded a UX polish post-06-09; no entran salvo regresión observada.

**Source backlog:** `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md` (capturado 2026-05-11 durante manual smoke de v2.0).

## Requirements

### Validated

<!-- Inherited from the fork-mejorado baseline (commits b0aca40 + 381fa34). Locked. -->

- ✓ **Council 3-stage deliberation** with anonymized peer ranking — `backend/council.py` (`stage1_collect_responses`, `stage2_collect_rankings`, `stage3_synthesize_final`)
- ✓ **BYOK routing** via `provider.only` for OpenAI / Anthropic / Google AI Studio — `backend/openrouter.py:55-59`, `backend/config.py:get_provider_for_model`
- ✓ **SSE streaming per-stage** to the frontend — `backend/main.py:126-194`
- ✓ **Markdown rendering** with GFM (tables, autolinks), syntax highlighting, link styling — `frontend/src/components/Markdown.jsx`, `frontend/src/index.css`
- ✓ **File attachments** (text-only, 500KB/file and 2MB total caps, multi-file) — `frontend/src/components/ChatInterface.jsx`, `frontend/src/utils/download.js:readFileAsText`
- ✓ **Download as markdown** — final answer or full deliberation (Stage 1 + Stage 2 + aggregate rankings + Stage 3 + Stage 4) — `frontend/src/utils/download.js`
- ✓ **Backend bound to 127.0.0.1** (Vuln 1 fix) — `backend/main.py:199`

<!-- Validated during v1.0 milestone (2026-05-10). -->

- ✓ **Vuln 2 closed: UUID validation at storage boundary** — v1.0 (SEC-01, Phase 01)
- ✓ **Conversation management UX (delete / rename / search)** — v1.0 (CONV-01..03, Phase 01)
- ✓ **UX research artifacts produced** — cognitive walkthrough + Nielsen audit + redesign proposal + 23 wireframes + 3 HTML sketches; Direction A "Research notebook" locked. v1.0 (UXR-01..04, Phase 02)
- ✓ **Quality selector per-query (3 profiles)** with PROFILES dict, profile-aware routing, 3-state UI toggle, profile + models persisted in saved messages — v1.0 (QUAL-01..04, Phase 03)
- ✓ **Pragmatic deep research** — `research_strategy.py` aislado, 4 reasoning models con `:online`, critic + conditional Stage 4 refinement, `reasoning_details` collapsable disclosure. Note: `:thinking` suffix does NOT exist on OpenRouter — reasoning enabled via payload param `{"reasoning": {"enabled": true}}`. v1.0 (RSCH-01..05, Phase 03)
- ✓ **Visual redesign applied** — Direction A palette + Source Serif 4 + Inter + JetBrains Mono self-hosted, branded shell with ampersand mark + theme toggle, polished microinteractions (CSS-only, prefers-reduced-motion preserves focus rings), 23/23 wireframes implemented. v1.0 (VIS-01..04, Phase 04)

<!-- All v2.0 active hypotheses validated and shipped 2026-05-11 — moved to Validated below. -->

- ✓ **External Deep Research Critique** — v2.0 Phase 5 (CRIT-01..08, ExternalResearchPanel + `/critique/stream` + `stage1_collect_responses` with `external_context` parameter; no isolated module).
- ✓ **Persistence completeness** — v2.0 Phase 6 (PERS-01..02; `label_to_model` + `aggregate_rankings` in opaque `metadata` dict; v1→v2 schema migration via lazy `_migrate_conversation_if_needed` in Phase 5).
- ✓ **Cost analytics & observability** — v2.0 Phase 6 (COST-01..04; per-stage capture into `metadata.cost`, MessageHeader microcopy, `/api/stats/cost` endpoint, sidebar footer with cap progress bar).
- ✓ **Settings/Preferences page** — v2.0 Phase 6 (SET-01..04; native `<dialog>` panel, `useSettings()` hook, `stage4_threshold` slider end-to-end through Pydantic).
- ✓ **Mobile responsive completo (≤768px)** — v2.0 Phase 7 (MOBL-01..04; `--touch-target-min`, native `<dialog>` drawer, `useTouchSwipe` 34 LOC, viewport-fit + safe-area-inset).
- ✓ **Visual regression testing** — v2.0 Phase 7 (VRT-01..03; 16 baselines, 5 structural anti-flake measures, native Windows Playwright per revised D-03).
- ✓ **Automated test suite (minimum)** — v2.0 Phase 7 (TEST-01..03; 46 pytest + 55 vitest = 101 tests, no CI per D-04b).

### Active

<!-- v2.1 milestone scope. REQ-IDs assigned in REQUIREMENTS.md; traceability mapped by gsd-roadmapper. -->

- ☐ **NAV-V2.1-01**: Sticky stage header sin ghost-strip (regresión P0). Solución parcial aplicada en quick-task 260511-l5w; v2.1 cierra formalmente el requirement + regenera baselines VRT.
- ☐ **IA-V2.1-01**: Drop H2 "Stage X: ..." redundante con tabs activas; tabs cargan el semantic.
- ☐ **IA-V2.1-02**: Surface prompt/conversation/model context en sticky bar como breadcrumb persistente al scrollear.
- ☐ **IA-V2.1-03**: Sidebar item hierarchy — active-item 3px left border, date grouping ("Hoy" / "Esta semana"), demote `N messages` a icon + smaller font.
- ☐ **COST-V2.1-01**: Cost footer relocation — popover desde icono "spending" o sub-sección en Settings panel. Revisitar formalmente lock D-02 Phase 6.
- ☐ **A11Y-V2.1-01**: Scroll-to-top button — `aria-label`, contraste raised, threshold >600px + fade-in.
- ☐ **NAV-V2.1-02**: Tab active-state 2px bottom border continuo conectando con panel.
- ☐ **TEST-V2.1-01**: App.test.jsx para `handleStreamEvent` stale-event guard regression (carry-over de 07-05).
- ☐ **VRT-V2.1-01**: Regenerar baselines VRT (24 PNGs × 4 viewports) tras sticky fix + IA changes.

### Out of Scope

<!-- Explicit boundaries. Reasons recorded so they don't quietly get re-added. -->

- **Multi-user / authentication / sharing** — single-user personal app; auth would dominate complexity for zero benefit at this scale.
- **Multi-turn chat inside a conversation** — original design is "1 conversation = 1 deliberation". Keeping it preserves the council mental model and avoids re-architecting state.
- **Database backend (SQLite/Postgres) instead of JSON files** — `data/conversations/*.json` is sufficient for personal use; introducing a DB adds migration burden without unlocking anything material in this milestone.
- **Automated test suite as a goal of this milestone** — accepting the deuda; tests can be added opportunistically when a phase needs them, but they are not a requirement to ship.
- **Fully-agentic deep-research loop** (à la ChatGPT Deep Research with iterative search → read → reason → search → synthesize across 5-30 minutes) — explicitly deferred. Active scope only commits to a pragmatic approximation. Code structure leaves the door open.
- **Persisting `label_to_model` and `aggregate_rankings` metadata to disk** — known debt in `CONCERNS.md`, but not a Quality-dial requirement. Backlog, not Active.
- **Publishing / packaging** (Docker image, public deploy, install script) — personal local use only.

## Context

**Heritage.** This is a fork of [karpathy/llm-council](https://github.com/karpathy/llm-council), described by its author as "99% vibe coded as a fun Saturday hack" and explicitly unmaintained. Karpathy provided a usable skeleton; everything beyond the original Stage 1/2/3 plumbing is the fork's responsibility.

**Already done in this fork (pre-milestone, see `Validated`).** Two commits on top of upstream: `b0aca40` (`.env.example`, host bind to localhost) and `381fa34` (file attachment support, full markdown rendering with GFM and syntax highlighting, download conversation/answer, BYOK routing via `provider.only`, model config update for the BYOK-restricted account).

**OpenRouter posture.** The user's OpenRouter account has a deliberate provider allowlist (`openai`, `anthropic`, `google-ai-studio` only — no Meta/Mistral/DeepSeek/xAI) plus a $100/month spend cap and BYOK keys configured for those three providers. Quality+Research will likely concentrate spend on Anthropic Opus reasoning + Google Gemini Pro thinking + OpenAI o4-mini, all of which are available through the BYOK pipe.

**Codebase state.** Mapped in `.planning/codebase/` (commit `d98f156`). Highlights: zero automated tests, single-shot conversation design (input form only renders when `messages.length === 0`), reasoning_details captured server-side but not displayed in frontend, metadata not persisted to disk, Stage 2 cost dominates due to context concatenation. Vuln 2 (path traversal in `storage.get_conversation_path`) is open.

**User profile.** Practice Lead at Basetis specialized in BI/data for healthcare/pharma. Stack: Snowflake SQL, Power Query, Power BI, Excel LET/FILTER, Python. This app is for personal use, not Basetis client work — no PII or pharma data will go through it.

## Constraints

- **Tech stack**: FastAPI + httpx + uv on backend, React 19 + Vite 7 + react-markdown on frontend — *fixed; no migration to other frameworks in this milestone*.
- **Cadence**: 1-2 working sessions per week — *standard granularity (5-8 medium phases) so each session has a clear deliverable*.
- **Budget**: $100/month OpenRouter cap, BYOK so the cap covers BYOK fees only (~5% of provider spend) — *Quality+Research can run multi-dollar queries; selector design must surface cost so the user picks consciously*.
- **Privacy**: BYOK on the three big providers, no free-tier models, no third-party providers (Together, Fireworks, Venice, etc.) — *imposed by the OpenRouter account allowlist; respected by the existing `PUBLISHER_TO_PROVIDER` map and must continue to be respected when adding research models*.
- **Single-user, local-only**: backend bound to `127.0.0.1`, no auth, no rate limiting — *acceptable because the only attacker model is "another process on the same machine", and Vuln 2 fix closes that surface*.
- **UX-first**: visible-UI work cannot start until the UX research phase has produced artifacts — *avoids the "rebrand by guessing" failure mode the user explicitly wants to avoid*.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bind backend to `127.0.0.1` instead of `0.0.0.0` | Closes Vuln 1: prevents any LAN device from invoking the API and draining OpenRouter credits. CORS does not protect against non-browser clients. | ✓ Good (deployed in `b0aca40`) |
| BYOK with `provider.only=[publisher]` per call | OpenRouter account is on free tier with a strict provider allowlist; BYOK lets per-provider billing flow to the user's own OpenAI/Anthropic/Google accounts and avoids OpenRouter's pool entirely (5% fee only). | — Pending (validated end-to-end in current session, awaiting milestone production use) |
| Quality dial as 3 profiles (`Fast` / `Quality` / `Quality+Research`), per-query toggle | Per-query gives maximum flexibility vs global setting — user routinely alternates between trivial and important queries. Three discrete profiles keep cognitive load low vs free-form model picker. | — Pending |
| Pragmatic deep research, not agentic | Full agentic deep research is 500-800 LoC of new code, multi-minute waits, costs $1-5/query. Pragmatic version (reasoning models + web search + optional Stage 4) covers 80% of the value at 20% of the complexity. | — Pending |
| UX research as a dedicated early phase | "Frontier UX/UI skills" applied research-first, not feature-by-feature, prevents fragmented design and gives the visual rework a clear brief. | — Pending |
| Single-shot conversation design preserved | The "1 conversation = 1 deliberation" mental model is what makes the council format make sense; turning it into ChatGPT-style multi-turn would dilute the differentiator. | — Pending (validated implicitly by user keeping it in Out of Scope) |
| Active scope deferred from previous fork session: copy-final-answer button, regenerate-with-other-profile button, persist label_to_model and aggregate_rankings metadata | Not in user's stated v1 priorities; cheap to add later; not blockers for the Quality dial core value. | — Pending (still in backlog post-v1.0; persist label_to_model = PERS-V2-01 candidate for v1.1) |
| 3-stage waves grupadas por superficie en Phase 4 (foundations → shell → deliberation → conversations) | Estado intermedio funcionalmente válido (legacy hex coexiste con tokens) reduce blast radius vs big-bang refactor; cada wave tiene un commit narrative coherente. | ✓ Good — Phase 4 closed at 100% sin breakage intermedio (verified via per-plan smoke tests) |
| Direction A "Research notebook" sobre Cockpit / Minimal | Stage 2 + Stage 3 son lectura larga editorial; serif body (Source Serif 4) + max-width 65ch respeta el tono. Cockpit (densidad alta) y Minimal (esconde aggregate ranking) descartadas con rationale en redesign-proposal §"Recommendation & decision". | ✓ Good — phase 4 implementation confirmed la dirección sin re-decisiones |
| `:thinking` suffix override (RESEARCH > PROJECT) | Active scope mencionaba `:thinking` suffix pero RESEARCH.md confirmó que no existe en OpenRouter; reasoning se enables via payload `{"reasoning": {"enabled": true}}`, no via suffix. | ✓ Good — patrón "research wins over PROJECT.md" cuando hay verificación factual posterior |
| Plan-checker iteration en Phase 4 (3 blockers detectados, fixed antes de execute) | Detectó favicon path drift (.png vs .svg → 404 silencioso permanente) y forzó al planner a leer Sidebar.jsx para fijar `.conversation-item.active` en vez de delegar al executor. | ✓ Good — el cost del plan-checker se ganó 5x en este caso |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-12 after v2.1 milestone start (UX Polish + IA Gaps). 9 active requirements pending roadmap mapping.*
