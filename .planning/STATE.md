---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-09T10:55:34Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 4
  completed_plans: 4
  percent: 100
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

Phase 01 plans all shipped (01 SEC-01, 02 CONV-01, 03 CONV-02, 04 CONV-03). Phase 01 awaiting end-to-end smoke / `/gsd-verify-phase 1` before closure and handoff to Phase 02 (UX Research & Design Brief).

## Current Position

Phase: 01 (Hardening & Conversation Management) — ALL PLANS COMPLETE
Plan: 4 of 4 (last shipped)

- **Phase:** 1 — Hardening & Conversation Management (all plans done; phase pending verification)
- **Plan:** Last shipped: `01-04-PLAN.md` (CONV-03 progressive search). No more plans in this phase.
- **Status:** Phase 01 ready for verification → Phase 02 ready to plan.
- **Progress:** 4/4 plans complete in Phase 1; 0/4 phases formally complete overall (awaiting verifier).

```
[####] 100% Phase 1 plans — phase verification next
```

## Phase Progression

| # | Phase | Status |
|---|-------|--------|
| 1 | Hardening & Conversation Management | All 4 plans complete; awaiting verification |
| 2 | UX Research & Design Brief | Pending |
| 3 | Quality Dial & Pragmatic Deep Research | Pending |
| 4 | Visual Identity Implementation | Pending |

## Performance Metrics

- Phases planned: 4
- Phases complete: 0 (Phase 1 awaiting `/gsd-verify-phase`)
- Plans complete: 4
- Requirements coverage: 21/21 (100%)
- Orphaned requirements: 0
- Requirements satisfied: 4/21 (SEC-01, CONV-01, CONV-02, CONV-03)

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01 | 01 | ~18 min | 2 | 2 | 2026-05-09 |
| 01 | 02 | ~9 min  | 3 | 10 | 2026-05-09 |
| 01 | 03 | ~7 min  | 2 | 5  | 2026-05-09 |
| 01 | 04 | ~4 min  | 1 | 2  | 2026-05-09 |

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
- **Phase 01 / Plan 04:** 200ms debounce via inline `useEffect setTimeout/clearTimeout` (RESEARCH §Pattern 5 sweet spot for 10-100 items). No custom `useDebounce` hook — single consumer, hook extraction would be premature.
- **Phase 01 / Plan 04:** Two-tier filter (`titleMatches` + `filteredConversations`) with `useMemo` on each. `titleMatches` must be computed even when content-mode is active because it gates the D-10 affordance visibility.
- **Phase 01 / Plan 04:** Content-fallback affordance gated on `query.length >= 3 AND titleMatches.length === 0 AND !contentSearchActive` (D-10) — explicit user opt-in, never auto-triggered. The `>=3` guard prevents the affordance flickering on transient `a` / `ab` queries.
- **Phase 01 / Plan 04:** D-11 cache lifetime = session, no invalidation on rename/delete. Deleted ids never render (gated by `conversations` metadata); renamed titles still display the current title (sourced from metadata, not cache). Acceptable staleness.
- **Phase 01 / Plan 04:** Stage 2 evaluation text NOT in search corpus — anonymised peer-review-of-peers is noisy as a recall key. User content + Stage 1 + Stage 3 cover the meaningful semantic surface.
- **Phase 01 / Plan 04:** Pitfall 6 sealed deliberately by omission — no `onSelectConversation(null)` call exists in the search code path. The active conversation stays visible in the central panel even when the sidebar filter hides it (Slack/Discord-like).

### Open Todos

- Run `/gsd-verify-phase 1` (or perform the 8-step manual smoke from `01-04-PLAN.md` acceptance criteria) end-to-end against a live frontend before formally closing Phase 01.
- Then run `/gsd-execute-phase 2` to launch Phase 02 (UX Research & Design Brief).

### Blockers

None.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in Phase 1 (SEC-01).
- **Metadata not persisted** — flagged as v2 (PERS-V2-01); not in this milestone but Phase 3 should not make it worse when adding `profile` to message metadata.
- **Fragile FINAL RANKING parser** — not a v1 requirement; revisit only if a Phase 3 change destabilises it.
- **Stage 2 full-context broadcast cost** — relevant to Phase 3 pricing of `quality_research`; called out as input to plan-level decisions, not a phase requirement.
- **No automated tests** — accepted milestone debt; tests added opportunistically per phase need.

## Session Continuity

**Last session (2026-05-09):** Completed `01-04-PLAN.md` — CONV-03 progressive search in sidebar with 200ms debounce and explicit content-fallback affordance backed by a per-session `Map` cache. One task commit (`f0736a9`). SUMMARY at `.planning/phases/01-hardening-conversation-management/01-04-SUMMARY.md`. **All 4 plans of Phase 01 are now shipped.**

**Next session should start by:**

1. Reading this STATE.md.
2. Reading `.planning/phases/01-hardening-conversation-management/01-04-SUMMARY.md` for the search state shape and the Pitfall 6 seal Phase 4 (visual identity) should preserve when restyling the sidebar.
3. Either (a) running `/gsd-verify-phase 1` to formally close Phase 01, or (b) running `/gsd-execute-phase 2` to begin Phase 02 (UX Research & Design Brief, no code) if the user wants to skip a formal verification gate.

**Files most recently touched by GSD tooling:**

- `frontend/src/components/Sidebar.jsx` (Plan 04 — search input + debounce + titleMatches/filteredConversations memos + activateContentSearch + content cache)
- `frontend/src/components/Sidebar.css` (Plan 04 — .sidebar-search, .search-input, .content-search-affordance, .content-search-active-note)
- `.planning/phases/01-hardening-conversation-management/01-04-SUMMARY.md` (Plan 04 summary)
- `.planning/STATE.md` (this file)
- `.planning/ROADMAP.md` (Phase 1 progress 4/4)
- `.planning/REQUIREMENTS.md` (CONV-03 marked complete)

---
*State initialized: 2026-05-09*
*Last updated: 2026-05-09 after Plan 01-04 completion (Phase 01 plans complete).*
