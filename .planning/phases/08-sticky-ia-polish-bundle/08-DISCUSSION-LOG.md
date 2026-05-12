# Phase 8: Sticky/IA polish bundle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 8-sticky-ia-polish-bundle
**Areas discussed:** Breadcrumb scope + host, Sidebar date grouping (field + copy), Demote N messages (icon + visibility), Tab-to-panel border vs strip shadow

---

## Breadcrumb scope + host (IA-V2.1-01)

### Q1 — Content rule

| Option | Description | Selected |
|--------|-------------|----------|
| Sólo conversation title | Una sola línea simple, constante todo el scroll, sin coupling con activeTab interno | ✓ |
| Título + modelo activo en Stage 1 | Cambia a `<modelo> · <título>` cuando lee Stage 1 sub-tab | |
| Título + sección del stage activo | Reusa el activeId del IntersectionObserver | |

**User's choice:** Sólo conversation title
**Notes:** Resuelve la única open decision flagged en STATE.md ("breadcrumb content rule"). Simplifica el wire-up — no observers extra, no coupling con Stage1 internal tab state.

### Q2 — Host container

| Option | Description | Selected |
|--------|-------------|----------|
| Línea encima del chip strip dentro del mismo sticky | Un solo contenedor, dos líneas | ✓ (Claude's discretion) |
| Nueva línea sticky separada justo encima | Dos sticky apilados con offsets coordinados | |
| Reutilizar el Header global | Mover título al `Header.jsx` | |

**User's choice:** "Decide tú" → Claude picked Option 1
**Notes:** Un sticky único garantiza el req "no layout jump on stick/unstick" sin coordinar offsets. Reutiliza el box-shadow existente de `260511-l5w` sin duplicar.

---

## Sidebar date grouping (IA-V2.1-03)

### Q1 — Bucket field

| Option | Description | Selected |
|--------|-------------|----------|
| `created_at` (creación) | Campo ya presente en /api/conversations, alineado con "1 conv = 1 deliberación" | ✓ (Claude's discretion) |
| `updated_at` / last activity | Requiere cambio de shape backend | |
| Renombrar bumps order | Híbrido confuso | |

**User's choice:** "Decide tú" → Claude picked `created_at`
**Notes:** Cero plumbing backend, el modelo mental del app no soporta multi-turn por diseño.

### Q2 — Header copy language

| Option | Description | Selected |
|--------|-------------|----------|
| Español ("Hoy / Esta semana / Este mes / Más antiguo") | Literal de REQUIREMENTS.md + backlog | |
| Inglés ("Today / This week / This month / Older") | Consistencia con el resto del sidebar EN | ✓ |
| Toda la UI a español | Fuera de scope Phase 8 | |

**User's choice:** Inglés
**Notes:** Override consciente del literal en REQUIREMENTS.md:26 y backlog:52. Documentado en CONTEXT.md D-05.

### Q3 — A11Y label coherence (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Inglés ("Back to top") — unificar | Override de REQUIREMENTS.md:39 | ✓ |
| Español ("Volver al inicio") — respetar literal | Mezcla EN/ES (a11y en idioma del usuario) | |

**User's choice:** Inglés ("Back to top")
**Notes:** Lock coherente con el resto del sidebar y con el value ya shipped en BackToTopButton.jsx:38. Documentado en CONTEXT.md D-10.

---

## Demote N messages (IA-V2.1-04)

### Q1 — Glyph form

| Option | Description | Selected |
|--------|-------------|----------|
| Unicode glyph (💬 o •) | Consistente con `⋮`, `+`, `↑` del codebase actual | ✓ |
| Single SVG inline | Introduce patrón nuevo (no hay SVG icons hoy) | |
| Sin icon — sólo demote tipográfico | Mantiene patrón actual con menor peso visual | |

**User's choice:** Unicode glyph
**Notes:** Claude's discretion fina en el glyph exacto → bullet `•` (no emoji 💬) por consistencia Direction A "calmo". Visibility cuando count=0: ocultar la meta line entera (Claude's discretion documentado en D-07).

---

## Tab-to-panel border vs strip shadow (NAV-V2.1-01 + NAV-V2.1-02)

### Q1 — Coexistencia shadow + border

| Option | Description | Selected |
|--------|-------------|----------|
| Mantener shadow + active chip 2px accent | Patrón "tab connected" clásico, sombra elevada interrumpida por accent | ✓ |
| Drop shadow cuando hay active chip | Toggle dinámico, riesgo de re-introducir ambigüedad de layering | |
| Drop shadow del strip, replace por border-bottom 1px | Más flat, pierde profundidad del sticky | |

**User's choice:** Mantener shadow + active chip 2px en color-accent
**Notes:** NAV-V2.1-01 stays closed exactamente como `260511-l5w` shipped. NAV-V2.1-02 layers on top. Plan-time MUST NOT drop el box-shadow para "mejorar continuidad".

---

## Closing decisions (Claude's discretion, no Q asked)

### NAV-V2.1-03 — H2 drop a11y strategy

**Default applied:** Replace each `<h3 className="stage-title">` with parent section's `aria-labelledby` pointing at the corresponding chip. Documented as D-09.

### A11Y-V2.1-01 — Contrast bump strategy

**Default applied:** Value swap inside existing token chain (`color: var(--color-fg-primary)` first, then `background: var(--color-bg-secondary)` if devtools still fails WCAG AA). No new tokens. Documented as D-11. Threshold change `800 → 600` documented as D-12.

---

## Claude's Discretion

- Host container for the breadcrumb (D-02): user said "decide tú" → picked single sticky with two-line layout.
- Bucket field for date grouping (D-04): user said "decide tú" → picked `created_at`.
- Exact glyph (D-06): user picked "unicode glyph" category; Claude picked `•` over 💬 for Direction A calmness.
- Visibility of meta line at count=0 (D-07): hide entirely.
- H2 drop strategy (D-09): `aria-labelledby` pointing at chip IDs.
- Contrast bump tactic (D-11): value swap within existing token chain.
- Date bucket boundaries: Today (same calendar day), This week (previous 6 days), This month (rest of current month), Older.

## Deferred Ideas

- Tooltip on truncated breadcrumb title — plan-time discretion, omit if it complicates stacking context.
- i18n infrastructure for full Spanish translation — explicit non-goal of Phase 8; separate milestone-level decision.
- Token tweaks to brighten Direction A accents — out of scope; D-11 stays inside existing token chain.
- P3 scroll-spy in sticky bar — already deferred to v2.2 at roadmap time.
