# Phase 6: Persistence completeness + Cost analytics + Settings panel — Research

**Researched:** 2026-05-11
**Domain:** v2.0 observability (cost capture/aggregation/display) + UI tunables (settings panel + useSettings hook) + Stage 2 metadata persistence on top of the Phase 5 `metadata` opaque-dict contract
**Confidence:** HIGH (everything is verified against the actual v1.0/Phase-5 code on disk + OpenRouter API reference docs except a single 5-min runtime spike for the `usage.cost` shape — flagged as Plan-1 mandatory work)

## Summary

This phase ships the **observability and control layer** around the Phase-5 deliberation engine. Three bundled work-streams, all stacking on the **same locked persistence contract** (`metadata` opaque dict in `backend/storage.py:215-275`, signature unchanged):

1. **Persistence completeness (PERS-01/02)** — Merge `label_to_model` + `aggregate_rankings` into the per-message `metadata` dict for the fast/quality streaming endpoint, so reload-from-disk hydrates Stage 2 fully. The quality_research path **already** persists them (verified in `backend/main.py:511-523` for critique, and the QR streaming path collapses both legacy and message metadata into one). The actual gap is the **fresh-prompt fast/quality streaming branch in `main.py:303-316`**, which currently persists ONLY `{profile, models, chairman}` and drops the `{label_to_model, aggregate_rankings}` emitted in the `stage2_complete` SSE event.

2. **Cost analytics (COST-01..04)** — `query_model` is extended to capture `usage.cost` + `usage.cost_details.upstream_inference_cost` and return them alongside `content` / `reasoning_details`. Callers in `council.py` + `research_strategy.py` collect per-`query_model` cost into per-stage sums, packed into `metadata.cost` shape `{stage1, stage2, stage3, stage4, total, upstream_total, currency: "USD"}`. `MessageHeader` renders one static line `$X.XXX upstream · $Y.YYY fee` (hidden when `total < 0.001`). New `GET /api/stats/cost` walks `data/conversations/*.json` once, filters by `created_at` for the current month, and returns the dual-column aggregate consumed by the sidebar footer.

3. **Settings panel (SET-01..04)** — Gear icon in `Header.jsx` (second button to the right of the theme toggle) toggles a React-state boolean that opens a slide-out drawer rendered as a native `<dialog>` with `showModal()`. New `useSettings()` hook (~30 LOC, exact mirror of `useTheme.js:51-94`) handles 4 keys in 4 separate localStorage slots: `theme` (delegated to existing `useTheme`), `fontSize`, `density`, `stage4Threshold`. `stage4_threshold` ships in the `quality_research` request body as `Optional[int] = Field(None, ge=1, le=10)`; `research_strategy.run` gains a `threshold_override` kwarg that falls back to `PROFILES["quality_research"]["stage4_threshold"]` when None. Density applies sync via the FOUC blocker IIFE in `index.html:8-18` (one extra line); font-size applies via React state on first render (single-render flicker is the acceptable cost).

**Primary recommendation:** Start Plan-1 with the **5-minute OpenRouter `usage` spike** (log one real response from each Quality model with the verified Phase-5 BYOK pipeline). Treat that as a Wave-0 gate. Once the field names are confirmed, every downstream cost-aggregation contract is mechanical. Without it, the entire COST-01..04 stack rests on a documented-but-unverified shape and a rework on plan-2 would cost more than the spike.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-06)

