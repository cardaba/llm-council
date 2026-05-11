---
phase: quick-260511-lcu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/main.py
  - frontend/src/components/DropZoneSlot.jsx
autonomous: false
requirements:
  - QUICK-A — critique source-MD picker accepts .md/.txt (CRIT-02)
  - QUICK-B — critique mode pill survives reload (D-02 / 05-01 contract)
must_haves:
  truths:
    - "On reload, conversations created in critique mode still show the 'Critique' pill in the sidebar."
    - "User can attach a .md file to each of the 3 critique slots via the picker on Windows + Chrome / Edge."
    - "Submit critique still POSTs the 3-file multipart and drains the SSE without regression."
  artifacts:
    - path: "backend/main.py"
      provides: "ConversationMetadata Pydantic model includes `mode` field so /api/conversations surfaces it"
      contains: "mode: Literal[\"fresh\", \"critique\"] = \"fresh\""
    - path: "frontend/src/components/DropZoneSlot.jsx"
      provides: "Picker accepts .md/.txt across Windows file-dialog MIME registry inconsistencies"
      contains: "accept="
  key_links:
    - from: "backend/storage.py:list_conversations()"
      to: "frontend Sidebar `conv.mode === 'critique'` pill"
      via: "GET /api/conversations response_model=List[ConversationMetadata]"
      pattern: "ConversationMetadata.*mode"
    - from: "DropZoneSlot.jsx <input type=file>"
      to: "CritiqueWelcome.handleFile -> setSlots"
      via: "onChange={handlePicked} -> onFile(file) -> readFileAsText"
      pattern: "accept=\".*\\.md.*\""
---

<objective>
Fix two regressions surfaced by user smoke test on critique mode:

**Bug B (root cause confirmed):** `backend/main.py:78-84` defines `ConversationMetadata` Pydantic model without a `mode` field. The `GET /api/conversations` endpoint uses `response_model=List[ConversationMetadata]`, which causes FastAPI to silently strip `mode` from the response even though `storage.list_conversations()` correctly returns it (verified: `backend/storage.py:186` returns `"mode": data.get("mode", "fresh")` per 05-01-SUMMARY.md line 101). Result: after reload, every conversation arrives without `mode`, so `conv.mode === 'critique'` in `Sidebar.jsx:116` is always falsy and the pill disappears. Fix is a one-line schema extension.

**Bug A (root cause hypothesis — diagnostic-first task):** The JS chain in `DropZoneSlot.jsx` (handleClick → `<input accept=".md,.txt">` → handlePicked → onFile) and `CritiqueWelcome.jsx` (handleFile → size/extension validation → setSlots) is structurally correct. The most plausible failure mode on Windows + Chrome / Edge is the native file-dialog filter built from `accept=".md,.txt"`: Windows' MIME registry frequently lacks `text/markdown`, and Chrome treats the dotted-extension list strictly, hiding `.md` files from the dialog unless "All files" is picked. Secondary candidates (rejected by code reading): handlePicked never fires (no — `e.target.value = ''` reset is present and correct), drop handler missing preventDefault (no — present line 50), extension regex too strict (no — `lower.endsWith('.md')` is canonical). The plan diagnoses first with a 2-minute manual smoke + transient console logging, then applies the right fix. If the dialog DOES show the file but the upload then fails, the executor must capture the actual error path and adjust.

Purpose: restore CRIT-02 contract (per-model file picker, .md/.txt only) and the critique pill persistence contract.
Output: 2-file change (backend Pydantic + frontend accept attr), no schema migration, no new deps, no test files (quick-task constraint).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:\GIT\llm-council\CLAUDE.md
@C:\GIT\llm-council\.planning\STATE.md

# Bug B — files that establish the contract
@C:\GIT\llm-council\backend\storage.py
@C:\GIT\llm-council\backend\main.py
@C:\GIT\llm-council\frontend\src\components\Sidebar.jsx
@C:\GIT\llm-council\frontend\src\App.jsx

# Bug A — files that own the upload chain
@C:\GIT\llm-council\frontend\src\components\DropZoneSlot.jsx
@C:\GIT\llm-council\frontend\src\components\CritiqueWelcome.jsx
@C:\GIT\llm-council\frontend\src\utils\download.js

