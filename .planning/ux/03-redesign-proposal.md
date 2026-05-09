# Redesign Proposal — LLM Council Visual Direction (Phase 2)

**Fecha:** 2026-05-10
**Phase:** 2 / Plan 03 — UXR-03
**Skill aplicada:** `ui-ux-designer`
**Inputs canónicos:**
- `.planning/ux/01-cognitive-walkthrough.md` — 29 friction points (F-01..F-29).
- `.planning/ux/02-nielsen-audit.md` — 36 findings sobre 10 heurísticas; 11 priority-fix con `Severity: 3` y 2 catastróficos con `Severity: 4`; 6 anticipatory findings sobre Phase 3.

Este documento explora **3 direcciones tonales contrastadas** — `Research notebook`, `Tactical cockpit`, `Claude-like minimal` — siguiendo D-06..D-11 del context. Las 3 se entregan en paralelo con paleta light+dark, sistema tipográfico, microinteracciones, IA y stance sobre densidad. La sección final `Recommendation & decision` se deja vacía: el usuario la rellena en Plan 06 tras revisar wireframes (Plan 04) y HTML sketches (Plan 05).

> **Nota sobre dirección descartada:** "Brutalist editorial" se descartó explícitamente (D-08) por ser desproporcionado para una herramienta personal de uso diario. No aparece como dirección y no se citan referencias brutalist (Bloomberg terminal-grotesque, Are.na editorial maximalist, etc.) en ninguna de las tres direcciones que sí se exploran.

---

## Inputs

### Friction points addressed (from walkthrough)

Selección de los friction points más críticos del walkthrough — cada dirección debe responderlos en su Trade-offs / Maps section:

- **F-06** (high) — Loading indicators no comunican duración esperada ni qué modelos están corriendo (gap 15-30s ciego).
- **F-09** (high) — "Anonymized peer review" se explica con prosa densa, no con visualización; es el feature diferencial.
- **F-25** (high) — Input file nativo del browser, sin estilizar; affordance fuera del lenguaje visual.
- **F-01..F-04** (med) — Cold start no comunica valor diferencial, no enlaza CTA con welcome state, no orienta sobre qué tipo de query justifica usar un council.
- **F-05** (med) — Single-shot input desaparece tras primer envío sin previo aviso.
- **F-11** (med) — Jerarquía visual de Stage 2 plana (h3 → h4 → h4 sin diferenciación).
- **F-12** (med) — Highlight `#f0fff0` Bootstrap-flavored del Stage 3 no comunica "respuesta autoritativa".
- **F-16** (med-high) — Three-dot menu solo en hover; sin hover no hay affordance para Rename / Delete.
- **F-18** (med) — Modal de delete no muestra metadata diferenciadora.
- **F-22** (med) — Affordance "Search inside content" oculto hasta cumplir 3 condiciones.
- **F-26..F-28** (med) — Attachments: extensiones aceptadas no comunicadas, límites no comunicados, errores no orientan recovery.

### Priority fixes (from Nielsen audit)

Los 11 findings con `Severity: 3` o `Severity: 4` que las 3 direcciones deben mitigar a nivel de diseño:

- **H8-02** (Severity: 4) — Sistema tipográfico inexistente para la superficie de lectura crítica (`.markdown-content`). **Catastrófico.**
- **H9-01** (Severity: 4) — Errores async silenciados en `console.error` sin UI feedback. **Catastrófico.**
- **H1-01** (Severity: 3) — Spinners genéricos sin progress per-stage.
- **H1-04** (Severity: 3) — Quality toggle: coste estimado debe ser visible antes de enviar (anticipatory QUAL-03).
- **H3-01** (Severity: 3) — Sin botón Cancel durante deliberación en curso.
- **H4-01** (Severity: 3) — `#f0fff0` Bootstrap-flavored y ausencia de tokens compartidos.
- **H4-02** (Severity: 3) — Dos `.download-btn` con estilos inconsistentes.
- **H5-03** (Severity: 3) — Sin friction extra para el modo más caro Quality+Research (anticipatory QUAL-03).
- **H6-05** (Severity: 3) — `reasoning_details` existe en JSON pero el UI no lo expone (anticipatory RSCH-05).
- **H8-01** (Severity: 3) — Verde Bootstrap rompe jerarquía editorial del final answer.
- **H8-05** (Severity: 3) — Reasoning expandido por default sería catastrofe minimalist (anticipatory RSCH-05).
- **H9-02** (Severity: 3) — Modelos failed filtrados silenciosamente; usuario no diagnostica.
- **H9-04** (Severity: 3) — Errores de rename invisibles.

### Anticipatory surfaces (Phase 3)

Superficies que aún no tienen DOM pero las 3 direcciones DEBEN diseñar para evitar retrofit:

- **Quality toggle** (QUAL-03) — selector 3-state Fast / Quality / Quality+Research con coste estimado visible. Cada dirección entrega su tratamiento visual del coste — D-Specifics CD-02.
- **`reasoning_details` disclosure** (RSCH-05) — colapsado por default dentro de cada Stage 1 tab, expandible por click, NO overlay. Cada dirección decide la forma del control (chip, accordion, spoiler).

### Constraints

- **Single-user local app** — no hay marketing, no hay landing, no hay multi-tenant. El primer contacto del usuario es la app abierta en `localhost:5173`.
- **Light + Dark ambos canónicos desde Phase 2** (D-14, D-16) — el toggle interactivo runtime es v2; ambos modos viven como sistema completo.
- **Sin licencia tipográfica preexistente** — el `ui-ux-designer` agent propone con criterios research-backed (D-18). Open-source preferido.
- **CSS vanilla / CSS variables / co-located** (CONVENTIONS.md) — NO Tailwind, NO MUI, NO Bootstrap. Los tokens propuestos asumen `:root` variables en `index.css` consumidas desde cada `.css` co-located.
- **Single-shot input preservado** (D-20) — `1 conversación = 1 deliberación`. Ninguna dirección propone multi-turn.
- **Header branded sin logo corporativo** — tono "producto personal serio", no "tool comercial Basetis-pharma".
- **`.markdown-content` global como utility class** — Stage 1/2/3 son 90% markdown renderizado; cada dirección define tipografía, escala, line-height, max-width y bloques de código que viven en esa clase.
- **Convergencia prohibida** (CD-05) — si dos direcciones convergen visualmente durante exploración, este documento las re-orienta o reduce a 2 con rationale.

---

## Direction A: Research notebook

> **Filosofía tonal:** calmo, claro, generoso en whitespace. Una herramienta para pensar despacio sobre decisiones que importan. La pantalla parece la página de un cuaderno de investigación bien tipografiada — no compite por la atención, la sostiene.

### Tone & references

Referencias D-17 (sin cross-pollination con Cockpit ni Minimal):

- **Linear** — sidebar denso bien jerarquizado; transiciones de estado limpias; uso disciplinado de un único accent color.
- **Notion** — typography editorial larga; spacing vertical generoso; hover states discretos sin cambios bruscos.
- **Obsidian** — render markdown como ciudadano de primera; jerarquía tipográfica fuerte (h1 vs h2 vs body claramente distintos); soporte nativo para callouts.
- **Are.na** — composición editorial calmada; uso de serifa para body cuando el contenido lo merece; respeto por el ritmo de lectura.

Lo que NO se toma de estas referencias: la complejidad de teclado de Linear (muy power-user), la maleabilidad de Notion (no necesitamos drag-and-drop reorder), la red social de Are.na (irrelevante).

### Palette (light)

Filosofía: **neutros calmos + 1 acento cálido**. La paleta light evoca papel hecho a mano (off-white ligeramente cálido), tinta no-negra para reducir fatiga, y un único acento **terracota** para todas las acciones primarias y los highlights del Stage 3.

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#FAF8F4` | Fondo base (papel) | — |
| `--color-bg-secondary` | `#F2EFE8` | Fondo del sidebar, surfaces sunken | — |
| `--color-bg-elevated` | `#FFFFFF` | Cards, modal, popover | — |
| `--color-fg-primary` | `#2A2724` | Texto principal (tinta cálida, no negro puro) | 14.8:1 |
| `--color-fg-secondary` | `#6B635A` | Texto secundario, metadata | 5.6:1 |
| `--color-fg-muted` | `#9A9088` | Microcopy, placeholders | 3.4:1 |
| `--color-accent` | `#B05A2A` | Acento terracota — botones primarios, links, Stage 3 highlight | 5.7:1 |
| `--color-accent-soft` | `#EFD9C5` | Tints del acento — Stage 3 background, hover muy sutil | — |
| `--color-border-subtle` | `#E5DFD4` | Bordes de cards, separadores | — |
| `--color-border-strong` | `#C8BFB2` | Bordes de inputs, focus secundario | — |
| `--color-focus-ring` | `#B05A2A` (alpha 0.35) | Outline de focus accesible | — |
| `--color-error` | `#A03828` | Errores; cromáticamente cercano al acento para no ser ruidoso | 5.9:1 |
| `--color-warn` | `#8C6620` | Advertencias (límite cerca de attachments, coste alto Quality+Research) | 5.4:1 |

