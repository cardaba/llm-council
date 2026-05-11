---
quick_id: 260511-lcu
status: complete
date: 2026-05-11
type: quick-task
files_modified:
  - backend/main.py
  - frontend/src/components/DropZoneSlot.jsx
commits:
  - 127134e
  - 862a536
requirements:
  - QUICK-A
  - QUICK-B
classification: Phase 5 carry-over
backend_restart_required: true
---

# Quick Task 260511-lcu

Two atomic fixes for critique-mode regressions, shipped under user "ship-fast" override of the planner's 3-task diagnostic-first structure.

## Bug B fix (`backend/main.py`, +9/-1, commit 127134e)

Added `mode: Literal["fresh", "critique"] = "fresh"` to `ConversationMetadata`.

`storage.list_conversations()` already returned `mode`, but FastAPI's `response_model=List[ConversationMetadata]` filtered it out because the field was undeclared. Result: after browser reload `Sidebar.jsx:116` predicate `conv.mode === 'critique'` was always falsy and the pill disappeared. Default `"fresh"` covers legacy on-disk JSON.

## Bug A fix (`frontend/src/components/DropZoneSlot.jsx`, +5/-1, commit 862a536)

Expanded `accept=".md,.txt"` to `accept=".md,.markdown,.txt,text/markdown,text/plain"`.

Windows + Chrome/Edge build the file-dialog filter from the OS MIME registry, which often lacks `text/markdown`. Adding the MIME types makes the dialog show `.md` files without requiring "All files". Post-pick validator in `CritiqueWelcome.jsx:93-99` still enforces `.md`/`.txt`, so widening is safe. Branch A applied proactively; Branches B (`onInput` fallback) and C (`.trim()` extension check) remain available if user smoke shows Branch A wasn't the cause.

## What was skipped vs the plan

- No `console.log` diagnostic instrumentation (planner's Task 2 Step 1).
- No 3-task structure — collapsed to 2 atomic commits.
- No tests (quick-task scope).
- `CritiqueWelcome.jsx` not touched (validation logic correct as-is).

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Pydantic field present | grep mode Literal backend/main.py | 2 matches |
| Model loads | uv run python -c "from backend.main import ConversationMetadata..." | fields includes mode, OK |
| Accept widened | grep accept frontend/src/components/DropZoneSlot.jsx | 1 match w/ markdown |
| Vite build | npx vite build | Exit 0, 541 modules, 3.42s |
| No deletions | git diff --diff-filter=D HEAD~2 HEAD | empty |

## MANDATORY user action — backend restart

Uvicorn does not run with `--reload`. To pick up the Pydantic schema change:

```
# Ctrl+C the existing backend, then:
uv run python -m backend.main
```

Frontend Vite hot-reloads automatically.

## Manual smoke checklist

1. Restart backend (above).
2. Reload browser tab.
3. Sidebar shows "Critique" pill on existing critique conversations.
4. DevTools Network → `/api/conversations` response has `"mode"` on each item.
5. Open a critique conversation, click a slot picker. Native dialog shows `.md` files without choosing "All files".
6. Pick a `.md` < 750 KB → chip appears. Repeat drag-and-drop on slot 2 and `.txt` on slot 3.
7. Submit critique → SSE drains, Stage 1/2/3 render, no console errors.
8. Regression guard — open a fresh conversation, Fast message → 3-stage council works.

If step 5 still fails, Branch A wasn't the cause — report which path failed (dialog hides files / handlePicked silent / handleFile rejects) and iterate to Branch B or C.

## Classification

Phase 5 carry-over — neither bug is a v2.0 regression. Bug B: Phase 5 Plan 01 added mode to storage but never extended the listing response model. Bug A: OS/browser MIME-registry quirk present since CRIT-02 landed; never surfaced on dev machine.

## GSD verification

Quick-tasks bypass `/gsd-verify-phase`. STATE.md "Quick Tasks Completed" table updated.

## Self-Check: PASSED

- backend/main.py contains the mode Literal field inside ConversationMetadata (grep verified).
- frontend/src/components/DropZoneSlot.jsx contains the expanded accept string (grep verified).
- Commits 127134e and 862a536 exist on master.
- Vite build exits 0; Pydantic import test prints OK.
- No unintended deletions in last 2 commits.
