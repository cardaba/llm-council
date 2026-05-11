---
status: complete
quick_id: 260511-mqt
completed: 2026-05-11
description: Critique-mode parity fixes (Bug C+D+E). Bug F deferred to a separate quick task.
classification: Phase 5 carry-over (critique-mode parity polish after Bug A/B/B-twin shipped)
files_changed:
  - frontend/src/utils/download.js
  - frontend/src/components/ChatInterface.jsx
  - frontend/src/components/Stage3.jsx
  - backend/council.py
  - backend/main.py
commits:
  - cf6b61b — fix(260511-mqt): extend download builders for critique mode (C+D)
  - 4024df4 — fix(260511-mqt): defensive title generation for critique (E)
deferred:
  - Bug F (critique deliberation lost on browser disconnect) is OUT OF SCOPE.
user_action_required: true
restart_required: true
---

# Phase quick-260511-mqt: Critique-mode export parity + title rename fix

## One-liner

Three critique-mode parity bugs (C/D/E) closed: downloaded conversation .md now includes source materials and uses Critique instruction labels; final-answer .md uses the same label; new critique conversations now get renamed (or, if the title model still fails, the cause is logged to stderr instead of swallowed).

## Diff summary

| File | Lines | What |
|------|-------|------|
| frontend/src/utils/download.js | +47 / -6 | buildFullDeliberationMarkdown accepts mode + externalResearch (dual-signal isCritique detection); emits ## Source materials section with full file content; toggles Stage 1 header between Individual Responses and Individual Critiques; toggles input label between Question and Critique instruction. buildFinalAnswerMarkdown accepts mode and toggles the same input label. |
| frontend/src/components/ChatInterface.jsx | +3 / -0 | handleDownloadConversation passes mode + external_research. Stage3 render adds mode={conversation.mode} prop. |
| frontend/src/components/Stage3.jsx | +3 / -1 | Accept mode prop; forward to buildFinalAnswerMarkdown. |
| backend/council.py | +13 / -0 | generate_conversation_title: input truncation to 1500 chars; empty-string fallback returns New Conversation. |
| backend/main.py | +8 / -2 | import sys; critique title block except Exception: pass replaced with stderr log. |

Net: 5 files, ~75 lines added, ~9 lines removed. Additive only. No new dependencies. No persistence shape changes.

## Before / after rationale per bug

### Bug C — download conversation incomplete for critique

Before: handleDownloadConversation called buildFullDeliberationMarkdown without external_research or mode. The export labeled the critique instruction as Question, labeled Stage 1 as Individual Responses, and had no record of the source materials whatsoever (3 research files up to 750KB each, all missing from the export).

After: The builder receives mode and externalResearch. When mode === 'critique' (or, defensively, when externalResearch is non-empty), it renders the Critique instruction label, inserts a ## Source materials section between metadata header and Stage 1 with full per-file content (no truncation — server caps at 750KB per slot per CRIT-08 / D-04; export is an audit artifact), and renames the Stage 1 header to Individual Critiques.

Verdict: Direct surface fix. Builder was missing two destructured params; call site missing two values; both filled via a tiny prop drill. Dual-signal isCritique = (mode === 'critique') || (externalResearch && non-empty) defends against future callers forgetting to pass mode.

### Bug D — download final answer mislabels critique input

Before: Stage3.handleDownload called buildFinalAnswerMarkdown without mode; the downloaded final-answer .md said Question even for critique messages.

After: ChatInterface passes mode={conversation.mode} to Stage3; Stage3 forwards to the builder; the builder toggles the input label.

Verdict: Same root cause as Bug C (missing param threading); same fix; same byte-stability guarantee for fresh-prompt exports.

### Bug E — critique conversations do not auto-rename

Before: backend/main.py:615-621 wrapped the critique-mode title call in try/except Exception: pass. If generate_conversation_title returned an empty string (gemini-2.5-flash sometimes returns a newline that survives .strip as empty), storage.update_conversation_title('') succeeded and the sidebar showed New Conversation forever. If the title call raised, the exception was silently swallowed.

After: Two coordinated defensive changes:
1. council.py: input truncation to 1500 chars (cheap insurance against long-rubric inputs); empty-string fallback after .strip that returns New Conversation. Fresh-prompt path benefits identically.
2. main.py: except Exception: pass becomes except Exception as e: print(f'[critique title] generation failed for conversation {id}: {e!r}', file=sys.stderr). Try scope unchanged; only the swallow becomes a log.