### Palette (dark)

Filosofía: misma paleta cálida, traducida a un dark calmo (NO un negro frío programador-style). Es el cuaderno con luz baja, no la cabina nocturna.

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#1C1A17` | Fondo base | — |
| `--color-bg-secondary` | `#23201D` | Sidebar | — |
| `--color-bg-elevated` | `#2A2723` | Cards, modal | — |
| `--color-fg-primary` | `#EFEAE2` | Texto principal | 14.1:1 |
| `--color-fg-secondary` | `#B5ADA1` | Texto secundario | 7.0:1 |
| `--color-fg-muted` | `#7E766C` | Microcopy | 4.0:1 |
| `--color-accent` | `#E08A4F` | Terracota más luminoso para mantener legibilidad sobre dark | 8.0:1 |
| `--color-accent-soft` | `#3A2A20` | Stage 3 background tintado | — |
| `--color-border-subtle` | `#34302B` | Separadores | — |
| `--color-border-strong` | `#4A443D` | Bordes input | — |
| `--color-focus-ring` | `#E08A4F` (alpha 0.45) | Outline focus | — |
| `--color-error` | `#D86B55` | Error legible sobre dark | 6.6:1 |
| `--color-warn` | `#C99650` | Warn | 8.5:1 |

### Typography

Sistema 2-familia con rationale research-backed:

- **Body & long-form (Stage 1/2/3, user message):** **Source Serif 4 Variable** (Adobe, SIL Open Font License). Justificación: x-height generosa (>0.5em), buen tracking en `1.6` line-height, soporte completo Latin Extended (acentos español garantizados), variable axis para weight y optical size que permite afinar la lectura larga sin cargar archivos extra. Stage 2 + Stage 3 son lectura larga real (pueden ser 2000+ palabras en Quality+Research) — pedirlo a una sans-serif system-ui es maltratar al lector. Rationale alineado con H8-02 (catastrofe tipográfica del baseline).
- **UI & headings:** **Inter Variable** (Rasmus Andersson, SIL OFL). Justificación: rendering óptimo a 13–15px (sidebar items, tabs, microcopy), pesos finos (400/500/600) bien diferenciados, soporte tabular numerals para timestamps y ranking numbers de Stage 2, glifos completos para iconos `⋮` y similares.
- **Mono (code, file paths, model IDs):** **JetBrains Mono Variable** — usado solo para code blocks dentro de markdown, model identifiers (`openai/gpt-5-mini`), y attachment filenames.

Tabla de roles:

| Rol | Familia | Size | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- | --- | --- |
| `display` (Stage 3 title) | Source Serif 4 | 2rem (32px) | 600 | 1.25 | -0.01em |
| `h1` (Welcome, page titles) | Source Serif 4 | 1.625rem (26px) | 600 | 1.3 | -0.005em |
| `h2` (Stage titles) | Source Serif 4 | 1.375rem (22px) | 600 | 1.35 | 0 |
| `h3` (sub-sections) | Inter | 1.125rem (18px) | 600 | 1.4 | 0 |
| `body` (Stage content, markdown) | Source Serif 4 | 1.0625rem (17px) | 400 | 1.65 | 0 |
| `body-small` (Sidebar items, metadata) | Inter | 0.875rem (14px) | 400 | 1.5 | 0 |
| `code` (inline + blocks) | JetBrains Mono | 0.9375rem (15px) inline / 0.875rem block | 400 | 1.55 | 0 |
| `label` (buttons, form labels) | Inter | 0.8125rem (13px) | 500 | 1.4 | 0.01em |
| `microcopy` (cost subtitle, hints) | Inter | 0.75rem (12px) | 400 | 1.4 | 0 |

Max-width contenida en `.markdown-content`: **65ch** (≈ 720px en body 17px). Esto resuelve directamente H8-02.

### Microinteractions

Todas las microinteracciones son **calmas** (durations 150–300ms, ease-out preferido sobre ease-in-out, sin overshoot/spring).

1. **Hover de botones / sidebar items:** background fade `--color-bg-secondary` → tint sutil del acento `rgba(176, 90, 42, 0.06)` durante `180ms ease-out`. Sin transform, sin scale.
2. **Transición Stage 1 → 2 → 3:** **progress strip horizontal en la parte superior del main panel** (3 segmentos: `Stage 1 · 4 modelos`, `Stage 2 · evaluating`, `Stage 3 · synthesis`). Cada segmento tiene 3 estados (`pending`, `active`, `done`). Active muestra dots animados (3 dots cíclicos `220ms` cada uno). Done aplica fade del segmento al `--color-accent-soft` durante `300ms ease-out`. Resuelve F-06 + H1-01.
3. **Hover del Quality toggle:** subtitle de coste hace fade-in `120ms` (`opacity 0 → 1`); el segmento hover gana un `box-shadow: inset 0 0 0 1px var(--color-accent)`. Transición `160ms`.
4. **Expansión del `reasoning_details` disclosure:** **accordion vertical** dentro de la tab Stage 1, debajo del response. Expansion `220ms cubic-bezier(0.4, 0, 0.2, 1)` con `max-height` animado. Chevron `›` rota `90deg` durante la misma curva. Tipografía del expanded usa `--color-fg-secondary` y size `body-small` para quedar jerárquicamente debajo (resuelve H8-05).

### Information architecture

```
+------------------------------------------------------------------+
| Header (52px) — "LLM Council" serif + theme toggle (placeholder) |
+------------+-----------------------------------------------------+
| Sidebar    | Main panel                                          |
| (280px)    |  +-----------------------------------------------+  |
|            |  | Progress strip (Stage 1 · 2 · 3) — 36px       |  |
| + New      |  +-----------------------------------------------+  |
| Search     |  |                                               |  |
| ────────── |  |  User message card                            |  |
| · Item 1   |  |                                               |  |
| · Item 2   |  |  Stage 1 (tabs por modelo, accordion          |  |
| · Item 3   |  |    reasoning colapsado)                       |  |
|            |  |                                               |  |
|            |  |  Stage 2 (peer review visualization +         |  |
|            |  |    aggregate ranking table)                   |  |
|            |  |                                               |  |
|            |  |  Stage 3 (final answer — soft accent tint     |  |
|            |  |    background, NOT bootstrap green)           |  |
|            |  +-----------------------------------------------+  |
+------------+-----------------------------------------------------+
```

- **Sidebar:** `280px` ancho (un poco más generoso que Linear `260px` para acomodar títulos largos sin truncar). Header `52px`. Border derecho `--color-border-subtle`.
- **Header global:** `52px`. Logotipo del producto en serif (`Source Serif 4`, weight 600) — no logo vectorial, branding tipográfico. Theme toggle visible en esquina superior derecha como un small button (sin función runtime en Phase 4 v1, pero el slot existe — UX-V2-02 deferred).
- **Main panel:** padding lateral `clamp(24px, 5vw, 64px)`. La progress strip flota inmediatamente bajo el header durante la deliberación, desaparece (collapse animado) al completarse.
- **Welcome state:** ocupa el centro del main panel con copy editorial — un h1 "What do you want to think about today?" en serif (no "Welcome to LLM Council" seco), 2-3 ejemplos de queries council-suited en `body-small` italic gris (resuelve F-04).
- **Responsive:** desktop-first. Mobile (≤ 768px) colapsa el sidebar a un drawer; no es prioridad del milestone.

### Density stance

**Densidad media.** Whitespace generoso pero información completa — el sidebar muestra título + count, no solo título. Stage 2 muestra evaluación raw + parsed ranking + aggregate todo a la vez (sin esconder), pero con jerarquía tipográfica fuerte que separa visualmente cada bloque. La idea: la página debería sentirse como abrir un cuaderno bien anotado, no como leer una tabla de Excel.

### Cost surfacing in Quality toggle

El coste aparece **como nota al pie del label**, en `microcopy` (12px) `--color-fg-muted`. Tono editorial, no alarmista. La forma:

```
+----------------------------------------------------------------+
|  Quality dial                                                  |
|                                                                |
|  ( ◉ ) Fast              ( ○ ) Quality       ( ○ ) Quality+Research |
|        ~$0.001 typical         ~$0.05 typical      ~$0.45 typical · web search |
|                                                                                |
+----------------------------------------------------------------+
```

Selected state: el segmento activo gana un subtle border `--color-accent` (1px) + el subtitle de coste cambia a `--color-fg-secondary` (más legible). Hover sobre Quality+Research muestra tooltip footnote-style: `"~$0.45 típico · puede llegar a $3 en queries con búsqueda web extensa"`. **Sin modal de confirmación adicional** — el coste visible + el subtitle bastan para H5-03 en una tonal calmada (la friction extra rompería el tono de la dirección).

### Reasoning_details disclosure pattern

**Accordion vertical** dentro de cada Stage 1 tab, debajo del response renderizado. Cerrado por default. El control es un botón inline de ancho contenido:

