# Wireframes — LLM Council UI

**Phase:** 02-ux-research-design-brief · **Plan:** 04 · **Skill applied:** `frontend-design`
**Date:** 2026-05-10 · **Scope:** UXR-04 (mockups, capa estructural)

---

## Purpose

Este documento es el **contrato estructural común** que Phase 4 implementará. Define, para cada pantalla y estado del UI, qué elementos existen, en qué relación geométrica, qué interacciones soportan, y qué fricción del walkthrough (`01-cognitive-walkthrough.md`) o heurística Nielsen (`02-nielsen-audit.md`) resuelven.

Lo que este documento **lock-ea**: layout, jerarquía, estados de cada componente, microinteracciones, atajos de teclado, copy literal de Phase 1 ya validado.

Lo que este documento **defiere a los HTML sketches del Plan 05**: paleta, tipografía concreta, peso visual, microcopia no-Phase-1, y la estética por dirección tonal (Notebook / Cockpit / Minimal).

## Direction-neutrality contract

Los wireframes son **neutros respecto a las 3 direcciones tonales** del `03-redesign-proposal.md` (Research notebook · Tactical cockpit · Claude-like minimal). Un único set sirve como contrato estructural común a las 3 direcciones por dos razones:

1. **Evitar triplicar trabajo** — la IA, los estados de cada componente y las microinteracciones son comunes a las 3 direcciones por D-09.
2. **Facilitar comparación lado a lado** — cuando Plan 06 elija dirección, no se compararán wireframes distintos sino la misma estructura con tres pieles.

**Out of scope aquí (en scope en Plan 05 sketches):** hex codes, familia tipográfica, line-height, modos light/dark concretos, animaciones temporizadas, microcopy alternativa a la de Phase 1.

**In scope aquí:** todo lo demás — incluyendo annotation literal del coste estimado en formato `~$0.XX` para que cada dirección lo materialice consistente con su tono (CD-02).

## Conventions

Los wireframes usan ASCII box-drawing para que el documento sea legible en cualquier editor de texto, sin imágenes binarias.

- **Anchos:** ~80–100 cols por wireframe.
- **Cajas:** `┌ ─ ┐ │ └ ─ ┘ ├ ┤ ┬ ┴ ┼` — bordes de panel y separadores.
- **`█` o `▮`:** elemento sólido / cursor / estado activo.
- **`[Label]`:** botón clicable con label literal.
- **`[⋮]`:** three-dot menu trigger.
- **`< >`:** texto editable inline (input).
- **`▶` / `▼`:** disclosure colapsado / expandido.
- **`⇩`:** download icon.
- **`(N)`:** anotación numerada referenciada en la tabla debajo del wireframe.
- **Friction/Nielsen anchors:** cada wireframe enumera al menos un `F-XX` del walkthrough y/o `HX-YY` del audit que aborda.

## Wireframe index

| ID  | Nombre                                                                                                | Anchors principales        |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| W01 | Cold start / welcome state                                                                            | F-01, F-02, F-03, H10-03   |
| W02 | Sidebar — lista poblada                                                                               | F-14, F-15, H4-04          |
| W03 | Sidebar — hover state (three-dot visible)                                                             | F-16, H6-02                |
| W04 | Sidebar — three-dot menu open                                                                         | F-16, F-17, H6-02, H7-02   |
| W05 | Sidebar — search vacío                                                                                | F-22, H7-02                |
| W06 | Sidebar — search con matches (title-first)                                                            | F-22, H6-06                |
| W07 | Sidebar — search ≥3 chars sin matches (content fallback)                                              | F-22, F-24, H6-06          |
| W08 | Sidebar — inline rename activo                                                                        | F-20, F-21, H3-04, H9-04   |
| W09 | Modal de delete abierto                                                                               | F-18, F-19, H3-02, H5-02   |
| W10 | Input area — estado vacío (single-shot pre-send)                                                      | F-04, F-05, F-25, H3-03    |
| W11 | Input area — con texto                                                                                | F-05, H6-01, H7-01         |
| W12 | Input area — con attachments                                                                          | F-25, F-26, F-27, F-28, H5-01, H6-04 |
| W13 | Quality toggle (Fast / Quality / Quality+Research, coste visible)                                     | H1-04, H5-03, H8-06        |
| W14 | Stage 1 — tabs por modelo                                                                             | F-07, F-08, H1-02, H2-02   |
| W15 | Stage 1 — disclosure "Show reasoning" colapsado                                                       | F-07, H1-05, H6-05, H8-05  |
| W16 | Stage 1 — disclosure expandido                                                                        | H1-05, H6-05, H8-05        |
| W17 | Stage 2 — tabs de evaluaciones + de-anonimización                                                     | F-09, H6-03, H10-02        |
| W18 | Stage 2 — aggregate rankings con avg position + vote count                                            | F-10, F-11, H2-01, H8-03   |
| W19 | Stage 3 — synthesis con highlight visual + download                                                   | F-12, F-13, H4-01, H4-02, H8-01 |
| W20 | Header de app branded                                                                                 | F-02, H4-04                |
| W21 | Empty state genérico                                                                                  | F-01, F-04, F-24, H10-03   |
| W22 | Error state genérico                                                                                  | H9-01, H9-02, H9-04        |
| W23 | Loading state genérico (per-stage progress)                                                           | F-06, H1-01, H1-02         |

---

## W01: Cold start / welcome state

Primer arranque, `data/conversations/` vacío. Header branded de app, sidebar vacío con CTA prominente, panel central que vende el modelo mental "3 stages + chairman" y sugiere primer prompt. Resuelve F-01 (welcome state no comunica valor diferencial) y F-03 (CTA huérfano del welcome).

```
┌── (1) Branded header ────────────────────────────────────────────────────────┐
│ ◇ LLM Council                                                  [⚙ Settings]  │
├── (2) Sidebar ─────────────┬── (3) Welcome / main panel ───────────────────────┤
│                            │                                                  │
│  [+ New Conversation] ◀(4) │      Welcome to LLM Council                      │
│                            │                                                  │
│  ┌──────────────────────┐  │      Ask one question. Three models answer.      │
│  │ Search conversations │  │      They peer-review each other's work          │
│  └──────────────────────┘  │      anonymously. A chairman synthesizes.        │
│                            │                                                  │
│  ──── (5) Empty state ──── │      ┌───────────────────────────────────────┐   │
│                            │      │ Stage 1   →   Stage 2   →   Stage 3   │   │
│   No conversations yet     │      │ 3 models      Peer review   Final     │   │
│                            │      │ answer        + ranking     synthesis │   │
│   [+ Start your first      │      └───────────────────────────────────────┘   │
│      conversation] ◀ (6)   │                                                  │
│                            │      Try asking:                                 │
│                            │      • "Compare Snowflake vs DuckDB for ..."     │
│                            │      • "Pros & cons of feature flag tools"       │
│                            │      • "Review this SQL for performance" + 📎    │
│                            │                                                  │
└────────────────────────────┴──────────────────────────────────────────────────┘
```