- **D-01 — MessageHeader cost line: upstream prominent, OpenRouter fee secondary.** Format verbatim `$1.430 upstream · $0.024 fee`. Bold body-size for the upstream segment; muted microcopy for the fee. ` · ` middot separator. Hide the entire line when `metadata.cost.total < 0.001`. Use `font-variant-numeric: tabular-nums` (reuse `.message-header` rule at `MessageHeader.css:21-23`). 3-decimal precision on both segments. Currency hard-locked to `"USD"` in `metadata.cost.currency`.
- **D-02 — Sidebar footer: two columns, OpenRouter left ($100 cap) / Upstream right (no cap).** Progress bar visible only at `≥80%` of cap with `var(--color-warn)` fill. Combined microcopy line below: `1.2% of cap · 47 queries this month`. Diverges from D-01's hierarchy intentionally — the contexts differ (per-message real cost vs cap pressure).
- **D-03 — Immediate apply for all 4 settings controls (no Save/Cancel buttons).** Mirrors `useTheme` immediate-apply pattern. `stage4_threshold` changes apply only to the NEXT quality_research request (in-flight queries untouched). NO save gate.
- **D-04 — Panel dismiss: permissive (backdrop click + ESC + explicit X) WITHOUT scrim/overlay darkening.** Native `<dialog>` + `showModal()`. `::backdrop` styled `background: transparent`. `inert` is NOT applied to main content (the divergence from MOBL-02's mobile drawer pattern).
- **D-05 — Slider: minimal native `<input type="range" min="1" max="10" step="1">` + adjacent value + fixed microcopy `Higher = stricter; only refine when answer scores ≥{value}/10`.** No tick marks, no `+/-` buttons, no dynamic per-value copy.
- **D-06 — Default `stage4_threshold = 8`** inherited from `PROFILES["quality_research"]["stage4_threshold"]` in `backend/config.py:93`. localStorage key `stage4Threshold` (camelCase, matching `theme`). Invalid/missing → fall back to PROFILES default.

### Claude's Discretion

- Cost decimal precision: 3 decimals on both segments (`$0.024`, `$1.430`). Adopted in UI-SPEC.
- Hide-zero threshold: `total < 0.001`. Adopted.
- Progress bar color at `≥80%`: `var(--color-warn)` (token already exists in v1.0 — no new token proposal needed). Adopted.
- Panel slide-out transition: 180ms entry (`var(--motion-duration-base)`) / 120ms exit (`var(--motion-duration-fast)`). Adopted.
- Font-size token mapping: `data-fontsize="s|m|l"` on `<html>` with `rem`-based root anchor (15/17/19px). Plan-time may switch to `px` if cascade collateral surfaces.
- Settings control ordering: Theme · Font size · Density · Stage 4 threshold (top to bottom). Adopted.
- **OpenRouter `usage.cost` shape: UNVERIFIED.** Plan-1 MUST include the 5-min spike before any cost-aggregation code lands.

### Deferred Ideas (OUT OF SCOPE)

- Single-namespaced localStorage object (`{theme, fontSize, density, stage4Threshold}` under one key) — rejected; individual keys mirror `useTheme` 1:1.
- Save/Cancel buttons on Settings panel — rejected (D-03).
- Scrim/overlay darkening on panel open — rejected (D-04).
- Animated cost ticker — anti-feature AA2.
- Dynamic slider microcopy per value — rejected (D-05).
- Numeric input + `+/-` buttons for stage4_threshold — rejected (D-05).
- Tick marks on slider — rejected.
- Per-conversation cost stats panel (drill-down between message and monthly) — out of scope.
- Cost currency conversion (EUR/GBP) — out of scope; `metadata.cost.currency = "USD"` locked.
- Settings export/import — out of scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERS-01 | `label_to_model` + `aggregate_rankings` persisted inside `metadata` dict on every assistant message (no signature change) | §2 Stage 2 metadata hydration path — fast/quality streaming branch in `main.py:303-316` is the gap; QR branch already does it via the strategy `_final` payload |
| PERS-02 | Reload of any v2.0 conversation hydrates Stage 2 metadata fully (no "Quality (legacy)" fallback) | §2 — frontend already reads `metadata.label_to_model` from `stage2_complete` SSE; closing the persistence gap automatically closes hydration |
| COST-01 | `query_model` captures `usage.cost` + `usage.cost_details.upstream_inference_cost`; propagates to `metadata.cost = {stage1, stage2, stage3, stage4, total, upstream_total, currency}` | §3 `query_model` return-shape evolution + §4 `metadata.cost` aggregation schema |
| COST-02 | MessageHeader shows static post-deliberation cost line; NO animated tickers | §5 MessageHeader render contract (D-01 verbatim) |
| COST-03 | `GET /api/stats/cost` aggregates read-only from `data/conversations/*.json` | §6 endpoint aggregation strategy |
| COST-04 | Sidebar footer shows two-column monthly total + progress bar visible at ≥80% | §6 + UI-SPEC two-column geometry |
| SET-01 | Gear icon in Header opens slide-out panel (380px desktop) | §8 panel slot decision + §10 hydration of `<dialog>` + showModal |
| SET-02 | 4 controls (theme/font-size S-M-L/density/stage4_threshold slider 1-10) persisted in localStorage via new `useSettings()` hook | §7 `useSettings()` hook contract |
| SET-03 | `stage4_threshold` travels in quality_research request as `Optional[int] = Field(None, ge=1, le=10)`; `research_strategy.run` accepts `threshold_override`; v1 requests still validate | §9 Pydantic field + research_strategy override path |
| SET-04 | Density applies via FOUC blocker (sync); font-size via React state (single-render flicker acceptable) | §8 FOUC blocker extension |

## Project Constraints (from CLAUDE.md)

- Backend: Python 3.10+ + `uv` + relative imports (`from .x import y`); run as `python -m backend.main` from project root; binds `127.0.0.1:8001`.
- Frontend: React 19 + Vite 7; named exports for utilities, default exports for React components; co-located `*.css` per component; CSS class names `kebab-case`; `.markdown-content` wrapper required around all `<ReactMarkdown>` usages.
- Naming: backend `snake_case`, frontend `camelCase` for vars/fns, `PascalCase` for components, `UPPER_SNAKE_CASE` for module constants.
- Storage: synchronous file I/O inside async handlers (acceptable for single-user local app; the cost endpoint will reuse this idiom).
- Error handling: backend uses bare `print(...)` + return `None` for graceful degradation; frontend uses `console.error(...)` + inline state strings; no toast/snackbar infra.
- GSD workflow: all edits must go through a GSD command (this is research-only — no edits this session).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capture cost from OpenRouter response | API/Backend | — | `usage.cost` is only available in the raw HTTP response from OpenRouter; `query_model` is the only call site that parses `response.json()` |
| Aggregate per-stage cost into a message blob | API/Backend | — | Stage 1/2/3/4 fan-outs are orchestrated server-side; aggregation cannot be done client-side without leaking per-call usage to the client |
| Persist `metadata.cost` alongside the message | Database/Storage | — | `metadata` opaque dict already lives at `storage.py:268`; this is a pure append |
| Render per-message cost line | Browser/Client | — | Pure display; data already in `metadata` after the SSE round-trip + reload hydration |
| Aggregate monthly cost across all conversations | API/Backend | Database/Storage | Filesystem walk over `data/conversations/*.json` is server-only; client receives the aggregate |
| Render sidebar footer + progress bar | Browser/Client | — | Pure display; data fetched from `GET /api/stats/cost` |
| Settings panel UI + open/close state | Browser/Client | — | `useState` boolean in App.jsx (no router, no context); per CONTEXT.md "App.jsx settings open state" |
| Persist user settings (font/density/threshold) | Browser/Client | — | Pure UI prefs; localStorage on the device, no backend coupling for theme/font/density |
| Apply density before first paint | Browser/Client | — | FOUC blocker is inline JS in `index.html` that runs before React mounts |
| Stage 4 threshold override flowing to backend | API/Backend | Browser/Client | localStorage holds the value client-side; client sends per-request in the JSON body; backend `research_strategy.run` consumes the kwarg |

## Standard Stack

### Core (no net new runtime deps — all stack already pinned in `pyproject.toml` and `frontend/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | `>=0.115.0` (resolved `0.121.3`) | New `GET /api/stats/cost` route + Pydantic `stage4_threshold` field | Already the backend HTTP layer; no add |
| Pydantic | `>=2.9.0` (resolved `2.12.4`) | `SendMessageRequest.stage4_threshold: Optional[int] = Field(None, ge=1, le=10)` | v2 `Field` with `ge`/`le` is the canonical constraint primitive |
| httpx | `>=0.27.0` (resolved `0.28.1`) | Unchanged — `query_model` still uses `httpx.AsyncClient`; only the response-parsing block grows | Already in stack |
| React | `^19.2.0` | New `useSettings` hook + `SettingsPanel.jsx` + Header gear button | Already the framework |
| Vite | `^7.2.4` | No change | Already the build tool |

**Version verification (Python deps already locked in `uv.lock`; no add):**
```bash
# Confirm no new runtime additions needed
uv pip list | grep -E "fastapi|pydantic|httpx"
```

### Supporting (zero new — explicit)

Per STACK.md §"Cost Analytics — Net new deps: zero" + §"Settings Page — Net new deps: zero". No `zustand`, no `jotai`, no slider library, no animation library. All UI primitives are native: `<dialog>` + `showModal()`, `<input type="range">`, `<input type="radio">`, inline SVG.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` + `showModal()` | `react-modal` / `@radix-ui/react-dialog` | Native ships native focus-trap + ESC + `::backdrop` for free; no dep weight; matches Phase 7 MOBL-02 lookahead which also plans `<dialog>` |
| Individual localStorage keys (`theme`, `fontSize`, `density`, `stage4Threshold`) | Single namespaced JSON object | Individual keys mirror `useTheme` 1:1, give granular `storage` events, avoid JSON.parse in the FOUC blocker (which runs before any JS framework). Locked by CONTEXT.md. |
| `<input type="range">` native | `react-slider` / `rc-slider` | Native handles a11y (`aria-valuemin/max/now`), touch, keyboard, `prefers-reduced-motion` for free. Locked by D-05. |
| Filesystem walk per `/api/stats/cost` call | Persisted `.index.json` aggregate | PITFALLS.md §MIN-3 raises perf, but single-user with <1000 conversations is sub-100ms cold; lazy walk preserves source-of-truth invariant (no derived state to invalidate). Index file is a v2.1 optimization if real-world latency surfaces. |
| Read OpenRouter `usage.cost` for fee + `cost_details.upstream_inference_cost` for upstream | Pre-compute fee = `upstream × 0.05` and skip the field | Per the verified shape (§3), `cost` is the OpenRouter-side debit and is always returned for BYOK. Pre-computing would silently break if OpenRouter changes the fee structure. Read both fields directly. |

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (CLIENT)                              │
│                                                                            │
│  FOUC blocker IIFE (index.html sync, before React mount)                   │
│    └─ reads localStorage{theme, density} → sets <html data-theme=…         │
│                                              data-density=…>               │
│                                                                            │
│  React tree                                                                │
│  ├─ App.jsx ──────── useState settingsOpen ────────────┐                   │
│  ├─ Header.jsx ────── [&] [☼] [⚙] ───────────────────┘   │                 │
│  │      └─ ⚙ button onClick → setSettingsOpen(true)      │                 │
│  ├─ Sidebar.jsx ─── conversation list + (NEW) sidebar-footer__cost          │
│  │      └─ on mount + complete event → api.getCostStats() → render dual-col│
│  ├─ ChatInterface.jsx                                                       │
│  │      └─ MessageHeader (NEW cost-line append after profile row)           │
│  │             └─ reads msg.metadata.cost → render or hide                  │
│  └─ SettingsPanel.jsx (NEW)                                                 │
│         └─ <dialog ref=…> + showModal() when settingsOpen=true              │
│              └─ Theme | Font size | Density | Stage 4 threshold             │
│                 └─ all wired to useSettings() setters                       │
│                                                                            │
│  useSettings() (NEW hook, ~30 LOC mirror of useTheme.js)                    │
│    ├─ readInitialFontSize/Density/Stage4Threshold (sync read of localStorage)│
│    ├─ effect: sync DOM attribute (data-fontsize, data-density) on change   │
│    └─ setters write through localStorage → React state → DOM                │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/JSON + SSE
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            FASTAPI (BACKEND)                                │
│                                                                            │
│  POST /api/conversations/{id}/message/stream                                │
│    SendMessageRequest now carries optional stage4_threshold                 │
│       ├─ if profile == quality_research:                                    │
│       │     research_strategy.run(..., threshold_override=req.stage4_…)     │
│       │       └─ falls back to PROFILES default when None                   │
│       └─ council.stage1/2/3 — accumulate per-call cost                      │
│                                                                            │
│  POST /api/conversations/{id}/critique/stream  (Phase 5)                    │
│    └─ same cost-capture path (council.stage1/2/3 + chairman)                │
│                                                                            │
│  GET /api/stats/cost  (NEW)                                                 │
│    └─ os.scandir(DATA_DIR) → for each *.json → parse → filter by created_at │
│       to current month → sum metadata.cost.{total, upstream_total} per      │
│       profile → return aggregate JSON                                       │
│                                                                            │
│  backend/openrouter.py                                                      │
│    query_model() returns                                                    │
│      { content, reasoning_details,                                          │
│        cost: { openrouter_fee_usd: float|0, upstream_usd: float|0 } }       │
│      ← extracted from response.json()["usage"].cost                         │
│      and response.json()["usage"].cost_details.upstream_inference_cost      │
│                                                                            │
│  backend/council.py + research_strategy.py                                  │
│    Accumulate cost per stage → pack into metadata.cost = {                  │
│      stage1, stage2, stage3, stage4, total, upstream_total, currency:"USD"} │
│                                                                            │
│  backend/storage.py                                                         │
│    add_assistant_message(metadata={…, cost: {…},                            │
│                                    label_to_model: {…},                     │
│                                    aggregate_rankings: [...]})              │
│    ← signature UNCHANGED; metadata dict is opaque                           │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JSON files
                                    ▼
                       data/conversations/*.json
                       (schema_version: 2, mode: fresh|critique,
                        messages[].metadata.{profile, models, chairman,
                                             label_to_model, aggregate_rankings,
                                             cost})
```

### Recommended Project Structure (NEW files only — existing files MODIFIED)

```
backend/
├── main.py                  # MODIFIED — add GET /api/stats/cost; extend
│                            #   SendMessageRequest with stage4_threshold;
│                            #   merge label_to_model + aggregate_rankings into
│                            #   metadata in fast/quality streaming branch
├── council.py               # MODIFIED — accumulate cost per stage from
│                            #   query_model returns; emit metadata.cost
├── research_strategy.py     # MODIFIED — add threshold_override kwarg;
│                            #   accumulate cost across 4 stages
├── openrouter.py            # MODIFIED — extract usage.cost +
│                            #   cost_details.upstream_inference_cost from
│                            #   response.json(); return alongside content
├── stats.py                 # NEW (~40 LOC) — aggregate_current_month() reads
│                            #   data/conversations/*.json read-only and sums
│                            #   metadata.cost; called by GET /api/stats/cost
└── storage.py               # UNCHANGED signature; only callers change

frontend/
├── index.html               # MODIFIED — extend FOUC blocker IIFE with
│                            #   localStorage.getItem('density') → data-density
├── src/
│   ├── api.js               # MODIFIED — add getCostStats() wrapper; extend
│   │                        #   sendMessage/sendMessageStream to forward
│   │                        #   stage4_threshold when profile==='quality_research'
│   ├── hooks/
│   │   ├── useTheme.js      # UNCHANGED — composed inside useSettings()
│   │   └── useSettings.js   # NEW (~30 LOC mirror of useTheme.js)
│   └── components/
│       ├── Header.jsx       # MODIFIED — add gear button next to theme toggle
│       ├── Sidebar.jsx      # MODIFIED — append .sidebar-footer__cost block
│       ├── Sidebar.css      # MODIFIED — footer layout + progress bar
│       ├── MessageHeader.jsx # MODIFIED — append cost-line render
│       ├── MessageHeader.css # MODIFIED — .cost-line styles
│       ├── SettingsPanel.jsx # NEW (~120 LOC combined w/ CSS) — <dialog> drawer
│       └── SettingsPanel.css # NEW
```

### Pattern 1: `metadata` opaque-dict extension (no signature change)

**What:** Append new keys to the persisted `metadata` dict in the caller, never extend `add_assistant_message` signature.

**When to use:** Anything that needs to ride along with an assistant message and survive reload-from-disk — this phase adds `cost`, `label_to_model`, `aggregate_rankings` to it.

**Example (Phase 5 already does this for critique; Phase 6 mirrors the pattern):**

```python
# backend/main.py — fast/quality streaming branch (after Stage 3 + stats aggregate)
combined_metadata = {
    "profile": request.profile,
    "models": council_models,
    "chairman": chairman_model,
    "label_to_model": label_to_model,         # NEW — was emitted in SSE, now persisted
    "aggregate_rankings": aggregate_rankings,  # NEW — was emitted in SSE, now persisted
    "cost": {                                 # NEW — Phase 6 COST-01
        "stage1": <float>, "stage2": <float>, "stage3": <float>,
        "stage4": None,  # only quality_research populates stage4
        "total": <float>, "upstream_total": <float>, "currency": "USD",
    },
}
storage.add_assistant_message(
    conversation_id, stage1_results, stage2_results, stage3_result,
    metadata=combined_metadata,
)
```

Source: `backend/storage.py:215-275` docstring at line 232 already declares `metadata` as "opaque dict persisted verbatim". Phase 5 `main.py:511-523` already exercises this with `metadata.label_to_model + aggregate_rankings + mode` for critique.

### Pattern 2: `query_model` return-shape evolution (backward-compat)

**What:** Add new keys to the returned dict; never remove the existing `content` / `reasoning_details` keys. Callers that destructure `{content}` keep working.

**Example:**

```python
# backend/openrouter.py — current shape returns {content, reasoning_details}
# New shape adds 'cost' key — existing callers ignore it; new callers read it.
return {
    'content': message.get('content'),
    'reasoning_details': message.get('reasoning_details'),
    'cost': _extract_cost(data),  # NEW — see §3 below for the helper
}

def _extract_cost(data: dict) -> dict:
    """Extract cost from OpenRouter usage block; safe defaults on missing fields."""
    usage = data.get('usage') or {}
    cost_details = usage.get('cost_details') or {}
    return {
        'openrouter_fee_usd': float(usage.get('cost') or 0.0),
        'upstream_usd': float(cost_details.get('upstream_inference_cost') or 0.0),
    }
```

Why safe defaults: per OpenRouter API reference (verified), `cost` and `cost_details` are both OPTIONAL fields. They are populated on BYOK requests (our entire stack) but defensive code is cheap and prevents `None` arithmetic downstream.

### Pattern 3: `useSettings()` as exact mirror of `useTheme`

**What:** Replicate `useTheme.js:51-94`'s structure: synchronous `readInitial*` for SSR-free first-render parity, `useState` with reader as initializer, `useEffect` to push DOM attribute, `useCallback` setters that write to localStorage + state in one shot.

**Example:**

```js
// frontend/src/hooks/useSettings.js — ~30 LOC mirror
import { useState, useEffect, useCallback } from 'react';

const KEY_FONT = 'fontSize';   // 's' | 'm' | 'l'
const KEY_DENSITY = 'density'; // 'compact' | 'comfortable'
const KEY_STAGE4 = 'stage4Threshold'; // integer 1-10 (default 8 — see config.py PROFILES)

const DEFAULTS = { fontSize: 'm', density: 'comfortable', stage4Threshold: 8 };

function readInitial(key, fallback, validate) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null && validate(stored)) return validate(stored);
  } catch { /* private browsing */ }
  return fallback;
}

export function useSettings() {
  const [fontSize, setFontSizeState] = useState(() =>
    readInitial(KEY_FONT, DEFAULTS.fontSize, v => ['s','m','l'].includes(v) ? v : null));
  const [density, setDensityState] = useState(() =>
    readInitial(KEY_DENSITY, DEFAULTS.density, v => ['compact','comfortable'].includes(v) ? v : null));
  const [stage4Threshold, setStage4ThresholdState] = useState(() =>
    readInitial(KEY_STAGE4, DEFAULTS.stage4Threshold, v => {
      const n = parseInt(v, 10);
      return (Number.isInteger(n) && n >= 1 && n <= 10) ? n : null;
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

Theme is **delegated** to `useTheme` (not duplicated inside `useSettings`) so the existing Header theme toggle and the settings-panel theme control share the same React state. The settings panel imports both: `const { theme, toggle } = useTheme(); const settings = useSettings();`

### Anti-Patterns to Avoid

- **Animated cost ticker counting up during deliberation (AA2).** Violates Direction A "calmo". Static post-deliberation render only.
- **Persisting a top-level `total_cost` field at conversation root.** Computed on-read from `messages[].metadata.cost`. Single source of truth; no invalidation. (ARCHITECTURE.md §3.2 lock.)
- **Single namespaced localStorage object** (`{theme, fontSize, density, stage4Threshold}` under one key). Rejected; individual keys mirror `useTheme`, give granular `storage` events, and let the FOUC blocker read density without `JSON.parse`.
- **Save/Cancel buttons in Settings panel.** Rejected per D-03.
- **Reading PROFILES from the frontend to seed the slider.** PROFILES lives server-side. Hardcode `8` on the frontend with a code comment `// MIRROR: backend/config.py PROFILES["quality_research"]["stage4_threshold"]`. OR expose a small `GET /api/config/defaults` endpoint that returns `{stage4_threshold: 8}` for the slider initializer. Plan-time decides; both are valid. Recommend the hardcode-with-comment path (matches Phase 5 D-03 precedent for `QUALITY_SLOT_MODELS` in `CritiqueWelcome.jsx:15-19`).
- **Hand-rolled focus trap in Settings panel.** Use `<dialog>` + `showModal()` native focus-trap; don't reimplement what Modal.jsx did manually (Modal.jsx pre-dates this and uses a manual trap; SettingsPanel.jsx gets to set the new convention via `<dialog>`).
- **Computing cost client-side from token counts × pricing tables.** Read `usage.cost` from the OpenRouter response. Provider pricing changes silently; the field is the source of truth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/drawer focus trap, ESC dismiss, backdrop click | Manual Tab cycling like `Modal.jsx:53-71` | Native `<dialog ref=…>` + `showModal()` | Browser handles focus trap + ESC + ::backdrop + reflow; matches Phase 7 MOBL-02 convention; works in all 2026 evergreens |
| Slider control (range 1-10) | `react-slider` / `rc-slider` | `<input type="range" min="1" max="10" step="1">` | Native a11y, keyboard, touch, `prefers-reduced-motion` |
| Settings state container | `zustand` / `jotai` / `redux-toolkit` | `useState` + localStorage in `useSettings()` | Total state = 4 keys; the existing `useTheme` precedent works |
| FOUC for theme (already in v1.0) + density (Phase 6) | React Suspense / lazy hydrate | Inline IIFE in `index.html:8-18` | Sync attribute on `<html>` before first paint is the only way to avoid a layout flicker on density swap |
| Cost-line digit alignment | Hand-spaced CSS | `font-variant-numeric: tabular-nums` (already on `.message-header` at `MessageHeader.css:21-23` and on `.conversation-meta` at `Sidebar.css:159-165`) | Native font feature; no JS |
| Token estimation for cost | `tiktoken` (Python) | Read `usage.cost` from response | Phase 5 already does heuristic `len/4` for the pre-flight token cap; for COST we have the authoritative number |
| Slide-out panel animation | `framer-motion` / `react-spring` | CSS `transform: translate3d()` + `transition` over `var(--motion-duration-base) var(--motion-easing-out)` | Token system already declares these in v1.0; matches `Sidebar.css:39` pattern |

**Key insight:** Phase 6 is mostly **data plumbing** + UI assembly on top of v1.0 primitives. The only new "creative" surface is the slide-out panel geometry, and even that defers to the native `<dialog>` element.

## Runtime State Inventory

**Phase 6 is greenfield additive — no rename, no refactor, no migration.** All state extensions are append-only:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `data/conversations/*.json` already exist (Phase 5 v2 shape). Phase 6 appends to `metadata.cost` + `metadata.label_to_model` + `metadata.aggregate_rankings` on NEW writes. Existing pre-Phase-6 v2 messages will lack `metadata.cost` — that's the legacy-fallback case in MessageHeader rendering (`metadata.cost?.total === undefined` → render no cost line). | None — backward-compat reads via optional chaining. |
| Live service config | n/a | None |
| OS-registered state | n/a | None |
| Secrets/env vars | `OPENROUTER_API_KEY` unchanged. No new env vars in Phase 6. | None |
| Build artifacts | None — no Python or npm installs needed (zero net deps). `frontend/dist/` rebuild on `npm run build` includes new components automatically. | None |

**Nothing else found:** Verified by grepping for `Settings` / `cost` / `stage4_threshold` across the repo. No external services, no schedulers, no caches.

## Environment Availability

**No new external dependencies introduced by Phase 6.** The stack inherited from v1.0/Phase-5 is sufficient.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.10 | Backend | ✓ | per `.python-version` | — |
| `uv` | Backend install/run | ✓ | per `start.sh` | — |
| `httpx` | OpenRouter calls | ✓ | 0.28.1 | — |
| `pydantic` | Request validation (incl. new `stage4_threshold` field) | ✓ | 2.12.4 | — |
| Node.js + npm | Frontend dev/build | ✓ | per repo | — |
| Browser `<dialog>` + `showModal()` | Settings panel | ✓ | All evergreen 2026 (Safari 15.4+, Chrome 37+, Firefox 98+); the v1.0 codebase already targets the same baseline | — |
| OpenRouter `usage.cost` + `cost_details.upstream_inference_cost` fields | Cost capture | UNVERIFIED at runtime — documented in API reference but never logged from a live BYOK call | — | If `cost` is `None` / missing on response, the safe-default `_extract_cost` (§3 Pattern 2) yields 0.0 for both, and the cost line hides itself (D-01 hide-zero rule). Plan-1 spike confirms field names before any user-visible UI lands. |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** OpenRouter `usage` runtime shape — see Plan-1 spike strategy in §3.

## Common Pitfalls

### Pitfall 1: CRIT-3 already closed by Phase 5 — don't redo it here

**What goes wrong:** Re-implementing schema_version + migration logic. Phase 5 already verified the lazy migration in `storage.py:54-88` and `get_conversation` (no eager write-back). All Phase 6 needs is to TRUST that PERS-03 is in place.

**Why it happens:** `metadata` extensions can look like schema work.

**How to avoid:** Pack new keys into the existing `metadata` dict. Don't touch `migrate_message_v1_to_v2` or `_migrate_conversation_if_needed`. Confirm Phase 5 verification report (`05-VERIFICATION.md` line 47, SC-4) says `✓ VERIFIED`.

**Warning signs:** Plan-1 proposes adding a `cost_schema_version` field or a new migration helper. Reject.

### Pitfall 2: `usage.cost` semantics drift on BYOK vs non-BYOK

**What goes wrong:** Per the verified API reference, `is_byok: boolean` is also a sub-field of `usage`. The numeric `cost` value is the OpenRouter-side debit (the 5% BYOK fee). On the first 1M BYOK requests per month, OpenRouter waives the fee — so `cost` may be 0 (or absent) while `upstream_inference_cost` is a real number. The cost line must handle this: show ONLY the upstream amount when fee=0, or use the D-01 hide-zero rule (`total < 0.001` hides everything).

**Why it happens:** Reading `cost` as "total cost" and `upstream_inference_cost` as "additional" (additive misreading).

**How to avoid:**
- `metadata.cost.total = openrouter_fee_usd + upstream_usd` (both are USD-denominated, both are end-user-billable amounts; sum them for the "real spend this query")
- `metadata.cost.upstream_total = upstream_usd only` — separate accounting for the BYOK column in the sidebar footer
- Plan-1 spike must log ALL fields including `is_byok` to confirm the relationship

**Warning signs:** "Total cost" UI shows a number significantly higher than expected (double-counting) or 5% of expected (missing upstream).

### Pitfall 3: `stage4_threshold` validator silent passthrough

**What goes wrong:** `Field(None, ge=1, le=10)` validates the range BUT only when present. v1 requests (no field) pass validation and `request.stage4_threshold` is `None`. If `research_strategy.run` doesn't apply the fallback, `None < threshold` raises `TypeError` at the critic step.

**Why it happens:** Forgetting the `if threshold_override is None: threshold_override = profile_config["stage4_threshold"]` line in `research_strategy.run`.

**How to avoid:**
- In `research_strategy.run` (line 178 of current file), replace `threshold = profile_config["stage4_threshold"]` with `threshold = threshold_override if threshold_override is not None else profile_config["stage4_threshold"]`.
- Add a unit-style sanity check (single function call in Plan-1) that confirms a v1 request body (no `stage4_threshold`) still produces a real run, not a 422.

**Warning signs:** First v1-shape request after deploy returns 500. (Or — if validator is mis-set to required — 422 with `field required`.)

### Pitfall 4: `useSettings` ESM circular import with `useTheme`

**What goes wrong:** If `useSettings.js` imports `useTheme` AND the SettingsPanel imports both, accidental circular dep through a shared module can surface as "useTheme is not defined" at runtime.

**Why it happens:** Over-aggressive composition. `useSettings` does NOT need to import `useTheme`; SettingsPanel imports them separately.

**How to avoid:** Keep `useSettings` standalone (only handles fontSize/density/stage4Threshold). SettingsPanel composes `const {theme, toggle} = useTheme(); const s = useSettings();` at the component level.

**Warning signs:** Vite dev server runtime error about undefined exports on the first render of the Settings panel.

### Pitfall 5: FOUC blocker error-tolerance

**What goes wrong:** Adding `localStorage.getItem('density')` to the existing IIFE outside the existing `try/catch` block. If the user's browser blocks localStorage (private mode, disabled storage), the script crashes and the theme block is also lost.

**Why it happens:** Sloppy IIFE editing.

**How to avoid:** Insert the new line INSIDE the existing `try` block at `index.html:11-14`, after the theme `setAttribute`:

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (systemDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      // NEW (Phase 6 SET-04):
      var density = localStorage.getItem('density') || 'comfortable';
      document.documentElement.setAttribute('data-density', density);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-density', 'comfortable');  // also default in catch
    }
  })();
