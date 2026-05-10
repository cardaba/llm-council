# Phase 4: Visual Identity Implementation - Research

**Researched:** 2026-05-10
**Domain:** Frontend visual identity — CSS architecture (design tokens), variable font hosting, theme switching, CSS-only microinteractions
**Confidence:** HIGH

## Summary

Phase 4 aplica al frontend el design system locked en Phase 2 (Direction A "Research notebook"). El alcance es deliberadamente acotado: un solo lenguaje de tokens CSS añadido a `frontend/src/index.css`, tres familias variable woff2 self-hosted, light+dark mode con toggle runtime, y microinteractions pure-CSS — sin nuevas dependencias en `package.json`.

La investigación confirma que las decisiones del CONTEXT.md son técnicamente sólidas y representan el estado del arte 2026: token system con 2 capas (primitivos opcionales + semánticos por rol), data-attribute switching con FOUC mitigation via inline blocking script, accordion via `grid-template-rows: 0fr → 1fr` (Baseline 2024-09 — soporte universal en navegadores modernos), `font-display: swap` para FOUT en lugar de FOIT, y `prefers-reduced-motion` con override global usando duraciones cuasi-cero (NO `animation: none`) para preservar focus rings y feedback esencial.

**Primary recommendation:** Plan A (foundations) introduce los tokens de Direction A y `@font-face` declaraciones en `index.css` SIN tocar componentes. Las waves 2-4 migran superficies por agrupación geométrica (shell / deliberation / conversations) consumiendo `var(--token)`. El `useTheme` hook se aísla en `frontend/src/hooks/useTheme.js` con la lógica de `matchMedia` + `localStorage` + `data-theme` attribute. El FOUC inline script vive en `frontend/index.html`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens (palette, typography, spacing, radius, shadow) | Browser/Client (CSS) | — | Pure visual layer; ningún backend/SSR involucrado en SPA Vite |
| Variable font hosting | CDN/Static (Vite `public/`) | Browser/Client | Self-host woff2 servidos como static assets con cache HTTP |
| Theme switching (light/dark) | Browser/Client (CSS + 1 JS hook) | — | `data-theme` attribute drives CSS; React hook gestiona toggle y persistencia |
| FOUC mitigation | Browser/Client (inline blocking script) | — | Ejecuta antes del primer paint; lee `localStorage`; aplica attribute al `<html>` |
| Microinteractions (transitions, keyframes, accordion) | Browser/Client (CSS only) | — | Sin animation libs; `grid-template-rows` + `@keyframes` + transitions cubren todo el spec de Phase 2 |
| Branded shell (Header + Sidebar restyle + empty states) | Browser/Client (React) | — | Nuevo `Header` component + ajuste de `App.css` grid + welcome state expandido |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Light/dark mode v1 scope**
- **D-01:** Phase 4 v1 envía ambos modos light + dark con UI toggle runtime (cancela el deferred UX-V2-02 de Phase 2).
- **D-02:** Detección inicial: `window.matchMedia('(prefers-color-scheme: dark)')` en primera carga. Tras toggle manual, persiste en `localStorage` (key `theme: light | dark`) y deja de seguir el sistema.
- **D-03:** Toggle en header global, esquina superior derecha. Icon button con SVG sun/moon inline (24px).
- **D-04:** El switch cambia un atributo `data-theme="light|dark"` en `<html>` o `<body>`. CSS variables del `:root` duplicadas bajo `[data-theme="dark"] :root` o equivalente — cero JS para colors, solo el toggle del attribute.
- **D-05:** FOUC mitigation via inline blocking script en `index.html` que lee `localStorage.theme` y aplica `data-theme` antes del primer paint.

**Migration strategy**
- **D-06:** Plan A (foundations) primero, aislado: añade `:root` CSS variables a `index.css`, `@font-face` para las 3 familias, render una pantalla "smoke" sin romper nada. Aliases legacy si hace falta.
- **D-07:** Tras Plan A, waves paralelas agrupadas por superficie (Wave 2 shell / Wave 3 deliberation / Wave 4 conversations).
- **D-08:** Estado intermedio coexistiendo (tokens + hex hardcoded) es válido — coste aceptado.
- **D-09:** Cada plan de Wave 2-4 incluye verify automático grep de "no quedan hex Bootstrap-flavored" en su scope.

**Microinteractions implementation**
- **D-10:** Pure CSS only — transitions, keyframes, `:hover`, `:focus-visible`. Cero animation libraries.
- **D-11:** `@media (prefers-reduced-motion: reduce)` honrado en `index.css`.
- **D-12:** Accordion del `reasoning_details` usa `grid-template-rows: 0fr → 1fr`.
- **D-13:** Dots animados del progress strip via `@keyframes` (3 dots con `animation-delay` staggered 220ms).

**Wireframe coverage v1**
- **D-14:** Cobertura completa W01-W23 (header global, welcome state, progress strip 3-segmento, mobile drawer básico, error banner persistente, sidebar empty state).
- **D-15:** App icon = SVG inline ampersand serif (Source Serif 4 weight 400, `--color-fg-secondary`). 24px en header, 96-128px en empty state.
- **D-16:** Favicon usa el mismo ampersand renderizado a 32x32 PNG.
- **D-17:** Nombre tipográfico "LLM Council" en Source Serif 4 weight 600, 18-20px.

**Font hosting**
- **D-18:** Self-host woff2 en `frontend/public/fonts/`. 3 familias variable subset Latin Extended, ~300KB total committed.
- **D-19:** `@font-face` con `font-display: swap` (FOUT mitigation).
- **D-20:** Fallbacks system-ui en cada `font-family` chain.

### Claude's Discretion

- **Spacing scale** — researcher propone scale (4/8/12/16/24/32/48px o similar).
- **Border-radius scale** — consolidar en 2-3 tokens (`--radius-sm`, `--radius-md`).
- **Shadow scale** — consolidar en `--shadow-sm`, `--shadow-md`.
- **Plan structure dentro de cada wave** — planner decide tasks atómicas óptimas.
- **Theme toggle UX detalle** — confirmar si icon-button rota o swap entre sun/moon.

### Deferred Ideas (OUT OF SCOPE)

- Visual regression testing (Playwright + screenshots).
- Mobile-first responsive ≤768px completo (solo drawer básico W23 incluido).
- Settings/Preferences page.
- Custom illustrations o iconography más allá del ampersand.
- Animación de entrada al cambiar de conversation.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **VIS-01** | Bespoke palette replaces Bootstrap-flavored defaults; tokens en `frontend/src/index.css` aplicados consistentemente | §Standard Stack (token system), §Architecture Patterns Pattern 1 (token layering), §Code Examples 1-2, §Common Pitfalls 1+3+5 |
| **VIS-02** | Typography swap de `system-ui` a familia characterful, loaded efficiently, site-wide | §Standard Stack (Source Serif 4 + Inter + JetBrains Mono Variable), §Architecture Patterns Pattern 2 (font loading), §Code Examples 3, §Common Pitfalls 2+6 |
| **VIS-03** | Branded app shell — header con name + icon, distinctive sidebar, intentional empty states | §Architecture Patterns Pattern 3 (App.jsx grid), §Code Examples 4 (Header component), §Code Examples 7 (welcome state) |
| **VIS-04** | Microinteractions — smooth transitions, non-generic loaders, hover states, animated stage progress | §Architecture Patterns Pattern 4 (CSS-only animations), §Code Examples 5-6 (accordion + dots), §Common Pitfalls 4+7 |

