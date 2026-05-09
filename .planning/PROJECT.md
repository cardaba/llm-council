# LLM Council — Personal Edition

## What This Is

A personal multi-LLM deliberation app forked from `karpathy/llm-council`, extended into a useful daily tool for asking questions with a cost-aware "council mode": fast for trivial queries, premium for important ones, and a research mode that mixes reasoning models with web search when answers need to be grounded. Single-user, runs locally, BYOK against OpenAI / Anthropic / Google AI Studio via OpenRouter.

## Core Value

**The Quality dial works as advertised at every level.** A `Fast` query returns a useful answer in seconds at near-zero cost; a `Quality+Research` query returns a well-reasoned, web-grounded response that would have taken 10+ minutes of manual work to produce. Everything else can fail before this does.

## Requirements

### Validated

<!-- Inherited from the fork-mejorado baseline (commits b0aca40 + 381fa34). Locked. -->

- ✓ **Council 3-stage deliberation** with anonymized peer ranking — `backend/council.py` (`stage1_collect_responses`, `stage2_collect_rankings`, `stage3_synthesize_final`)
- ✓ **BYOK routing** via `provider.only` for OpenAI / Anthropic / Google AI Studio — `backend/openrouter.py:55-59`, `backend/config.py:get_provider_for_model`
- ✓ **SSE streaming per-stage** to the frontend — `backend/main.py:126-194`
- ✓ **Markdown rendering** with GFM (tables, autolinks), syntax highlighting, link styling — `frontend/src/components/Markdown.jsx`, `frontend/src/index.css`
- ✓ **File attachments** (text-only, 500KB/file and 2MB total caps, multi-file) — `frontend/src/components/ChatInterface.jsx`, `frontend/src/utils/download.js:readFileAsText`
- ✓ **Download as markdown** — final answer or full deliberation (Stage 1 + Stage 2 + aggregate rankings + Stage 3) — `frontend/src/utils/download.js`
- ✓ **Backend bound to 127.0.0.1** (Vuln 1 fix) — `backend/main.py:199`

### Active

<!-- Hypotheses for this milestone. Validated when shipped. -->

- [ ] **Quality selector per-query** with 3 profiles: `Fast`, `Quality`, `Quality+Research`, exposed as a toggle next to the textarea. Each profile maps to a curated set of council models + chairman model. The selected profile travels with the request and is persisted in the message metadata.
- [ ] **Pragmatic deep research** as the `Quality+Research` profile: council uses reasoning models (`openai/o4-mini`, `anthropic/claude-opus-4.7:thinking`, `google/gemini-3.1-pro` with thinking) plus at least one model with web search (`:online` or equivalent), with an optional Stage 4 council-refinement pass. Code structured so that a future fully-agentic deep-research loop can replace the current strategy without touching `council.py`.
- [ ] **UX research artifacts** produced before any visual rework: cognitive walkthrough of current flows, Nielsen heuristic audit of current UI, redesign proposal (UX-first), and component-level mockups. Output lives under `.planning/ux/` and feeds the implementation phase.
- [ ] **Conversation management UX**: delete a conversation, rename its title in place, search/filter conversations by text in the sidebar.
- [ ] **Visual redesign applied**, guided by the UX research artifacts: bespoke palette and typography (no Bootstrap-flavored defaults), branded header, polished microinteractions, distinct identity. Same React + Vite stack.
- [ ] **Vuln 2 fix**: UUID validation on `conversation_id` in `backend/storage.py` and the corresponding endpoints in `backend/main.py` to close the path-traversal vector. Done before the conversation-management features (which touch the same module).

### Out of Scope

<!-- Explicit boundaries. Reasons recorded so they don't quietly get re-added. -->

- **Multi-user / authentication / sharing** — single-user personal app; auth would dominate complexity for zero benefit at this scale.
- **Multi-turn chat inside a conversation** — original design is "1 conversation = 1 deliberation". Keeping it preserves the council mental model and avoids re-architecting state.
- **Database backend (SQLite/Postgres) instead of JSON files** — `data/conversations/*.json` is sufficient for personal use; introducing a DB adds migration burden without unlocking anything material in this milestone.
- **Automated test suite as a goal of this milestone** — accepting the deuda; tests can be added opportunistically when a phase needs them, but they are not a requirement to ship.
- **Fully-agentic deep-research loop** (à la ChatGPT Deep Research with iterative search → read → reason → search → synthesize across 5-30 minutes) — explicitly deferred. Active scope only commits to a pragmatic approximation. Code structure leaves the door open.
- **Persisting `label_to_model` and `aggregate_rankings` metadata to disk** — known debt in `CONCERNS.md`, but not a Quality-dial requirement. Backlog, not Active.
- **Publishing / packaging** (Docker image, public deploy, install script) — personal local use only.

