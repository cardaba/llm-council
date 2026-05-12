# Phase 6: Persistence completeness + Cost analytics + Settings panel - Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 17 (8 backend new/modified + 9 frontend new/modified)
**Analogs found:** 17 / 17 (all in-repo; no greenfield without analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/openrouter.py` (MOD) | transport/instrumentation | request-response → enrich return | self (current `query_model`) — extend return dict | exact |
| `backend/council.py` (MOD) | orchestrator | fan-out aggregate → metadata | self — `run_full_council` already packs `metadata` | exact |
| `backend/research_strategy.py` (MOD) | orchestrator | async-generator pipeline + kwarg override | self — `run()` already takes `profile_config`, fully parameterised | exact |
| `backend/storage.py` (READ-ONLY ref) | persistence | metadata opaque dict | self — `add_assistant_message` line 215-275 already documents the opaque-dict contract | exact (no change) |
| `backend/main.py` — `GET /api/stats/cost` (NEW) | route | filesystem-walk → JSON | `list_conversations` (`storage.py:165-192`) + `get_conversation` route (`main.py:103-112`) | role-match |
| `backend/main.py` — fresh streaming metadata pack (MOD line ~303-316) | route | merge SSE-stage data → `metadata` dict | critique path (`main.py:511-523`) already does PERS-01 pattern | exact |
| `backend/main.py` — `SendMessageRequest.stage4_threshold` (MOD) | pydantic-model | optional validated field | `UpdateConversationRequest` (`main.py:72-74`) uses `Field(...)` with constraints | exact |
| `backend/stats.py` (NEW, ~40 LOC) | service | read-many JSON → aggregate | `storage.list_conversations` (`storage.py:165-192`) — same `os.listdir + open + json.load` idiom | exact |
| `frontend/index.html` (MOD line 8-18) | FOUC-sync | localStorage read → `<html>` attribute pre-paint | self — existing theme IIFE at lines 9-18 | exact |
| `frontend/src/hooks/useSettings.js` (NEW, ~30 LOC) | hook | localStorage round-trip → React state → DOM attribute | `useTheme.js` (entire file 1-94) | exact (1:1 mirror) |
| `frontend/src/components/SettingsPanel.jsx` (NEW) | presentation/dialog | native `<dialog>` + showModal/close | `Modal.jsx` (entire file 1-129) for focus-trap idioms; `Sidebar.jsx` for grouping | role-match (geometry differs) |
| `frontend/src/components/SettingsPanel.css` (NEW) | styling | tokens + slide-in transform | `Sidebar.css:6-49` + `Modal.css` | role-match |
| `frontend/src/components/Header.jsx` (MOD) | presentation | inline-SVG icon + onClick boolean lift | self — `app-header__theme-toggle` button (lines 50-58) and `SunIcon`/`MoonIcon` (63-98) | exact (add 2nd button) |
| `frontend/src/components/MessageHeader.jsx` (MOD) | presentation | read `metadata.cost` → conditional render | self — existing `metadata.profile` guard line 26-28 + flex children lines 33-42 | exact |
| `frontend/src/components/MessageHeader.css` (MOD) | styling | tokens-only + tabular-nums + 2-weight hierarchy | self — `.profile-label` semibold + `.header-sep` opacity + tabular-nums root (entire file 1-42) | exact |
| `frontend/src/components/Sidebar.jsx` (MOD — footer block) | presentation | fetch on mount/complete → render two-column block | self — `.sidebar-header` block (lines 279-291) for structure; `.conversation-meta` for tabular-nums | role-match |
| `frontend/src/components/Sidebar.css` (MOD — footer rules) | styling | grid 2-column + conditional progress bar | self — `.sidebar-header` (lines 15-18) + `.conversation-meta` (lines 159-165) | exact |
| `frontend/src/api.js` (MOD) | transport | thin `fetch` wrapper + body extension | self — `sendMessage` (lines 57-72) for body extension; `listConversations` (11-17) for GET wrapper | exact |
| `frontend/src/index.css` (MOD) | styling | density override block + font-size data-attr block | self — `[data-theme="dark"]` block (lines 128-144) as the analog for `[data-density="compact"]` | exact |

## Pattern Assignments

### `backend/openrouter.py` (transport/instrumentation, request-response)

**Analog:** self — `query_model` lines 8-72 (extend in place; do not refactor)

**Imports pattern** (lines 1-5) — leave unchanged:
```python
import httpx
from typing import List, Dict, Any, Optional
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL, get_provider_for_model
```

**Existing return shape to extend** (lines 62-68):
```python
data = response.json()
message = data['choices'][0]['message']

return {
    'content': message.get('content'),
    'reasoning_details': message.get('reasoning_details')
}
```

**Pattern to copy — defensive `.get()` chain** (already pervasive in this file). New helper to add at module level (mirror of the local-helper style already used in `council.py` for `_anonymize_critique_text`):

```python
def _extract_cost(data: dict) -> dict:
    """Extract cost from OpenRouter usage block; safe defaults on missing fields."""
    usage = data.get('usage') or {}
    cost_details = usage.get('cost_details') or {}
    return {
        'openrouter_fee_usd': float(usage.get('cost') or 0.0),
        'upstream_usd': float(cost_details.get('upstream_inference_cost') or 0.0),
    }
```

**Error handling pattern** (lines 70-72) — leave unchanged; the broad `except Exception` + `print(...)` + `return None` graceful-degradation contract is locked. New cost extraction MUST live INSIDE the try-block so a malformed `usage` block produces `None` (not a half-populated dict).

**RESEARCH spike note (Plan-1 Wave 0):** verify `usage.cost` / `usage.cost_details.upstream_inference_cost` shape with one real OpenRouter response per Quality model BEFORE landing this code. The defensive `.get() or 0.0` chain is the fallback for shape drift.

---

### `backend/council.py` (orchestrator, fan-out aggregate)

**Analog:** self — `run_full_council` lines 471-551 (extend `metadata` dict in place)

**Imports pattern** (lines 12-16) — leave unchanged.

**Existing metadata-pack pattern** (lines 546-549):
```python
# Prepare metadata
metadata = {
    "label_to_model": label_to_model,
    "aggregate_rankings": aggregate_rankings
}
```

**Pattern to extend** — accumulate per-stage cost from each `query_model` return. Stage-1 fan-out at lines 519-520 + Stage-2 at line 530 + Stage-3 at line 537. After cost capture lands in `query_model`, callers iterate the responses dict and sum:

```python
# Pattern (apply at stage1_collect_responses + stage2_collect_rankings call sites)
stage1_cost = sum(
    (r.get('cost', {}).get('openrouter_fee_usd', 0.0) for r in responses.values() if r),
    0.0,
)
stage1_upstream = sum(
    (r.get('cost', {}).get('upstream_usd', 0.0) for r in responses.values() if r),
    0.0,
)
```

Then pack into the metadata bag:
```python
metadata = {
    "label_to_model": label_to_model,
    "aggregate_rankings": aggregate_rankings,
    "cost": {
        "stage1": stage1_fee, "stage2": stage2_fee, "stage3": stage3_fee, "stage4": None,
        "total": stage1_fee + stage2_fee + stage3_fee,
        "upstream_total": stage1_upstream + stage2_upstream + stage3_upstream,
        "currency": "USD",
    },
}
```

**Error handling pattern** (lines 173, 276, 339-345) — `None` responses already filtered out by `if response is not None`. Cost accumulator MUST use the same guard so failed sub-queries contribute `0.0`, not `KeyError`.

---

### `backend/research_strategy.py` (orchestrator, async-generator + kwarg override)

**Analog:** self — `run()` signature lines 147-150 + threshold consumption line 179

**Imports pattern** (lines 47-55) — leave unchanged.

**Existing signature** (lines 147-150):
```python
async def run(
    user_query: str,
    profile_config: Dict[str, Any],
) -> AsyncGenerator[Dict[str, Any], None]:
```

**Pattern to extend — add `threshold_override` kwarg** (mirror Optional kwarg style from `add_assistant_message` `storage.py:220-222`):

```python
async def run(
    user_query: str,
    profile_config: Dict[str, Any],
    threshold_override: Optional[int] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    ...
    threshold = threshold_override if threshold_override is not None else profile_config["stage4_threshold"]
```

The override consumption point is line 179 (`threshold = profile_config["stage4_threshold"]`) — replace with the conditional above. The Stage 4 gating at line 353 (`if critic_score is not None and critic_score < threshold:`) stays untouched — it already reads the local `threshold` variable.

**Cost accumulation pattern** — apply same Stage-1/2/3/4 sum as in council.py at the analogous fan-out points (lines 193, 253, 296, 360). Pack into the `_final` event's `message_metadata` (line 390-396) so `main.py`'s consumer (line 246) inherits the cost dict in `final_message_metadata`.

---

### `backend/main.py` — `GET /api/stats/cost` (NEW route)

**Analog:**
- Route shape: `list_conversations` route `main.py:83-86`
- Filesystem walk: `storage.list_conversations` `storage.py:165-192`
- Defensive get_conversation pattern: `main.py:103-112`

**Imports pattern** — reuse existing module imports. Add `from . import stats` if helper lives in `backend/stats.py` (recommended per RESEARCH §Recommended Project Structure).

**Route signature pattern** (copy from `main.py:83-86`):
```python
@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()
```

**Apply to new route:**
```python
@app.get("/api/stats/cost")
async def get_cost_stats():
    """Aggregate current-month cost stats from data/conversations/*.json (read-only)."""
    return stats.aggregate_current_month()
```

**Filesystem-walk pattern** to copy into `backend/stats.py` (from `storage.py:172-192`):
```python
ensure_data_dir()  # idempotent
results = []
for filename in os.listdir(DATA_DIR):
    if filename.endswith('.json'):
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r') as f:
            data = json.load(f)
        # filter by data['created_at'] >= start_of_current_month_iso
        # sum data['messages'][*]['metadata']['cost']['total'] / ['upstream_total']
        # tally by data['messages'][*]['metadata']['profile']
```

**Error handling pattern** — match `list_conversations` (no try/except; FastAPI surfaces 500 on unhandled). For the new route, missing `metadata.cost` on legacy v2 messages MUST be tolerated via `.get('metadata', {}).get('cost', {}).get('total', 0.0)`.

---

### `backend/main.py` — fresh streaming metadata pack (MOD ~line 303-316)

**Analog:** the QR path's pack at `main.py:257-264` AND the critique path's pack at `main.py:511-523` — both already merge `label_to_model + aggregate_rankings` into the `metadata` dict per the Phase 5 opaque-dict contract.

**Current gap** (`main.py:303-316`):
```python
# Build per-message metadata (D-25 shape) — Fast / Quality only.
message_metadata = {
    "profile": request.profile,
    "models": council_models,
    "chairman": chairman_model,
}

# Save complete assistant message with profile metadata
storage.add_assistant_message(
    conversation_id,
    stage1_results,
    stage2_results,
    stage3_result,
    metadata=message_metadata,
)
```

**Pattern to apply — copy from `main.py:511-523`** (critique branch already merges):
```python
metadata = {
    "label_to_model": label_to_model,         # available from line 284
    "aggregate_rankings": aggregate_rankings,  # available from line 285
    "mode": "critique",
}
```

So fresh-streaming should become:
```python
message_metadata = {
    "profile": request.profile,
    "models": council_models,
    "chairman": chairman_model,
    "label_to_model": label_to_model,         # NEW — PERS-01
    "aggregate_rankings": aggregate_rankings,  # NEW — PERS-01
    "cost": {                                 # NEW — COST-01
        "stage1": ..., "stage2": ..., "stage3": ..., "stage4": None,
        "total": ..., "upstream_total": ..., "currency": "USD",
    },
}
```

**Critical:** `label_to_model` and `aggregate_rankings` are already in scope (lines 284-285); no new compute needed. The only delta is the dict pack.

---

### `backend/main.py` — `SendMessageRequest.stage4_threshold` (MOD)

**Analog:** `UpdateConversationRequest` (`main.py:72-74`) — the existing Pydantic constraint example:

```python
class UpdateConversationRequest(BaseModel):
    """Request to update conversation metadata. Only `title` is editable in v1."""
    title: str = Field(..., min_length=1, max_length=200)
```

**Pattern to apply** to `SendMessageRequest` (lines 50-53):
```python
class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    profile: Literal["fast", "quality", "quality_research"] = "fast"
    stage4_threshold: Optional[int] = Field(None, ge=1, le=10)  # NEW — SET-03
```

`Optional[int]` + default `None` matches the backward-compat shape: v1 clients (no field) continue to validate; Pydantic returns `None` and `research_strategy.run` falls back to PROFILES default.

Consumption: the QR streaming branch (`main.py:238-240`) currently calls `research_strategy.run(request.content, PROFILES["quality_research"])` — extend to:
```python
async for event in research_strategy.run(
    request.content,
    PROFILES["quality_research"],
    threshold_override=request.stage4_threshold,
):
```

---

### `backend/stats.py` (NEW, ~40 LOC service)

**Analog:** `storage.list_conversations` (`storage.py:165-192`) — same `os.listdir + json.load` walk; same sync-I/O-in-async tolerance.

**Imports pattern to copy:**
```python
import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from .storage import ensure_data_dir
from .config import DATA_DIR
```

**Core pattern** (mirror of `list_conversations`):
```python
def aggregate_current_month() -> Dict[str, Any]:
    """Aggregate cost stats from data/conversations/*.json filtered to current month."""
    ensure_data_dir()
    now = datetime.now(timezone.utc)
    month_start_iso = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    total = 0.0
    upstream_total = 0.0
    queries = 0
    by_profile: Dict[str, Dict[str, float]] = {}

    for filename in os.listdir(DATA_DIR):
        if not filename.endswith('.json'):
            continue
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r') as f:
            data = json.load(f)
        if data.get('created_at', '') < month_start_iso:
            continue
        for msg in data.get('messages', []):
            if msg.get('role') != 'assistant':
                continue
            cost = (msg.get('metadata') or {}).get('cost') or {}
            t = float(cost.get('total') or 0.0)
            u = float(cost.get('upstream_total') or 0.0)
            if t == 0.0 and u == 0.0:
                continue  # legacy v2 message or fast-only zero
            total += t
            upstream_total += u
            queries += 1
            profile = (msg.get('metadata') or {}).get('profile', 'unknown')
            bucket = by_profile.setdefault(profile, {'total': 0.0, 'upstream_total': 0.0, 'queries': 0})
            bucket['total'] += t
            bucket['upstream_total'] += u
            bucket['queries'] += 1

    return {
        'current_month': {
            'total_usd': round(total, 4),
            'upstream_total_usd': round(upstream_total, 4),
            'queries': queries,
            'by_profile': by_profile,
        },
        'current_session_estimate_for_cap': {
            'remaining_pct': max(0.0, 1.0 - (total / 100.0)),
            'cap_usd': 100.0,
        },
        'currency': 'USD',
    }
```

**Error handling pattern** — same as `list_conversations`: bare reads; FastAPI surfaces 500 on unhandled JSON parse. Defensive `.get() or {}` chains tolerate any malformed/legacy file without crashing the route.

---

### `frontend/index.html` (FOUC-sync, MOD line 8-18)

**Analog:** self — existing theme IIFE at lines 9-18.

**Existing pattern** (verbatim from file):
```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (systemDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

**Pattern to extend** — same IIFE, add one block INSIDE the existing `try` so a single failure mode covers both:
```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (systemDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);

      // NEW — Phase 6 SET-04 — sync density before first paint
      var density = localStorage.getItem('density') || 'comfortable';
      if (density !== 'compact' && density !== 'comfortable') density = 'comfortable';
      document.documentElement.setAttribute('data-density', density);

      // NEW — Phase 6 SET-02 — sync font-size before first paint
      var fontSize = localStorage.getItem('fontSize') || 'm';
      if (fontSize !== 's' && fontSize !== 'm' && fontSize !== 'l') fontSize = 'm';
      document.documentElement.setAttribute('data-fontsize', fontSize);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

Note: SET-04 only mandates density sync (per CONTEXT.md). Font-size sync is a Claude's-Discretion add that avoids the single-render flicker; if planner prefers strict adherence to "font-size via React state on first render", the fontSize block above can be dropped.

---

### `frontend/src/hooks/useSettings.js` (NEW ~30 LOC hook, 1:1 mirror)

**Analog:** `useTheme.js` (entire file 1-94) — the locked mirror per CONTEXT.md.

**Imports pattern** (line 1):
```js
import { useState, useEffect, useCallback } from 'react';
```

**`STORAGE_KEY` pattern** (line 21) — replace single key with three:
```js
const KEY_FONT = 'fontSize';
const KEY_DENSITY = 'density';
const KEY_STAGE4 = 'stage4Threshold';
const DEFAULT_FONT = 'm';
const DEFAULT_DENSITY = 'comfortable';
const DEFAULT_STAGE4 = 8;  // MIRROR: backend/config.py PROFILES["quality_research"]["stage4_threshold"]
```

**`readInitialTheme` pattern** (lines 23-41) — exact mirror, parameterised:
```js
function readInitial(key, fallback, validate) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const ok = validate(stored);
      if (ok !== null) return ok;
    }
  } catch { /* private browsing */ }
  return fallback;
}
```

**Hook body pattern** (lines 51-93) — exact mirror with 3 state slots:
```js
export function useSettings() {
  const [fontSize, setFontSizeState] = useState(() =>
    readInitial(KEY_FONT, DEFAULT_FONT, v => ['s','m','l'].includes(v) ? v : null));
  const [density, setDensityState] = useState(() =>
    readInitial(KEY_DENSITY, DEFAULT_DENSITY, v => ['compact','comfortable'].includes(v) ? v : null));
  const [stage4Threshold, setStage4ThresholdState] = useState(() =>
    readInitial(KEY_STAGE4, DEFAULT_STAGE4, v => {
      const n = parseInt(v, 10);
      return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
    }));

  useEffect(() => { document.documentElement.setAttribute('data-fontsize', fontSize); }, [fontSize]);
  useEffect(() => { document.documentElement.setAttribute('data-density', density); }, [density]);

  const setFontSize = useCallback(v => {
    setFontSizeState(v);
    try { localStorage.setItem(KEY_FONT, v); } catch {}
  }, []);
  const setDensity = useCallback(v => {
    setDensityState(v);
    try { localStorage.setItem(KEY_DENSITY, v); } catch {}
  }, []);
  const setStage4Threshold = useCallback(v => {
    setStage4ThresholdState(v);
    try { localStorage.setItem(KEY_STAGE4, String(v)); } catch {}
  }, []);

  return { fontSize, density, stage4Threshold, setFontSize, setDensity, setStage4Threshold };
}
```

**Error handling pattern** — same `try {} catch {}` swallow as `useTheme.js:82-86` (private browsing tolerance).

**Theme delegation** — `SettingsPanel.jsx` composes BOTH hooks: `const { theme, toggle } = useTheme(); const { fontSize, density, stage4Threshold, ... } = useSettings();`. Do NOT duplicate theme inside `useSettings`.

---

### `frontend/src/components/SettingsPanel.jsx` (NEW, dialog/presentation)

**Analog:** `Modal.jsx` (entire file 1-129) for the dialog idioms; geometry diverges (fixed-right 380px drawer vs centered portal).

**Imports pattern** (mirror of Modal.jsx lines 1-3 + Header.jsx line 1):
```js
import { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';
import './SettingsPanel.css';
```

**Focus management pattern** — Modal.jsx uses a HAND-ROLLED focus trap (lines 43-80). SettingsPanel.jsx should NOT copy this; use the native `<dialog>` + `showModal()` API instead (per RESEARCH §Don't Hand-Roll + CONTEXT.md D-04):

```jsx
export default function SettingsPanel({ open, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // Click-outside dismiss — copy idiom from Modal.jsx line 84-89.
  const handleClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ESC: native <dialog> emits a 'cancel' event when ESC is pressed.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e) => { e.preventDefault(); onClose(); };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);
```

**Inline-SVG icon pattern** (copy from `Header.jsx:63-98`) for the close (X) and gear icons:
```jsx
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
```

**Control structure pattern** — group each control with `<fieldset>`/`<legend>` for radio groups (per UI-SPEC line 282), inline label for slider:
```jsx
<dialog ref={dialogRef} className="settings-panel" onClick={handleClick}>
  <div className="settings-panel__inner" onClick={e => e.stopPropagation()}>
    <header className="settings-panel__header">
      <h2 className="settings-panel__title">Settings</h2>
      <button type="button" className="settings-panel__close" onClick={onClose} aria-label="Close settings">
        <CloseIcon />
      </button>
    </header>

    {/* Theme — delegates to useTheme */}
    <section className="settings-panel__section">
      <span className="settings-panel__label">Theme</span>
      <button onClick={toggle} aria-label={nextThemeLabel}>{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
    </section>

    {/* Font size — radio group */}
    <fieldset className="settings-panel__section">
      <legend className="settings-panel__label">Font size</legend>
      {/* S / M / L radios */}
    </fieldset>

    {/* Density — radio group */}
    <fieldset className="settings-panel__section">
      <legend className="settings-panel__label">Density</legend>
    </fieldset>

    {/* Stage 4 threshold — slider */}
    <section className="settings-panel__section">
      <label htmlFor="stage4-threshold" className="settings-panel__label">Stage 4 threshold</label>
      <input id="stage4-threshold" type="range" min="1" max="10" step="1"
             value={stage4Threshold}
             onChange={e => setStage4Threshold(parseInt(e.target.value, 10))}
             aria-label="Stage 4 threshold" />
      <span className="settings-panel__slider-value" aria-live="polite">{stage4Threshold}</span>
      <p className="settings-panel__microcopy">
        Higher = stricter; only refine when answer scores ≥{stage4Threshold}/10
      </p>
    </section>
  </div>
</dialog>
```

**State lift pattern** — `settingsOpen` boolean lives in `App.jsx` (mirror of `pendingDelete` in `Sidebar.jsx:156` + `editingId` line 158). Header receives `onSettingsOpen` callback; App.jsx renders `<SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />` as a sibling to `<Sidebar />` and `<ChatInterface />`.

---

### `frontend/src/components/SettingsPanel.css` (NEW styling)

**Analog:**
- Panel geometry: new (no analog) — use UI-SPEC §Layout Specifications line 211-218
- Token consumption: `Sidebar.css:6-13` (background/border)
- Slide transition: `Sidebar.css:39` motion-token pattern
- Section divider + padding: `Sidebar.css:15-18` (`.sidebar-header`)
- Focus ring: `Sidebar.css:46-49`

**Tokens-only pattern (NO HEX)** — every color/space MUST be a `var(--token)` reference. Copy the discipline from `Sidebar.css` (zero hex literals).

**Slide-out transform pattern** (apply translate + transition; reuse motion tokens already in use in `Sidebar.css:39`):
```css
.settings-panel {
  position: fixed;
  top: var(--layout-header-h);
  right: 0;
  width: 380px;
  height: calc(100vh - var(--layout-header-h));
  margin: 0;  /* override <dialog> default centering */
  padding: 0;
  background: var(--color-bg-elevated);
  border: none;
  border-left: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-md);
  transform: translate3d(100%, 0, 0);
  transition: transform var(--motion-duration-base) var(--motion-easing-out);
}
.settings-panel[open] {
  transform: translate3d(0, 0, 0);
}
.settings-panel::backdrop {
  background: transparent;  /* D-04 — no scrim */
}
```

**Inner padding + section spacing** (UI-SPEC line 217-218):
```css
.settings-panel__inner {
  padding: var(--space-6) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.settings-panel__section {
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border-subtle);
}
.settings-panel__section:last-child { border-bottom: none; }
```

**Focus ring pattern** (copy from `Sidebar.css:46-49`):
```css
.settings-panel button:focus-visible,
.settings-panel input:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

**Slider accent** (UI-SPEC line 113):
```css
.settings-panel input[type="range"] {
  accent-color: var(--color-accent);
}
```

---

### `frontend/src/components/Header.jsx` (presentation, MOD)

**Analog:** self — existing theme-toggle button at lines 50-58 and `SunIcon`/`MoonIcon` at lines 63-98.

**Existing button pattern** (lines 50-58):
```jsx
<button
  type="button"
  className="app-header__theme-toggle"
  onClick={toggle}
  aria-label={nextThemeLabel}
  title={nextThemeLabel}
>
  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
</button>
```

**Pattern to copy — add second sibling button** for the gear:
```jsx
<button
  type="button"
  className="app-header__settings-toggle"
  onClick={onSettingsOpen}
  aria-label="Open settings"
  title="Open settings"
>
  <GearIcon />
</button>
```

**Inline-SVG icon pattern** (mirror of `SunIcon` lines 63-80) — 20×20 viewBox=24 stroke-2:
```jsx
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
```

**Prop addition** — Header function signature gains `{ onSettingsOpen }` prop (App.jsx passes setter).

---

### `frontend/src/components/MessageHeader.jsx` (presentation, MOD)

**Analog:** self — existing JSX lines 23-43.

**Existing guard pattern** (lines 26-28):
```jsx
if (!metadata?.profile) {
  return <div className="message-header legacy">Quality (legacy)</div>;
}
```

**Existing flex row pattern** (lines 33-42):
```jsx
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
```

**Pattern to copy + extend** — wrap the existing flex row in a fragment with the new cost line BELOW it (UI-SPEC line 228-233):
```jsx
const showCost = metadata.cost && typeof metadata.cost.total === 'number' && metadata.cost.total >= 0.001;
const upstream = metadata.cost?.upstream_total ?? 0;
const fee = metadata.cost?.total ?? 0;

return (
  <div className="message-header">
    <div className="message-header__row">
      <span className="profile-label">{label}</span>
      <span className="header-sep">•</span>
      <span>{count} model{count === 1 ? '' : 's'}</span>
      <span className="header-sep">•</span>
      <span>Chairman: {chairman}</span>
      {stage4Suffix && <span className="stage4-suffix">{stage4Suffix}</span>}
    </div>
    {showCost && (
      <div className="message-header__cost-line">
        <span className="cost-line__upstream">${upstream.toFixed(3)} upstream</span>
        <span className="header-sep">·</span>
        <span className="cost-line__fee">${fee.toFixed(3)} fee</span>
      </div>
    )}
  </div>
);
```

Note: per UI-SPEC line 231, the `<div className="message-header__cost-line">` is the locked class name; `cost-line__upstream` and `cost-line__fee` follow BEM-ish naming consistent with `header-sep` / `profile-label`.

---

### `frontend/src/components/MessageHeader.css` (styling, MOD)

**Analog:** self — full file 1-42.

**Existing root pattern** (lines 7-23) — leave intact (tabular-nums root cascade is reused by the new cost line):
```css
.message-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--font-size-body-small);
  color: var(--color-fg-secondary);
  margin-bottom: var(--space-3);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

**Pattern to extend** — change `.message-header` from a single flex row to a flex column wrapping two rows (or keep current and have `.message-header__row` + `.message-header__cost-line` as siblings). Recommend the second:
```css
.message-header {
  /* keep existing rules — they apply to children via cascade */
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  /* ... rest unchanged ... */
}
.message-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}
.message-header__cost-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.cost-line__upstream {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-fg-primary);
}
.cost-line__fee {
  font-size: var(--font-size-microcopy);
  color: var(--color-fg-muted);
}
```

**Existing semibold pattern** (lines 25-28) — mirrored by `.cost-line__upstream` (600 weight + primary fg).
**Existing muted pattern** (lines 30-32) — mirrored by `.cost-line__fee` (muted color + microcopy size).

---

### `frontend/src/components/Sidebar.jsx` (MOD, footer block)

**Analog:**
- Block structure: `.sidebar-header` (lines 279-291)
- Fetch on mount: `loadConversations` pattern from `App.jsx:31-38`
- Conditional render (empty / error / data): `Sidebar.jsx:322-335` (no-conversations / empty / list)

**Existing block structure** (lines 279-291) — copy as the template for the new footer:
```jsx
<div className="sidebar-header">
  <h1>LLM Council</h1>
  <button ...>+ New Conversation</button>
