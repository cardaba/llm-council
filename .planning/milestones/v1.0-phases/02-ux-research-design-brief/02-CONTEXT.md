# Phase 2: UX Research & Design Brief - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Producir un brief de diseño basado en investigación que viva en `.planning/ux/` y describa: (i) los puntos de fricción del UI actual, (ii) su puntuación contra las 10 heurísticas Nielsen, (iii) una propuesta de redesign con dirección de Information Architecture e interacción para las superficies de Quality dial + gestión de conversaciones, y (iv) mockups a nivel de componente con suficiente fidelidad como para que Phase 4 implemente sin volver a tomar decisiones visuales.

**Requirements covered:** UXR-01, UXR-02, UXR-03, UXR-04 (4 of 21 v1 total).

**In scope:**
- Cognitive walkthrough sobre 4 flujos: cold start (primer arranque), preguntar+revisar deliberación completa (Stage 1→2→3), gestionar conversaciones (sidebar Phase 1: rename inline + delete + search progresivo), adjuntar archivos.
- Nielsen heuristic audit de las 10 heurísticas con escala de severidad **Nielsen 0–4 original** (0=no es problema → 4=usability catastrophe).
- Audit + redesign cubren tanto el UI actual (baseline + componentes Phase 1) como las **superficies hipotéticas de Phase 3 que tendrán DOM**: Quality toggle (con coste visible) y reasoning_details disclosure panel (RSCH-05).
- UX redesign proposal: explora **3 direcciones tonales contrastadas** — `Research notebook`, `Tactical cockpit`, `Claude-like minimal` — con paleta + tipografía + IA distintas. Una se elige al final de la fase para que Phase 4 implemente.
- Mockups: ASCII/markdown wireframes para cobertura estructural + un **HTML throwaway sketch por cada una de las 3 direcciones** (vía `/gsd-sketch`) que materializa tipografía real, paleta real, microinteracciones básicas. La elección entre direcciones se hace mirando los HTML, no descripciones.
- Ambos modos `light` + `dark` viven en cada dirección desde Phase 2 (no se pospone uno a v2).
- Cobertura mínima de pantallas en mockups: cold start / welcome state, sidebar (con search, three-dot, modal de delete, inline rename), input + adjuntos + Quality toggle, Stage 1 con tabs + reasoning disclosure colapsado, Stage 2 con de-anonimización + aggregate rankings, Stage 3 con synthesis + download, header de app branded.

**Out of scope (this phase):**
- **Stage 4 refinement UI** (RSCH-03) — Phase 3 decide cómo se presenta cuando se gatilla la refinement.
- **Header de mensaje guardado con metadata `profile`** (QUAL-04) — Phase 3 lo monta inline; Phase 2 solo asegura que el espacio existe en el mockup del Stage container.
- **Toggle interactivo entre light y dark** (UX-V2-02) — Phase 2 entrega ambas paletas, pero el switcher en runtime es v2.
- **Cualquier código** — Phase 2 no toca `frontend/src/` ni `backend/`. Solo `.planning/ux/`.
- **Restyle de componentes Phase 1 in-place** — Phase 4 hace ese trabajo basándose en los mockups de Phase 2.
- **Test plan / accessibility audit a nivel WCAG estricto** — el redesign considera contraste y jerarquía pero no produce un informe WCAG formal.
- **Tipografía / paleta dictada externamente** — el `ui-ux-designer` agent las propone con rationale; el usuario no tiene restricciones de licencia o marca preexistentes.

</domain>

<decisions>
## Implementation Decisions

### Cognitive walkthrough scope (UXR-01)

- **D-01:** El walkthrough cubre 4 flujos completos:
  1. **Cold start** — primer arranque sin conversaciones; valida descubribilidad del welcome state y del CTA "New Conversation".
  2. **Ask + review** — escribir pregunta → SSE streaming → navegar tabs Stage 1 → leer evaluaciones Stage 2 con de-anonimización + aggregate rankings → leer Stage 3 → descargar markdown.
  3. **Manage conversations** — three-dot menu, modal de delete, edición inline del título, search progresivo (title-first + content-fallback affordance).
  4. **Attachments** — drag-and-drop / file picker, ver chips, eliminar attachment, errores de tamaño (500KB/file, 2MB total).
