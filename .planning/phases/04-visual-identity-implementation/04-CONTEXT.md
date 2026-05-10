# Phase 4: Visual Identity Implementation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 aplica al frontend la design system locked en Phase 2 (Direction A — "Research notebook"): tokens CSS, tipografía characterful, branded shell con header + sidebar, microinteractions polished. Cierra **VIS-01..04**.

**In scope:**
- Reemplazar la paleta Bootstrap-flavored (`#4a90e2`, `#f5f5f5`, `#f0fff0`) por la paleta terracota+neutros cálidos en CSS variables (light + dark canónicos).
- Swap de `system-ui` a Source Serif 4 Variable (body) + Inter Variable (UI) + JetBrains Mono Variable (code), self-hosted.
- Branded shell: header global 52px con nombre tipográfico + ampersand SVG + theme toggle runtime; sidebar restyled (280px, border subtle); intentional empty states.
- Microinteractions calmas: progress strip 3-segmento, hover fades, accordion `reasoning_details`, fade del Stage 3, toggle `prefers-reduced-motion`.
- Implementación de los 23 wireframes (W01-W23) de `wireframes.md`.

**Out of scope:**
- Mobile-first / responsive ≤768px más allá de un drawer básico (W23) — desktop ≥1280px optimizado.
- Editor visual / drag-and-drop / reorder de conversations (no se ha pedido).
- Settings/Preferences page (sí toggle theme en header, no más settings).
- Custom logo vectorial o brand guidelines completas — branding tipográfico + ampersand SVG mark.

</domain>

<decisions>
## Implementation Decisions

### Light/dark mode v1 scope

- **D-01:** Phase 4 v1 envía **ambos modos light + dark con UI toggle runtime** (cancela el deferred UX-V2-02 de Phase 2). El slot del toggle ya estaba definido en Phase 2 §"Information architecture"; Phase 4 lo activa funcionalmente.
- **D-02:** Detección inicial: `window.matchMedia('(prefers-color-scheme: dark)')` en primera carga. Tras toggle manual del usuario, persiste la elección en `localStorage` (key `theme: light | dark`) y deja de seguir el sistema. Patrón Linear/GitHub.
- **D-03:** Ubicación del toggle: **header global, esquina superior derecha** (per Phase 2 §"Information architecture" — el slot ya estaba reservado). Icon button con SVG sun/moon inline (24px).
- **D-04:** El switch de tema cambia un atributo `data-theme="light|dark"` en `<html>` o `<body>`. Las CSS variables del `:root` están duplicadas bajo `[data-theme="dark"] :root` o equivalente — cero JS para colors, solo el toggle del attribute.
- **D-05:** FOUC mitigation: un script inline blocking en `index.html` lee `localStorage.theme` y aplica `data-theme` antes del primer paint, evitando el flash.

### Migration strategy

- **D-06:** **Plan A** (foundations) primero, aislado: añade `:root` CSS variables al `index.css` para todos los tokens (color, typography roles, spacing scale si aplica), define `@font-face` para las 3 familias, y renderiza una pantalla "smoke" que no rompe nada. Aliases legacy `--color-bootstrap-*` si hace falta para minimizar diff.
- **D-07:** Tras Plan A, **waves paralelas agrupadas por superficie**:
  - **Wave 2 (shell):** App.css + index.css + nuevo Header component + theme toggle + MessageHeader (ya existe pero recibe restyling de tipografía).
  - **Wave 3 (deliberation):** Stage1.css, Stage2.css, Stage3.css, Stage4.css, ChatInterface.css, QualityToggle.css, ReasoningDisclosure.css.
  - **Wave 4 (conversations):** Sidebar.css, Modal.css, Menu.css.
- **D-08:** Estado intermedio entre planes es funcionalmente válido — los tokens existen pero solo los componentes migrados los consumen; los no-migrados siguen con hex hardcoded coexistiendo. Este coste se acepta a cambio de waves chicas y commits review-friendly.
- **D-09:** Cada plan de Wave 2-4 incluye verify automático de "no quedan hex Bootstrap-flavored" (`grep -E "#(4a90e2|f5f5f5|f0fff0|357abd|f0f0f0)" frontend/src` retorna vacío en su scope).

