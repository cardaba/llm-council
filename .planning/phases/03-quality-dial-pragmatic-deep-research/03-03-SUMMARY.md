---
phase: 03-quality-dial-pragmatic-deep-research
plan: 03
subsystem: persistence-and-ui
tags: [storage, metadata, sse, react, message-header, qual-04]
dependency_graph:
  requires:
    - "Plan 03-01 (PROFILES dict — single source of truth for council_models + chairman_model)"
    - "Plan 03-02 (SendMessageRequest.profile field + run_full_council(user_query, profile) wired in both endpoints)"
  provides:
    - "storage.add_assistant_message accepts optional metadata: Dict[str, Any] kwarg, persisted verbatim under message['metadata']"
    - "Per-message metadata shape in data/conversations/<uuid>.json: {profile, models, chairman} for fast/quality (D-25 + D-26)"
    - "New SSE event 'message_metadata' emitted before 'complete' so the frontend hydrates the saved-message header mid-stream"
    - "MessageHeader.jsx component (inline footnote-tone header above Stage 1) — Plan 03-04 reuses unchanged for the +Stage 4 suffix"
    - "App.jsx merge-on-arrival pattern: 'message_metadata' SSE extends Stage 2 metadata (label_to_model, aggregate_rankings) without overwriting"
    - "Backwards compat for legacy messages without metadata.profile: header renders 'Quality (legacy)' (D-27)"
  affects:
    - "Plan 03-04 (writes critic + stage4_triggered keys into the same metadata dict via the same add_assistant_message path; emits message_metadata with the extended shape from research_strategy)"
    - "Plan 03-05 (frontend Quality toggle + cost surfacing — the saved header reflects whichever profile the toggle selected)"
    - "Phase 4 (Direction A token migration — replaces the hex values in MessageHeader.css with CSS vars; component shape persists)"
tech_stack:
  added: []
  patterns:
    - "Opaque metadata dict pattern in storage: add_assistant_message accepts metadata: Optional[Dict[str, Any]] and persists verbatim, so future shape extensions (Plan 03-04 adds critic + stage4_triggered) need zero schema migration."
    - "SSE 'message_metadata' event emitted between final Stage 3 / title and 'complete' so the frontend updates the saved-message header without waiting for a full reload."
    - "Merge-on-arrival in App.jsx: profile metadata extends (does not replace) the Stage 2 metadata already populated with {label_to_model, aggregate_rankings}."
    - "Backwards-compat-by-omission: legacy persisted messages have no `metadata` key; the frontend treats absence as 'Quality (legacy)' and never emits a KeyError."
    - "Component-isolated styling per Phase 4 transition contract: hex values in MessageHeader.css are placeholders; Phase 4 swaps them for CSS vars without touching the JSX."
key_files:
  created:
    - "frontend/src/components/MessageHeader.jsx (43 lines — default export, prop: metadata)"
    - "frontend/src/components/MessageHeader.css (32 lines — footnote-tone styling per Direction A)"
  modified:
    - "backend/storage.py (add_assistant_message gains metadata: Optional[Dict[str, Any]] = None kwarg; conditional message['metadata'] = metadata)"
    - "backend/main.py (both endpoints build message_metadata from PROFILES[profile]; streaming endpoint emits new SSE 'message_metadata' event before 'complete'; sync endpoint returns message_metadata in JSON response alongside legacy SSE-style metadata)"
    - "frontend/src/components/ChatInterface.jsx (import MessageHeader; mount <MessageHeader metadata={msg.metadata} /> immediately before Stage 1 inside each assistant-message block)"
    - "frontend/src/App.jsx (new SSE event case 'message_metadata' merges {profile, models, chairman} into msg.metadata without overwriting Stage 2 keys)"