- **D-02:** Cada flujo se documenta usando la skill `cognitive-walkthrough` (4 preguntas por paso: ¿qué intenta el usuario?, ¿qué hay disponible?, ¿es la acción correcta visible?, ¿el feedback es comprensible?). Output bajo `.planning/ux/01-cognitive-walkthrough.md`.

### Nielsen heuristic audit rubric (UXR-02)

- **D-03:** Severity scale = **Nielsen original 0–4** (0=no es problema, 1=cosmetic, 2=minor, 3=major, 4=catastrophe). Phase 4 prioriza arreglar todos los findings ≥3.
- **D-04:** El audit cubre las 10 heurísticas Nielsen. Output bajo `.planning/ux/02-nielsen-audit.md`. Tabla por heurística con: rating, findings con evidence (selector / screenshot ASCII / línea de código si relevante), severity, fix recommendation.
- **D-05:** El audit incluye **superficies hipotéticas de Phase 3** (Quality toggle, reasoning_details disclosure) marcándolas como "anticipatory finding" — esto fuerza que la propuesta de redesign considere las heurísticas desde el diseño y no como retrofit.

### Redesign proposal — exploration breadth (UXR-03)

- **D-06:** El redesign proposal explora **3 direcciones tonales contrastadas**, no una propuesta lineal. Se entregan en paralelo y se elige una al final de la fase. Razón: tu perfil es decisión basada en evidencia (BI/data); ver las 3 lado a lado es más informativo que leer descripciones.
- **D-07:** Las 3 direcciones son:
  1. **"Research notebook"** — calmo, claro, generoso en whitespace. Inspiración: Linear (sidebar denso + jerarquía fuerte) + Notion / Obsidian / Are.na (lectura editorial larga). Encaja con la lectura profunda de Stage 2/3.
  2. **"Tactical cockpit"** — denso, info-rico, terminal-flavored. Inspiración: Raycast (paleta nocturna + bordes finos + atajos visibles). Encaja con uso BI/data, costes y rankings prominentes.
  3. **"Claude-like minimal"** — silencioso, ligero, una decisión a la vez. Inspiración: claude.ai / Anthropic / Vercel docs. Tipografía generosa, paleta arenosa, microinteracciones discretas.
- **D-08:** El "Brutalist editorial" se descartó explícitamente por desproporcionado para una herramienta de uso diario.
- **D-09:** Cada dirección incluye: paleta (light + dark), sistema tipográfico (1–2 familias propuestas con rationale), microinteracciones básicas, IA principal (sidebar + main panel + Stage layout), y stance sobre densidad informacional.
- **D-10:** Cada dirección tiene **filosofía de paleta propia** — no es el mismo sistema con distinto hue. Notebook = neutros calmos + 1 acento cálido. Cockpit = oscuros saturados + acentos cromados/neón discretos. Minimal = arenas + un acento muy pulido. Esto fuerza diferenciación real.
- **D-11:** Output bajo `.planning/ux/03-redesign-proposal.md` con sub-secciones por dirección. La sección final "Recommendation & decision" queda vacía hasta que el usuario elige (post-Phase 2 plan execution, antes de cerrar la fase).

### Mockup format & fidelity (UXR-04)

- **D-12:** Mockups en **dos capas**:
  1. **ASCII / markdown wireframes** para cobertura estructural completa (todas las pantallas y estados clave). Output bajo `.planning/ux/04-mockups/wireframes.md`.
  2. **HTML throwaway sketches** — uno por cada una de las 3 direcciones tonales, vía `/gsd-sketch`. Cada sketch es one-page, muestra tipografía real, paleta real (con toggle light/dark visible), microinteracciones básicas (hover de Quality toggle, transición entre stages). Output bajo `.planning/ux/04-mockups/sketch-notebook.html`, `sketch-cockpit.html`, `sketch-minimal.html`.
