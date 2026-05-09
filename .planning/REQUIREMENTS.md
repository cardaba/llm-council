# Requirements: LLM Council — Personal Edition

**Defined:** 2026-05-09
**Core Value:** The Quality dial works as advertised at every level — `Fast` returns useful answers in seconds at near-zero cost; `Quality+Research` returns well-reasoned, web-grounded responses that would have taken 10+ minutes of manual work.

## v1 Requirements

### Security

- [x] **SEC-01**: User-supplied `conversation_id` from URL paths is validated as a UUID before any filesystem access in `backend/storage.py`, returning 400 on invalid input — closes Vuln 2 path traversal. _Completed in Phase 01 / Plan 01 (2026-05-09)._

### UX Research

- [ ] **UXR-01**: Cognitive walkthrough of the current end-to-end flows produces a documented audit identifying friction points (using `cognitive-walkthrough` skill) — output committed under `.planning/ux/`.
- [ ] **UXR-02**: Nielsen heuristic audit of the current UI produces a scored evaluation across the 10 heuristics (using `nielsen-heuristics-audit` skill) — output committed under `.planning/ux/`.
- [ ] **UXR-03**: UX redesign proposal with information architecture, interaction patterns, and rationale (using `ui-ux-designer` skill) — output committed under `.planning/ux/`.
- [ ] **UXR-04**: Component-level mockups for the new visual identity (palette, typography, header, key screens with the Quality selector and conversation management features) using `impeccable` and/or `frontend-design` skills — output committed under `.planning/ux/` as ASCII or markdown wireframes.

### Quality Dial

- [ ] **QUAL-01**: Backend `SendMessageRequest` accepts an optional `profile` field with values `fast` / `quality` / `quality_research` (default: `fast`), propagated through the 3-stage council and persisted in the assistant message metadata.
- [ ] **QUAL-02**: `backend/config.py` defines a `PROFILES` mapping from profile name to `{council_models, chairman_model}`, with `fast` using the current cheap mix, `quality` using premium tiers (gpt-5.5 / claude-opus-4.7 / gemini-3.1-pro / opus chairman), and `quality_research` overlaid on top of `quality` with reasoning + web search variants.
- [ ] **QUAL-03**: User can pick the profile per query via a 3-state toggle visible next to the textarea in `frontend/src/components/ChatInterface.jsx`, with the selected profile saved to local component state and sent with the message.
- [ ] **QUAL-04**: The active profile and its model set are visible in each saved assistant message (rendered inline in the message header, e.g. "Quality+Research • 4 models • Chairman: claude-opus-4.7") so the user can tell at a glance which dial setting produced which deliberation.

### Pragmatic Deep Research

- [ ] **RSCH-01**: `quality_research` profile uses reasoning models for the council members (e.g. `openai/o4-mini`, `anthropic/claude-opus-4.7:thinking`, `google/gemini-3.1-pro` with thinking enabled).
- [ ] **RSCH-02**: At least one council member in `quality_research` is a web-search-capable model (`:online` suffix or equivalent like `perplexity/sonar`) so the council has at least one source of grounded information per query.
- [ ] **RSCH-03**: When `quality_research` is selected, an optional Stage 4 council-refinement pass critiques the chairman synthesis and produces a refined final answer; the refinement is gated by a council vote and skipped if the chairman synthesis already scores high.
- [ ] **RSCH-04**: The model-selection and stage-orchestration logic for `quality_research` lives in a dedicated module (`backend/research_strategy.py` or equivalent) with a clean interface, isolated from `council.py`, so a future fully-agentic deep-research loop can replace it without rewriting the council orchestration.
- [ ] **RSCH-05**: When a model returns `reasoning_details` (already captured in `backend/openrouter.py:48`), the frontend renders it as a collapsed "Show reasoning" disclosure inside the corresponding Stage 1 / Stage 4 tab.

### Conversation Management

- [x] **CONV-01**: User can delete a conversation from the sidebar with a confirmation step; backend exposes `DELETE /api/conversations/{id}` that removes the JSON file from disk and the frontend list updates accordingly.
- [x] **CONV-02**: User can rename a conversation title manually by clicking on it in the sidebar; backend exposes `PATCH /api/conversations/{id}` accepting `{title}` and the new title persists across reloads. _Completed in Phase 01 / Plan 03 (2026-05-09)._
- [x] **CONV-03**: User can search/filter conversations by typing in a search box at the top of the sidebar; matches are case-insensitive against title and (optionally) message content; the conversation list updates as the user types. _Completed in Phase 01 / Plan 04 (2026-05-09)._

