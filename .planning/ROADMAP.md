# Roadmap: LLM Council — Personal Edition

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-05-10) — see [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Council as External Critic + Hardening** — Phases 5-7 (started 2026-05-10)

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

### v2.0 Council as External Critic + Hardening (active)

**Granularity:** coarse (3 phases, "ir a saco")
**Coverage:** 33/33 requirements mapped (8 CRIT + 4 NAV + 3 PERS + 4 COST + 4 SET + 4 MOBL + 3 VRT + 3 TEST)

- [ ] **Phase 5: Critique mode + Schema migration + In-conversation navigation** — Headline v2.0 feature (external deep research critique) bundled con la migration v1→v2 obligatoria (CRIT-3) y la navegación que las críticas largas necesitan para ser legibles.
- [ ] **Phase 6: Persistence completeness + Cost analytics + Settings panel** — Capa de observabilidad y polish: metadata Stage 2 persistido, dual-column cost dashboard (OpenRouter fee vs upstream BYOK), y panel de preferencias (theme, font-size, density, stage4_threshold).
- [ ] **Phase 7: Mobile responsive + Visual regression + Tests** — Quality lock final: usable en ≤768px (touch targets, focus trap nativo, safe-area), Playwright snapshots Linux-Docker only, y suite mínima pytest + vitest sobre superficie congelada.

## Phase Details

### Phase 5: Critique mode + Schema migration + In-conversation navigation

**Mode**: mvp (vertical slice — el feature headline ship usable end-to-end con migration y navegación incluidas)
**Goal**: El usuario puede subir 3 deep researches externos (uno por modelo del council Quality), lanzar una crítica, y leer la deliberación larga sin perderse — con todas las conversaciones v1.0 cargando sin romperse tras el deploy.
**Depends on**: v1.0 Phase 4 completion (Direction A locked, Quality dial shipped, ReasoningDisclosure pattern available para reuso).
**Requirements**: CRIT-01, CRIT-02, CRIT-03, CRIT-04, CRIT-05, CRIT-06, CRIT-07, CRIT-08, PERS-03, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. El usuario elige entre "Fresh question" y "Critique research" en el welcome state vía un segmented control; el flow fresh-prompt existente (textarea + Quality dial) sigue comportándose bit-for-bit cuando se elige "Fresh question".
  2. En modo "Critique research", el usuario sube 3 archivos `.md`/`.txt` (uno por slot etiquetado con el modelo del council que generó el research externo), ve un cost estimate pre-flight ("$X.XX–$Y.YY upstream, billed to your provider keys"), y lanza la deliberación; los archivos viajan vía `multipart/form-data` al endpoint `/critique/stream`, los 3 modelos critican viendo todos los researches como context con autoría visible, Stage 2 anonimiza la peer-review (con strip de nombres explícitos para mitigar attribution leak), y Stage 3 sintetiza.
  3. Al recargar una conversación critique, los 3 archivos aparecen como chips colapsados sobre la respuesta del assistant; click expande el contenido markdown-rendered usando el mismo accordion CSS-only (`grid-template-rows: 0fr → 1fr`) que `ReasoningDisclosure`.
  4. Toda conversación v1.0 en `data/conversations/` carga sin lanzar `TypeError` después del deploy v2.0: el `get_conversation` server-side detecta ausencia de `schema_version` y aplica `migrate_message_v1_to_v2` lazy; nuevas writes llevan `schema_version: 2` en el root.
  5. Una deliberación larga (Stage 1 + Stage 2 + Stage 3 + Stage 4 opcional) se lee orientada: los headers de stage hacen `position: sticky` bajo el Header global; un strip horizontal de chips ("Stage 1 · 4 responses", "Stage 2 · evaluating", "Stage 3 · synthesis") permite saltar a cada sección con scroll-spy highlight; las respuestas Stage 1 >600px colapsan a "Show more" en históricas; un botón "Back to top" aparece tras scroll >800px y honra `prefers-reduced-motion`.

**Plans:** 5 plans
- [ ] 05-01-PLAN.md — Schema migration v1→v2 + mode/external_research storage shape (Wave 0, depends_on: [])
- [ ] 05-02-PLAN.md — Backend critique pipeline: POST /critique/stream + anonymization + truncate + n=1/2/3 SSE (Wave 1, depends_on: [05-01])
- [ ] 05-03-PLAN.md — Frontend critique entry: sidebar button + pill + CritiqueWelcome + DropZoneSlot + rate-limit (Wave 2, depends_on: [05-01, 05-02])
- [ ] 05-04-PLAN.md — File chip hydration on reload (CRIT-08 ExternalResearchPanel) (Wave 3, depends_on: [05-01, 05-02, 05-03])
- [ ] 05-05-PLAN.md — In-conversation navigation: sticky headers + StageNavigationStrip + Show-more + Back-to-top (Wave 4, depends_on: [05-03])
**UI hint**: yes

---

### Phase 6: Persistence completeness + Cost analytics + Settings panel

**Mode**: mvp (vertical slice — observability + tunables shipped end-to-end, todo touchea `metadata` shape + MessageHeader + nueva UI sidebar/Header)
**Goal**: El usuario tiene visibilidad real del coste OpenRouter + upstream BYOK por mensaje y por mes, controles para tunear `stage4_threshold` / font-size / density, y todas las conversaciones (incluido las antiguas v1.0 ya migradas en Phase 5) muestran Stage 2 metadata completo al recargarse.
**Depends on**: Phase 5 (schema_version + migrate_message_v1_to_v2 ya en sitio; `metadata` dict opaco extendido sin nueva signatura).
**Requirements**: PERS-01, PERS-02, COST-01, COST-02, COST-03, COST-04, SET-01, SET-02, SET-03, SET-04
**Success Criteria** (what must be TRUE):
  1. Recargar cualquier conversación v2.0 (fresh o quality_research) muestra los nombres de modelo de-anonimizados en Stage 2 tabs y la tabla de aggregate rankings completa, sin fallback "Quality (legacy)" — `label_to_model` y `aggregate_rankings` viven dentro del dict `metadata` persistido (cero cambio de signatura en `add_assistant_message`).
  2. Cada `MessageHeader` muestra una línea estática de coste post-deliberación (e.g. "$0.024 OpenRouter · $1.43 upstream · 4.2s") capturada de `usage.cost` y `usage.cost_details.upstream_inference_cost` en cada `query_model`, agregada por stage en `metadata.cost`. No hay tickers animados (Direction A "calmo").
  3. El sidebar footer muestra el total acumulado del mes con dos columnas (OpenRouter fee vs upstream BYOK), número de queries, y una progress bar discreta que solo aparece al ≥80% del cap de $100 OpenRouter; los datos vienen de `GET /api/stats/cost` que agrega read-only desde `data/conversations/*.json`.
  4. Un gear icon en el Header abre un slide-out panel desde la derecha (380px desktop, full-width mobile) con 4 controles: theme toggle (duplicado del header), font-size S/M/L radio (15/17/19px), density compact/comfortable, y `stage4_threshold` slider 1-10; los 4 persisten en localStorage vía un nuevo hook `useSettings()` (~30 LOC mirror de `useTheme`).
  5. El `stage4_threshold` viaja en cada request `quality_research` como campo opcional Pydantic-validado (`ge=1, le=10`) y `research_strategy.run` acepta `threshold_override`; requests v1 sin el campo siguen funcionando idénticos. La density aplica vía el FOUC blocker en `index.html` (sync, sin flicker), font-size aplica vía React state (single-render flicker aceptable).

**Plans**: TBD
**UI hint**: yes

---

### Phase 7: Mobile responsive + Visual regression + Tests

**Mode**: mvp (vertical slice — quality lock end-to-end: la app funciona en móvil, la skin queda congelada por snapshots, y los critical paths quedan cubiertos por suite local)
**Goal**: La app es plenamente usable en tablet/phone (≤768px), la skin Direction A queda blindada por Playwright snapshots Linux-Docker, y los critical paths de backend + frontend quedan cubiertos por una suite mínima ejecutable localmente.
**Depends on**: Phases 5 + 6 (la superficie completa — critique mode, navegación, persistence, cost, settings — debe estar estabilizada antes de congelar visualmente y antes de invertir en tests).
**Requirements**: MOBL-01, MOBL-02, MOBL-03, MOBL-04, VRT-01, VRT-02, VRT-03, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. En viewport ≤768px todos los touch targets (botones, sidebar items, QualityToggle segments, attachment chips, file pickers) son ≥44×44px enforced via `--touch-target-min`; el sidebar drawer usa `<dialog>` nativo con `showModal()` (focus trap + ESC + `inert` en main content), sin focus-trap library; `viewport-fit=cover` + `env(safe-area-inset-*)` respetan notch e iOS home indicator.
  2. Existe un hook `useTouchSwipe` (~30 LOC) que abre el drawer con swipe-right desde el borde izquierdo y lo cierra con swipe-left, con `touch-action: pan-y` en `.messages-container` para no chocar con scroll vertical (scope-cut candidate si presupuesto aprieta — tap-to-open via hamburger es el suelo aceptable).
  3. `frontend/visual-tests/` contiene specs Playwright para 5 surfaces × 2 themes (= 10 baselines): welcome state, Stage 3 highlight, ErrorBanner, sidebar empty state, theme toggle; cada spec mockea SSE vía `page.route()`, aplica las 5 medidas anti-flake (`document.fonts.ready`, threshold 0.2, maxDiffPixelRatio 0.02, `reducedMotion: 'reduce'`, CSS animation override), y los snapshots son baselineados exclusivamente en Linux Docker (`mcr.microsoft.com/playwright:v1.X.X`).
  4. `backend/tests/` contiene suite pytest con `conftest.py` (tmp DATA_DIR, dummy API key, monkeypatched `query_model`) cubriendo storage UUID validation + path-traversal rejection, `add_assistant_message` round-trip con metadata + stage4 + external_research, council profile routing, research_strategy critic parser, y el roundtrip v1→v2 migration (el test de mayor valor del milestone); `pytest-asyncio` configurado en mode `strict`.
  5. Frontend tiene `*.test.jsx` co-located usando vitest + RTL v16 + jsdom cubriendo `useTheme`, `useSettings`, `MessageHeader` legacy fallback, `QualityToggle` onChange wiring, `Stage2` de-anonimización, y los helpers puros de `download.js`; el README documenta los 3 comandos (`uv run pytest backend/tests/ -v`, `npm test --prefix frontend`, `npx playwright test --config frontend/visual-tests/playwright.config.ts`) sin CI (tagged como v2.1 backlog).

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Hardening & Conversation Management | v1.0 | 5/5 | Complete | 2026-05-09 |
| 2. UX Research & Design Brief | v1.0 | 6/6 | Complete | 2026-05-10 |
| 3. Quality Dial & Pragmatic Deep Research | v1.0 | 5/5 | Complete | 2026-05-10 |
| 4. Visual Identity Implementation | v1.0 | 4/4 | Complete | 2026-05-10 |
| 5. Critique mode + Schema migration + In-conversation navigation | v2.0 | 0/5 | Planned | — |
| 6. Persistence completeness + Cost analytics + Settings panel | v2.0 | 0/0 | Not started | — |
| 7. Mobile responsive + Visual regression + Tests | v2.0 | 0/0 | Not started | — |

## Cross-Phase Notes (v2.0)

### Bundling rationale

**Phase 5 bundling** (critique + schema + navigation): forced por PITFALLS.md §CRIT-3 — splitting persistence schema y critique mode invita `TypeError` cascade en 100% de conversaciones v1.0 al recargar. Navigation (NAV-01..04) se bundle aquí porque toca las mismas surfaces (ChatInterface, message rendering) y es lo que hace legible la output larga del critique mode (3 critiques + peer review + synthesis = >5000 palabras).

**Phase 6 bundling** (persistence completeness + cost + settings): narrativa coherente "tooling alrededor del motor de deliberación". Los 3 tocan `metadata` shape, `MessageHeader`, y nueva UI en sidebar/Header. El `stage4_threshold` slider necesita la API contract de SET-03 + el cost dashboard del que viene la motivación de tunear el threshold.

**Phase 7 bundling** (mobile + VRT + tests): los 3 son "freeze the surface" work — no tiene sentido testar/snapshotear/responsive-poner una superficie que aún se está moviendo. Mobile responsive se hace ANTES de los snapshots para que las baselines incluyan el comportamiento ≤768px.

### Override de SUMMARY.md

La synthesis de research recomendó 6 fases (Phase 5–10) con persistence + critique en Phase 5 y todo lo demás separado. El usuario explícitamente pidió "pocas fases, ir a saco" — granularity `coarse` en config.json corrobora. Las 3 fases respetan el constraint mandatory de PITFALLS.md (PERS-03 dentro de Phase 5 con CRIT-01..08) y siguen el ordenamiento de blast-radius reducción de SUMMARY.md (schema/critique → observability/polish → quality lock), simplemente bundleando agresivamente dentro de cada bucket.

### Decisiones diferidas a plan-time

- **Storage shape para critique files** (CRIT-4): inline vs sidecar — resolver en Phase 5 plan-1. Recomendación tentativa de SUMMARY.md: inline + cap 750KB/file (Pydantic) + sidebar listing que solo lee `index.json` lightweight. Plan-checker debe forzar la decisión antes de execute.
- **OpenRouter `usage.cost` shape verification** (CRIT-2): 5-min spike (log de un response real) ANTES de Phase 6 plan-1.
- **Swipe gesture MOBL-04 scope-cut**: si el plan-checker de Phase 7 detecta que el budget aprieta, MOBL-04 se difiere a v2.1 con tap-to-open hamburger como suelo. MOBL-01..03 son no negociables.

---
*Last updated: 2026-05-10 — v2.0 milestone roadmap created (3 phases, coarse granularity, override de SUMMARY.md por user directive "ir a saco")*
*Last updated: 2026-05-10 after v1.0 milestone close*