- **D-13:** Cobertura mínima de pantallas/estados en wireframes:
  - Cold start / welcome state (sin conversaciones)
  - Sidebar: lista, hover (three-dot visible), three-dot menu abierto, search vacío, search con matches por título, search ≥3 chars sin matches mostrando affordance "Search inside content (N)", inline rename activo, modal de delete abierto.
  - Input area: estado vacío, con texto, con attachments (chip list), Quality toggle (estados Fast / Quality / Quality+Research, con coste visible).
  - Stage 1: tabs por modelo, contenido renderizado markdown, **disclosure colapsado "Show reasoning" + estado expandido** (RSCH-05).
  - Stage 2: tabs de evaluaciones, de-anonimización (label_to_model bold), aggregate rankings con avg position + vote count.
  - Stage 3: synthesis con highlight visual, download button.
  - Header de app branded (nombre + icono).
  - Empty / error / loading states genéricos.
- **D-14:** **Light + Dark** se entregan ambos modos en cada dirección, en cada sketch HTML y donde sea relevante en ASCII (paleta swatches + ejemplo). Razón: el toggle interactivo es v2 pero el sistema de tokens debe contemplar ambos desde Phase 2.
- **D-15:** Los HTML throwaway son **deliberadamente desechables** — no son código de producción, no se reutiliza nada en Phase 4 directamente. Sirven como contrato visual.

### Aesthetic & references (UXR-03 / UXR-04 inputs)

- **D-16:** Modo: **Light + Dark desde Phase 2**, ambos canónicos (no uno principal y otro retrofit). Toggle runtime es v2.
- **D-17:** Referencias por dirección (no usar todas en una sola — guían la dirección que comparten):
  - Notebook → Linear, Notion, Obsidian, Are.na.
  - Cockpit → Raycast, Datadog, herramientas SRE.
  - Minimal → claude.ai, Anthropic.com, Vercel docs.
- **D-18:** **Tipografía y paleta delegadas al `ui-ux-designer` agent** con criterios research-backed: legibilidad para texto largo (Stage 2/3), soporte de glifos, peso del archivo, licencia, encajar con la dirección tonal. Sin restricciones externas (no hay licencia preexistente del usuario que respetar). El agent propone 1–2 sistemas tipográficos por dirección con rationale.

### Carry-forward de Phase 1 (no re-discutido)

- **D-19:** Los mockups deben re-estilizar los componentes Phase 1 que ya viven en código con estilo provisional Bootstrap-flavored: `Modal`, `Menu`, three-dot icon (`⋮`), inline rename input, search input + affordance "Search inside content (N)". Su función está validada (Phase 1 verified); Phase 2 propone su forma final visual.
- **D-20:** El diseño respeta el patrón "1 conversación = 1 deliberación" (single-shot input, oculto tras el primer envío). NO se propone multi-turn input — eso es Out of Scope del milestone (PROJECT.md / REQUIREMENTS.md).

### Claude's Discretion

