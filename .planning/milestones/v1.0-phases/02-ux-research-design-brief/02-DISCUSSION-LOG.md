# Phase 2: UX Research & Design Brief - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 02-ux-research-design-brief
**Areas discussed:** Walkthrough & audit scope, Redesign exploration breadth, Mockup fidelity & format, Aesthetic direction & references

---

## Area Selection (initial multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| A. Alcance del walkthrough y rúbrica del audit | Qué flujos cubre, severidad Nielsen, audit cubre superficies Phase 3? | ✓ |
| B. Amplitud del redesign proposal | Única vía vs 2-3 alternativas tonales | ✓ |
| C. Fidelidad y formato de los mockups | ASCII-only vs ASCII + HTML throwaway | ✓ |
| D. Dirección estética y referencias de marca | Refs, light/dark, paleta philosophy, tipografía | ✓ |

**User's choice:** Las 4 áreas — el usuario optó por discusión completa sin saltarse ninguna.

---

## Area A — Walkthrough & audit scope

### A-Q1: ¿Qué flujos cubre el cognitive walkthrough? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Primer arranque (cold start, sin conversaciones) | Welcome state + descubrimiento del CTA | ✓ |
| Hacer una pregunta y revisar la deliberación completa (Stage 1–2–3) | Flujo núcleo: input → SSE → tabs → de-anon → synthesis → download | ✓ |
| Gestionar conversaciones (Phase 1 surface) | three-dot, modal delete, rename inline, search progresivo | ✓ |
| Adjuntar archivos y editar antes de enviar | Drag-and-drop, chips, errores de tamaño | ✓ |

**User's choice:** Los 4 flujos. Cobertura completa.
**Notes:** El walkthrough de Phase 1 surface valida la UX subyacente antes de que Phase 4 la pinte (no se asume que Phase 1 está validada UX-wise solo por estar shipped).

### A-Q2: Severidad Nielsen audit + ¿audit cubre superficies Phase 3?

| Option (Q2.a Severity) | Description | Selected |
|--------|-------------|----------|
| Escala Nielsen original 0–4 (Cosmetic → Catastrophe) | Estándar campo, granularidad para priorizar | ✓ |
| Hi/Med/Lo simple | Más liviana pero pierde matices | |
| Tú decides | Default de la skill | |

| Option (Q2.b Audit scope) | Description | Selected |
|--------|-------------|----------|
| Solo UI actual | Audit honesto de lo enviado | |
| UI actual + propuesta UX para Quality toggle y reasoning panel | Anticipa Phase 3 sin diseñar Stage 4 | ✓ |
| UI actual + propuesta UX completa Phase 3 (incl. Stage 4) | Más ambicioso pero arriesga rework | |

**User's choice:** Nielsen 0–4 + audit cubre UI actual + Quality toggle + reasoning panel (sin Stage 4 refinement).
**Notes:** Stage 4 queda intencionalmente fuera porque Phase 3 podría re-decidir su forma; mockear ahora arriesga trabajo inútil. QUAL-04 (header con metadata profile) también queda fuera del mockup detallado pero se contempla un slot.

---

## Area B — Redesign exploration breadth

### B-Q1: ¿Cómo estructura el redesign sus alternativas?

| Option | Description | Selected |
|--------|-------------|----------|
| 2–3 direcciones tonales contrastadas, eliges una al final | Más trabajo Phase 2 pero Phase 4 entra sin dudas | ✓ |
| Una sola propuesta directa (audit → fix incremental) | Más rápido, predecible, menos saltos cualitativos | |
| Una propuesta principal + un wild card | Punto medio | |

**User's choice:** 2–3 direcciones tonales contrastadas.
**Notes:** Encaja con el perfil "BI/data driven" del usuario — decisión por evidencia visual, no intuición. El extra coste de tiempo en Phase 2 se compensa con menos rework en Phase 4.

### B-Q2: ¿Qué 3 direcciones tonales explora? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| "Research notebook" — calmo, claro, generoso en whitespace | Linear / Notion / Are.na | ✓ |
| "Tactical cockpit" — denso, info-rico, terminal-flavored | Raycast / Datadog | ✓ |
| "Claude-like minimal" — silencioso, ligero, una decisión a la vez | claude.ai / Anthropic / Vercel docs | ✓ |
| "Brutalist editorial" — títulos enormes, rejilla expuesta | Vercel.com / Stripe Press | |

**User's choice:** Notebook + Cockpit + Minimal (sin Brutalist).
**Notes:** Brutalist se descartó por desproporcionado para una herramienta de uso diario (es más adecuado para landing). Las 3 elegidas cubren el espectro tonal del producto: lectura larga calmada (notebook), denso e instrumental (cockpit), elegante y lineal (minimal).

---

## Area C — Mockup fidelity & format

### C-Q1: ¿Qué formato y fidelidad tienen los mockups?

| Option | Description | Selected |
|--------|-------------|----------|
| ASCII + markdown wireframes únicamente | Cumple mínimo UXR-04; deja microinteracciones a Phase 4 | |
| ASCII + un HTML throwaway por dirección tonal vía /gsd-sketch | Decisión visual no abstracta; ~+1 sesión | ✓ |
| ASCII + HTML throwaway solo de la dirección ganadora | Punto medio; arriesga elegir mal antes de ver | |