</div>
```

**Pattern to apply — footer block AFTER `.conversation-list` (line 370 closing), BEFORE the modal** (lines 372+):
```jsx
{costStats && (
  <div className="sidebar-footer__cost">
    {costStats.current_month.queries === 0 ? (
      <p className="sidebar-footer__empty">No queries this month yet.</p>
    ) : (
      <>
        <div className="sidebar-footer__cols">
          <div className="sidebar-footer__col">
            <span className="sidebar-footer__label">OpenRouter</span>
            <span className="sidebar-footer__value">
              ${costStats.current_month.total_usd.toFixed(2)} / $100
            </span>
            {usageRatio >= 0.8 && (
              <div className="sidebar-footer__progress" aria-hidden="true">
                <div className="sidebar-footer__progress-fill" style={{ width: `${Math.min(100, usageRatio * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="sidebar-footer__col">
            <span className="sidebar-footer__label">Upstream</span>
            <span className="sidebar-footer__value">
              ${costStats.current_month.upstream_total_usd.toFixed(2)} BYOK
            </span>
            <span className="sidebar-footer__subtext">no cap</span>
          </div>
        </div>
        <p className="sidebar-footer__microcopy">
          {(usageRatio * 100).toFixed(1)}% of cap · {costStats.current_month.queries} queries this month
        </p>
      </>
    )}
  </div>
)}
```

**Fetch lifecycle pattern** (copy from `App.jsx:20-23, 31-38`):
```jsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const stats = await api.getCostStats();
      if (!cancelled) setCostStats(stats);
    } catch (e) {
      console.error('Cost stats fetch failed:', e);
      if (!cancelled) setCostStats(null);  // triggers "Cost stats unavailable" microcopy
    }
  })();
  return () => { cancelled = true; };
}, [refreshTrigger]);  // refreshTrigger bumps on new-message-complete event
```

**Error handling pattern** — copy `console.error` + state-null approach from `App.jsx:36, 45`. The "Cost stats unavailable" message is rendered when `costStats === null`.

---

### `frontend/src/components/Sidebar.css` (MOD, footer rules)

**Analog:**
- Block padding/border: `.sidebar-header` (lines 15-18)
- Tabular-nums + muted microcopy: `.conversation-meta` (lines 159-165)
- Token-only color palette: entire file (zero hex)

**Existing `.sidebar-header` pattern** (lines 15-18):
```css
.sidebar-header {
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}
```

**Pattern to apply — footer mirror** (UI-SPEC line 222-226):
```css
.sidebar-footer__cost {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-secondary);
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.sidebar-footer__cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
.sidebar-footer__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar-footer__label {
  font-size: var(--font-size-label);
  font-weight: 500;
  color: var(--color-fg-secondary);
}
.sidebar-footer__value {
  font-size: var(--font-size-body-small);
  color: var(--color-fg-primary);
}
.sidebar-footer__subtext,
.sidebar-footer__microcopy,
.sidebar-footer__empty {
  font-size: var(--font-size-microcopy);
  color: var(--color-fg-muted);
}
.sidebar-footer__microcopy {
  margin-top: var(--space-2);
}
.sidebar-footer__progress {
  height: 4px;
  background: var(--color-bg-elevated);
  border-radius: 2px;
  margin-top: var(--space-1);
  overflow: hidden;
}
.sidebar-footer__progress-fill {
  height: 100%;
  background: var(--color-warn);  /* visible only ≥80% — render guarded in JSX */
  transition: width var(--motion-duration-base) var(--motion-easing-out);
}
```

---

### `frontend/src/api.js` (MOD, transport)

**Analog:**
- GET wrapper: `listConversations` (lines 11-17)
- POST with body extension: `sendMessage` (lines 57-72) and `sendMessageStream` (lines 82-92)

**Existing GET wrapper pattern** (lines 11-17):
```js
async listConversations() {
  const response = await fetch(`${API_BASE}/api/conversations`);
  if (!response.ok) {
    throw new Error('Failed to list conversations');
  }
  return response.json();
},
```

**Pattern to apply — `getCostStats`:**
```js
async getCostStats() {
  const response = await fetch(`${API_BASE}/api/stats/cost`);
  if (!response.ok) {
    throw new Error('Failed to fetch cost stats');
  }
  return response.json();
},
```

**Existing body-extension pattern** (lines 57-72):
```js
async sendMessage(conversationId, content, profile = 'fast') {
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/message`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, profile }),
    }
  );
  ...
}
```

**Pattern to apply — extend `sendMessage` + `sendMessageStream` with `stage4Threshold`:**
```js
async sendMessage(conversationId, content, profile = 'fast', stage4Threshold = null) {
  const body = { content, profile };
  if (stage4Threshold !== null && profile === 'quality_research') {
    body.stage4_threshold = stage4Threshold;  // snake_case matches Pydantic field
  }
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/message`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
},

async sendMessageStream(conversationId, content, profile, onEvent, stage4Threshold = null) {
  const body = { content, profile };
  if (stage4Threshold !== null && profile === 'quality_research') {
    body.stage4_threshold = stage4Threshold;
  }
  const response = await fetch(
    `${API_BASE}/api/conversations/${conversationId}/message/stream`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  // ... rest unchanged — SSE reader loop is byte-identical
}
```

**Error handling pattern** — `throw new Error(...)` on non-OK (locked across this file). Callers catch in App.jsx with `console.error`.

---

### `frontend/src/index.css` (MOD, density + font-size overrides)

**Analog:** `[data-theme="dark"]` block (lines 128-144) — same `attribute-selector { tokens-only }` pattern.

**Existing dark-mode pattern** (lines 128-144):
```css
[data-theme="dark"] {
  --color-bg-primary: #1C1A17;
  /* ... only theme-dependent tokens, not structural ... */
}
```

**Pattern to apply — density override** (after the dark-mode block):
```css
/* Density compact — retunes intra-component spacing only.
   Layout grid, outer padding, and font sizes are unaffected. */
[data-density="compact"] {
  --space-2: 6px;   /* was 8px */
  --space-3: 10px;  /* was 12px */
}
```

**Pattern to apply — font-size override** (after the density block):
```css
/* Font size — rem-based root anchor. All --font-size-* tokens cascade. */
[data-fontsize="s"] { font-size: 15px; }
[data-fontsize="m"] { font-size: 17px; }   /* default — matches v1.0 body anchor */
[data-fontsize="l"] { font-size: 19px; }
```

**Critical:** these blocks MUST follow the `[data-theme="dark"]` block so theme + density + font-size compose without cascade-order surprises. Structural tokens (`--font-size-body` etc.) at `index.css:71-79` are `rem`-based and cascade through naturally.

---

## Shared Patterns

### Pattern A — `metadata` opaque-dict extension (PERS-01 + COST-01)

**Source:** `backend/storage.py:215-275` docstring + Phase 5 critique branch `main.py:511-523`
**Apply to:** ALL three streaming branches in `backend/main.py` (fresh, QR, critique) AND `backend/council.py:run_full_council`.

**Concrete excerpt to copy** (from `main.py:511-516`):
```python
metadata = {
    "label_to_model": label_to_model,
    "aggregate_rankings": aggregate_rankings,
    "mode": "critique",
}
storage.add_assistant_message(
    conversation_id, stage1_results, stage2_results, stage3_result,
    metadata=metadata,
    external_research=external_context,
)
```

**Phase 6 extension:** add `"cost": {...}` key alongside existing keys. **NO signature change** to `add_assistant_message`. The opaque-dict contract is the locked surface.

---

### Pattern B — Graceful degradation on per-model failure

**Source:** `backend/openrouter.py:70-72` (return None) + `backend/council.py:173, 196-197` (filter None)
**Apply to:** all cost-accumulation sites in `council.py` and `research_strategy.py`.

**Concrete excerpt** (from `council.py:173-177`):
```python
for model, response in responses.items():
    if response is not None:  # Only include successful responses
        stage1_results.append({"model": model, "response": response.get('content', '')})
```

**Phase 6 application:** cost sums MUST guard with the same `if response is not None` predicate. Failed sub-queries contribute `0.0`, never `KeyError`.

---

### Pattern C — Backwards-compat read on legacy/missing fields

**Source:** `MessageHeader.jsx:26-28` (`if (!metadata?.profile) return <legacy />`)
**Apply to:** the new cost line in `MessageHeader.jsx` AND the new sidebar footer in `Sidebar.jsx`.

**Concrete excerpt:**
```jsx
if (!metadata?.profile) {
  return <div className="message-header legacy">Quality (legacy)</div>;
}
```

**Phase 6 application:**
- Cost line: hide via `if (!metadata.cost || metadata.cost.total < 0.001) return <existing-row-only />` (do NOT render the cost line; the row above still renders).
- Sidebar footer: if `costStats === null` (fetch error), render the "Cost stats unavailable. Try refreshing." microcopy line instead of the columns.

Optional chaining (`?.`) + nullish coalescing (`??`) are the locked idioms (already used throughout MessageHeader.jsx).

---

### Pattern D — localStorage round-trip with private-browsing tolerance

**Source:** `useTheme.js:23-41, 79-87`
**Apply to:** every setter in `useSettings.js` AND any future client-side preference.

**Concrete excerpt:**
```js
try {
  localStorage.setItem(STORAGE_KEY, next);
} catch {
  // Private browsing / disabled storage — proceed without persistence.
}
```

**Phase 6 application:** all three setters in `useSettings` (`setFontSize`, `setDensity`, `setStage4Threshold`) wrap localStorage writes in `try {} catch {}`. The FOUC blocker IIFE in `index.html` ALREADY does this for the outer try.

---

### Pattern E — Tokens-only CSS (no hex)

**Source:** every existing CSS file in `frontend/src/components/*.css`
**Apply to:** new `SettingsPanel.css` AND new rules in `MessageHeader.css`, `Sidebar.css`, `index.css`.

**Concrete excerpt** (from `Sidebar.css:6-13`):
```css
.sidebar {
  width: var(--layout-sidebar-w);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border-subtle);
  /* zero hex — locked discipline since Phase 4 Wave 4 */
}
```

**Phase 6 lock:** zero new tokens proposed (per CONTEXT.md + UI-SPEC). `--color-warn` already exists at `index.css:63` (light) + `141` (dark) — use it for the ≥80% progress bar fill.

---

### Pattern F — Tabular-nums for digit-stable rows

**Source:** `MessageHeader.css:21-23` + `Sidebar.css:159-165`
**Apply to:** cost line, sidebar footer values, slider current-value digit.

**Concrete excerpt:**
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

**Phase 6 application:** apply at the `.sidebar-footer__cost` root (cascades to all values) and rely on cascade for the cost line (already present at `.message-header` root). For the slider current-value digit (`.settings-panel__slider-value`), apply the pair explicitly because it lives outside any tabular-nums root.

---

### Pattern G — SSE event-type discriminator + frontend reducer drain

**Source:** `frontend/src/api.js:101-119` (event reader loop) + Phase 5 `App.jsx` SSE reducer
**Apply to:** Phase 6 does NOT add new SSE event types. `message_metadata` already carries the persisted metadata; the new `cost` key rides inside that event's `data` payload with zero protocol change.

**Concrete excerpt** (from `main.py:320`):
```python
yield f"data: {json.dumps({'type': 'message_metadata', 'data': message_metadata})}\n\n"
```

**Phase 6 lock:** add `cost`/`label_to_model`/`aggregate_rankings` keys INSIDE `message_metadata`. No new event types. Frontend reducer drains as before.

---

## No Analog Found

All 17 files have at least a role-match analog in the repo. The two "weakest" matches are:

| File | Role | Data Flow | Why role-match (not exact) |
|------|------|-----------|---------------------------|
| `frontend/src/components/SettingsPanel.jsx` | dialog/presentation | native `<dialog>` + showModal | `Modal.jsx` exists but uses hand-rolled focus trap (lines 43-80); SettingsPanel deliberately uses native `<dialog>` per RESEARCH §Don't Hand-Roll. Geometry (fixed-right drawer) also diverges from Modal's centered portal. Pattern reuse is limited to: (a) backdrop click-outside guard `target === currentTarget`, (b) the `FOCUSABLE` selector constant for initial focus, (c) the `previouslyFocused.current?.focus?.()` restore idiom (which `<dialog>.close()` does natively — so even this is partial). Net new geometry/CSS. |
| `backend/main.py:GET /api/stats/cost` (NEW) | route | filesystem-walk aggregation | No existing GET route in the codebase walks all conversation files; `list_conversations` (`storage.py:165-192`) is the closest walk pattern, but it returns metadata-only, not an aggregate computed across messages. The walk idiom transfers; the aggregation logic is net new. |

## Metadata

**Analog search scope:**
- `backend/` (all 6 modules)
- `frontend/src/components/` (all components)
- `frontend/src/hooks/`
- `frontend/src/api.js` + `frontend/src/index.css` + `frontend/index.html`
- Phase 5 PATTERNS.md referenced for prior pattern continuity

**Files scanned:** ~30 backend + frontend files (one-pass full reads on canonical analogs; targeted reads on others)

**Pattern extraction date:** 2026-05-11

**Plan-1 Wave-0 gate:** Per CONTEXT.md and RESEARCH.md, the OpenRouter `usage.cost` / `usage.cost_details.upstream_inference_cost` shape MUST be verified with one real response per Quality model BEFORE any cost-aggregation code lands. This is a planner concern, not a pattern concern, but the defensive `.get() or 0.0` chain in `_extract_cost` is designed to tolerate shape drift if the spike comes back with different field names.