- **CD-01:** Microcopia exacta para el modal de delete, los tooltips del Quality toggle, los placeholder texts del search y del input — el `ui-ux-designer` agent escribe propuestas; user revisa al elegir dirección.
- **CD-02:** Cómo se renderiza visualmente el "coste estimado" en el Quality toggle (chip al lado del label, prefijo `~$0.001`, badge cromado, etc.) — el agent decide por dirección, todas deben hacer el coste visible per PROJECT.md/Constraints.
- **CD-03:** Qué animaciones / transiciones cubren los HTML sketches — el agent decide al menos hover del toggle y transición entre Stage 1→2→3; resto a su criterio.
- **CD-04:** Estructura interna de los archivos en `.planning/ux/` (subdirectorios, nombres exactos) — la propuesta D-11..D-12 es la línea base; planner puede ajustar si descubre algo durante research.
- **CD-05:** Si durante la fase aparecen findings críticos del audit que afectan la elección de dirección tonal (p.ej. una heurística que solo "notebook" puede satisfacer bien), el redesign proposal puede reducir las 3 direcciones a 2 o reorientarlas — pero debe quedar registrado por escrito en `03-redesign-proposal.md` con rationale.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Project context, Active hypothesis (incluye UXR-\* y la mandatory "UX-first: visible-UI work cannot start until the UX research phase has produced artifacts"), Constraints (BYOK, single-user, coste visible en selector).
- `.planning/REQUIREMENTS.md` §UX Research — UXR-01..UXR-04 con sus skills mandatorias asignadas (`cognitive-walkthrough`, `nielsen-heuristics-audit`, `ui-ux-designer`, `impeccable` y/o `frontend-design`).
- `.planning/REQUIREMENTS.md` §Quality Dial y §Pragmatic Deep Research — QUAL-01..QUAL-04, RSCH-01..RSCH-05 definen las superficies hipotéticas que Phase 2 mockea anticipadamente.
- `.planning/REQUIREMENTS.md` §Visual Identity — VIS-01..VIS-04 son el **consumidor** de los artefactos de Phase 2; los mockups deben tener fidelidad suficiente para satisfacer estos requisitos en Phase 4 sin volver a decidir.
- `.planning/ROADMAP.md` §Phase 2 — Goal y success criteria. §Phase 4 — recordatorio de que "no design decisions to make" en Phase 4.
- `.planning/STATE.md` — estado actual; Phase 1 cerrada, output Phase 2 sienta el contrato visual para Phases 3 y 4.

### Phase 1 (precedente — surfaces a re-estilizar)
- `.planning/phases/01-hardening-conversation-management/01-CONTEXT.md` §Specifics — ASCII mockup aprobado para Modal de delete; ChatGPT-pattern para three-dot menu; texto exacto del affordance "Search inside content (N conversations)".
- `frontend/src/components/Modal.jsx` + `Modal.css` — componente reusable enviado en Phase 1; mockear su nuevo aspecto.
- `frontend/src/components/Menu.jsx` + `Menu.css` — three-dot menu reusable; mockear nuevo aspecto.
- `frontend/src/components/Sidebar.jsx` (398 líneas) — surface más densa del Phase 1: search input, three-dot, inline rename, modal trigger. Es el componente con más variantes a mockear.

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — entender el flujo SSE per-stage y por qué los stages son la unidad visual del UI (no el token).
- `.planning/codebase/STRUCTURE.md` §components/ — inventario de los 7 componentes que reciben restyle en Phase 4 (ChatInterface, Sidebar, Stage1/2/3, Modal, Menu, Markdown).
- `.planning/codebase/CONVENTIONS.md` — patrón de CSS co-located + kebab-case + `.markdown-content` global. Los mockups deben respetar este patrón al definir clases / tokens.
- `.planning/codebase/CONCERNS.md` §Tech Debt — `reasoning_details` capturado pero no renderizado: el reasoning disclosure mockeado en Phase 2 desbloquea RSCH-05.

### Skills mandatorias (mencionadas en REQUIREMENTS.md)
- Skill `cognitive-walkthrough` (project-local o global) — para UXR-01.
- Skill `nielsen-heuristics-audit` — para UXR-02.
- Skill `ui-ux-designer` — para UXR-03 (redesign proposal con rationale).
- Skill `impeccable` y/o `frontend-design` — para UXR-04 (mockups). `/gsd-sketch` provee los HTML throwaway.

### Files this phase produces (todos bajo `.planning/ux/`)
- `.planning/ux/01-cognitive-walkthrough.md` — cubre los 4 flujos D-01.
- `.planning/ux/02-nielsen-audit.md` — 10 heurísticas con escala 0–4, incluye anticipatory findings de superficies Phase 3.
- `.planning/ux/03-redesign-proposal.md` — 3 direcciones tonales paralelas + sección "Recommendation & decision" final.
- `.planning/ux/04-mockups/wireframes.md` — ASCII / markdown wireframes (cobertura D-13).
- `.planning/ux/04-mockups/sketch-notebook.html` — HTML throwaway dirección "Research notebook" con light + dark.
- `.planning/ux/04-mockups/sketch-cockpit.html` — HTML throwaway dirección "Tactical cockpit" con light + dark.
- `.planning/ux/04-mockups/sketch-minimal.html` — HTML throwaway dirección "Claude-like minimal" con light + dark.

