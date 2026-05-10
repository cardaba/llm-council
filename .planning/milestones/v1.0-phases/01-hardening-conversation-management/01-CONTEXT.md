# Phase 1: Hardening & Conversation Management - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

User can manage conversations from the sidebar (delete, rename, search) on a storage layer that rejects malformed conversation IDs at the boundary. Closes Vuln 2 (path traversal in `backend/storage.py:18`) before extending storage with new lifecycle endpoints, so the new endpoints inherit the validation rather than retrofitting it later.

**Requirements covered:** SEC-01, CONV-01, CONV-02, CONV-03 (4 of 21 v1 total).

**In scope:**
- UUID validation on `conversation_id` for every storage-touching endpoint (`GET`, `POST`, `PATCH`, `DELETE`).
- Modal-based delete flow with confirmation.
- Hover-revealed three-dot menu with Rename + Delete actions on each sidebar item.
- Inline rename UX after picking Rename from the menu.
- Progressive search input at the top of the sidebar (title-first, content-fallback).
- Empty-state restoration after deleting the currently-selected conversation.

**Out of scope (this phase):**
- Quality dial selector (Phase 3).
- Visual identity rework (Phase 4) — Phase 1 ships with the current Bootstrap-flavored styling; Phase 4 restyles the new components.
- Bulk operations / archive / tags (deferred to v2 per REQUIREMENTS.md).
- Persisting `label_to_model` and `aggregate_rankings` metadata (PERS-V2-01, deferred).

</domain>

<decisions>
## Implementation Decisions

### Confirmation pattern for delete

- **D-01:** Delete uses an in-app modal with the conversation title quoted, a brief warning ("This cannot be undone."), and `[Cancel]` / `[Delete]` buttons. Modal is a reusable component (will also be used in Phase 3 for cost-estimation prompts and similar).
- **D-02:** Modal must implement focus-trap, ESC-to-cancel, click-outside-to-cancel, and the destructive button (`Delete`) styled visually distinct from `Cancel`.
- **D-03:** Modal is **client-side only** — the backend `DELETE /api/conversations/{id}` performs the file removal unconditionally; "confirmation" is purely a UI gate, not a two-step API.

### Rename activation

- **D-04:** Each sidebar item exposes a hover-revealed three-dot menu (`⋮`) — pattern equivalent to ChatGPT's sidebar. Menu opens with click on the dots.
- **D-05:** Menu items for v1: `[Rename]`, `[Delete]`. Menu component is reusable so Phase 3 / Phase 4 can extend it (e.g., add `[Export]`, `[Pin]`) without redesign.
- **D-06:** Picking `Rename` from the menu turns the title into an inline editable input within the same sidebar row. Enter commits, Escape cancels, blur commits. Single-line only (titles are short).
- **D-07:** Right-click on a sidebar item opens the same menu (cheap to add since the menu component already exists; standard convention; useful for keyboard-light flows).

### Search scope

- **D-08:** Search input is rendered at the top of the sidebar, above the conversation list, full-width.
- **D-09:** Filter is **progressive**: by default it filters by conversation title, case-insensitive substring match, computed client-side from data already loaded. As-you-type.
- **D-10:** When the title-only filter returns zero matches AND the user has typed ≥3 characters, an inline affordance appears below the input — "Search inside content (N conversations)" — that the user can click to trigger a content search. The fallback is **explicit, not automatic**, so the user always knows when an expensive operation is running.
- **D-11:** Content search loads the full message bodies of all conversations into the frontend on first activation (lazily, after the affordance is clicked) and keeps them in memory for the rest of the session. For ~10-100 conversations this is ~50-500KB total — viable client-side. No new backend endpoint required (existing `GET /api/conversations/{id}` is sufficient).

### Post-delete navigation

- **D-12:** When the user deletes the currently-selected conversation, `currentConversationId` becomes `null` and the chat pane returns to the existing empty state ("Welcome to LLM Council / Create a new conversation"). No auto-selection of adjacent items, no auto-creation of a new conversation.

### UUID validation (Vuln 2 fix)

- **D-13:** Validation lives at the storage boundary in `backend/storage.py` — `get_conversation_path` calls `uuid.UUID(conversation_id)` which raises `ValueError` for malformed input. The function never produces a path for an invalid ID.
- **D-14:** Endpoint handlers in `backend/main.py` catch `ValueError` from storage calls and return `HTTPException(status_code=400, detail="Invalid conversation ID")`. Alternative considered: FastAPI Pydantic `Annotated[UUID, ...]` path-param coercion — equivalent functionally but the planner picks the implementation pattern based on consistency with existing handlers.
- **D-15:** Validation applies to all four endpoints: `GET /api/conversations/{id}`, `POST /api/conversations/{id}/message`, `POST /api/conversations/{id}/message/stream`, plus the two new ones (`PATCH /api/conversations/{id}`, `DELETE /api/conversations/{id}`).

