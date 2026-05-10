# Research Summary — v2.0 Milestone

**Milestone:** Council as External Critic + Hardening (features A–G)
**Synthesized:** 2026-05-10
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md
**Overall confidence:** HIGH on stack/architecture, MEDIUM-HIGH on UX patterns and pitfalls

## Executive Summary

v2.0 es **mayormente extensión, no refactor**: la arquitectura v1.0 ya tiene los hooks que las 7 features necesitan (SSE protocol con tipos discriminables, `metadata` opaco en el assistant message, `PROFILES` dict, `ConversationNotFoundError` distinto de `ValueError`, separación `legacy_metadata`/`message_metadata` en `main.py`). Las decisiones estructurales se reducen a tres: añadir un campo `type: "fresh"|"critique"` con `schema_version` al raíz del conversation JSON, montar **un único endpoint nuevo** `/critique/stream` por la incompatibilidad multipart↔Pydantic, y separar `stage4_threshold` (parámetro de request backend) del resto de prefs (puro localStorage). Cero nuevas runtime deps; ~9 dev deps de testing (pytest stack + vitest stack + Playwright). Los pitfalls críticos giran alrededor de **token detonation en Stage 2 con files de 30K tokens inline**, **cost shock** porque el coste real va a las cuentas BYOK del usuario y no al cap de OpenRouter, y **schema break** si la persistencia v2 se publica sin lazy-migration de las conversaciones v1. La build order que emerge — schema/persistence primero, critique segundo, luego cost/settings/mobile, tests/visual al final — minimiza retrabajo y deja la superficie congelable por Playwright.

## Stack Deltas

### Net new runtime deps
**Cero.** OpenRouter ya devuelve `usage.cost` + `usage.cost_details.upstream_inference_cost` automáticamente, los archivos `.md`/`.txt` se leen client-side con `FileReader.readAsText`, y settings es `useState` + localStorage al patrón del `useTheme` de v1.0.

### Net new dev deps (9)

**Backend (uv `[dependency-groups].dev`):**
- `pytest>=8.3.0,<10.0.0`
- `pytest-asyncio>=1.3.0,<2.0.0` — config `asyncio_mode = "strict"` (NO `"auto"`, ver MOD-6)
- `pytest-cov>=7.0.0,<8.0.0`

**Frontend (`devDependencies`):**
- `vitest@^4.0.7` + `@vitest/coverage-v8@^4.0.7`
- `@testing-library/react@^16.3.2` (v16+ soporta React 19 y wrappea `act()` internamente)
- `@testing-library/dom@^10.4.0` (peer dep explícito desde v16)
- `@testing-library/user-event@^14.6.1`
- `@testing-library/jest-dom@^6.6.0`
- `jsdom@^29.1.0` (preferido sobre `happy-dom` por spec-compliance)
- `@playwright/test@^1.59.1`

### AVOID (rechazado explícitamente)

| Tentación | Por qué NO |
|-----------|------------|
| `python-multipart` extra parsing, `aiofiles`, `markdown-it-py` | Files se inlinean en el prompt; no se parsean server-side |
| `marked` / `remark` backend | Los modelos consumen markdown raw |
| `react-router-dom` para Settings | Slide-out panel suficiente para 3 controles |
| `zustand` / `jotai` / `redux-toolkit` | <100 keys totales; useState + localStorage suffices |
| `msw` (Mock Service Worker) | `vi.mock()` en `api.js` boundary cubre el caso |
| `happy-dom` | Subtle deviations en focus events; jsdom es spec-correcto |
| `@testing-library/react-hooks` | Deprecated; `renderHook` ya viene en `@testing-library/react` |
| `httpx-mock` / `respx` | `monkeypatch.setattr` sobre `query_model` da control suficiente |
| Vitest browser mode para visual regression | Aún experimental |
| Percy / Chromatic / Storybook+test-runner | SaaS o ~80MB para 7 componentes |
| `vitest@3.x` | 4.x ya estable y matchea peer dep `vite ^7.0.0` |

## Feature Decisions (locked patterns)

**A. External Deep Research Critique** — 3 slots etiquetados verticalmente (uno por modelo del council, attribution = orden de `COUNCIL_MODELS`), cap 200KB/file × 3. Endpoint dedicado `POST /api/conversations/{id}/critique/stream` con `multipart/form-data` (multiplexar en `/message/stream` rompe Pydantic). Stage 1 se parametriza con `external_context: Dict[model_id, {filename, content}]`; **NO se crea `backend/critique.py`** — reusa la pipeline 3-stage existente. Entry point UI: segmented control (`Fresh question` / `Critique research`) en welcome state.

**B. Persistence Completeness (PERS-V2-01)** — Pack `label_to_model` y `aggregate_rankings` dentro del dict `metadata` ya existente — cero cambio de signatura en `add_assistant_message`. Mergear `legacy_metadata` + `message_metadata` antes de persistir. Lazy migration server-side en `get_conversation`. Añadir `schema_version` al conversation JSON root.