## Standard Stack

### Core (already installed — Phase 4 adds nothing to package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI framework — Phase 4 only adds `useTheme` hook + `Header` component | Existing, fixed by PROJECT.md constraints |
| Vite | 7.2.4 | Dev server + build — serves `public/fonts/*.woff2` automatically | Existing |
| Vanilla CSS | — | Tokens via CSS custom properties; co-located per component | No pre-procesador en repo (CONVENTIONS.md) |

### Supporting (web fonts — self-hosted woff2 files)

| Asset | Latest Version (verified) | Purpose | License |
|-------|---------------------------|---------|---------|
| Source Serif 4 Variable | **4.005R** [VERIFIED: github.com/adobe-fonts/source-serif/releases] | Body, h1/h2/display, brand wordmark, ampersand mark | SIL OFL 1.1 |
| Inter Variable | **v4.1** [VERIFIED: github.com/rsms/inter/releases] | UI text, h3, sidebar items, labels, microcopy, tabular numerals | SIL OFL 1.1 |
| JetBrains Mono Variable | **v2.304** [VERIFIED: github.com/JetBrains/JetBrainsMono/releases] | Inline code, code blocks, model identifiers, file paths | SIL OFL 1.1 |

**Verified download URLs (canonical sources):**

```bash
# Source Serif 4 (woff2 lives under TTF subset Latin variable)
# Repo browse: https://github.com/adobe-fonts/source-serif/tree/release/WOFF2/VAR
# Direct (Roman + Italic variable axes, latin subset):
#   https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Roman.otf.woff2
#   https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Italic.otf.woff2

# Inter (single variable woff2 covers full weight range 100-900)
# Download zip from https://github.com/rsms/inter/releases/tag/v4.1
# After unzip: web/InterVariable.woff2 (~310KB unsubset; subset to Latin Extended brings to ~95KB)

# JetBrains Mono (variable wght axis)
# Download zip from https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304
# After unzip: fonts/webfonts/JetBrainsMono[wght].woff2
```

**Subsetting note** [CITED: web.dev/optimize-webfont-loading]: Las decisiones del CONTEXT (Latin Extended subset target ~95-120KB por familia) son alcanzables con `pyftsubset` (fonttools) o el subset en línea de Wakamai Fondue. Si el planner prefiere evitar la complejidad de subsetting, descargar el woff2 oficial directo y aceptar ~120-310KB es funcionalmente equivalente para una app local single-user (no hay coste de bandwidth).

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Why we keep the locked choice |
|------------|-----------|----------|-------------------------------|
| Self-hosted woff2 | Google Fonts CDN | Cero bytes en repo; latencia de DNS+TLS+request en cold start | D-18 lockea self-host (offline + privacy + no third-party); el ahorro de ~300KB no compensa la dependencia externa para una app local |
| `data-theme` attribute | `class="dark"` on `<html>` | Equivalente funcionalmente; class es el patrón Tailwind | D-04 lockea `data-theme`; coexiste mejor con CSS attribute selectors `[data-theme="dark"]` y no choca con utility classes futuras |
| `grid-template-rows: 0fr → 1fr` | `max-height: 0 → 1000px` | `max-height` requiere magic number y siempre acaba con timing roto; `grid` anima a `auto` real | D-12 lockea grid trick — soporte Baseline 2024-09 [VERIFIED: caniuse.com/mdn-css_properties_grid-template-rows_animation] |
| Animation library (Framer Motion / react-transition-group) | — | +bundle size, +API surface, +abstraction | D-10 lockea pure CSS; Phase 2 specs (150-300ms ease-out, sin spring) son todas factibles en CSS |
| `useSyncExternalStore` para theme | `useState` + `useEffect` con matchMedia listener | useSyncExternalStore es más correcto para sources externos; useState patron es más legible en una codebase que ya usa useState everywhere | Recomendamos `useState`+`useEffect` por consistencia con `App.jsx`; useSyncExternalStore es sobre-engineered para 1 hook usado 1 vez [ASSUMED — verificar contra el resto del codebase patterns] |

**Installation:** Phase 4 NO añade dependencias a `package.json`. Los assets woff2 se commitean directamente a `frontend/public/fonts/`.

**Version verification:**
```bash
# Source Serif 4
# Latest tag: 4.005R (semantic mismatch — Adobe usa "R" suffix). Confirmado en repo Releases page.
# Inter
# Latest tag: v4.1 (Nov 2025 release). Confirmado en repo Releases page.
# JetBrains Mono
# Latest tag: v2.304. Confirmado en repo Releases page.
```

## Architecture Patterns

### System Architecture Diagram

```
                    ┌──────────────────────────┐
                    │ frontend/index.html      │
                    │  ┌────────────────────┐  │
                    │  │ <script>           │  │ ← FOUC mitigation:
                    │  │  read localStorage │  │    blocking, executes
                    │  │  set data-theme    │  │    BEFORE first paint
                    │  │ </script>          │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
       ┌──────────────────────────────────────────────────┐
       │ React app mounts                                  │
       │  ┌───────────────────────────────────────────┐    │
       │  │ <App>                                     │    │
       │  │   useTheme()  ← localStorage + matchMedia │    │
       │  │     │                                     │    │
       │  │     ▼                                     │    │
       │  │  <Header>  [theme toggle button]          │    │
       │  │  ────────────────────────────────         │    │
       │  │  <Sidebar>     │   <ChatInterface>        │    │
       │  │  (restyled)    │   (restyled)             │    │
       │  └────────────────┴──────────────────────────┘    │
       └──────────────────────────────────────────────────┘
                                 │
                                 │ all .css files consume
                                 ▼
       ┌──────────────────────────────────────────────────┐
       │ frontend/src/index.css                           │
       │  ┌────────────────────────────────────────────┐  │
       │  │ @font-face × 3                             │  │
       │  │ :root { --color-* --font-* --space-* }     │  │
       │  │ [data-theme="dark"] :root { --color-* }    │  │
       │  │ @media prefers-reduced-motion { * }        │  │
       │  └────────────────────────────────────────────┘  │
       │           │ var(--token) consumption             │
       │           ▼                                      │
       │  Component .css files (co-located, kebab-case)   │
       └──────────────────────────────────────────────────┘

       Static assets served from frontend/public/fonts/:
       SourceSerif4Variable-Roman.woff2  ← font-display: swap
       Inter-Variable.woff2
       JetBrainsMono-Variable.woff2
```

### Recommended Project Structure