## Context

**Heritage.** This is a fork of [karpathy/llm-council](https://github.com/karpathy/llm-council), described by its author as "99% vibe coded as a fun Saturday hack" and explicitly unmaintained. Karpathy provided a usable skeleton; everything beyond the original Stage 1/2/3 plumbing is the fork's responsibility.

**Already done in this fork (pre-milestone, see `Validated`).** Two commits on top of upstream: `b0aca40` (`.env.example`, host bind to localhost) and `381fa34` (file attachment support, full markdown rendering with GFM and syntax highlighting, download conversation/answer, BYOK routing via `provider.only`, model config update for the BYOK-restricted account).

**OpenRouter posture.** The user's OpenRouter account has a deliberate provider allowlist (`openai`, `anthropic`, `google-ai-studio` only — no Meta/Mistral/DeepSeek/xAI) plus a $100/month spend cap and BYOK keys configured for those three providers. Quality+Research will likely concentrate spend on Anthropic Opus reasoning + Google Gemini Pro thinking + OpenAI o4-mini, all of which are available through the BYOK pipe.

**Codebase state.** Mapped in `.planning/codebase/` (commit `d98f156`). Highlights: zero automated tests, single-shot conversation design (input form only renders when `messages.length === 0`), reasoning_details captured server-side but not displayed in frontend, metadata not persisted to disk, Stage 2 cost dominates due to context concatenation. Vuln 2 (path traversal in `storage.get_conversation_path`) is open.

**User profile.** Practice Lead at Basetis specialized in BI/data for healthcare/pharma. Stack: Snowflake SQL, Power Query, Power BI, Excel LET/FILTER, Python. This app is for personal use, not Basetis client work — no PII or pharma data will go through it.

## Constraints

- **Tech stack**: FastAPI + httpx + uv on backend, React 19 + Vite 7 + react-markdown on frontend — *fixed; no migration to other frameworks in this milestone*.
- **Cadence**: 1-2 working sessions per week — *standard granularity (5-8 medium phases) so each session has a clear deliverable*.
- **Budget**: $100/month OpenRouter cap, BYOK so the cap covers BYOK fees only (~5% of provider spend) — *Quality+Research can run multi-dollar queries; selector design must surface cost so the user picks consciously*.
- **Privacy**: BYOK on the three big providers, no free-tier models, no third-party providers (Together, Fireworks, Venice, etc.) — *imposed by the OpenRouter account allowlist; respected by the existing `PUBLISHER_TO_PROVIDER` map and must continue to be respected when adding research models*.
- **Single-user, local-only**: backend bound to `127.0.0.1`, no auth, no rate limiting — *acceptable because the only attacker model is "another process on the same machine", and Vuln 2 fix closes that surface*.
- **UX-first**: visible-UI work cannot start until the UX research phase has produced artifacts — *avoids the "rebrand by guessing" failure mode the user explicitly wants to avoid*.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bind backend to `127.0.0.1` instead of `0.0.0.0` | Closes Vuln 1: prevents any LAN device from invoking the API and draining OpenRouter credits. CORS does not protect against non-browser clients. | ✓ Good (deployed in `b0aca40`) |
| BYOK with `provider.only=[publisher]` per call | OpenRouter account is on free tier with a strict provider allowlist; BYOK lets per-provider billing flow to the user's own OpenAI/Anthropic/Google accounts and avoids OpenRouter's pool entirely (5% fee only). | — Pending (validated end-to-end in current session, awaiting milestone production use) |
| Quality dial as 3 profiles (`Fast` / `Quality` / `Quality+Research`), per-query toggle | Per-query gives maximum flexibility vs global setting — user routinely alternates between trivial and important queries. Three discrete profiles keep cognitive load low vs free-form model picker. | — Pending |
| Pragmatic deep research, not agentic | Full agentic deep research is 500-800 LoC of new code, multi-minute waits, costs $1-5/query. Pragmatic version (reasoning models + web search + optional Stage 4) covers 80% of the value at 20% of the complexity. | — Pending |
| UX research as a dedicated early phase | "Frontier UX/UI skills" applied research-first, not feature-by-feature, prevents fragmented design and gives the visual rework a clear brief. | — Pending |
| Single-shot conversation design preserved | The "1 conversation = 1 deliberation" mental model is what makes the council format make sense; turning it into ChatGPT-style multi-turn would dilute the differentiator. | — Pending (validated implicitly by user keeping it in Out of Scope) |
| Active scope deferred from previous fork session: copy-final-answer button, regenerate-with-other-profile button, persist label_to_model and aggregate_rankings metadata | Not in user's stated v1 priorities; cheap to add later; not blockers for the Quality dial core value. | — Pending (in backlog, revisit at milestone close) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-09 after initialization*
