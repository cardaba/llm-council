---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-10T08:48:48.649Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 16
  completed_plans: 13
  percent: 81
---

# State: LLM Council — Personal Edition

**Last updated:** 2026-05-10

## Project Reference

- **Project:** LLM Council — Personal Edition
- **Core value:** The Quality dial works as advertised — `Fast` is fast and cheap, `Quality+Research` is well-reasoned and web-grounded.
- **Project doc:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (21 v1 requirements, 100% mapped)
- **Roadmap:** `.planning/ROADMAP.md` (4 coarse phases, mvp mode)
- **Codebase maps:** `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, STRUCTURE.md)
- **Config:** `.planning/config.json` (granularity: coarse, mode: yolo, parallelization: true)

## Current Focus

Phase 02 (UX Research & Design Brief) closed and verified — all 6 plans shipped, all 4 ROADMAP success criteria verified, all 4 UXR requirements satisfied. Direction A (Research notebook) selected for Phase 4. Ready to start Phase 03 (Quality Dial & Pragmatic Deep Research).

## Current Position

Phase: 03 (quality-dial-pragmatic-deep-research) — EXECUTING
Plan: 3 of 5 (Plans 01 + 02 complete)

- **Phase:** 3
- **Plan:** 03-02 complete; 03-03 next
- **Status:** Executing Phase 03
- **Progress:** [████████░░] 81%

```
[#####] 100% Phase 1 plans (incl. gap closure) — verified 2026-05-09
[#####] 100% Phase 2 plans — verified 2026-05-10
[##   ]  40% Phase 3 — 2/5 plans complete (03-01 foundation, 03-02 routing)
[     ]   0% Phase 4 — not started
```

## Phase Progression

| # | Phase | Status |
|---|-------|--------|
| 1 | Hardening & Conversation Management | All 5 plans complete + verified (closed 2026-05-09) |
| 2 | UX Research & Design Brief | All 6 plans complete + verified (closed 2026-05-10) |
| 3 | Quality Dial & Pragmatic Deep Research | In progress (2/5 plans complete) |
| 4 | Visual Identity Implementation | Pending |

## Performance Metrics

- Phases planned: 4
- Phases complete: 2
- Plans complete: 13
- Requirements coverage: 21/21 (100%)
- Orphaned requirements: 0
- Requirements satisfied: 11/21 (SEC-01, CONV-01, CONV-02, CONV-03, UXR-01, UXR-02, UXR-03, UXR-04, QUAL-01, QUAL-02, RSCH-01)

| Phase | Plan | Duration | Tasks | Files | Date |
|-------|------|----------|-------|-------|------|
| 01 | 01 | ~18 min | 2 | 2 | 2026-05-09 |
| 01 | 02 | ~9 min  | 3 | 10 | 2026-05-09 |
| 01 | 03 | ~7 min  | 2 | 5  | 2026-05-09 |
| 01 | 04 | ~4 min  | 1 | 2  | 2026-05-09 |
| 01 | 05 | ~12 min | 2 | 2  | 2026-05-09 |
| 02 | 01 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 02 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 03 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 04 | doc-only | 1 | 1 | 2026-05-10 |
| 02 | 05 | doc-only | 3 | 3 | 2026-05-10 |
| 02 | 06 | doc-only | 1 | 1 | 2026-05-10 |
| 03 | 01 | ~8 min  | 2 | 2 | 2026-05-10 |
| 03 | 02 | ~12 min | 2 | 2 | 2026-05-10 |

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
- **Phase 02 / Plans 01-06:** Severity scale = Nielsen original 0-4 (D-03), NOT low/medium/high. 6 anticipatory findings on Phase 3 surfaces (QUAL-03, RSCH-05) — exceeds D-05 minimum of ≥2. 3 tonal directions explored in parallel (Research notebook / Tactical cockpit / Claude-like minimal); brutalist editorial explicitly rejected (D-08).
- **Phase 02 / Plan 06:** Direction A (Research notebook) selected as the canonical visual identity for Phase 4. Rationale: Stage 2 / Stage 3 are long-form editorial content; only Direction A's serif body (Source Serif 4) + strong typographic hierarchy + medium-low density respects long reading without fatiguing. Cockpit (B) too instrumental for sustained reading; Minimal (C) hides the aggregate ranking and cost surfacing too aggressively. Phase 4 entry contract documented in `03-redesign-proposal.md` lines 771-779.
- **Phase 02:** Throwaway HTML disclaimer (D-15) explicitly prevents Phase 4 from lifting CSS verbatim from the sketches. Phase 4 reads only: tokens documented in proposal, typography stack, microinteractions, IA from wireframes. The HTML sketches are a visual validation tool, not source code.
- **Phase 03 / Plan 01:** PROFILES dict is the single source of truth for Quality Dial. Aliases-as-views pattern: `COUNCIL_MODELS` and `CHAIRMAN_MODEL` are direct references into `PROFILES["fast"]` (not copies) so there is one source of truth during the Plan 03-02 migration window.
- **Phase 03 / Plan 01:** No `:thinking` model-ID suffix used. RESEARCH.md confirmed the suffix does not exist on OpenRouter — reasoning is opt-in via the `reasoning` payload param. `query_model` now accepts `reasoning: bool = False` and injects `{"reasoning": {"enabled": True}}` only when True; default preserves the existing fast-flow byte-for-byte.
- **Phase 03 / Plan 01:** Substitution applied (CD-05): `google/gemini-3.1-pro` → `google/gemini-3.1-pro-preview` in both `quality` and `quality_research` profiles; this is the canonical OpenRouter ID.
- **Phase 03 / Plan 01:** `quality_research` uses 4 reasoning models all with `:online` (D-10). Critic = Opus-4.7 (D-06). Stage-4 threshold = 8/10 (D-06). typical_cost = \$0.45 (D-14). BYOK allowlist preserved — `get_provider_for_model` splits on `/` so `:online` suffixes do not break BYOK routing.
- **Phase 03 / Plan 01:** `query_models_parallel` left untouched. Plan 03-04 will wrap it if it needs to forward `reasoning=True` per-model, keeping the low-level transport stable.
- **Phase 03 / Plan 02:** `SendMessageRequest.profile` uses Pydantic `Literal["fast","quality","quality_research"]` with default `"fast"` (D-28 + D-29). Unknown values yield 422 before the handler runs — no custom validator, no custom error.
- **Phase 03 / Plan 02:** `council.py` is now profile-agnostic except for a single placeholder branch in `run_full_council`. Stages take `council_models` / `chairman_model` as explicit args; legacy `COUNCIL_MODELS` / `CHAIRMAN_MODEL` imports dropped from `council.py` (kept in `config.py` as views-into-PROFILES['fast'] for any external caller).
- **Phase 03 / Plan 02:** `quality_research` routes through one delegate point per endpoint type — `run_full_council` raises `NotImplementedError` (sync) and `event_generator` emits a structured SSE error event `{'type':'error','message':'quality_research lands in Plan 03-04'}` (stream). Plan 03-04 replaces both with `research_strategy` delegations without touching the rest of the file.
- **Phase 03 / Plan 02:** QR check placed BEFORE `title_task` creation in `event_generator`. Avoids spending a Gemini Flash title call on a request that immediately errors out.
- **Phase 03 / Plan 02:** Module docstring on `council.py` codifies the RSCH-04 isolation rule (no `critic_model`, no `stage4_threshold`, no `:online` lists). Future plans must NOT regress this.

### Open Todos

- Run Plan 03-03 next: persist `profile` metadata in `add_assistant_message` and surface in saved-message header (QUAL-04).
- Plan 03-04 will replace the `quality_research` placeholder branches in both `council.py` and `main.py` with the `research_strategy.run` delegate (RSCH-01..04 + QUAL-04 stage4 metadata).
- Phase 04 is unblocked from Phase 02's perspective but still depends on Phase 03 (Quality toggle DOM must exist before it gets styled).

### Blockers

None.

### Notes from Codebase Concerns to Factor In

- **Vuln 2 (path traversal)** — addressed in Phase 1 (SEC-01).
- **Metadata not persisted** — flagged as v2 (PERS-V2-01); not in this milestone but Phase 3 should not make it worse when adding `profile` to message metadata.
- **Fragile FINAL RANKING parser** — not a v1 requirement; revisit only if a Phase 3 change destabilises it.
- **Stage 2 full-context broadcast cost** — relevant to Phase 3 pricing of `quality_research`; called out as input to plan-level decisions, not a phase requirement.
- **No automated tests** — accepted milestone debt; tests added opportunistically per phase need.
- **Phase 2 anticipatory findings** — H1-04 (cost visible in Quality toggle), H5-03 (extra friction on Q+R send), H1-05/H6-05/H8-05 (reasoning_details disclosure pattern), H8-06 (Quality toggle minimalism) MUST inform Phase 3 implementation. The redesign proposal already specifies these for Direction A.

## Session Continuity

**Last session (2026-05-10):** Executed Plan 03-02 (Backend profile routing — QUAL-01). Two atomic commits: `b660b9f` (refactor: `council.py` stages take `council_models` / `chairman_model` as explicit args; `run_full_council(user_query, profile='fast')` reads `PROFILES[profile]`; `quality_research` raises `NotImplementedError`; legacy `COUNCIL_MODELS`/`CHAIRMAN_MODEL` imports dropped; module docstring codifies RSCH-04 isolation), `58dd517` (feat: `SendMessageRequest.profile: Literal["fast","quality","quality_research"] = "fast"`; both `/message` endpoints propagate `request.profile`; streaming endpoint resolves `PROFILES[profile]` once at the top of `event_generator` and emits structured SSE error event for `quality_research`). All acceptance grep checks + inline `python -c` tests passed. QUAL-01 marked satisfied (11/21 requirements).

**Next session should start by:**

1. Reading this STATE.md.
2. Reading `.planning/phases/03-quality-dial-pragmatic-deep-research/03-02-SUMMARY.md` to understand the wiring contract (profile field shape + run_full_council signature + the two QR placeholder points Plan 03-04 must replace).
3. Running `/gsd-execute-phase` for Plan 03-03: persist `profile` metadata in `add_assistant_message` + saved-message header (QUAL-04).

**Files most recently touched by GSD tooling:**

- `backend/council.py` (Plan 03-02 — profile-agnostic stages + QR placeholder)
- `backend/main.py` (Plan 03-02 — SendMessageRequest.profile + propagation in both endpoints)
- `.planning/phases/03-quality-dial-pragmatic-deep-research/03-02-SUMMARY.md` (Plan 03-02 summary)
- `.planning/STATE.md` (this file)
- `.planning/ROADMAP.md` (Phase 3 progress 2/5)
- `.planning/REQUIREMENTS.md` (QUAL-01 marked complete)

---
*State initialized: 2026-05-09*
*Last updated: 2026-05-10 after Plan 03-02 (Backend profile routing: SendMessageRequest.profile + run_full_council branching).*
