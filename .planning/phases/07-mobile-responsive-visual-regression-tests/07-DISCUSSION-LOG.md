# Phase 7: Mobile responsive + Visual regression + Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 7-Mobile responsive + Visual regression + Tests
**Areas discussed:** MOBL-04 disposición, VRT surfaces, Workflow Windows↔Docker, Plan grouping/orden

---

## MOBL-04 swipe gesture

| Option | Description | Selected |
|--------|-------------|----------|
| Ship en Phase 7 | ~30 LOC + touch-action: pan-y. UX más nativa en touch devices. Coste real: ~1 sesión adicional + test manual en móvil. Riesgo: gesture conflicts con scroll si touch-action está mal. | ✓ |
| Diferir a v2.1 (tap-only) | Suelo aceptable: hamburger button MOBL-01..03 abren el drawer con tap. Ahorras ~1 sesión + zero riesgo de gesture flake. Trade-off: UX móvil menos fluida. | |
| Decidir en plan-checker | Plan-checker evalúa si presupuesto aprieta después de planificar MOBL-01..03 + VRT + TEST. Más prudente; más overhead. | |

**User's choice:** Ship en Phase 7
**Notes:** Resuelve definitivamente la flag "scope-cut candidate" del ROADMAP. Plan-checker no tiene autoridad para deferir.

---

## VRT surfaces

| Option | Description | Selected |
|--------|-------------|----------|
| Stick a las 5 (10 baselines) | Lo que dice ROADMAP. Stage 1/2 son listas de markdown (poca regresión visual); Critique y Settings tienen state-machines complejas → más flaky. Mínimo viable. | |
| Ampliar a 7 (Settings + Stage 2) | Settings + Stage 2 expandido = 14 baselines. Settings es la superficie que más ha movido (Phase 6), Stage 2 prueba la skin con contenido denso. | |
| Ampliar a 8 (+ Critique) | Las 5 + Settings + Stage 2 + Critique con files = 16 baselines. Cobertura máxima. Riesgo: Critique tiene flake potencial. | ✓ |

**User's choice:** Ampliar a 8 (+ Critique)
**Notes:** Cobertura máxima por encima del default ROADMAP. Override consciente.

### VRT states (follow-up para D-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Estados "hero" únicos (recom) | Settings abierto con defaults; Stage 2 con 4 rankings expanded; Critique con 3 files + instruction tipeada. 1 baseline por surface × 2 temas = 6 nuevas → total 16. | ✓ |
| Múltiples estados clave | Settings (abierto+cerrado), Stage 2 (collapsed+expanded), Critique (empty+files+streaming). 12 nuevas → total 22. Más mantenimiento. | |
| Plan-time decide | Dejas al planner. | |

**User's choice:** Estados "hero" únicos
**Notes:** Minimiza mantenimiento; hero state = máxima información visual por baseline.

---

## VRT iteration workflow (Windows ↔ Docker)

| Option | Description | Selected |
|--------|-------------|----------|
| Docker-only (canonical) | Nunca corres playwright en Windows. Todo va por docker run mcr.microsoft.com/playwright. Iteración más lenta pero zero drift. | |
| Híbrido pragmático | Iteras specs locales en Windows con --update-snapshots para dev rapidez (no commiteas), y antes de cerrar el plan haces re-baseline en Docker que SI commiteas. | |
| Skip local, solo CI-equivalent | Nunca corres playwright durante dev — escribes la spec, abres docker, ejecutas, ajustas. | |

**User's choice (freeform):** "Yo no quiero desarrollar, solo documentar el código"
**Notes:** El usuario explícitamente delega el desarrollo (incluida la iteración de specs) al executor agent. Su rol es definir scope y revisar baselines committed. Resultado interpretado: Docker-only de facto, sin ruta Windows-local. README documenta el comando Docker como referencia para el agent, no como instrucción del usuario.

---

## Plan grouping / orden de ejecución

| Option | Description | Selected |
|--------|-------------|----------|
| Wave 1 mobile → Wave 2 (VRT ∥ tests) | Plans MOBL-01..04 secuencial. Wave 2: VRT + TEST en paralelo. Mobile bloquea VRT. 2 olas. Recomendado. | ✓ |
| Wave 1 (mobile ∥ tests) → Wave 2 VRT | MOBL y TEST en paralelo. VRT al final cuando mobile listo. 2 olas. | |
| Secuencial estricto | Plan 1 mobile, Plan 2 VRT, Plan 3 tests. Máxima predictibilidad. | |

**User's choice:** Wave 1 mobile → Wave 2 (VRT ∥ tests)
**Notes:** Mobile primero porque VRT necesita superficie estable. TEST puede correr en paralelo con VRT porque cubre lógica (storage, hooks, helpers), no la UI.

---

## Claude's Discretion

Areas where the user deferred to planner/Claude:

- **Plan splitting within Wave 1.** Planner decides si MOBL-01..04 es 1 plan o 2 (e.g., responsive substrate + drawer/gesture).
- **Plan splitting within Wave 2 — TEST.** Pytest backend + vitest frontend pueden ser 1 o 2 plans paralelos.
- **Test fixture strategy.** Hand-rolled JSON / golden fixtures / factory functions — planner decide tras leer el codebase test-free.
- **Exact swipe distance threshold (MOBL-04).** Default sugerido: 40px (iOS Safari back-swipe equiv). Plan ajusta si smoke testing lo cambia.
- **README documentation tone para TEST-03.** Default a minimal (1 paragraph + 3 fenced blocks) match Direction A "calmo".
- **Hamburger button styling.** Same gear-button styling vs distinct hamburger icon — planner elige basándose en consistencia visual.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights:

- CI pipeline (GitHub Actions / GitLab CI) — tagged v2.1 backlog, single-user posture justifica omisión.
- Windows-local Playwright iteration — descartado por D-03; reabrir si entran contribuidores Windows-dev.
- Multi-state VRT baselines (más allá del hero state) — descartado D-02b; reabrir si regresiones slip past hero.
- Test coverage % targets — no declarados; reopen si drift se vuelve problemático.
- Critique dedicated drawer/sheet baseline — descartado (Phase 5 no usa drawer en Critique).
- useTouchSwipe hint banner — descartado; reabrir si MOBL-04 tiene discoverability issues post-v2.0.
- Multi-viewport VRT (320/768/1024) — descartado; baselines son desktop default. Reabrir si mobile regressions slip past.