### External / library docs
- Ninguna nueva librería se introduce en Phase 2. Phase 4 (consumidor) trabaja con React 19 + Vite 7 + react-markdown ya en stack; los mockups respetan ese marco (no proponer Tailwind, MUI, ni Bootstrap — Phase 4 puede usar CSS modules / vanilla CSS / CSS variables).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (a re-estilizar, no a refactorizar)
- `frontend/src/components/Modal.jsx` (129 líneas) — focus trap manual, ESC + click-outside + destructive button distinto. API opinionada (title/body/destructive). Phase 2 mockea su nueva piel; API no cambia.
- `frontend/src/components/Menu.jsx` (84 líneas) — popover con `position: fixed` + viewport clamp, hover-revealed three-dot trigger. Phase 2 mockea estados (hover, abierto, ítems). Items v1 = Rename / Delete; mockup debe acomodar 1–2 más sin redesign (RESEARCH-friendly).
- `frontend/src/components/Sidebar.jsx` (398 líneas, sub-component `ConversationItem`) — la surface más rica: search debounce 200ms, two-tier filter, content-fallback affordance, inline rename con `intentRef` pattern, modal de delete trigger. Phase 2 mockea cada estado.
- `frontend/src/components/ChatInterface.jsx` (276 líneas) — input form (oculto tras primer envío, single-shot), attachments con chip list + size guards, Quality toggle aún no presente (Phase 3 lo añade — mockear el slot anticipadamente).
- `frontend/src/components/Stage1.jsx` (36 líneas) — tabs por modelo + Markdown wrapper. Slot para reasoning disclosure pendiente (RSCH-05) — mockear posición y estado colapsado.
- `frontend/src/components/Stage2.jsx` (99 líneas) — tabs de evaluaciones + de-anonimización (label bold) + aggregate rankings con avg position. La surface más densa de información — el redesign de "cockpit" la pone en el centro.
- `frontend/src/components/Stage3.jsx` (42 líneas) — synthesis + download. Background `#f0fff0` Bootstrap-flavored explícitamente provisional.
- `frontend/src/components/Markdown.jsx` (15 líneas) — wrapper de ReactMarkdown con GFM + highlight.js. **No tiene CSS propio** — su tipografía, espaciado, blocks de código viven en `frontend/src/index.css` `.markdown-content`. Phase 2 mockea cómo se ve markdown renderizado (esto es Stage 2/3 al 90% — crítico).

### Established Patterns (a respetar al diseñar tokens)
- **CSS co-located por componente** (`Stage1.jsx` + `Stage1.css`). Phase 4 implementa los tokens en `index.css` (variables CSS) y consume desde cada `.css` co-located.
- **`.markdown-content` como utility class global** — todos los renders de markdown lo envuelven. Phase 2 considera tipografía, espaciado, blockquotes, code blocks, tables (GFM), inline code.
- **Kebab-case CSS classes** (`.conversation-item`, `.stage-title`). Las clases que aparezcan en mockups respetan este formato si nombran algo nuevo.
- **Single-shot input** — `ChatInterface.jsx:221` esconde el form tras primer envío. Mockups respetan: el welcome state es vital, no es una afterthought.

### Integration Points
- **`frontend/src/App.jsx:loadConversations`** — refresh tras delete/rename. Mockups consideran loading-after-action sutil (no full-screen spinner).
- **SSE per-stage no per-token** (`backend/main.py:140-193`, `frontend/src/api.js:76-114`) — el UI debe comunicar "se está pensando" durante el gap entre stages (15–30s). Mockups proponen una visualización de "stage in progress" no un spinner genérico.
- **Stage 2 cost dominante** (CONCERNS.md) — el coste visible en el Quality toggle debe surfacing especialmente en `Quality+Research` para que el usuario decida conscientemente (PROJECT.md / Constraints).
- **`reasoning_details` ya capturado server-side** (`backend/openrouter.py:48-55`) — Phase 2 mockea cómo se enseña; Phase 3 conecta el dato.

