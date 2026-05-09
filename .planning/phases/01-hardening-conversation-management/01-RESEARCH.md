# Phase 1: Hardening & Conversation Management - Research

**Researched:** 2026-05-09
**Domain:** FastAPI path-parameter validation + React 19 a11y patterns (modal, hover menu, inline edit, debounced search)
**Confidence:** HIGH

## Summary

La fase es un slice vertical UI → API → storage cuyo riesgo técnico está concentrado en cinco superficies bien acotadas: (1) validación UUID en `storage.py:18` para cerrar Vuln 2, (2) un componente `<Modal>` reutilizable con focus-trap manual y manejo de ESC + click-outside, (3) un componente `<Menu>` que se revela en hover/right-click, (4) edición inline de título con resolución correcta de la carrera entre `Enter`/`blur`/`Escape`, y (5) un filtro client-side debounced sobre la lista de conversaciones ya cargada en `App.jsx`.

Ninguna de estas superficies requiere librerías nuevas. React 19 y FastAPI 0.121 tienen primitivas idiomáticas para todas. Los riesgos reales no son técnicos sino de **disciplina de implementación**: olvidar restaurar el foco al cerrar el modal, no eliminar el listener global en cleanup, dejar que `blur` borre el rename antes de que `Enter` lo confirme, y la trampa documental — `uuid.UUID(s)` en Python acepta cuatro formatos (con/sin guiones, mayúsculas, con llaves) y FastAPI con tipo `UUID` retorna **422, no 400** — lo que crea una fricción explícita con D-13/D-14 que el planner debe resolver.

**Primary recommendation:** Implementar la validación UUID **inline en `get_conversation_path` con `try uuid.UUID(...)` + `raise ValueError`**, capturado en cada handler de `main.py` y traducido a `HTTPException(400)`. Este patrón mantiene la regla "validación en la frontera de storage" (D-13) y produce el código de estado 400 exigido por SEC-01 sin tocar el manejador global de errores de Pydantic. Usar `Annotated[UUID, ...]` produciría 422 y obligaría a sobrescribir el handler global o a un patrón de doble validación — peor para este codebase de 5 endpoints.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Confirmation pattern for delete:**
- D-01: Delete usa modal in-app con título de la conversación entrecomillado, advertencia "This cannot be undone." y botones `[Cancel]` / `[Delete]`. Modal es reusable (Phase 3 lo reutilizará).
- D-02: Modal implementa focus-trap, ESC-to-cancel, click-outside-to-cancel, botón destructivo (`Delete`) visualmente distinto.
- D-03: Modal es **client-side only** — `DELETE /api/conversations/{id}` borra incondicionalmente; "confirmación" es UI gate, no API de dos pasos.

**Rename activation:**
- D-04: Cada item del sidebar expone menú `⋮` revelado en hover (patrón ChatGPT). Click en los puntos abre.
- D-05: Items v1: `[Rename]`, `[Delete]`. Componente reusable.
- D-06: Picking `Rename` convierte el título en input editable inline en la misma fila. Enter commits, Escape cancels, blur commits. Single-line.
- D-07: Right-click en un item abre el mismo menú.

**Search scope:**
- D-08: Search input arriba del sidebar, full-width.
- D-09: Filtro **progresivo**: por defecto filtra por título, case-insensitive substring, computado client-side, as-you-type.
- D-10: Cuando título-only devuelve 0 matches Y user ha tipeado ≥3 caracteres, aparece afordancia inline "Search inside content (N conversations)" — explícito, no automático.
- D-11: Content search carga full message bodies de todas las conversaciones lazy en frontend en primera activación; mantiene en memoria por sesión. ~50-500KB para 10-100 convs. Sin endpoint nuevo.

**Post-delete navigation:**
- D-12: Al borrar la conversación seleccionada, `currentConversationId = null` y vuelve al empty state existente. Sin auto-select, sin auto-create.

**UUID validation (Vuln 2 fix):**
- D-13: Validación vive en `backend/storage.py` en `get_conversation_path` — `uuid.UUID(conversation_id)` lanza `ValueError`. Función nunca produce path para id inválido.
- D-14: Handlers en `backend/main.py` capturan `ValueError` y devuelven `HTTPException(400, "Invalid conversation ID")`. Alternativa Pydantic `Annotated[UUID, ...]` — equivalente funcionalmente, planner elige según consistencia.
- D-15: Validación aplica a los cuatro endpoints existentes + `PATCH` y `DELETE` nuevos.

### Claude's Discretion

- CD-01: Patrón de implementación de validación UUID (inline vs Annotated) — planner elige según consistencia con `main.py`.
- CD-02: CSS placement de Modal y Menu — colocados en `Modal.jsx`+`.css` y `Menu.jsx`+`.css`.
- CD-03: Estilo de los nuevos componentes mantiene el tema Bootstrap actual (`#4a90e2`, `#f5f5f5`, etc.). Phase 4 reestiliza.
- CD-04: Refactor del Sidebar — planner decide si extrae sub-componentes o extiende in place.
- CD-05: Test coverage Out of Scope; un test ad-hoc aceptable si planner ve un área frágil (e.g., teclado de rename).

### Deferred Ideas (OUT OF SCOPE)

- Bulk delete / archive de múltiples conversaciones (`CONV-V2-01`).
- Tags / folders (`CONV-V2-02`).
- Export all conversations as zip (`CONV-V2-03`).
- Undo affordance (5s toast) post-delete — rechazado por modal explícito.
- Modal/Menu extraídos a librería compartida — prematuro con dos consumidores.
- Visual polish (palette, microinteractions, animations) — Phase 4.
- Right-click en sidebar vacío para "New conversation" menu.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | `conversation_id` validado como UUID antes de filesystem access; 400 en input inválido | §UUID Validation Patterns; comportamiento empírico de `uuid.UUID()`; tabla de tradeoffs Inline vs Annotated |
| CONV-01 | Delete con confirmación; `DELETE /api/conversations/{id}` y lista actualiza | §Modal A11y Patterns; §Backend Atomic File Ops; §PATCH/DELETE Conventions |
| CONV-02 | Rename inline; `PATCH /api/conversations/{id}` con `{title}` persistente | §Inline Edit UX; §PATCH/DELETE Conventions; §Race condition Enter/Blur/Escape |
| CONV-03 | Search at-the-top, case-insensitive, as-you-type, título y contenido opcional | §Progressive Search Patterns; §Debouncing in React 19; §Lazy Content Load Strategy |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UUID format validation | API / Backend (storage layer) | — | D-13: validación es invariante del módulo `storage`, no del transport |
| 400 error translation | API / Backend (`main.py` handlers) | — | Layered: storage lanza `ValueError`, handler la mapea a HTTP — sigue el patrón existente de 404 |
| File deletion | API / Backend (storage) | OS / FS | `os.remove` direct; sin coordinación entre nodos |
| Title persistence | API / Backend (storage) | — | Mismo patrón que `update_conversation_title` ya existente — solo expuesto a un endpoint público |
| Modal focus management | Browser / Client | — | A11y es contrato browser-side; backend no participa |
| Menu hover/right-click | Browser / Client | — | Pure UI state |
| Title-mode search filter | Browser / Client (memo over `conversations` list) | — | Lista ya está en estado React |
| Content-mode search load | Browser / Client (orchestrates fetches) | API / Backend (existing `GET /api/conversations/{id}`) | D-11: usa endpoint existente, lógica en frontend |
| Inline rename keyboard | Browser / Client | — | Race condition Enter/Blur/Escape es problema puro de event ordering en DOM |
| Empty-state restoration post-delete | Browser / Client (`App.jsx` state) | — | `ChatInterface.jsx:121-130` ya renderiza welcome cuando `conversation === null` — reutilizar |