### Visual Identity

- [ ] **VIS-01**: A bespoke color palette replaces the current Bootstrap-flavored defaults (`#4a90e2`, `#f5f5f5`, `#f0fff0`, etc.). Palette and design tokens live in `frontend/src/index.css` (or a dedicated theme file) and are applied consistently across all components. Source: UXR-03 / UXR-04.
- [ ] **VIS-02**: Typography is replaced from `system-ui` to a characterful family (e.g. Inter / IBM Plex / DM Sans / etc.) loaded efficiently and applied site-wide. Source: UXR-03 / UXR-04.
- [ ] **VIS-03**: A branded app shell — header with name + icon, distinctive sidebar styling, intentional empty states — replaces the current minimal shell. Source: UXR-04.
- [ ] **VIS-04**: Microinteractions and polished states applied: smooth transitions between stages, non-generic loading spinners (or skeletons), hover states on interactive elements (chips, tabs, buttons), animated stage progress. Source: UXR-04.

## v2 Requirements

### Future Quality-Dial Enhancements

- **QUAL-V2-01**: Per-message "Regenerate with another profile" button (re-runs same query with different dial setting for side-by-side comparison).
- **QUAL-V2-02**: Cost estimation displayed before sending (based on profile + prompt length + attachments).

### Future Conversation Management

- **CONV-V2-01**: Bulk delete / archive operations on multiple conversations.
- **CONV-V2-02**: Tags or folders for organizing conversations.
- **CONV-V2-03**: Export all conversations as a single zip archive.

### Future Deep Research

- **RSCH-V2-01**: Fully-agentic deep-research loop (iterative search → read → reason → synthesize across 5-30 minutes, à la ChatGPT Deep Research) plugged into the strategy module from RSCH-04.
- **RSCH-V2-02**: Visible inline citations with source URLs and excerpt previews in the synthesized answer.

### Future Persistence

- **PERS-V2-01**: Persist `label_to_model` and `aggregate_rankings` metadata to the JSON files so re-loading a conversation preserves de-anonymization (currently lost — see `CONCERNS.md`).

### Future UX

- **UX-V2-01**: Copy-to-clipboard on the chairman's final answer.
- **UX-V2-02**: Dark mode toggle.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / authentication | Single-user personal app; auth would dominate complexity for zero benefit at this scale. |
| Multi-turn chat inside a conversation | Original design "1 conversation = 1 deliberation" preserves the council mental model; turning it into ChatGPT-style multi-turn would dilute the differentiator. |
| Database backend (SQLite/Postgres) | `data/conversations/*.json` is sufficient for personal use; introducing a DB adds migration burden without unlocking anything material in this milestone. |
| Automated test suite | Acceptable as a milestone-level deuda; tests can be added opportunistically when a phase needs them but are not a requirement to ship. |
| Fully-agentic deep-research loop in this milestone | Explicitly deferred to v2 (RSCH-V2-01); pragmatic approximation in RSCH-01..05 covers ~80% of the value at ~20% of the complexity. |
| Public deployment / Docker / install script | Personal local use only. |
| Sharing conversations between users | Implied by single-user posture. |
| OAuth / SSO | No multi-user means no auth means no SSO. |
| Free-tier / non-allowlisted providers (Meta, Mistral, DeepSeek, xAI, etc.) | Imposed by the OpenRouter account allowlist (openai / anthropic / google-ai-studio only); any future model selection must respect this. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| CONV-01 | Phase 1 | Complete |
| CONV-02 | Phase 1 | Complete |
| CONV-03 | Phase 1 | Complete |
| UXR-01 | Phase 2 | Pending |
| UXR-02 | Phase 2 | Pending |
| UXR-03 | Phase 2 | Pending |
| UXR-04 | Phase 2 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-03 | Phase 3 | Pending |
| QUAL-04 | Phase 3 | Pending |
| RSCH-01 | Phase 3 | Pending |
| RSCH-02 | Phase 3 | Pending |
| RSCH-03 | Phase 3 | Pending |
| RSCH-04 | Phase 3 | Pending |
| RSCH-05 | Phase 3 | Pending |
| VIS-01 | Phase 4 | Pending |
| VIS-02 | Phase 4 | Pending |
| VIS-03 | Phase 4 | Pending |
| VIS-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-05-09*
*Last updated: 2026-05-09 — CONV-03 marked complete after Plan 01-04 (all 4 Phase 01 requirements now satisfied).*