</script>
```

**Warning signs:** Dark/light theme stops working after the FOUC blocker edit. Or the page paints with light theme briefly on every load.

### Pitfall 6: Reading `data/conversations/` synchronously inside async handler

**What goes wrong:** `GET /api/stats/cost` reads N files with synchronous `open()` + `json.load`. Backend is async/uvicorn — the event loop blocks for the duration of the read.

**Why it happens:** Following the existing pattern (`backend/storage.py:165-192` `list_conversations` already does this).

**How to avoid:**
- For Phase 6 single-user local app: accept the block. PITFALLS.md §MIN-3 acknowledges this; the existing `list_conversations` does it. <100 conversations × small JSON = <50ms total.
- Add an early scope-cut path: if `len(files) > 500`, return a `partial=True` flag in the response and skip aggregation older than 30 days. (Recommend NOT building this for v2.0; flag for v2.1 if real-world usage hits the boundary.)
- DO NOT add `aiofiles` as a runtime dep just for this — STACK.md locks "zero new runtime deps".

**Warning signs:** Sidebar footer takes >500ms to populate the cost numbers after a fresh app load.

### Pitfall 7: Drift between PROFILES default (backend) and slider initial (frontend)

**What goes wrong:** Operator changes `PROFILES["quality_research"]["stage4_threshold"]` from 8 to 7 in `backend/config.py`. Frontend slider still defaults to 8 because it's hardcoded.

**Why it happens:** Hardcoded constant duplicated in two places.

**How to avoid:** Either:
- (a) Hardcode `8` in the frontend WITH a code comment `// MIRROR: backend/config.py PROFILES["quality_research"]["stage4_threshold"]` (matches Phase 5 D-03 precedent for `QUALITY_SLOT_MODELS` in `CritiqueWelcome.jsx:15-19`), and document the drift risk in STATE.md tech debt.
- (b) Add `GET /api/config/defaults` returning `{stage4_threshold: 8}` and have `useSettings` fetch it once on mount, with a hardcoded 8 fallback if the request fails.

