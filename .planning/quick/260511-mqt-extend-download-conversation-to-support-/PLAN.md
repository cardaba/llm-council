---
phase: quick-260511-mqt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/utils/download.js
  - frontend/src/components/ChatInterface.jsx
  - frontend/src/components/Stage3.jsx
  - backend/main.py
  - backend/council.py
autonomous: true
requirements:
  - BUG-C-download-conversation-incomplete-for-critique
  - BUG-D-download-final-answer-mislabels-critique-input
  - BUG-E-critique-conversations-dont-auto-rename
user_setup: []

must_haves:
  truths:
    - "Downloading a critique conversation produces a .md whose first metadata line says 'Critique instruction' (NOT 'Question')."
    - "That .md contains a '## Source materials' section listing every uploaded research file (modelId, filename, full markdown content)."
    - "The Stage 1 section header in that .md says 'Individual Critiques' (NOT 'Individual Responses') when the message is critique-mode."
    - "Downloading the final answer .md from inside a critique conversation also uses the 'Critique instruction' label."
    - "Fresh-prompt (non-critique) downloads remain byte-identical to the pre-change behavior except where the export touches NEW additive sections."
    - "Critique conversations no longer stay titled 'New Conversation' indefinitely — either the title gets renamed, or the backend log shows WHY the rename failed."
  artifacts:
    - path: frontend/src/utils/download.js
      provides: "buildFullDeliberationMarkdown + buildFinalAnswerMarkdown extended to accept `mode` and `externalResearch` params."
      contains: "function buildFullDeliberationMarkdown"
    - path: frontend/src/components/ChatInterface.jsx
      provides: "handleDownloadConversation passes mode + external_research to the builder."
      contains: "handleDownloadConversation"
    - path: frontend/src/components/Stage3.jsx
      provides: "Stage3 forwards `mode` to buildFinalAnswerMarkdown."
      contains: "buildFinalAnswerMarkdown"
    - path: backend/council.py
      provides: "generate_conversation_title truncates input + has a deterministic fallback when the title model returns empty/garbage."
      contains: "generate_conversation_title"
    - path: backend/main.py
      provides: "Critique title-generation try/except logs the exception to stderr instead of silently swallowing."
      contains: "[critique title]"
  key_links:
    - from: ChatInterface.jsx::handleDownloadConversation
      to: download.js::buildFullDeliberationMarkdown
      via: "params object adds `mode: conversation.mode` + `externalResearch: msg.external_research`"
      pattern: "externalResearch"
    - from: Stage3.jsx
      to: download.js::buildFinalAnswerMarkdown
      via: "prop chain ChatInterface → Stage3 → buildFinalAnswerMarkdown (mode)"
      pattern: "mode"
    - from: backend/main.py::critique title block (line 615-621)
      to: backend/council.py::generate_conversation_title
      via: "passes critique_instruction; council.py truncates internally; main.py catches+logs on failure"
      pattern: "[critique title]"
---

<objective>
Close three critique-mode parity bugs (C/D/E) from manual smoke testing after Bug A/B/B-twin shipped. All three are "the critique path exists but doesn't share the same UX as fresh":

- **Bug C:** `handleDownloadConversation` doesn't include `external_research`; mislabels the critique instruction as "Question"; mislabels Stage 1 as "Individual Responses".
- **Bug D:** `buildFinalAnswerMarkdown` mislabels critique instruction as "Question".
- **Bug E:** Critique conversations don't get renamed by `generate_conversation_title` AND the silent `except Exception: pass` hides why.

Purpose: complete the fresh↔critique parity story for export and auto-titling. The export bug matters for audit/sharing — a user critiquing 3 long research notes today gets a markdown export that has lost the source materials and labels the workflow incorrectly. The title bug matters for sidebar navigability — critique conversations are indistinguishable from unfinished fresh ones.

Output: 3 frontend file edits (download.js + ChatInterface.jsx + Stage3.jsx) + 2 backend edits (council.py + main.py). Additive only; existing fresh-prompt exports stay byte-stable.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

# Builder functions to extend (Bug C + D landing surface)
@frontend/src/utils/download.js

# Call sites
@frontend/src/components/ChatInterface.jsx
@frontend/src/components/Stage3.jsx

# Persistence shape for external_research (CRIT-08 lock — DO NOT change shape)
@frontend/src/components/ExternalResearchPanel.jsx

# Backend critique title path (Bug E root-cause surface)
# - backend/main.py:615-621 is the silent try/except block
# - backend/council.py:437 is generate_conversation_title (line 437-472)