</code_context>

<specifics>
## Specific Ideas

- **Las 3 direcciones tonales están moralmente comprometidas a contrastar, no a converger.** Si en proceso aparece que dos direcciones convergen visualmente, el agent las re-orienta o reduce a 2 (CD-05).

- **Coste visible en Quality toggle** — el `Quality+Research` puede ejecutar queries multi-dolar (PROJECT.md / Budget). Cada dirección debe mostrar coste estimado de forma visualmente coherente con su tono (no como warning genérico). Ejemplos por dirección:
  - Notebook: coste como nota al pie del label (`Quality+Research · ~$0.45 typical`).
  - Cockpit: coste como instrumento (chip cromado con número grande).
  - Minimal: coste como subtle subtitle bajo el label.

- **Los HTML throwaway de cada dirección incluyen toggle light/dark** — un botón visible en esquina superior derecha del sketch. Sirve para que la decisión final no se tome solo en uno de los modos.

- **El reasoning_details disclosure** se mockea en estado colapsado por defecto, expandido en hover/click, dentro de cada Stage 1 tab (no como overlay). Esto se decide ya en Phase 2 para que Phase 3 implemente directo.

- **El header branded** debe contemplar que es un single-user personal app — no necesita logo corporativo Basetis ni nada Pharma-related; el branding es del producto "LLM Council" como herramienta personal. Tono adecuado: confiado pero sin pretender producto comercial.

- **Las pantallas vacías (empty states) son donde el branding más se hace sentir** — cold start, sidebar sin conversaciones, search sin matches. Cada dirección invierte en estos estados con copia y composición distintas (no solo "no results").

</specifics>

<deferred>
## Deferred Ideas

- **Stage 4 refinement UI completo** — RSCH-03; mockup mínimo de "cuándo aparece" en el flow Stage 1→2→3→4 puede entrar pero el contenido detallado de la stage es responsabilidad de Phase 3.
- **Headers de mensaje guardado con metadata profile + lista de modelos + chairman** — QUAL-04; Phase 2 deja slot pero contenido lo decide Phase 3.
- **Toggle interactivo entre light y dark en runtime** — UX-V2-02 v2. Phase 2 entrega ambas paletas; el switcher lo monta una hipotética future phase.
- **Per-message "Regenerate with another profile" button** — QUAL-V2-01 v2. No mockear.
- **Cost estimation pre-send detallado** — QUAL-V2-02 v2. El coste en el Quality toggle es el mínimo viable; el desglose detallado pre-send (tokens estimados × precio × stage) queda para v2.
- **Tags / folders / archive / bulk delete en sidebar** — CONV-V2-01..03 v2. No mockear; sidebar v1 es solo lista plana con search.
- **Inline citations con URL + excerpt previews en synthesis** — RSCH-V2-02 v2. Mockear opcionalmente cómo se ve un link clicable estándar (GFM ya lo soporta), nada custom.
- **Persistir `label_to_model` y `aggregate_rankings`** — PERS-V2-01 v2. Phase 2 asume comportamiento actual (metadata se pierde al recargar); el mockup de Stage 2 muestra el estado "feliz" con metadata viva.
- **Copy-to-clipboard en final answer** — UX-V2-01 v2. No mockear.
- **WCAG strict accessibility report** — fuera de scope; el redesign considera contraste y jerarquía pero no produce informe formal.
- **Brand identity full (logo vectorial, set de iconos custom, illustration style)** — Phase 2 propone nombre + icono simple para el header; un sistema de marca completo es exceso para single-user personal app.

### Reviewed Todos (not folded)
None — `gsd-sdk query todo.match-phase 2` returned `todo_count: 0`. Phase 2 no hereda TODOs sueltos de fases anteriores.

</deferred>

---

*Phase: 2-UX Research & Design Brief*
*Context gathered: 2026-05-09*
