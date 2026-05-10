# Phase 1: Hardening & Conversation Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 1-Hardening & Conversation Management
**Areas discussed:** Confirmation pattern for delete, Rename activation, Search scope, Post-delete navigation

---

## Confirmation pattern for delete

| Option | Description | Selected |
|--------|-------------|----------|
| Modal in-app | Modal custom con título de la conversación y botones [Cancel]/[Delete]. Componente reutilizable. ~50 LoC nuevas (Modal + focus trap + ESC + click-outside). | ✓ |
| Native browser confirm() | Cero código nuevo: `window.confirm()` antes del DELETE. Funciona pero rompe el look-and-feel custom; bloquea el JS thread. Aceptable para v1, sustituible después. | |
| Inline 'are you sure' replacement | Al pulsar borrar, el botón se transforma en '¿Seguro? Sí/No' durante 3s. Sin overlay ni focus trap. Menos código que modal pero requiere más state local. | |
| Sin confirm + undo toast 5s | Borrar inmediatamente, mostrar toast 'Deleted. Undo' que persiste 5s. Mejor UX (cero fricción) pero requiere código de undo en backend o frontend. | |

**User's choice:** Modal in-app
**Notes:** El usuario aprobó el preview ASCII del modal. Componente Modal será reutilizable en Phase 3 (cost estimation prompt) y Phase 4 (otros confirms).

---

## Rename activation

| Option | Description | Selected |
|--------|-------------|----------|
| Double-click sobre el título | Click simple sigue seleccionando la conversación, double-click la entra en modo edit. Sin colisión. Convención consolidada (Finder, VSCode tabs). 0 UI nueva visible. | |
| Botón lápiz al hover | Icono ✏️ visible solo al hacer hover sobre el item del sidebar; click en el lápiz entra a rename. Más descubrible pero añade chrome visual. | |
| Menú contextual (three-dots o right-click) | Botón ⋮ al hover → menú con [Rename] [Delete]. Patrón ChatGPT. Permite agrupar acciones futuras. Más código (Menu component + accessibility) pero escalable. | ✓ |

**User's choice:** Menú contextual (three-dots o right-click)
**Notes:** Consecuencia: introduce un componente Menu reutilizable. Capturado como D-04..D-07 en CONTEXT.md. Right-click sobre item activa el mismo menú (cheap once Menu component exists; standard convention).

---

## Search scope

| Option | Description | Selected |
|--------|-------------|----------|
| Solo título | Filtrar la lista por match en el título. Client-side puro, ya tenemos los títulos cargados. Cero código backend nuevo. Suficiente para >90% de casos en uso personal. | |
| Título + contenido completo | Carga lazy del contenido completo de cada conversación para indexar. Más útil cuando recuerdas un detalle pero no el título. Requiere endpoint backend nuevo o cargar todos los JSON al frontend al arrancar (~50-500KB total, viable). | |
| Título primero + fallback a contenido si no matchea | Progressive: filtra primero por título, si no hay matches o el usuario pulsa 'Search inside content', dispara búsqueda en contenido. Mejor de los dos mundos pero más estado/UI. | ✓ |

**User's choice:** Título primero + fallback a contenido si no matchea
**Notes:** El fallback se decidió **explícito, no automático** en CONTEXT.md (D-10): aparece un afordance "Search inside content (N conversations)" cuando el filtro de título devuelve cero resultados Y el usuario ha tecleado ≥3 caracteres. Esto evita disparar el load lazy del contenido sin que el usuario lo sepa.

---

## Post-delete navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Volver al empty state 'Welcome' | Tras delete, currentConversationId = null. Se muestra el bloque 'Welcome to LLM Council / Create a new conversation'. Sin asunciones, claro, ya existe el componente. | ✓ |
| Auto-seleccionar la conversación anterior (más vieja) | currentConversationId pasa a la conv inmediatamente más antigua. Mantiene contexto de navegación. Patrón Claude.ai. | |
| Auto-seleccionar la conversación siguiente (más reciente) | currentConversationId pasa a la conv más reciente. Patrón ChatGPT. | |
| Crear automáticamente una nueva conversación | Tras delete, dispara handleNewConversation() automáticamente. Pro-activo pero genera 'New Conversation' vacía en sidebar. | |

**User's choice:** Volver al empty state 'Welcome'
**Notes:** Aprovecha el empty state que ya existe en `ChatInterface.jsx:40-49`. Sin lógica nueva de "elegir la siguiente". Comportamiento más predecible y honesto.

---

## Claude's Discretion

Decisions left to the planner (or to implementation taste, captured as CD-01..CD-05 in CONTEXT.md):

- **CD-01:** UUID validation pattern in FastAPI (early-return inline vs Pydantic `Annotated[UUID, ...]` dependency).
- **CD-02:** CSS placement of new Modal/Menu components (co-located following existing convention).
- **CD-03:** Styling of new components matches **current** Bootstrap-flavored theme; Phase 4 will restyle later.
- **CD-04:** Sidebar refactor scope — extend in place vs split into sub-components.
- **CD-05:** Test coverage for fragile areas optional, no suite required.

## Deferred Ideas

Captured but not in scope for Phase 1 (see CONTEXT.md `<deferred>` section):

- Bulk delete / archive (CONV-V2-01).
- Tags or folders for organizing conversations (CONV-V2-02).
- Export all conversations as zip (CONV-V2-03).
- Undo affordance after delete (rejected in favor of modal — could revisit in v2 if friction high).
- Extracting Modal/Menu into shared component library (premature with two consumers).
- Visual polish of new components (palette, animations) → Phase 4.
- Right-click in empty sidebar area to open "New conversation" menu (out of scope).