<interfaces>
<!-- Key shapes the executor needs. Extracted from the codebase so the executor
     doesn't have to spelunk to find them. -->

## External research shape (persisted on the assistant message)

From backend/storage.py:222 and frontend/src/App.jsx:438:

```
external_research = {
  "openai/gpt-5.5": {
    filename: "...",
    content: "<full markdown content of the uploaded file>",
    size_bytes: 12345,
  },
  "anthropic/claude-opus-4.7": { filename, content, size_bytes },
  "google/gemini-2.5-flash": { filename, content, size_bytes },
}
```

Persisted ON THE ASSISTANT MESSAGE (`msg.external_research`), not on the conversation root. Empty/absent for fresh-prompt messages. Backend cap MAX_CRITIQUE_FILE_BYTES = 750 * 1024 (D-04 lock — already capped on write).

## Conversation mode

From backend/main.py:635 (persisted in metadata):

```
msg.metadata.mode === 'critique'   // when critique flow ran
```

Also available at conversation level: `conversation.mode === 'critique'` (frontend App.jsx:105). The download handler has `conversation` in scope already.

**Detection signal precedence inside the builder:**
1. Prefer the explicit `mode` parameter passed by the caller.
2. Fallback: if `externalResearch` truthy with at least one entry, treat as critique.
This dual signal protects against future callers that forget to pass `mode`.

## Current builder signatures (pre-change)

```javascript
// download.js
export function buildFinalAnswerMarkdown({ question, finalResponse, stage4 })
export function buildFullDeliberationMarkdown({
  question, stage1, stage2, stage3, stage4,
  metadata, critic, messageMetadata,
})
```

## Current title-generation block (Bug E target)

```python
# backend/main.py:615-621
try:
    title = await generate_conversation_title(critique_instruction)
    storage.update_conversation_title(conversation_id, title)
    await queue.put({"type": "title_complete", "data": {"title": title}})
except Exception:
    pass  # fresh-prompt path also tolerates title failure
```

```python
# backend/council.py:437-472 — current generate_conversation_title
# - Takes `user_query`
# - Builds title_prompt with `{user_query}` interpolated raw (no truncation)
# - Calls query_model("google/gemini-2.5-flash", ..., timeout=30.0)
# - If response is None → returns "New Conversation"
# - Cleans quotes, truncates to 50 chars
```