```
frontend/
├── index.html                  # Add <script> FOUC blocker in <head>; <link rel="preload"> fonts
├── public/
│   └── fonts/                  # NEW directory
│       ├── SourceSerif4-Variable-Roman.woff2
│       ├── SourceSerif4-Variable-Italic.woff2
│       ├── Inter-Variable.woff2
│       └── JetBrainsMono-Variable.woff2
└── src/
    ├── index.css               # EXPANDED — @font-face, :root tokens, dark theme overrides, prefers-reduced-motion
    ├── App.css                 # MODIFIED — grid for header + sidebar + main; consumes tokens
    ├── App.jsx                 # MODIFIED — mounts <Header>; uses useTheme indirectly via Header
    ├── hooks/                  # NEW directory
    │   └── useTheme.js         # NEW — localStorage + matchMedia + data-theme attribute
    └── components/
        ├── Header.jsx + .css   # NEW — branded shell (wordmark + ampersand SVG + theme toggle)
        ├── ThemeToggle.jsx + .css  # NEW (or inline in Header) — sun/moon icon button
        ├── Stage1Progress.jsx + .css   # NEW — 3-segment progress strip (W23)
        ├── Sidebar.css         # MODIFIED — restyle with tokens; ampersand empty state
        ├── ChatInterface.css   # MODIFIED — welcome state (W01) expanded
        ├── Stage1.css / Stage2.css / Stage3.css / Stage4.css   # MODIFIED
        ├── QualityToggle.css / ReasoningDisclosure.css / MessageHeader.css   # MODIFIED — swap hex placeholders for tokens
        ├── Modal.css / Menu.css   # MODIFIED — token consumption
        └── ErrorBanner.jsx + .css   # NEW — persistent error banner (H9-01)
```

### Pattern 1: Two-layer token system (semantic-first, primitives optional)

**What:** Definir tokens en dos capas en `:root`: una capa primitiva opcional (paleta cruda — `--terracota-500`, `--neutral-50`) y una capa semántica obligatoria (intent — `--color-bg-primary`, `--color-fg-primary`, `--color-accent`). Componentes consumen SOLO la capa semántica.

**When to use:** Siempre que haya light + dark themes — la capa semántica permite swap por `data-theme` selector sin tocar componentes; la capa primitiva opcional ayuda a rationalizar tints duplicados (`--color-accent-soft` reusa `--terracota-100`).

**Why this matters** [CITED: design.va.gov/foundation/design-tokens, contentful.com/blog/design-token-system]: Semantic naming (intent-based) sobrevive cambios de paleta; primitive naming (color-based) no. `--color-accent` es estable; `--color-terracota-500` quiebra si rebrand a azul.

**Recommendation for Phase 4:** Una sola capa semántica es suficiente para 14 tokens de color (la lista del CONTEXT D-Direction A). Saltar la capa primitiva mantiene el archivo legible. Si la paleta crece >25 tokens, introducir primitivos en Wave futura.

**Example:**
```css
/* Source: docs.va.gov/foundation/design-tokens (semantic-first principle) */
:root {
  /* Color — semantic layer */
  --color-bg-primary: #FAF8F4;
  --color-bg-secondary: #F2EFE8;
  --color-bg-elevated: #FFFFFF;
  --color-fg-primary: #2A2724;
  --color-fg-secondary: #6B635A;
  --color-fg-muted: #9A9088;
  --color-accent: #B05A2A;
  --color-accent-soft: #EFD9C5;
  --color-border-subtle: #E5DFD4;
  --color-border-strong: #C8BFB2;
  --color-focus-ring: rgba(176, 90, 42, 0.35);
  --color-error: #A03828;
  --color-warn: #8C6620;
}

[data-theme="dark"] :root,
[data-theme="dark"] {
  --color-bg-primary: #1C1A17;
  --color-bg-secondary: #23201D;
  --color-bg-elevated: #2A2723;
  --color-fg-primary: #EFEAE2;
  --color-fg-secondary: #B5ADA1;
  --color-fg-muted: #7E766C;
  --color-accent: #E08A4F;
  --color-accent-soft: #3A2A20;
  --color-border-subtle: #34302B;
  --color-border-strong: #4A443D;
  --color-focus-ring: rgba(224, 138, 79, 0.45);
  --color-error: #D86B55;
  --color-warn: #C99650;
}
```

### Pattern 2: Variable font loading with `font-display: swap` + preload

**What:** Self-host woff2 en `public/fonts/`; declarar `@font-face` con `font-display: swap`; añadir `<link rel="preload" as="font" type="font/woff2" crossorigin>` en `index.html` para las 1-2 familias más críticas.

**When to use:** Siempre con variable woff2 self-hosted. El `swap` evita FOIT (Flash of Invisible Text — texto invisible hasta que carga la fuente); el preload reduce el tiempo en system-fallback antes del swap.

**Why** [CITED: web.dev/optimize-webfont-loading, MDN @font-face docs]: `font-display: swap` mantiene legible el texto desde t=0 con system-ui fallback; cuando carga la web font, swap silencioso. `font-display: optional` es alternativa pero descarta la fuente si no carga en 100ms — riesgo de inconsistencia.

**Example:**
```css
/* Source: developer.mozilla.org/en-US/docs/Web/CSS/@font-face */
@font-face {
  font-family: 'Source Serif 4 Variable';
  src: url('/fonts/SourceSerif4-Variable-Roman.woff2') format('woff2-variations'),
       url('/fonts/SourceSerif4-Variable-Roman.woff2') format('woff2');
  font-weight: 200 900;       /* variable axis range */
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Source Serif 4 Variable';
  src: url('/fonts/SourceSerif4-Variable-Italic.woff2') format('woff2-variations');
  font-weight: 200 900;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'Inter Variable';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations'),
       url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono Variable';
  src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2-variations'),
       url('/fonts/JetBrainsMono-Variable.woff2') format('woff2');
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-serif: 'Source Serif 4 Variable', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono:  'JetBrains Mono Variable', 'SF Mono', Menlo, Consolas, monospace;
}

/* Tabular numerals for Stage 2 ranking + cost subtitles + timestamps */
.stage2-aggregate, .quality-toggle__cost, .sidebar-meta {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

```html
<!-- frontend/index.html — inside <head> -->
<link rel="preload" href="/fonts/SourceSerif4-Variable-Roman.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
<!-- JetBrainsMono no preload — mono solo se usa en code blocks, baja prioridad -->
```

### Pattern 3: App shell layout (Header + Sidebar + Main)

**What:** Cambiar `App.css` de `display: flex` (horizontal) a `display: grid` con `grid-template-rows: 52px 1fr` y `grid-template-columns: 280px 1fr`. Header span 2 columns; Sidebar y Main en row 2.

**When to use:** Cuando hay un Header global que afecta a todo el viewport; grid permite que Header colapse a una sola fila por encima del split horizontal sin nesting de flex.

**Example:**
```css
/* Source: existing App.css pattern + grid extension */
.app {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 52px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--color-bg-primary);
  color: var(--color-fg-primary);
  font-family: var(--font-serif);
}

.app__header {
  grid-column: 1 / -1;       /* span both columns */
  grid-row: 1;
}
.app__sidebar { grid-row: 2; grid-column: 1; }
.app__main    { grid-row: 2; grid-column: 2; overflow: hidden; }