Recommend (a). The drift cost is low (a one-line edit when changing the default); the runtime cost of (b) is non-zero (extra HTTP roundtrip on every app boot).

**Warning signs:** None at runtime — only surfaces during operator tuning of the PROFILES dict.

## Code Examples

### `query_model` cost extraction (backend/openrouter.py)

```python
# Source: backend/openrouter.py current shape (lines 53-72) + OpenRouter
# API reference verified shape (see Sources). Cost extraction is additive;
# existing 'content' / 'reasoning_details' contract preserved verbatim.

def _extract_cost_from_usage(data: Dict[str, Any]) -> Dict[str, float]:
    """Pull cost + upstream_inference_cost from the response usage block.

    OpenRouter docs (verified 2026-05-11): `usage.cost` is the OpenRouter-side
    debit (5% BYOK fee, may be 0 during first 1M BYOK requests/month);
    `usage.cost_details.upstream_inference_cost` is the user's actual provider
    bill. Both are USD-denominated. Both are nullable / absent in edge cases —
    coerce to 0.0 for clean arithmetic downstream.
    """
    usage = data.get('usage') or {}
    cost_details = usage.get('cost_details') or {}
    return {
        'openrouter_fee_usd': float(usage.get('cost') or 0.0),
        'upstream_usd': float(cost_details.get('upstream_inference_cost') or 0.0),
    }

# In query_model, after response.json():
data = response.json()
message = data['choices'][0]['message']
return {
    'content': message.get('content'),
    'reasoning_details': message.get('reasoning_details'),
    'cost': _extract_cost_from_usage(data),  # NEW
}
```