# Phase 5 Plan 01 confirmed storage layer + create endpoint both carry `mode`,
# but the listing response_model was never extended. This is the loose end.
@C:\GIT\llm-council\.planning\phases\05-critique-mode-schema-migration-in-conversation-navigation\05-01-SUMMARY.md

<interfaces>
<!-- Contract that ConversationMetadata MUST satisfy after the fix -->
<!-- Source: storage.list_conversations() in backend/storage.py:181-187 -->

Storage returns per-conversation:
```python
{
    "id": str,
    "created_at": str,
    "title": str,
    "message_count": int,
    "mode": "fresh" | "critique",   # default "fresh" via data.get("mode", "fresh")
}
```

Current Pydantic filter at backend/main.py:78-84:
```python
class ConversationMetadata(BaseModel):
    id: str
    created_at: str
    title: str
    message_count: int
    # MISSING: mode field — causes silent drop on response_model serialization
```

Frontend consumers that read `conv.mode`:
- `frontend/src/components/Sidebar.jsx:116` — `{conv.mode === 'critique' && <span className="conversation-pill">Critique</span>}`
- `frontend/src/App.jsx:81` — `mode: newConv.mode || 'fresh'` (fallback already in place; just needs server to send it)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restore `mode` field in ConversationMetadata so the critique pill survives reload (Bug B)</name>
  <files>backend/main.py</files>
  <action>
Extend the `ConversationMetadata` Pydantic model at `backend/main.py:78-84` to include the `mode` field that `storage.list_conversations()` already returns. Add the field after `message_count` using the same `Literal["fresh", "critique"]` type already used in `CreateConversationRequest` (same file, line 66) for symmetry. Default to `"fresh"` so any legacy on-disk file lacking the key (lazy-migrated by `storage._migrate_conversation_if_needed`) still round-trips.

Exact edit:
- Insert after `message_count: int` line:
  - `mode: Literal["fresh", "critique"] = "fresh"`
- `Literal` and `Optional` are already imported at the top of the file (line 7) — no new imports needed.

DO NOT touch `Conversation` (the full-conversation model used by `GET /api/conversations/{id}`) — it does not need `mode` to fix the bug, the field is opaque-passed through `messages` and root-level keys are not filtered there (uses `Dict[str, Any]` for messages already and the outer keys are tolerated). Add a 2-line code comment crediting 05-01 SUMMARY line 101 and explaining the silent-drop trap.

After editing, run a manual single-shell verification (instructions in `<verify>` below) that hits the live endpoint with curl. NO Python tests are added (quick-task constraint: no test files).
  </action>
  <verify>
    <automated>
cd C:/GIT/llm-council; uv run python -c "from backend.main import ConversationMetadata; m = ConversationMetadata(id='x', created_at='y', title='z', message_count=0, mode='critique'); assert m.mode == 'critique'; m2 = ConversationMetadata(id='x', created_at='y', title='z', message_count=0); assert m2.mode == 'fresh'; print('OK')"
    </automated>
  </verify>
  <done>
- `ConversationMetadata` carries `mode: Literal["fresh", "critique"] = "fresh"`.
- The one-liner pydantic import test above prints `OK`.
- `/api/conversations` response will now include `mode` per-item (verified at checkpoint Task 3).
  </done>
</task>

<task type="auto">
  <name>Task 2: Diagnose-and-fix DropZoneSlot picker — verify failure path, then loosen accept filter (Bug A)</name>
  <files>frontend/src/components/DropZoneSlot.jsx</files>
  <action>
**Step 1 — diagnose (do NOT skip).** Before changing the picker, the executor must confirm the actual failure path because the JS code reads as correct. Add a TRANSIENT 3-line debug log at the entry of `handlePicked` (line ~57) and `handleDrop` (line ~49) to expose what fires:

```
Inside handlePicked:
  console.log('[DropZoneSlot] handlePicked fired', { hasFile: !!e.target.files?.[0], name: e.target.files?.[0]?.name, size: e.target.files?.[0]?.size });

Inside handleDrop (after preventDefault, before the slot check):
  console.log('[DropZoneSlot] handleDrop fired', { hasFile: !!e.dataTransfer.files?.[0], name: e.dataTransfer.files?.[0]?.name });
```