/* Mobile drawer (W23) — basic; collapses sidebar */
@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;
  }
  .app__sidebar {
    position: fixed;
    inset: 52px 0 0 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 200ms ease-out;
  }
  .app__sidebar[data-open="true"] {
    transform: translateX(0);
  }
}
```

### Pattern 4: Pure-CSS microinteractions (transitions + keyframes + grid trick)

**What:** Phase 2 specs son alcanzables sin libs:
- Hover fades → `transition: background-color 180ms ease-out`
- Progress strip dots → `@keyframes` con `animation-delay` staggered
- Accordion (reasoning_details) → `grid-template-rows: 0fr → 1fr` transitioned
- Stage 3 fade-in → `@keyframes` 1× sobre `opacity` + `translateY`

**When to use:** SIEMPRE que la animación sea ≤300ms, sin spring/overshoot, sin gesture-driven. Para esos casos, libs son sobre-engineering.

**Why grid trick over `max-height`** [CITED: css-tricks.com/css-grid-can-do-auto-height-transitions/, caniuse.com/mdn-css_properties_grid-template-rows_animation]: `max-height: 0 → 1000px` requiere magic number; transición termina cuando alcanza el max, NO cuando alcanza la altura real — timing roto. `grid-template-rows: 0fr → 1fr` anima a `auto` real. Soporte Baseline 2024-09 (Chrome 117+, Firefox 127+, Safari 17.4+). En 2026 esto es seguro.

### Anti-Patterns to Avoid

- **`!important` para overrides de tokens:** Si un componente necesita `!important` sobre un `var(--token)`, el problema es la cascada del componente, no el token. Refactor primero.
- **Hex codes hardcoded en componentes nuevos:** Si Phase 4 introduce un color que no está en la paleta Direction A, NO inventar el hex en la `.css` del componente — añadirlo a `:root` con un nombre semántico y consumirlo via `var()`.
- **`useEffect` para cambiar la paleta runtime:** El theme switch es un atributo HTML; React no toca CSS variables directamente. Un solo `document.documentElement.setAttribute('data-theme', ...)` desde el hook es suficiente.
- **Animar `height: 0 → auto` directamente:** No es animable en CSS. Usar grid trick (D-12) o `max-height` con magic number como fallback de último recurso.
- **`prefers-reduced-motion: reduce → animation: none`:** Rompe el feedback (ej. spinner que ya no spinning queda invisible). Mejor `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;`.
- **`<EventSource>` polyfill o reescribir api.js:** Phase 3 ya wireó SSE via `fetch().getReader()`. Phase 4 no toca esa lógica.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom storage abstraction | `localStorage.getItem('theme')` + `setItem('theme', ...)` directo | Es 4 líneas. Una abstracción es overhead. |
| matchMedia subscription | Polyfill | Native `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` | Soporte universal en navegadores 2026 [VERIFIED: caniuse.com/matchmedia] |
| Animated height-to-auto | JS measure scrollHeight | CSS grid `0fr → 1fr` | Pure CSS, GPU-friendly, accesible (no measurement race conditions) |
| Sun/moon icon | Icon library (lucide-react / heroicons / react-icons) | SVG inline (24px) hand-coded | 2 SVGs son ~30 líneas; no justifica una dep |
| Ampersand mark | Custom font, lottie, illustration | `<span style="font-family: var(--font-serif); font-weight: 400">&</span>` o SVG inline con `<text>` | Phase 2 D-15 explicit: "ampersand serif", reutiliza Source Serif 4 ya cargado |
| FOUC mitigation | next-themes lib | 12 líneas inline `<script>` en `index.html` | Phase 4 es Vite SPA, no Next.js; lib es overhead 100x |
| Tabular nums for ranking | Custom number formatter | CSS `font-variant-numeric: tabular-nums` | One-line CSS [VERIFIED: developer.mozilla.org/.../font-variant-numeric] |
| CSS reset | Tailwind preflight, normalize.css | Existing `* { margin: 0; padding: 0; box-sizing: border-box; }` en `index.css` | Adequate para single-page React SPA; añadir reset packages reintroduces dependency churn |

**Key insight:** Phase 4 es deliberadamente "no-deps". El único deliverable nuevo que cambia `package.json` debería ser cero. Todo es CSS + 1 hook React.

## Common Pitfalls

### Pitfall 1: FOUC at first paint when toggle has been used previously
**What goes wrong:** El usuario alterna a dark mode en una sesión anterior; al recargar, el navegador primero renderiza con la paleta light (default `:root`), 30-100ms después React monta y aplica `data-theme="dark"`, causando un flash blanco.
**Why it happens:** React solo se ejecuta tras `DOMContentLoaded`; los estilos del `:root` ya pintaron.
**How to avoid:** Inline blocking `<script>` en `<head>` que lee `localStorage.theme` y `setAttribute('data-theme')` ANTES del primer paint. Sin `defer`, sin `async`, sin `type="module"` (los modules son async-by-default).
**Warning signs:** Flash perceptible al refrescar la página. Test: `Ctrl+Shift+R` (hard refresh) en dark mode.

### Pitfall 2: FOUT chunky con woff2 lento
**What goes wrong:** El primer render usa system-ui (Georgia para serif); cuando Source Serif 4 carga ~150ms después, el text se "salta" porque las metrics son distintas (line-height different, x-height different). Cumulative Layout Shift visible.
**Why it happens:** `font-display: swap` reemplaza la fuente sin igualar las metrics del fallback con las de la web font.
**How to avoid:**
- Preload las 2 familias más críticas (Source Serif 4, Inter) — reduce el gap de fallback.
- Para refinement v2 (out of scope para Phase 4), `size-adjust` + `ascent-override` + `descent-override` en `@font-face` "fallback" sintético [CITED: developer.chrome.com/blog/font-fallbacks].
- En Phase 4, aceptar el FOUT chunky en cold start; al estar la fuente cacheada por el navegador desde el segundo render, el problema solo ocurre 1× por sesión.
**Warning signs:** Layout shift visible al cargar la app por primera vez tras `Ctrl+Shift+Del` (limpiar cache).

### Pitfall 3: `[data-theme="dark"]` selector colisionando con specificity
**What goes wrong:** Un componente tiene `.stage3 { background: var(--color-accent-soft); }`. Light mode funciona. En dark mode, el `--color-accent-soft` está bajo `[data-theme="dark"] :root`, pero el componente NO se actualiza porque el specificity de `.stage3` (1,0) > `[data-theme] :root` (1,1). En realidad esto NO ocurre porque la cascada CSS evalúa custom properties en el árbol DOM, no en el matching del selector — pero si el selector es `[data-theme="dark"] .stage3 { background: ... }` (overrides directos), choca.
**Why it happens:** Confusión entre re-declaring tokens (correct) vs override directo de propiedades (problema).
**How to avoid:**
- SOLO usar `[data-theme="dark"]` para REDECLARAR custom properties en `:root` o `body`.
- NUNCA escribir `[data-theme="dark"] .component { background: ... }` — el componente debe consumir `var(--token)` y los tokens cambian de valor por theme.
**Warning signs:** Cascada CSS frustrante; necesitas `!important` para que dark mode aplique.

### Pitfall 4: `prefers-reduced-motion` que rompe focus-visible
**What goes wrong:** El override global `* { transition-duration: 0.01ms !important }` deshabilita la transition del outline ring de `:focus-visible`, dejando focus rings invisibles para usuarios con motion-sensitivity (peor accesibilidad).
**Why it happens:** El `!important` pisa todo, incluido el outline animation.
**How to avoid:**
- Usar el patrón "global reduce duration, NOT global no-animation":
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* Preserve focus ring visibility — outline is essential, not decorative */
  *:focus-visible {
    outline: 2px solid var(--color-focus-ring) !important;
    outline-offset: 2px !important;
  }
}
```
- Diseñar focus rings como `outline` (no `transition`-driven), so reducing duration no los oculta.
**Warning signs:** En system con `Reduce motion` activado, no se ve dónde está el focus al tabbear.