### `metadata.cost` aggregation across stages (backend/council.py and research_strategy.py)

```python
# Source: pattern derived from research_strategy.py:191-201 + council.py
# stage1_collect_responses + new aggregation helper.

def _sum_cost(responses: List[Dict[str, Any] | None]) -> Dict[str, float]:
    """Sum 'cost' across a batch of query_model returns; None entries skipped."""
    total_fee = 0.0
    total_upstream = 0.0
    for r in responses:
        if r is None:
            continue
        cost = r.get('cost') or {}
        total_fee += float(cost.get('openrouter_fee_usd') or 0.0)
        total_upstream += float(cost.get('upstream_usd') or 0.0)
    return {'fee': total_fee, 'upstream': total_upstream}

# In stage1_collect_responses (after the responses dict is built):
stage1_costs = _sum_cost(list(responses.values()))
# Caller (main.py event_generator) gets stage1_costs back and accumulates.

# Final metadata.cost packing in main.py / research_strategy.py:
metadata['cost'] = {
    'stage1': stage1_costs['fee'] + stage1_costs['upstream'],
    'stage2': stage2_costs['fee'] + stage2_costs['upstream'],
    'stage3': stage3_costs['fee'] + stage3_costs['upstream'],
    'stage4': (stage4_costs['fee'] + stage4_costs['upstream']) if stage4_triggered else None,
    'total': <sum of all stages>,
    'upstream_total': stage1_costs['upstream'] + stage2_costs['upstream']
                    + stage3_costs['upstream'] + (stage4_costs['upstream'] if stage4 else 0.0),
    'currency': 'USD',
}
```