```
─────────────────────────────────────
[respuesta del modelo, markdown]
...
─────────────────────────────────────
›  Show reasoning · 1,247 tokens
─────────────────────────────────────
```

Click → chevron rota a `90°`, accordion expande con `max-height` animado a `220ms`. Reasoning expanded usa `--color-fg-secondary` y `body-small` (15px) — jerárquicamente queda debajo del response (resuelve H8-05). La línea horizontal que separa cuerpo de disclosure es `--color-border-subtle`.

### Empty / loading / error states

- **Cold start (welcome state):** un h1 grande en serif `"What do you want to think about today?"`, debajo en `body-small` italic los 3 ejemplos: `"Should I migrate this Snowflake schema to a star model?"`, `"Compare strategies for handling currency conversion in pharma BI"`, `"Review my approach to incremental partition pruning"`. Resuelve F-01, F-04, H10-03.
- **Loading per stage:** progress strip horizontal con tres segmentos (ya descrito en Microinteractions). Cada segmento active muestra abajo, en `microcopy`, la lista de modelos (`gpt-5-mini · claude-sonnet-4-5 · gemini-2.5-pro · grok-4` — resuelve F-06). Failed model gana un `⚠` rojo y nombre tachado.
- **Error global (SSE failure, H9-01):** banner persistente en la parte superior del main panel (no toast efímero — banner para que la presencia del error sea innegable), `--color-error` con copy `"La deliberación se interrumpió en Stage X. ¿Quieres reintentar con la misma pregunta?"` + botón `Retry` que reusa el último prompt.
- **Sidebar vacío:** ilustración tipográfica (gran ampersand serif `&` en `--color-fg-muted`, weight thin) + copy `"No conversations yet. Start one to see it here."` — el branding del cold start vive aquí.
- **Search sin matches:** copy `"No matches for \"<query>\". Try the content search to look inside conversations."` con un link directo al affordance content-search (resuelve F-22 + F-24 — el affordance ya no es oculto, está en el empty state).

### Phase 1 components restyling notes

- **Modal (delete confirmation):** background `--color-bg-elevated` (`#FFFFFF` light / `#2A2723` dark), border `--color-border-subtle` 1px, radius `8px`, shadow muy suave (`0 8px 24px rgba(42, 39, 36, 0.08)`). Title en `h2` serif. Body añade metadata diferenciadora (resuelve F-18): `"\"Pricing analysis\" · 4 messages · 3 days ago"`. Botón Cancel: ghost (sin fill, border `--color-border-strong`). Botón Delete: filled `--color-error`, copy `"Delete conversation"`.
- **Menu (popover three-dot):** background `--color-bg-elevated`, radius `6px`, shadow elevated (`0 4px 12px rgba(42, 39, 36, 0.10)`), padding `4px 0`. Items en `label` (Inter 13px) con padding `8px 12px`. Cada item con shortcut a la derecha en `--color-fg-muted` (Rename `R`, Delete `⌫`). Hover: background `--color-accent-soft`.
- **Three-dot icon (`⋮`):** color `--color-fg-muted` por default, `--color-fg-primary` en hover. **Persistentemente visible en la fila activa** del sidebar (resuelve F-16) — solo se oculta para filas no-activas no-hovered. Esto es una desviación deliberada del pattern ChatGPT estricto, justificada por la severidad H6-02 + F-16.
- **Inline rename input:** sin border-bottom solo, sino un border completo `1px --color-border-strong` para que el affordance sea claro; background `--color-bg-elevated` (lift sutil sobre la fila); aparece un hint `microcopy` debajo del input mientras está activo: `"Enter para guardar · Esc para cancelar"` (resuelve F-20).
- **Search input:** `1px --color-border-subtle` por default, `--color-accent` en focus, placeholder `"Search conversations…"` en `--color-fg-muted`. El affordance "Search inside content (N)" aparece **siempre** debajo del input cuando hay query con ≥1 char y title-matches < total — no esperando 3 condiciones (resuelve F-22). Style: link inline subtle, no botón prominente.

### Maps to friction & audit findings

**Friction addressed (≥3 F-XX IDs from `01-cognitive-walkthrough.md`):**
- **F-06** (loading 15-30s ciego) — progress strip + lista de modelos en microcopy + dots animados.
- **F-09** (peer-review prose densa) — Stage 2 reorganizado con jerarquía serif h2 fuerte, ranking numerado tabular, separación visual entre raw evaluations / aggregate.
- **F-12** (verde Bootstrap del Stage 3) — reemplazado por background `--color-accent-soft` + border-left `--color-accent` 3px y h2 serif, comunicando "respuesta autoritativa" sin alert-toast vibe.
- **F-04** (no orientación cold start) — welcome state con 3 ejemplos serif italic.
- **F-16** (three-dot solo hover) — three-dot persistente en fila activa.
- **F-20** (rename sin shortcuts) — hint debajo del input.
- **F-22** (content search oculto) — affordance siempre visible cuando aplica con ≥1 char.

**Nielsen findings addressed (≥3 HN-XX IDs from `02-nielsen-audit.md`):**
- **H8-02** (Severity: 4 — typography catastrophe) — sistema completo Source Serif 4 + Inter + max-width 65ch + line-height 1.65.
- **H9-01** (Severity: 4 — silent errors) — banner persistente con retry, no toast efímero.
- **H1-01** (Severity: 3 — spinners genéricos) — progress strip + lista de modelos.
- **H1-04 + H5-03** (Severity: 3 — Quality toggle cost surfacing) — coste como subtitle microcopy bajo cada label.
- **H4-01** (Severity: 3 — no shared tokens) — sistema completo de tokens kebab-case.
- **H6-05 + H8-05** (Severity: 3 — reasoning_details) — accordion vertical colapsado, expansión jerárquicamente sub-tipográfica.
- **H8-01** (Severity: 3 — verde Bootstrap) — accent terracota suave reemplaza el verde.

### Trade-offs

- Densidad MEDIA — un usuario que viene de Datadog o Raycast puede sentir que sobra whitespace. Esa audiencia la captura mejor la dirección B (Cockpit).
- Source Serif 4 es ~120KB woff2 (variable subset Latin) — peso aceptable para single-user local app, prohibitivo para web masivo (no aplica aquí).
- Sin modal de confirmación extra para Quality+Research — la friction se entrega via cost subtitle visible, NO via doble-click (rompería el tono).
- Mobile no es priority — esta dirección está optimizada desktop ≥1280px.

---

## Direction B: Tactical cockpit

> **Filosofía tonal:** denso, info-rico, terminal-flavored. Una herramienta de instrumentación para alguien que ya sabe lo que está pidiendo. Cada pixel transporta data; el coste, el tiempo, el ranking, el modelo, el publisher — todo visible, cromado, sin esconderse detrás de UX cortés.

### Tone & references

Referencias D-17 (sin cross-pollination con Notebook ni Minimal):

- **Raycast** — paleta nocturna profesional; bordes finos como instrumento; acentos cromados; iconografía monocromática 1px-stroke; densidad alta sin ruido.
- **Datadog** — dashboards densos con jerarquía cromática (verde/amber/red status); tabular numerals para métricas; readability sobre dark backgrounds.
- **Herramientas SRE / observability** (Grafana dashboards, Honeycomb) — convención de "todo es un widget con border + label + value" + chips cromados para status.

Lo que NO se toma: la marca de Raycast (colorful icon palette pop), la complejidad estructural de Datadog (no necesitamos panels reorderables), la densidad excesiva de Bloomberg (caería en brutalismo descartado D-08).

### Palette (light)