Also add ONE log inside `CritiqueWelcome.handleFile` (file `frontend/src/components/CritiqueWelcome.jsx`, line ~80, immediately after the function body opens) to expose validation outcome:

```
console.log('[CritiqueWelcome.handleFile]', { idx, name: file.name, size: file.size, endsWithMd: file.name.toLowerCase().endsWith('.md'), endsWithTxt: file.name.toLowerCase().endsWith('.txt') });
```

(NOTE: this means Task 2 also touches `CritiqueWelcome.jsx` for the diagnostic. Add `frontend/src/components/CritiqueWelcome.jsx` to `files_modified` mentally — the final edit will remove the log so the net diff for that file is zero, but the executor must update the file twice within Task 2.)

Start the dev servers per `start.sh` (or `bash start.sh`) and ask the USER to:
  1. Open http://localhost:5173, click "+ New critique"
  2. Try the picker for slot 1 (click area) → pick any `.md` file
  3. Try drag-and-drop a `.md` file onto slot 2
  4. Try the picker again with a `.txt` file in slot 3
  5. Open DevTools Console, screenshot/paste the log output
  6. Specifically report whether the FILE-PICKER DIALOG itself showed the `.md` files or whether they appeared greyed-out / hidden until "All files" was selected

This is a `checkpoint:human-verify` gate (Task 3, blocking).

**Step 2 — apply the fix matching the captured failure path.** Three branches, executor picks the one the diagnostic confirms:

  - **Branch A (most likely — picker dialog filter hides `.md`):** Loosen the `accept` attribute at `DropZoneSlot.jsx:104` from `accept=".md,.txt"` to `accept=".md,.markdown,.txt,text/markdown,text/plain"`. The validation in `CritiqueWelcome.handleFile` (lines 93-99) already enforces the extension on the JS side post-pick, so widening the dialog filter is safe. Add a one-line comment crediting Bug A diagnosis.

  - **Branch B (handlePicked never fires — onChange not attaching):** Switch the input event handling from `onChange={handlePicked}` to `onInput={handlePicked}` (some Chrome versions on Windows have observed regressions where `onChange` fires only on blur for hidden inputs). Keep `onChange` as a fallback by registering both. Less likely, but cheap.

  - **Branch C (handleFile rejects valid files — extension check):** The `lower.endsWith('.md')` check is canonical and cannot fail for genuine `.md` files. If the diagnostic somehow shows this branch fires falsely, the file name probably has a trailing dot or hidden suffix (`.md.txt`, `.md ` with trailing space). Trim the comparison: `lower.trim().endsWith('.md')`. Edit lives in `CritiqueWelcome.jsx:94`, NOT in DropZoneSlot.

**Step 3 — remove all transient `console.log` lines** added in Step 1. Final diff for `DropZoneSlot.jsx` is the `accept` widening (Branch A) OR the `onChange/onInput` change (Branch B); final diff for `CritiqueWelcome.jsx` is either the trim() change (Branch C) or zero net change.

DO NOT add new state, DO NOT redesign the slot layout, DO NOT touch `DropZoneSlot.css`. CSS/JS only, single root cause.

If the diagnostic reveals an UNEXPECTED root cause not covered by Branches A/B/C, STOP and report the actual failure path. Do not invent a 4th branch silently.
  </action>
  <verify>
    <automated>
cd C:/GIT/llm-council/frontend; npm run lint 2>&1 | tail -20
    </automated>
  </verify>
  <done>
- Diagnostic logs added, captured, and REMOVED before commit (verify with `grep -n "DropZoneSlot\] hand" frontend/src/components/DropZoneSlot.jsx` returning zero hits).
- One of Branches A / B / C applied based on the captured failure path.
- `npm run lint` exits 0 (no new ESLint errors introduced).
- Net code change ≤ 5 lines (excluding comments).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual smoke test — both bugs end-to-end</name>
  <what-built>
- Bug B: `ConversationMetadata` now includes `mode`; `GET /api/conversations` surfaces the critique pill on reload.
- Bug A: `DropZoneSlot` picker accepts `.md` / `.txt` via the native file dialog (and drag-and-drop continues to work).
  </what-built>
  <how-to-verify>
**Pre-flight:** start both servers from project root.

```
bash start.sh
```