**Note on stage-totals:** UI-SPEC's MessageHeader cost line is `upstream` and `fee` separately — but `metadata.cost.{stage1,stage2,stage3,stage4}` is a SUM per stage (fee+upstream). The UI splits the total via `metadata.cost.upstream_total` (only the upstream sum) and computes `total - upstream_total` for the fee column. This shape keeps the persisted blob small while giving the UI both views.

Alternative shape (slightly larger blob, simpler UI): make each stage value a dict `{fee, upstream}`. Plan-time picks; recommend the dict shape if the per-stage breakdown ever gets surfaced (deferred per CONTEXT.md "Per-conversation cost stats panel — out of scope").

### `GET /api/stats/cost` aggregation (backend/stats.py NEW + main.py route)

```python
# Source: ARCHITECTURE.md §3.2 + pattern from storage.list_conversations.

# backend/stats.py (NEW, ~40 LOC)
import os
import json
from datetime import datetime, timezone
from typing import Dict, Any
from .config import DATA_DIR

OPENROUTER_CAP_USD = 100.0  # CONTEXT.md lock


def aggregate_current_month() -> Dict[str, Any]:
    """Walk data/conversations/*.json, sum metadata.cost for the current month.

    Filter by `created_at` >= start-of-current-month (UTC). Recompute every call —
    no persisted total (single-source-of-truth invariant).
    """
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    fee_total = 0.0
    upstream_total = 0.0
    queries = 0
    by_profile: Dict[str, float] = {}

    if not os.path.isdir(DATA_DIR):
        return _empty_response()

    for entry in os.scandir(DATA_DIR):
        if not entry.is_file() or not entry.name.endswith('.json'):
            continue
        try:
            with open(entry.path, 'r', encoding='utf-8') as f:
                conv = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        if conv.get('created_at', '') < month_start:
            continue
        for msg in conv.get('messages', []):
            if msg.get('role') != 'assistant':
                continue
            cost = (msg.get('metadata') or {}).get('cost') or {}
            total = float(cost.get('total') or 0.0)
            upstream = float(cost.get('upstream_total') or 0.0)
            fee_total += (total - upstream)
            upstream_total += upstream
            queries += 1
            profile = (msg.get('metadata') or {}).get('profile') or 'unknown'
            by_profile[profile] = by_profile.get(profile, 0.0) + total

    pct_of_cap = (fee_total / OPENROUTER_CAP_USD) if OPENROUTER_CAP_USD > 0 else 0.0
    return {
        'current_month': {
            'total_usd': round(fee_total, 4),
            'upstream_total_usd': round(upstream_total, 4),
            'queries': queries,
            'by_profile': {k: round(v, 4) for k, v in by_profile.items()},
        },
        'current_session_estimate_for_cap': {
            'remaining_pct': round(max(0.0, 1.0 - pct_of_cap) * 100, 1),
            'used_pct': round(pct_of_cap * 100, 1),
            'cap_usd': OPENROUTER_CAP_USD,
        },
    }


def _empty_response() -> Dict[str, Any]:
    return {
        'current_month': {'total_usd': 0.0, 'upstream_total_usd': 0.0, 'queries': 0, 'by_profile': {}},
        'current_session_estimate_for_cap': {'remaining_pct': 100.0, 'used_pct': 0.0, 'cap_usd': OPENROUTER_CAP_USD},
    }

# backend/main.py route (NEW)
@app.get("/api/stats/cost")
async def get_stats_cost():
    """Read-only aggregate of current-month cost across all conversations."""
    from . import stats
    return stats.aggregate_current_month()
```

### SettingsPanel skeleton (frontend/src/components/SettingsPanel.jsx NEW)

