---
phase: 04-visual-identity-implementation
plan: 01
subsystem: frontend
tags: [tokens, fonts, fouc, theming, design-system]
requires:
  - .planning/phases/04-visual-identity-implementation/04-UI-SPEC.md
  - .planning/phases/04-visual-identity-implementation/04-RESEARCH.md
provides:
  - "frontend/src/index.css :root token system (color light + dark, typography, spacing, radius, shadow, motion, layout)"
  - "frontend/src/index.css @font-face × 4 (Source Serif 4 Roman + Italic, Inter Variable, JetBrains Mono Variable)"
  - "frontend/src/index.css [data-theme=\"dark\"] override block"
  - "frontend/src/index.css @media prefers-reduced-motion override with focus-visible preservation"
  - "frontend/index.html FOUC blocker (sync) + font preloads + LLM Council title"
  - "frontend/public/fonts/*.woff2 (4 self-hosted variable font binaries, ~1.2MB total)"
affects:
  - frontend/src/index.css
  - frontend/index.html
  - frontend/public/fonts/
tech_stack:
  added:
    - "Source Serif 4 Variable (Adobe Fonts, SIL OFL 1.1)"
    - "Inter Variable v4.1 (rsms, SIL OFL 1.1)"
    - "JetBrains Mono Variable v2.304 (JetBrains, SIL OFL 1.1)"
  patterns:
    - "Self-hosted woff2 with font-display: swap (no FOIT)"
    - "FOUC blocking via inline sync script + data-theme attribute"
    - "Light/dark theming via [data-theme=\"dark\"] re-declaration of CSS custom properties"
    - "prefers-reduced-motion override that preserves :focus-visible outline"
key_files:
  created:
    - frontend/public/fonts/SourceSerif4-Variable-Roman.woff2
    - frontend/public/fonts/SourceSerif4-Variable-Italic.woff2
    - frontend/public/fonts/Inter-Variable.woff2
    - frontend/public/fonts/JetBrainsMono-Variable.woff2
  modified:
    - frontend/src/index.css
    - frontend/index.html
decisions:
  - "Wave 1 deliberately aislada: hex Bootstrap-flavored en componentes legacy coexisten con tokens nuevos hasta Waves 2-4 (D-08)"
  - "JetBrains Mono variable woff2 generado convirtiendo el .ttf canonical del release v2.304 con fontTools+Brotli (el zip oficial no incluye variable woff2 — solo statics + variable .ttf)"
  - "Sin aliases legacy --color-bootstrap-* (CONTEXT D-06): tras revisar el código no son necesarios; los componentes Phase 3 con hex placeholders se migran en sus respectivas waves"
  - "<link rel='preload'> solo para Source Serif 4 Roman + Inter Variable (UI-SPEC line 99: mono is low-priority, only inside code blocks; Italic se carga lazy)"
  - "FOUC script intencional NO es type=module — modules son async-by-default y romperían el blocking pre-paint"
  - "favicon slot reservado a /favicon-ampersand.svg aunque el asset aún no existe (lo crea Plan 04-04 Task 3); 404 silencioso aceptable hasta entonces"
metrics:
  duration: ~14 min
  completed_date: 2026-05-10
  tasks: 3
  commits: 3
  files_changed: 6
---

# Phase 04 Plan 01: Foundations Summary

Direction A foundations cimentadas: token system completo (color light + dark, typography, spacing, radius, shadow, motion, layout), 4 variable woff2 self-hosted con `font-display: swap`, FOUC blocker sync en index.html, y override `prefers-reduced-motion` que preserva focus rings — sin tocar componentes existentes.

## What Got Built

### Task 1: Self-hosted font binaries (commit `64e1328`)

4 variable woff2 descargados de canonical SIL OFL sources y commiteados a `frontend/public/fonts/`:

| File | Source URL | Bytes |
|---|---|---|
| `SourceSerif4-Variable-Roman.woff2` | `https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Roman.otf.woff2` | 426,716 |
| `SourceSerif4-Variable-Italic.woff2` | `https://github.com/adobe-fonts/source-serif/raw/release/WOFF2/VAR/SourceSerif4Variable-Italic.otf.woff2` | 328,372 |
| `Inter-Variable.woff2` | `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` → `Inter-4.1/web/InterVariable.woff2` | 352,240 |
| `JetBrainsMono-Variable.woff2` | `https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip` → `fonts/variable/JetBrainsMono[wght].ttf` (convertido a woff2 con fontTools+Brotli) | 113,348 |

**Total committed:** ~1.2 MB. Aceptable per D-18 (single-user local app, no bandwidth cost).

**Provenance verification:** los 4 hashes están registrados en el commit y los 4 archivos están bajo control de git (`git ls-files frontend/public/fonts/*.woff2` retorna 4 paths).

### Task 2: Token system + @font-face + reduced-motion (commit `113da15`)

`frontend/src/index.css` reescrito con la siguiente estructura:

1. **`@font-face` × 4** con `font-display: swap`. Variable axes: `200 900` para serif, `100 900` para Inter, `100 800` para JetBrains Mono. Roman/Inter/Mono `font-style: normal`; Italic dedicado para serif italic.
2. **`:root`** con todos los tokens del UI-SPEC (taxonomía completa abajo).
3. **`[data-theme="dark"]`** re-declara solo theme-dependent tokens (13 colors + 2 shadows reforzados).
4. **Resets globales** `* { margin: 0; padding: 0; box-sizing: border-box; }` y `body` consumiendo `var(--color-bg-primary)`, `var(--color-fg-primary)`, `var(--font-serif)`, `var(--font-size-body)`, `var(--line-height-loose)`.
5. **`@media (prefers-reduced-motion: reduce)`** override global con preservación explícita de `*:focus-visible { outline: 2px solid var(--color-focus-ring) }` (RESEARCH §Pitfall 4).
6. **`.markdown-content` block existente** preservado verbatim — Wave 3 lo migra. Hex placeholders (`#4a90e2`, `#357abd`, `#f5f5f5`, `#ddd`, `#666`, `#e0e0e0`, `#fafafa`) son intencionales hasta Plan 04-03.

### Token taxonomy creada

| Category | Count | Examples |
|---|---|---|
| Color (light) | 13 | `--color-bg-primary: #FAF8F4`, `--color-accent: #B05A2A`, `--color-focus-ring: rgba(176, 90, 42, 0.35)` |
| Color (dark override) | 13 | `--color-bg-primary: #1C1A17`, `--color-accent: #E08A4F` |
| Font families | 3 | `--font-serif`, `--font-sans`, `--font-mono` |
| Typography sizes | 9 | `--font-size-display: 2rem` … `--font-size-microcopy: 0.75rem` |
| Line heights | 3 | `--line-height-tight: 1.25`, `--line-height-normal: 1.4`, `--line-height-loose: 1.65` |
| Spacing | 7 | `--space-1: 4px` … `--space-7: 48px` |
| Layout | 4 | `--layout-header-h: 52px`, `--layout-sidebar-w: 280px`, `--layout-content-max-w: 65ch`, `--layout-content-padding: clamp(24px, 5vw, 64px)` |
| Radius | 2 | `--radius-sm: 6px`, `--radius-md: 8px` |
| Shadow (light + dark) | 2 + 2 reinforced | `--shadow-sm`, `--shadow-md` |
| Motion | 4 | `--motion-duration-fast: 120ms`, `--motion-duration-base: 180ms`, `--motion-duration-slow: 300ms`, `--motion-easing-out: cubic-bezier(0.4, 0, 0.2, 1)` |

**Total tokens:** 60 unique custom properties (13 light + 13 dark override + 3 fonts + 9 sizes + 3 line-heights + 7 spacing + 4 layout + 2 radii + 4 shadow + 4 motion).

### Task 3: FOUC blocker + preloads + branded title (commit `170592b`)

`frontend/index.html` reescrito:

- `<title>frontend</title>` → `<title>LLM Council</title>` (D-17 wordmark alignment).
- `<link rel="icon">` apunta a `/favicon-ampersand.svg` con `type="image/svg+xml"` (slot reservado, asset llega en Plan 04-04).
- **FOUC blocker inline script** (sync, no `defer`/`async`/`type="module"`): lee `localStorage.theme`, fallback a `prefers-color-scheme: dark`, escritura `data-theme` en `documentElement` antes del primer paint. `try/catch` para private-browsing donde `localStorage.getItem` puede lanzar.
- **`<link rel="preload">`** para Source Serif 4 Roman + Inter Variable. Mono e Italic se cargan lazy (low priority — solo dentro de code blocks / welcome examples).

## Acceptance Criteria

| Criterion | Status | Evidence |
|---|---|---|
| 4 woff2 staged in git AND on disk >50KB | PASS | `git ls-files frontend/public/fonts/*.woff2` → 4 paths; sizes 426KB / 328KB / 352KB / 113KB |
| index.css has all token tiers | PASS | Grep gates Task 2 verification → OK (18 markers found) |
| index.html FOUC inline script before main.jsx | PASS | Grep gates Task 3 verification → OK (8 markers found, no PNG, no type=module) |
| favicon link is .svg | PASS | `<link rel="icon" type="image/svg+xml" href="/favicon-ampersand.svg">` |
| `npm --prefix frontend run build` succeeds | PASS | Ambas builds (post-Task-2 y post-Task-3) → `✓ built in 15.44s` / `9.49s`, no warnings nuevos respecto al baseline (el chunk-size warning preexistía en Phase 3) |

## Verification Results

**Wave 1 grep gates (UI-SPEC §Acceptance gates Wave A):**

```
:root { --color-bg-primary               → present (1 occurrence)
@font-face                                → present (4 occurrences)
Source Serif 4 Variable                   → present (Roman + Italic blocks)
Inter Variable                            → present (1 block + family chain)
JetBrains Mono Variable                   → present (1 block + family chain)
font-display: swap                        → present (4 occurrences)
[data-theme="dark"]                       → present (1 block)
prefers-reduced-motion: reduce            → present (1 block)
localStorage.getItem('theme')             → present in index.html
setAttribute('data-theme'                 → present 2× (try-branch + catch-fallback)
ls frontend/public/fonts/*.woff2          → 4 files
```

**Build smoke test:** `npm --prefix frontend run build` completa sin errores. CSS bundle: 19.46 kB (gzip: 4.90 kB), creció ~5KB respecto al baseline por el bloque de tokens — esperado.

**Manual smoke test (deferred to user verification):**

El plan especifica un smoke test manual con `npm run dev` que requiere ojo humano (DevTools Elements, Network tab, hard-refresh sin flash, dark-theme persist via localStorage, reduced-motion). Este SUMMARY no incluye esa validación; la Wave 2 / 3 / 4 la consumirán implícitamente al migrar componentes. Si el usuario quiere validar en este punto, los comandos son:

```bash
cd frontend && npm run dev
# Abrir http://localhost:5173/, DevTools Elements: <html data-theme="...">
# Network tab: 4 woff2 cargan 200 OK; Roman + Inter aparecen como Highest priority
# localStorage.setItem('theme', 'dark'); location.reload() → no flash de light
```

## Deviations from Plan

**1. [Rule 3 - Blocking] JetBrains Mono variable woff2 no estaba en el zip release**

- **Found during:** Task 1
- **Issue:** El plan instruía descargar `fonts/webfonts/JetBrainsMono[wght].woff2` del zip release v2.304, pero ese path no existe en el archive — el zip solo contiene woff2 _statics_ (Bold, ExtraBold, etc.) y la variable está disponible solo como `fonts/variable/JetBrainsMono[wght].ttf`.
- **Fix:** Convertí el TTF variable canonical a woff2 con `fontTools` + `Brotli` (ambos preinstalados via stack del usuario). Sigue siendo el binary canonical de JetBrains; el flavor-flip TTF→woff2 es lossless para data y reduce tamaño de 303KB a 113KB.
- **Files modified:** `frontend/public/fonts/JetBrainsMono-Variable.woff2`
- **Commit:** `64e1328`
- **Provenance preservada:** SUMMARY.md documenta el TTF source path + tooling de conversión.