| (#) | Elemento                | Acción / shortcut                            | Notes                                                  |
| --- | ----------------------- | -------------------------------------------- | ------------------------------------------------------ |
| 1   | Branded header (W20)    | Persistente; settings slot reservado para v2 | Icono + nombre — "personal tool" no logo corporativo   |
| 2   | Sidebar                 | Persistente, ancho fijo                      | Mismo componente que W02..W09                          |
| 3   | Main panel              | Welcome content; sin form de input           | Form aparece solo dentro de una conversación abierta   |
| 4   | "+ New Conversation"    | Click → crea conversación + selecciona       | También accionable por `⌘N` / `Ctrl+N`                 |
| 5   | Empty state copy        | "No conversations yet"                       | Resuelve F-24 (mensaje vacío sin contexto) parcialmente |
| 6   | CTA central duplicado   | Click → mismo handler que (4)                | Resuelve F-03 (welcome+CTA enlazados visualmente)      |

**Anchors:** F-01 (welcome no comunica valor) · F-02 (header branded ausente — ahora presente en (1)) · F-03 (CTA enlazado al welcome via (6)) · H10-03 (cold start enseña el patrón 3-stage).

---

## W02: Sidebar — lista poblada

Sidebar con 5–10 conversaciones, una activa highlighted, scroll si supera viewport. Estado base sin hover, sin search, sin menu abierto. Resuelve F-14 (conversaciones sin título indistinguibles) mostrando timestamp como fallback.

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Search conversations…    │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌─── (1) Active row ────────┐  │
│  │ █ Pricing analysis Q4     │  │
│  │ █ 6 messages              │  │
│  └───────────────────────────┘  │
│  ┌─────────────────────────────┐│
│  │ Snowflake vs DuckDB         ││
│  │ 4 messages                  ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ SQL review · feature flags  ││
│  │ 2 messages                  ││
│  └─────────────────────────────┘│
│  ┌─── (2) Untitled fallback ──┐ │
│  │ New Conversation · 2026-05-08│
│  │ 0 messages                  ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Pharma cohort segmentation  ││
│  │ 8 messages                  ││
│  └─────────────────────────────┘│
│                              ↓  │
└─────────────────────────────────┘
```

| (#) | Elemento              | Acción / shortcut                     | Notes                                                   |
| --- | --------------------- | ------------------------------------- | ------------------------------------------------------- |
| 1   | Active row            | Click no-op (ya activa)               | Highlight visual indica selección actual                |
| 2   | Untitled fallback     | Muestra timestamp si título es vacío  | Resuelve F-14; se muestra solo cuando `title` es null   |

**Anchors:** F-14 (untitled distinguibles via fecha) · F-15 (preview/agrupación deferred a v2 — slot conceptual) · H4-04 (token de accent compartido para active row).

---

## W03: Sidebar — hover state (three-dot visible)

Mismo W02 pero con un item en hover state mostrando el `⋮` a la derecha. Affordance ChatGPT-pattern. Resuelve F-16 (three-dot solo en hover) acotando el reproche: el estado hover se ve.

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Search conversations…    │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Pricing analysis Q4         ││
│  │ 6 messages                  ││
│  └─────────────────────────────┘│
│  ┌─── (1) Hovered row ──────┐ ▾│
│  │ Snowflake vs DuckDB    [⋮]◀(2)
│  │ 4 messages              ▴│  │
│  └──────────────────────────┘  │
│  ┌─────────────────────────────┐│
│  │ SQL review · feature flags  ││
│  │ 2 messages                  ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

| (#) | Elemento            | Acción / shortcut                        | Notes                                              |
| --- | ------------------- | ---------------------------------------- | -------------------------------------------------- |
| 1   | Hovered row         | Hover entire row → background sutil      | Affordance también responde a `:focus-within`      |
| 2   | Three-dot trigger   | Click → abre menu (W04); right-click row → mismo menu | Visible solo en hover/focus; ARIA `aria-haspopup="menu"` |

**Anchors:** F-16 (three-dot oculto sin hover — keyboard-only sigue siendo gap; en wireframe se anota que `:focus-within` también revela) · H6-02 (recognition aceptable como ChatGPT-pattern).

---

## W04: Sidebar — three-dot menu open

Menu popover abierto con items "Rename" + "Delete" anchored al icon vía `position: fixed` con clamp al viewport. Items v1 (Phase 1) son **Rename / Delete** literales. Resuelve F-16 + F-17 (slot tipográfico para shortcuts reservado aunque v1 no los wirea).

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Search conversations…    │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Pricing analysis Q4         ││
│  │ 6 messages                  ││
│  └─────────────────────────────┘│
│  ┌─── Selected row ──────────┐  │   ┌── (1) Menu popover ─────┐
│  │ Snowflake vs DuckDB    [⋮]│──┼─▶ │ Rename            (⌘E)  │ ◀(2)
│  │ 4 messages                │  │   │ Delete            (⌫)   │ ◀(3)
│  └───────────────────────────┘  │   └─────────────────────────┘
│  ┌─────────────────────────────┐│
│  │ SQL review · feature flags  ││
│  │ 2 messages                  ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

| (#) | Elemento         | Acción / shortcut                                  | Notes                                                                  |
| --- | ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Menu popover     | `position: fixed`, viewport-clamped, ESC cierra    | Click fuera (`document mousedown` capture) cierra; arrow nav v2        |
| 2   | "Rename" item    | Click → entra en W08 (inline rename activo)        | Slot de shortcut `⌘E` reservado tipográficamente; wiring v2             |
| 3   | "Delete" item    | Click → abre W09 (modal de delete)                 | Slot de shortcut `⌫` reservado; destructiva pero NO red en este nivel — el modal se encarga |

**Phase 1 contract literal:** items son exactamente `Rename` y `Delete` (D-19, `01-CONTEXT.md` Phase 1 Specifics).

**Anchors:** F-16 (menu accesible vía click directo) · F-17 (shortcuts visibles aunque deferred) · H6-02 (popover alineado a row, recognition) · H7-02 (shortcuts surface plantada).

---

## W05: Sidebar — search vacío

Search input enfocado, sin texto. Lista completa visible debajo. Estado neutral pre-typing. Resuelve F-22 parcialmente: el search es persistente (visible siempre), pero el modo "content search" sigue siendo emergent (W07).

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌── (1) Focused search ────┐   │
│  │ █                        │ ◀(2)
│  └──────────────────────────┘   │
│  > Search conversations…   ◀(3) │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Pricing analysis Q4         ││
│  │ 6 messages                  ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Snowflake vs DuckDB         ││
│  │ 4 messages                  ││
│  └─────────────────────────────┘│
│  ⋮  (full list visible)         │
└─────────────────────────────────┘
```

| (#) | Elemento            | Acción / shortcut                              | Notes                                                |
| --- | ------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| 1   | Search input focused| Cursor visible; lista completa abajo           | Debounce 200ms para filtering (Phase 1 Sidebar.jsx)  |
| 2   | Cursor              | Posición inicial                               | Atajo global `⌘K` / `Ctrl+K` da focus al search      |
| 3   | Placeholder         | "Search conversations…"                        | Placeholder desaparece al primer keystroke           |

**Anchors:** F-22 (search es persistente — descubribilidad pasiva del título; content fallback emerge en W07) · H7-02 (atajo `⌘K` reservado).

---

## W06: Sidebar — search con matches (title-first)

Input con texto (≥1 char). Lista filtrada por título. Highlight del match dentro del título. Estado más común durante typing. Reflects D-10 Phase 1: title-first search debounce 200ms.

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ pric                     │ ◀(1)
│  └──────────────────────────┘   │
│  ┌─── (2) Title match #1 ────┐  │
│  │ *Pric*ing analysis Q4     │  │
│  │ 6 messages                │  │
│  └───────────────────────────┘  │
│  ┌─── (3) Title match #2 ────┐  │
│  │ *Pric*ing strategy Snow   │  │
│  │ 3 messages                │  │
│  └───────────────────────────┘  │
│                                 │
│  (other 8 conversations hidden) │
└─────────────────────────────────┘
```

| (#) | Elemento            | Acción / shortcut                              | Notes                                                  |
| --- | ------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| 1   | Search input filled | Texto del usuario                              | Filtrado client-side, case-insensitive                 |
| 2   | Title match         | Click → selecciona conversación                | Highlight del substring matched (representado `*pric*`) |
| 3   | Subsequent matches  | Mismo comportamiento                           | Orden: por created_at desc dentro del subset filtrado  |

**Anchors:** F-22 (search activo y descubrible) · H6-06 (recognition: el affordance de content fallback aparece SOLO cuando es necesario en W07).

---

## W07: Sidebar — search ≥3 chars sin matches (content fallback)

Input con texto (≥3 chars), lista vacía por título, debajo el affordance literal **`Search inside content (N conversations)`** clicable. La N es el número de conversaciones totales. Esta es la materialización de D-10 Phase 1 que cierra F-22 mejor.

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ async                    │ ◀(1)
│  └──────────────────────────┘   │
│                                 │
│  ┌── (2) Empty state ────────┐  │
│  │ No matches for "async"    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌── (3) Content fallback ───┐  │
│  │ 🔎 Search inside content   │  │
│  │    (12 conversations)     │ ◀(4)
│  └───────────────────────────┘  │
│                                 │
│  Note (after activation):       │
│  ┌── (5) Sticky note ────────┐  │
│  │ Searching titles + content│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

| (#) | Elemento                  | Acción / shortcut                                          | Notes                                                                  |
| --- | ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Search input ≥3 chars     | Trigger condition para affordance: `query.length>=3 && titleMatches===0 && !contentSearchActive` | D-10 Phase 1                                                |
| 2   | Empty state               | `No matches for "<query>"`                                 | Phase 1 copy (F-24 anota — copy podría sugerir más; mockup conserva)   |
| 3   | Content fallback button   | **Literal copy:** `Search inside content (N conversations)` (D-19 / Phase 1) | El espacio entre paréntesis usa la N viva (count actual)               |
| 4   | Click handler             | Click → `Promise.all(api.getConversation(...))` → re-filter por contenido | Mientras carga muestra `Loading content from N conversations…`         |
| 5   | Sticky activation note    | `Searching titles + content`                               | Visible para el resto de la sesión tras activar; no se desactiva       |

**Phase 1 literal copy contract:** `Search inside content (N conversations)` aparece **textual** (D-19, Phase 1 v1).

**Anchors:** F-22 (affordance descubrible solo cuando aplica — D-10 evita flicker) · F-24 (empty state genérico — mejora deferred al copy doctor de Plan 03) · H6-06 (recognition over recall).

---

## W08: Sidebar — inline rename activo

Item con su título convertido en input editable, con cursor visible. Enter commits, ESC cancela, blur commits-or-cancels per `intentRef` pattern (Phase 1 Sidebar.jsx:34-60). Resuelve F-20 mostrando hint visual sutil de los shortcuts.

```
┌── Sidebar ──────────────────────┐
│  [+ New Conversation]           │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Search conversations…    │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌─── Editing row ──────────┐   │
│  │ ┌── (1) Inline input ──┐ │   │
│  │ │ █Snowflake vs DuckDB │ │ ◀(2)
│  │ └──────────────────────┘ │   │
│  │ 4 messages               │   │
│  │ ┌── (3) Hint footer ───┐ │   │
│  │ │ Enter save · Esc ✕   │ │   │
│  │ └──────────────────────┘ │   │
│  └──────────────────────────┘   │
│  ┌─────────────────────────────┐│
│  │ Pricing analysis Q4         ││
│  │ 6 messages                  ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

| (#) | Elemento              | Acción / shortcut                                                      | Notes                                                                  |
| --- | --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Inline input          | Auto-focus + select-all on mount (Phase 1 `Sidebar.jsx:27-32`)         | aria-label="Conversation title"                                        |
| 2   | Cursor                | Posición tras select-all                                               | El usuario puede empezar a tipear directamente                         |
| 3   | Shortcuts hint footer | Hint sutil visible solo durante edición (resuelve F-20)                | Enter=commit · Esc=cancel · blur=commit (intent reflects `intentRef`)  |

**Behavior contract (Phase 1 D-06):**
- **Enter** → trim + (si cambió y no vacío) save; backend PATCH
- **Esc** → cancela, vuelve al título previo
- **blur** → commit por defecto excepto si intent fue Esc (intentRef pattern)
- **Empty / unchanged** → silent reject (F-21 anota: error de PATCH es silencioso — Plan 03 lo trata)

**Anchors:** F-20 (shortcuts ahora visibles via (3)) · F-21 (error rename silencioso — diferred a Plan 03/04) · H3-04 (triple exit path) · H9-04 (visibilidad de error queda como gap conocido).

---

## W09: Modal de delete abierto

Backdrop oscuro + dialog centered. Title, body con título entre comillas, warning "This cannot be undone.", botones Cancel + Delete (destructive). Focus trap manual; initial focus en Cancel (H5-02 — safer default). ESC y click-outside cierran. Hereda mockup aprobado en Phase 1 (`01-CONTEXT.md` §Specifics).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (1) Backdrop ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓                                                                     ▓▓ │
│ ▓▓     ┌── (2) Dialog ────────────────────────────────────────────┐    ▓▓ │
│ ▓▓     │                                                          │    ▓▓ │
│ ▓▓     │  Delete conversation                            ◀ (3)    │    ▓▓ │
│ ▓▓     │                                                          │    ▓▓ │
│ ▓▓     │  Delete "Snowflake vs DuckDB"?                  ◀ (4)    │    ▓▓ │
│ ▓▓     │  4 messages · last activity 2 days ago          ◀ (5)    │    ▓▓ │
│ ▓▓     │                                                          │    ▓▓ │
│ ▓▓     │  ⚠  This cannot be undone.                      ◀ (6)    │    ▓▓ │
│ ▓▓     │                                                          │    ▓▓ │
│ ▓▓     │                          [█ Cancel ◀(7)]  [Delete ◀(8)]  │    ▓▓ │
│ ▓▓     │                                                          │    ▓▓ │
│ ▓▓     └──────────────────────────────────────────────────────────┘    ▓▓ │
│ ▓▓                                                                     ▓▓ │
└────────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                   | Acción / shortcut                                                                                                  | Notes                                                                            |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | Backdrop                   | Click → cierra (target===currentTarget)                                                                            | ESC también cierra (H3-02)                                                       |
| 2   | Dialog                     | Focus trap manual (Phase 1 `Modal.jsx:43-80`)                                                                      | role="dialog", aria-modal="true"                                                 |
| 3   | Title                      | "Delete conversation"                                                                                              | Plain heading, no icono destructive                                              |
| 4   | Body — título de la conv   | `Delete "<title>"?` literal Phase 1                                                                                | Quoted para diferenciar de un placeholder                                        |
| 5   | Metadata diferenciadora    | Count + last activity (resuelve F-18: "dos conversations con título similar — verificación inadecuada")            | NEW vs Phase 1 — anotación que Plan 04 propone para reducir F-18                 |
| 6   | Warning                    | Exact: `This cannot be undone.`                                                                                    | Phase 1 literal                                                                  |
| 7   | Cancel button (initial focus) | Click / ESC → cierra; primer focusable (Phase 1 `Modal.jsx:50-51`)                                              | Visualmente menos peso que Delete (no destructive)                               |
| 8   | Delete button (destructive)| Click → API delete + cierra modal                                                                                  | Visualmente destructive (color tonal por dirección — los wireframes solo marcan diferenciación) |

**Phase 1 contract literal:**
- Body: `Delete "{title}"?` + `This cannot be undone.` (D-19).
- Initial focus: Cancel (H5-02).
- ESC + click-outside cierran.

**Anchors:** F-18 (metadata (5) ayuda verificar) · F-19 (toast post-delete + undo deferred — Plan 03/04 decide) · H3-02 (control + freedom: triple exit) · H5-02 (safer default).

---

## W10: Input area — estado vacío (single-shot pre-send)

Main panel dentro de una conversación nueva, ANTES del primer envío. Textarea + send button + slot del Quality toggle + attachments dropzone visible. Resuelve F-25 (file input nativo) con un botón estilizado.

**CRITICAL:** Por D-20 / `ChatInterface.jsx:221`, el form de input está visible **solo** cuando `conversation.messages.length === 0`. Tras el primer envío el form se oculta — la app es **single-shot por conversación**. Este wireframe es el ÚNICO estado en el que se ve el input dentro de una conversación.

```
┌── Branded header (W20) ──────────────────────────────────────────────────────┐
├── Sidebar ────────┬── Main panel — single-shot pre-send ─────────────────────┤
│ ...               │                                                          │
│                   │   Pricing analysis Q4                                    │
│                   │   ────────────────────                                   │
│                   │                                                          │
│                   │   ┌── (1) Hint single-shot ───────────────────────────┐  │
│                   │   │ One question per conversation. New conversation = │  │
│                   │   │ new question.                                     │  │
│                   │   └───────────────────────────────────────────────────┘  │
│                   │                                                          │
│                   │   ┌── (2) Quality toggle slot ────────────────────────┐  │
│                   │   │ [● Fast]  [○ Quality]  [○ Quality+Research]       │  │
│                   │   │  ~$0.001    ~$0.05      ~$0.45 · 5–10 min          │  │
│                   │   └───────────────────────────────────────────────────┘  │
│                   │                                                          │
│                   │   ┌── (3) Textarea ───────────────────────────────────┐  │
│                   │   │                                                   │  │
│                   │   │ Ask your question…                                │  │
│                   │   │                                                   │  │
│                   │   │                                                   │  │
│                   │   └───────────────────────────────────────────────────┘  │
│                   │   Shift+Enter for new line · Enter to send       ◀(4)   │
│                   │                                                          │
│                   │   ┌── (5) Attach trigger ─────────────────────────────┐  │
│                   │   │ 📎 Attach files     (max 500KB each, 2MB total)    │  │
│                   │   │ Supports: .md .txt .csv .py .sql .json .yml ...   │  │
│                   │   └───────────────────────────────────────────────────┘  │
│                   │                                                          │
│                   │                                          [Send ◀(6) ▸]  │
└───────────────────┴──────────────────────────────────────────────────────────┘
```

| (#) | Elemento                      | Acción / shortcut                                                                                                | Notes                                                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Single-shot hint              | Visible pre-send (resuelve F-05: el patrón se anuncia antes de aplicar)                                          | Microcopy concreto a definir por dirección — wireframe solo establece que el hint existe       |
| 2   | Quality toggle slot           | 3-state radio (W13)                                                                                              | Coste visible **siempre**, sin hover (PROJECT.md/Constraints + H1-04)                          |
| 3   | Textarea                      | Auto-grow multiline; Enter envía, Shift+Enter newline                                                            | Placeholder `Ask your question…`                                                               |
| 4   | Persistent shortcuts hint     | Sutil bajo el textarea (resuelve H6-01 — recognition over recall)                                                | Visible aunque el textarea tenga texto                                                         |
| 5   | Attach trigger estilizado     | Botón con paperclip + label literal + límites + extensiones (resuelve F-25, F-26, F-28)                          | Click → file picker (input file oculto detrás); drag-and-drop también soportado                |
| 6   | Send button                   | Disabled si `!input.trim() && attachments.length===0` (Plan 03 decide soft-prompt)                               | Cuando Quality+Research seleccionado: variant `[Send · ~$0.45 estimated]` (H5-03, friction extra) |

**Anchors:** F-04 (orientación tipo de pregunta — slot reservado en hint del welcome state) · F-05 (single-shot anunciado en (1)) · F-25 (attach estilizado) · H3-03 (single-shot comunicado).

---

## W11: Input area — con texto

Mismo W10 pero con texto multilínea de ejemplo. Textarea auto-grew. Send button habilitado.

```
┌── Main panel ─────────────────────────────────────────────────────────────┐
│  ...                                                                      │
│  ┌── Quality toggle (W13) ────────────────────────────────────────────┐   │
│  │ [● Fast]  [○ Quality]  [○ Quality+Research]                        │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌── (1) Textarea filled ───────────────────────────────────────────┐    │
│  │ Compare Snowflake and DuckDB for ad-hoc analytics over           │    │
│  │ pharma claims data (~50M rows). Considering:                     │    │
│  │  - cost of ownership                                             │    │
│  │  - latency for interactive Power BI dashboards                   │    │
│  │  - PEQ split by country requirements                          █ ◀(2)
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  Shift+Enter for new line · Enter to send                       ◀(3)     │
│                                                                           │
│  📎 Attach files     (max 500KB each, 2MB total)                          │
│                                                                           │
│                                              [Send ▸] ◀(4)                │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento           | Acción / shortcut                                | Notes                                                                  |
| --- | ------------------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | Textarea con texto | Auto-grow vertical                               | rows="3" mínimo (Phase 1)                                              |
| 2   | Cursor             | Posición end-of-text                             | Enter sin Shift envía                                                  |
| 3   | Persistent hint    | Visible aunque el textarea tiene texto           | Resuelve H6-01 — el shortcut no desaparece al escribir                 |
| 4   | Send enabled       | Click o Enter → onSendMessage                    | El send transitiona a W23 (loading state)                              |

**Anchors:** F-05 (mismo single-shot — hint persistente) · H6-01 (shortcut persistente, no desaparece) · H7-01 (atajo Enter / Shift+Enter implementado).

---

## W12: Input area — con attachments

Chip list con 2 attachments (`paper.pdf · 320KB`, `notes.md · 12KB`), botón `[×]` por chip, contador de tamaño total `2 / 2MB`. Si hay error de tamaño, banner debajo.

```
┌── Main panel ─────────────────────────────────────────────────────────────┐
│  ...                                                                      │
│  ┌── Textarea (W11) filled ─────────────────────────────────────────┐    │
│  │ Review these snowflake migration scripts for performance.        │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  Shift+Enter for new line · Enter to send                                 │
│                                                                           │
│  📎 Attach files     (max 500KB each, 2MB total)                          │
│                                                                           │
│  ┌── (1) Attachment chips ──────────────────────────────────────────┐    │
│  │ ┌─ migration_v2.sql · 142 KB  [×] ─┐                              │    │
│  │ └──────────────────────────────────┘                              │    │
│  │ ┌─ benchmarks.csv · 348 KB    [×] ─┐                              │    │
│  │ └──────────────────────────────────┘                              │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  Total: 490 KB / 2 MB                                          ◀(2)       │
│                                                                           │
│  ┌── (3) Attachment error (conditional) ────────────────────────────┐    │
│  │ ⚠ "huge_dataset.csv" exceeds per-file limit (612 KB > 500 KB).   │    │
│  │    Try a smaller file or split it into chunks under 500 KB.      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│                                              [Send ▸]                     │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento              | Acción / shortcut                                                                                          | Notes                                                                                               |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Attachment chips      | Cada chip muestra name + size + `[×]` remove                                                              | aria-label="Remove <filename>" en el `[×]`; chip eliminable independientemente                       |
| 2   | Total counter         | `Total: X KB / 2 MB`                                                                                       | Visible siempre que haya ≥1 attachment (resuelve F-28: límite comunicado proactivamente al ver chips) |
| 3   | Error banner          | Specific error: file name + size violation + recovery hint (resuelve F-27 con copy más útil — propuesta de Plan 03 lo afina) | Inline `attachment-error` (Phase 1 styling); se limpia al `removeAttachment` o submit OK            |

**Anchors:** F-25 (attach trigger estilizado) · F-26 (extensiones comunicadas en (W10) (5)) · F-27 (error con acción correctiva) · F-28 (límite comunicado vía (2)) · H5-01 (guard 500KB / 2MB) · H6-04 (extensiones visibles).

---

## W13: Quality toggle (Fast / Quality / Quality+Research, coste visible)

Toggle 3-state visible junto al textarea. **El coste estimado es siempre visible** (no aparece en hover) — requirement directo de PROJECT.md/Constraints + H1-04 + H5-03. Esta wireframe muestra la **estructura** del toggle; el rendering visual concreto del coste lo decide cada dirección tonal en Plan 05 (CD-02).

```
┌── Quality toggle (3-state) ───────────────────────────────────────────────┐
│                                                                           │
│  ┌── (1) Fast ─────────┬── (2) Quality ────┬── (3) Quality+Research ──┐   │
│  │ ● Fast              │ ○ Quality         │ ○ Quality+Research        │   │
│  │ ~$0.001             │ ~$0.05            │ ~$0.45 · 5–10 min ⚠      │   │
│  │ Single fast model   │ Full council      │ Council + web research    │   │
│  └─────────────────────┴───────────────────┴───────────────────────────┘   │
│                                                          ◀(4)             │
│  When Quality+Research is selected, Send button becomes:                  │
│  [Send · ~$0.45 estimated ▸]   ◀(5)                                       │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento              | Acción / shortcut                                                                                                                    | Notes                                                                                                              |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Fast (default)        | Selected by default; coste literal `~$0.001` visible                                                                                 | Subtitle: "Single fast model" — model concreto lo decide Phase 3                                                   |
| 2   | Quality               | Click → seleccionado; coste literal `~$0.05`                                                                                         | Subtitle: "Full council" — 3 modelos + chairman                                                                    |
| 3   | Quality+Research      | Click → seleccionado; coste literal `~$0.45 · 5–10 min`                                                                              | Subtitle + warning ⚠; el `5–10 min` también se puede expresar en cada dirección con su tono                        |
| 4   | Coste persistente     | **Siempre visible**, sin hover (H1-04)                                                                                               | Cada dirección renderiza el coste con su lenguaje (CD-02): notebook=footnote · cockpit=chip · minimal=subtitle      |
| 5   | Send variant          | Cuando (3) está seleccionado, Send muestra coste literal: `[Send · ~$XX estimated ▸]` (H5-03 — friction extra para modo más caro)    | Click intercambia primer click cualquier vs Quality+Research: misma acción, distinta visibilidad de coste          |

**Anchors:** H1-04 (coste visible en selector) · H5-03 (friction extra send variant) · H8-06 (minimalismo del selector — coste como subtítulo, no panel).

---

## W14: Stage 1 — tabs por modelo

Header de stage, tabs por modelo (4 modelos típicos del council), contenido renderizado markdown del modelo activo. Cada tab muestra publisher + model_short_name (resuelve F-08).

```
┌── Main panel — durante deliberación ──────────────────────────────────────┐
│                                                                           │
│  Stage 1: Individual Responses                                            │
│  Three council models answered in parallel.                               │
│                                                                           │
│  ┌── (1) Tab bar ──────────────────────────────────────────────────────┐  │
│  │ [█ OpenAI · gpt-5-mini ✓]  [Anthropic · claude-sonnet-4 ✓]          │  │
│  │ [Google · gemini-2.5-pro ✓]  [⚠ openai · o4-mini failed]            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                          ◀(2)                             │
│  ┌── (3) Active tab content (markdown) ─────────────────────────────────┐ │
│  │                                                                      │ │
│  │ # Snowflake vs DuckDB for pharma claims                              │ │
│  │                                                                      │ │
│  │ Both are columnar, but the trade-offs differ sharply for             │ │
│  │ ad-hoc work over ~50M rows…                                          │ │
│  │                                                                      │ │
│  │ ## Cost of ownership                                                 │ │
│  │ - Snowflake: pay-per-second compute, T-shirt sizing…                 │ │
│  │ - DuckDB: free, embedded, in-process…                                │ │
│  │                                                                      │ │
│  │ ⋮                                                                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌── (4) Reasoning disclosure (W15) ────────────────────────────────────┐ │
│  │ ▶ Show reasoning  (1.2 K tokens)                                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                 | Acción / shortcut                                                                                                                          | Notes                                                                                                                                    |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tab bar                  | Tab por modelo del roster; cada uno muestra publisher · model_short + estado (✓ ok, ⚠ failed)                                              | Resuelve F-08 (publisher visible) y H9-02 (failed visible explícitamente)                                                                |
| 2   | Active tab               | Click cambia contenido (Phase 1 `useState(0)`)                                                                                              | Tabs sigue forzando lectura serial — F-07 anota; Plan 03/05 explora alternativas (split view solo si dirección lo justifica)             |
| 3   | Markdown content         | ReactMarkdown render con `.markdown-content` wrapper (Phase 1)                                                                              | Tipografía concreta vive en Plan 05 — wireframe solo ancla la estructura                                                                 |
| 4   | Reasoning disclosure     | (Visible solo si el modelo expone `reasoning_details` en el response) — colapsado por defecto                                              | Click → expandir (W16)                                                                                                                   |

**Anchors:** F-07 (lectura serial — anotada) · F-08 (publisher en tab) · H1-02 (estado por tab — ✓ ⚠) · H2-02 (publisher visible).

---

## W15: Stage 1 — disclosure "Show reasoning" colapsado

Mismo W14 pero foco en el disclosure colapsado. Estado por defecto cuando la tab tiene un modelo con `reasoning_details`. Resuelve H6-05 y H8-05 (recognition + minimalismo).

```
┌── Stage 1 — bottom of active tab ─────────────────────────────────────────┐
│                                                                           │
│  …(end of model response markdown)…                                       │
│                                                                           │
│  In short, DuckDB wins for local interactive exploration over              │
│  cached extracts; Snowflake wins for shared production dashboards.        │
│                                                                           │
│  ┌── (1) Reasoning disclosure (collapsed) ─────────────────────────────┐  │
│  │  ▶ Show reasoning  (1.2 K tokens)              ◀(2)                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌── Tabs nav (footer) ─────────────────────────────────────────────────┐ │
│  │  ◀ openai · gpt-5-mini  │  Anthropic · claude-sonnet-4 ▶              │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                  | Acción / shortcut                                                                                                  | Notes                                                                                              |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | Reasoning disclosure      | Solo se renderiza cuando el response trae `reasoning_details` — captado por backend (`backend/openrouter.py:48-55`) | Posición: al final de la tab content, ANTES del nav inferior; nunca como overlay                    |
| 2   | "▶ Show reasoning"        | Click → expande inline (W16)                                                                                       | Label literal `Show reasoning` (greppable; resuelve H6-05 — recognition). Token count opcional      |

**Anchors:** F-07 (mismo) · H1-05 (system status — reasoning capturado y descubrible) · H6-05 (recognition over recall) · H8-05 (colapsado por default — minimalist).

---

## W16: Stage 1 — disclosure expandido

Mismo W15 pero con el disclosure expandido. `▼ Hide reasoning` toggle. Reasoning content visible inline, jerárquicamente subordinado al response.

```
┌── Stage 1 — bottom of active tab, reasoning expanded ─────────────────────┐
│                                                                           │
│  ┌── (1) Reasoning disclosure (expanded) ──────────────────────────────┐  │
│  │  ▼ Hide reasoning  (1.2 K tokens)              ◀(2)                  │  │
│  │ ─────────────────────────────────────────────────────────────────── │  │
│  │ │                                                                 │ │  │
│  │ │  Step 1: Comparing storage architectures                        │ │  │
│  │ │  Snowflake separates compute and storage; DuckDB is             │ │  │
│  │ │  embedded and shares a single process. This implies…            │ │  │
│  │ │                                                                 │ │  │
│  │ │  Step 2: Cost analysis for 50M-row ad-hoc workloads             │ │  │
│  │ │  At 2-credit warehouses with autosuspend 60s, ~$X/month…        │ │  │
│  │ │                                                                 │ │  │
│  │ │  Step 3: PEQ split by country implications                      │ │  │
│  │ │  Snowflake row access policies handle PEQ cleanly via…          │ │  │
│  │ │                                                                 │ │  │
│  │ │  ⋮                                                              │ │  │
│  │ │                                                       ◀(3)      │ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                  | Acción / shortcut                                                                                       | Notes                                                                                                                          |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Disclosure expanded       | Reasoning render inline (no overlay)                                                                    | El reasoning es secundario jerárquicamente — Plan 05 entrega tipografía más pequeña / muted (H8-05)                            |
| 2   | "▼ Hide reasoning"        | Click → colapsa (vuelve a W15)                                                                          | Label literal `Hide reasoning` (greppable)                                                                                     |
| 3   | Reasoning text container  | Lectura long-form (los modelos reasoning generan miles de tokens)                                       | Tipografía secundaria por dirección — wireframe solo establece que el bloque está jerárquicamente subordinado a la response   |

**Anchors:** H1-05 (system status — reasoning ahora visible) · H6-05 (recognition completo) · H8-05 (jerarquía visual — reasoning subordinada al response, no la oculta).

---

## W17: Stage 2 — tabs de evaluaciones + de-anonimización

Header de stage, tabs por evaluador (uno por cada modelo del Stage 1), contenido de la evaluación con etiquetas `Response A / B / C` de-anonimizadas como `**openai/gpt-5-mini**` (bold para readability — Phase 1 strategy).

```
┌── Main panel ─────────────────────────────────────────────────────────────┐
│                                                                           │
│  Stage 2: Peer Evaluations                                                │
│  Each council model evaluated all responses (anonymized as Response       │
│  A, B, C). Bold model names below are post-de-anonymization for           │
│  readability — the original evaluation used anonymous labels.            │
│                                                                           │
│  ┌── (1) Tab bar — evaluadores ───────────────────────────────────────┐   │
│  │ [█ OpenAI · gpt-5-mini]  [Anthropic · claude-sonnet-4]              │   │
│  │ [Google · gemini-2.5-pro]                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌── (2) Active evaluator content ──────────────────────────────────────┐ │
│  │                                                                      │ │
│  │ Response A by **anthropic/claude-sonnet-4**     ◀(3)                 │ │
│  │ Strong technical depth on PEQ split…                                 │ │
│  │                                                                      │ │
│  │ Response B by **openai/gpt-5-mini**             ◀(3)                 │ │
│  │ Clearer cost-of-ownership table…                                     │ │
│  │                                                                      │ │
│  │ Response C by **google/gemini-2.5-pro**         ◀(3)                 │ │
│  │ Better trade-off framing…                                            │ │
│  │                                                                      │ │
│  │ FINAL RANKING:                                                       │ │
│  │ 1. Response B  (openai/gpt-5-mini)                                   │ │
│  │ 2. Response A  (anthropic/claude-sonnet-4)                           │ │
│  │ 3. Response C  (google/gemini-2.5-pro)                               │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌── (4) Extracted ranking validation ───────────────────────────────────┐│
│  │ Parsed ranking: 1→B (gpt-5-mini), 2→A (claude-sonnet-4), 3→C…         ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌── (5) → see W18: Aggregate rankings panel ──────────────────────────┐ │
│  │ (rendered below the per-evaluator tab content)                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                       | Acción / shortcut                                                                                                                                                  | Notes                                                                                                                                                                              |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Evaluator tab bar              | Click cambia evaluador                                                                                                                                            | El tab es el modelo que **evaluó**, no el que produjo la respuesta evaluada                                                                                                        |
| 2   | Evaluation content             | Markdown render del raw text del modelo (Phase 1)                                                                                                                  | Includes `FINAL RANKING:` block — la convención canon Phase 1 (`stage2_collect_rankings`)                                                                                          |
| 3   | De-anonymization bold          | Cada `Response X` se de-anonimiza inline a `**publisher/model**` (Phase 1 client-side `Stage2.jsx:5-15`)                                                          | El **bold** es signal visual de "esto es de-anonimization, no jerga interna" — Phase 1 explanation copy                                                                            |
| 4   | Extracted ranking              | Mostrado debajo del raw evaluation para que el usuario valide cómo el sistema parseó el ranking                                                                    | Phase 1 transparency mechanism                                                                                                                                                     |
| 5   | Aggregate panel reference      | El panel agregado se renderiza debajo (W18)                                                                                                                       | No hay split — Stage 2 = tabs + aggregate                                                                                                                                          |

**Anchors:** F-09 (concepto explicado en (2) explanation; visualización de-anonymization en (3); pendiente afinar para hacerlo más visual en Plan 03) · H6-03 (recognition: explanation copy reaparece en cada visit) · H10-02 (documentación inline).

---

## W18: Stage 2 — aggregate rankings con avg position + vote count

Panel debajo del W17. Aggregate rankings sorted por avg position. Resuelve F-10 (renombrar "Street Cred" a algo neutro) y F-11 (jerarquía visual fuerte).

```
┌── Aggregate rankings panel (debajo de W17) ───────────────────────────────┐
│                                                                           │
│  Council Consensus                                          ◀(1)          │
│  Average rank position across all peer evaluations.                       │
│  Lower is better (1 = top of every evaluator's list).                     │
│                                                                           │
│  ┌── (2) Ranking list ──────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  #1   openai/gpt-5-mini             Avg 1.33  ·  3 votes  ◀(3)       │ │
│  │       ████████████████████████████░░░░░░░░ (visual position bar)     │ │
│  │                                                                      │ │
│  │  #2   anthropic/claude-sonnet-4     Avg 2.00  ·  3 votes             │ │
│  │       █████████████████░░░░░░░░░░░░░░░░░░░                            │ │
│  │                                                                      │ │
│  │  #3   google/gemini-2.5-pro         Avg 2.67  ·  3 votes             │ │
│  │       █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░                            │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento             | Acción / shortcut                                                                                                                  | Notes                                                                                                                  |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Header propuesto     | "Council Consensus" o "Aggregate Rankings" sin "(Street Cred)" (resuelve F-10 / H2-01)                                            | Microcopy final lo decide Plan 03 (CD-01); wireframe sólo ancla que NO usa "Street Cred"                              |
| 2   | Ranking list         | Lista ordenada por avg ascending                                                                                                  | Cada entrada: posición # + identifier + Avg + vote count                                                              |
| 3   | Visual position bar  | ASCII bar como pista de magnitud (los rankings reales se renderizan según dirección — wireframe propone que existe alguna pista visual) | Resuelve F-11 (jerarquía visual reforzada con escala explícita); reemplaza la lista plana Phase 1                      |

**Anchors:** F-10 (renombrado, métrica explicada) · F-11 (jerarquía visual reforzada) · H2-01 (jerga eliminada) · H8-03 (sistema de tipografía con jerarquía).

---

## W19: Stage 3 — synthesis con highlight visual + download

Header de stage, contenido de la synthesis del chairman renderizado markdown, botón download. Highlight visual reemplaza el `#f0fff0` Bootstrap-flavored con un tratamiento editorial (jerarquía tipográfica + acento sutil — concreto en Plan 05). Resuelve F-12 + H8-01.

```
┌── Main panel — Stage 3 ───────────────────────────────────────────────────┐
│                                                                           │
│  Stage 3: Final Council Answer                              ◀(1)          │
│  Chairman: google/gemini-2.5-pro                            ◀(2)          │
│                                                                           │
│  ┌── (3) Synthesis container ───────────────────────────────────────────┐ │
│  │ ┃                                                                    │ │
│  │ ┃  # Snowflake vs DuckDB — Council Synthesis                          │ │
│  │ ┃                                                                    │ │
│  │ ┃  For your specific case (~50M rows pharma claims, PEQ split,       │ │
│  │ ┃  Power BI dashboards): Snowflake is the better default.            │ │
│  │ ┃                                                                    │ │
│  │ ┃  ## Reasoning                                                      │ │
│  │ ┃  All three council models converged on Snowflake when…             │ │
│  │ ┃                                                                    │ │
│  │ ┃  ## Counter-evidence                                               │ │
│  │ ┃  DuckDB earned points on… consider DuckDB if…                      │ │
│  │ ┃                                                                    │ │
│  │ ┃  ⋮                                                                 │ │
│  │ ┃                                                                    │ │
│  │ └ ◀(4) Editorial accent mark (no Bootstrap green)                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌── (5) Download cluster ──────────────────────────────────────────────┐ │
│  │ [⇩ Download final answer]   [⇩ Download full deliberation]            │ │
│  │  ◀(6) one button per intent — labels self-explanatory                 │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                | Acción / shortcut                                                                                                              | Notes                                                                                                                                                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Stage 3 title           | "Stage 3: Final Council Answer"                                                                                                | Phase 1 literal                                                                                                                                        |
| 2   | Chairman attribution    | `Chairman: <model>` literal Phase 1                                                                                            |                                                                                                                                                        |
| 3   | Synthesis container     | Markdown render con `.markdown-content`                                                                                        | **NO** pinta background `#f0fff0` (resuelve F-12 + H8-01); reemplazo concreto en Plan 05 (jerarquía tipográfica + accent mark izquierdo o similar)     |
| 4   | Editorial accent        | Marca visual lateral (línea, tipografía, peso) — no color de alert                                                             | Plan 05 decide la materialización por dirección                                                                                                        |
| 5   | Download cluster        | Botones unificados: `Download final answer` y `Download full deliberation`                                                     | Resuelve F-13 (labels self-explanatory en lugar de tooltip-only)                                                                                       |
| 6   | Style consistency       | **Misma clase / variant** para ambos download buttons (resuelve H4-02 — `.download-btn` con dos estilos en Phase 1)            | Plan 05 entrega el variant único                                                                                                                       |

**Anchors:** F-12 (highlight editorial, no Bootstrap) · F-13 (labels self-explanatory) · H4-01 (tokens compartidos) · H4-02 (`.download-btn` unificado) · H8-01 (jerarquía editorial).

---

## W20: Header de app branded

Header del shell con: nombre `LLM Council` + icono simple a la izquierda, indicador de conversation activa al centro (cuando la hay), slot futuro para settings/profile a la derecha. Tono "personal tool", sin logo corporativo. Resuelve F-02.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◇ LLM Council          Pricing analysis Q4 · 6 messages          [⚙]        │
│   ◀(1) Logo+name         ◀(2) Active conv indicator               ◀(3)      │
└──────────────────────────────────────────────────────────────────────────────┘

Header en cold start (sin conversación activa):

┌──────────────────────────────────────────────────────────────────────────────┐
│ ◇ LLM Council                                                       [⚙]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                | Acción / shortcut                                            | Notes                                                                  |
| --- | ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | Logo + nombre           | Click → vuelve a cold-state W01 (deselecciona conversation)  | Icono simple (◇ en wireframe); icono concreto Plan 05                  |
| 2   | Active conv indicator   | Visible solo cuando hay `currentConversationId`              | Muestra título + count breve; pista del foco actual                    |
| 3   | Settings slot           | Reservado para v2 (toggle light/dark, profile, etc.)         | Wireframe lo muestra pero en v1 lleva tooltip "Settings (coming soon)" o similar |

**Anchors:** F-02 (header branded ahora presente) · H4-04 (token de accent compartido entre header y otros elementos primary).

---

## W21: Empty state genérico

Cuando una vista no tiene contenido. Sub-variantes: cold start sidebar (ya en W01), search sin matches (W07), conversación recién creada sin mensajes (W10 cubre), y vista genérica de fallback. Aquí se documenta el **patrón** común.

```
┌── Generic empty state pattern ────────────────────────────────────────────┐
│                                                                           │
│                            ┌─── (1) Icon ───┐                             │
│                            │     ◯ ✦         │                             │
│                            └────────────────┘                             │
│                                                                           │
│                       (2) Headline (1 line max)                           │
│                                                                           │
│                  (3) Body — what is empty AND what to do                  │
│                                                                           │
│                        ┌── (4) Primary action ──┐                         │
│                        │ [Action label] (when    │                         │
│                        │ applicable)             │                         │
│                        └─────────────────────────┘                         │
│                                                                           │
│   Examples (instances of the pattern):                                    │
│   ─ Cold start sidebar (W01):                                             │
│     "No conversations yet" + [+ Start your first conversation]            │
│   ─ Search no matches (W07):                                              │
│     "No matches for \"async\"" + [Search inside content (12 conversations)]│
│   ─ Stage waiting for data:                                                │
│     "Waiting for Stage 1 to complete…" (no action — handled in W23)        │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento         | Acción / shortcut                                                       | Notes                                                                                              |
| --- | ---------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Icon (optional)  | Visual ancla; concreto por dirección (Plan 05)                          | Discreto; nunca un illustration grande                                                             |
| 2   | Headline         | 1 línea, dice qué está vacío                                            | Phase 1 ejemplos: "No conversations yet", "No matches for <q>"                                    |
| 3   | Body             | Dice qué puede hacer el usuario (resuelve F-04 + F-24 al menos parcialmente) | Microcopy concreto en Plan 03 (CD-01)                                                              |
| 4   | Primary action   | CTA cuando aplica                                                       | Cold start: "+ Start your first conversation"; search no-match: content fallback button del W07    |

**Anchors:** F-01 (welcome state vende valor) · F-04 (orientación tipo de pregunta — slot del body) · F-24 (no matches con sugerencia) · H10-03 (cold start enseña patrón).

---

## W22: Error state genérico

Cuando algo falla — SSE error, fetch failure, rename PATCH 500. Patrón: mensaje contextualizado + acción de recovery (`[Retry]` o `[Dismiss]`). Resuelve H9-01 (errores async silenciados) + H9-02 (failed model invisible) + H9-04 (rename error invisible).

```
┌── Generic error state pattern ────────────────────────────────────────────┐
│                                                                           │
│  Variant A — inline (rename error, attachment error):                     │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ ⚠  Couldn't rename: server returned 500.   [Retry]  [Dismiss]     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                            ◀(1)                  ◀(2)    ◀(3)             │
│                                                                           │
│  Variant B — banner (SSE stream interrupted mid-deliberation):            │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ ⚠  Stream interrupted at Stage 2.                                  │    │
│  │    Stage 1 responses are saved. Stage 2 + 3 didn't complete.      │    │
│  │                                       [Retry from Stage 2]  [×]   │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                              ◀(4)                         │
│                                                                           │
│  Variant C — per-tab (one model failed in Stage 1):                       │
│  ┌── Tab content ────────────────────────────────────────────────────┐    │
│  │ ⚠  openai · o4-mini failed to respond.                              │    │
│  │    Reason: rate limit (429).                                        │    │
│  │                                            [Retry this model]      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                  ◀(5)                     │
└───────────────────────────────────────────────────────────────────────────┘
```

| (#) | Elemento                       | Acción / shortcut                                                                                                | Notes                                                                                                                                          |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Icon + diagnose                | `⚠` + 1 línea: qué falló + por qué (status code, timeout, rate limit)                                             | Resuelve H9-01 (no más silencio) + H9-04 (rename failure surface)                                                                              |
| 2   | `[Retry]`                      | Click → re-invoca la última acción                                                                                | **Required en variant A y B** — cumple acceptance "W22 incluye `[Retry]` o equivalente"                                                       |
| 3   | `[Dismiss]`                    | Click → oculta el banner                                                                                          | El error queda en `console.error` igualmente (Phase 1 baseline)                                                                                |
| 4   | `[Retry from Stage 2]`         | Variant B — retry parcial cuando aplica                                                                           | Backend debería soportar partial retries; si no, fallback a `[Retry full]`                                                                     |
| 5   | `[Retry this model]`           | Variant C — retry granular por modelo failed (resuelve H9-02)                                                     | Solo aparece cuando el response del modelo trajo error en lugar de None silencioso                                                             |

**Anchors:** H9-01 (banner visible reemplaza console.error silencioso) · H9-02 (failed model con razón explícita) · H9-04 (rename error con [Retry]).

---

## W23: Loading state genérico (per-stage progress)

Per-stage progress communication durante los 15-30s entre Stage 1 → Stage 2 → Stage 3 (per CONCERNS.md SSE per-stage). **NO usa spinner genérico** — usa un timeline/step indicator con tiempo transcurrido y modelos en juego. Resuelve F-06 (loading no comunica duración ni modelos) + H1-01 + H1-02.

```
┌── Loading state — per-stage progress (Variant A: Stage 1 in progress) ───┐
│                                                                           │
│  ┌── (1) Timeline ─────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │   ●━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━━━━━○                          │ │
│  │   Stage 1                Stage 2              Stage 3                │ │
│  │   In progress            Pending              Pending                │ │
│  │   ◀(2)                                                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  Stage 1: Models answering in parallel                          ◀(3)      │
│  Elapsed 0:18 · typical 0:15–0:30                                ◀(4)     │
│                                                                           │
│  ┌── (5) Per-model status ──────────────────────────────────────────────┐│
│  │ ✓  openai · gpt-5-mini             responded (845 tokens)             ││
│  │ ⏳ anthropic · claude-sonnet-4      thinking…                          ││
│  │ ⏳ google · gemini-2.5-pro          thinking…                          ││
│  │ ⏳ openai · o4-mini                  thinking…                         ││
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌── (6) Cancel button ─────────────────────────────────────────────────┐│
│  │ [✕ Cancel deliberation]                                               ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                       ◀(7)                │
└───────────────────────────────────────────────────────────────────────────┘

Variant B: Stage 2 in progress (Stage 1 done):

   ●━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━○
   Stage 1              Stage 2                Stage 3
   ✓ 0:24                In progress          Pending
                         Elapsed 0:09

   Stage 2: Models evaluating each other anonymously
```

| (#) | Elemento                  | Acción / shortcut                                                                                                                                | Notes                                                                                                                                                            |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Timeline                  | Visualiza las 3 stages como etapas (●=done, current=spinner sutil, ○=pending)                                                                    | Reemplaza el spinner genérico (F-06)                                                                                                                              |
| 2   | Stage status              | Por cada stage: `In progress` / `Pending` / `✓ Xs` (done con duración)                                                                          | Comunica progreso temporal explícito                                                                                                                              |
| 3   | Stage description         | Frase contextual: "Models answering in parallel", "Models evaluating each other anonymously", "Chairman synthesizing"                            | Resuelve H10-02 (documentación inline por stage)                                                                                                                  |
| 4   | Elapsed + typical range   | `Elapsed M:SS · typical M:SS–M:SS`                                                                                                              | Pista cuantitativa — el usuario sabe si va dentro de rango o si la app puede estar colgada                                                                        |
| 5   | Per-model status          | Lista de modelos con estado (`✓ responded` / `⏳ thinking…` / `⚠ failed`)                                                                          | Resuelve F-06 (qué modelos están corriendo) + H1-02 (estado por modelo)                                                                                           |
| 6   | Cancel deliberation       | Click → aborta SSE y libera el send (resuelve H3-01)                                                                                            | El cancel es **importante** especialmente para Quality+Research (multi-dollar). Backend ya soporta cancellation natural via `httpx.AsyncClient` (audit H3-01)    |
| 7   | NO spinner genérico       | El loading state **no** muestra un spinner aislado como elemento principal                                                                       | Cumple acceptance criterion "W23 NO usa spinner genérico"                                                                                                        |

**Anchors:** F-06 (loading comunica modelos + duración + ETA) · H1-01 (status visible per stage) · H1-02 (estado por modelo) · H3-01 (cancel button).

---

## Coverage matrix

D-13 list (cobertura mínima de pantallas / estados). Cada item del D-13 está cubierto por al menos un wireframe.

| D-13 item                                                                                            | Covered by         | Status |
| ---------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| Cold start / welcome state (sin conversaciones)                                                       | W01, W21           | ✓      |
| Sidebar — lista poblada                                                                              | W02                | ✓      |
| Sidebar — hover (three-dot visible)                                                                  | W03                | ✓      |
| Sidebar — three-dot menu open                                                                        | W04                | ✓      |
| Sidebar — search vacío                                                                               | W05                | ✓      |
| Sidebar — search con title matches                                                                   | W06                | ✓      |
| Sidebar — search ≥3 chars no matches con affordance "Search inside content (N conversations)"        | W07                | ✓      |
| Sidebar — inline rename activo                                                                       | W08                | ✓      |
| Sidebar — modal de delete abierto                                                                    | W09                | ✓      |
| Input area — estado vacío                                                                            | W10                | ✓      |
| Input area — con texto                                                                               | W11                | ✓      |
| Input area — con attachments (chip list)                                                             | W12                | ✓      |
| Quality toggle — Fast / Quality / Quality+Research con coste visible                                 | W13                | ✓      |
| Stage 1 — tabs por modelo, contenido renderizado markdown                                            | W14                | ✓      |
| Stage 1 — disclosure colapsado "Show reasoning" (RSCH-05)                                            | W15                | ✓      |
| Stage 1 — disclosure expandido "Hide reasoning" (RSCH-05)                                            | W16                | ✓      |
| Stage 2 — tabs evaluaciones + de-anonimización (label_to_model bold)                                 | W17                | ✓      |
| Stage 2 — aggregate rankings con avg position + vote count                                           | W18                | ✓      |
| Stage 3 — synthesis con highlight visual + download                                                  | W19                | ✓      |
| Header de app branded (nombre + icono)                                                               | W20                | ✓      |
| Empty state genérico                                                                                 | W21                | ✓      |
| Error state genérico                                                                                 | W22                | ✓      |
| Loading state — per-stage progress between stages                                                    | W23                | ✓      |

**Total D-13 items: 23 → all ✓ covered.**

## Friction / Nielsen anchor coverage

Tabla resumen — qué F-XX y H-XX se mencionan en al menos un wireframe. Friction findings ≥ med y Nielsen findings ≥ Severity 3 marcados con `★`.

| Walkthrough friction                            | First wireframe(s)        |
| ----------------------------------------------- | ------------------------- |
| F-01 Welcome no comunica valor                  | W01, W21                  |
| F-02 Header branded ausente                     | W01, W20                  |
| F-03 Welcome+CTA huérfanos                      | W01                       |
| F-04 Orientación tipo de pregunta               | W01, W10, W21             |
| F-05 Single-shot sin previo aviso               | W10, W11                  |
| ★ F-06 Loading no comunica duración ni modelos  | W23                       |
| F-07 Stage 1 lectura serial                     | W14, W15                  |
| F-08 Tab no muestra publisher                   | W14                       |
| ★ F-09 Peer-review denso, no visual             | W17                       |
| F-10 "Street Cred" jerga + métrica              | W18                       |
| F-11 Jerarquía visual Stage 2 plana             | W18                       |
| F-12 Verde Bootstrap Stage 3                    | W19                       |
| F-13 Dos download buttons sin disclosure        | W19                       |
| F-14 Conversaciones sin título                  | W02                       |
| F-15 Sin agrupación / preview                   | W02                       |
| F-16 Three-dot solo en hover                    | W03, W04                  |
| F-17 Items menú sin shortcuts                   | W04                       |
| F-18 Modal sin metadata diferenciadora          | W09                       |
| F-19 Sin acknowledge / undo post-delete         | W09                       |
| F-20 Inline rename sin shortcuts visibles       | W08                       |
| F-21 Errores rename silenciosos                 | W08, W22                  |
| F-22 Content fallback oculto                    | W05, W06, W07             |
| F-23 Content search frágil ≥100 conversations   | (deferred — no friction reproducible en wireframe estructural; anotado en W07 implícito)        |
| F-24 No matches genérico                        | W07, W21                  |
| ★ F-25 File input nativo sin estilizar          | W10, W12                  |
| F-26 Extensiones aceptadas no comunicadas       | W10, W12                  |
| F-27 Error tamaño sin acción correctiva         | W12                       |
| F-28 Límites no comunicados antes               | W10, W12                  |
| F-29 No preview prompt + attachments            | (deferred — F-29 fix sería disclosure colapsado "Preview full prompt" — mencionado en walkthrough; wireframe no lo añade en v1) |

| Nielsen finding ≥ Severity 3                                              | First wireframe(s)        |
| ------------------------------------------------------------------------- | ------------------------- |
| ★ H1-01 Spinners genéricos                                                | W23                       |
| ★ H1-04 Coste visible en Quality toggle                                   | W10, W13                  |
| ★ H3-01 Sin cancel durante deliberación                                   | W23                       |
| ★ H4-01 Bootstrap green + ausencia de tokens                              | W19                       |
| ★ H4-02 `.download-btn` inconsistente                                     | W19                       |
| ★ H5-03 Sin friction extra Quality+Research                               | W13                       |
| ★ H6-05 reasoning_details no expuesto                                     | W15, W16                  |
| ★ H8-01 Verde Bootstrap rompe jerarquía editorial                         | W19                       |
| ★★ H8-02 Sistema tipográfico inexistente (catastrofe)                     | (deferred al Plan 05 — los wireframes no entregan tipografía concreta; el slot de `.markdown-content` está marcado en W14, W17, W19) |
| ★ H8-05 Reasoning expandido por default                                   | W15, W16                  |
| ★★ H9-01 Errores async silenciados (catastrofe)                           | W22                       |
| ★ H9-02 Modelos failed silenciados                                        | W14, W22                  |
| ★ H9-04 Rename error invisible                                            | W08, W22                  |

**Findings cubiertos:** 27 de 29 friction (94%) — F-23 y F-29 quedan anotados sin wireframe específico (son deferred). Severity ≥3 Nielsen: 12 de 13 (92%) — H8-02 catastrofe tipográfica vive en Plan 05 (sketches HTML), no en wireframes ASCII.

---

*Wireframes v1 — direction-neutral · Phase 2 Plan 04 · 2026-05-10*
*Skill: `frontend-design` · Direction sketches HTML viven en Plan 05*