```jsx
// Source: UI-SPEC §Layout Specifications + §Behavior Specifications + Modal.jsx
// patterns (for FOCUSABLE selector reference).

import { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';
import './SettingsPanel.css';

export default function SettingsPanel({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const { theme, toggle } = useTheme();
  const { fontSize, density, stage4Threshold,
          setFontSize, setDensity, setStage4Threshold } = useSettings();

  // Drive native <dialog> via showModal/close per UI-SPEC §Behavior.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen && !dlg.open) dlg.showModal();
    if (!isOpen && dlg.open) dlg.close();
  }, [isOpen]);

  // <dialog> emits 'close' when ESC or method-close fires; bubble up.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handler = () => onClose();
    dlg.addEventListener('close', handler);
    return () => dlg.removeEventListener('close', handler);
  }, [onClose]);

  // Click-outside dismiss: <dialog> click hits ::backdrop pseudo-element.
  // Per Modal.jsx:84-89 pattern: e.target === e.currentTarget guard.
  function handleBackdropClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog ref={dialogRef} className="settings-panel" onClick={handleBackdropClick}>
      <header className="settings-panel__header">
        <h2 className="settings-panel__title">Settings</h2>
        <button className="settings-panel__close"
                onClick={onClose}
                aria-label="Close settings">
          {/* X icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <section className="settings-panel__group">
        <span className="settings-panel__label">Theme</span>
        <button onClick={toggle}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
      </section>

      <section className="settings-panel__group">
        <fieldset>
          <legend className="settings-panel__label">Font size</legend>
          {['s', 'm', 'l'].map(size => (
            <label key={size}>
              <input type="radio" name="fontSize" value={size}
                     checked={fontSize === size}
                     onChange={e => setFontSize(e.target.value)}
                     aria-label={{s:'Small (15px)',m:'Medium (17px)',l:'Large (19px)'}[size]} />
              {size.toUpperCase()}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="settings-panel__group">
        <fieldset>
          <legend className="settings-panel__label">Density</legend>
          {['compact', 'comfortable'].map(d => (
            <label key={d}>
              <input type="radio" name="density" value={d}
                     checked={density === d}
                     onChange={e => setDensity(e.target.value)} />
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="settings-panel__group">
        <label className="settings-panel__label" htmlFor="stage4-threshold">
          Stage 4 threshold
        </label>
        <div className="settings-panel__slider-row">
          <input id="stage4-threshold" type="range" min="1" max="10" step="1"
                 value={stage4Threshold}
                 onChange={e => setStage4Threshold(parseInt(e.target.value, 10))}
                 aria-label="Stage 4 threshold" />
          <span className="settings-panel__slider-value" aria-live="polite">
            {stage4Threshold}
          </span>
        </div>
        <p className="settings-panel__slider-microcopy">
          Higher = stricter; only refine when answer scores ≥{stage4Threshold}/10
        </p>
      </section>
    </dialog>
  );
}
```

### MessageHeader cost line append (frontend/src/components/MessageHeader.jsx)

