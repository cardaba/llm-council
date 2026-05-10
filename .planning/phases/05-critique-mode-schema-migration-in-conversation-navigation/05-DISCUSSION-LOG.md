# Phase 5: Critique mode + Schema migration + In-conversation navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 5-critique-mode-schema-migration-in-conversation-navigation
**Areas discussed:** Critique entry-point UX, 3 file-slot interaction, Critique instruction prompt, Anti-attribution-leak scope (CRIT-05)

---

## Critique entry-point UX — sub-q 1: Selector shape (welcome state)

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control above textarea | Two-segment toggle on the welcome state (Fresh / Critique). Default Fresh. | |
| Welcome cards side-by-side | Two large cards in the centre, click to enter mode. | |
| "Attach research files" toggle under textarea | No explicit selector; checkbox under textarea expands the file slots. | |
| Tabs "Fresh / Critique" above welcome | Two tabs in same visual language as Stage tabs. | |

**User's choice:** None of these — overridden via direct message.
**Notes:** User said "no me ha convencido ninguna de las opciones. Creo que la creación de nuevas conversaciones fresh ya tiene un botón, y podemos añadir un segundo." Re-scoped the question to sidebar buttons instead of welcome-state selector.

---

## Critique entry-point UX — sub-q 1 (reformulated): Sidebar button shape

| Option | Description | Selected |
|--------|-------------|----------|
| Two stacked full-width buttons | `+ New conversation` (default top) + `+ New critique` (below), same .new-conversation-btn styling. | ✓ |
| Split button (primary + chevron dropdown) | Primary button + small chevron opening a 2-option dropdown. | |
| Primary button + microcopy link | `+ New conversation` + discreet "or start a research critique →" link below. | |

**User's choice:** Two stacked full-width buttons.
**Notes:** Preserves fresh-prompt muscle memory bit-for-bit; same .new-conversation-btn class reused with var(--space-2) gap. Default button on top.

---

## Critique entry-point UX — sub-q 2: Sidebar mode badge

| Option | Description | Selected |
|--------|-------------|----------|
| Pill discreta junto al título | Critique items show a "Critique" microcopy pill next to the title; fresh items show nothing. | ✓ (after override) |
| Icono prefix (📝 vs 📄📄) | Title prefixed by emoji icons. | |
| Filtros "All / Fresh / Critique" encima de la lista | 3 segmented filters above the conversation list. | |
| Nada — indistinguibles en la lista | No visual differentiator; mode visible only on conversation open. | |

**User's choice:** Pill discreta — but only after first saying "no es necesario" (which would have selected option 4) and then sending a new message re-selecting "Pill discreta junto al título".
**Notes:** Final state is the pill. The override was explicit. Fresh items carry no pill — the pill is the exception, not the default.

---

## 3 file-slot interaction — sub-q 1: Slot visual shape

| Option | Description | Selected |
|--------|-------------|----------|
| 3 drop-zones grandes apiladas verticalmente | Each slot is a ≈120px-tall click-or-drop zone; full-width; label = publisher/model-id. | ✓ |
| 3 filas compactas con botón "Choose file" | Each slot is a horizontal row: label + button or chip. | |
| 1 zona de drop única con 3 sub-slots auto-asignados | Single drop zone; user assigns model via dropdown on each loaded chip. | |

**User's choice:** 3 drop-zones grandes apiladas verticalmente.
**Notes:** Direction A "calmo" — lots of air, clear reading. Slot order follows PROFILES["quality"]["COUNCIL_MODELS"]. Microcopy ".md / .txt, max 750KB".

---

## 3 file-slot interaction — sub-q 2: Partial upload policy

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear: los 3 slots son obligatorios | Submit disabled until all 3 files present. | |
| Permitir: los modelos sin archivo critican vacío | All 3 models run; empty-slot models receive "no external research from your model" context. | |
| Permitir: critique solo con los modelos que tienen archivo | Council shrinks dynamically; only models with attached files participate. | ✓ |
| Permitir: cualquier slot puede contener cualquier archivo | Drop the 1:1 file-to-model constraint entirely. | |

**User's choice:** Permitir: critique solo con los modelos que tienen archivo.
**Notes:** Council collapses dynamically. n=1 skips Stage 2 entirely; n=2 runs degraded peer-review; n=3 standard.

---

## 3 file-slot interaction — sub-q 3: File reassignment

| Option | Description | Selected |
|--------|-------------|----------|
| Solo remove + re-upload | User clears the wrong slot and re-uploads to the correct one. | ✓ |
| Drag entre slots | User can drag the chip between slots; swap if both occupied. | |
| Dropdown en el chip para reasignar | Caret on the chip opens a "Move to: …" menu. | |

**User's choice:** Solo remove + re-upload.
**Notes:** Zero new UI. Cost is 2 actions per mistake; acceptable.

---

## Critique instruction prompt — sub-q 1: Field shape

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea freeform required, placeholder guía | Required textarea with a placeholder guide in muted colour. | ✓ |
| Textarea con default-text editable | Pre-filled with a default the user can edit. | |
| Checkboxes de aspectos + textarea opcional | List of 4-5 aspect checkboxes + optional additional textarea. | |
| Textarea optional, vacío = critique genérico backend | Optional; backend uses a hard-coded default if empty. | |

**User's choice:** Textarea freeform required, placeholder guía.
**Notes:** Placeholder copy locked: "Identify factual errors, missing perspectives, and weak arguments in these research files…". Submit disabled when empty (whitespace-trimmed).

---

## Anti-attribution-leak scope — sub-q 1: Regex scope

| Option | Description | Selected |
|--------|-------------|----------|
| Quirúrgico: solo el identifier literal | Strip only literal `publisher/model-id` strings. | |
| Quirúrgico + auto-referencias de firma | Strip identifier literal + first-person self-reference patterns (word-boundary). | ✓ |
| Agresivo: todos los nombres comerciales | Strip identifier + all commercial names (Opus, Claude, GPT, Gemini, OpenAI, Anthropic, Google). | |
| Diferir a plan-time (el plan-checker decide) | Leave the regex scope as an open decision for plan-1. | |

**User's choice:** Quirúrgico + auto-referencias de firma.
**Notes:** Covers the most common leak pattern (model self-signing) without corrupting substantive content. Third-person mentions of model names survive intentionally.

---

## Claude's Discretion

Areas not explicitly discussed where the planner has latitude:

- Cost-estimate live-update timing (recompute on file change vs on hover/blur).
- Mobile behaviour of the two stacked sidebar buttons (≤768px drawer).
- Stage 1 collapse default-state behaviour during a live deliberation (NAV-03 nuance — roadmap only locks the reload case).
- `schema_version` write-back policy on lazy migration (eager once-touched vs lazy forever; recommendation: lazy).
- Sidebar pill copy in extremely narrow sidebars (default "Critique"; "C" fallback if visual testing surfaces row breakage).
- Pre-flight cost-estimate confidence band shape (point estimate vs range; range locked by ROADMAP success criterion).

## Deferred Ideas

- Drag-between-slots / dropdown caret for file reassignment (revisit if observation shows >3 reassignments per session).
- Checkboxes-of-aspects assisted critique prompt (revisit if observed prompt quality is low).
- Aggressive anonymization (revisit incrementally if real Stage 2 outputs show material leaks).
- Filters tabs above the sidebar list (deferred unless critique-to-fresh ratio rises materially).
- Auto-detection of model attribution from filename or footer (already declared Out of Scope in PROJECT.md).