**C. Cost Analytics** — Capturar `usage.cost` y `usage.cost_details.upstream_inference_cost` en `query_model`, agregar por stage en `metadata.cost`. Display estático post-deliberación (microcopy en `MessageHeader` + sidebar footer "$X.XX this month · N queries") — NO ticker animado (anti-pattern AA2, viola Direction A "calmo"). Endpoint `GET /api/stats/cost` agrega on-read. Mostrar dos columnas: OpenRouter fee vs upstream cost (BYOK = coste real fuera del cap de $100).

**D. Settings Page** — Slide-out panel desde la derecha (380px, gear icon en Header), NO route, NO modal full-page. Controles: `stage4_threshold` slider 1-10 (request body field, Pydantic validator `ge=1, le=10`, default fallback a `PROFILES["quality_research"]["stage4_threshold"]`), font-size S/M/L (15/17/19px), density compact/comfortable, theme toggle duplicado. Todos en localStorage **excepto** `stage4_threshold` que viaja en request. Hook nuevo `useSettings()` ~30 LOC.

**E. Mobile Responsive (≤768px)** — Touch targets ≥44×44 audit (foundation), `viewport-fit=cover` + `env(safe-area-inset-*)`, focus trap via `<dialog>` element con `showModal()` (native, NO hand-roll, NO `focus-trap-react` salvo polyfill). Swipe gesture: `useTouchSwipe` hook ~30 LOC con `touch-action: pan-y` en `.messages-container` — scope-cut candidate si budget aprieta.

**F. Visual Regression** — Playwright `toHaveScreenshot()` en 5 surfaces × 2 themes = 10 baselines. Linux-Docker only para snapshots; Windows local dev usa `--update-snapshots` y reviewer valida en Linux CI. Mandatory: `await page.evaluate(() => document.fonts.ready)`, `threshold: 0.2`, `maxDiffPixelRatio: 0.02`, `reducedMotion: 'reduce'` + CSS override `animation: none !important`. Playwright NO corre dentro de vitest; coexisten como `npm test` y `npm run test:visual`.

**G. Automated Tests (~60% en critical paths)** — Backend: pytest + `httpx.AsyncClient(transport=ASGITransport(app=app))`, mode `strict`. Frontend: vitest + RTL v16 + jsdom, co-located `*.test.jsx`. Sin CI en v2.0 — se corre local; README documenta los comandos.

## Critical Pitfalls (cross-feature, top 4)

**1. Stage 2 token detonation en critique mode (CRIT-1)** — 3 files × ~30K tokens inline en Stage 1 + concatenación de 3 critiques de ~2500 tokens cada una en Stage 2 → fácil > 25K tokens en Stage 1 input y > 8K en Stage 2, multiplicado por 3-4 modelos en paralelo. `query_model` actualmente swallow `context_length_exceeded` como `None`. **Phase 5 mandatory:** estimate tokens pre-flight con heurística `len(text)/4`, bloquear UI si > 150K, **truncar critiques a primeros 600 tokens en Stage 2** con marker `[…truncated…]`, y propagar `context_length_exceeded` como structured event.

**2. Cost shock vs cap BYOK (CRIT-2)** — El cap de $100/mes de OpenRouter cubre solo el 5% BYOK fee. Una critique run real cuesta $1.50–$3.00 a la cuenta del provider del usuario. **Phase 5 mandatory:** pre-flight cost estimate en el critique entry-point, display analytics con dos columnas OpenRouter fee vs upstream cost, soft rate-limit en localStorage tras 5 critique runs/hora.

**3. Schema break al recargar conversaciones v1 (CRIT-3)** — Conversaciones v1 no tienen `metadata.label_to_model` ni `aggregate_rankings`; añadir `external_research` + `type` agrava el shape mismatch. Sin migration: `TypeError` en 100% de conversaciones pre-v2. **Mitigación:** `schema_version` desde primer write v2, `migrate_message_v1_to_v2(msg)` lazy server-side en `get_conversation`, y un test específico que asserta que un v1 JSON sin metadata hidrata en v2 sin lanzar — el test de mayor valor del milestone. **Implicación crítica:** persistence schema DEBE landar antes o bundled con critique mode, NUNCA después.

**4. File blob explosion en JSON storage (CRIT-4)** — 3 files × 500KB × 1000 conversaciones = 1.5GB; sync I/O bloqueante en async handler; `list_conversations` lee todos los JSON enteros para sidebar. **Decisión a tomar en Phase 5 plan-1, no en execute:** ARCHITECTURE.md prefiere inline (single source of truth, atomic reload); PITFALLS.md prefiere sidecar+cap+gzip. **Tentative resolution:** inline + hard cap 750KB/file (Pydantic) + sidebar listing que solo lee `index.json` lightweight.

**Honorable mentions (moderate):** MOD-1 attribution leak en Stage 2 (strip explicit model names → `Author 1/2/3`); MOD-2 file encoding (CRLF/BOM/UTF-16 normalize ANTES de persistir); MOD-6/7 test config (`pytest-asyncio` mode `strict`, RTL v16 para React 19 `act()`); MOD-8 cross-platform pixel diffs (Linux-Docker baseline + 5 prevention steps en primer plan Phase 9).