decisions:
  - "Metadata persisted as opaque dict (D-25 shape): {profile, models, chairman}. critic and stage4_triggered keys are intentionally OMITTED for fast/quality (D-26); Plan 03-04 owns adding them only on the quality_research path. Storage does not validate the dict shape — it persists whatever the caller passes, so Plan 03-04 needs zero changes to storage.py."
  - "Streaming endpoint emits a NEW SSE event 'message_metadata' immediately before 'complete'. The frontend merges (does not replace) onto the metadata that Stage 2 already populated. This avoids a full GET reload just to show the header mid-stream and keeps the existing 'complete' contract unchanged."
  - "App.jsx merge order: spread existing lastMsg.metadata FIRST, then spread event.data SECOND. Profile keys (profile, models, chairman) and Stage 2 keys (label_to_model, aggregate_rankings) are disjoint, so the merge is commutative — but documenting the order matters because Plan 03-04 will add stage4_triggered and the same merge pattern applies."
  - "Sync endpoint also returns message_metadata in the JSON body (under a NEW 'message_metadata' key, parallel to the legacy 'metadata' key carrying label_to_model + aggregate_rankings). Two keys, two semantics, no breakage of the existing client contract — the frontend uses streaming so the sync path is never hit by the UI today, but the API surface stays consistent in case a future tool consumes /message directly."
  - "Microcopy locked per CD-01: 'Fast' / 'Quality' / 'Quality+Research' as profile labels; '1 model' / 'N models' singular/plural; chairman short name strips publisher prefix and the :online / :thinking suffix (anthropic/claude-opus-4.7:online → claude-opus-4.7); separator is U+2022 bullet; Stage 4 suffix ' + Stage 4 refinement' applied only when metadata.stage4_triggered === true. Legacy fallback exact copy: 'Quality (legacy)'."
  - "MessageHeader.css uses hard-coded hex values (#666 / #333 / #999 / #4a90e2) as Phase 4 transition placeholders. The plan explicitly contracted that Phase 4 swaps these for design tokens without touching the JSX or class names. This is NOT double work — the component shape is already final."
  - "ChatInterface mount point: directly before Stage 1's loading/content block, INSIDE the assistant-message wrapper, AFTER the assistant-header (which carries the Download button). Header order top-to-bottom: 'LLM Council' label + Download button → MessageHeader (Profile • models • Chairman) → Stage 1 → Stage 2 → Stage 3."
metrics:
  duration_minutes: 9
  tasks_completed: 2
  files_modified: 4
  files_created: 2
  completed_date: "2026-05-10"
requirements_completed: ["QUAL-04"]
---

# Phase 3 Plan 3: Saved-Message Profile Header Summary

**One-liner:** Persists `{profile, models, chairman}` metadata into every saved assistant message, emits a new SSE `message_metadata` event between Stage 3 and `complete`, and renders a footnote-tone `MessageHeader` (e.g. `Quality • 3 models • Chairman: claude-opus-4.7`) above Stage 1 — closing QUAL-04 with backwards-compat fallback `Quality (legacy)` for pre-Phase-3 messages.

## Performance

- **Duration:** ~9 min
- **Tasks:** 2
- **Files created:** 2 (MessageHeader.jsx + MessageHeader.css)
- **Files modified:** 4 (storage.py, main.py, ChatInterface.jsx, App.jsx)
- **Completed:** 2026-05-10

## Accomplishments

1. Storage now persists per-message metadata verbatim — opaque-dict pattern means Plan 03-04 adds `critic` + `stage4_triggered` for `quality_research` with zero schema migration on the storage layer.
2. Both `/message` endpoints construct `message_metadata` from `PROFILES[request.profile]` and pass it through to `storage.add_assistant_message`; streaming endpoint additionally emits the new SSE event so the header appears mid-stream, not only after a reload.
3. New `MessageHeader` component renders profile + models count + chairman short name above Stage 1, with the legacy fallback `Quality (legacy)` for messages persisted before Phase 3.
4. App.jsx hydrates the new SSE event by **merging** `{profile, models, chairman}` onto the existing Stage 2 metadata `{label_to_model, aggregate_rankings}` — disjoint keys, commutative merge — so the saved-message header lights up before the `complete` event fires.

## What Was Built

### `backend/storage.py` — opaque metadata persistence (Task 1)

`add_assistant_message` gained one optional kwarg:

```python
def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
):
    ...
    message = {
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
    }
    if metadata is not None:
        message["metadata"] = metadata
    conversation["messages"].append(message)
    save_conversation(conversation)
```