Root-cause verdict: Most likely diagnosis was empty/whitespace return from gemini-2.5-flash (PLAN.md hypothesis #1) — the council.py fallback addresses that directly. If a different failure mode is firing in production, the next critique run leaves a diagnostic stderr breadcrumb for the next session.

Operator constraint: Bug F (critique deliberation lost on browser disconnect) is explicitly NOT addressed. The critique deliberation flow (send_critique_stream event generator, _spawn_background_deliberation, external_context handling) was deliberately untouched beyond the one stderr log change. Bug F is queued as a separate quick task with --discuss.

## Fresh-prompt regression guard

The fresh-prompt export path is byte-stable:
- isCritique is false → input label stays Question;
- No externalResearch → no ## Source materials section emitted;
- Stage 1 header stays Individual Responses;
- Stage 2 / Stage 3 / Critic / Stage 4 / profile-footer sections render identically.

Backend: the fresh-prompt title task (main.py:276 via asyncio.create_task) was intentionally untouched — its current await title_task happens without a wrapping try/except, so it is a separate failure surface that was not part of this task's scope.

## Verification gates (executor-run, all passed)

| Gate | Command | Result |
|------|---------|--------|
| Critique instruction in both builders | grep 'Critique instruction' frontend/src/utils/download.js | 3 matches (JSDoc + 2 builders) |
| externalResearch param surface | grep externalResearch frontend/src/utils/download.js | 5 matches |
| ChatInterface passes mode | grep 'mode: conversation.mode' ChatInterface.jsx | 1 match (line 138) |
| Stage3 receives mode prop | grep 'mode={conversation.mode}' ChatInterface.jsx | 1 match (line 308) |
| main.py logs critique-title failure | grep 'critique title' backend/main.py | 1 match (line 627) |
| council.py empty-string fallback | grep 'if not title' backend/council.py | 1 match (line 479) |
| council.py 1500-char truncation | grep 'user_query[:1500]' backend/council.py | 1 match (line 452) |
| Backend module import | uv run python -c "from backend import main, council; print('OK')" | exit 0 |
| Frontend build | cd frontend && npx vite build | exit 0, 541 modules transformed, no errors |

## MANDATORY user-action note (Bug E + critique title)

You MUST restart the backend to pick up import sys, the new logging line, and the new generate_conversation_title truncation/fallback. The frontend changes hot-reload through Vite.

Stop existing backend (Ctrl+C in its terminal), then from C:/GIT/llm-council run: uv run python -m backend.main

No frontend restart required if the Vite dev server is running — HMR picks up .js/.jsx changes. If testing against a static production build (npx vite build output), rebuild.

## Manual smoke checklist (for the user)

After backend restart:

1. Bug C — download critique conversation includes source materials. Open an existing critique conversation (3 file chips visible). Click Download conversation. Open the downloaded .md and verify: first line under title says **Critique instruction** (NOT Question); a ## Source materials section appears between the --- separator and Stage 1, listing all 3 files with full markdown content (not truncated); Stage 1 heading is ## Stage 1 — Individual Critiques.

2. Bug D — download final answer uses correct label. Inside the same critique conversation, scroll to Stage 3 and click Download .md. Open the .md and verify: first line under title says **Critique instruction**.

3. Bug E — new critique conversation gets renamed. New conversation → critique mode → drop 3 research files → enter critique instruction → submit. Wait for Stage 3 to complete. Sidebar title should change away from New Conversation. If it stays New Conversation, check backend stderr (the terminal running uv run python -m backend.main) for a [critique title] generation failed for conversation <id>: ... line. That is the diagnostic breadcrumb — report the exception type to the next session.

4. Negative regression check — fresh-prompt export is byte-stable. Open an existing fresh-prompt conversation. Click Download conversation: input label is **Question** (unchanged); no ## Source materials section anywhere; Stage 1 heading is ## Stage 1 — Individual Responses. Click Stage 3 Download .md: input label still **Question**.

## Self-Check: PASSED

All claimed files exist and contain the documented changes. Both commits exist in git log (cf6b61b, 4024df4). Backend import smoke exit 0. Frontend vite build exit 0.
