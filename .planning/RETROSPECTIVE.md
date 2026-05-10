# Retrospective — LLM Council Personal Edition

Living document. New milestone sections appended at the end before "## Cross-Milestone Trends".

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-10
**Phases:** 4 | **Plans:** 20 | **Requirements:** 21/21 | **Commits:** 33 feat + ~25 docs

### What Was Built

LLM Council fork transformed from "99% vibe-coded Saturday hack" into a daily-driver personal tool: hardened storage layer + sidebar conversation lifecycle (delete/rename/search), research-backed UX brief locked to "Direction A — Research notebook", 3-profile Quality dial (Fast / Quality / Quality+Research) with reasoning models + web search + critic-gated Stage 4 refinement, and bespoke visual identity applied across the entire surface (zero Bootstrap defaults, light + dark with UI toggle).

### What Worked

- **UX research-first phase before any visual code** (Phase 02). The "rebrand by guessing" failure mode was eliminated structurally — Phase 04 implemented Direction A without re-decisions because everything was locked upstream.
- **Wave-based execution with subagents** keeping orchestrator context lean (~15%) while subagents got fresh 100% per plan. Sequential waves with single-plan-per-wave when dependencies forced it (Phase 03 + Phase 04), parallel within waves when files didn't conflict.
- **Plan-checker iteration in Phase 04** detected 3 blockers (favicon path drift, Sidebar.jsx active-row convention indeterminate, App.css cross-wave file ownership) before any executor ran. Saved hours of debugging at near-zero cost.
- **`research_strategy.py` aislado del `council.py`** — verified via grep gates (zero `critic_model`/`stage4_threshold`/`CRITIC_RUBRIC` in council.py). Architectural membrane that allows future agentic deep-research to swap in without touching council orchestration.
- **CONTEXT.md → SPEC → RESEARCH → PLAN → SUMMARY → VERIFICATION trail** kept decisions traceable end-to-end. The integration-checker at milestone close could trace E2E flows wire-by-wire because each layer cited its sources.
- **Atomic commits per task** (one feat per task in execute-phase) made the diff readable and bisectable.

### What Was Inefficient

- **MILESTONES.md auto-generation by SDK** produced noisy accomplishments (parsed "One-liner:" headers from SUMMARY.md naively). Required manual rewrite with curated 6-item list. Could be improved upstream in `gsd-sdk milestone.complete` to filter section headers.
- **Phase 02 produced 3 design directions then locked Direction A** — the work for Cockpit and Minimal directions was thrown away. Justified by the UX research mandate (D-09 explored 3 directions to compare), but represents real cost. Future milestones could explore 2 directions instead of 3.
- **Plan 03-04 (research_strategy module)** was the largest single plan in the milestone (3 tasks, ~290 LOC new module + critic + Stage 4). Could have been split into 2 plans to reduce blast radius.
- **`.planning/config.json` auto-mutations** (chain flag) appeared in unrelated commits (e.g., the v1.0 close commit). Minor noise but confused commit narrative.

### Patterns Established

- **"Single point of replacement"** in Plan 03-02: placeholder `NotImplementedError` for `quality_research` was confined to exactly 2 branches (sync + SSE) so Plan 03-04 could swap them surgically. Worth applying to any "stub now, implement later" pattern.
- **Tokens closed at end of foundations wave** (Phase 04 Plan 04-01): subsequent waves consume `var(--*)` only, never add new tokens to `:root`. Prevents cross-wave file ownership confusion.
- **Grep gates as acceptance criteria**: `grep -c "system-ui" frontend/src/ | grep -v index.css == 0`, `grep -c "#4a90e2" frontend/src/ == 0`, etc. Verifiable without browser. Killed entire categories of regression.
- **3-source requirement cross-reference** at milestone audit: REQUIREMENTS.md checkboxes + SUMMARY frontmatter + VERIFICATION.md narrative. Catches orphaned requirements (REQ assigned but never verified) that single-source checks miss.
- **`grid-template-rows: 0fr → 1fr` for dynamic-height accordions** — CSS-only modern technique (Baseline 2024-09). Replaces `max-height` magic numbers without JS helpers.

### Key Lessons

- **The plan-checker pays for itself when it forces the planner to read the JSX before dictating a CSS selector.** Don't delegate decidable inspection to executors — that pushes ambiguity downstream.
- **`:thinking` suffix drift between PROJECT.md and OpenRouter reality** was caught only by RESEARCH.md verification. Pattern: research-time verification of factual claims wins over PROJECT.md / discuss-phase assertions when there's a discrepancy.
- **Phase 4's "cancel deferred to v1"** (theme toggle UI runtime, was UX-V2-02) added scope but eliminated a v1-incomplete feeling. Sometimes cancelling a deferred saves entry friction later.
- **Direction A (Research notebook) won over Cockpit and Minimal** because Stage 2 + Stage 3 are editorial long-form reading. The choice of body family (Source Serif 4) follows from understanding the *primary content type*, not from aesthetic preference. UX research → typography choice was deductive.
- **Single-user local app constraints simplify dramatically**: no auth, no rate limiting, no multi-tenant. The entire SEC threat surface in v1 was Vuln 2 (path traversal). Closing it unlocked clean code throughout.

### Cost Observations

- Model mix (subagent dispatches): predominantly Opus 4.7 for planner/researcher/UI-researcher/integration-checker (high-reasoning work); Sonnet 4.6 for plan-checker and UI-checker (verification, lower-reasoning).
- Sessions: 2 (2026-05-09 + 2026-05-10).
- Notable: full E2E Quality+Research flow (Stage 1×4 reasoning models with `:online` + Stage 2×4 ranking + Stage 3 + Critic + conditional Stage 4) probably costs ~$0.45-1.50 per query in production. v1.1 should add cost analytics observability.

---

## Cross-Milestone Trends

*To be populated as v1.1, v1.2, etc. are shipped.*