### Claude's Discretion

- **CD-01:** Implementation pattern for UUID validation (early-return inline vs Pydantic dependency) — planner decides based on consistency with existing FastAPI handler conventions in `backend/main.py`.
- **CD-02:** CSS placement of the new `Modal` and `Menu` components — co-located in `frontend/src/components/Modal.jsx`+`.css` and `Menu.jsx`+`.css`, following the existing pattern (each component has a sibling CSS file, see `Stage1.jsx`/`Stage1.css`).
- **CD-03:** Styling of the new components matches the **current** Bootstrap-flavored theme (`#4a90e2`, `#f5f5f5`, etc.) — Phase 4 will restyle everything based on Phase 2 mockups, so don't invest in custom palette here. Functional, neutral, consistent with the rest of the current UI.
- **CD-04:** Sidebar refactor to accommodate the search input + per-item menu — planner decides whether the existing `Sidebar.jsx` is restructured (new sub-components) or extended in place. The current implementation has all logic in one file (~45 lines); some extraction is justifiable for testability but not required.
- **CD-05:** Test coverage for this phase — Out of Scope per project posture, but if the planner sees a particularly fragile area (e.g., the inline-rename keyboard handling), a single ad-hoc test is acceptable. No suite required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Project context, Active hypothesis (CONV-01..03 + SEC-01), Out of Scope, Constraints. Note Vuln 1 fix already in `backend/main.py:199`.
- `.planning/REQUIREMENTS.md` §v1.Security and §v1.Conversation Management — locked requirements SEC-01, CONV-01, CONV-02, CONV-03.
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, sequencing rationale (why SEC-01 ships in this phase rather than as a standalone hotfix).
- `.planning/config.json` — granularity=coarse, mode=yolo, parallelization=true, model_profile=quality, workflow.research+plan_check+verifier all enabled.

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — System pattern, layers, data flow, abstractions, entry points (FastAPI app → council orchestration → openrouter HTTP client; React App → Sidebar + ChatInterface → Stage1/2/3 + Markdown).
- `.planning/codebase/STRUCTURE.md` — Directory layout (backend/ five Python modules; frontend/src/ with components/ and utils/).
- `.planning/codebase/CONVENTIONS.md` — Code style (relative imports, async/await, function components, kebab-case CSS, ReactMarkdown wrapped in `markdown-content` div).
- `.planning/codebase/CONCERNS.md` §Security — Vuln 2 (path traversal) is the open item this phase closes.

### Files this phase modifies (relative paths from project root)
- `backend/storage.py` — add UUID validation in `get_conversation_path` (line 18); add `delete_conversation()` and `update_conversation_title()` functions.
- `backend/main.py` — add `DELETE /api/conversations/{id}` and `PATCH /api/conversations/{id}` endpoints; wrap existing endpoints with the same UUID validation/400 pattern.
- `frontend/src/components/Sidebar.jsx` — add search input, per-item three-dot menu, hover state, inline rename mode, delete confirmation flow.
- `frontend/src/components/Sidebar.css` — styles for the new search input, menu, and editable title.
- `frontend/src/components/Modal.jsx` (NEW) — reusable modal with focus trap / ESC / click-outside.
- `frontend/src/components/Modal.css` (NEW) — modal styles.
- `frontend/src/components/Menu.jsx` (NEW) — reusable hover/right-click menu.
- `frontend/src/components/Menu.css` (NEW) — menu styles.
- `frontend/src/api.js` — add `deleteConversation(id)`, `renameConversation(id, title)`.
- `frontend/src/App.jsx` — wire delete + rename handlers, post-delete state reset (`currentConversationId = null`).