### Pitfall 5: Hex Bootstrap-flavored sobreviviendo en componentes Phase 3 placeholder
**What goes wrong:** Phase 3 dejó hex placeholders en `QualityToggle.css`, `ReasoningDisclosure.css`, `Stage4.css`, `MessageHeader.css` (ver STATE.md "Phase 4 entry contract"). Wave 3 los migra, pero un grep `#4a90e2` puede no detectarlos si están escritos en mayúsculas o con shorthand `#4a9`.
**Why it happens:** Greps con regex específica miss casos.
**How to avoid:** Usar regex amplia que cubra todas las variantes: `grep -iE "#(4a90e2|357abd|f0f0f0|f5f5f5|f0fff0|4A90E2)" frontend/src/`. Mejor: `grep -iE "#[0-9a-f]{3,6}" frontend/src/components/QualityToggle.css` y revisar todos los hex que aparecen.
**Warning signs:** Visual diff entre Wave 3 done y Wave 4 muestra hex no-cambiado.

### Pitfall 6: `font-feature-settings: tabular-nums` no aplicando en variable fonts
**What goes wrong:** El número de ranking en Stage 2 (`1. Response A`, `2. Response B`) no alinea verticalmente porque la fuente usa proportional figures por default.
**Why it happens:** Inter Variable y Source Serif 4 Variable soportan tabular nums via OpenType feature `tnum`, pero NO se activan automáticamente.
**How to avoid:**
- Aplicar `font-variant-numeric: tabular-nums` (CSS-spec) en componentes con números alineados (Stage 2 ranking, cost subtitles, timestamps).
- Fallback con `font-feature-settings: "tnum" 1` para navegadores antiguos.
**Warning signs:** En el aggregate ranking de Stage 2, los números no quedan en columna.

### Pitfall 7: Inline rename input perdiendo focus en theme switch
**What goes wrong:** Usuario está renombrando una conversación (W08 inline rename activo), hace click en el theme toggle del header, el componente Sidebar re-renderiza por cascade, el input pierde focus, el blur dispara commit con el texto a medias.
**Why it happens:** El `data-theme` change no causa React re-render por sí solo (es un attribute DOM), pero el `useTheme` hook usa `useState` y el `setTheme` propaga por React tree.
**How to avoid:**
- El `useTheme` hook DEBE vivir lo más alto posible (en `App.jsx` o cerca) y propagar SOLO el toggle handler — no el theme value — a `Header`. Pero esto force re-render de `App`, que re-renderiza Sidebar.
- Mejor: el setter del theme NO triggers React state — actualiza `document.documentElement.setAttribute` y `localStorage` SIN setState. El theme actual se LEE imperativamente (no reactively) cuando lo necesite el componente.
- Implementación: `useTheme` retorna `{ toggle, getCurrent }` (no `theme` reactive). Sub-óptimo pero evita re-renders globales.
- **Alternativa recomendada:** mantener `setTheme` con setState; el costo de re-render es trivial (15-20 componentes). El bug del input rename no se materializará si el `useEffect` de `intentRef` (Phase 1 Plan 03) maneja blur correctamente.
**Warning signs:** Click en theme toggle mid-rename = título queda como va.

## Code Examples

Verified patterns from official sources and Phase 2 specs:

### Example 1: Complete `:root` token block (light + dark from CONTEXT D-Direction A)

```css
/* Source: .planning/ux/03-redesign-proposal.md §Direction A Palette */
:root {
  /* Color — light mode (default) */
  --color-bg-primary: #FAF8F4;
  --color-bg-secondary: #F2EFE8;
  --color-bg-elevated: #FFFFFF;
  --color-fg-primary: #2A2724;
  --color-fg-secondary: #6B635A;
  --color-fg-muted: #9A9088;
  --color-accent: #B05A2A;
  --color-accent-soft: #EFD9C5;
  --color-border-subtle: #E5DFD4;
  --color-border-strong: #C8BFB2;
  --color-focus-ring: rgba(176, 90, 42, 0.35);
  --color-error: #A03828;
  --color-warn: #8C6620;

  /* Typography */
  --font-serif: 'Source Serif 4 Variable', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono:  'JetBrains Mono Variable', 'SF Mono', Menlo, Consolas, monospace;

  --font-size-display: 2rem;        /* 32px — Stage 3 title */
  --font-size-h1: 1.625rem;          /* 26px */
  --font-size-h2: 1.375rem;          /* 22px */
  --font-size-h3: 1.125rem;          /* 18px */
  --font-size-body: 1.0625rem;       /* 17px */
  --font-size-body-small: 0.875rem;  /* 14px */
  --font-size-code: 0.9375rem;       /* 15px inline / 14px block */
  --font-size-label: 0.8125rem;      /* 13px */
  --font-size-microcopy: 0.75rem;    /* 12px */

  --line-height-tight: 1.25;
  --line-height-normal: 1.4;
  --line-height-loose: 1.65;          /* body markdown */

  /* Spacing scale (4px base, recommended by researcher) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Radius scale */
  --radius-sm: 6px;     /* Menu */
  --radius-md: 8px;     /* Modal, cards */

  /* Shadow scale */
  --shadow-sm: 0 4px 12px rgba(42, 39, 36, 0.10);   /* Menu elevated */
  --shadow-md: 0 8px 24px rgba(42, 39, 36, 0.08);   /* Modal */

  /* Layout */
  --layout-header-h: 52px;
  --layout-sidebar-w: 280px;
  --layout-content-max-w: 65ch;
  --layout-content-padding: clamp(24px, 5vw, 64px);

  /* Motion */
  --motion-duration-fast: 120ms;
  --motion-duration-base: 180ms;
  --motion-duration-slow: 300ms;
  --motion-easing-out: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  --color-bg-primary: #1C1A17;
  --color-bg-secondary: #23201D;
  --color-bg-elevated: #2A2723;
  --color-fg-primary: #EFEAE2;
  --color-fg-secondary: #B5ADA1;
  --color-fg-muted: #7E766C;
  --color-accent: #E08A4F;
  --color-accent-soft: #3A2A20;
  --color-border-subtle: #34302B;
  --color-border-strong: #4A443D;
  --color-focus-ring: rgba(224, 138, 79, 0.45);
  --color-error: #D86B55;
  --color-warn: #C99650;

  /* Shadows reforzadas en dark — más spread, alpha más alta */
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.40);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.50);
}
```

### Example 2: FOUC blocking script in `index.html`

```html
<!-- Source: notanumber.in/blog/fixing-react-dark-mode-flickering + css-tricks.com/flash-of-inaccurate-color-theme-fart -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon-ampersand.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LLM Council</title>

    <!-- FOUC BLOCKER — must be SYNC, in <head>, BEFORE Vite-injected styles -->
    <script>
      (function () {
        try {
          var stored = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var theme = stored || (systemDark ? 'dark' : 'light');
          document.documentElement.setAttribute('data-theme', theme);
        } catch (e) {
          /* localStorage may throw in private browsing — fall back to light */
          document.documentElement.setAttribute('data-theme', 'light');
        }
      })();
    </script>

    <!-- Preload critical fonts -->
    <link rel="preload" href="/fonts/SourceSerif4-Variable-Roman.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Example 3: `useTheme` hook (`frontend/src/hooks/useTheme.js`)

```js
// Source: dev.to/salimzade/handle-media-query-in-react-with-hooks + MDN matchMedia
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theme';

