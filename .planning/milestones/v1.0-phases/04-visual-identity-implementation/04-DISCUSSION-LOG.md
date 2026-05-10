# Phase 4: Visual Identity Implementation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 04-visual-identity-implementation
**Areas discussed:** Light/dark v1 scope, Migration strategy, Microinteractions implementation, Wireframe coverage v1

---

## Light/dark v1 scope

### Q1 — ¿Qué modo(s) ship Phase 4 v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo light (dark a v2 con el toggle) | Phase 4 implementa solo light. Dark queda definida pero no aplicada hasta v2. Menos superficie a testear. | |
| Ambos via `prefers-color-scheme` (sin UI toggle) | El SO decide. `@media (prefers-color-scheme: dark)` activa los tokens dark. Sin botoncito en v1. | |
| Solo dark (light a v2) | Phase 4 implementa solo dark. Inusual a menos que el uso sea principalmente nocturno. | |
| Ambos + UI toggle ya en v1 (cancela el deferred) | Sube el toggle runtime a Phase 4. Más superficie: persistencia + detección inicial + FOUC. | ✓ |

**User's choice:** Ambos + UI toggle ya en v1.
**Notes:** Cancela deferred UX-V2-02. Significa que Phase 4 incluye persistencia (localStorage) + detección inicial (`prefers-color-scheme`) + FOUC mitigation script.

### Q2 — ¿Cómo se decide el tema inicial cuando el usuario abre la app por primera vez?

| Option | Description | Selected |
|--------|-------------|----------|
| `prefers-color-scheme` del sistema, persistencia tras toggle manual | Lee matchMedia en primera carga; persiste en localStorage tras toggle manual. Patrón Linear/GitHub. | ✓ |
| Siempre light por default, solo localStorage | Ignora el sistema. Más predecible pero ignora preferencia del SO. | |
| Siempre sigue al sistema (sin persistencia) | Toggle solo durante sesión actual. Sorprende al usuario al recargar. | |

**User's choice:** `prefers-color-scheme` + localStorage on manual override.

### Q3 — ¿Donde vive el toggle UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Header global, esquina superior derecha (per spec original Phase 2) | Slot ya definido en Phase 2 IA. Icon button. Visible siempre. Coherente con Linear/GitHub. | ✓ |
| Sidebar, abajo del todo (junto a New conversation) | Lejos del centro de atención. Cambia ligeramente la IA del sidebar. | |
| Settings/Preferences page futura | No exist setting page hoy. Construirla es scope creep. | |

**User's choice:** Header top-right per spec original Phase 2.

---

## Migration strategy

### Q1 — ¿Cómo se reescribe el CSS — big-bang o incremental?

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens + tipografía primero (1 plan), luego componentes en waves paralelas | Plan A foundations. Plans B-F: componentes en paralelo. Estado intermedio válido. | ✓ |
| Big-bang (un plan/wave reescribe todos los .css de una) | Un solo executor toca los 13 archivos. Diff coherente, blast radius enorme. | |
| Componente por componente sin tokens previos | Plan A: Sidebar full restyle con tokens locales. Riesgo: divergencia de hex codes. | |

**User's choice:** Plan A foundations + waves paralelas.

### Q2 — Tras Plan A (tokens + tipografía), ¿cómo se agrupan los componentes en waves paralelas?

| Option | Description | Selected |
|--------|-------------|----------|
| Por superficie (shell, deliberation, conversations) | Wave 2: shell + header + theme toggle. Wave 3: deliberation. Wave 4: conversation mgmt. Coherente narrativamente. | ✓ |
| Por riesgo (low-risk first) | Wave 2: simples (Modal, Menu). Wave 3: Stage 1-4. Wave 4: Sidebar + ChatInterface. | |
| Sin agrupar (un wave grande paralelo de N executors) | Cada componente paralelo. Riesgo conflicts en App.css. | |

**User's choice:** Por superficie.

---

## Microinteractions implementation