**Most likely root cause of Bug E:**
- A critique instruction is short ("Critique the rigor of these three research notes on X") — token-limit failure is UNLIKELY from instruction alone.
- The fresh-prompt path works fine, so it's NOT a structural bug in `generate_conversation_title`.
- Hypothesis chain (most → least likely):
  1. **Empty/whitespace title return** — gemini-2.5-flash sometimes returns just a newline or empty string after `.strip()`, and we proceed to `update_conversation_title("")` which storage accepts as a valid (empty) title. Fix: enforce a `if not title: title = "New Conversation"` fallback in council.py.
  2. **Title arrives BEFORE the SSE consumer is ready** — fresh-prompt fires `title_complete` after `stage3_complete`; the React reducer reads it. If critique flow has a different reducer path (it doesn't — it shares handleStreamEvent), this would surface. Unlikely.
  3. **Exception thrown silently** — backend prints nothing because of `except Exception: pass`. Adding `print(..., file=sys.stderr)` will reveal which case is actually firing in production.
- Conclusion: ship BOTH (a) the deterministic empty-string fallback in council.py AND (b) the stderr logging in main.py. If the empty-string fallback is the right diagnosis, titles start landing immediately; if not, the next critique run leaves diagnostic breadcrumbs for the user.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend builders for critique-mode export (Bug C + D)</name>
  <files>frontend/src/utils/download.js, frontend/src/components/ChatInterface.jsx, frontend/src/components/Stage3.jsx</files>
  <action>
Make the markdown export aware of critique mode. Three coordinated edits.

(1) **frontend/src/utils/download.js** — extend BOTH builders.

In `buildFullDeliberationMarkdown`, add two new destructured params: `mode` and `externalResearch`. Compute `isCritique = mode === 'critique' || (externalResearch && Object.keys(externalResearch).length > 0)` (dual-signal per the interface notes; defends against callers that forget to pass `mode`).

- Replace `**Question**: ${question || '_(unknown)_'}` with a label that branches on `isCritique`: when critique, emit `**Critique instruction**: ${question || '_(unknown)_'}`; otherwise keep the existing `**Question**` line verbatim. Do NOT change behavior or label for fresh.
- After the `**Exported**` line and the leading `---`, when `isCritique` is true AND `externalResearch` has entries, emit a new section:
  ```
  ## Source materials

  ### `${modelId}` — ${filename} (${(size_bytes/1024).toFixed(1)}KB)

  ${content}
  ```
  for each entry in `externalResearch` (iteration order: `Object.entries(externalResearch)`, no sort). DO NOT truncate content — these files were already capped server-side at 750KB per CRIT-08 (D-04), and the export is an audit artifact (full inclusion is the point). After the last source-material block, emit `---` and a blank line as separator before Stage 1.
- The Stage 1 header: when `isCritique`, emit `## Stage 1 — Individual Critiques`; otherwise keep `## Stage 1 — Individual Responses` verbatim.
- Do NOT touch Stage 2 / Stage 3 / Critic / Stage 4 sections. They render the same in either mode.

In `buildFinalAnswerMarkdown`, add the new destructured param `mode`. Compute `isCritique = mode === 'critique'` (no `externalResearch` available here; Stage3 will pass mode explicitly). Replace `**Question**: ${question || '_(unknown)_'}` with a `isCritique ? '**Critique instruction**' : '**Question**'` branch on the label keyword. Nothing else changes.

Keep JSDoc on both functions updated: add a one-line `@param {string} [mode] - 'critique' switches labels; otherwise fresh-prompt labels.` and `@param {Object} [externalResearch] - {modelId: {filename, content, size_bytes}}; appended as '## Source materials' when present.` for buildFullDeliberationMarkdown.

(2) **frontend/src/components/ChatInterface.jsx** — update `handleDownloadConversation` (currently ChatInterface.jsx:127) to pass the two new params. After existing `question = findQuestionFor(...)`, the call becomes:

```
buildFullDeliberationMarkdown({
  question,
  stage1: msg.stage1,
  stage2: msg.stage2,
  stage3: msg.stage3,
  stage4: msg.stage4,
  metadata: msg.metadata,
  messageMetadata: msg.metadata,
  critic: msg.critic,
  mode: conversation.mode,
  externalResearch: msg.external_research,
});
```

`conversation.mode` is already in scope (it's the prop). `msg.external_research` is the field name persisted by backend/storage.py:273 and hydrated by ExternalResearchPanel — same key, no mapping needed. No other change to ChatInterface.jsx.

(3) **frontend/src/components/Stage3.jsx** — thread `mode` through.

Add `mode` to the Stage3 props (current signature: `function Stage3({ finalResponse, question, stage4 })` → `function Stage3({ finalResponse, question, stage4, mode })`). Pass it to `buildFinalAnswerMarkdown({ question, finalResponse, stage4, mode })` in the existing `handleDownload`. Then in ChatInterface.jsx, at the existing `<Stage3 ... />` render site (around ChatInterface.jsx:300-308), add `mode={conversation.mode}` to the JSX prop list. Tiny prop drill, no Context API.

Verify the prop chain renders without React warnings.

The result: a critique export contains the 3 source .md files inline, says "Critique instruction" instead of "Question", and labels Stage 1 as "Individual Critiques". A fresh export is byte-identical to today.
  </action>
  <verify>
    <automated>cd frontend && npm run lint 2>&1 | tail -20</automated>
    Manual smoke (user will do, NOT executor): (a) open an existing critique conversation in the UI, click Download conversation, open the .md → confirm '## Source materials' section + 'Critique instruction' label + 'Individual Critiques' header. (b) click Stage 3 download .md → confirm 'Critique instruction' label. (c) open a fresh-prompt conversation, click Download conversation → confirm export is identical to pre-change (no 'Source materials' section, 'Question' label, 'Individual Responses' header).
  </verify>
  <done>
download.js exports `buildFullDeliberationMarkdown` and `buildFinalAnswerMarkdown` with `mode` (both) and `externalResearch` (first only) as accepted params. ChatInterface.jsx and Stage3.jsx pass both. Lint clean. Fresh-prompt path produces byte-identical exports.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix critique title-rename silent failure (Bug E)</name>
  <files>backend/council.py, backend/main.py</files>
  <action>
Two coordinated edits — minimal, instrumented, non-invasive.

(1) **backend/council.py** — harden `generate_conversation_title` (line 437-472).

After the existing line that strips quotes (`title = title.strip('"\'')`), add an empty-string fallback BEFORE the length-truncation block:

```python
if not title:
    return "New Conversation"
```

This catches the most likely root cause (gemini-2.5-flash returning whitespace/empty for some inputs, surviving `.strip()` as `""`, then `update_conversation_title("")` succeeds and the sidebar shows nothing useful). It's also safe for the fresh-prompt path — fresh queries that produce empty titles get the same fallback the `response is None` branch already returns.

Also: truncate over-long inputs defensively. Add at the very top of the function (right after the docstring, before `title_prompt = ...`):

```python
# Critique instructions can be long; cap at 1500 chars so the title model
# doesn't get a wall of text. Fresh-prompt questions are rarely this long.
if user_query and len(user_query) > 1500:
    user_query = user_query[:1500].rstrip() + "..."
```

Rationale: a critique instruction is typically short ("Critique these notes on X"), but if the user pasted a long rubric into the instruction textarea, the title model could hit input quirks. 1500 chars is well below any token budget; cheap insurance.

(2) **backend/main.py** — log silent failures.

Add `import sys` to the existing import block at top (or use `import traceback` — author's choice; `sys.stderr` print is sufficient for now). Then at backend/main.py:615-621, replace:

```python
try:
    title = await generate_conversation_title(critique_instruction)
    storage.update_conversation_title(conversation_id, title)
    await queue.put({"type": "title_complete", "data": {"title": title}})
except Exception:
    pass  # fresh-prompt path also tolerates title failure
```

with:

```python
try:
    title = await generate_conversation_title(critique_instruction)
    storage.update_conversation_title(conversation_id, title)
    await queue.put({"type": "title_complete", "data": {"title": title}})
except Exception as e:
    # Bug E (260511-mqt) — surface the cause instead of swallowing silently.
    # Fresh-prompt path also tolerates title failure; we just log it now.
    print(f"[critique title] generation failed for conversation {conversation_id}: {e!r}", file=sys.stderr)
```

DO NOT narrow the try scope or remove the try entirely (constraint lock). Keep the try wrapping the same three statements — but the executor MAY add the same stderr logging to the fresh-prompt title path if a similar `except Exception: pass` block exists nearby (search for the pattern; if found, instrument it the same way for symmetry).

Constraint check: no new dependencies. `sys.stderr` is stdlib. No behavioral change beyond the new fallback in council.py + new log line in main.py.
  </action>
  <verify>
    <automated>cd C:/GIT/llm-council && uv run python -c "import asyncio; from backend.council import generate_conversation_title; print(asyncio.run(generate_conversation_title('Critique the rigor of these three research notes on quantum error correction in superconducting qubits')))"</automated>
    Expected: a non-empty 3-5 word title printed to stdout (e.g. "Critique Quantum Error Correction"). If gemini-2.5-flash returns empty, the new fallback kicks in and prints "New Conversation" — not the bug, but proves the fallback works.

    Manual smoke (user will do, NOT executor): start a NEW critique conversation in the UI. After Stage 3 completes, the sidebar entry should be renamed away from "New Conversation". If it doesn't rename, check backend stdout/stderr for `[critique title] generation failed` log lines and report the exception to the next session.
  </verify>
  <done>
backend/council.py has empty-string fallback + 1500-char input truncation in `generate_conversation_title`. backend/main.py logs `[critique title] generation failed: ...` to stderr instead of `pass`. The try/except is retained per constraint. `uv run python -c "..."` smoke from the verify section produces a non-empty title string.
  </done>
</task>

</tasks>

<verification>
- `npm run lint` in frontend/ is clean (no new errors introduced; pre-existing warnings in App.jsx:25-29 are acknowledged tech debt per STATE.md).
- The one-liner uv smoke command for `generate_conversation_title` returns a non-empty string.
- Manual smoke (user): exporting a critique conversation produces a .md with `## Source materials` + correct labels; starting a new critique conversation gets renamed away from "New Conversation" within seconds of Stage 3 completing.
</verification>

<success_criteria>
- Bug C: critique downloads include `external_research` content + use correct labels. CONFIRMED by markdown inspection.
- Bug D: critique final-answer downloads use "Critique instruction" label. CONFIRMED by markdown inspection.
- Bug E: critique conversations get renamed (or the failure is logged to stderr with a diagnosable exception). CONFIRMED by sidebar title change OR by stderr breadcrumb.
- Fresh-prompt exports unchanged (byte-stable for everything except sections that were already conditionally rendered).
- No new dependencies. No persistence shape changes. No test additions (quick-task scope).
</success_criteria>

<output>
After completion, create `.planning/quick/260511-mqt-extend-download-conversation-to-support-/SUMMARY.md` documenting: files changed, root-cause verdict per bug, and whether the manual smoke produced clean renames (or the first captured stderr log line if Bug E persists with the truncation+fallback in place — that'd be a real diagnostic data point for the next session).
</output>