function readInitialTheme() {
  // Mirror the index.html blocker logic so React state matches the DOM attribute.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {
    /* private browsing */
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState(readInitialTheme);
  const [followSystem, setFollowSystem] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === null; } catch (_) { return false; }
  });

  // Apply theme to <html data-theme="..."> on every change.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // While the user has not made a manual choice, follow the system.
  useEffect(() => {
    if (!followSystem) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setThemeState(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [followSystem]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setFollowSystem(false);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* noop */ }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
```

### Example 4: `Header` component skeleton (`frontend/src/components/Header.jsx`)

```jsx
// Source: .planning/ux/04-mockups/wireframes.md W20 + CONTEXT D-15..D-17
import { useTheme } from '../hooks/useTheme';
import './Header.css';

export default function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="app-header" role="banner">
      <div className="app-header__brand">
        <svg className="app-header__mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          {/* Ampersand serif glyph rendered as <text> using Source Serif 4 */}
          <text x="12" y="18" textAnchor="middle"
                fontFamily="'Source Serif 4 Variable', Georgia, serif"
                fontSize="22" fontWeight="400"
                fill="var(--color-fg-secondary)">&amp;</text>
        </svg>
        <span className="app-header__name">LLM Council</span>
      </div>
      <button
        type="button"
        className="app-header__theme-toggle"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          /* Sun icon SVG inline (24×24) */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* Moon icon SVG inline (24×24) */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}
```

```css
/* Header.css */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: var(--layout-header-h);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-subtle);
}
.app-header__brand { display: flex; align-items: center; gap: var(--space-2); }
.app-header__name {
  font-family: var(--font-serif);
  font-size: 1.125rem;       /* 18px per D-17 (18-20px) */
  font-weight: 600;
  color: var(--color-fg-primary);
  letter-spacing: -0.005em;
}
.app-header__theme-toggle {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--color-fg-secondary);
  cursor: pointer;
  transition: background-color var(--motion-duration-base) var(--motion-easing-out),
              color var(--motion-duration-base) var(--motion-easing-out);
}
.app-header__theme-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-fg-primary);
}
.app-header__theme-toggle:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### Example 5: Accordion via `grid-template-rows: 0fr → 1fr` (reasoning_details)

```css
/* Source: css-tricks.com/css-grid-can-do-auto-height-transitions/ */
/* Phase 4: applied to ReasoningDisclosure.css */
.reasoning-disclosure__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.reasoning-disclosure__panel[data-open="true"] {
  grid-template-rows: 1fr;
}
.reasoning-disclosure__panel-inner {
  overflow: hidden;     /* CRITICAL — without this the content overflows during the 0fr→1fr transition */
  min-height: 0;        /* prevents grid item min-content sizing */
}

/* Chevron rotation */
.reasoning-disclosure__chevron {
  transition: transform var(--motion-duration-base) var(--motion-easing-out);
}
.reasoning-disclosure[data-open="true"] .reasoning-disclosure__chevron {
  transform: rotate(90deg);
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  .reasoning-disclosure__panel {
    transition: none;
  }
}
```

```jsx
// ReasoningDisclosure.jsx (skeleton showing the data-attribute pattern)
const [open, setOpen] = useState(false);
return (
  <div className="reasoning-disclosure" data-open={open}>
    <button type="button" onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="reasoning-disclosure__trigger">
      <span className="reasoning-disclosure__chevron">›</span>
      <span>Show reasoning · {tokenCount} tokens</span>
    </button>
    <div className="reasoning-disclosure__panel" data-open={open} aria-hidden={!open}>
      <div className="reasoning-disclosure__panel-inner">
        {/* reasoning content */}
      </div>
    </div>
  </div>
);
```

### Example 6: Progress strip dots (3-segment, staggered)

```css
/* Source: .planning/ux/03-redesign-proposal.md Direction A §Microinteractions D-13 */
.stage1-progress {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  padding: var(--space-3) var(--layout-content-padding);
  border-bottom: 1px solid var(--color-border-subtle);
  font-family: var(--font-sans);
  font-size: var(--font-size-microcopy);
  color: var(--color-fg-muted);
}

.stage1-progress__segment {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: transparent;
  transition: background-color var(--motion-duration-slow) var(--motion-easing-out);
}
.stage1-progress__segment[data-status="done"] {
  background: var(--color-accent-soft);
  color: var(--color-fg-secondary);
}
.stage1-progress__segment[data-status="active"] {
  color: var(--color-fg-primary);
}

.stage1-progress__dots {
  display: inline-flex;
  gap: 4px;
}
.stage1-progress__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-accent);
  opacity: 0.3;
}
.stage1-progress__segment[data-status="active"] .stage1-progress__dot {
  animation: dot-pulse 660ms ease-in-out infinite;
}
.stage1-progress__segment[data-status="active"] .stage1-progress__dot:nth-child(2) { animation-delay: 220ms; }
.stage1-progress__segment[data-status="active"] .stage1-progress__dot:nth-child(3) { animation-delay: 440ms; }

@keyframes dot-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 1.0; transform: scale(1.2); }
}

/* Reduced motion: dots stay solid, no pulse */
@media (prefers-reduced-motion: reduce) {
  .stage1-progress__segment[data-status="active"] .stage1-progress__dot {
    animation: none;
    opacity: 1;
  }
}
```

### Example 7: Welcome state (W01) with serif h1 + italic example queries

```jsx
// Source: .planning/ux/03-redesign-proposal.md Direction A §Empty / loading / error states
// Embedded in ChatInterface.jsx welcome branch
return (
  <div className="welcome-state">
    <h1 className="welcome-state__title">What do you want to think about today?</h1>
    <p className="welcome-state__lead">
      Ask one question. Three models answer. They peer-review each other's work
      anonymously. A chairman synthesizes.
    </p>
    <ul className="welcome-state__examples">
      <li><em>Should I migrate this Snowflake schema to a star model?</em></li>
      <li><em>Compare strategies for handling currency conversion in pharma BI</em></li>
      <li><em>Review my approach to incremental partition pruning</em></li>
    </ul>
  </div>
);
```

```css
.welcome-state {
  max-width: var(--layout-content-max-w);
  margin: var(--space-7) auto;
  padding: 0 var(--layout-content-padding);
  font-family: var(--font-serif);
}
.welcome-state__title {
  font-size: var(--font-size-h1);
  font-weight: 600;
  line-height: var(--line-height-tight);
  letter-spacing: -0.005em;
  color: var(--color-fg-primary);
  margin-bottom: var(--space-4);
}
.welcome-state__lead {
  font-size: var(--font-size-body);
  line-height: var(--line-height-loose);
  color: var(--color-fg-secondary);
  margin-bottom: var(--space-5);
}
.welcome-state__examples {
  list-style: none;
  padding: 0;
}
.welcome-state__examples li {
  font-family: var(--font-sans);
  font-size: var(--font-size-body-small);
  color: var(--color-fg-muted);
  padding: var(--space-1) 0;
}
```

### Example 8: Global `prefers-reduced-motion` override (in `index.css`)