### Q1 — ¿Qué stack para las microinteractions de Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure CSS (transitions + keyframes + `prefers-reduced-motion`) | Cero JS deps. Honra reduced-motion. Todas las specs Phase 2 son factibles sin lib. | ✓ |
| Pure CSS + 1 helper React para `max-height: auto` accordion | Igual + helper JS para mediar scrollHeight. Sin lib externa. | |
| Framer Motion para transitions complejas + CSS para hover/focus | Bundle ~30KB. Útil para layout animations. Overkill para los specs actuales. | |

**User's choice:** Pure CSS only.

### Q2 — El accordion del `reasoning_details` (Stage 1) anima `max-height` — contenido es dynamic. ¿Qué táctica?

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded `max-height: 800px` con `overflow: hidden` | Muy simple. Si excede 800px, scroll interno. Animación no frame-perfect. | |
| `grid-template-rows: 0fr` → `1fr` (CSS-only modern technique) | Anima de altura 0 a `auto` puramente en CSS via grid. Frame-perfect. | ✓ |
| Helper JS de 5 líneas que mide scrollHeight | Más control manual. Útil para callbacks on-end pero añade complejidad. | |

**User's choice:** `grid-template-rows: 0fr → 1fr`.

---

## Wireframe coverage v1

### Q1 — ¿Qué wireframes implementa Phase 4 v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Todos los W01-W23 (cobertura completa) | Phase 4 implementa los 23 wireframes. Larger milestone (5-7 sesiones). Cierra deuda Phase 2 sin remanente. | ✓ |
| Subset MUST-have (cubre los 11 priority Nielsen findings) | ~13-15 wireframes. Resto a backlog. Milestone más corto (3-4 sesiones). | |
| Subset MUST-have + mobile drawer | Como anterior + mobile drawer. | |

**User's choice:** Cobertura completa.

### Q2 — El header global tiene "name + icon" per VIS-03. ¿Qué icon?

| Option | Description | Selected |
|--------|-------------|----------|
| Sin icon — solo nombre tipográfico ("LLM Council" en serif) | VIS-03 "icon" = favicon del browser tab. No inventa scope. | |
| SVG inline minimalista (ej. ampersand `&` en serif) | Reusa el mark del sidebar empty state. Coherencia notebook. | ✓ |
| Generative icon de un servicio (Iconify, Lucide, Heroicons) | Off-the-shelf, no dialoga con la identidad notebook. Más tooling-vibe. | |
| Emoji en header (🏛️, 🤝️, etc.) | Render inconsistente cross-platform. Rompe el tono editorial. | |

**User's choice:** SVG inline ampersand serif. Reutiliza el mark del sidebar empty state como brand mark del header.

---

## Bonus — Font hosting

### Q1 — ¿Cómo se hostean las fuentes (Source Serif 4, Inter, JetBrains Mono — todas variable)?

| Option | Description | Selected |
|--------|-------------|----------|
| Self-host woff2 en `frontend/public/fonts/` con `@font-face` | Descarga `.woff2` variable subset Latin Extended una vez (~250-400KB). Funciona offline, sin CORS, sin terceros. | ✓ |
| Bunny Fonts CDN (`fonts.bunny.net`) | Privacy-friendly Google Fonts alt. Necesita conexión. | |
| Google Fonts CDN | Default ergonómico pero envía IP a Google. | |

**User's choice:** Self-host woff2.

---

## Claude's Discretion

- Spacing scale (4/8/12/16/24/32/48px o similar) — researcher propone basado en wireframes.
- Border-radius scale (consolidar `--radius-sm`, `--radius-md` desde los 6/8px de Phase 2).
- Shadow scale (consolidar `--shadow-sm`, `--shadow-md`).
- Plan structure dentro de cada wave (planner decide tasks atómicas óptimas).
- Theme toggle UX detalle (icon-button rotando vs swap sun/moon vs dual-icon).

## Deferred Ideas

- Visual regression testing (Playwright + screenshots) — backlog.
- Mobile-first responsive ≤768px completo (más allá del drawer básico W23) — backlog.
- Settings/Preferences page — solo theme toggle en header por ahora.
- Custom illustrations o iconography más allá del ampersand — backlog.
- Animación coordinada de entrada al cambiar de conversation — backlog.
