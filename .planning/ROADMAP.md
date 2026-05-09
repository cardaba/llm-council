# Roadmap: LLM Council — Personal Edition

**Milestone:** LLM Council — Personal Edition
**Granularity:** coarse (4 phases)
**Mode:** mvp (all phases ship vertical, end-to-end usable slices)
**Created:** 2026-05-09

## Core Value Reference

The Quality dial works as advertised at every level. A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce.

## Phases

- [ ] **Phase 1: Hardening & Conversation Management** — Close Vuln 2 path traversal and ship the sidebar conversation lifecycle (delete / rename / search) on top of the hardened storage layer.
- [ ] **Phase 2: UX Research & Design Brief** — Produce the cognitive walkthrough, Nielsen audit, redesign proposal, and component mockups that will drive the visual rework. No code change.
- [ ] **Phase 3: Quality Dial & Pragmatic Deep Research** — Ship the 3-profile Quality selector end-to-end (toggle in UI, profile-aware backend routing) including the `quality_research` profile with reasoning models, web-search-capable model, optional Stage 4 refinement, isolated strategy module, and `reasoning_details` rendering.
- [ ] **Phase 4: Visual Identity Implementation** — Apply the artifacts from Phase 2: bespoke palette, characterful typography, branded shell, polished microinteractions.

## Phase Details

### Phase 1: Hardening & Conversation Management
**Goal:** User can manage conversations from the sidebar (delete, rename, search) on a storage layer that rejects malformed conversation IDs at the boundary.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** SEC-01, CONV-01, CONV-02, CONV-03
**Success Criteria** (what must be TRUE):
  1. A request to any `/api/conversations/{id}` endpoint with a non-UUID4 `id` returns HTTP 400 and never touches the filesystem.
  2. User can delete a conversation from the sidebar through a confirmation step; the JSON file is removed from `data/conversations/` and the conversation disappears from the list without a manual refresh.
  3. User can click a conversation title in the sidebar, edit it in place, and the new title persists across reloads.
  4. User can type into a search box at the top of the sidebar and the conversation list filters case-insensitively as they type.
**Plans:** 5 plans (4 original + 1 gap closure)
Plans:
- [x] 01-01-PLAN.md (wave 1) — UUID validation en storage + 400 wrappers en handlers existentes (SEC-01) — completed 2026-05-09 (commits `7caf2fe`, `2064bb8`)
- [x] 01-02-PLAN.md (wave 2) — Modal + Menu + DELETE endpoint + Sidebar wiring (CONV-01) — completed 2026-05-09 (commits `e26a52d`, `7139b03`, `5b41fb3`, `24b072c`)
- [x] 01-03-PLAN.md (wave 3) — PATCH endpoint + rename inline con intentRef pattern (CONV-02) — completed 2026-05-09 (commits `6d2bfc6`, `9d4bcbe`)
- [x] 01-04-PLAN.md (wave 4) — Search input progresivo con debounce y content fallback (CONV-03) — completed 2026-05-09 (commit `f0736a9`)
- [ ] 01-05-PLAN.md (wave 1, gap closure) — Cierre de gaps BL-01 (CONV-02 TOCTOU 500 → 404) y BL-02 (SEC-01 canonicalización UUID en path)

### Phase 2: UX Research & Design Brief
**Goal:** A research-backed design brief exists under `.planning/ux/` that describes the friction points of the current UI, scores it against Nielsen heuristics, proposes a redesigned information architecture, and specifies component-level mockups for the new visual identity — sufficient to drive Phase 4 without further design decisions.
**Mode:** mvp
**Depends on:** Phase 1 (the conversation-management UX from Phase 1 should be in the walkthrough scope, since it changes the sidebar surface).
**Requirements:** UXR-01, UXR-02, UXR-03, UXR-04
**Success Criteria** (what must be TRUE):
  1. A cognitive walkthrough document under `.planning/ux/` enumerates the friction points of the current end-to-end flows (new conversation → ask → review stages → manage conversation) with concrete observations.
  2. A Nielsen heuristic audit document under `.planning/ux/` scores the current UI across all 10 heuristics with severity ratings and per-finding rationale.
  3. A UX redesign proposal under `.planning/ux/` describes the target information architecture, interaction patterns for the Quality selector and conversation management features, and the rationale tying back to the walkthrough/audit findings.
  4. Component-level mockups (ASCII or markdown wireframes) under `.planning/ux/` cover the palette, typography choice, branded header, and key screens including the Quality selector and the renamed/searched/deletable sidebar — at a fidelity sufficient for Phase 4 to implement without re-deciding visuals.
**Plans:** TBD
**UI hint**: yes

