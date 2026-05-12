# Roadmap: LLM Council — Personal Edition

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-05-10) — see [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Council as External Critic + Hardening** — Phases 5-7 (shipped 2026-05-11) — see [archive](milestones/v2.0-ROADMAP.md)
- 🔄 **v2.1 UX Polish + IA Gaps** — Phases 8-10 (active, started 2026-05-12)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-05-10</summary>

- [x] Phase 1: Hardening & Conversation Management (5/5 plans) — completed 2026-05-09
- [x] Phase 2: UX Research & Design Brief (6/6 plans) — completed 2026-05-10
- [x] Phase 3: Quality Dial & Pragmatic Deep Research (5/5 plans) — completed 2026-05-10
- [x] Phase 4: Visual Identity Implementation (4/4 plans) — completed 2026-05-10

Full details: [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
Audit: [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) — PASSED (21/21 reqs)

</details>

<details>
<summary>✅ v2.0 Council as External Critic + Hardening (Phases 5-7) — SHIPPED 2026-05-11</summary>

- [x] Phase 5: Critique mode + Schema migration + In-conversation navigation (5/5 plans, 13/13 reqs)
- [x] Phase 6: Persistence completeness + Cost analytics + Settings panel (9/9 plans inc. 2 gap closures, 10/10 reqs)
- [x] Phase 7: Mobile responsive + Visual regression + Tests (5/5 plans, 10/10 reqs)

Full details: [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
Requirements archive: [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md) (33/33 satisfied)

</details>

### v2.1 UX Polish + IA Gaps (Phases 8-10) — ACTIVE

**Goal:** Cerrar la deuda UX/IA detectada en el manual smoke de v2.0 — regresión P0 del sticky header, redundancias y pérdida de contexto al scrollear, jerarquía del sidebar, reubicación del cost footer (revisita lock D-02 de Phase 6), y a11y del scroll-to-top. Eliminar la fricción residual antes de añadir cualquier feature nueva. Carry-overs explícitos: `App.test.jsx` para `handleStreamEvent` y regeneración de baselines VRT.

**Granularity:** coarse (`.planning/config.json`). 11 reqs en 3 phases siguiendo la pauta de v2.0 ("ir a saco"). Las phases están ordenadas para que la regeneración de baselines VRT (Phase 10) llegue DESPUÉS de todo el trabajo que toca pixels — regenerar antes congelaría las baselines incorrectas.

- [ ] Phase 8: Sticky/IA polish bundle (NAV-V2.1-01..03 + IA-V2.1-01..04 + A11Y-V2.1-01) — 8 reqs
- [ ] Phase 9: Cost footer relocation + ADR D-02 revisit (COST-V2.1-01) — 1 req, heavyweight decision
- [ ] Phase 10: Quality lock — App.test.jsx + VRT baseline regen (TEST-V2.1-01 + VRT-V2.1-01) — 2 reqs

## Phase Details

### Phase 8: Sticky/IA polish bundle
**Goal**: User reads a long Stage response with a non-ambiguous sticky header that surfaces prompt/conversation context as a breadcrumb, navigates the sidebar with clear hierarchy (active border + date groups + demoted metadata), and uses the scroll-to-top button with full a11y baseline.
**Depends on**: v2.0 Phase 7 completion (Direction A surface stable, VRT baselines in place to diff against).
**Requirements**: NAV-V2.1-01, NAV-V2.1-02, NAV-V2.1-03, IA-V2.1-01, IA-V2.1-02, IA-V2.1-03, IA-V2.1-04, A11Y-V2.1-01
**Scope note**: NAV-V2.1-01 is a **close/verify** activity — the partial CSS fix (drop `.messages-container` `padding-top` + `box-shadow` on `.stage-nav-strip`) already shipped in quick-task `260511-l5w`. This phase formalises the close: verifies under 3 stages × 2 themes × 4 viewports, re-checks that the layering bug does not regress when IA-V2.1-01 reshapes the sticky bar to include the breadcrumb, and queues the baseline regen for Phase 10. Plan-time MUST NOT re-do the partial fix.
**Success Criteria** (what must be TRUE):
  1. User scrolling a long Stage 3 response does NOT see any strip of underlying content above the sticky stage-nav-strip — verified in all 3 stages × both themes × 4 viewports (desktop/tablet/mobile-portrait/mobile-landscape). Manual smoke reproducing the 2026-05-11 finding returns clean.
  2. User scrolling past the assistant message header still reads the conversation title (or active Stage 1 model name) inside the sticky bar as a breadcrumb / sub-context line, with no layout jump on stick/unstick.
  3. User looking at the StageNavigationStrip sees the active tab joined to the panel below by a continuous 2px bottom border (Direction A calm contrast preserved), and does NOT see a redundant H2 "Stage X: …" below the active tab; screen-reader heading structure is preserved via `aria-labelledby` or an `sr-only` heading.
  4. User scanning the sidebar identifies the active conversation by a 3px left accent border (in addition to background tint, surviving hover/focus), sees items grouped under subdued date headers (`Hoy` / `Esta semana` / `Este mes` / `Más antiguo`), and reads the `N messages` metadata as a demoted icon + smaller line below the title (never re-flowing above the title).
  5. User scrolls a long page; the floating scroll-to-top button appears only after >600px scroll, carries `aria-label="Volver al inicio"`, passes WCAG AA contrast in both themes, fades in/out, and the fade collapses to instant under `prefers-reduced-motion: reduce`.
**Plans**: 3 plans
- [ ] 08-01-PLAN.md — Sticky breadcrumb + chip IDs + H3 drop + aria-labelledby (NAV-V2.1-01/02/03 + IA-V2.1-01)
- [ ] 08-02-PLAN.md — Sidebar date grouping + meta demote + active-border verify (IA-V2.1-02/03/04)
- [ ] 08-03-PLAN.md — Scroll-to-top a11y baseline: threshold + contrast (A11Y-V2.1-01)
**UI hint**: yes

### Phase 9: Cost footer relocation + ADR D-02 revisit
**Goal**: User no longer sees the cost block competing with sidebar navigation; the cost information is reachable through a deliberate, opt-in surface (popover, Settings sub-section, or dedicated route), with the relocation choice locked by an ADR that explicitly revisits the v2.0 Phase 6 D-02 dual-column sidebar decision.
**Depends on**: Phase 8 (sidebar hierarchy work in IA-V2.1-02..04 may inform where the cost block fits best; removing it from the sidebar is cleaner after the sidebar's own hierarchy is settled).
**Requirements**: COST-V2.1-01
**Scope note**: This phase is **decision-gated**. Per COST-V2.1-01 acceptance criteria, an ADR (or equivalent decision artifact in `.planning/phases/phase-9/`) MUST be produced BEFORE implementation begins. The ADR documents: (a) the v2.0 D-02 lock context (why dual-column sidebar was chosen then), (b) the manual-smoke finding that motivates revisiting it, (c) the relocation target chosen from {popover from spending icon in Header, sub-section inside Settings panel, dedicated route}, (d) the rationale and trade-offs. `/gsd-discuss-phase 9` is the natural producer of this artifact.
**Success Criteria** (what must be TRUE):
  1. An ADR (or `DISCUSS-DECISIONS.md` block) exists in `.planning/phases/phase-9/` BEFORE any code change lands, naming the relocation target and explicitly citing the v2.0 D-02 lock it overrides.
  2. User opening the sidebar does NOT see the `$0.00/$100 · Upstream $X.XX BYOK` block in the footer competing with conversation navigation — the cost block has moved to the location named in the ADR.
  3. User can still reach the cost information in one or two interactions from the main app surface (click spending icon → popover, or open Settings → cost sub-section), and the cap progress bar at ≥80% spend still renders correctly in the new location.
  4. Reverting to the sidebar layout would be a single CSS change — no `metadata.cost` shape change, no `/api/stats/cost` endpoint signature change. The relocation is purely a presentation move.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Quality lock — test coverage + VRT baseline regen
**Goal**: The `handleStreamEvent` stale-event guard regression deferred from v2.0 07-05 is covered by a vitest test at the `<App />` level, AND the 64 Playwright VRT baselines (16 surfaces × 4 viewports) are regenerated to lock the new v2.1 visual baseline that incorporates every pixel change from Phases 8-9.
**Depends on**: Phases 8 + 9 — baseline regeneration BEFORE the UI changes ship would freeze the wrong pixels. This is the last phase by design.
**Requirements**: TEST-V2.1-01, VRT-V2.1-01
**Scope note**: VRT-V2.1-01 ordering is non-negotiable: it MUST be the final activity of v2.1. Regenerating earlier would lock baselines that still reflect the bugged sticky header / redundant H2 / disconnected cost footer. The implementation strategy for TEST-V2.1-01 (pure-reducer extraction vs full `<App />` mount with mocked SSE) is decided in `/gsd-discuss-phase 10` — both are acceptable as long as the regression is structurally exercised.
**Success Criteria** (what must be TRUE):
  1. `frontend/src/App.test.jsx` (or equivalent) exists and exercises the `handleStreamEvent` stale-event guard: given a conversation switch mid-stream, the test asserts no `TypeError` is thrown and no white-screen state appears. Test passes locally with `npm run test` from `frontend/`.
  2. All 64 Playwright VRT baselines (16 surfaces × 4 viewports) are regenerated against the v2.1 codebase; the regeneration commit removes the old PNGs and adds the new PNGs atomically (no orphan PNGs left behind).
  3. Manual eyeball review of the VRT diff confirms every changed pixel is intentional (sticky-header layering fix, breadcrumb in sticky bar, removed H2, tab-to-panel border, sidebar 3px border + date groups + demoted metadata, scroll-to-top contrast, relocated cost block). No incidental regressions in non-touched surfaces.
  4. `npm run test:visual` from `frontend/` returns green locally on the regenerated baselines.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Sticky/IA polish bundle | 0/? | Not started | - |
| 9. Cost footer relocation + ADR | 0/? | Not started | - |
| 10. Quality lock — tests + VRT regen | 0/? | Not started | - |

---
*Last updated: 2026-05-12 — v2.1 roadmap created (3 phases, coarse granularity, continues phase numbering from v2.0 Phase 7). 11/11 requirements mapped. Phase 8 ready for /gsd-plan-phase 8.*