### Microinteractions implementation

- **D-10:** **Pure CSS only** — transitions, keyframes, `:hover`, `:focus-visible`. Cero animation libraries (sin Framer Motion / react-transition-group / GSAP). Phase 2 specs (150-300ms ease-out, sin spring) son todas factibles en CSS puro.
- **D-11:** `@media (prefers-reduced-motion: reduce)` honrado en `index.css` — overrides globales que reducen `transition-duration` a `0.01ms` y desactivan keyframes pesados (dots animados del progress strip).
- **D-12:** Accordion del `reasoning_details` (Stage 1) usa la técnica **`grid-template-rows: 0fr → 1fr`** (CSS-only modern) para animar de altura 0 a `auto` sin medir scrollHeight. Soportada en todos los browsers modernos. Cero JS helpers.
- **D-13:** Dots animados del progress strip se implementan con `@keyframes` simples (3 dots con `animation-delay` staggered de 220ms cada uno). El strip se hide via `max-height: 0` + opacity tras Stage 3 complete (mismo patrón grid trick si necesario).

### Wireframe coverage v1

- **D-14:** Cobertura **completa** de los 23 wireframes (W01-W23) en Phase 4. Incluye:
  - Header global nuevo (no existe hoy) — VIS-03.
  - Welcome state con serif h1 + 3 ejemplos italic — F-01..F-04.
  - Progress strip 3-segmento — F-06, H1-01.
  - Mobile drawer básico (W23) — sidebar colapsa a drawer ≤768px.
  - Error banner persistente con retry — H9-01 catastrófico.
  - Sidebar empty state con ampersand serif gigante.
- **D-15:** **App icon: SVG inline ampersand serif** (`&` en Source Serif 4 weight 400, `--color-fg-secondary`). Reusa el mark del sidebar empty state para coherencia. 24px en header, 96-128px en empty state. Cero deps de icon libraries.
- **D-16:** Favicon del browser tab usa el mismo ampersand renderizado a 32x32 PNG (build step opcional o checked-in static).
- **D-17:** El nombre tipográfico es **"LLM Council"** en Source Serif 4 weight 600, 18-20px, `--color-fg-primary`. Sin tagline.

### Font hosting

- **D-18:** **Self-host woff2** en `frontend/public/fonts/`. Las 3 familias variable subset Latin Extended:
  - `SourceSerif4-Variable.woff2` (~120KB)
  - `Inter-Variable.woff2` (~95KB)
  - `JetBrainsMono-Variable.woff2` (~80KB)
  - Total ~300KB committed al repo. Funciona offline, sin CORS, sin terceros.
- **D-19:** `@font-face` declaraciones en `index.css` con `font-display: swap` (FOUT mitigation — text visible inmediatamente con system fallback, swap silenciosa cuando la familia carga).
- **D-20:** Fallbacks system-ui en cada `font-family` chain — si los woff2 fallan al cargar, el text sigue legible: `font-family: 'Source Serif 4 Variable', Georgia, serif;`.

### Claude's Discretion

- **Spacing scale:** El researcher puede proponer una scale (4/8/12/16/24/32/48px o similar) basada en wireframes y `03-redesign-proposal.md` §"Information architecture". No se ha discutido específicamente.
- **Border-radius scale:** Phase 2 menciona `radius: 6px` (Menu) y `radius: 8px` (Modal). Researcher puede consolidar en 2-3 tokens (`--radius-sm`, `--radius-md`).
- **Shadow scale:** Phase 2 menciona shadows específicos por componente (`0 4px 12px` Menu elevated, `0 8px 24px` Modal). Researcher consolida en `--shadow-sm`, `--shadow-md`.
- **Plan structure dentro de cada wave:** El planner decide tasks atómicas óptimas — ej. en Plan A, separar `@font-face` de tokens en 2 tasks o uno; en Wave 3, si Stage1+QualityToggle+ReasoningDisclosure caben en 1 plan vs 2.
- **Theme toggle UX detalle:** El researcher confirma si el icon-button rota o swap entre sun/moon vs. usa una sola dual-icon. Phase 2 no lo dictó.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked design specs (Phase 2 outputs)