**2. [Rule 1 - Bug] Path de Windows con corchetes literales**

- **Found during:** Task 1 (durante conversión JBM)
- **Issue:** El path canonical `JetBrainsMono[wght].ttf` contiene corchetes que tanto el shell de Bash como el `glob.glob()` de Python interpretaban como pattern matching (no como literales).
- **Fix:** Pasar el path absoluto Windows como raw string `r'C:\Users\...\JetBrainsMono[wght].ttf'` directamente a `TTFont()`, sin glob expansion.
- **Files modified:** ninguno (workaround de tooling)
- **Commit:** N/A (proceso de descarga, no código)

No hubo desviaciones de Rule 4 (architectural). El plan se ejecutó tal cual respecto a token taxonomy, FOUC pattern, y file structure.

## Auth Gates

Ninguno. El plan no requiere credenciales — todos los font sources son públicos (GitHub raw + GitHub releases assets).

## Threat Surface

Ninguna nueva surface introducida más allá de lo declarado en `<threat_model>` del plan:

- T-04-01 (localStorage tampering): aceptado (solo flip visual).
- T-04-02 (font preload disclosure): aceptado (assets públicos).
- T-04-03 (woff2 supply chain): mitigado — descarga desde canonical sources, binarios commiteados, provenance documentada arriba.
- T-04-04 (FOUC script DoS): aceptado (<2ms budget en máquinas modernas).

No threat flags adicionales detectados.

## Known Stubs

`frontend/index.html` referencia `/favicon-ampersand.svg` que aún no existe — el browser hará 404 silencioso hasta que Plan 04-04 Task 3 commitee el SVG. Stub intencional documentado en el commit message y en los design decisions; no bloquea el smoke render. **Reason:** Phase 4 está estructurada en waves (Foundations → Header → Components → Polish); el favicon es Wave 4 polish.

## Phase 4 Entry Contract for Wave 2

A partir de aquí los componentes pueden consumir tokens vía `var(--*)`:

- **Color:** `var(--color-bg-primary)`, `var(--color-accent)`, `var(--color-focus-ring)` etc.
- **Typography:** `var(--font-serif)`, `var(--font-sans)`, `var(--font-mono)`, `var(--font-size-body)`, `var(--line-height-loose)`.
- **Spacing:** `var(--space-1)` … `var(--space-7)`.
- **Layout:** `var(--layout-header-h)`, `var(--layout-sidebar-w)`, `var(--layout-content-max-w)`, `var(--layout-content-padding)`.
- **Motion:** `var(--motion-duration-base)`, `var(--motion-easing-out)`.

**Recordatorio para Waves 2-4:** los hex placeholders en `QualityToggle.css`, `ReasoningDisclosure.css`, `Stage4.css`, `MessageHeader.css`, y `.markdown-content` son intencionales transition tokens — sus migraciones a `var(--*)` ocurren en sus respectivas waves, NO en este plan. La app sigue renderizando sin romperse porque body ya consume tokens y los componentes legacy con hex coexisten visualmente.

## Self-Check: PASSED

- [x] `frontend/public/fonts/SourceSerif4-Variable-Roman.woff2` exists (426716 bytes, git-tracked)
- [x] `frontend/public/fonts/SourceSerif4-Variable-Italic.woff2` exists (328372 bytes, git-tracked)
- [x] `frontend/public/fonts/Inter-Variable.woff2` exists (352240 bytes, git-tracked)
- [x] `frontend/public/fonts/JetBrainsMono-Variable.woff2` exists (113348 bytes, git-tracked)
- [x] `frontend/src/index.css` modified with token system + @font-face + reduced-motion
- [x] `frontend/index.html` modified with FOUC blocker + preloads + LLM Council title
- [x] Commit `64e1328` exists (Task 1)
- [x] Commit `113da15` exists (Task 2)
- [x] Commit `170592b` exists (Task 3)
- [x] `npm --prefix frontend run build` completes without errors