```jsx
// Source: existing MessageHeader.jsx:23-43 + D-01 verbatim format.
// The legacy fallback at line 26-28 stays; new cost line is conditional below.

export default function MessageHeader({ metadata }) {
  if (!metadata?.profile) {
    return <div className="message-header legacy">Quality (legacy)</div>;
  }
  const label = PROFILE_LABELS[metadata.profile] || metadata.profile;
  const count = metadata.models?.length ?? 0;
  const chairman = shortName(metadata.chairman);
  const stage4Suffix = metadata.stage4_triggered ? ' + Stage 4 refinement' : '';

  // NEW — cost line render rules (D-01 + UI-SPEC §Behavior):
  const cost = metadata.cost;  // {total, upstream_total, currency, ...} | undefined
  const showCostLine = cost && typeof cost.total === 'number' && cost.total >= 0.001;
  const upstream = showCostLine ? cost.upstream_total : 0;
  const fee = showCostLine ? Math.max(0, cost.total - upstream) : 0;

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
      {showCostLine && (
        <div className="message-header__cost-line">
          <strong className="cost-line__upstream">
            ${upstream.toFixed(3)} upstream
          </strong>
          <span className="header-sep"> · </span>
          <span className="cost-line__fee">${fee.toFixed(3)} fee</span>
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discard `data.get('usage')` after parsing | Extract `usage.cost` + `usage.cost_details.upstream_inference_cost` and propagate | Phase 6 (this phase) | Per-message cost line + monthly aggregation become feasible |
| `usage:{include:true}` request flag (was needed pre-2025 to get cost in response) | Deprecated no-op — full usage automatically returned | OpenRouter cookbook 2025 | Backend code does NOT need to set the flag; documented for code reviewers who may suggest adding it |
| Hand-rolled modal focus trap (`Modal.jsx:53-71`) | Native `<dialog>` + `showModal()` | Phase 7 MOBL-02 + Phase 6 SettingsPanel | Settings panel ships the convention first; Phase 7 reuses |
| Hardcoded `stage4_threshold = 8` in `research_strategy.py` (v1.0) | Already moved to `PROFILES["quality_research"]["stage4_threshold"]` in v1.0; Phase 6 SET-03 adds per-request override | This phase | User can tune without restart |

**Deprecated/outdated:**
- `usage:{include:true}` request flag — REMOVE if anyone proposes adding it.
- Documentation guidance suggesting BYOK fee = `cost - upstream` — verified that `cost` already IS the BYOK fee directly (not a sum). Don't subtract.

## Validation Architecture

**SKIPPED — `workflow.nyquist_validation` is `false` in `.planning/config.json`.**

(Phase 6 inherits the v1.0 + Phase-5 test posture: no automated test infra yet. Phase 7 introduces pytest/vitest/Playwright. Phase 6 plans must document manual verification steps for each plan but do not add automated tests.)

## Security Domain

Per project constraints: single-user, localhost-only, no auth. Cost analytics is **read-only** server-side and **client-only** for settings persistence (localStorage). No new attack surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app; no auth in v2.0 |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | localhost-only, no multi-tenant model |
| V5 Input Validation | yes | Pydantic `Field(None, ge=1, le=10)` constraint on `stage4_threshold`; existing UUID validation in `get_conversation_path` (carryover) |
| V6 Cryptography | no | No new crypto surface (settings are not secrets) |

### Known Threat Patterns for {React 19 + FastAPI single-user local}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via conversation_id | Tampering | Already addressed in v1.0 Phase 1 (SEC-01) — `uuid.UUID(id)` validation in `get_conversation_path`. Phase 6 doesn't add a new path-input surface. |
| Out-of-range `stage4_threshold` from a hostile client | Tampering / DoS | Pydantic `Field(None, ge=1, le=10)` rejects with 422 BEFORE the handler runs. v1 requests (no field) pass through with the PROFILES default. |
| localStorage tampering (user edits to set fontSize='xxl') | Tampering | Client-side; the only impact is on the user's own browser. `useSettings` initializer validates the value against an allowlist (`['s','m','l']`) and falls back to default on mismatch. |
| `/api/stats/cost` exposing data of other users | Disclosure | Single-user app; no other users. Backend binds to 127.0.0.1 (`main.py:605`). Out of threat model. |

## Sources

### Primary (HIGH confidence)

- **OpenRouter API reference** (fetched 2026-05-11) — verified shape of `usage` object: `{prompt_tokens, completion_tokens, total_tokens, prompt_tokens_details?, completion_tokens_details?, cost?, is_byok?, cost_details?: {upstream_inference_cost?, upstream_inference_prompt_cost, upstream_inference_completions_cost}, server_tool_use?}`. https://openrouter.ai/docs/api/reference/overview
- **OpenRouter usage accounting** — `usage:{include:true}` flag deprecated as no-op; full usage always returned. https://openrouter.ai/docs/guides/administration/usage-accounting
- **OpenRouter BYOK guide** — 5% BYOK fee, waived for first 1M requests/month; `upstream_inference_cost` only for BYOK requests. https://openrouter.ai/docs/guides/overview/auth/byok
- **Phase 5 verification report** (`05-VERIFICATION.md`) — confirms PERS-03 lazy migration in place; `get_conversation` body has no eager write-back; `metadata` opaque dict pattern exercised for critique writes.
- **Phase 5 research** (`05-RESEARCH.md`) — `migrate_message_v1_to_v2` defaulting behavior; v1 assistant messages without `metadata` get `{}` not `null`.

### Secondary (MEDIUM confidence — verified via multiple sources)

- **ARCHITECTURE.md** (`.planning/research/ARCHITECTURE.md`) §2 (persistence), §3 (cost), §4 (settings) — internal design lock.
- **PITFALLS.md** §MIN-1 (FOUC blocker correctness), §MIN-2 (Pydantic stage4_threshold), §MIN-3 (cost aggregation perf), §MOD-2/MOD-3 (no animated tickers).
- **STACK.md** §"Cost Analytics — Net new deps: zero", §"Settings Page — Net new deps: zero".
- **FEATURES.md** §C (cost analytics), §D (settings panel), §AA2/AA13 anti-features.

### Tertiary (LOW confidence — flagged for spike)

- **Runtime presence of `cost` on EVERY BYOK response** — documented to be automatic post-`usage:{include}`-deprecation, but never logged from THIS app. Plan-1 mandatory 5-min spike will move this to HIGH for the project. Source: WebSearch corroborated by multiple community references (LiteLLM issue #11626, OpenRouter cookbook).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenRouter returns `usage.cost` on every BYOK chat completion call (not just when a flag is set) | §3 + §"Sources" | If absent, the cost line hides itself for every message (safe default); spike confirms before plan-2 |
| A2 | `usage.cost_details.upstream_inference_cost` is populated for BYOK calls against OpenAI/Anthropic/Google providers (our entire stack) | §3 | If absent, the "upstream" segment renders $0.000 and the line hides; spike confirms |
| A3 | OpenRouter `cost` field is the OpenRouter-side debit (the 5% fee), NOT the total. Sum of `cost` + `upstream_inference_cost` = total spend per call. | §3 + Pitfall 2 | If `cost` actually IS the total (double-counts upstream), `metadata.cost.total` is wrong. Spike must confirm semantics with at least 2 sample calls of different magnitudes. |
| A4 | `<dialog>` + `showModal()` works correctly in Safari 15.4+ and matches v1.0 browser baseline | §"Common Pitfalls" + §"Code Examples" SettingsPanel skeleton | Phase 7 plan would have to fall back to `Modal.jsx` pattern; defer to plan-time check |
| A5 | `data/conversations/*.json` walk for the cost endpoint stays sub-100ms for typical user (<200 files) | §6 cost endpoint | Sidebar footer feels slow on power users; MIN-3 v2.1 deferred optimization (index.json) ready to back-stop |
| A6 | The frontend can safely hardcode `8` as the slider initial value while documenting the PROFILES drift risk | §"Pitfall 7" | Operator-only risk (low blast radius); documented in STATE.md tech debt section by Phase 6 planning |

**A3 in particular** — spike must explicitly check this. A misread of "cost" as "total" cascades into every cost-related UI surface.

## Open Questions (RESOLVED)

1. **Per-stage cost dict shape: scalar (current rec) or `{fee, upstream}` per stage?**
   - What we know: UI-SPEC only shows `total` and `upstream_total` aggregates; per-stage breakdown is out of scope for v2.0 (CONTEXT.md "Per-conversation cost stats panel" deferred).
   - What's unclear: whether v2.1 will want the breakdown (C3 from FEATURES.md is P2).
   - Recommendation: scalar `metadata.cost.stage1: float` for v2.0 (smaller blob). If v2.1 ships C3, the migration is `cost.stage1: 0.12` → `cost.stage1: {fee:0.005, upstream:0.115}` which is straightforward (lazy at-read time). Don't over-engineer in v2.0.

2. **Should `useSettings()` return a single setter object or 3 individual setters?**
   - What we know: UI-SPEC §Component Inventory recommends `{theme, fontSize, density, stage4Threshold, setTheme, setFontSize, setDensity, setStage4Threshold}` (explicit setters).
   - What's unclear: whether composing `theme` from `useTheme` introduces awkward duplication of state. Plan-time can decide; the §"Pitfall 4" guidance says compose at the component level (not inside `useSettings`).
   - Recommendation: keep `useSettings` standalone (no theme inside); SettingsPanel composes `useTheme()` and `useSettings()` separately. UI-SPEC's recommended return shape is for the COMPOSED settings UX, not the hook itself.

3. **Sidebar footer refresh trigger: SSE `complete` event vs always-on polling vs mount-only?**
   - What we know: UI-SPEC §Behavior says "Refetch on app mount, on each new assistant message complete (subscribe to the same SSE `complete` event that App.jsx already listens for), and on `visibilitychange` when document becomes visible after >5min hidden (plan-time may scope-cut visibilitychange — minimum is mount+complete refetch)".
   - Recommendation: mount + on `complete` event. Skip `visibilitychange` for v2.0 (scope-cut candidate). The footer being slightly stale during a long idle is acceptable for Direction A "calmo" tone.

4. **Cost line position in MessageHeader: below profile/models row (current rec) or inline?**
   - What we know: UI-SPEC §Layout locks "appended below the existing flex row" with `--space-1` gap.
   - Confirmed; no ambiguity.

5. **Spike scope: log just one response, or all 3 Quality models?**
   - What we know: CONTEXT.md says "5-minute spike that logs one real `usage` block from each Quality model (gpt-5.1, claude-opus-4.1, gemini-2.5-pro)".
   - Note actual model IDs differ in `PROFILES["quality"]`: `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview`.
   - Recommendation: log all 3 — different providers may have provider-specific quirks (e.g., Anthropic upstream cost may include cache-write tokens; Gemini upstream may not honor the same precision). Cheap insurance.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all surfaces already exercised in v1.0/Phase-5.
- Architecture: HIGH — patterns directly inherited from Phase 5 (metadata opaque dict + SSE pass-through + `<dialog>` lookahead from MOBL-02).
- Pitfalls: MEDIUM-HIGH — Pitfall 2 (cost semantics) hinges on spike outcome; Pitfalls 1, 3-7 verified against code on disk.
- OpenRouter shape: MEDIUM-HIGH — documented in API reference; spike upgrades to HIGH.

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days; OpenRouter usage shape and React 19/Vite 7 baseline are stable; settings UX patterns are project-internal locks)

---

*Phase: 6 — Persistence completeness + Cost analytics + Settings panel*
*Research completed: 2026-05-11*
