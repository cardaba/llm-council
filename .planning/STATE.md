---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: UX Polish + IA Gaps
status: Ready for `/gsd-execute-phase 8` (3 plans committed)
last_updated: "2026-05-12T05:40:00.000Z"
last_activity: 2026-05-12 — Phase 8 planned (3 plans, Wave 1 parallel, plan-checker PASSED)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 3
  completed_plans: 0
---

# State: LLM Council — Personal Edition

**Last updated:** 2026-05-12

## Project Reference

- **Project:** LLM Council — Personal Edition
- **Core value:** The Quality dial works as advertised at every level. A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce.
- **Project doc:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (v2.1 — 11 reqs, all mapped)
- **Roadmap:** `.planning/ROADMAP.md` (v2.1 Phases 8-10, continues phase numbering from v2.0 Phase 7)
- **Research:** `.planning/research/{STACK,FEATURES,ARCHITECTURE,PITFALLS,SUMMARY}.md` (v2.0 research, still referenced)
- **Backlog:** `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md` (source of v2.1 scope)
- **Codebase maps:** `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, STRUCTURE.md)
- **Config:** `.planning/config.json`

## Current Focus

**v2.1 milestone — roadmap created. 3 phases, 11 reqs mapped, ready for `/gsd-plan-phase 8`.** v2.0 shipped 2026-05-11 (3 phases, 19 plans, 33 reqs, 98 commits, 101 local tests + 16 VRT baselines). v2.1 ataca la deuda UX/IA del manual smoke en 3 phases (coarse granularity, "ir a saco"): Phase 8 bundle Sticky+IA+A11Y (8 reqs), Phase 9 cost footer relocation con ADR D-02 revisit (1 req decision-gated), Phase 10 quality lock — App.test.jsx + VRT baseline regen (2 reqs, ordenado al final por diseño).

Carry-overs explícitos: TEST-V2.1-01 viene de 07-05 deferred; VRT-V2.1-01 cierra el flag de 260511-l5w (partial sticky fix shipped, baseline regen deferida).

P3 scroll-spy, CI pipeline (mantener D-04b lock), y PDF/DOCX critique upload explícitamente fuera de scope.

## Current Position

Phase: Phase 8 (in progress — Sticky/IA polish bundle, planned)
Plan: 3 plans created (08-01, 08-02, 08-03 — all Wave 1, parallel)
Status: Ready for `/gsd-execute-phase 8` (plans committed `a042c45`, plan-checker VERIFICATION PASSED)
Last activity: 2026-05-12 — 3 PLAN.md files created, plan-checker passed (8/8 reqs, 5/5 success criteria mapped)

## Phase Progression

| # | Phase | Milestone | Status |
|---|-------|-----------|--------|
| 1 | Hardening & Conversation Management | v1.0 | All 5 plans complete + verified (closed 2026-05-09) |
| 2 | UX Research & Design Brief | v1.0 | All 6 plans complete + verified (closed 2026-05-10) |
| 3 | Quality Dial & Pragmatic Deep Research | v1.0 | All 5 plans complete (closed 2026-05-10) |
| 4 | Visual Identity Implementation | v1.0 | All 4 plans complete (closed 2026-05-10) |
| 5 | Critique mode + Schema migration + In-conversation navigation | v2.0 | All 5 plans complete — 13 reqs satisfied (CRIT-01..08 critique pipeline + ExternalResearchPanel, PERS-03 schema_version migration, NAV-01..04 sticky headers + nav strip + show-more + back-to-top) |
| 6 | Persistence completeness + Cost analytics + Settings panel | v2.0 | All 9 plans complete — 10 reqs satisfied + 2 gap closures (06-08 frontend stale-event guard, 06-09 detached SSE deliberations) |
| 7 | Mobile responsive + Visual regression + Tests | v2.0 | 5/5 plans complete — all 10 reqs satisfied (MOBL-01..04, VRT-01..03, TEST-01..03); pytest 46 + vitest 55 = 101 tests green; Playwright VRT 24 baselines × 4 viewports |
| 8 | Sticky/IA polish bundle | v2.1 | Not started — 8 reqs (NAV-V2.1-01..03 + IA-V2.1-01..04 + A11Y-V2.1-01); NAV-V2.1-01 is a close/verify of quick-task 260511-l5w partial fix |
| 9 | Cost footer relocation + ADR D-02 revisit | v2.1 | Not started — 1 req (COST-V2.1-01); decision-gated, ADR required before implementation |
| 10 | Quality lock — App.test.jsx + VRT baseline regen | v2.1 | Not started — 2 reqs (TEST-V2.1-01 + VRT-V2.1-01); ordered last by design (baseline regen MUST come after all pixel-changing work) |

## Performance Metrics

### v1.0 (shipped 2026-05-10)

- Phases planned: 4
- Phases complete: 4
- Plans complete: 20
- Requirements coverage: 21/21 (100%)
- ~140 archivos, +33,406 / −606 LOC, 33 feat commits
- Audit: PASSED

### v2.0 (shipped 2026-05-11)

- Phases planned: 3 (Phases 5-7)
- Phases complete: 3
- Plans complete: 19 (14 original + 2 gap closures Phase 6 + 5 Phase 7) — 21 wave-tracked, 19 unique PLAN.md
- Requirements coverage: 33/33 (100%)
- ~98 commits, 160 files, +8K LOC net, 101 local tests + 16 VRT baselines
- Cadencia: ~36h wall-clock end-to-end ("ir a saco")

### v2.1 (active)

- Phases planned: 3 (Phases 8-10)
- Phases complete: 0
- Plans complete: 0/0 (plans not yet decomposed — awaiting `/gsd-plan-phase 8`)
- Requirements coverage: 11/11 mapped (100%)
- Cadencia: 1-2 sesiones/semana per constraint

## Accumulated Context

### v2.1 Decisions Logged at Roadmap Time

- **3-phase split (Phase 8/9/10), coarse granularity** — consistent with v2.0 "ir a saco" posture. 11 reqs in 3 phases (avg ~3.7 reqs/phase) follows the same heuristic as v2.0 (33 reqs in 3 phases). Larger phases would over-bundle the ADR-gated cost relocation; smaller phases would fragment the sticky/IA work that shares surface.
- **Phase 8 bundles Sticky + IA + A11Y (8 reqs)** — all touch the same surfaces (`StageNavigationStrip`, `Sidebar`, `ChatInterface`, `BackToTopButton`) and the same Direction A constraints. Splitting them invites multiple VRT regen rounds and parallel CSS conflict risk. The partial fix from quick-task `260511-l5w` is the close/verify floor for NAV-V2.1-01 — plan-time MUST NOT re-implement the `.messages-container` padding-top drop or the `.stage-nav-strip` box-shadow.
- **Phase 9 isolates COST-V2.1-01 (1 req)** — small in code but heavyweight in decision: it explicitly revisits the v2.0 Phase 6 D-02 dual-column sidebar lock. The phase is **decision-gated**: an ADR (or `DISCUSS-DECISIONS.md` block) MUST exist in `.planning/phases/phase-9/` before any code change. `/gsd-discuss-phase 9` is the natural producer. Acceptable relocation targets are bounded: popover from spending icon in Header, sub-section inside Settings panel, or dedicated route.
- **Phase 10 is intentionally last (TEST + VRT regen)** — VRT-V2.1-01 ordering is non-negotiable. Regenerating baselines BEFORE the UI changes ship would lock the wrong pixels (bugged sticky header, redundant H2, disconnected cost footer). TEST-V2.1-01 lands in the same phase because it shares the "no functional code changes" posture — it's quality-lock work, not feature work. Strategy for App.test.jsx (pure-reducer extraction vs full `<App />` mount with mocked SSE) deferred to `/gsd-discuss-phase 10`.
- **Phase 8 → 9 → 10 dependency ordering**: Phase 9 depends on Phase 8 because IA-V2.1-02..04 settles the sidebar's own hierarchy before deciding what to remove from the sidebar footer. Phase 10 depends on Phase 8 + 9 because both phases change pixels in baselined surfaces.
- **`metadata.cost` shape is invariant** — COST-V2.1-01 is a pure presentation move. No `metadata.cost` schema change, no `/api/stats/cost` endpoint signature change. If plan-time discovers schema work is needed, surface it as a separate decision; do not silently widen the requirement.

### Carryover de v2.0 (Decisions still relevant)

- **`metadata` opaque-dict contract** — preserved through v2.1. COST-V2.1-01 relocation does NOT touch the persisted shape, only the UI surface that reads it.
- **No CI in this milestone (D-04b lock preserved)** — three local test commands (pytest / vitest / playwright) documented in README. VRT-V2.1-01 regenerates baselines locally; user runs `npx playwright test --update-snapshots` then commits.
- **Direction A "calmo" tone is binding** — A11Y-V2.1-01 raises scroll-to-top contrast; "calmo" ≠ "invisible". NAV-V2.1-02 tab-to-panel border preserves the calm contrast level. No new design tokens introduced.
- **Plan-checker cost-effective** — keep enabled for v2.1. Phase 9 is the highest-value plan-checker target (ADR-gated decision; cheap to catch a missing ADR cite at plan-check time vs at execute time).
- **Direction A Research notebook** — locked since v1.0 Phase 2; v2.1 polish stays inside existing palette + typography + spacing tokens.

### Carryover de v1.0 (Decisions still relevant)

- **`:thinking` suffix override**: no existe en OpenRouter; reasoning vía payload `{"reasoning": {"enabled": true}}`. Confirmado en v1.0 Phase 3.
- **PROFILES dict como single source of truth para Quality dial.** Aliases-as-views.
- **`research_strategy.py` aislado de `council.py`** — verified zero `critic_model` / `stage4_threshold` / `CRITIC_RUBRIC` en council. v2.1 NO debe regresarlo.

### Open Decisions (deferred to plan-time / discuss-phase)

- **Phase 9: relocation target for cost block** — popover vs Settings sub-section vs dedicated route. Decided in `/gsd-discuss-phase 9` ADR.
- **Phase 10: App.test.jsx strategy** — pure-reducer extraction (refactor `handleStreamEvent` out of App.jsx into a tested module) vs full `<App />` mount with mocked SSE. Decided in `/gsd-discuss-phase 10`.
- ~~**Phase 8: breadcrumb content rule for IA-V2.1-01**~~ — **RESOLVED 2026-05-12 in 08-CONTEXT.md D-01**: conversation title only, constante durante todo el scroll.

### Tech Debt (heredado, no resuelto en v2.1 scope)

- `stage4_threshold = 8` con critic = chairman = Opus — calibration sigue user-side (slider en place desde v2.0 SET-03).
- Modal de delete: `time_ago` copy diferida.
- Favicon ampersand single-theme — `prefers-color-scheme` favicon support inconsistent.
- Pre-existing lint warnings en `App.jsx:25-29` y `Stage1.jsx:33`.
- IPv4/IPv6 asymmetry (CONCERNS.md MIN-5) — incidental fix candidate cuando se toque `api.js`.

### Active Blockers

Ninguno. v2.0 cerrado limpio. v2.1 listo para arrancar Phase 8.

### Active Todos

- [ ] **Run `/gsd-execute-phase 8`** to execute Phase 8 plans (3 plans, all Wave 1 parallel — no file overlap). Plan-checker PASSED with one minor NIT (closed inline). User-side manual smoke checkpoint is the final task of each plan; executor will pause for human-verify before committing the closing checkpoint.
- [ ] User-side manual smoke test for 06-08 (carry-over from v2.0) — 7-step browser DevTools verification. Recommended before Phase 8 work begins so the baseline state is known-good.
- [ ] Calibration de `stage4_threshold` (carryover v1.0/v2.0) — slider en place; el usuario decide tras 5-10 QR queries reales.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in v1.0 Phase 1 (SEC-01). Still closed.
- **Metadata not persisted** — closed in v2.0 Phase 6 (PERS-01..02). v2.1 must preserve the contract.
- **No automated tests** — closed in v2.0 Phase 7. v2.1 TEST-V2.1-01 adds App.test.jsx; everything else stays as v2.0 left it.
- **Phase 2 UX research findings** — H1-04, H5-03, H1-05/H6-05/H8-05, H8-06 ya aplicados en v1.0. v2.1 polish work must respect the same Direction A "calmo" brief.

## Session Continuity

**Current session (2026-05-12, Phase 8 planned):** `/gsd-plan-phase 8` completado. Skip research + skip UI-SPEC gates (CONTEXT.md ya cubría ambos espacios). 3 plans creados — 08-01 (sticky breadcrumb + H3 drop + chip IDs, 4 tasks), 08-02 (sidebar date groups + meta demote, 3 tasks), 08-03 (scroll-to-top threshold + contrast, 3 tasks). Todos Wave 1, parallel-safe (zero file overlap entre los 3). Plan-checker VERIFICATION PASSED con 1 NIT (orphan `</automated>` tag en 08-01 Task 3, fixed inline antes del commit). 8/8 reqs cubiertos, 5/5 success criteria del ROADMAP mapeados. Commit `a042c45`.

**Previous session (2026-05-12, Phase 8 context):** `/gsd-discuss-phase 8` completado. 4 áreas grises discutidas (breadcrumb scope+host, sidebar date grouping field+copy, demote N messages, tab-to-panel border vs strip shadow). 12 decisiones D-01..D-12 capturadas en `.planning/phases/08-sticky-ia-polish-bundle/08-CONTEXT.md`. Dos **overrides conscientes de copy**: D-05 cambia headers de fecha de español ("Hoy/Esta semana/…") a inglés ("Today/This week/…"); D-10 mantiene `aria-label="Back to top"` (inglés, override de REQUIREMENTS.md:39 literal). Ambos por consistencia con el sidebar EN-only. NAV-V2.1-01 confirmado como close/verify (no re-implementar `260511-l5w`). NAV-V2.1-02 y IA-V2.1-02 confirmados como structurally-shipped + verify. Commit `60e3335`.

**Previous session (2026-05-12, roadmap):** gsd-roadmapper creó `.planning/ROADMAP.md` para v2.1 (3 phases, continúa numeración desde v2.0 Phase 7 → Phases 8/9/10). Actualizó `REQUIREMENTS.md` traceability (11/11 reqs mapped). Granularity `coarse` aplicada consistentemente con v2.0 ("ir a saco"). Decisión clave: Phase 10 (VRT regen) DEBE ser último por diseño — regen anterior congelaría baselines incorrectas.

**Previous session (2026-05-11):** v2.0 milestone shipped. 33/33 reqs satisfied across Phases 5-7. Manual smoke surfaced v2.1 backlog (`v2.1-BACKLOG-FROM-MANUAL-SMOKE.md`). Quick-task `260511-l5w` shipped partial sticky-header fix; baseline regen deferida a v2.1.

**Previous session (2026-05-10):** v1.0 milestone closed (21/21 reqs, Audit PASSED, tag v1.0).

**Next session should start by:**

1. Reading `.planning/phases/08-sticky-ia-polish-bundle/08-CONTEXT.md` (12 decisions) and the 3 PLAN.md files (08-01, 08-02, 08-03) — primary inputs for the executor.
2. Running `/gsd-execute-phase 8` to execute all 3 plans in Wave 1 (parallel-safe).
3. The executor will pause at the final `checkpoint:human-verify` task of each plan — expect 3 manual smoke checkpoints (sticky+breadcrumb, sidebar IA, scroll-to-top).
4. After execution: `/gsd-verify-phase 8` (or `/gsd-plan-phase 9` to continue v2.1).
5. **DO NOT** regenerate VRT baselines during Phase 8 execution — Phase 10 owns that.

**Files most recently touched by GSD tooling:**

- `.planning/phases/08-sticky-ia-polish-bundle/08-01-PLAN.md` (created — 4 tasks, sticky+breadcrumb+H3 drop)
- `.planning/phases/08-sticky-ia-polish-bundle/08-02-PLAN.md` (created — 3 tasks, sidebar IA)
- `.planning/phases/08-sticky-ia-polish-bundle/08-03-PLAN.md` (created — 3 tasks, scroll-to-top a11y)
- `.planning/ROADMAP.md` (Phase 8 Plans section updated from "TBD" to the 3 plan filenames)
- `.planning/phases/08-sticky-ia-polish-bundle/08-CONTEXT.md` (created earlier — 12 decisions)
- `.planning/phases/08-sticky-ia-polish-bundle/08-DISCUSSION-LOG.md` (created earlier — audit trail)
- `.planning/STATE.md` (this file — Current Position bumped to "planned")

---
*State initialized: 2026-05-09 (v1.0 milestone start)*
*Last updated: 2026-05-12 after v2.1 ROADMAP.md created (3 phases, coarse granularity, continues phase numbering from v2.0 Phase 7). 11/11 reqs mapped. Phase 8 ready for /gsd-plan-phase.*

## Quick Tasks Completed

| Quick ID | Date | Description | Files | Commit | Notes |
|----------|------|-------------|-------|--------|-------|
| 260511-l5w | 2026-05-11 | NAV-01 sticky stage header ghost-strip fix (drop `.messages-container` `padding-top`, add soft `box-shadow` to `.stage-nav-strip`) | `frontend/src/components/ChatInterface.css`, `frontend/src/components/StageNavigationStrip.css` | (see commit log) | Manual smoke flagged for user. VRT baseline regeneration deferred to v2.1 Phase 10. **PARTIAL FIX — close/verify is NAV-V2.1-01 in v2.1 Phase 8 (do not re-implement).** |
| 260511-lcu | 2026-05-11 | Critique source-MD picker + critique-pill reload — Bug B: add `mode: Literal[...]` to `ConversationMetadata` so FastAPI stops filtering it from `/api/conversations`. Bug A: expand DropZoneSlot `<input accept>` to include `text/markdown,text/plain` so Windows native file dialog stops hiding `.md` files (Branch A shipped proactively, no diagnostics). | `backend/main.py`, `frontend/src/components/DropZoneSlot.jsx` | 127134e, 862a536 | **Backend restart required** (uvicorn not `--reload`). Manual smoke flagged for user. If picker still rejects `.md` after restart, Branch A wasn't the cause — iterate to Branch B (`onInput` fallback) or C (`.trim()` ext check). Both bugs classified as Phase 5 carry-over, not v2.0 regressions. |
| 260511-mqt | 2026-05-11 | Critique-mode parity (Bug C+D+E): download conversation .md now includes `## Source materials` + uses Critique instruction label + Individual Critiques header; final-answer .md uses Critique instruction label; `generate_conversation_title` defensive truncation + empty-string fallback; critique title block logs to stderr instead of `pass`. | `frontend/src/utils/download.js`, `frontend/src/components/ChatInterface.jsx`, `frontend/src/components/Stage3.jsx`, `backend/council.py`, `backend/main.py` | cf6b61b, 4024df4 | **Backend restart required** for Bug E (import sys + new title fallback). Vite HMR covers the frontend. Bug F (critique deliberation lost on disconnect) explicitly OUT OF SCOPE — queued as a separate quick task with --discuss. Fresh-prompt export path verified byte-stable. |
| 260511-qrx | 2026-05-11 | Safety-net log for critique deliberation exceptions (Bug F triage). | (see commit log) | a4b04c5 | Backend exception logging now surfaces critique-mode failures that were previously silent. |

## Operator Next Steps

- Run `/gsd-execute-phase 8` to execute the 3 plans (Wave 1 parallel). Executor will pause for 3 manual smoke checkpoints (one per plan).
- After execution: run `/gsd-verify-phase 8` (goal-backward check of phase deliverable) or proceed to `/gsd-plan-phase 9` (cost footer relocation, ADR-gated).
- **NO VRT baseline regeneration in Phase 8** — Phase 10 owns that.
- Honour the **English-copy overrides** (D-05 date headers, D-10 aria-label) — already explicitly locked in the plans' acceptance criteria.