### Phase 3: Quality Dial & Pragmatic Deep Research
**Goal:** User can pick a Quality profile (`Fast` / `Quality` / `Quality+Research`) per query and receive a deliberation routed accordingly: cheap-and-fast for `Fast`, premium council for `Quality`, and reasoning-models-plus-web-search-with-optional-Stage-4 for `Quality+Research`. The active profile is visible in the saved message header and reasoning traces are inspectable.
**Mode:** mvp
**Depends on:** Phase 1 (touches the same `main.py` endpoints and persisted message schema; Phase 1 must have stabilised storage validation first).
**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, RSCH-01, RSCH-02, RSCH-03, RSCH-04, RSCH-05
**Success Criteria** (what must be TRUE):
  1. User can pick `Fast` from the toggle next to the textarea and receive a deliberation that uses the cheap council mix; the saved message header shows "Fast • N models • Chairman: <model>".
  2. User can pick `Quality` and receive a deliberation that uses the premium council mix (gpt-5.5 / claude-opus-4.7 / gemini-3.1-pro) with an Opus chairman; the saved message header reflects this.
  3. User can pick `Quality+Research` and receive a deliberation in which at least one council member is a web-search-capable model (e.g. `:online` or `perplexity/sonar`) and the others are reasoning variants; when the chairman synthesis scores below the council's quality threshold, an additional Stage 4 refinement runs and is rendered as a fourth stage in the UI.
  4. The model-selection and stage-orchestration logic for `quality_research` lives in a dedicated module (e.g. `backend/research_strategy.py`) with a clean interface, and `backend/council.py` does not import any research-specific model lists or branching logic — verifiable by inspection.
  5. When a model in any profile returns `reasoning_details`, the corresponding Stage 1 (or Stage 4) tab shows a collapsed "Show reasoning" disclosure that the user can expand to inspect the chain of thought.
**Plans:** TBD
**UI hint**: yes

### Phase 4: Visual Identity Implementation
**Goal:** The app no longer looks like a Bootstrap-flavored default React app. It has a bespoke palette, characterful typography, a branded shell with name and icon, and polished microinteractions throughout — applied consistently and matching the Phase 2 mockups.
**Mode:** mvp
**Depends on:** Phase 2 (mockups and palette decisions), Phase 3 (Quality selector exists in the DOM and needs to be styled to match the new identity).
**Requirements:** VIS-01, VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. The bespoke palette from the Phase 2 mockups is the only set of colors used across the app; the previous Bootstrap-flavored defaults (`#4a90e2`, `#f5f5f5`, `#f0fff0`, etc.) no longer appear in any rendered surface.
  2. Typography is a deliberately chosen characterful family (e.g. Inter / IBM Plex / DM Sans) loaded efficiently and applied site-wide; no surface still uses `system-ui`.
  3. The app shell is branded: a header with the app name and an icon, distinctive sidebar styling, and intentional empty states replace the previous minimal shell — matching the mockups from Phase 2.
  4. Microinteractions are polished: stage transitions animate smoothly, loading states use bespoke spinners or skeletons (not the browser default), interactive elements (Quality toggle, tabs, buttons, sidebar items) have hover and active states, and stage progress is animated.
**Plans:** TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hardening & Conversation Management | 4/5 | Gap closure plan added (01-05) for BL-01/BL-02 | - |
| 2. UX Research & Design Brief | 0/0 | Not started | - |
| 3. Quality Dial & Pragmatic Deep Research | 0/0 | Not started | - |
| 4. Visual Identity Implementation | 0/0 | Not started | - |

## Coverage

- v1 requirements total: 21
- Mapped to phases: 21
- Unmapped: 0

| Category | Count | Phases |
|----------|-------|--------|
| Security (SEC) | 1 | Phase 1 |
| Conversation Management (CONV) | 3 | Phase 1 |
| UX Research (UXR) | 4 | Phase 2 |
| Quality Dial (QUAL) | 4 | Phase 3 |
| Pragmatic Deep Research (RSCH) | 5 | Phase 3 |
| Visual Identity (VIS) | 4 | Phase 4 |

## Sequencing Rationale

- **SEC-01 before CONV-\*** — Vuln 2 hardens the same `storage.py` / `main.py` endpoints that the conversation-management features extend. Fixing the boundary first means new endpoints inherit the validation rather than retrofitting it.
- **UXR-\* before VIS-\*** — Visual identity is research-driven by user mandate; Phase 4 implements artifacts from Phase 2, not guesses.
- **Phase 1 before Phase 3** — Phase 3 mutates the saved assistant-message schema (adds `profile` metadata) and introduces a new module touching the same orchestration surface. Phase 1 stabilises storage validation first to avoid mixing security and feature changes.
- **Phase 2 before Phase 4** — Phase 4 has no design decisions to make; all of them are upstream artifacts.
- **Phase 3 before Phase 4** — The Quality toggle (a new DOM surface) needs to exist so Phase 4 can style it as part of the identity rollout, rather than re-styling immediately after.

---
*Roadmap created: 2026-05-09*