**Sanity check:** Todas las nuevas capacidades de capa servidor están confinadas a `storage.py` (2 funciones nuevas + 1 modificada) y `main.py` (2 handlers nuevos + 4 modificados con validación). Ninguna capacidad cruza la frontera del transport. ✓

## Standard Stack

### Core (sin dependencias nuevas — todo el stack ya está en `pyproject.toml` y `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.121.3 (instalada) [VERIFIED: pyproject.toml + uv.lock] | DELETE/PATCH endpoints, validación path-param | Ya en uso; soporta `uuid.UUID` como tipo de path nativo desde 0.50+ [CITED: fastapi.tiangolo.com/tutorial/extra-data-types] |
| Pydantic | 2.12.4 (instalada) | Body schema para `PATCH` (`{title: str}`) | Ya en uso; `Field(min_length=1, max_length=200)` cubre validación de título |
| `uuid` (stdlib) | Python 3.10 | `uuid.UUID()` constructor en `get_conversation_path` | Stdlib; ya importado en `main.py:8` para `str(uuid.uuid4())` |
| React | 19.2.0 [VERIFIED: package.json] | Componentes Modal, Menu, Sidebar refactor | Ya en uso |
| ReactDOM `createPortal` | 19.2.0 (parte de react-dom) | Renderizar Modal fuera del árbol del Sidebar (z-index, overflow) | Idiomático y nativo; evita problemas con `overflow: hidden` del padre |

