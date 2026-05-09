---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-05-09T22:00:34.380Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
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

Phase 01 plans all shipped, including gap-closure plan 01-05 (BL-01 + BL-02 closed). Phase 01 ready for **re-verification** via `/gsd-verify-phase 1` before closure and handoff to Phase 02 (UX Research & Design Brief).

## Current Position

Phase: 01 (Hardening & Conversation Management) — ALL PLANS COMPLETE (incl. gap closure)
Plan: 5 of 5 (last shipped)

- **Phase:** 2
- **Plan:** Not started
- **Status:** Ready to plan
- **Progress:** 5/5 plans complete in Phase 1; 0/4 phases formally complete overall (awaiting verifier).

```
[#####] 100% Phase 1 plans (incl. gap closure) — re-verification next
```

## Phase Progression

| # | Phase | Status |
|---|-------|--------|
| 1 | Hardening & Conversation Management | All 5 plans complete (incl. gap closure 01-05); awaiting re-verification |
| 2 | UX Research & Design Brief | Pending |
| 3 | Quality Dial & Pragmatic Deep Research | Pending |
| 4 | Visual Identity Implementation | Pending |

## Performance Metrics

- Phases planned: 4
- Phases complete: 0 (Phase 1 awaiting `/gsd-verify-phase` re-run after gap closure)
- Plans complete: 5
- Requirements coverage: 21/21 (100%)
- Orphaned requirements: 0
- Requirements satisfied: 4/21 (SEC-01, CONV-01, CONV-02, CONV-03) — SEC-01 and CONV-02 hardened by 01-05

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01 | 01 | ~18 min | 2 | 2 | 2026-05-09 |
| 01 | 02 | ~9 min  | 3 | 10 | 2026-05-09 |
| 01 | 03 | ~7 min  | 2 | 5  | 2026-05-09 |
| 01 | 04 | ~4 min  | 1 | 2  | 2026-05-09 |
| 01 | 05 | ~12 min | 2 | 2  | 2026-05-09 |

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
- **Phase 01 / Plan 05 (gap closure):** Introduced `storage.ConversationNotFoundError` as a domain exception so storage callers can disambiguate "invalid UUID -> 400" (ValueError) from "missing conversation file -> 404". Chose this over the minimum-fix `except ValueError -> 404` to avoid mis-translating future TOCTOU races; cost is one 5-line class definition.
- **Phase 01 / Plan 05:** Canonicalised the UUID at `get_conversation_path` (single chokepoint) via `str(uuid.UUID(id))` — braced/URN/unhyphenated/upper-case forms now collapse to the same hyphenated lowercase filename. Eliminates the Windows NTFS ADS interaction (URN's `:`) and makes GET/PATCH/DELETE round-trip platform-independent.
- **Phase 01 / Plan 05:** SSE error event for the missing-file race uses structured `kind: 'not_found'` so frontend can disambiguate without parsing message strings. Generic transport/generation errors keep the original shape via the trailing `except Exception` branch.
- **Phase 01 / Plan 05:** Did NOT modify the non-streaming `send_message` handler (`backend/main.py:90-134`); its unwrapped mutator calls now raise `ConversationNotFoundError` directly to FastAPI (still a 500). Out of scope per VERIFICATION.md (BL-01 was scoped to PATCH and the streaming path); tracked under SUMMARY's Deferred Issues for future hardening if the non-streaming path is reactivated.

### Open Todos

- Re-run `/gsd-verify-phase 1` to flip BL-01 and BL-02 from `partial` → `verified` and formally close Phase 01.
- Then run `/gsd-execute-phase 2` to launch Phase 02 (UX Research & Design Brief).
- (Optional, deferred) Wrap the non-streaming `send_message` handler's storage mutators with `except ConversationNotFoundError -> HTTPException(404)` if that path is ever exercised again.

### Blockers

None.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in Phase 1 (SEC-01).
- **Metadata not persisted** — flagged as v2 (PERS-V2-01); not in this milestone but Phase 3 should not make it worse when adding `profile` to message metadata.
- **Fragile FINAL RANKING parser** — not a v1 requirement; revisit only if a Phase 3 change destabilises it.
- **Stage 2 full-context broadcast cost** — relevant to Phase 3 pricing of `quality_research`; called out as input to plan-level decisions, not a phase requirement.
- **No automated tests** — accepted milestone debt; tests added opportunistically per phase need.

## Session Continuity

**Last session (2026-05-09):** Completed `01-05-PLAN.md` (gap closure) — closed BL-01 (PATCH/SSE TOCTOU now returns 404 via new `storage.ConversationNotFoundError`) and BL-02 (UUID canonicalised at `get_conversation_path` so braced/URN/unhyphenated forms round-trip). Two task commits (`bbb4120`, `f4d37dc`). SUMMARY at `.planning/phases/01-hardening-conversation-management/01-05-SUMMARY.md`. **All 5 plans of Phase 01 are now shipped (4 original + 1 gap closure).**

**Next session should start by:**

1. Reading this STATE.md.
2. Reading `.planning/phases/01-hardening-conversation-management/01-05-SUMMARY.md` for the new `ConversationNotFoundError` contract and the canonicalisation invariant.
3. Either (a) running `/gsd-verify-phase 1` to re-verify and formally close Phase 01 (BL-01/BL-02 should flip from `partial` → `verified`), or (b) running `/gsd-execute-phase 2` to begin Phase 02 (UX Research & Design Brief, no code) if the user wants to skip a formal verification gate.

**Files most recently touched by GSD tooling:**

- `backend/storage.py` (Plan 05 — `ConversationNotFoundError` class + canonical UUID path + 3 mutator raises switched)
- `backend/main.py` (Plan 05 — PATCH `except ConversationNotFoundError -> 404` + SSE structured `kind: 'not_found'`)
- `.planning/phases/01-hardening-conversation-management/01-05-SUMMARY.md` (Plan 05 summary)
- `.planning/STATE.md` (this file)
- `.planning/ROADMAP.md` (Phase 1 progress 5/5)

---
*State initialized: 2026-05-09*
*Last updated: 2026-05-09 after Plan 01-05 completion (Phase 01 gap closure complete; all 5 plans shipped).*
