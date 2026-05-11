---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Council as External Critic + Hardening
status: verifying
last_updated: "2026-05-11T09:15:00.000Z"
last_activity: 2026-05-11 -- Phase 06 plan 09 (detached SSE deliberations — gap closure follow-up) complete
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# State: LLM Council — Personal Edition

**Last updated:** 2026-05-10

## Project Reference

- **Project:** LLM Council — Personal Edition
- **Core value:** The Quality dial works as advertised at every level. A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce.
- **Project doc:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (33 v2 requirements, 100% mapped)
- **Roadmap:** `.planning/ROADMAP.md` (3 coarse phases, mvp mode — "ir a saco")
- **Research:** `.planning/research/{STACK,FEATURES,ARCHITECTURE,PITFALLS,SUMMARY}.md`
- **Codebase maps:** `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, STRUCTURE.md)
- **Config:** `.planning/config.json` (granularity: coarse, mode: yolo, parallelization: true)

## Current Focus

**v2.0 milestone started — roadmap just locked.** v1.0 cerró 2026-05-10 con 21/21 requirements satisfied y audit PASSED. v2.0 introduce la headline feature "External Deep Research Critique" (parallel entry point al fresh-prompt flow), cierra el backlog acumulado (persistence completeness, cost analytics, settings panel, mobile responsive completo), y añade quality lock vía visual regression + suite de tests mínima.

3 fases planeadas (override de las 6 propuestas por SUMMARY.md por user directive "ir a saco" + granularity coarse en config). Phase 5 es la más cargada (13 requirements, mandatory bundling de schema migration con critique por PITFALLS.md §CRIT-3).

## Current Position

Phase: 06 (persistence-completeness-cost-analytics-settings-panel) — EXECUTING
Plan: 9 of 9
Status: Phase complete — 06-UAT BLOCKER closed by 06-08 (frontend guard) + 06-09 (detached backend deliberation). Browser smoke test pending user.
Last activity: 2026-05-11 -- Phase 06 plan 09 (detached SSE deliberations — gap closure follow-up) complete

## Phase Progression

| # | Phase | Milestone | Status |
|---|-------|-----------|--------|
| 1 | Hardening & Conversation Management | v1.0 | All 5 plans complete + verified (closed 2026-05-09) |
| 2 | UX Research & Design Brief | v1.0 | All 6 plans complete + verified (closed 2026-05-10) |
| 3 | Quality Dial & Pragmatic Deep Research | v1.0 | All 5 plans complete (closed 2026-05-10) |
| 4 | Visual Identity Implementation | v1.0 | All 4 plans complete (closed 2026-05-10) |
| 5 | Critique mode + Schema migration + In-conversation navigation | v2.0 | Not started — 13 reqs (CRIT-01..08, PERS-03, NAV-01..04) |
| 6 | Persistence completeness + Cost analytics + Settings panel | v2.0 | Not started — 10 reqs (PERS-01..02, COST-01..04, SET-01..04) |
| 7 | Mobile responsive + Visual regression + Tests | v2.0 | Not started — 10 reqs (MOBL-01..04, VRT-01..03, TEST-01..03) |

## Performance Metrics

### v1.0 (shipped 2026-05-10)

- Phases planned: 4
- Phases complete: 4
- Plans complete: 20
- Requirements coverage: 21/21 (100%)
- ~140 archivos, +33,406 / −606 LOC, 33 feat commits
- Audit: PASSED

### v2.0 (active)

- Phases planned: 3
- Phases complete: 0
- Plans complete: 0
- Requirements coverage: 33/33 mapped (100%)
- Cadencia: 1-2 sesiones/semana

## Accumulated Context

### v2.0 Decisions Logged at Roadmap Time

- **Bundling agresivo en 3 phases (vs 6 propuestas por SUMMARY.md):** granularity coarse en config + user directive explícita "pocas fases, ir a saco". El ordenamiento blast-radius de SUMMARY.md se respeta (schema/critique → observability/polish → quality lock); solo se bundlea más dentro de cada bucket.
- **Phase 5 bundle mandatory** — PERS-03 (schema_version + lazy migration) DEBE landar con CRIT-01..08 en el mismo phase por PITFALLS.md §CRIT-3. Splitting invita `TypeError` cascade en 100% de conversaciones v1.0 al recargar. NAV-01..04 se bundle aquí porque toca ChatInterface/message rendering y es lo que hace legible la output larga del critique mode.
- **Phase 6 bundle** — PERS-01..02 + COST-01..04 + SET-01..04 narrativa coherente "tooling alrededor del motor de deliberación". Los 3 tocan `metadata` shape, `MessageHeader`, y nueva UI sidebar/Header.
- **Phase 7 bundle** — MOBL + VRT + TEST son "freeze the surface" work. Mobile va antes que snapshots para que las baselines incluyan ≤768px.
- **Endpoint dedicado `/critique/stream`** — multipart no convive con Pydantic BaseModel body. SSE protocol downstream idéntico al fresh flow (sin nuevos events salvo cosmético opcional `external_research_attached`).
- **`stage1_collect_responses` parametrizado con `external_context: Dict[model_id, {filename, content}]`** — NO `backend/critique.py` aislado. PROJECT.md lock explícito: "no new strategy module isolated".
- **Files inline en JSON (not sidecar)** con cap 750KB/file Pydantic-enforced. Decisión tentativa de SUMMARY.md; plan-checker debe forzarla en Phase 5 plan-1 antes de execute.
- **`schema_version` desde primer write v2 + `migrate_message_v1_to_v2` lazy server-side en `get_conversation`.** El test que asserta v1 JSON sin metadata hidrata en v2 sin lanzar es el test de mayor valor del milestone (PITFALLS.md §CRIT-3).
- **Persistence completeness pack en `metadata` dict (PERS-01)** — cero cambio de signatura en `add_assistant_message`; mergear `legacy_metadata` + `message_metadata` antes de persistir.
- **Cost analytics: dual-column** OpenRouter fee vs upstream BYOK cost. Display estático post-deliberación (NO ticker animado — anti-pattern AA2 viola Direction A "calmo").
- **Settings: slide-out panel 380px desde la derecha** + gear icon en Header. NO React Router. `useState` boolean en `App.jsx`. Hook `useSettings()` ~30 LOC mirror de `useTheme`.
- **`stage4_threshold` viaja en request body** con Pydantic `ge=1, le=10`; el resto de settings 100% client-side localStorage.
- **`<dialog>` element + `showModal()` para focus trap mobile** — native, NO `focus-trap-react`, NO hand-roll. `inert` attribute en main content.
- **Visual regression Linux-Docker only** — Windows local dev usa `--update-snapshots` y reviewer valida en CI-equivalent Linux. 5 medidas anti-flake mandatory en first plan Phase 7.
- **`pytest-asyncio` mode `strict`** (NO `auto`) + `httpx.AsyncClient(transport=ASGITransport(app=app))` para FastAPI testing.
- **`@testing-library/react` v16+** — wrappea `act()` internamente, soporta React 19.
- **06-08 gap closure (handleStreamEvent stale-event guard)** — Shipped Option 1 (defensive `if (!lastMsg?.loading) return prev;` at every in-flight setter inside `handleStreamEvent`, 10 sites) to close 06-UAT BLOCKER race. Predicate exploits shape asymmetry: persisted assistant messages never carry `loading` (UI-ephemeral state, never written to JSON). Deferred Option 2 (AbortController in `handleSelectConversation`) and Option 3 (backend SSE payload includes `conversation_id`, frontend filters by `currentConversationId`) to v2.1+ when multi-tab / multi-stream UX matters. Classification: race is pre-existing (since SSE streaming landed), NOT a Phase 6 regression; Phase 6 SC remain 5/5.

### Carryover de v1.0 (Decisions still relevant)

- **`:thinking` suffix override**: no existe en OpenRouter; reasoning vía payload `{"reasoning": {"enabled": true}}`. Confirmado en v1.0 Phase 3.
- **Direction A "Research notebook"**: serif body (Source Serif 4) + max-width 65ch. Cockpit y Minimal descartadas con rationale en redesign-proposal.
- **Plan-checker cost-effective**: 3 blockers detectados en Phase 4, fixed antes de execute → ROI 5x. Mantener para v2.0.
- **3-stage waves grupadas por surface**: estado intermedio funcional reduce blast radius vs big-bang refactor.
- **PROFILES dict como single source of truth para Quality dial.** Aliases-as-views.
- **`metadata` opaque dict persisted verbatim** — Phase 6 PERS-01 reusa este contract sin cambiar signatura.
- **`research_strategy.py` aislado de `council.py`** — verified zero `critic_model` / `stage4_threshold` / `CRITIC_RUBRIC` en council. v2.0 NO debe regresarlo.
- **ReasoningDisclosure pattern** (`grid-template-rows: 0fr → 1fr` CSS-only accordion) — reusado en CRIT-08 (file chips expand) + NAV-03 (Stage 1 collapse "Show more").

### Open Decisions (deferred to plan-time)

- Storage shape para critique files (inline confirmado tentativamente, validar en Phase 5 plan-1 con plan-checker).
- OpenRouter `usage.cost` exact shape (5-min spike antes de Phase 6 plan-1, log de un response real).
- MOBL-04 swipe gesture (scope-cut candidate si Phase 7 budget aprieta — tap-to-open via hamburger es el suelo).
- Sidebar mode badge para critique conversations (recomendación tentativa: pill discreta).
- `:online` deprecation watch (MIN-4): startup ping check al boot del servidor; doc en CONCERNS.md.

### Tech Debt (heredado de v1.0, no resuelto en v2.0)

- `stage4_threshold = 8` con critic = chairman = Opus puede tener self-preference bias — re-calibrable via PROFILES tras observar 5-10 queries reales (Phase 6 SET-02 expone slider, calibration sigue siendo decisión del usuario).
- Modal de delete: `time_ago` copy diferida (necesita helper client-side).
- Favicon ampersand single-theme — `prefers-color-scheme` favicon support inconsistent en browsers 2026.
- Pre-existing `react-hooks/immutability` lint warnings en `App.jsx:25-29`.
- IPv4/IPv6 asymmetry (CONCERNS.md MIN-5) — fix incidental en Phase 5 cuando se toque `api.js` para critique-mode endpoints.

### Active Blockers

Ninguno. 06-UAT BLOCKER closed structurally by 06-08; manual smoke test pending user (see 06-08-SUMMARY.md §"Manual smoke test — NOT executed by the executor").

### Active Todos

- [ ] **User-side manual smoke test for 06-08** — 7-step browser DevTools verification (start servers → QR prompt → mid-stream conversation switch → assert no TypeError / no white screen). Required before declaring 06-UAT BLOCKER functionally resolved.
- [ ] `/gsd-verify-phase 6` to formally close Phase 6 (now 8/8 plans complete including 06-08 gap closure).
- [ ] Calibration de `stage4_threshold` (carryover v1.0) — Phase 6 SET-02 expone slider; el usuario decide tras 5-10 QR queries reales.
- [ ] Phase 7 planning (`/gsd-plan-phase 7`): include vitest spec for `handleStreamEvent` stale-event guard as part of TEST-01..03 to lock 06-08 against regression.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in v1.0 Phase 1 (SEC-01).
- **Metadata not persisted** — directly addressed by v2.0 Phase 6 (PERS-01..02). Phase 5 critique mode debe consumir el shape persistido desde día uno.
- **Fragile FINAL RANKING parser** — relevant to NAV-02 (scroll-spy chips) y Stage 2 anonimization en CRIT-05; revisitar si plan-1 Phase 5 lo destabilizes.
- **Stage 2 full-context broadcast cost** — relevant a CRIT-1 token detonation (PITFALLS.md). Phase 5 plan-1 implementa truncate Stage 2 a primeros 600 tokens por critique.
- **No automated tests** — closed por Phase 7 TEST-01..03 (pytest backend + vitest frontend, ~60% critical paths). CI sigue out of scope.
- **Phase 2 anticipatory findings** (UX research v1.0) — H1-04, H5-03, H1-05/H6-05/H8-05, H8-06 ya aplicados en v1.0; v2.0 Phase 5 critique entry-point UI debe respetar el mismo brief Direction A "calmo".

## Session Continuity

**Last session (2026-05-10, evening):** gsd-roadmapper creó ROADMAP.md (3 phases v2.0) + actualizó STATE.md (este archivo) + actualizó traceability en REQUIREMENTS.md. Override de SUMMARY.md (6 phases → 3) por user directive "ir a saco" + granularity coarse. Bundling rationale documentado: PITFALLS.md §CRIT-3 fuerza PERS-03 dentro de Phase 5 con CRIT-01..08; NAV bundleado en Phase 5 por surface overlap (ChatInterface/message rendering); Phase 6 narrativa "tooling alrededor del motor"; Phase 7 "freeze the surface".

**Previous session (2026-05-10, afternoon):** v1.0 milestone completed — Phase 04 / Plan 04-04 cerrado. 21/21 v1 requirements satisfied. Audit PASSED. Tag v1.0. Archive de v1.0 ROADMAP/REQUIREMENTS/MILESTONE-AUDIT en `.planning/milestones/`.

**Next session should start by:**

1. Reading this STATE.md + ROADMAP.md + REQUIREMENTS.md (traceability table) para confirmar el estado del milestone.
2. **Executar `/gsd-plan-phase 5`** para descomponer Phase 5 (Critique mode + Schema migration + In-conversation navigation) en plans atómicos.
3. PITFALLS.md §CRIT-3 + §CRIT-1 + §CRIT-4 + §MOD-1 + §MOD-2 son lectura obligatoria antes de plan-1 — los 5 critical/moderate pitfalls que Phase 5 debe owner.
4. Plan-checker debe forzar la decisión inline-vs-sidecar (CRIT-4) en Phase 5 plan-1 ANTES de execute.

**Files most recently touched by GSD tooling:**

- `.planning/ROADMAP.md` (v2.0 phases 5-7 added; v1.0 collapsed in details)
- `.planning/STATE.md` (this file — v2.0 milestone state initialized)
- `.planning/REQUIREMENTS.md` (traceability table filled with phase mappings 5/6/7)

---
*State initialized: 2026-05-09 (v1.0 milestone start)*
*Last updated: 2026-05-10 after v2.0 ROADMAP.md created (3 phases, coarse granularity, override de SUMMARY.md por user directive "ir a saco"). Phase 5 ready for /gsd-plan-phase.*
*Last updated: 2026-05-10 after v1.0 milestone close (21/21 v1 requirements satisfied; Phase 4 Plan 04-04 cerrado; tag v1.0; archive en milestones/).*

## Operator Next Steps

- Run `/gsd-plan-phase 5` to decompose Phase 5 (Critique mode + Schema migration + In-conversation navigation) into plans.