- `.planning/ux/03-redesign-proposal.md` — **Direction A "Research notebook"** completo: paleta light+dark con hex codes y contrast ratios, sistema tipográfico con tabla de roles (display/h1/h2/h3/body/body-small/code/label/microcopy), microinteractions con duraciones/easings, IA con dimensiones (sidebar 280px, max-width 65ch, header 52px), density stance, cost surfacing pattern, reasoning disclosure pattern, empty/loading/error states, Phase 1 components restyling notes, maps to friction & audit.
- `.planning/ux/04-mockups/wireframes.md` — Los 23 wireframes (W01-W23) con índice. Contrato estructural neutral; Phase 4 lo materializa con la skin Direction A.
- `.planning/ux/04-mockups/sketch-notebook.html` — **Solo referencia visual, NO código a copiar.** Está disclaimer-marked como throwaway.
- `.planning/ux/01-cognitive-walkthrough.md` — 29 friction points (F-01..F-29) que la implementación debe resolver.
- `.planning/ux/02-nielsen-audit.md` — 36 findings, 11 priority-fix Severity≥3, 2 catastróficos. Phase 4 cierra los anchors mapeados en cada wireframe.

### Phase decisions trail

- `.planning/phases/02-ux-research-design-brief/02-CONTEXT.md` — Decisiones de Phase 2 que originaron Direction A.
- `.planning/phases/03-quality-dial-pragmatic-deep-research/03-CONTEXT.md` — Phase 3 ya aterrizó componentes que Phase 4 va a restyling: QualityToggle, ReasoningDisclosure, Stage4, MessageHeader.
- `.planning/phases/03-quality-dial-pragmatic-deep-research/03-05-SUMMARY.md` — Inventario de componentes nuevos creados en Phase 3.

### Project-level

- `.planning/PROJECT.md` §Constraints — Tech stack fijo (React 19 + Vite 7), no Tailwind/MUI/Bootstrap, single-user local.
- `.planning/REQUIREMENTS.md` — VIS-01..04 con redacción canónica.
- `.planning/ROADMAP.md` §Phase 4 — Goal + Success Criteria + UI hint:yes.
- `.planning/codebase/STRUCTURE.md` — Convención co-located `.css` + `.jsx` por componente.
- `.planning/codebase/CONVENTIONS.md` — Reglas de naming kebab-case CSS, camelCase JS, PascalCase components.

### External (font sources)

- `https://fonts.adobe.com/fonts/source-serif-4` (Source Serif 4 — SIL OFL, descarga directa woff2 desde Google Fonts CDN o GitHub `adobe-fonts/source-serif`)
- `https://github.com/rsms/inter/releases` (Inter Variable — SIL OFL, download woff2 directo)
- `https://github.com/JetBrains/JetBrainsMono/releases` (JetBrains Mono Variable — SIL OFL)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`frontend/src/components/Markdown.jsx`** — wrapper de ReactMarkdown ya existe. Phase 4 no lo modifica funcionalmente, solo estiliza la `.markdown-content` global class.
- **`frontend/src/components/Modal.jsx`** + **`Menu.jsx`** — implementados en Phase 1, Phase 4 los restyling per `03-redesign-proposal.md` §"Phase 1 components restyling notes".
- **`frontend/src/components/QualityToggle.jsx`** + **`ReasoningDisclosure.jsx`** + **`Stage4.jsx`** + **`MessageHeader.jsx`** — implementados en Phase 3 con CSS placeholder. Phase 4 los reescribe con tokens y tipografía Direction A.
- **`frontend/src/index.css`** — único punto global hoy. Phase 4 lo expande con `:root` CSS variables, `@font-face`, `prefers-reduced-motion` overrides.