```css
/* Source: smashingmagazine.com/2021/10/respecting-users-motion-preferences/, MDN @media prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* Preserve focus visibility — outline must remain even with reduced motion */
  *:focus-visible {
    outline: 2px solid var(--color-focus-ring) !important;
    outline-offset: 2px !important;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max-height: 0 → 1000px` for accordion | `grid-template-rows: 0fr → 1fr` | Baseline 2024-09 | No magic numbers; transition ends at real auto height |
| Class-based theme (`.dark` on root) | `data-theme` attribute | 2023+ widely adopted | Cleaner CSS selectors; coexists with utility libs |
| `font-display: auto` (default → block) | `font-display: swap` | Long-established (2018+) | FOUT instead of FOIT — text always visible |
| MediaQueryList `addListener` (deprecated) | `addEventListener('change', ...)` | 2020+ | Deprecated API removed in modern browsers |
| Static woff/ttf fonts | Variable woff2 (single file, all weights) | 2019+ standard | 1 file vs 6+ weight files; smaller total payload |
| Lottie / animation libs for simple fades | Pure CSS transitions + keyframes | Always preferred for ≤300ms simple motion | Zero deps, GPU-accelerated, accesible |
| ChatGPT-style "three-dot only on hover" | Three-dot persistent on active row + hover on others | Phase 2 D-deviation | Resolves H6-02 + F-16 severity 3 — accepted deliberate divergence |

**Deprecated/outdated:**
- `MediaQueryList.addListener` — use `addEventListener('change')`
- `font-display: block` (causes FOIT) — use `swap`
- `--my-token: ...; .x { color: --my-token }` (missing `var()`) — wrong; must wrap in `var()`

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Phase 4 implication |
|-----------|--------|---------------------|
| Tech stack fixed: FastAPI + httpx + uv backend, React 19 + Vite 7 + react-markdown frontend | PROJECT.md | NO migrar a Tailwind, MUI, styled-components, emotion |
| `Co-located .css + .jsx` per component | CONVENTIONS.md, project CLAUDE.md | NO consolidar tokens en un theme.css extra; vivir en `index.css :root` y consumirlos desde cada `*.css` |
| Vanilla CSS, sin pre-procesador | CONVENTIONS.md | NO añadir SASS/Less/PostCSS pipelines |
| `kebab-case` CSS classes; `PascalCase.jsx`; `camelCase` JS | CONVENTIONS.md | Mantener convención: `.app-header`, `Header.jsx`, `useTheme()` |
| `react-markdown` con plugin arrays hoisted as constants | CONVENTIONS.md | Phase 4 no toca `Markdown.jsx` funcionalmente, solo `.markdown-content` global styles |
| Single-user local app, no rate limiting, no auth | CLAUDE.md | El theme persistence en localStorage es seguro (single user, single browser) |
| `start.sh` corre backend en `127.0.0.1:8001`, frontend `5173` | CLAUDE.md | Phase 4 no toca puertos ni CORS |
| GSD workflow enforcement: edits via GSD commands | CLAUDE.md | Las plans se ejecutan via `/gsd-execute-phase` |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Vite build, ESLint | ✓ (existing) | npm 7+ (lockfile v3) | — |
| Vite dev server | Hot reload during plans | ✓ | 7.2.4 | — |
| `uv` Python package manager | Backend (no role in Phase 4) | ✓ | existing | — |
| Internet connection (one-time) | Download woff2 from GitHub releases | ✓ assumed | — | Manual upload of woff2 if blocked |
| `pyftsubset` (fonttools) | Optional subsetting of woff2 to Latin Extended | ✗ likely not installed | — | Use unsubset woff2 (acceptable size penalty: 100-200KB extra) |
| Image tooling for favicon (32×32 PNG) | Generate `favicon.png` from ampersand SVG | ✗ likely not installed | — | Hand-craft via online tool, or skip favicon (optional D-16) |

**Missing dependencies with no fallback:** None — all required tooling is present.

**Missing dependencies with fallback:**
- Font subsetting tool: not required if accepting full Latin/Cyrillic/Vietnamese sets in woff2 (~310KB Inter, ~200KB Source Serif). For local single-user app, the ~600KB total is acceptable per D-18 spirit.
- Favicon generator: D-16 marks it "build step opcional o checked-in static" — falback is to ship without favicon (browser uses default tab icon) and add later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (visual checking manual via `npm run dev` + browser) |
| Config file | none — see Wave 0 |
| Quick run command | `npm --prefix frontend run build` (catches syntax errors, missing imports) |
| Full suite command | Manual visual inspection across light/dark modes, all wireframes W01-W23 |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | Bootstrap-flavored hex codes absent from rendered surfaces | grep | `grep -iE "#(4a90e2|357abd|f0fff0|f5f5f5\|f0f0f0)" frontend/src/` returns empty (after Wave 4) | ✅ |
| VIS-01 | Tokens consumed via `var(--color-*)` in all `.css` | grep | `grep -E "var\(--color" frontend/src/components/*.css \| wc -l` shows expected count | ✅ |
| VIS-02 | `system-ui` not used as primary font outside fallback chains | grep | `grep -E "font-family:.*system-ui\b" frontend/src/` only matches in fallback chains | ✅ |
| VIS-02 | `@font-face` for 3 families declared | grep | `grep -c "^@font-face" frontend/src/index.css` ≥ 3 | ✅ |
| VIS-03 | `<Header>` mounted in App.jsx | grep | `grep -E "^import Header\|<Header" frontend/src/App.jsx` non-empty | After Wave 2 |
| VIS-03 | `<html data-theme=...>` set on first paint | manual | DevTools: refresh page, inspect `<html>` from t=0; should have `data-theme` attribute | manual |
| VIS-04 | Microinteractions visible | manual | Trigger Stage 1→2→3, hover sidebar items, expand reasoning_details, toggle theme | manual |
| VIS-04 | Reduced motion honored | manual | OS-level enable Reduce motion; verify dots stop pulsing, transitions become instant | manual |

### Sampling Rate
- **Per task commit:** `npm --prefix frontend run build` (3-5s); `npm --prefix frontend run lint` if available.
- **Per wave merge:** Run `npm run dev`, refresh browser in light + dark, validate no visual regressions; run grep checks per Wave's scope.
- **Phase gate:** Walk through W01-W23 wireframes manually in both modes; confirm all 4 VIS-* requirements visible.

### Wave 0 Gaps
*(No formal test infrastructure to add — project explicitly accepts visual-check-only manual validation per CONTEXT D-existing patterns. Ver Project Constraints: "Sin tests automáticos de UI".)*

- [ ] None — existing visual-check workflow covers Phase 4 verification
- Optional future: Playwright + screenshot baseline in v2 backlog (CONTEXT Deferred)

## Security Domain

> Phase 4 is purely visual/CSS/font hosting. No new auth, input handling, network surface, or persistence. Security ASVS categories largely N/A.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app, no auth |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user |
| V5 Input Validation | minimal | `localStorage.getItem('theme')` value is whitelisted to `'light'\|'dark'` (Example 3 hook validates) |
| V6 Cryptography | no | No secrets handled in Phase 4 |
| V12 Files and Resources | yes | woff2 files are static, served by Vite from `public/`; no user upload |
| V14 Configuration | yes | `Content-Security-Policy` should not block inline `<script>` (FOUC blocker is inline by necessity) |