## Recommended Phase Order

Las 3 sub-investigaciones proponen orderings similares con un punto de fricción: **Architecture pone persistence en Phase 5 (separado de critique); Pitfalls dice que persistence DEBE landar antes o bundled; Features dice que B antecede A5.** Síntesis:

| Phase | Theme | Rationale (synth) | Features absorbed |
|-------|-------|-------------------|-------------------|
| **5** | **Schema migration + critique foundation (BUNDLED)** | Resolver CRIT-3 antes que critique introduzca el segundo shape. Una sola migration, un solo `schema_version` bump. Decidir aquí inline-vs-sidecar (CRIT-4). Incluye token-budget pre-flight (CRIT-1), encoding normalization (MOD-2), attribution-strip (MOD-1), cost preview UI mínimo (CRIT-2 entry-point), MIN-5 IPv4 fix incidental. | A1–A5, B1, hooks parciales C1 |
| **6** | **Cost analytics completos** | Builds on `metadata.cost` ya persistido. `GET /api/stats/cost`, sidebar footer, MessageHeader microcopy. Dos columnas OpenRouter-fee vs upstream-cost (CRIT-2 dashboard). | C1, C2 |
| **7** | **Settings page** | Necesita cost analytics para mostrar monthly aggregate. `stage4_threshold` slider, font-size, density. Lazy aggregation (MIN-3), API contract (MIN-2), FOUC asymmetry (MIN-1). | D1, D2, D3 |
| **8** | **Mobile responsive** | Frontend-only; CSS + 2 hooks. `<dialog>` para focus trap (MOD-4), `viewport-fit=cover` + safe-area (MOD-3), `touch-action: pan-y` (MOD-5). E2 swipe es scope-cut candidate. | E1, E3, E4, opcional E2 |
| **9** | **Visual regression** | Lock the design ahora que mobile + settings son estables. Linux Docker baseline, los 5 pasos anti-MOD-8 en primer plan. | F1, F2, F3 |
| **10** | **Automated test suite** | Al final, sobre superficie congelada. pytest + vitest + RTL v16 con modes correctos (MOD-6, MOD-7). | G1–G5 |

**Justificación del bundling Phase 5:** PITFALLS.md es explícito en que persistence DEBE landar antes o conjuntamente con critique. Splitearlas invita CRIT-3. Trade-off: Phase 5 es la más cargada del milestone (5 pitfalls críticos + 1 moderate); el roadmapper debe plan-checkearla con cuidado especial.

**Ordenamiento alterno rechazado:** "critique primero por value-first delivery". Rechazado porque value-first ya está cumplido por v1.0 shipping; v2.0 ordenado por blast-radius reducción protege la inversión existente.

## Open Questions for Roadmapper

1. **Storage shape para critique files: inline vs sidecar** — Resolver en Phase 5 plan-1. Recomendación tentativa: inline + cap 750KB/file (Pydantic) + sidebar listing que solo lee `index.json` lightweight.
2. **OpenRouter `usage.cost` shape verification** — 5-min spike (log de un response real) ANTES de Phase 6.
3. **Critique mode profile lock** — Recomendación: lock a `quality` (3 council = 3 files es invariante estructural), no exponer toggle.
4. **`stage4_threshold` slider en Settings v2.0 vs diferir a v2.1** — Decidir si Phase 7 ships con o sin.
5. **CI en v2.0** — Out-of-scope confirmado, pero documentar en README qué comandos correr local.
6. **Sidebar mode badge para critique conversations** — Recomendación tentativa: pill discreta, alineado con Direction A.
7. **`:online` deprecation watch (MIN-4)** — Startup ping check al boot del servidor; doc en CONCERNS.md.

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Stack version pins | HIGH | Cross-checked vs PyPI + GitHub releases + peer-deps |
| Architecture (endpoints, schema, build order) | HIGH | Lectura directa del v1.0 source |
| Feature UX patterns | MEDIUM-HIGH | Verified vs ChatGPT Custom GPTs / Cursor / Linear / Obsidian |
| OpenRouter `usage` JSON exact shape | MEDIUM | Documented + community-confirmed; spike pre-Phase 6 recomendado |
| Pitfalls technical math (token explosion) | HIGH | Aritmética verificada contra `research_strategy.py` |
| Pitfalls timing (`:online` deprecation) | LOW | Upstream timeline desconocido |
| Phase ordering | MEDIUM-HIGH | Defendido vs alternativa value-first |

## Sources

- `.planning/research/STACK.md` — version pins, install recipes, AVOID list
- `.planning/research/FEATURES.md` — UX patterns A–G, anti-features, MVP slicing, competitor matrix
- `.planning/research/ARCHITECTURE.md` — endpoint design, schema deltas, file-by-file change list
- `.planning/research/PITFALLS.md` — 4 critical / 8 moderate / 5 minor pitfalls, phase-pitfall map
- `.planning/PROJECT.md` — milestone scope, constraints, validated baseline