**User's choice:** ASCII + 1 HTML throwaway por cada una de las 3 direcciones.
**Notes:** La elección entre Notebook / Cockpit / Minimal se hace mirando los HTML, no leyendo descripciones. Esto multiplica el trabajo de mockups por 3 pero materializa tipografía + paleta + microinteracciones reales — Phase 4 implementa contra el HTML elegido sin ambigüedad. Cada HTML lleva toggle light/dark visible para no decidir en un solo modo.

---

## Area D — Aesthetic direction & references

### D-Q1: ¿Qué postura de modo (light/dark)?

| Option | Description | Selected |
|--------|-------------|----------|
| Light-first, dark deferido a v2 | Una paleta bien resuelta, simpler scope | |
| Dark-first, dark canónico | Reduce fatiga ocular en lectura larga | |
| Ambos a la vez (light + dark) desde Phase 2 | +30% trabajo, ambos modos resueltos | ✓ |
| Tú decides | Recomendación del UX research | |

**User's choice:** Light + dark ambos desde Phase 2.
**Notes:** El toggle interactivo en runtime queda v2 (UX-V2-02), pero el sistema de tokens contempla ambos modos canónicamente desde el principio. Trade-off: más trabajo en Phase 2 y Phase 4, pero sin retrofitting de dark más tarde.

### D-Q2: ¿Apps de referencia? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Linear: jerarquía, mono accents, sidebar denso | Patrón notebook | ✓ |
| Raycast: paleta nocturna, bordes finos | Patrón cockpit | ✓ |
| claude.ai: tipografía generosa, paleta arenosa | Patrón minimal | ✓ |
| Notion / Obsidian / Are.na: editorial, lectura larga | Patrón notebook editorial | ✓ |

**User's choice:** Las 4 referencias (cada una alimenta una dirección o la refuerza).
**Notes:** El mapa final es: Notebook ← Linear + Notion/Obsidian/Are.na · Cockpit ← Raycast (+ Datadog implícito) · Minimal ← claude.ai (+ Anthropic.com / Vercel docs implícitos).

### D-Q3: Tipografía y paleta — preferencia explícita?

| Option (Q3.a Type) | Description | Selected |
|--------|-------------|----------|
| Tú decides — ui-ux-designer agent propone con rationale | Sin restricciones externas | ✓ |
| Familias seguras (Inter / DM Sans / IBM Plex / JetBrains Mono) | Reduce variabilidad pero limita | |
| Familia específica en mente (describirla) | Si ya hay licencia o restricción | |

| Option (Q3.b Palette philosophy) | Description | Selected |
|--------|-------------|----------|
| Cada dirección con filosofía propia | Diferenciación real, no solo hue | ✓ |
| Misma filosofía (mono+1 acento), variando solo color | Más fácil de comparar pero menos contraste | |
| Tú decides | Agent decide nivel de contraste | |

**User's choice:** Tipografía delegada al agent + cada dirección con filosofía de paleta propia.
**Notes:** Sin restricciones de licencia/marca preexistentes. El agent propone 1–2 sistemas tipográficos por dirección con rationale (legibilidad para texto largo, glifos, peso, licencia, encajar con tono). Las 3 paletas se construyen desde primeros principios: notebook = neutros calmos + acento cálido; cockpit = oscuros saturados + cromados/neón; minimal = arenas + un acento muy pulido.

---

## Closure check

| Option | Description | Selected |
|--------|-------------|----------|
| Estoy listo para context — escribe CONTEXT.md | Sufficiente decisión para downstream agents | ✓ |
| Explorar más gray areas | Hay algo más por resolver | |

**User's choice:** Listo para context.

---

## Claude's Discretion

- **Microcopia exacta** (modal de delete, tooltips Quality toggle, placeholders) — `ui-ux-designer` propone, user revisa al elegir dirección.
- **Renderizado visual del coste estimado** en Quality toggle — agent decide por dirección, todas deben hacerlo visible.
- **Animaciones / transiciones** cubiertas en HTML sketches — al menos hover del toggle y transición Stage 1→2→3; resto a criterio.
- **Estructura interna de archivos** dentro de `.planning/ux/` — la propuesta del CONTEXT es línea base, planner puede ajustar.
- **Convergencia de direcciones** — si dos direcciones acaban convergiendo durante research, el agent las re-orienta o reduce a 2 con rationale escrito.

## Deferred Ideas

- Stage 4 refinement UI completo (RSCH-03 — Phase 3 lo decide).
- Headers de mensaje con metadata profile + modelos + chairman (QUAL-04 — Phase 3).
- Toggle interactivo light/dark runtime (UX-V2-02 — v2).
- Per-message "Regenerate with other profile" button (QUAL-V2-01 — v2).
- Cost estimation pre-send detallado por tokens (QUAL-V2-02 — v2).
- Tags / folders / archive / bulk delete (CONV-V2-01..03 — v2).
- Inline citations con URL + excerpt previews (RSCH-V2-02 — v2).
- Persistencia de `label_to_model` y `aggregate_rankings` (PERS-V2-01 — v2; mockup asume estado feliz).
- Copy-to-clipboard en final answer (UX-V2-01 — v2).
- WCAG strict accessibility report (fuera de scope; redesign considera contraste sin informe formal).
- Brand identity completa (logo vectorial, iconos custom, illustration system) — exceso para single-user personal app.

---

*Discussion log captured: 2026-05-09*