### External / library docs
- No new external libraries introduced in this phase. React 19, FastAPI 0.121, httpx, react-markdown 10 already in stack — no new deps needed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/utils/download.js:triggerDownload` — example of a clean, side-effect-only utility module pattern; the pattern (small functions exporting helpers) is what `Modal` and `Menu` should follow if any helpers are extracted.
- `frontend/src/components/Stage3.jsx` and `frontend/src/components/Stage3.css` — example of the colocated component+CSS pattern this phase must continue (`Modal.jsx`+`Modal.css`, `Menu.jsx`+`Menu.css`).
- `frontend/src/index.css` `.markdown-content` block — example of a global utility class. Modal/Menu may add 1-2 such global classes if needed (e.g., `.menu-trigger-visible-on-hover`) following the same convention.
- `backend/storage.py:create_conversation` and `:add_assistant_message` — existing pattern for atomic file writes (`open` → `json.dump` → close). New `delete_conversation` and `update_conversation_title` should follow the same atomic-write pattern.
- `backend/main.py:74-79` `get_conversation` endpoint — exact 404 + storage-call pattern to mirror in the new `DELETE` and `PATCH` handlers.

### Established Patterns
- **Relative imports:** Backend modules use `from .config import ...` and similar. New code must follow.
- **Graceful degradation in `openrouter.py`:** errors become `None` returns + `print` to stderr. Storage layer doesn't follow that pattern — it raises. Maintain that distinction (raise on invalid input, do not silently no-op).
- **No backend logging library:** All output is `print()`. Don't introduce a logger in this phase. Out of scope.
- **Frontend fetch errors:** `frontend/src/api.js` throws on `!response.ok` and `App.jsx` does `console.error`. New `deleteConversation` and `renameConversation` follow the same pattern. No toast / no UI surface for errors in this phase (visual polish belongs to Phase 4).
- **Component CSS classes:** kebab-case (`.conversation-item`, `.sidebar-header`, etc.). New classes follow.

### Integration Points
- `frontend/src/App.jsx:loadConversations` — invoked after delete/rename to refresh the sidebar list. The handler chain is: user action → `api.deleteConversation` → on success → `loadConversations()` → state update → React re-renders sidebar.
- `frontend/src/components/ChatInterface.jsx` reads `conversation.messages.length === 0` to decide whether to render the input form. After delete with `currentConversationId = null`, `ChatInterface` receives `conversation = null` and renders the existing welcome state — already supported, no change needed.
- `backend/main.py:18-24` CORS middleware — covers all new endpoints automatically (no per-endpoint config). No CORS change needed for `DELETE` / `PATCH`.

</code_context>

<specifics>
## Specific Ideas

- **Modal visual reference:** ASCII mockup approved during discussion:
  ```
  ┌─ Delete conversation ──────────┐
  │                                │
  │ Delete "Snowflake LATERAL      │
  │ JOIN explanation"?             │
  │                                │
  │ This cannot be undone.         │
  │                                │
  │  [Cancel]      [Delete]        │
  └────────────────────────────────┘
  ```
  Title quoted, warning line, two buttons right-aligned, destructive button visually distinct.

- **Three-dot menu reference:** ChatGPT sidebar pattern — three dots `⋮` revealed only on hover/focus over the conversation row, click opens a small popover menu just below the dots. Items are `Rename` / `Delete` for v1; menu is structured to accept more items in future phases without redesign.

- **Progressive search affordance text:** "Search inside content (N conversations)" where `N` is the count of conversations *not yet matched by title*. The text and click affordance must be visually distinct from the search input itself (e.g., a small button-like link below the input, not part of the result list).

- **Post-delete: Welcome view, not auto-select.** User explicitly preferred returning to the existing empty state over auto-selecting an adjacent conversation. The empty state component (`ChatInterface.jsx:40-49`) already exists and is the target of this transition.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk delete / archive of multiple conversations** — discussed in milestone planning; tracked as `CONV-V2-01`. Not in this phase.
- **Tags / folders for organizing conversations** — `CONV-V2-02`. Not in this phase.
- **Export all conversations as zip** — `CONV-V2-03`. Not in this phase.
- **Undo affordance after delete (5s toast)** — considered as a confirmation alternative; rejected in favor of the modal because v1 prefers explicit confirmation over reversibility (no soft-delete overhead). Could revisit in v2 if delete becomes friction-heavy.
- **Modal/Menu extracted into shared component library** — premature. Two consumers in v1; if Phase 3/4 add a third or fourth, revisit extraction at that point.
- **Visual polish of the new components** (palette, hover/active states beyond functional defaults, animations on menu open / modal mount) — deferred to Phase 4 by design (UX research first, then visual identity).
- **Right-click anywhere in sidebar to open "New conversation" menu** — out of scope; existing `+ New Conversation` button suffices.

</deferred>

---

*Phase: 1-Hardening & Conversation Management*
*Context gathered: 2026-05-09*