### Supporting (nada nuevo)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `setTimeout` / `clearTimeout` | nativo | Debounce del search input | 150-250ms es estándar para search as-you-type |
| `os.replace` (stdlib) | Python 3.10 | (No requerido para PATCH si seguimos el pattern existente) | Si planner decide hacer write-then-rename atómico para `update_conversation_title`, `os.replace` es Windows-safe |
| `os.remove` (stdlib) | Python 3.10 | DELETE de archivos JSON | Patrón directo, sin atomicidad necesaria (delete idempotente) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `try uuid.UUID(...)` + `ValueError` → 400 | `Annotated[UUID, Path(...)]` | **Annotated produce 422, no 400.** Para mapear a 400 hay que registrar un `RequestValidationError` handler global o usar `Annotated[str, Path(pattern=UUID_REGEX)]` (que SÍ produce 422 también). Ver §UUID Validation Patterns §Decision para detalle. **Recommendation: inline.** |
| `react-focus-lock` / `focus-trap-react` | Manual focus-trap en `useEffect` | CD-03 dice no añadir deps; el focus-trap "good enough" para un modal de 2 botones cabe en ~30 LOC. Si Phase 4 sube exigencias de a11y se puede migrar. |
| `lodash.debounce` | Manual `setTimeout` con `useRef` para timer | Ya no es necesario — sin lodash en el stack y un debounce en hook custom de 15 LOC sirve. |
| `useDeferredValue` (React 19) | Manual debounce | `useDeferredValue` es más idiomático React-19 pero su semántica es "no urgente" (re-render priority), no temporal — no permite controlar el delay. Para search as-you-type sobre 10-100 items, **manual debounce 200ms es predecible**, `useDeferredValue` es ortogonal. Pueden combinarse pero no es necesario. |
| `os.path.abspath(p).startswith(os.path.abspath(DATA_DIR))` (defense-in-depth) | Solo `uuid.UUID()` validation | El UUID-check sólo ya cierra Vuln 2 (un UUID válido no contiene `/`, `\`, ni `..`). Defense-in-depth es **opcional**; recomendado si sobra capacidad pero no requerido por SEC-01. Documentar en plan como "consider adding". |

**Installation:** Sin packages nuevos — ya verificado:
```bash
# Ningún cambio en pyproject.toml ni package.json
```

**Version verification:**
- `uv.lock` declara `fastapi==0.121.3`, `pydantic==2.12.4`, `httpx==0.28.1` (confirmadas en CLAUDE.md sección "Frameworks").
- `frontend/package.json` declara `react@^19.2.0`. Última versión publicada de React 19 es 19.2.0 (confirmada empíricamente en Context7 ID `/facebook/react` — versions: `v19_2_0`).
- No es necesario verificar registry npm/PyPI: las versiones del lockfile son las que se usarán; ninguna actualización procede en esta fase.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                          │
│                                                                     │
│  ┌────────────────────┐         ┌──────────────────────────────┐    │
│  │  App.jsx (state)   │◀────────│ Sidebar.jsx                  │    │
│  │                    │         │  ├─ <SearchInput debounced/> │    │
│  │  conversations[]   │         │  ├─ progressive content-load │    │
│  │  currentConvId     │         │  └─ ConversationItem         │    │
│  │  contentCache?     │         │       ├─ <Menu> (hover/RC)   │    │
│  │                    │         │       ├─ inline rename mode  │    │
│  │  handlers:         │         │       └─ on delete → modal   │    │
│  │   - rename         │         └──────────────────────────────┘    │
│  │   - delete         │                                              │
│  │   - select         │         ┌──────────────────────────────┐    │
│  │                    │────────▶│ <Modal> (createPortal)       │    │
│  └─────────┬──────────┘         │  ├─ focus trap               │    │
│            │                    │  ├─ ESC + click-outside      │    │
│            │ api.deleteConv     │  └─ restore focus on close   │    │
│            │ api.renameConv     └──────────────────────────────┘    │
│            ▼                                                        │
│  ┌────────────────────┐                                             │
│  │  api.js (fetch)    │                                             │
│  └─────────┬──────────┘                                             │
└────────────┼────────────────────────────────────────────────────────┘
             │
             │ HTTP DELETE/PATCH
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FastAPI (127.0.0.1:8001)                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ main.py — endpoint handlers                                │     │
│  │                                                            │     │
│  │   try:                                                     │     │
│  │     conv = storage.get_conversation(id)  ◀── may raise     │     │
│  │   except ValueError:        # invalid UUID → 400           │     │
│  │     raise HTTPException(400, "Invalid conversation ID")    │     │
│  │   if conv is None:          # not found  → 404             │     │
│  │     raise HTTPException(404, "Conversation not found")     │     │
│  │   ...                                                      │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │                                         │
│                           ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ storage.py                                                 │     │
│  │                                                            │     │
│  │   get_conversation_path(id):                               │     │
│  │     uuid.UUID(id)  ◀── ValueError on malformed             │     │
│  │     return os.path.join(DATA_DIR, f"{id}.json")            │     │
│  │                                                            │     │
│  │   delete_conversation(id):  os.remove(path)                │     │
│  │   update_conversation_title(id, title):  load+save         │     │
│  └────────────────────────┬───────────────────────────────────┘     │
│                           │                                         │
│                           ▼                                         │
│              data/conversations/{id}.json                           │
└─────────────────────────────────────────────────────────────────────┘
```

Flujo trazable:
1. Hover sobre item → CSS revela `⋮` → click → `<Menu>` abre como popover absoluto.
2. `Rename` → `Sidebar.jsx` cambia estado a `editingId` → row renderiza `<input>` autofocused con texto seleccionado.
3. Enter/blur → `api.renameConversation(id, newTitle)` → backend valida UUID en `storage.get_conversation_path` → carga JSON → muta `title` → guarda → 200 → frontend dispara `loadConversations()`.
4. `Delete` → `Sidebar.jsx` set `pendingDeleteId` → `<Modal>` se renderiza vía portal → user confirma → `api.deleteConversation(id)` → backend valida UUID → `os.remove` → 204 → frontend `loadConversations()` + si `id === currentConversationId` → `setCurrentConversationId(null)` → `ChatInterface.jsx` recibe `conversation=null` → renderiza welcome state existente (línea 121-130).

### Recommended Project Structure

```
backend/
├── storage.py        # +delete_conversation(), +update_conversation_title (ya existe), UUID validation en get_conversation_path
├── main.py           # +DELETE +PATCH endpoints, +UpdateTitleRequest model, +ValueError → 400 en handlers
└── ...

frontend/src/
├── App.jsx           # +handleDeleteConversation, +handleRenameConversation, +reset to null on self-delete
├── api.js            # +deleteConversation(id), +renameConversation(id, title)
├── components/
│   ├── Sidebar.jsx   # search input + per-item menu + inline rename + content cache
│   ├── Sidebar.css   # +search input, +menu trigger visibility on hover, +editable title
│   ├── Modal.jsx     # NEW — reusable, createPortal, focus trap, ESC, click-outside, restore focus
│   ├── Modal.css     # NEW — backdrop + dialog
│   ├── Menu.jsx      # NEW — hover/right-click popover, items prop, click-outside-to-close, ESC, arrow keys
│   └── Menu.css      # NEW — popover positioning
└── hooks/            # OPTIONAL — only if planner extracts useDebounce
```

### Pattern 1: UUID Validation at Storage Boundary (Inline approach)

**What:** Validar UUID al construir el filesystem path, lanzar `ValueError` desde storage, traducir a HTTP 400 en cada handler de `main.py`.

**When to use:** Cuando (a) hay un imperativo de status code específico (D-13 → 400, no 422), (b) el codebase ya usa el patrón "storage raises, main translates" — ver `add_user_message`/`add_assistant_message` que ya lanzan `ValueError("Conversation {id} not found")`, y (c) los endpoints son pocos (5).

**Example:**
```python
# backend/storage.py — modificación de get_conversation_path
import uuid

def get_conversation_path(conversation_id: str) -> str:
    """
    Get the file path for a conversation.

    Validates conversation_id is a well-formed UUID before constructing the path.
    Closes Vuln 2 (path traversal): without validation, "../../etc" or "..\..\evil"
    in conversation_id escapes the data directory.

    Raises:
        ValueError: If conversation_id is not a valid UUID string.
    """
    # uuid.UUID() raises ValueError on malformed input.
    # NOTE: Accepts hyphenated, non-hyphenated, mixed-case, and braced forms
    # (e.g., "{aabb...}", "AABB-...", "aabbccdd..."). All are safe vs path traversal
    # because none can contain "/", "\", or "..".
    uuid.UUID(conversation_id)
    return os.path.join(DATA_DIR, f"{conversation_id}.json")
```

```python
# backend/main.py — wrapping pattern in each handler
@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation
```

Source verification: el constructor `uuid.UUID(s)` lanzando `ValueError` está documentado en stdlib Python; el patrón `try/except ValueError → HTTPException(400)` no requiere import nuevo (HTTPException ya importado en `main.py:3`).

### Pattern 2: Reusable Modal with Focus Trap (vanilla React 19)

**What:** Componente que renderiza vía `createPortal`, captura ESC y click-outside, atrapa foco entre los elementos focusables del diálogo, y restaura el foco al elemento que disparó la apertura.

**When to use:** Cualquier diálogo bloqueante. D-02 lo exige.

**Example (referencia, planner adapta):**
```jsx
// frontend/src/components/Modal.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, initialFocusRef }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save trigger element so we can restore focus on close.
    previouslyFocused.current = document.activeElement;

    // Initial focus inside the dialog.
    const focusTarget =
      initialFocusRef?.current ||
      dialogRef.current?.querySelector(FOCUSABLE);
    focusTarget?.focus();

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(FOCUSABLE);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose, initialFocusRef]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    // Click only counts if it landed on the backdrop, not bubbled from inside.
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
```

**Critical pieces (a11y — non-negotiable):**
- `role="dialog" aria-modal="true"` — announces to screen readers as modal.
- `aria-labelledby="modal-title"` — modal title is the dialog name.
- ESC handler in `useEffect` (not on the dialog div) so it works even before user clicks inside.
- Cleanup function restores focus to `previouslyFocused.current` — required for keyboard users; without this, after closing the modal Tab focus jumps to `<body>`.
- `e.target === e.currentTarget` for click-outside avoids closing when clicking inside the dialog content (text selection, etc.).
- Tab cycling between first and last focusable — minimum viable focus trap. For the delete modal (Cancel + Delete), this is just two buttons.

Source: React 19 `createPortal` docs [CITED: react.dev/reference/react-dom/createPortal]. `addEventListener` + cleanup pattern [VERIFIED: Context7 fetch /reactjs/react.dev "useEffect global event listener"]. Focus trap implementation pattern is standard WAI-ARIA APG guidance.

### Pattern 3: Hover-revealed three-dot Menu

**What:** El icono `⋮` aparece solo al hacer hover sobre la fila (CSS) o cuando la fila tiene `:focus-within` (teclado). Click en `⋮` o right-click en la fila abre un popover con `<Menu>`.

**When to use:** D-04, D-07.

**Example structure:**
```jsx
// dentro de Sidebar.jsx — fragmento
<div
  className="conversation-item"
  onContextMenu={(e) => {
    e.preventDefault();
    setOpenMenuFor({ id: conv.id, x: e.clientX, y: e.clientY });
  }}
>
  <div className="conversation-title">{conv.title}</div>
  <button
    type="button"
    className="menu-trigger"  // ← visible only on .conversation-item:hover or :focus-within
    aria-label={`Actions for ${conv.title}`}
    onClick={(e) => {
      e.stopPropagation();  // don't also fire onSelectConversation
      const rect = e.currentTarget.getBoundingClientRect();
      setOpenMenuFor({ id: conv.id, x: rect.right, y: rect.bottom });
    }}
  >
    ⋮
  </button>
</div>

{openMenuFor && (
  <Menu
    x={openMenuFor.x}
    y={openMenuFor.y}
    onClose={() => setOpenMenuFor(null)}
    items={[
      { label: 'Rename', onClick: () => startRename(openMenuFor.id) },
      { label: 'Delete', onClick: () => requestDelete(openMenuFor.id), destructive: true },
    ]}
  />
)}
```

**CSS hover reveal:**
```css
/* Sidebar.css */
.conversation-item .menu-trigger {
  visibility: hidden;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
  color: #666;
  border-radius: 4px;
}
.conversation-item:hover .menu-trigger,
.conversation-item:focus-within .menu-trigger,
.conversation-item .menu-trigger[aria-expanded="true"] {
  visibility: visible;
}
.conversation-item .menu-trigger:hover {
  background: #e0e0e0;
}
```

**Menu close behavior (`Menu.jsx`):**
- Click outside (anywhere): close. Implementar como `useEffect` que añade `mousedown` listener al `document`, comprueba `!menuRef.current.contains(e.target)`, dispara `onClose()`. Limpiar en cleanup.
- ESC: `keydown` listener al `document`.
- Arrow keys (Up/Down): mover focus entre items. Standard WAI-ARIA menu pattern. **Opcional para v1** — si sale muy pesado de implementar, click + ESC ya cumple D-04/D-07; arrow-keys es enhancement.
- Restaurar foco al `⋮` que abrió, igual que el modal.

### Pattern 4: Inline Rename — Resolving Enter / Escape / Blur Race

**What:** El título se reemplaza por un `<input>` cuando `editingId === conv.id`. Enter commits, Escape cancels, blur commits — pero hay una race condition que el planner DEBE resolver.

**The race:** Si el usuario presiona Enter, el `onKeyDown` ejecuta el commit. Pero si Enter mueve el foco a otro lugar (no debería, pero algunos componentes podrían), `onBlur` también dispara y commitea por segunda vez. Más serio: si el usuario presiona Escape, el `onKeyDown` (que ejecuta cancel) puede ser seguido por un `onBlur` que ahora ve el valor original (porque cancelamos) o el valor tipeado (si el state aún no se ha actualizado), llevando a inconsistencias.

**Resolution — usar un flag de "intent":**
```jsx
function ConversationItem({ conv, isEditing, onCommitRename, onCancelRename }) {
  const [draftTitle, setDraftTitle] = useState(conv.title);
  const intentRef = useRef(null);  // 'commit' | 'cancel' | null
  const inputRef = useRef(null);

  // Autofocus + select all on mount of edit mode.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset draft when entering edit mode (in case title changed).
  useEffect(() => {
    if (isEditing) {
      setDraftTitle(conv.title);
      intentRef.current = null;
    }
  }, [isEditing, conv.title]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      intentRef.current = 'commit';
      e.target.blur();  // triggers onBlur which now sees intent='commit'
    } else if (e.key === 'Escape') {
      e.preventDefault();
      intentRef.current = 'cancel';
      e.target.blur();
    }
  };

  const handleBlur = () => {
    if (intentRef.current === 'cancel') {
      onCancelRename();
    } else {
      // Commit on blur (default) and commit on Enter (intent='commit'). Same outcome.
      const trimmed = draftTitle.trim();
      if (trimmed && trimmed !== conv.title) {
        onCommitRename(conv.id, trimmed);
      } else {
        onCancelRename();  // empty or unchanged → no PATCH call
      }
    }
    intentRef.current = null;
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="conversation-title-input"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }
  return <div className="conversation-title">{conv.title}</div>;
}
```

**Por qué este patrón:**
- Un solo path de exit (`handleBlur`) consume el intent — elimina la race entre keydown y blur. Enter setea intent y dispara blur sintéticamente; el handler de blur lee el intent y decide commit vs cancel. Sin el flag, Enter dispararía `onCommitRename` y luego `blur` dispararía otro commit redundante.
- `select()` en mount es la convención (rename mode debería permitir reescribir todo el título de inmediato — ChatGPT y Finder lo hacen así).
- Trim + check de "no change" evita PATCH innecesarias y rechaza títulos vacíos sin un error de UI explícito (consistente con la filosofía actual de `console.error` silente).

### Pattern 5: Progressive Search with Debounce

**What:** Input arriba del sidebar, filtra `conversations` (ya en estado) por título. Si hay 0 matches y query >= 3 chars, mostrar afordancia para extender al contenido.

**When to use:** D-08, D-09, D-10, D-11.

**Example:**
```jsx
// frontend/src/components/Sidebar.jsx — fragmento search
const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');
const [contentSearchActive, setContentSearchActive] = useState(false);
const [contentCache, setContentCache] = useState(null);  // Map<id, fullConversation>
const [isLoadingContent, setIsLoadingContent] = useState(false);

// Debounce: 200ms is the sweet spot for 10-100 items (no perceptible lag,
// no thrashing on every keystroke).
useEffect(() => {
  const t = setTimeout(() => setDebouncedQuery(searchQuery), 200);
  return () => clearTimeout(t);
}, [searchQuery]);

const titleMatches = useMemo(() => {
  if (!debouncedQuery) return conversations;
  const q = debouncedQuery.toLowerCase();
  return conversations.filter((c) =>
    (c.title || 'New Conversation').toLowerCase().includes(q)
  );
}, [conversations, debouncedQuery]);

const showContentFallback =
  debouncedQuery.length >= 3 && titleMatches.length === 0 && !contentSearchActive;

const filteredConversations = useMemo(() => {
  if (!contentSearchActive || !contentCache) return titleMatches;
  const q = debouncedQuery.toLowerCase();
  return conversations.filter((c) => {
    if ((c.title || '').toLowerCase().includes(q)) return true;
    const full = contentCache.get(c.id);
    if (!full) return false;
    return full.messages.some((m) => {
      if (m.role === 'user') return (m.content || '').toLowerCase().includes(q);
      // Assistant messages: search in stage3.response and stage1[*].response
      const s3 = m.stage3?.response?.toLowerCase() || '';
      if (s3.includes(q)) return true;
      return (m.stage1 || []).some((r) => (r.response || '').toLowerCase().includes(q));
    });
  });
}, [contentSearchActive, contentCache, conversations, titleMatches, debouncedQuery]);

const activateContentSearch = async () => {
  setIsLoadingContent(true);
  try {
    const fulls = await Promise.all(
      conversations.map((c) => api.getConversation(c.id))
    );
    const cache = new Map(fulls.map((c) => [c.id, c]));
    setContentCache(cache);
    setContentSearchActive(true);
  } catch (e) {
    console.error('Content search load failed:', e);
  } finally {
    setIsLoadingContent(false);
  }
};
```

**Performance characteristics:**
- 10-100 conversaciones, título-only filter: O(N) en cada render con `useMemo`. ~100µs sin debounce; con debounce de 200ms, totalmente imperceptible.
- Content cache: 100 conversaciones × ~5KB promedio = ~500KB en memoria. Confirmed por D-11 como aceptable.
- Sin virtualization needed para 10-100 items (Vite + React 19 maneja esto sin sweat). **Si la lista crece a 1000+ en el futuro**, planner debe considerar `react-virtual` — pero NO en v1.

### Anti-Patterns to Avoid

- **Click-outside listener attached to dialog element instead of document.** Se pierde si el target es un overlay del browser. Usar `document.addEventListener` + cleanup, no `onMouseDown` en un div.
- **Forgetting to remove the global keydown listener on cleanup.** Cada renderizado de Modal abierto añadirá un listener acumulado, causando que ESC cierre N modales o multiplique eventos.
- **Using `Annotated[UUID, ...]` and trying to convert 422 → 400 with a global exception handler.** Esto altera 422s legítimos de OTROS endpoints (e.g., un body inválido en POST `/api/conversations/{id}/message`). El inline pattern aísla el cambio.
- **Ignoring the IPv4/IPv6 asymmetry already documented in `CONCERNS.md`.** Phase 1 toca `api.js`; aprovechar para cambiar `http://localhost:8001` → `http://127.0.0.1:8001` mientras se está editando el archivo. **Mantenerlo consciente, pero NO bloqueante** — sólo si el planner ya está en `api.js`.
- **Persisting the search query to URL or localStorage.** Out of scope. La query debe ser efímera por sesión.
- **Auto-creating a new conversation after delete.** Explícitamente prohibido por D-12.
- **Confirming via `window.confirm()`.** No cumple D-02 (no focus trap, no aria-modal, no estilo destructivo del botón).
- **Using `defaultValue` on the rename input + `inputRef.current.value` to read.** Funciona pero rompe el patrón controlled-input del codebase (ver `ChatInterface.jsx:255-263`). Mantener controlled.
- **Calling `loadConversations()` and then immediately calling `loadConversation(id)` after rename without checking they're the same id.** Genera doble fetch y carrera. Si el rename es del current, basta con `loadConversations()` — el título mostrado en `Sidebar` se actualiza, el contenido del chat no depende del título.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID format checking | Regex hand-rolled | `uuid.UUID()` from stdlib | Acepta múltiples formatos válidos correctamente; rechaza todo lo que tenga `/`, `\`, `..`, espacios, longitud incorrecta. Hand-rolled regex casi siempre se queda corto en algún caso. |
| Modal portal placement | `position: fixed` div al fondo de `App.jsx` | `createPortal(node, document.body)` | Evita problemas con `overflow: hidden` o `transform` de ancestros que rompen `position: fixed`. Idiomático React. |
| Path traversal sanitization | `s.replace('..', '')` o similar | `uuid.UUID(s)` constructor | Negative-list sanitization es notoriamente frágil; UUID validation es positive-list (solo acepta el formato esperado). |
| Atomic JSON file write | `tempfile + os.rename` para `update_conversation_title` | Mantener el patrón existente `open + json.dump` | El codebase ya usa write-in-place en TODAS las funciones de storage; introducir atomicidad solo en una nueva función crea inconsistencia. Si una corrupción por crash fuera una preocupación real, sería para todas — out of scope para v1. |
| SSE buffering fix mientras se está en `api.js` | Refactor del SSE parser | Dejar el bug existente intacto en este phase | `CONCERNS.md` lista esto como issue conocido pero NO está en SEC-01/CONV-*. Mantener al planner enfocado. |

**Key insight:** El stack ya tiene todo lo necesario. La tentación es meter una librería de focus-trap o de comparación de strings — resistirla. El planner debe favorecer `useEffect + addEventListener` patterns y stdlib UUID over libraries.

## Common Pitfalls

### Pitfall 1: `Annotated[UUID, ...]` vs Inline — el shibboleth de status code

**What goes wrong:** El planner elige `Annotated[UUID, Path(...)]` esperando 400, pero FastAPI devuelve **422 Unprocessable Entity** con un body Pydantic. SEC-01 dice explícitamente "non-UUID4 id returns 400".

**Why it happens:** FastAPI delega TODA la validación de path/body params a Pydantic. Pydantic distingue `400 Bad Request` (problema sintáctico/protocolo HTTP) de `422 Unprocessable Entity` (problema semántico de schema). `uuid.UUID` no se parsea desde una string mal formada → semantic violation → 422 por diseño.

**How to avoid:** Adoptar el patrón **inline `try uuid.UUID + raise ValueError → HTTPException(400)`** que es lo que CD-01 deja a discreción del planner. Inline da control total del status code.

**Warning signs:**
- Cualquier mención de "Annotated[UUID]" + "400 status" en la misma frase del plan = contradicción.
- Si el planner propone `Annotated[UUID]`, debe también proponer un `RequestValidationError` handler global que distinga errores de path-UUID vs otros — esto introduce acoplamiento global por una mejora marginal de elegancia.

**Decision matrix:**

| Approach | Status code | LOC impact | Risk | Recommendation |
|----------|-------------|------------|------|----------------|
| **Inline `uuid.UUID(s)` in storage + try/except in main** | 400 ✓ | +3 LOC en storage, +2 LOC en cada handler (5 handlers = ~10 LOC) | Bajo — patrón ya existe (`add_user_message` lanza ValueError) | ✅ **Recommend** |
| `Annotated[UUID, Path(...)]` + custom `RequestValidationError` handler | 400 (con custom handler) | +1 LOC por handler, +15 LOC para custom handler | Medio — el custom handler afecta TODOS los endpoints | ❌ Rechazar |
| `Annotated[UUID, Path(...)]` sin custom handler | 422 ✗ | +1 LOC por handler | Alto — incumple SEC-01 | ❌ Rechazar |
| `Annotated[str, Path(pattern=UUID_REGEX)]` | 422 ✗ | +1 LOC por handler + regex | Alto — incumple SEC-01 | ❌ Rechazar |

### Pitfall 2: `uuid.UUID()` accepts non-canonical formats

**What goes wrong:** El planner asume que solo UUIDs hyphenated lowercase pasan validación. **Verificado empíricamente** que `uuid.UUID("aabbccddeeff11223344556677889900")` (sin guiones), `uuid.UUID("AABBCCDD-EEFF-1122-3344-556677889900")` (mayúsculas) y `uuid.UUID("{aabb...}")` (con llaves) **todos pasan**.

**Why it happens:** El constructor de stdlib normaliza todos esos formatos al formato canónico hyphenated lowercase para almacenamiento interno, pero NO rechaza la entrada.

**How to avoid:**
- **For SEC-01 (path traversal):** Esto es **suficiente** porque ninguna de las formas aceptadas contiene `/`, `\`, `.`, espacios, ni caracteres path-sensibles. La función va a `os.path.join(DATA_DIR, f"{conversation_id}.json")` con el string original — y todas las formas válidas son seguras.
- **For consistency:** El sistema actual genera IDs con `str(uuid.uuid4())` (`main.py:68`), siempre canonical. Los usuarios no escriben IDs a mano. Esto significa que en práctica solo veremos canonical IDs; los no-canonical son un caso teórico.
- **Recomendación**: **NO endurecer la validación a regex de canonical**. SEC-01 dice "non-UUID4 id returns 400" — y todas las formas que `uuid.UUID()` acepta SON UUIDs (parseables). Un input como `aabbccddeeff11223344556677889900` *es* un UUID válido en el sentido RFC 4122 — lo único es que está en una representación alternativa. No hay valor adicional rechazándolos.
- **Si el plan-checker insiste en rechazar non-canonical:** comparar `str(uuid.UUID(s)) == s.lower()` después del constructor. Esto rechaza versiones sin guiones y con llaves. **Documentar esto como una decisión explícita** si se adopta.

**Warning signs:** Tests del plan-checker que pasen IDs sin guiones esperando 400 sin que el plan los rechace explícitamente.

### Pitfall 3: SEC-01 también dice "UUID4" — el constructor acepta UUIDs v1/v3/v5

**What goes wrong:** El requirement SEC-01 especifica UUID**4**. `uuid.UUID(s)` acepta cualquier versión (v1 timestamp, v3/v5 hash-based, v4 random).

**Why it happens:** `uuid.UUID` es un parser sintáctico, no un validador semántico de versión.

**How to avoid:**
- En la práctica, dado que **el backend siempre genera con `uuid.uuid4()`**, ningún ID legítimo en el datastore será no-v4. Un attacker que pase un v1/v3/v5 válido sintácticamente pasaría la validación pero **no encontraría archivo** → 404. No hay path traversal porque el ID es UUID válido.
- **Recomendación pragmática**: **NO endurecer a UUID4 específico**. El espíritu de SEC-01 es "rechazar input no-UUID para cerrar path traversal". Cualquier UUID válido cumple ese espíritu. La granularidad versión-específica es teatro de seguridad.
- **Si el planner quiere ser estricto:** `parsed = uuid.UUID(s); if parsed.version != 4: raise ValueError(...)`. Documentar como decisión.

**Warning signs:** Tests que envían `00000000-0000-1000-8000-000000000000` (UUID v1) esperando 400.

### Pitfall 4: Modal click-outside fires on text-selection drag

**What goes wrong:** Usuario empieza a seleccionar texto dentro del modal con mousedown, suelta el mouse fuera del modal — `mousedown` listener interpreta como click outside y cierra. Pierde la selección y la app cierra el modal involuntariamente.

**Why it happens:** Se ata a `mousedown` o `click` en el backdrop sin distinguir drags.

**How to avoid:** Usar `onClick` en el backdrop (no `onMouseDown`) y comprobar `e.target === e.currentTarget`. `click` solo dispara si el `mousedown` y `mouseup` ocurrieron en el mismo elemento. Si el usuario empieza dentro y termina fuera, `click` se dispara en el ancestro común — usualmente NO el backdrop. El check `target === currentTarget` cierra el modal solo cuando ambos endpoints del click ocurrieron en el backdrop.

### Pitfall 5: `onContextMenu` no llama `preventDefault` → menú nativo del browser

**What goes wrong:** Right-click en una fila del sidebar abre el menú contextual del navegador en vez del custom Menu.

**How to avoid:** `onContextMenu={(e) => { e.preventDefault(); ... }}` — siempre.

### Pitfall 6: Search filter mata el currently-selected conversation

**What goes wrong:** User selecciona conversación A. Tipea search query que no matchea A. La conversación A desaparece de la lista pero `currentConversationId` sigue siendo A. ChatInterface sigue mostrándola pero el sidebar no la muestra como activa. Si user borra la query, A vuelve a aparecer — sin problema. Pero si user crea una nueva conversación, currentConversationId cambia a la nueva, y A se "pierde" de la UI hasta que la búsqueda se limpia.

**How to avoid (recommended UX):** **No hacer nada** — la conversación seleccionada NO debe deseleccionarse al filtrar. Es el comportamiento de Slack/Discord: la sala visible es independiente del filtro de la lista. ChatInterface sigue renderizando A correctamente (fetcheada desde backend, no dependiente del estado del Sidebar). Esto es **correcto** y debe ser confirmado por el plan, no "arreglado".

**Warning signs:** Plan que incluye "limpiar currentConversationId si no está en filtered list".

### Pitfall 7: Optimistic delete de la conversación seleccionada deja UI inconsistente

**What goes wrong:** User borra la conv actualmente seleccionada. Si el orden de operaciones es:
1. Set `currentConversationId = null`
2. Set `currentConversation = null` (vía useEffect en App.jsx:19-23)
3. Llamar `api.deleteConversation(id)`
4. Llamar `loadConversations()`

— está bien. Pero si el orden es:
1. Llamar `api.deleteConversation(id)` (await)
2. Llamar `loadConversations()` (await)
3. Set `currentConversationId = null`

— durante el await, ChatInterface intenta renderizar una conversation con id que ya no existe en la lista, y el `useEffect` que recarga la conversation puede recibir un 404/400 (porque el archivo está borrado) y el catch en `loadConversation` solo hace `console.error`, dejando `currentConversation` con el state stale.

**How to avoid:** **Setear `currentConversationId = null` ANTES del await del DELETE**. Esto causa que `currentConversation` se ponga en null vía useEffect existente, y que ChatInterface renderice el welcome state inmediatamente. El DELETE en background no necesita feedback (es idempotente; si falla, peor sería tener un fantasma en la lista — `loadConversations()` sincroniza al final).

**Recommended sequence:**
```jsx
const handleDeleteConversation = async (id) => {
  const wasSelected = id === currentConversationId;
  if (wasSelected) {
    setCurrentConversationId(null);
    setCurrentConversation(null);  // be explicit, don't rely on useEffect chain
  }
  try {
    await api.deleteConversation(id);
  } catch (e) {
    console.error('Delete failed:', e);
    // intentionally not restoring state — user wanted to delete
  }
  await loadConversations();
};
```

## Runtime State Inventory

> N/A — esta fase NO es un rename/refactor/migration. Es un feature add (delete, rename, search) + un fix de validación. Sin cambio en formatos de almacenamiento, sin renombrado de claves persistentes, sin variables de entorno nuevas.
>
> - **Stored data:** Sin cambio. Los archivos `data/conversations/*.json` mantienen el mismo schema (rename solo modifica el campo existente `title`).
> - **Live service config:** Ninguno.
> - **OS-registered state:** Ninguno.
> - **Secrets/env vars:** Ninguno (no se introduce ninguna nueva variable; `OPENROUTER_API_KEY` no se toca).
> - **Build artifacts:** Ninguno (no hay rename de packages, no hay rebuild de wheels/eggs).

## Code Examples

### UUID validation in storage layer

```python
# backend/storage.py
import uuid
import os
from .config import DATA_DIR


def get_conversation_path(conversation_id: str) -> str:
    """
    Get the file path for a conversation.

    Validates that conversation_id is a parseable UUID before constructing
    the path. This closes Vuln 2 (path traversal via "..\evil" or "../../etc"
    in conversation_id, see CONCERNS.md). The validation accepts any RFC 4122
    UUID variant (v1, v3, v4, v5) since the system's threat model is
    "input must not contain path separators or traversal sequences" — version
    enforcement is out of scope for SEC-01.

    Raises:
        ValueError: if conversation_id is not a parseable UUID.
    """
    uuid.UUID(conversation_id)  # raises ValueError if malformed
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def delete_conversation(conversation_id: str) -> None:
    """
    Delete a conversation file from storage.

    Args:
        conversation_id: Conversation identifier.

    Raises:
        ValueError: if conversation_id is not a valid UUID.
        FileNotFoundError: if the conversation file does not exist.
    """
    path = get_conversation_path(conversation_id)  # raises ValueError on bad uuid
    os.remove(path)  # raises FileNotFoundError if missing
```

### PATCH and DELETE handler pattern

```python
# backend/main.py
from fastapi import HTTPException
from pydantic import BaseModel, Field


class UpdateConversationRequest(BaseModel):
    """Request to update conversation metadata. Only `title` is editable in v1."""
    title: str = Field(..., min_length=1, max_length=200)


@app.patch("/api/conversations/{conversation_id}", response_model=ConversationMetadata)
async def patch_conversation(conversation_id: str, request: UpdateConversationRequest):
    """Update a conversation's metadata. Only `title` is supported in v1."""
    try:
        existing = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if existing is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    storage.update_conversation_title(conversation_id, request.title)

    return {
        "id": conversation_id,
        "created_at": existing["created_at"],
        "title": request.title,
        "message_count": len(existing["messages"]),
    }


@app.delete("/api/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    """Delete a conversation permanently. Idempotent on subsequent calls."""
    try:
        storage.delete_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # 204 No Content — no response body
    return None
```

### API client extensions

```javascript
// frontend/src/api.js — add to existing api object
async deleteConversation(conversationId) {
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}`,
    { method: 'DELETE' }
  );
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to delete conversation');
  }
},

async renameConversation(conversationId, title) {
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to rename conversation');
  }
  return response.json();
},
```

### Empty-state restoration on self-delete

```jsx
// frontend/src/App.jsx — within the App component
const handleDeleteConversation = async (id) => {
  const isCurrent = id === currentConversationId;
  if (isCurrent) {
    setCurrentConversationId(null);
    setCurrentConversation(null);
  }
  try {
    await api.deleteConversation(id);
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
  await loadConversations();
};

const handleRenameConversation = async (id, newTitle) => {
  try {
    await api.renameConversation(id, newTitle);
    await loadConversations();
  } catch (error) {
    console.error('Failed to rename conversation:', error);
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState` + manual setTimeout for debounce | `useDeferredValue` (React 18+) | React 18 (2022) | Para search-as-you-type sobre listas pequeñas (<1000 items), debounce manual sigue siendo más predecible. `useDeferredValue` es para evitar bloquear el render durante input — no aplica a 100 items que filtran en <1ms. **Manual debounce gana en este caso.** |
| `position: fixed` div en root | `createPortal` | React 16 (2017) | Estándar moderno. createPortal evita problemas de overflow/transform en ancestros. |
| `onKeyPress` | `onKeyDown` | React 17 deprecated `onKeyPress` | Usar `onKeyDown` para todos los handlers de teclado. |
| `event.keyCode` | `event.key` | Modern browsers | `e.key === 'Escape'` y `e.key === 'Enter'`, no `e.keyCode === 27` (deprecated). |
| Class components con `componentWillUnmount` cleanup | Hooks `useEffect` con return cleanup | React 16.8 (2019) | Codebase ya usa hooks únicamente — irrelevante pero confirmatorio. |

**Deprecated/outdated:**
- `findDOMNode` — deprecated en React 18+. No usar para acceder al DOM del modal; usar `useRef`.
- `legacy CSS focus management con tabindex global` — usar focus trap programático en `useEffect`.
- `aria-hidden="true"` en el resto de la app cuando hay un modal — innecesario con `aria-modal="true"` en el dialog y un backdrop sólido. Es un patrón antiguo; las screen readers modernas respetan `aria-modal`.

## Validation Architecture

> Per CD-05, test coverage es Out of Scope para esta phase. Si el planner identifica un área frágil, un test ad-hoc es aceptable.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Ninguno configurado actualmente |
| Config file | Ninguno |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

Dado que test coverage está explícitamente Out of Scope (CD-05), la "verificación" es manual por el usuario contra los Success Criteria del Roadmap (Phase 1):

| Req ID | Behavior | Test Type | Manual Check |
|--------|----------|-----------|--------------|
| SEC-01 | Non-UUID id en `/api/conversations/{id}` retorna 400 | manual-only | `curl http://127.0.0.1:8001/api/conversations/foobar` → 400 |
| SEC-01 | Path traversal `..\evil` retorna 400 | manual-only | `curl http://127.0.0.1:8001/api/conversations/..%5Cevil` → 400 |
| CONV-01 | Delete + confirm + lista actualiza | manual-only | UI: borrar conv, ver desaparecer + welcome state |
| CONV-02 | Rename inline + persiste | manual-only | UI: rename, refresh page, título persiste |
| CONV-03 | Search filtra as-you-type | manual-only | UI: tipear query, lista filtra |

### Sampling Rate
- N/A — no hay suite automatizada en este phase.

### Wave 0 Gaps
- **Si el planner decide añadir un test ad-hoc** para `Pattern 4: inline rename keyboard race`, sería el único test del phase. Sin necesidad de framework — un test puede ser una página HTML estática + un README "abrir en browser". El usuario explícitamente quiere mantener el posture sin test suite.
- **Recommendation**: NO añadir tests en esta phase. El verifier-phase del workflow GSD valida los success criteria por inspección manual.

## Security Domain

> CONCERNS.md `security_enforcement` no está explícitamente configurado. Asumido enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local-only, sin auth (PROJECT.md "no auth"); el threat model es "another process on the same machine" — Vuln 1 ya cerrado por bind a 127.0.0.1 |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user; no multi-tenant |
| V5 Input Validation | **yes** | UUID validation en `storage.get_conversation_path`; Pydantic `Field(min_length=1, max_length=200)` en `UpdateConversationRequest.title` |
| V6 Cryptography | no | Sin secrets manejados en este phase |
| V12 Files and Resources | **yes** | Path traversal via `conversation_id` — Vuln 2, cerrado por SEC-01 |

### Known Threat Patterns for {FastAPI + Python stdlib}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal en `conversation_id` (Vuln 2) | Tampering, Information Disclosure | UUID validation antes de `os.path.join` (SEC-01) |
| Title injection con XSS payload | Tampering | React 19 escapa por defecto; `Markdown` no se aplica a títulos del sidebar (solo a contenido de mensaje). El título se renderiza como `{conv.title}` que React escapa automáticamente. ✓ Sin acción adicional. |
| Title con tamaño masivo agotando memoria | DoS | `Field(max_length=200)` en `UpdateConversationRequest.title` |
| `os.remove` race condition con DELETE concurrente | TOCTOU | Single-user app, sin concurrencia esperada. `FileNotFoundError` → 404 cubre el caso. No mitigation adicional. |
| Body de PATCH sin Content-Type | Tampering | FastAPI por defecto requiere `application/json` para body Pydantic; CORS preflight cubre este caso para el frontend. |
| CORS bypass con origen no listado | Tampering | `main.py:18-24` solo permite localhost:5173 y localhost:3000. Sin cambio. |

### Defense-in-Depth (Optional)

Más allá de SEC-01:
- **Path-prefix assertion (opcional, recomendable):** Tras `os.path.join`, asserting `os.path.abspath(path).startswith(os.path.abspath(DATA_DIR))`. Redundante con UUID validation (un UUID válido nunca produce path fuera) pero suma una capa. Si el planner ve capacity de scope, está justificado; si no, se omite — UUID validation es suficiente.
- **Atomic write para title rename:** El patrón existente abre y reescribe en place. En caso de crash mid-write, el archivo queda corrupto. Para v1 no se aborda; out of scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | El planner aceptará la recomendación inline UUID validation por encima de Annotated | Pitfall 1 | Bajo — el riesgo se documenta y se deja a discreción (CD-01); si el planner elige Annotated, debe añadir custom handler global |
| A2 | El usuario está OK con que `uuid.UUID()` acepte formatos no canonical (sin guiones, mayúsculas, con llaves) | Pitfall 2 | Bajo — el sistema solo genera canonical, así que esto es un caso teórico. El plan-checker podría flagearlo; planner debe documentar la decisión |
| A3 | El usuario está OK con que UUID v1/v3/v5 también pasen validación (no solo v4) | Pitfall 3 | Bajo — mismo caso que A2; teórico |
| A4 | 200ms es el debounce correcto para search-as-you-type sobre 10-100 items | Pattern 5 | Muy bajo — es un valor estándar; ajustable |
| A5 | El usuario NO quiere arrow-key navigation en el Menu (solo click + ESC) | Pattern 3 | Medio — D-04 dice "menu opens with click on the dots" pero no especifica navegación interna. Si el planner agrega arrow keys, es enhancement |
| A6 | Mantener el patrón actual de `console.error` en frontend para errores de DELETE/PATCH (sin toast) es aceptable en v1 | Code Examples | Bajo — está alineado con CD-03 (Phase 4 polish) y con el patrón existente en `App.jsx:30, 39, 51, 165, 174` |
| A7 | No se introducen tests automatizados | Validation Architecture | Muy bajo — explícitamente OOS por CD-05 |
| A8 | La IPv4/IPv6 asymmetry de `api.js` no se aborda en este phase | Anti-Patterns | Bajo — es issue conocido pero no en SEC-01/CONV-*; mencionar al planner como "consider while editing" pero no bloqueante |

**No empty:** todas son `[ASSUMED]` con baja-media incidencia. Ninguna requiere user confirmation antes del plan; sí se recomienda que el planner explicite estas en su PLAN.md como decisiones tomadas.

## Open Questions

1. **Plan-checker postura sobre UUID non-canonical / non-v4 input.**
   - Lo que sabemos: SEC-01 dice "non-UUID4 id returns 400". `uuid.UUID()` acepta v1/v3/v5 y formatos no-canonical.
   - Lo que es unclear: Si el plan-checker interpreta "UUID4" como "any UUID" (permisivo) o como "specifically v4" (estricto).
   - Recomendación: Planner debe ser explícito en el PLAN sobre qué versión de validación adopta. La permisiva es más simple y cumple el espíritu (cerrar path traversal). La estricta requiere `parsed.version == 4` adicional.

2. **Menu — arrow key navigation entre items.**
   - Lo que sabemos: D-04 cubre click + right-click. WAI-ARIA APG recomienda arrow keys.
   - Lo que es unclear: Cuánto invertir en a11y de teclado en v1.
   - Recomendación: Implementar Tab para entrar al menú, ESC para cerrar, click para seleccionar. Arrow keys es nice-to-have, no blocking.

3. **Rename: ¿qué pasa si el usuario renombra a un título idéntico al de otra conversación?**
   - Lo que sabemos: REQUIREMENTS.md no exige unicidad de título.
   - Lo que es unclear: Si dos conversaciones con el mismo título es UX aceptable.
   - Recomendación: **No enforce uniqueness** — IDs son los discriminadores. Permitir duplicados de título igual que en GitHub branches o ChatGPT.

4. **Search: ¿debe persistir entre selecciones de conversación?**
   - Lo que sabemos: D-09 dice "as the user types".
   - Lo que es unclear: Si seleccionar una conversación limpia el query.
   - Recomendación: **No limpiar** — al estilo de Slack. El query persiste hasta que el usuario lo borra explícitamente o lanza un `/gsd-new-conversation`. Permite ir comparando varios resultados sin retipear.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python `uuid` (stdlib) | UUID validation | ✓ | Python 3.10 | — |
| Python `os` (stdlib) | `os.remove`, `os.path.join` | ✓ | Python 3.10 | — |
| FastAPI | DELETE/PATCH endpoints | ✓ | 0.121.3 | — |
| Pydantic | `UpdateConversationRequest` | ✓ | 2.12.4 | — |
| React 19 | UI components | ✓ | 19.2.0 | — |
| `react-dom/createPortal` | Modal portal | ✓ | 19.2.0 | — |
| `uv` | Backend run | ✓ | (whatever installed) | — |
| `npm` | Frontend dev | ✓ | 7+ | — |

**Missing dependencies with no fallback:** Ninguna.

**Missing dependencies with fallback:** Ninguna.

Esta phase no introduce ninguna dependencia externa. Toda la implementación cabe en stdlib Python + bibliotecas ya en el lockfile.

## Sources

### Primary (HIGH confidence)
- Context7 `/fastapi/fastapi` v0.122.0 docs — UUID path parameter handling (extra data types tutorial). Confirmó que `item_id: UUID` retorna 422 en input inválido.
- Context7 `/websites/fastapi_tiangolo` — RequestValidationError handling, custom exception handlers. Confirmó workaround si se usa Annotated.
- Context7 `/reactjs/react.dev` v19.2.0 — useEffect global event listener cleanup pattern; useRef autofocus pattern. Confirmados verbatim.
- `backend/storage.py` (read in this session) — current code, line 18 vulnerability location.
- `backend/main.py` (read in this session) — current handler patterns at lines 73-79, 82-123, error patterns.
- `frontend/src/components/Sidebar.jsx` (read in this session) — current 43-LOC structure to refactor.
- `frontend/src/App.jsx` (read in this session) — state ownership and `loadConversations()` invalidation chain.
- `frontend/src/components/ChatInterface.jsx` lines 121-130 (read in this session) — existing welcome empty-state to reuse on self-delete.
- `frontend/src/components/Sidebar.css` (read in this session) — current styling palette (#4a90e2, #f8f8f8, etc.) for CD-03 alignment.
- `.planning/codebase/CONCERNS.md` — Vuln 2 details, IPv4/IPv6 asymmetry note.
- `.planning/codebase/CONVENTIONS.md` — coding conventions (relative imports, snake_case, etc.).
- Empirical verification of `uuid.UUID()` behavior: `python3 -c "import uuid; print(uuid.UUID('AABBCCDDEEFF11223344556677889900'))"` accepted and normalized.

### Secondary (MEDIUM confidence)
- WAI-ARIA Authoring Practices for dialog and menu patterns (training data, not re-fetched). The patterns shown for focus trap and menu keyboard navigation are standard guidance from this source.

### Tertiary (LOW confidence)
- None. All architectural claims sourced from primary sources or codebase reads.

## Project Constraints (from CLAUDE.md)

Extraídos del CLAUDE.md raíz del proyecto + global:

- **GSD Workflow Enforcement** (project): Toda edición debe pasar por un comando GSD; en este phase, `/gsd-execute-phase`. Sin acción para research, pero el plan debe respetarlo.
- **Imports relativos en backend** (project + CONVENTIONS.md): `from .config import ...`. Nuevo código en `storage.py` y `main.py` debe usarlos.
- **No tests** (project posture): "No automated test suite — accepted milestone debt". Reforzado por CD-05.
- **No estructured logging** (CONCERNS.md): No introducir logger en este phase. `print()` only para errores.
- **CORS hardcoded a localhost:5173 + 3000** (`backend/main.py:18-24`): No tocar. Las nuevas endpoints heredan automáticamente.
- **Backend puerto 8001** (no 8000): Ya respetado.
- **Backend bind a 127.0.0.1** (Vuln 1 fix): Ya respetado.
- **Frontend ESLint con `varsIgnorePattern: '^[A-Z_]'`**: Constantes module-level pueden estar sin uso (ya respetado en patterns).
- **Markdown wrapped en `<div className="markdown-content">`**: No aplica a este phase (no se renderiza markdown en Sidebar/Modal/Menu).
- **Componentes con CSS co-located**: Modal.jsx + Modal.css, Menu.jsx + Menu.css. Ya cubierto en CD-02.
- **kebab-case CSS classes**: Aplicar a nuevas clases.
- **PascalCase para component filenames matching default export**: `Modal.jsx`, `Menu.jsx`. Ya planeado.
- **Función handlers prefixed con `handle`**: `handleDeleteConversation`, `handleRenameConversation`. Patrón a seguir.

**El planner debe verificar que el PLAN.md no contradiga ninguna de estas directivas. Especial atención a:**
- No introducir `pytest` ni framework de tests aunque parezca tentador para Pattern 4.
- No añadir packages al `package.json` o `pyproject.toml`.
- Mantener `console.error` para errores de fetch en frontend; sin toast/UI surface (CD-03 + CONVENTIONS.md error handling).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas las versiones verificadas en lockfiles y Context7.
- Architecture: HIGH — patrones idiomáticos verificados con Context7 React 19.2.0 y FastAPI 0.122.0; codebase patterns inspeccionados directamente.
- Pitfalls: HIGH — Pitfall 1 (status code 400 vs 422) verificado empíricamente vía docs; Pitfall 2 y 3 (formato UUID) verificados ejecutando Python; Pitfall 4 (click-outside drag) y 5 (right-click) son comportamientos browser estándar; Pitfall 7 verificado contra el flujo en `App.jsx`.
- Security: HIGH — Vuln 2 ya documentado en CONCERNS.md; control mitigation alineado con SEC-01 sin gaps.

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (estimación 30 días — el stack es estable, FastAPI y React 19 no esperan breaking changes en path-param/createPortal en ese horizonte).
