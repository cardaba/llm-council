---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-09T10:46:27Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# State: LLM Council — Personal Edition

**Last updated:** 2026-05-09

## Project Reference

- **Project:** LLM Council — Personal Edition
- **Core value:** The Quality dial works as advertised — `Fast` is fast and cheap, `Quality+Research` is well-reasoned and web-grounded.
- **Project doc:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (21 v1 requirements, 100% mapped)
- **Roadmap:** `.planning/ROADMAP.md` (4 coarse phases, mvp mode)
- **Codebase maps:** `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, STRUCTURE.md)
- **Config:** `.planning/config.json` (granularity: coarse, mode: yolo, parallelization: true)

## Current Focus

Phase 01 in progress. Plans 01 (SEC-01), 02 (CONV-01), and 03 (CONV-02) shipped. Plan 04 (CONV-03) still pending.

## Current Position

Phase: 01 (Hardening & Conversation Management) — EXECUTING
Plan: 4 of 4

- **Phase:** 1 — Hardening & Conversation Management (in progress)
- **Plan:** Next is `01-04-PLAN.md` (search input progresivo con debounce y content fallback, CONV-03)
- **Status:** Executing Phase 01
- **Progress:** 3/4 plans complete in Phase 1; 0/4 phases complete overall

```
[###-] 75% — Phase 1 plan 3 of 4 complete
```

## Phase Progression

| # | Phase | Status |
|---|-------|--------|
| 1 | Hardening & Conversation Management | In progress (3/4 plans) |
| 2 | UX Research & Design Brief | Pending |
| 3 | Quality Dial & Pragmatic Deep Research | Pending |
| 4 | Visual Identity Implementation | Pending |

## Performance Metrics

- Phases planned: 4
- Phases complete: 0
- Plans complete: 3
- Requirements coverage: 21/21 (100%)
- Orphaned requirements: 0
- Requirements satisfied: 3/21 (SEC-01, CONV-01, CONV-02)

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01 | 01 | ~18 min | 2 | 2 | 2026-05-09 |
| 01 | 02 | ~9 min  | 3 | 10 | 2026-05-09 |
| 01 | 03 | ~7 min  | 2 | 5  | 2026-05-09 |

## Accumulated Context

### Decisions Logged at Roadmap Time

- Granularity = coarse → 4 phases (within 3-5 bracket).
- MVP mode → every phase delivers a usable, end-to-end vertical slice; Phase 2 (UX research) is the only non-code phase but still produces a tangible artifact set.
- Phase 1 bundles SEC-01 with the CONV-\* features because they touch the same files (`storage.py`, `main.py`) and SEC-01 is small but blocking.
- Phase 3 fuses QUAL-\* and RSCH-\* into one phase because the `quality_research` profile is the entry point to deep research — splitting them would create an artificial boundary mid-feature.
- Phase 4 is sequenced last so it can style the Quality toggle introduced in Phase 3 as part of the identity rollout, not as a follow-up.

### Decisions Logged During Execution

- **Phase 01 / Plan 01:** UUID validation uses inline `uuid.UUID()` in storage + `try/except ValueError → HTTPException(400)` per handler (NOT Pydantic `Annotated[UUID]`, which yields 422). Mirrors the existing storage-raises-main-translates convention.
- **Phase 01 / Plan 01:** Accept any UUID version/format the stdlib parser accepts (v1-v5, hyphenated/non-hyphenated/braced). SEC-01 spirit is "reject non-UUID", not "reject non-v4".
- **Phase 01 / Plan 01:** `delete_conversation()` lets `FileNotFoundError` propagate; the future Plan 02 DELETE handler will translate it to 404. No TOCTOU pre-check.
- **Phase 01 / Plan 01:** No `os.path.abspath().startswith(DATA_DIR)` defense-in-depth — UUID validation alone covers SEC-01 because no parseable UUID contains `/`, `\`, or `..`.
- **Phase 01 / Plan 02:** Modal API is opinionated (`title`/`body`/destructive) instead of generic `children`; only consumer in v1 is a confirmation dialog and Plan 03's rename uses inline edit, not a modal. Future plans can extend with `children` without breaking call sites.
- **Phase 01 / Plan 02:** Manual focus trap implementation (no `react-focus-lock` dependency) — keeps the dependency graph clean per stack constraints.
- **Phase 01 / Plan 02:** `position: fixed` + viewport clamp for `Menu` instead of popper.js — sidebar anchors on the left edge so the popover never needs flipping.
- **Phase 01 / Plan 02:** No body scroll lock when modal opens — backdrop covers the viewport visually; avoids side-effect risk.
- **Phase 01 / Plan 02:** `confirmDelete()` closes the modal BEFORE awaiting `api.deleteConversation` so the user does not see a half-applied state during the network call.
- **Phase 01 / Plan 02:** `handleDeleteConversation` resets `currentConversationId`/`currentConversation` to null BEFORE awaiting the network call when the deleted conversation was the active one (RESEARCH §Pitfall 7 + D-12 — guarantees the welcome state renders immediately).
- **Phase 01 / Plan 03:** Backend body validation via Pydantic `Field(min_length=1, max_length=200)` — empty/oversized titles get a 422 from the framework BEFORE the handler runs, so the handler never sees malformed input.
- **Phase 01 / Plan 03:** intentRef pattern (RESEARCH §Pattern 4) is the single coordination point between keydown and blur. Enter/Escape both trigger blur synthetically; handleBlur is the only place that decides commit vs cancel — eliminates the double-fire that a naive design would produce.
- **Phase 01 / Plan 03:** Lifetime-based remount of the rename input (RenameInput mounted only while isEditing===true) replaces the original 'reset draftTitle in useEffect' shape that React 19's react-hooks/set-state-in-effect rule rejects. Same external behaviour, cleaner under React 19 lint, and naturally robust to rapid Rename target switches.
- **Phase 01 / Plan 03:** ConversationItem extracted as a sub-component within Sidebar.jsx (CD-04 permits) once the row's edit-mode JSX pushed the inline shape past readable.
- **Phase 01 / Plan 03:** Trim happens client-side; backend stores titles verbatim (symmetric with how `add_user_message` stores message bodies as-is). Empty / unchanged titles cancel silently in the UI without invoking the PATCH.

### Open Todos

- Run `/gsd-execute-phase 1` (or equivalent) to launch Plan 04 (CONV-03: progressive search input with debounce + optional content-fallback).

### Blockers

None.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in Phase 1 (SEC-01).
- **Metadata not persisted** — flagged as v2 (PERS-V2-01); not in this milestone but Phase 3 should not make it worse when adding `profile` to message metadata.
- **Fragile FINAL RANKING parser** — not a v1 requirement; revisit only if a Phase 3 change destabilises it.
- **Stage 2 full-context broadcast cost** — relevant to Phase 3 pricing of `quality_research`; called out as input to plan-level decisions, not a phase requirement.
- **No automated tests** — accepted milestone debt; tests added opportunistically per phase need.

## Session Continuity

**Last session (2026-05-09):** Completed `01-03-PLAN.md` — CONV-02 inline rename with intentRef race resolution. Two task commits (`6d2bfc6`, `9d4bcbe`). SUMMARY at `.planning/phases/01-hardening-conversation-management/01-03-SUMMARY.md`.

**Next session should start by:**

1. Reading this STATE.md.
2. Reading `.planning/phases/01-hardening-conversation-management/01-03-SUMMARY.md` for the PATCH endpoint shape and the intentRef pattern Plan 04 may want to leave alone.
3. Reading `.planning/phases/01-hardening-conversation-management/01-04-PLAN.md` (progressive search + debounce + content fallback).
4. Running the executor on Plan 04 (CONV-03).

**Files most recently touched by GSD tooling:**

- `backend/main.py` (Plan 03 — PATCH handler + UpdateConversationRequest)
- `frontend/src/api.js` (Plan 03 — api.renameConversation)
- `frontend/src/App.jsx` (Plan 03 — handleRenameConversation + onRenameConversation prop)
- `frontend/src/components/Sidebar.jsx` (Plan 03 — RenameInput + ConversationItem + Rename menu item + editingId state)
- `frontend/src/components/Sidebar.css` (Plan 03 — .conversation-title-input)
- `.planning/phases/01-hardening-conversation-management/01-03-SUMMARY.md` (Plan 03 summary)
- `.planning/STATE.md` (this file)
- `.planning/ROADMAP.md` (progress table + plan checkbox)
- `.planning/REQUIREMENTS.md` (CONV-02 marked complete)

---
*State initialized: 2026-05-09*
*Last updated: 2026-05-09 after Plan 01-03 completion.*