### Known Threat Patterns for Vanilla CSS + React SPA

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered theme via crafted localStorage | Tampering | Whitelist values in `useTheme` (`'light'\|'dark'`); fall back to default if invalid |
| Inline FOUC script blocked by CSP | Denial of Service | Project has no CSP (single-user local); document the inline-script need so any future deployment knows to allow `script-src 'self' 'unsafe-inline'` for this specific block, OR use `<script nonce>` if CSP introduced |
| Self-hosted woff2 spoofing | Tampering | Files committed to repo + checked into git history; tampering requires repo write access |
| XSS via SVG inline (ampersand) | Tampering / Spoofing | SVG content is hardcoded literal; no user input embedded in SVG |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useState`+`useEffect` para `useTheme` es preferible sobre `useSyncExternalStore` por consistencia con el resto del codebase | §Standard Stack Alternatives | Low — the alternative also works; just less ergonomic |
| A2 | Subsetting woff2 a Latin Extended con `pyftsubset` es opcional; el unsubset woff2 (~600KB total) es aceptable para single-user local | §Standard Stack Supporting | Low — ~600KB extra = imperceptible en localhost |
| A3 | El proyecto no tiene Content-Security-Policy activa que bloquee el inline FOUC script | §Security Domain | Medium — si en el futuro se añade CSP estricta, hay que migrar a nonce o externalizar el script |
| A4 | Spacing scale 4/8/12/16/24/32/48px es consistente con la densidad media de Direction A | §Code Examples 1 | Low — cualquier scale múltiplo de 4 funciona; researcher discretion authorized |
| A5 | `font-feature-settings: "tnum"` activa tabular nums correctamente en Inter Variable y Source Serif 4 Variable | §Common Pitfalls 6 | Low — both fonts ship `tnum` per their OFL specs [VERIFIED on rsms/inter docs and Adobe source-serif spec] |
| A6 | `data-theme` attribute set on `<html>` (not `<body>`) es la convención más portable | §Pattern 1 | Low — both work; `<html>` is conventional |
| A7 | Phase 3 components placeholders (`QualityToggle.css`, `ReasoningDisclosure.css`, `Stage4.css`, `MessageHeader.css`) tienen JSX shapes finales — Phase 4 SOLO swaps colors/typography/spacing | §Common Pitfalls 5 | Low — confirmed by STATE.md "Phase 4 entry contract" |
| A8 | El icon-button del theme toggle puede ser swap entre sun/moon (no rota); es el patrón Linear/GitHub estándar | §Code Examples 4 | Low — researcher decision per CONTEXT Claude's Discretion; rotation is also acceptable |

**If user wants different decisions:** A1 (use `useSyncExternalStore` if the planner thinks long-term consistency matters more than codebase pattern matching); A4 (any 4px-base scale works — 4/8/16/24/32/48 simpler if researcher prefers).

## Open Questions

1. **Will the user provide pre-subset woff2 files, or download unsubset and accept the size?**
   - What we know: D-18 caps committed font weight at ~300KB; unsubset would be ~600KB.
   - What's unclear: Whether the planner has access to `pyftsubset` (`pip install fonttools`) or wants to skip subsetting.
   - Recommendation: Ship unsubset for Plan A; if size matters, subset in a Phase 4-bis polish task. Phase 4 functional success does NOT depend on subsetting.

2. **Should the favicon (D-16) ship in Phase 4 or defer to a polish task?**
   - What we know: D-16 marks it "build step opcional o checked-in static".
   - What's unclear: Tolerance for shipping without favicon.
   - Recommendation: Defer favicon to a final polish task within Wave 4 (Conversations), so Wave 2 (shell) does not block on PNG generation.

3. **Mobile drawer (W23) — how minimal is "básico"?**
   - What we know: D-14 requires "drawer básico"; out-of-scope is "responsive completo".
   - What's unclear: Whether tap-outside-to-close, swipe gestures, focus trap on drawer are in scope.
   - Recommendation: Implement only `transform: translateX(-100%) ↔ 0` toggle via a button in Header on `≤768px`; no swipe, no focus trap. Document as "minimum viable drawer".

4. **Will the user accept the legacy Bootstrap-green Stage 3 background (`#f0fff0`) being visible during Wave 1-3 (before Wave 4 hits Stage3.css)?**
   - What we know: D-08 explicitly accepts intermediate states with hex hardcoded coexisting.
   - What's unclear: User patience for visual inconsistency during the migration.
   - Recommendation: Wave 3 (deliberation) handles `Stage3.css` — should be among the first migrated within Wave 3 because of visual prominence.

## Sources

### Primary (HIGH confidence)
- **adobe-fonts/source-serif** — `https://github.com/adobe-fonts/source-serif/releases` (latest 4.005R verified)
- **rsms/inter** — `https://github.com/rsms/inter/releases` (v4.1 verified)
- **JetBrains/JetBrainsMono** — `https://github.com/JetBrains/JetBrainsMono/releases` (v2.304 verified)
- **MDN @font-face docs** — `https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face` (font-display behaviors)
- **MDN prefers-reduced-motion** — `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`
- **MDN matchMedia** — `https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia`
- **caniuse: grid-template-rows animation** — `https://caniuse.com/mdn-css_properties_grid-template-rows_animation` (Baseline 2024-09)
- `.planning/ux/03-redesign-proposal.md` — Direction A canonical specs (palette, typography, microinteractions, IA)
- `.planning/ux/04-mockups/wireframes.md` — W01-W23 structural contract
- `.planning/codebase/CONVENTIONS.md` — naming + co-located CSS rules

### Secondary (MEDIUM confidence)
- **CSS-Tricks: CSS Grid Can Do Auto Height Transitions** — `https://css-tricks.com/css-grid-can-do-auto-height-transitions/`
- **CSS-Tricks: Flash of inAccurate coloR Theme** — `https://css-tricks.com/flash-of-inaccurate-color-theme-fart/`
- **Smashing Magazine: Respecting Users' Motion Preferences** — `https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/`
- **notanumber.in: Fixing Dark Mode Flickering** — `https://notanumber.in/blog/fixing-react-dark-mode-flickering`
- **VA.gov Design System: Tokens** — `https://design.va.gov/foundation/design-tokens` (semantic-first naming convention)
- **Contentful: Design token system** — `https://www.contentful.com/blog/design-token-system/`
- **dev.to/salimzade: Handle Media Query in React with hooks** — pattern para `useTheme` listener cleanup
- **web.dev: Optimize webfont loading** — preload + font-display recommendations

### Tertiary (LOW confidence — for context only)
- **Tailwind discussion #11186** — `https://github.com/tailwindlabs/tailwindcss/discussions/11186` (community validation of grid-rows technique)
- **Pope Tech: Accessible animations** — `https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/` (recent secondary source)

## Metadata

**Confidence breakdown:**
- Standard stack (fonts, versions, URLs): HIGH — verified against official GitHub releases.
- Architecture patterns (token system, FOUC, accordion, theme hook): HIGH — patterns are well-established and supported by 3+ authoritative sources.
- Microinteractions (`grid-template-rows`, keyframes, prefers-reduced-motion): HIGH — Baseline 2024-09 means universal support in 2026 browsers.
- Pitfalls: MEDIUM — synthesized from web sources + project codebase inspection; the pattern around `data-theme` selector specificity (Pitfall 3) is reasoned, not externally cited.
- Spacing/radius/shadow scales: MEDIUM (researcher discretion, no external lock).

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — stable web platform fundamentals; libraries unchanged)