Filosofía: **oscuros saturados + acentos cromados/neón discretos**. La paleta light NO es un azul-gris programador; es un dark light-mode (un slate frío con high contrast). Acento cyan saturado para focus + un neon green discreto para "done" status + un amber para "active/pending".

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#F5F6F8` | Fondo base (slate cool) | — |
| `--color-bg-secondary` | `#E8EAEF` | Sidebar, surfaces sunken | — |
| `--color-bg-elevated` | `#FFFFFF` | Widgets, cards, modal | — |
| `--color-bg-instrument` | `#1A1F2A` | Slabs cromados (status chips, cost chip) | — |
| `--color-fg-primary` | `#0F1419` | Texto principal (slate dark, casi negro) | 17.2:1 |
| `--color-fg-secondary` | `#4A535F` | Texto secundario | 7.5:1 |
| `--color-fg-muted` | `#828B96` | Microcopy | 4.0:1 |
| `--color-fg-on-instrument` | `#E8EAEF` | Texto sobre `--color-bg-instrument` | (vs #1A1F2A) 12.4:1 |
| `--color-accent` | `#0090C9` | Cyan saturado — focus, primary actions | 5.1:1 |
| `--color-accent-bright` | `#00B5E8` | Cyan brillante para acentos cromados puntuales | 4.0:1 |
| `--color-status-active` | `#D88A1F` | Amber para "running" / "pending" | 3.6:1 (decorativo, no body text) |
| `--color-status-done` | `#16A34A` | Green discreto para "completed" | 4.7:1 (decorativo) |
| `--color-status-failed` | `#DC2626` | Red para failed model | 5.5:1 |
| `--color-border-subtle` | `#D4D8DF` | Bordes finos de widgets | — |
| `--color-border-strong` | `#1A1F2A` | Border instrument 1px sólido | — |
| `--color-focus-ring` | `#00B5E8` (alpha 0.5) | Outline focus brillante | — |

### Palette (dark)

Filosofía: el modo dark es el modo natural — paleta nocturna saturada con los mismos acentos cromados intensificados.

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#0B0E14` | Fondo base (deep slate) | — |
| `--color-bg-secondary` | `#0F1319` | Sidebar | — |
| `--color-bg-elevated` | `#161B23` | Widgets, modal | — |
| `--color-bg-instrument` | `#1F2630` | Slabs cromados (más claros que el bg base) | — |
| `--color-fg-primary` | `#E8EAEF` | Texto principal | 14.0:1 |
| `--color-fg-secondary` | `#A4ACB7` | Texto secundario | 7.4:1 |
| `--color-fg-muted` | `#6B7380` | Microcopy | 4.0:1 |
| `--color-fg-on-instrument` | `#E8EAEF` | Texto sobre instrument | — |
| `--color-accent` | `#22C7F0` | Cyan brillante eléctrico | 11.1:1 |
| `--color-accent-bright` | `#5BD9F5` | Cyan más claro, glow para hover | 13.0:1 |
| `--color-status-active` | `#EAB54A` | Amber luminoso | 11.8:1 |
| `--color-status-done` | `#3FCB6E` | Green | 11.5:1 |
| `--color-status-failed` | `#F26F65` | Red | 7.0:1 |
| `--color-border-subtle` | `#1F2630` | Border 1px hairline | — |
| `--color-border-strong` | `#3A4250` | Border instrument | — |
| `--color-focus-ring` | `#22C7F0` (alpha 0.55) | Outline cyan glow | — |

### Typography

Sistema **mono-everything con sans para body markdown**. Esta dirección abraza el terminal-flavor de forma disciplinada.

- **UI, headings, labels, sidebar, tabs:** **JetBrains Mono Variable** (Apache 2.0). Justificación: ligaduras programáticas que se leen "instrumentadas" sin ser kitsch, tabular numerals automáticos (críticos para timestamps + ranking + cost), pesos bien diferenciados (400/500/700), x-height alta para tamaños 12-14px del UI. Es la decisión característica de la dirección.
- **Body markdown (Stage 1/2/3 content):** **IBM Plex Sans Variable** (SIL OFL). Justificación: pareja diseñada para coexistir con IBM Plex Mono (familia hermana de JetBrains Mono); soporta Latin Extended; weight 400 legible en `body` 16px; cuando un modelo escribe prosa larga necesitamos sans humanista clean, no la mono que cansa los ojos en >300 palabras. **No** se usa serif aquí — rompería el tono cromado.
- **Code blocks:** **JetBrains Mono** (la misma del UI — coherencia total).

Tabla de roles:

| Rol | Familia | Size | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- | --- | --- |
| `display` (page hero raro) | JetBrains Mono | 1.5rem (24px) | 700 | 1.2 | -0.02em |
| `h1` | JetBrains Mono | 1.25rem (20px) | 700 | 1.25 | -0.01em |
| `h2` (Stage titles, "STAGE 2 · PEER REVIEW") | JetBrains Mono | 0.875rem (14px) | 700 | 1.3 | 0.08em (uppercase) |
| `h3` | IBM Plex Sans | 1.125rem (18px) | 600 | 1.4 | 0 |
| `body` (markdown content) | IBM Plex Sans | 1rem (16px) | 400 | 1.55 | 0 |
| `body-small` (sidebar items, metadata, table cells) | JetBrains Mono | 0.8125rem (13px) | 400 | 1.4 | 0 |
| `code` (inline + blocks) | JetBrains Mono | 0.875rem (14px) | 400 / 500 | 1.5 | 0 |
| `label` (button text, status chips) | JetBrains Mono | 0.75rem (12px) | 500 | 1.3 | 0.04em (semi-uppercase tracking) |
| `microcopy` | JetBrains Mono | 0.6875rem (11px) | 400 | 1.4 | 0.02em |

Stage titles van en uppercase (`STAGE 1 · INDIVIDUAL RESPONSES`) — convención herramienta SRE.

Max-width en `.markdown-content`: **72ch** (un poco más generoso que A — encaja con la densidad alta).

### Microinteractions

Microinteracciones **instrumentadas** (durations 80–200ms, ease-out estricto, sin nada cubic-bezier "amigable"). Se sienten precisas, no calmadas.

1. **Hover de botones / sidebar items:** background fade `--color-bg-secondary` → `--color-bg-instrument` con `100ms ease-out`. Border-left de `--color-accent` 2px aparece simultáneamente (slide-in `120ms`). Sin cambio de transform.
2. **Transición Stage 1 → 2 → 3:** **status grid horizontal sticky** en la parte superior — 3 widgets cromados pequeños, cada uno una "instrument card" de `120px ancho × 56px alto` con: stage number + label (`STAGE 1 · IND RESP`), status dot (color por estado), elapsed time tabular (`00:14`). El widget active pulsa el dot `--color-status-active` con `opacity 0.5 → 1.0 → 0.5` ciclo `1200ms`. Done: dot a `--color-status-done` sin pulse. Resuelve F-06 + H1-01 con énfasis en data-density.
3. **Hover del Quality toggle:** los 3 segmentos del toggle son chips cromados (border `--color-border-strong` 1px, background `--color-bg-instrument`); hover sobre un chip aplica un glow del border (`box-shadow: 0 0 0 1px var(--color-accent-bright)` + `inset 0 0 12px rgba(0,181,232,0.08)`) `120ms`. El cost number embedded se intensifica (`--color-fg-muted` → `--color-fg-on-instrument`).
4. **Expansión del `reasoning_details` disclosure:** **chip toggle** estilo terminal "fold/unfold". El control es un `[+] reasoning · 1247t` (formato compacto, t = tokens). Click colapsa/expande con `slide-down 140ms ease-out`. Expanded: el reasoning ocupa un panel con border-left 2px `--color-status-active` (amber, "this is meta-data, not the response"), tipografía `body-small` (JetBrains Mono 13px) y `--color-fg-secondary`. Resuelve H8-05.

### Information architecture

```
+-----------------------------------------------------------------------+
| Header (44px) — [LLM·COUNCIL] mono · status indicators · theme toggle |
+----------+------------------------------------------------------------+
| Sidebar  | Status grid sticky (3 stage chips) ─────────────────── 56px|
| (260px)  +------------------------------------------------------------+
|          | Main panel                                                 |
| [+ NEW]  |                                                            |
| [search] |  user message · TS + token-count chip                      |
| ───      |                                                            |
| · Item 1 |  STAGE 1 · INDIVIDUAL RESPONSES                            |
|   meta   |  ┌─────────────────────────────────────────────────────┐  |
| · Item 2 |  │ tab: openai/gpt-5-mini · 14.2s · 1284t · ✓          │  |
|   meta   |  │ tab: anthropic/claude-sonnet-4-5 · 17.0s · 1502t · ✓ │  |
|          |  │ ...                                                 │  |
|          |  │ [+] reasoning · 1247t                               │  |
|          |  └─────────────────────────────────────────────────────┘  |
|          |                                                            |
|          |  STAGE 2 · PEER REVIEW                                     |
|          |  [aggregate ranking table — tabular nums, status chips]   |
|          |                                                            |
|          |  STAGE 3 · SYNTHESIS                                       |
|          |  [response panel — border-top 2px accent + label "FINAL"]  |
+----------+------------------------------------------------------------+
```

- **Sidebar:** `260px` ancho, denso. Border derecho `--color-border-strong` (1px sólido más visible). Cada conversation item muestra tres líneas: title (mono 13px), `4 msg · 2d ago` en microcopy (mono 11px), y un dot de status si hay deliberación in-flight. Header: `[+ NEW]` botón estilo chip cromado.
- **Header global:** `44px`. Logotipo `[LLM·COUNCIL]` mono uppercase, weight 700, letter-spacing 0.08em. Indicators a la derecha: theme toggle, optional connection status dot.
- **Status grid sticky:** **el elemento característico** — 3 widgets de stage que persisten visibles durante TODA la deliberación, mostrando elapsed time + status. No se ocultan al completar — se desactivan visualmente.
- **Main panel:** padding lateral mínimo (`24px`). Densidad alta. Cada Stage es un panel con border `--color-border-subtle` 1px + título uppercase tracking en `--color-fg-secondary`.
- **Welcome state:** un panel con label `[ NEW SESSION ]` + 4 ejemplos de query como command palette items (mono, prefijo `>`).

### Density stance

**Densidad alta.** Cada pixel reporta. Sidebar muestra title + count + last-activity + status dot. Stage 1 tabs incluyen elapsed time + token count + status icon. Stage 2 aggregate table tiene columnas tabular: rank, model, avg_position, votes_count, std_dev (si disponible). El status grid sticky es info-rica permanente. Esta dirección es la que más densifica Stage 2 (el target ideal — F-09 se resuelve con visualization densa, no con menos data).

### Cost surfacing in Quality toggle

El coste es **un instrumento** — un chip cromado con número grande, prominente, no decorativo. Cada segmento del toggle es una "instrument card":

```
+------------------------------------------------------------------+
| QUALITY DIAL                                                     |
|                                                                  |
| ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  |
| │ FAST         │  │ QUALITY      │  │ QUALITY+RESEARCH       │  |
| │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐  + WEB    │  |
| │ │ ~$0.001  │ │  │ │ ~$0.05   │ │  │ │ ~$0.45   │           │  |
| │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘           │  |
| │ ◉ active     │  │ ○ idle       │  │ ○ idle  ⚠ confirm req. │  |
| └──────────────┘  └──────────────┘  └────────────────────────┘  |
|                                                                  |
+------------------------------------------------------------------+
```

- El cost chip cromado: background `--color-bg-instrument`, border 1px `--color-border-strong`, número en mono `body` 16px weight 600, `--color-fg-on-instrument`. Tabular numerals garantizan alineación.
- Quality+Research añade un label cromado `+ WEB` y un warning chip `⚠ confirm required` — esto introduce la **friction explícita** de H5-03: el send button cuando Quality+Research está activo cambia su label a `Send · ~$0.45` y requiere un click adicional con confirmación inline (`"Confirm send · Quality+Research"`) en lugar de heredar el comportamiento normal. La cabina **te frena** antes del gasto significativo.

### Reasoning_details disclosure pattern

**Chip toggle terminal-style** dentro de cada Stage 1 tab. El control es compacto y monospace:

```
[+] reasoning · 1247t · cot
```

`t` = tokens, `cot` = chain-of-thought (optional shorthand). Click expande inline. El expanded reasoning vive en un panel con:

- Border-left `2px solid var(--color-status-active)` (amber — "this is process, not output").
- Background `--color-bg-secondary` (subtle elevation hacia abajo, NO elevation hacia arriba).
- Tipografía `body-small` (JetBrains Mono 13px) `--color-fg-secondary` — jerárquicamente inferior al response. Resuelve H8-05.
- Header del panel con metadata tabular: `Reasoning · 1,247 tokens · 2.3s · gpt-5-mini`.

Click colapsa de vuelta al chip.

### Empty / loading / error states

- **Cold start:** panel central con label `[ NEW SESSION ]` mono uppercase + tagline `"Initialize a query to start the council."` + lista de 4 example commands en formato palette: `> Compare Snowflake star vs snowflake schema for pharma BI`, `> Critique this DAX expression for performance`, etc. Ejecuta uno con click. Resuelve F-01 + F-04.
- **Loading per stage:** status grid sticky es la respuesta primaria — ya descrita. Adicionalmente, dentro de cada Stage panel, un thin progress bar `2px` `--color-accent` cycling indeterminate `1200ms`. Failed model: tab gana un `--color-status-failed` icon `⚠` y el tab title se tacha (`text-decoration: line-through`) — resuelve H9-02.
- **Error global (H9-01):** sticky banner en la parte superior del main panel, bg `--color-status-failed` (15% alpha), border-bottom 2px `--color-status-failed`, copy mono uppercase `"DELIBERATION INTERRUPTED · STAGE 2 · CONNECTION_ERROR"` + botón `[ retry ]` chip cromado. Persistente hasta dismiss explícito.
- **Sidebar vacío:** label `[ no sessions yet ]` mono uppercase `--color-fg-muted` + un hint muy corto `> press [+ NEW]`.
- **Search sin matches:** copy mono `> 0 matches for "<query>"` + chip link `[ search inside content ]` siempre visible — resuelve F-22 + F-24 con tono terminal.

### Phase 1 components restyling notes

- **Modal (delete confirmation):** background `--color-bg-elevated`, border 1px `--color-border-strong` (sólido, no subtle), radius `4px` (más cuadrado que A), shadow `0 12px 32px rgba(0,0,0,0.4)`. Title uppercase mono `[ DELETE CONVERSATION ]`. Body con metadata tabular completa (resuelve F-18): `"\"Pricing analysis\" · 4 msg · 3d ago · last activity 2026-05-07T14:32"`. Botón Cancel: ghost mono. Botón Delete: filled `--color-status-failed` con label `[ DELETE ]`.
- **Menu (popover three-dot):** background `--color-bg-instrument`, border 1px `--color-border-strong`, radius `4px`. Items mono `12px` con shortcut a la derecha (`R`, `⌫`). Hover: background tint `--color-accent` (alpha 0.12) + border-left `--color-accent` 2px.
- **Three-dot icon (`⋮`):** **persistentemente visible** en todas las filas (no solo activa) — el cockpit asume usuario power que no necesita esconder controles. Resuelve F-16 con la solución más radical de las 3 direcciones.
- **Inline rename input:** input cuadrado (radius `2px`), border 1px `--color-accent`, background `--color-bg-elevated`. Hint a la derecha del input (no debajo) en microcopy mono: `[ENTER] save · [ESC] cancel` — la convención mono respeta el patrón terminal. Resuelve F-20.
- **Search input:** prefijo `> ` literal en el input (placeholder), monospace, sin iconografía magnifying-glass. Affordance "Search inside content (N)" se materializa como un chip secundario debajo del input — siempre visible cuando hay query con ≥1 char (resuelve F-22). Style chip: `--color-bg-instrument`, label mono uppercase `[ SEARCH IN CONTENT (3) ]`.

### Maps to friction & audit findings

**Friction addressed (≥3 F-XX IDs from `01-cognitive-walkthrough.md`):**
- **F-06** (loading ciego) — status grid sticky con elapsed time + dots de status + lista de modelos por tab.
- **F-09** (peer-review prose densa) — Stage 2 reorganizado como tabla densa tabular (rank, model, avg, votes, std_dev) con header sticky.
- **F-08** (short-name no comunica publisher) — tabs incluyen prefijo publisher (`openai/gpt-5-mini` completo, no truncado) + status icon + elapsed time.
- **F-12** (verde Bootstrap Stage 3) — reemplazado por panel con border-top 2px `--color-accent` y label uppercase `[ FINAL · CHAIRMAN: gemini-2.5-pro ]`.
- **F-16** (three-dot solo hover) — visible siempre.
- **F-22** (content search oculto) — siempre disponible como chip cromado.
- **F-26** (extensiones aceptadas no comunicadas) — affordance attachment incluye lista mono inline `[.md .txt .csv .py .sql .json .yml ...]` (resuelve también F-25).

**Nielsen findings addressed (≥3 HN-XX IDs from `02-nielsen-audit.md`):**
- **H8-02** (Severity: 4) — sistema completo IBM Plex Sans + JetBrains Mono + max-width 72ch + line-height 1.55.
- **H9-01** (Severity: 4) — sticky banner persistente con retry, copy mono uppercase legible.
- **H1-01** (Severity: 3) — status grid sticky con elapsed time per stage.
- **H1-04** (Severity: 3) — coste como chip cromado prominente.
- **H5-03** (Severity: 3) — friction explícita: confirm required en Quality+Research.
- **H4-01** (Severity: 3) — sistema completo de tokens cromados.
- **H4-02** (Severity: 3) — `.download-btn` unificado a chip mono uppercase con variant prop.
- **H6-05** + **H8-05** (Severity: 3) — chip terminal-style colapsado, expanded inferior tipográficamente.
- **H8-01** (Severity: 3) — Stage 3 con border-top accent + label uppercase, no fill green.
- **H9-02** (Severity: 3) — failed tab visible con `⚠` + line-through.

### Trade-offs

- Densidad alta puede sentirse abrumadora en cold start — el welcome se compensa con copy minimalista terminal.
- Mono-everything en UI puede leerse "no es Internet típico" — el target del usuario (BI/data poweruser) la pide explícitamente.
- Friction extra en Quality+Research (confirm required) puede frustrar usuarios habituales — es el trade-off consciente de H5-03.
- Aspecto "tool", no "product" — para Notebook/Minimal-leaning users esto es agresivo.
- Light mode es menos natural en esta dirección — la dirección es claramente dark-first; light mode es funcional pero la identidad real vive en dark.

---

## Direction C: Claude-like minimal

> **Filosofía tonal:** silencioso, ligero, una decisión a la vez. La pantalla pide muy poco; cuando pide, lo pide bien. Una herramienta que se hace cargo de la mayoría de las decisiones por ti para que tú pongas tu energía en pensar la pregunta — no en navegar la app.

### Tone & references

Referencias D-17 (sin cross-pollination con Notebook ni Cockpit):

- **claude.ai** — palette arenosa cálida; spacing generoso; tipografía sans neutra Inter-like; un solo accent muy contenido; microcopy honesto sin marketing.
- **Anthropic.com** — gradientes muy sutiles; serifa optional como acento ocasional; uso disciplinado del whitespace; CTA en color "warm" no "saturated".
- **Vercel docs** — densidad adaptativa (poca info por pantalla pero alta legibilidad); transiciones casi invisibles; dark mode pulido nativo; copy honesto y técnico sin condescendencia.

Lo que NO se toma: la grand-scale composition de la home page de Anthropic (no necesitamos hero sections), el playground sandbox de claude.ai (no es nuestro contexto), las animaciones decorativas de Vercel marketing (no es necesario).

### Palette (light)

Filosofía: **arenas + un acento muy pulido**. Una paleta cálida-neutra (no fría como B, no saturada como A). El acento es un único color "warm" muy contenido — no terracota saturado (eso es Notebook), sino un `clay` discreto que aparece muy raramente (solo en focus + Stage 3 hairline + el Send button).

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#FBFAF8` | Fondo base (off-white cálido) | — |
| `--color-bg-secondary` | `#F4F2EE` | Sidebar, surfaces sunken | — |
| `--color-bg-elevated` | `#FFFFFF` | Cards, modal | — |
| `--color-fg-primary` | `#1A1815` | Texto principal (warm near-black) | 16.5:1 |
| `--color-fg-secondary` | `#5C544B` | Texto secundario | 7.4:1 |
| `--color-fg-muted` | `#8F857B` | Microcopy | 3.8:1 |
| `--color-accent` | `#C7551E` | Clay acento contenido | 5.5:1 |
| `--color-accent-soft` | `#F5E8DD` | Tint del clay para hover sutil + Stage 3 hairline | — |
| `--color-border-subtle` | `#EAE6DF` | Bordes (casi invisibles) | — |
| `--color-border-strong` | `#D5CFC4` | Bordes input | — |
| `--color-focus-ring` | `#C7551E` (alpha 0.4) | Outline focus | — |
| `--color-error` | `#A8362B` | Error legible y warm | 6.0:1 |

Notar: solo **11 tokens** vs 12-13 en A y B. Esta dirección es deliberadamente más austera en sistema de color.

### Palette (dark)

Filosofía: el dark de Minimal es cálido también — no slate frío de B, no warm-papel de A. Un dark "ink" que sigue sintiendo cálido.

| Token | Hex / OKLCH | Rol semántico | Contrast vs `--color-bg-primary` |
| --- | --- | --- | --- |
| `--color-bg-primary` | `#1A1815` | Fondo base (warm dark) | — |
| `--color-bg-secondary` | `#211F1B` | Sidebar | — |
| `--color-bg-elevated` | `#26231F` | Cards, modal | — |
| `--color-fg-primary` | `#F0EDE7` | Texto principal | 14.2:1 |
| `--color-fg-secondary` | `#B5AC9F` | Texto secundario | 7.5:1 |
| `--color-fg-muted` | `#7E7468` | Microcopy | 4.0:1 |
| `--color-accent` | `#E07A3F` | Clay luminoso (legibilidad sobre dark) | 7.6:1 |
| `--color-accent-soft` | `#3A2820` | Tint dark — Stage 3 hairline | — |
| `--color-border-subtle` | `#2E2A24` | Bordes (casi invisibles) | — |
| `--color-border-strong` | `#48423B` | Bordes input | — |
| `--color-focus-ring` | `#E07A3F` (alpha 0.5) | Outline focus | — |
| `--color-error` | `#D86B55` | Error | 6.7:1 |

### Typography

Sistema **1.5-familia con sans neutra como protagonista** + serif opcional para acentos editoriales muy puntuales (Stage 3 title only, opcional).

- **UI + body markdown:** **Inter Variable** (Rasmus Andersson, SIL OFL) como protagonista absoluto. Justificación: la sans neutra anthropic-aligned por excelencia; rendering perfecto a todos los tamaños 11-32px; soporte Latin Extended completo; tabular numerals disponibles via OpenType feature; weight axis variable que permite afinar 400/500/600 con un solo archivo. Inter es la decisión de "no decisión tipográfica" que respeta la filosofía minimal.
- **Acento serif optional:** **Newsreader Variable** (Production Type, SIL OFL) usado MUY ocasionalmente — solo en el title del Stage 3 ("Final answer" en serif italic) y en el welcome state (h1 grande). No se usa en h2/h3/body. Aporta calidez editorial sin arrastrar serif al body. Si la decisión final reduce a solo Inter, el doc sigue funcionando; el serif es opcional pulido.
- **Code blocks:** **JetBrains Mono Variable** — usado solo en code blocks dentro de markdown y en model identifiers. Misma elección que A para coherencia ecosistema open-source.

Tabla de roles:

| Rol | Familia | Size | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- | --- | --- |
| `display` (welcome state h1) | Newsreader (italic) | 2.25rem (36px) | 400 italic | 1.2 | -0.01em |
| `h1` (page hero) | Inter | 1.5rem (24px) | 600 | 1.3 | -0.005em |
| `h2` (Stage titles) | Inter | 1.125rem (18px) | 600 | 1.4 | 0 |
| `h2-stage3-title` (only) | Newsreader | 1.5rem (24px) | 500 italic | 1.3 | -0.01em |
| `h3` | Inter | 1rem (16px) | 600 | 1.45 | 0 |
| `body` (markdown content) | Inter | 1rem (16px) | 400 | 1.6 | 0 |
| `body-small` (sidebar items, metadata) | Inter | 0.875rem (14px) | 400 | 1.5 | 0 |
| `code` (inline + blocks) | JetBrains Mono | 0.875rem (14px) | 400 | 1.5 | 0 |
| `label` | Inter | 0.8125rem (13px) | 500 | 1.4 | 0 |
| `microcopy` | Inter | 0.75rem (12px) | 400 | 1.4 | 0 |

Max-width en `.markdown-content`: **62ch** (más estrecho que A y B — minimal pide foco). Resuelve H8-02 con la propuesta más austera de las 3.

### Microinteractions

Microinteracciones **casi invisibles** (durations 150–250ms, ease-in-out muy suaves, opacity-only siempre que sea posible). Se sienten como "no hay animación" hasta que las miras dos veces.

1. **Hover de botones / sidebar items:** background `--color-bg-secondary` → `--color-accent-soft` muy sutil, fade `200ms ease-in-out`. Ningún transform, ningún border. Si el usuario no está mirando, no la nota — y eso es deliberado.
2. **Transición Stage 1 → 2 → 3:** **un único thin progress line** (`2px` altura, full-width) en la parte superior del main panel, color `--color-accent`. La line ocupa 33% durante Stage 1, 66% durante Stage 2, 100% durante Stage 3. Transition `progress 280ms ease-out` por step. Adicionalmente debajo de la line aparece **una sola frase corta** que cambia: `"Stage 1 — collecting responses…"`, luego `"Stage 2 — peer review…"`, luego `"Stage 3 — synthesizing…"`. La frase fade-in/out `180ms`. Failed model gana un mini ⚠ icon junto a la frase pero el progress no se interrumpe. Resuelve F-06 + H1-01 con la solución más austera.
3. **Hover del Quality toggle:** el segmento hover gana fade del bg `--color-bg-secondary → --color-accent-soft` `200ms`. Sin glows, sin shadows. El subtitle de coste se intensifica en color (`--color-fg-muted → --color-fg-secondary`).
4. **Expansión del `reasoning_details` disclosure:** **simple text link toggle** estilo Anthropic docs. Control es un link text minúsculo `Show reasoning` (subrayado solo en hover). Click → fade-in `220ms` del reasoning panel debajo. Sin chevron, sin border-left llamativo, solo un border-left `1px` `--color-border-subtle` (apenas visible) para indicar nesting. Tipografía del expanded: Inter `body-small` (14px) `--color-fg-secondary`. Resuelve H8-05 con el enfoque "mostrar lo que pediste y nada más".

### Information architecture

```
+----------------------------------------------------------------+
| Header (60px) — "LLM Council" Inter weight 500 · theme toggle  |
+--------+-------------------------------------------------------+
|        | [thin progress line: 2px when active] ———————————————|
|        |                                                       |
| Side   |                                                       |
| (240)  |          [welcome / conversation content]             |
|        |          centered, max-width 720px,                   |
| + New  |          generous vertical padding                    |
| Search |                                                       |
| ───    |                                                       |
| · Item |          Stage 3 — italic serif title                 |
| · Item |          "Final answer"                               |
| · Item |          [content with hairline border-top accent]    |
|        |                                                       |
+--------+-------------------------------------------------------+
```

- **Sidebar:** `240px` (más estrecho — minimal). Solo border-right `--color-border-subtle` (apenas visible). Cada conversation item es 1 línea: title only, sin metadata visible salvo en hover. Deliberadamente mínimo. Header con "+ New" en text-link style (no botón cromado).
- **Header global:** `60px` (más alto que A y B — generoso vertical). "LLM Council" en Inter 500, weight medio. Theme toggle muy sutil en esquina superior derecha (un small icon button).
- **Main panel:** padding lateral muy generoso (`clamp(48px, 8vw, 120px)`). Contenido centrado con max-width contenida. La pantalla no se llena — el whitespace es la decisión.
- **Welcome state:** un h1 italic serif `"What can the council think about for you?"` centered, debajo en `body` Inter una sola pregunta CTA sugerida. Sin lista de 4 ejemplos (eso es A). La minimal vision: una pregunta a la vez, deja espacio para escribirla.
- **Responsive:** desktop-first. Mobile colapsa sidebar a drawer; el padding generoso ayuda más que en B.

### Density stance

**Densidad baja.** Una decisión a la vez. Sidebar muestra solo title (no count, no timestamp visible — disponibles en hover). Stage 1 tabs no muestran elapsed time (solo nombre del modelo). Stage 2 muestra aggregate ranking primero con explicación de 1 línea, raw evaluations colapsadas por defecto en accordion (puedes expandir si quieres profundizar). Stage 3 tiene el más generoso whitespace de las 3 direcciones. Esta es la dirección que se opone más fuerte a F-09 — no resuelve la prose densa con visualization densa, sino simplificando radicalmente la jerarquía visible.

### Cost surfacing in Quality toggle

El coste es **un subtitle muy sutil** debajo del label de cada nivel. Tono honesto, sin chip ni cromado. Inter 12px microcopy `--color-fg-muted`:

```
+----------------------------------------------------------------+
|  Quality                                                       |
|                                                                |
|   ◉  Fast              ○  Quality          ○  Quality+Research |
|      ~$0.001 typical      ~$0.05 typical      ~$0.45 typical   |
|                                                                |
+----------------------------------------------------------------+
```

Selected: el segmento activo gana background `--color-accent-soft` muy sutil + el subtitle de coste cambia a `--color-fg-secondary`. Quality+Research **NO** requiere doble click — la friction de H5-03 se resuelve en el send button: cuando Quality+Research está activo, el send button cambia su label de `"Send"` a `"Send · ~$0.45"` y el coste aparece en el botón mismo (no como modal extra). El usuario lo ve cada vez que va a hacer click. Si se quiere reforzar, hover del send muestra tooltip Inter `"Estimated cost: $0.45 (range $0.20–$1.10 with web search)"`. La filosofía: la friction es **visible**, no **bloqueante** — minimal respeta al usuario adulto.

### Reasoning_details disclosure pattern

**Simple text link toggle** — la solución más sutil de las 3. Dentro de cada Stage 1 tab, debajo del response markdown, un text link discreto:

```
─────────────────────────────────────
[respuesta del modelo]
...

Show reasoning
─────────────────────────────────────
```

Link en Inter 13px `--color-fg-muted` con subrayado solo en hover. Click → fade-in del reasoning debajo del link, separado por un border-left muy fino `1px --color-border-subtle` (apenas visible). Reasoning rendered en Inter `body-small` (14px) `--color-fg-secondary`. El link cambia a `Hide reasoning` (sin chevron). No hay metadata embedded en el control (token count, etc.) — el usuario lo descubre al expandir si lo necesita. Resuelve H8-05 con la enfoque "lo mínimo viable".

### Empty / loading / error states

- **Cold start (welcome state):** centered, italic serif h1 `"What can the council think about for you?"`, debajo Inter body 1 línea: `"Drop a question that benefits from multiple perspectives."` Sin lista de ejemplos (decisión deliberada — empty state minimal). El welcome state aparece con un fade `400ms` al cargar la app por primera vez. Resuelve F-01 + F-04 con tono editorial discreto.
- **Loading per stage:** el thin progress line + frase corta (descrito en Microinteractions) es la respuesta. Lista de modelos NO visible — se asume que al usuario no le importa qué modelos están corriendo a menos que pregunte (puede hover sobre el progress line para tooltip con la lista). Resuelve F-06 con la enfoque "sé honesto sobre el progreso pero no abrumes".
- **Error global (H9-01):** banner inline en el lugar donde se rompió el stage (no sticky top, no toast — banner contextual donde fue el evento). Background `--color-accent-soft` (con tint hacia warm-error si el error es severo), copy Inter `"Stage 2 didn't complete. Want to retry with the same question?"` + un text link `Retry`. Filosofía: el error se trata con la misma calma que el resto de la app.
- **Sidebar vacío:** texto centrado en italic serif very subtle: `"No conversations yet."` + un text link `Start one →` debajo. Mucho whitespace alrededor. El link es el CTA primario.
- **Search sin matches:** copy en Inter `"No matches for \"<query>\"."` debajo del input + text link `Search inside content (3)` siempre visible cuando aplica (resuelve F-22 + F-24).

### Phase 1 components restyling notes

- **Modal (delete confirmation):** background `--color-bg-elevated`, sin border (solo shadow muy suave `0 12px 40px rgba(26, 24, 21, 0.06)`), radius `12px` (más generoso que A y B). Title Inter `h2` weight 600 `"Delete conversation?"`. Body con metadata en una sola línea muted: `"\"Pricing analysis\" · 4 messages · 3 days ago"` — resuelve F-18 con la cantidad mínima viable de info. Botón Cancel: ghost text-link Inter. Botón Delete: filled `--color-accent` (clay, no rojo saturado — el clay es ya advertencia natural por su weight visual sobre la paleta arenosa). La confirmación destructiva no necesita gritar en rojo en una paleta minimal.
- **Menu (popover three-dot):** background `--color-bg-elevated`, sin border, radius `8px`, shadow muy suave. Items Inter 13px con padding generoso `10px 16px`. Hover: background `--color-accent-soft`. Sin shortcuts visibles (decisión consciente — los shortcuts viven en hover-tooltip como progressive disclosure). Esto es un trade-off contra F-17 (tracked en trade-offs).
- **Three-dot icon (`⋮`):** visible solo en hover del row (pattern ChatGPT estándar) + persistente en row activo. Compromiso intermedio: F-16 se mitiga parcialmente (la fila activa siempre muestra el control) pero no completamente.
- **Inline rename input:** sin border (solo border-bottom `1px --color-accent` apenas visible), background `--color-bg-elevated`. **Sin hint visible** — el usuario aprende los shortcuts via hover-tooltip al primer encuentro. Trade-off vs F-20 — minimal apuesta a que un solo encuentro es suficiente para internalizar Enter/Esc/Blur. Si el usuario interactúa por segunda vez sin haberlo aprendido, hay un fallback: una microcopy fade-in `--color-fg-muted` 400ms tras 3s de inactividad.
- **Search input:** sin border (solo border-bottom apenas visible o ningún border + sutil background diferenciado), placeholder Inter italic `"Search…"` (sin "conversations" — más austero). Affordance "Search inside content (N)" como text link debajo del input cuando hay query con ≥1 char (resuelve F-22) — text link Inter underline-on-hover, sin chip ni botón. Filosofía: si vas a buscar dentro del contenido, te dejo hacerlo, pero no te grito que existe.

### Maps to friction & audit findings

**Friction addressed (≥3 F-XX IDs from `01-cognitive-walkthrough.md`):**
- **F-06** (loading ciego) — thin progress line + frase corta + tooltip con lista de modelos.
- **F-09** (peer-review prose densa) — Stage 2 reorganizado: aggregate ranking visible primero con explicación 1-línea (resuelve también H2-01); raw evaluations colapsadas por default en accordion individual por modelo.
- **F-12** (verde Bootstrap Stage 3) — reemplazado por hairline border-top `--color-accent-soft` 1px + título italic serif "Final answer" + ningún background fill.
- **F-01** (welcome no comunica valor) — italic serif h1 con tagline editorial.
- **F-04** (no orientación de query) — copy del welcome state lo orienta sin lista de ejemplos.
- **F-22** (content search oculto) — text link siempre visible cuando aplica.
- **F-24** (no matches genérico) — copy honesto + sugerencia de content search.

**Nielsen findings addressed (≥3 HN-XX IDs from `02-nielsen-audit.md`):**
- **H8-02** (Severity: 4) — sistema completo Inter + max-width 62ch + line-height 1.6.
- **H9-01** (Severity: 4) — banner contextual inline (no toast efímero), copy honesto + retry text link.
- **H1-01** (Severity: 3) — thin progress line con frase descriptiva.
- **H1-04** (Severity: 3) — coste como subtitle muted + reflejado en el send button.
- **H5-03** (Severity: 3) — friction visible (label en send button con coste) sin doble-click — respeta usuario adulto.
- **H6-05 + H8-05** (Severity: 3) — text link toggle minimalista; reasoning expanded sub-tipográficamente.
- **H8-01** (Severity: 3) — Stage 3 sin fill green; hairline accent y serif italic.
- **H4-01** (Severity: 3) — sistema reducido pero coherente de tokens.

### Trade-offs

- Densidad baja sacrifica info-at-a-glance — sidebar sin metadata visible obliga a hover.
- Welcome state sin lista de 4 ejemplos hace cold start menos didáctico que A — el usuario tiene que adivinar más.
- F-17 (shortcuts no visibles en menu items) NO se resuelve directamente — minimal apuesta a tooltips de hover en lugar de chrome visible.
- F-20 (rename shortcuts) parcialmente resuelto — fallback de microcopy a 3s de inactividad, no hint inmediato.
- La paleta clay+arenas es la menos "diferenciada" — alguien que ya usa claude.ai puede pensar "esto es la misma app". Es deliberado: la dirección es Claude-aligned por design.
- No mostrar elapsed time per stage es un trade-off contra usuarios poweruser BI/data — ese perfil lo captura B.

---

## Convergence risk check

Per CD-05: las 3 direcciones deben **contrastar**, no converger. Verificación explícita aspect-by-aspect:

- **A ↔ B (Notebook ↔ Cockpit):** divergen claramente. Notebook es serif + neutros cálidos + densidad media + microinteracciones calmas; Cockpit es mono + slate cromado + densidad alta + microinteracciones instrumentadas. Ningún solapamiento estructural — no hay riesgo de convergencia. **No re-orientación necesaria.**
- **B ↔ C (Cockpit ↔ Minimal):** divergen claramente. Cockpit max info-density, Minimal min info-density. Cockpit mono-everything en UI, Minimal Inter sans. Cockpit confirm-required en Quality+Research (friction bloqueante), Minimal cost-in-button (friction visible no-bloqueante). **No re-orientación necesaria.**
- **A ↔ C (Notebook ↔ Minimal):** **riesgo bajo pero presente** — ambas son "calmas" y comparten paleta cálida. Diferencias activas que mantienen contraste:
  - Notebook usa serif Source Serif 4 como protagonista del body; Minimal usa Inter sans como protagonista (serif solo en acentos puntuales).
  - Notebook propone densidad media (sidebar muestra title + count); Minimal propone densidad baja (sidebar solo title).
  - Notebook es "research notebook editorial" — invierte en jerarquía tipográfica fuerte; Minimal es "anthropic-aligned product" — invierte en whitespace generoso y reducción.
  - Notebook welcome state tiene 3 ejemplos serif italic; Minimal welcome state tiene 1 frase y nada más.
  - Notebook three-dot persistente en fila activa + Minimal three-dot solo hover (pattern más estándar).
  - Notebook progress strip horizontal con segmentos visibles (3 chunks); Minimal thin progress line continuous + frase corta.
  - Notebook Quality+Research sin friction adicional (cost subtitle basta); Minimal idem pero el send button refleja el coste explícitamente.

  **Diagnóstico:** A y C son ambas calmas pero tonalmente distintas — A es "editorial libro abierto", C es "producto silencioso terminado". El contraste es real, no semántico. **Las 3 direcciones permanecen distintas — no se reduce a 2.** Si Plan 06 percibe que A y C convergen al ver wireframes/sketches, ese feedback puede activar la cláusula CD-05 en una iteración posterior.

**Resultado:** las 3 direcciones permanecen distintas en palette philosophy, density, primary typography stance, microinteraction tone, y treatment del cost surfacing. **3 direcciones × full structure** entregadas.

---

## Cross-direction comparison matrix

Resumen lado a lado de las decisiones clave de cada dirección. Esta tabla es la herramienta de decisión rápida del Plan 06:

| Aspecto | Direction A — Research notebook | Direction B — Tactical cockpit | Direction C — Claude-like minimal |
| --- | --- | --- | --- |
| **Palette philosophy** | Neutros cálidos + 1 acento terracota | Slate cool oscuros saturados + cyan/amber/green status chips | Arenas cálidas + 1 acento clay contenido |
| **Light mode tone** | Off-white papel cálido | Slate light (high contrast frío) | Off-white cálido austero |
| **Dark mode tone** | Cuaderno con luz baja (warm dark) | Cabina nocturna saturada (cold dark) | Ink warm dark (warm dark austero) |
| **Primary typeface (body)** | Source Serif 4 Variable | IBM Plex Sans Variable | Inter Variable |
| **UI typeface** | Inter Variable | JetBrains Mono Variable | Inter Variable (mismo que body) |
| **Mono typeface** | JetBrains Mono | JetBrains Mono | JetBrains Mono |
| **Stage title style** | Serif h2 sentence-case | Mono uppercase tracking 0.08em | Inter h2 sentence-case (Stage 3 italic serif optional) |
| **Density stance** | Media — whitespace + info completa | Alta — cada pixel reporta data | Baja — una decisión a la vez |
| **Sidebar item content** | Title + count + last-activity | Title + count + last-activity + status dot | Title only (metadata en hover) |
| **Three-dot visibility** | Persistente en fila activa | Persistente en TODAS las filas | Hover + persistente en activa |
| **Cost surfacing pattern** | Subtitle microcopy bajo cada label | Chip cromado prominente con confirm-required en Q+R | Subtitle muted + reflejo del coste en el send button |
| **Quality+Research friction** | Cost visible (no extra friction) | Confirm-required (extra click) | Cost-in-send-button (visible no bloqueante) |
| **Loading visualization** | Progress strip horizontal con 3 segmentos + dots | Status grid sticky con elapsed time + status dots + pulse | Thin progress line continuous + frase corta + tooltip lista modelos |
| **Reasoning disclosure** | Accordion vertical con chevron, body-small jerárquicamente inferior | Chip terminal `[+] reasoning · 1247t`, panel border-left amber | Text link toggle "Show reasoning", border-left 1px hairline |
| **Stage 3 treatment** | Background `--color-accent-soft` + border-left 3px accent + h2 serif | Border-top 2px accent + label uppercase mono `[ FINAL · CHAIRMAN ]` | Hairline border-top accent + italic serif title "Final answer", no fill |
| **Microinteraction stance** | Calmas (180–280ms ease-out) | Instrumentadas (80–200ms ease-out estricto, status pulses) | Casi invisibles (150–250ms ease-in-out, opacity-only) |
| **Welcome state copy** | h1 serif "What do you want to think about today?" + 3 ejemplos italic | `[ NEW SESSION ]` mono + 4 example commands en formato palette | Italic serif "What can the council think about for you?" + 1 línea |
| **Error feedback (H9-01)** | Banner persistente con retry + copy editorial | Sticky top banner mono uppercase `[ RETRY ]` chip | Banner contextual inline donde se rompió el stage |
| **References (D-17)** | Linear, Notion, Obsidian, Are.na | Raycast, Datadog, herramientas SRE | claude.ai, Anthropic.com, Vercel docs |
| **Best fit for use case** | Long-form deep reading (Stage 3 essays largas) | Dashboard scanning + power-user queries con costes visibles | One-decision-at-a-time + cold start con menor fricción cognitiva |
| **Risk if chosen** | Densidad media puede sentirse insuficiente para BI/data poweruser | Aspecto "tool" puede agredir a usuarios product-leaning + light mode flojo | Sin lista de ejemplos + densidad baja = onboarding más lento |

---

## Throwaway HTML disclaimer

Per D-15, los HTML throwaway sketches del Plan 05 son **deliberadamente desechables**. Phase 4 NO debe lift CSS verbatim de los sketches. Los sketches sirven como herramienta de validación visual para que el usuario elija una de las 3 direcciones tonales — no son código de producción.

Phase 4 (consumidor de Phase 2) extrae únicamente:

- **Paleta** — los tokens CSS variables documentados en este `03-redesign-proposal.md` (NO los hex que aparezcan en el sketch HTML, que pueden tener drift accidental durante el desarrollo throwaway).
- **Tipografía** — las familias y la escala documentadas aquí (NO los `font-size: 14.5px` accidentales que aparezcan en el sketch).
- **Microinteracciones** — durations, curvas y patterns documentados aquí (NO los `transition: all 0.3s ease` defaults heredados de baseline).
- **IA y wireframes** — los wireframes del Plan 04 son la fuente canónica del layout (NO lo que aparezca en el HTML, que puede haberse simplificado por velocidad de sketch).

Esta sección existe para prevenir explícitamente el anti-patrón documentado en CONCERNS.md: "se copia el sketch 1:1 a producción y nos llevamos las decisiones provisionales como deuda técnica". El throwaway HTML es **un objeto desechable** una vez que la decisión de dirección está tomada en Plan 06.

---

## Recommendation & decision

_(empty — to be filled by Plan 06 after the user reviews wireframes and HTML sketches)_

**Selected direction:** _[Plan 06 fills]_
**Rationale:** _[Plan 06 fills]_
**Adjustments before Phase 4 implementation:** _[Plan 06 fills]_

---

*Redesign proposal produced: 2026-05-10 · Phase 2 Plan 03 · Skill: `ui-ux-designer` · Inputs: 29 friction points (F-01..F-29) + 36 Nielsen findings (H1..H10) including 11 priority-fix Severity ≥ 3.*