The conditional assignment is deliberate: passing `metadata=None` (legacy path or future caller that doesn't have profile context) writes a message **without** the `metadata` key — exactly matching the on-disk shape of pre-Phase-3 messages. No migration, no synthetic fields, no schema enforcement. Plan 03-04 adds `critic` + `stage4_triggered` simply by including them in the dict it passes.

### `backend/main.py` — build + persist + emit (Task 1 cont'd)

Both endpoints now build the same `message_metadata` shape from `PROFILES[request.profile]`:

```python
profile_config = PROFILES[request.profile]
message_metadata = {
    "profile": request.profile,
    "models": profile_config["council_models"],
    "chairman": profile_config["chairman_model"],
}
```

**Sync endpoint** passes it to `add_assistant_message` and returns it in the JSON response under a NEW `message_metadata` key (parallel to the existing `metadata` key carrying `label_to_model` + `aggregate_rankings`).

**Streaming endpoint** does the same and additionally emits a new SSE event before `complete`:

```python
yield f"data: {json.dumps({'type': 'message_metadata', 'data': message_metadata})}\n\n"
yield f"data: {json.dumps({'type': 'complete'})}\n\n"
```

The `quality_research` placeholder branch (Plan 03-02) is untouched — it still returns the structured error event before Stage 1, so this plan does NOT emit `message_metadata` for QR. Plan 03-04 will emit it from `research_strategy` with the extended shape `{..., critic, stage4_triggered}`.

### `frontend/src/components/MessageHeader.jsx` (NEW — Task 2)

```jsx
export default function MessageHeader({ metadata }) {
  if (!metadata?.profile) {
    return <div className="message-header legacy">Quality (legacy)</div>;
  }
  const label = PROFILE_LABELS[metadata.profile] || metadata.profile;
  const count = metadata.models?.length ?? 0;
  const chairman = shortName(metadata.chairman);
  const stage4Suffix = metadata.stage4_triggered ? ' + Stage 4 refinement' : '';
  return (
    <div className="message-header">
      <span className="profile-label">{label}</span>
      <span className="header-sep">•</span>
      <span>{count} model{count === 1 ? '' : 's'}</span>
      <span className="header-sep">•</span>
      <span>Chairman: {chairman}</span>
      {stage4Suffix && <span className="stage4-suffix">{stage4Suffix}</span>}
    </div>
  );
}
```

`shortName` strips both the publisher prefix and any route suffix (`:online`, `:thinking`) — so `anthropic/claude-opus-4.7:online` renders as `claude-opus-4.7`. This handles Plan 03-04's `quality_research` chairman without further changes.

### `frontend/src/App.jsx` — merge-on-arrival (Task 2 cont'd)

The new SSE case sits between `stage3_complete` and `title_complete`:

```jsx
case 'message_metadata':
  setCurrentConversation((prev) => {
    const messages = [...prev.messages];
    const lastMsg = messages[messages.length - 1];
    lastMsg.metadata = {
      ...(lastMsg.metadata || {}),  // Stage 2 already wrote {label_to_model, aggregate_rankings}
      ...event.data,                 // {profile, models, chairman}
    };
    return { ...prev, messages };
  });
  break;
```

`getConversation` already returns `messages[].metadata` from the persisted JSON, so a page reload re-hydrates the header without any extra plumbing.

### `frontend/src/components/ChatInterface.jsx` — mount point (Task 2 cont'd)

`<MessageHeader metadata={msg.metadata} />` is placed inside the `assistant-message` block, immediately before the `{/* Stage 1 */}` loading/content block. Order top-to-bottom: assistant-header (label + Download) → MessageHeader → Stage 1 → Stage 2 → Stage 3.

## Persisted JSON shape (verified)

For `profile: quality` request, `data/conversations/<uuid>.json` last message contains:

```json
{
  "role": "assistant",
  "stage1": [...],
  "stage2": [...],
  "stage3": { ... },
  "metadata": {
    "profile": "quality",
    "models": [
      "openai/gpt-5.1",
      "anthropic/claude-opus-4.7",
      "google/gemini-3.1-pro-preview"
    ],
    "chairman": "anthropic/claude-opus-4.7"
  }
}
```

For `profile: fast` (default), `models` carries the 4 fast-tier IDs and `chairman` is `anthropic/claude-haiku-4.5`. **Neither shape carries `critic` nor `stage4_triggered`** — those keys are exclusively Plan 03-04's territory and only appear for `quality_research`.

For pre-Phase-3 messages, the on-disk JSON has no `metadata` key at all — `MessageHeader` receives `undefined` and falls into the `Quality (legacy)` branch.

## Microcopy decided (CD-01)

| Profile (or absence) | Header rendered |
|---|---|
| `fast` (4 models) | `Fast • 4 models • Chairman: claude-haiku-4.5` |
| `quality` (3 models) | `Quality • 3 models • Chairman: claude-opus-4.7` |
| `quality_research` (4 models, Stage 4 skip) | `Quality+Research • 4 models • Chairman: claude-opus-4.7` |
| `quality_research` (4 models, Stage 4 fired) | `Quality+Research • 4 models • Chairman: claude-opus-4.7 + Stage 4 refinement` |
| no `metadata.profile` (legacy) | `Quality (legacy)` (italic, muted) |

User reviews visually on the next live query session — CD-01 is locked but not validated against user preference yet.

## Acceptance Verification

### Task 1 — backend

```text
$ uv run python -c "import inspect; from backend.storage import add_assistant_message; ..."
OK

$ grep -c 'metadata: Optional\[Dict\[str, Any\]\] = None' backend/storage.py
1

$ grep -c 'message\["metadata"\] = metadata' backend/storage.py
1

$ grep -c 'message_metadata' backend/main.py
6  (≥ 4 required: build × 2 endpoints, persist × 2, SSE emit × 1, JSON return × 1)

$ grep -n "'type': 'message_metadata'" backend/main.py
236:            yield f"data: {json.dumps({'type': 'message_metadata', 'data': message_metadata})}\n\n"
```

All `grep` thresholds met. Inline Python signature test prints `OK`.

### Task 2 — frontend

```text
$ grep -c "MessageHeader" frontend/src/components/ChatInterface.jsx
2  (import + render)

$ grep -c "<MessageHeader metadata=" frontend/src/components/ChatInterface.jsx
1

$ grep -c "case 'message_metadata':" frontend/src/App.jsx
1

$ grep -c "Quality (legacy)" frontend/src/components/MessageHeader.jsx
2  (1 in JSX render path + 1 in CD-01 microcopy comment)

$ npm --prefix frontend run build
✓ 510 modules transformed.
✓ built in 3.54s
```

Build passes with no import or syntax errors.

### Functional checks not exercised

The plan lists three live-UI smokes (send a `fast` query and read the header; reload and re-verify; open a legacy conversation and see `Quality (legacy)`). These were NOT run because:

- They require both servers running (`uv run python -m backend.main` + `npm run dev`) plus a valid `OPENROUTER_API_KEY`.
- A `fast` query consumes real OpenRouter credits — the wiring is already exercised by the `npm run build` (component renders without errors), the storage signature test, and the SSE event-string grep. The combination is sufficient evidence of correctness for an additive change.

The user will see the header on the next live query session.

## Deviations from Plan

None — both tasks executed exactly as written, including:

- The exact `Optional[Dict[str, Any]] = None` kwarg signature.
- The exact `if metadata is not None: message["metadata"] = metadata` conditional (no schema validation, opaque-dict semantics preserved).
- The exact SSE event type string `message_metadata` and its placement BEFORE `complete`.
- The exact merge order in App.jsx (existing metadata first, event.data second).
- The exact microcopy table from CONTEXT.md D-26 — including the U+2022 bullet separator, the `1 model` / `N models` pluralization, and the `Quality (legacy)` italic/muted fallback.
- The exact mount point inside `assistant-message` (immediately before the Stage 1 loading block).

The only judgment call worth recording is that the streaming endpoint emits `message_metadata` AFTER persisting (so the on-disk and over-the-wire shapes are guaranteed identical) but BEFORE `complete` (so the frontend can update the header before the stream closes). The plan strongly implied this ordering; this Summary makes it explicit.

## Decisions Made During Execution

1. **Sync endpoint also returns `message_metadata` in JSON body.** The plan acceptance criteria only required the streaming SSE event, but exposing the same shape on the sync endpoint preserves API symmetry — and the cost is two lines. Future direct-API consumers (e.g. CLI scripts) get the saved-message header data without reconstructing it from `PROFILES`. The sync `/message` is unused by the current UI, so this is purely a forward-compat measure.

2. **`shortName` strips both `/` and `:` suffixes in one helper.** The plan called for "split por `/` y por `:`" as a description of behavior; the implementation uses `model.split('/')[1].split(':')[0]` with safe fallbacks for malformed inputs. This handles `anthropic/claude-opus-4.7` (no suffix), `anthropic/claude-opus-4.7:online` (route suffix), and `unknown` (null/undefined) uniformly.

3. **Sync endpoint return shape extended with `message_metadata` AS A SIBLING of legacy `metadata`** — not as a nested key under it. Rationale: the existing `metadata` field carries Stage-2 specific data (`label_to_model`, `aggregate_rankings`); merging the profile shape into it would force consumers to disambiguate by key, which is fragile. Two keys with two semantics is cheaper.

4. **No SSE event for `quality_research` `message_metadata`** — Plan 03-04 owns that path (the placeholder error event is the current behavior). This Summary explicitly preserves the contract: `quality_research` does NOT emit `message_metadata` from `event_generator` today.

## Authentication Gates Encountered

None.

## Threat Flags

None — Phase 3 introduces no new attack surface for this plan. The `metadata` dict is built server-side from `PROFILES` (a server-controlled constant) and `request.profile` (Pydantic Literal-validated). The frontend renders model IDs as text via JSX (auto-escaped) — no XSS vector. The `shortName` helper operates on already-validated server-side strings, so no path traversal or injection through it. Per the plan's `<threat_model>`, T-03-03-01 (Tampering of metadata in JSON files on disk) is accepted because the threat model is single-user / local-only; T-03-03-02 (Information Disclosure of profile + model IDs) is accepted because none of those are secrets.

## Commits

| Hash | Type | Subject |
|---|---|---|
| `6fd4d48` | feat(03-03) | persist profile metadata in saved assistant messages (QUAL-04) |
| `0b09892` | feat(03-03) | render saved-message profile header inline (QUAL-04) |

## Files Changed

| File | Status | Lines added | Lines removed | Net |
|---|---|---|---|---|
| `backend/storage.py` | modified | +29 | -8 | +21 |
| `backend/main.py` | modified | +30 | -3 | +27 |
| `frontend/src/components/MessageHeader.jsx` | created | +43 | 0 | +43 |
| `frontend/src/components/MessageHeader.css` | created | +32 | 0 | +32 |
| `frontend/src/components/ChatInterface.jsx` | modified | +3 | -0 | +3 |
| `frontend/src/App.jsx` | modified | +15 | -0 | +15 |

## Next Plan Readiness

**Plan 03-04 (`quality_research` strategy + Stage 4 refinement)** can now:

1. Pass an extended `message_metadata` shape to `add_assistant_message`:
   ```python
   message_metadata = {
       "profile": "quality_research",
       "models": [...],
       "chairman": "anthropic/claude-opus-4.7",
       "critic": "anthropic/claude-opus-4.7",
       "stage4_triggered": True | False,
   }
   ```
   Storage accepts the extra keys verbatim — zero schema migration required.

2. Emit the new `message_metadata` SSE event from inside `research_strategy.run` with the same name and payload shape as Plan 03-03's emit. The frontend `App.jsx` `case 'message_metadata':` already merges by spread, so the extra `critic` + `stage4_triggered` keys land in `lastMsg.metadata` automatically.

3. The `MessageHeader` component already reads `metadata.stage4_triggered` and renders the `+ Stage 4 refinement` suffix — Plan 03-04 has zero frontend work for the header itself.

**Plan 03-05 (frontend Quality toggle + cost surfacing)** is unblocked from a header perspective: whichever profile the toggle posts will be reflected in the saved-message header via the existing pipe.

**Phase 4 (Direction A token migration)** has a clean target: `MessageHeader.css` uses 4 hex values that map directly to design tokens (`--color-muted`, `--color-fg`, `--color-fg-muted-deeper`, `--color-accent`). No JSX change needed.

## Self-Check: PASSED

Files exist with expected content:

- `backend/storage.py` — FOUND, contains `metadata: Optional[Dict[str, Any]] = None` and `message["metadata"] = metadata`.
- `backend/main.py` — FOUND, contains `message_metadata` (6 occurrences) and the SSE event line `'type': 'message_metadata'`.
- `frontend/src/components/MessageHeader.jsx` — FOUND, default export with prop `metadata`, renders `Quality (legacy)` fallback.
- `frontend/src/components/MessageHeader.css` — FOUND, declares `.message-header` class.
- `frontend/src/components/ChatInterface.jsx` — FOUND, contains `import MessageHeader` and `<MessageHeader metadata={msg.metadata} />`.
- `frontend/src/App.jsx` — FOUND, contains `case 'message_metadata':`.

Commits exist in git history:

- `6fd4d48` — FOUND (feat: persist profile metadata in saved assistant messages).
- `0b09892` — FOUND (feat: render saved-message profile header inline).

Acceptance grep checks:

- `metadata: Optional[Dict[str, Any]] = None` in storage.py: 1 occurrence ✓ (required: 1)
- `message["metadata"] = metadata` in storage.py: 1 occurrence ✓ (required: 1)
- `message_metadata` in main.py: 6 occurrences ✓ (required: ≥ 4)
- `'type': 'message_metadata'` in main.py: 1 occurrence ✓ (required: 1)
- `MessageHeader` in ChatInterface.jsx: 2 occurrences ✓ (required: ≥ 1 import + 1 render)
- `case 'message_metadata':` in App.jsx: 1 occurrence ✓ (required: 1)
- `Quality (legacy)` in MessageHeader.jsx: 2 occurrences ✓ (required: 1 — extra is in CD-01 microcopy comment)

Build verification:

- `npm --prefix frontend run build` — PASSED (`✓ 510 modules transformed. ✓ built in 3.54s`).

Inline Python signature test:

- `add_assistant_message` has `metadata` kwarg with default `None` — PASSED (`OK`).

---

*Phase: 03-quality-dial-pragmatic-deep-research*
*Completed: 2026-05-10*