### Established Patterns

- **Co-located `.css` + `.jsx` por componente** (CONVENTIONS.md) — Phase 4 NO consolida en un theme.css; los tokens viven en `:root` del `index.css` y cada componente.css los consume via `var(--color-*)`. Esta es la regla más importante para no romper la convención del repo.
- **Kebab-case CSS classes** — `.chat-interface`, `.aggregate-item`, `.rank-position`. Phase 4 mantiene patrón.
- **Sin pre-procesador** — vanilla CSS con CSS variables. No SASS/Less/PostCSS más allá de Vite default.
- **Sin tests automáticos de UI** — visual checking manual via `npm run dev` + browser. Phase 4 acepta esto; un visual-regression test (Playwright + screenshots) es backlog futuro.

### Integration Points

- **Header global nuevo** se monta en `App.jsx` por encima del Sidebar+Main split. `App.css` ajusta el grid para acomodarlo.
- **Theme toggle context/hook** — un `useTheme()` hook minimal en `frontend/src/hooks/useTheme.js` (nuevo file) que lee `localStorage`, expone `theme + setTheme`, y aplica `data-theme` al `documentElement`.
- **Welcome state** — actualmente vive como early-return en `ChatInterface.jsx` con un `<h1>` plano. Phase 4 lo expande con serif h1 + 3 ejemplos italic en body-small.
- **Progress strip** — componente nuevo (`Stage1Progress.jsx`?) que vive entre el header del main panel y los stages. Recibe el stage activo como prop.

</code_context>

<specifics>
## Specific Ideas

- **Branding tipográfico, no logo vectorial** — Phase 2 lo dejó claro y Phase 4 lo ratifica. La identidad es Source Serif 4 weight 600 con el nombre del producto + un ampersand SVG inline como mark visual sutil. Tono "producto personal serio", sin vibes corporativas.
- **El `&` ampersand como brand mark** — apareció primero en Phase 2 §"Empty / loading / error states" como mark gigante del sidebar empty state. Phase 4 lo eleva a brand mark del header (a 24px) además del empty state (a 96-128px). Coherencia notebook visual.
- **Progress strip 3-segmento** — F-06 + H1-01 son priority. El strip muestra `Stage 1 · 4 modelos`, `Stage 2 · evaluating`, `Stage 3 · synthesis` con dots animados en active y fade-out tras complete. La lista de modelos visible en `microcopy` debajo del segmento active resuelve "qué modelos están corriendo".
- **Stage 3 no usa el verde Bootstrap `#f0fff0`** — reemplazado por `--color-accent-soft` (warm tinted con el terracota) + border-left 3px `--color-accent`. Prohibición explícita en VIS-01.
- **Three-dot menu persistente en fila activa del sidebar** — desviación deliberada del pattern ChatGPT estricto, justificada por H6-02 + F-16 severity 3. Phase 4 implementa este detalle exactamente como dice `03-redesign-proposal.md`.

</specifics>

<deferred>
## Deferred Ideas

- **Visual regression testing (Playwright + screenshots)** — backlog. Phase 4 confía en visual-check manual. Útil para v2 cuando el design system esté maduro.
- **Mobile-first responsive ≤768px completo** — Phase 4 incluye solo el drawer básico (W23). Tablet/landscape, gestures, etc. son backlog.
- **Settings/Preferences page** — Solo el theme toggle vive en header. Si surge necesidad de más prefs (font-size, density, language), abrir Phase futura.
- **Custom illustrations o iconography más allá del ampersand** — el sistema actual usa el ampersand serif como brand mark único. Si emerge necesidad de más iconography (ej. para tutorials, onboarding), nuevo phase.
- **Animación de entrada al cambiar de conversation** — Phase 4 hace fade simple del main panel. Coordinated layout transitions entre conversations son backlog.

</deferred>

---

*Phase: 04-visual-identity-implementation*
*Context gathered: 2026-05-10*