(Or two terminals: `uv run python -m backend.main` and `cd frontend && npm run dev`.)

**Verify Bug B fix:**

1. In browser http://localhost:5173, click **"+ New critique"** in the sidebar.
2. Observe the new conversation entry — pill "Critique" must render next to the title.
3. Reload the browser tab (Ctrl+R / Cmd+R).
4. **Expected:** the same conversation entry still shows the "Critique" pill.
5. **Bonus:** click "+ New Conversation" (fresh). Reload. Verify NO pill appears on the fresh entry (regression guard).
6. Sanity: open DevTools → Network → reload → click the `/api/conversations` request → Response tab → confirm every JSON entry has `"mode": "fresh"` or `"mode": "critique"`.

**Verify Bug A fix:**

7. With a critique conversation open, click the first slot's drop area. The native file dialog opens.
8. Navigate to any folder with a `.md` file (e.g. `C:\GIT\llm-council\README.md` or anything in `.planning/`).
9. **Expected:** the `.md` files are visible in the dialog WITHOUT having to pick "All files".
10. Select a `.md` file under 750 KB → the slot must render the chip `✅ <filename> <kb> KB ✕`.
11. Drag a different `.md` file onto slot 2 → same chip appearance.
12. Pick a `.txt` file for slot 3 → same chip appearance.
13. Type any critique instruction in the textarea → "Submit critique" button enables.
14. Submit → SSE stream completes, Stage 1/2/3 render, no console errors.

**Regression guard — fresh prompt and quality_research must NOT break:**

15. Open a NEW fresh conversation. Send any message under the **Fast** profile → council deliberation works end-to-end.
16. Switch to **Quality+Research** for one message → all 4 stages stream, no errors.

**Failure-path documentation:**

17. If Task 2 picked Branch A (accept-attr widening), confirm that the dialog filter dropdown now lists `Markdown`/`Text` properly. If it picked Branch B or C, describe in the resume-signal what the diagnostic revealed.
  </how-to-verify>
  <resume-signal>
Reply "approved" if all 17 checks pass. If any fail, paste the failing step number and the relevant console / network output. If Task 2 hit an unexpected branch (D), describe the actual failure path.
  </resume-signal>
</task>

</tasks>

<verification>
Cross-task verification once Task 3 closes:

1. `git diff --stat` shows exactly 2 files changed (backend/main.py, frontend/src/components/DropZoneSlot.jsx) OR 3 if Branch C was needed (+ frontend/src/components/CritiqueWelcome.jsx for the trim fix). Net LOC ≤ 10.
2. `grep -rn "console.log.*DropZoneSlot\|console.log.*CritiqueWelcome.handleFile" frontend/src/components/` returns 0 hits (all transient diagnostics removed).
3. `cd frontend && npm run lint` exits 0.
4. `uv run python -c "from backend.main import ConversationMetadata; print(ConversationMetadata.model_fields.keys())"` outputs a dict_keys that contains `'mode'`.
5. Manual smoke (Task 3) completes 17/17.
</verification>

<success_criteria>
- Critique pill survives full browser reload (Bug B closed).
- Picker accepts .md and .txt via dialog + drag-and-drop across Windows + Chrome / Edge (Bug A closed).
- Zero regression on fresh-prompt and quality_research SSE flows.
- Zero new test files (quick-task scope respected — testing deferred to v2.1 backlog per STATE.md "No automated tests" note already closed by Phase 7).
- Zero new dependencies.
- Net change ≤ 10 LOC excluding comments.
- All transient `console.log` lines from the diagnostic step removed before commit.
</success_criteria>

<output>
After Task 3 approval, create `.planning/quick/260511-lcu-fix-critique-source-md-picker-critique-m/SUMMARY.md` per the standard quick-task template. Record:
- Which branch (A / B / C / D) the diagnostic confirmed for Bug A.
- The 2-line Pydantic diff for Bug B.
- The exact picker behaviour observed on Windows before the fix (dialog hides `.md`? handlePicked silent? handleFile rejects?).
- Whether `/gsd-verify-phase` is needed for this quick-task (it isn't — quick-tasks bypass per the GSD workflow).
- Append the quick-task row to STATE.md "Quick Tasks Completed" table with quick_id `260511-lcu`, files touched, and the smoke-test outcome.
</output>
