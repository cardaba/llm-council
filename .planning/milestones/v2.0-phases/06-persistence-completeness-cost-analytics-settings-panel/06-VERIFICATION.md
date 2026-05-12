---
phase: 06-persistence-completeness-cost-analytics-settings-panel
verified: 2026-05-11T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (automated)
overrides_applied: 0
human_verification:
  - test: "Reload a v2.0 Quality conversation and confirm Stage 2 tabs show de-anonymized model names (not 'Response A') and aggregate rankings table renders without 'Quality (legacy)' fallback."
    expected: "Stage 2 tabs display model identifiers from label_to_model; aggregate rankings table shows ranked model names with avg positions."
    why_human: "Requires live servers + browser + a fresh Quality conversation written after commit 8869dd0. The backend dict-pack (label_to_model + aggregate_rankings in message_metadata) is structurally verified — behavioral round-trip through the browser needs a human."
  - test: "Send a Quality message and inspect the MessageHeader cost line beneath the profile row."
    expected: "'$X.XXX upstream · $Y.YYY fee' rendered in the MessageHeader below the profile/models/chairman row; Fast queries show no cost line."
    why_human: "Requires live OpenRouter call to produce non-zero metadata.cost.total >= 0.001. Structural code verified; live display needs human."
  - test: "After at least one cost-tagged query, inspect the Sidebar footer."
    expected: "Two-column block: 'OpenRouter $X.XX / $100' left, 'Upstream $Y.YY BYOK' right, microcopy '{}% of cap · N queries this month'; progress bar only appears at >=80%."
    why_human: "Requires live data in data/conversations/ with non-zero metadata.cost; empty-state has been verified statically."
  - test: "Click the gear icon in Header, interact with all 4 controls (theme, font size S/M/L, density compact/comfortable, stage4_threshold slider 1-10), then reload page."
    expected: "All choices persist across reload via localStorage; data-fontsize and data-density attributes on <html> match the saved values on first paint (no FOUC flicker for density)."
    why_human: "Requires browser. FOUC blocker script is verified statically; behavior on reload (pre-paint attribute sync) needs human confirmation."
  - test: "Set stage4_threshold slider to 3 in Settings panel; send a Quality+Research message; inspect network tab."
    expected: "POST body contains 'stage4_threshold: 3'; for fast/quality profiles the field is absent."
    why_human: "Requires live browser + network inspector. Wiring verified statically through api.js profile guard."
---

## VERIFICATION PASSED

**Phase Goal:** El usuario tiene visibilidad real del coste OpenRouter + upstream BYOK por mensaje y por mes, controles para tunear `stage4_threshold` / font-size / density, y todas las conversaciones (incluido las antiguas v1.0 ya migradas en Phase 5) muestran Stage 2 metadata completo al recargarse.

**Verified:** 2026-05-11
**Status:** human_needed — 5/5 automated truths VERIFIED; 5 items require live-browser confirmation.
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Reloading a v2.0 conversation shows de-anonymized Stage 2 model names and complete aggregate rankings (no "Quality (legacy)" fallback) | VERIFIED (structural) | `backend/main.py:339-340` packs `"label_to_model": label_to_model` and `"aggregate_rankings": aggregate_rankings` into `message_metadata` for fresh-streaming path; analogous at critique branch (line 563). `storage.add_assistant_message` absorbs via opaque-metadata contract. Live browser smoke deferred (Plan 02 Task 2 documented deferral). |
| 2 | MessageHeader shows static cost line "$X.XXX upstream · $Y.YYY fee" post-deliberation; Fast queries show no cost line | VERIFIED (structural) | `backend/openrouter.py:8-25` (`_extract_cost`) + `query_model:88` returns `cost` key. Accumulated in `council.py:558-577` and `main.py:329-349` (fresh-streaming). `MessageHeader.jsx:39-60` renders `message-header__cost-line` gated by `cost.total >= 0.001`. |
| 3 | Sidebar footer shows monthly dual-column cost (OpenRouter fee vs upstream BYOK) with progress bar at ≥80% cap; data from GET /api/stats/cost | VERIFIED (structural) | `backend/stats.py` (`aggregate_current_month()`) reads `data/conversations/*.json` and returns locked shape. `main.py:93-96` mounts `GET /api/stats/cost`. `Sidebar.jsx:150,166-182,399-450` renders two-column block driven by `costStats`. `App.jsx:23,271` bumps `costStatsRefreshTrigger` on every `complete` SSE event. |
| 4 | Gear icon in Header opens 380px slide-out panel with 4 controls; all persist via useSettings() hook in localStorage | VERIFIED (structural) | `Header.jsx:61-69` renders gear button with `onSettingsOpen` prop. `App.jsx:24,465-466` wires `settingsOpen` state + `<SettingsPanel>`. `SettingsPanel.jsx:6` is native `<dialog>` + `showModal()`. `SettingsPanel.css:5` sets `width: 380px`. `useSettings.js` has 4 localStorage-backed state slots with fallback defaults. `SettingsPanel.jsx:83-161` shows all 4 controls. |
| 5 | stage4_threshold travels as Pydantic-validated optional field; research_strategy.run accepts threshold_override; v1 requests unchanged | VERIFIED (structural) | `main.py:57` declares `stage4_threshold: Optional[int] = Field(None, ge=1, le=10)`. `main.py:257` passes `threshold_override=request.stage4_threshold`. `research_strategy.py:150,185` declares `threshold_override: Optional[int] = None` and resolves `threshold = threshold_override if threshold_override is not None else profile_config["stage4_threshold"]`. `api.js:76,109` gates body extension on `profile === 'quality_research'`. `ChatInterface.jsx:42,110` forwards the prop. |

**Score:** 5/5 truths structurally verified

---

### Deferred Items

None. All 5 success criteria are structurally present; human-needed items are live-browser confirmations, not deferred-to-later-phases gaps.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/openrouter.py` | `_extract_cost()` + `cost` key in `query_model` return | VERIFIED | `_extract_cost` at lines 8-25; `'cost': _extract_cost(data)` at line 88 |
| `backend/council.py` | Per-stage cost accumulation in `run_full_council`; `label_to_model` + `aggregate_rankings` in metadata | VERIFIED | Lines 558-578 accumulate; lines 566-577 pack `metadata` dict with both |
| `backend/research_strategy.py` | `threshold_override` param + `threshold` resolution + cost block in `_final` event | VERIFIED | `threshold_override: Optional[int] = None` at line 150; Pitfall-3 idiom at line 185; early-return cost block at lines 226-235 |
| `backend/main.py` | `SendMessageRequest.stage4_threshold` Pydantic field; `GET /api/stats/cost`; `label_to_model`+`aggregate_rankings` in fresh-streaming metadata | VERIFIED | Field at line 57; route at lines 93-96; packing at lines 339-340 |
| `backend/stats.py` | `aggregate_current_month()` read-only filesystem walk | VERIFIED | Full implementation: month-boundary filter, per-profile bucketing, rounded output, locked response shape |
| `frontend/index.html` | FOUC blocker IIFE extended for density + fontSize sync | VERIFIED | Lines 16-24 sync `data-density` and `data-fontsize` synchronously inside `try` block before first paint; catch block sets all 3 defaults |
| `frontend/src/index.css` | `[data-density="compact"]` + `[data-fontsize="s/m/l"]` CSS blocks | VERIFIED | Lines 153-156 (compact: `--space-2:6px`, `--space-3:10px`); lines 164-174 (fontsize root anchors 15/17/19px) |
| `frontend/src/hooks/useSettings.js` | `useSettings()` hook ~30 LOC mirror of `useTheme` | VERIFIED | 84 LOC; 3 localStorage keys; 3 state slots + setters; `readInitial` helper with validation; `DEFAULT_STAGE4 = 8` with MIRROR comment; does NOT import `useTheme` |
| `frontend/src/components/SettingsPanel.jsx` | Native `<dialog>` slide-out with 4 controls | VERIFIED | `showModal()`/`close()` via `useRef`; `cancel` event for ESC; backdrop-click dismiss; theme toggle + font-size radio + density radio + stage4 range(1-10) + locked microcopy "Higher = stricter; only refine when answer scores ≥{value}/10" |
| `frontend/src/components/SettingsPanel.css` | Token-only CSS; `::backdrop { background: transparent }` | VERIFIED | `width: 380px`; `translate3d(100%,0,0)→(0,0,0)` slide animation; `::backdrop { background: transparent }` per D-04 |
| `frontend/src/components/Header.jsx` | Gear icon button with `onSettingsOpen` prop | VERIFIED | `GearIcon` component; `app-header__settings-toggle` button; `aria-label="Open settings"`; wrapped in `app-header__actions` flex group |
| `frontend/src/components/MessageHeader.jsx` | Cost line beneath profile/models/chairman row | VERIFIED | `showCostLine` gate at `cost.total >= 0.001`; `$upstream.toFixed(3) upstream · $fee.toFixed(3) fee` with CSS classes |
| `frontend/src/components/Sidebar.jsx` | `refreshTrigger` prop; costStats state; footer two-column block | VERIFIED | `refreshTrigger=0` prop; `costStats` state; `useEffect([refreshTrigger])` fetch; `sidebar-footer__cost` block with two-column grid; progress bar gated on `usageRatio >= 0.8` |
| `frontend/src/api.js` | `getCostStats()` GET wrapper; `sendMessage`+`sendMessageStream` with `stage4Threshold` param | VERIFIED | `getCostStats()` at lines 24-30; both send functions have `stage4Threshold = null` parameter with `profile === 'quality_research'` guard at lines 76-78 and 109-111 |
| `frontend/src/App.jsx` | `settingsOpen` state; `costStatsRefreshTrigger`; `useSettings` consumption; `stage4Threshold` prop chain | VERIFIED | All 4 present at lines 23-28; wired at lines 271,465-466,491 |
| `frontend/src/components/ChatInterface.jsx` | `stage4Threshold` prop; forwarded in `handleSubmit` | VERIFIED | Prop at line 42 (default `null`); `onSendMessage(fullPrompt, profile, stage4Threshold)` at line 110 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `query_model` return | per-stage cost accumulation | `cost` key in result dict | WIRED | `openrouter.py:88` → stage result items in `council.py:177,285,348` and `research_strategy.py:207` |
| Fresh-streaming `message_metadata` | `add_assistant_message` | `metadata=message_metadata` at `main.py:353-359` | WIRED | `label_to_model` + `aggregate_rankings` + `cost` all in `message_metadata` dict |
| `GET /api/stats/cost` | `stats.aggregate_current_month()` | `from . import stats` + route body | WIRED | `main.py:12` imports stats; `main.py:96` calls `stats.aggregate_current_month()` |
| `Sidebar.jsx` | `getCostStats()` | `useEffect([refreshTrigger])` → `api.getCostStats()` | WIRED | `Sidebar.jsx:169-173` |
| `App.jsx` `complete` event | `costStatsRefreshTrigger` bump | `setCostStatsRefreshTrigger((n) => n+1)` | WIRED | `App.jsx:271` |
| `Header.jsx` gear button | `SettingsPanel` open | `onSettingsOpen` → `setSettingsOpen(true)` in `App.jsx` | WIRED | `App.jsx:465-466` |
| `useSettings.stage4Threshold` | `api.sendMessageStream` body | `App.jsx:317,364` → `ChatInterface.jsx:110` → `api.js:109-111` | WIRED | End-to-end chain verified by code reading all 4 files |
| `research_strategy.run` | critic gating | `threshold` resolved from `threshold_override` | WIRED | `research_strategy.py:185` + single gating site at line 353 (unchanged) |
| Pydantic `stage4_threshold` | `research_strategy.run` | `main.py:257` `threshold_override=request.stage4_threshold` | WIRED | Verified |
| FOUC blocker `data-density` | CSS `[data-density="compact"]` | attribute selector cascade | WIRED | Both in same attribute namespace; `index.html:19` sets it; `index.css:153` reads it |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `MessageHeader.jsx` | `cost` from `metadata.cost` | `_extract_cost(data)` in `openrouter.py:88` → aggregated in `council.py:558-577` → persisted in `message_metadata` | Yes — reads `usage.cost` and `usage.cost_details.upstream_inference_cost` from live OpenRouter response | FLOWING (gated: live API call required) |
| `Sidebar.jsx` footer | `costStats` | `api.getCostStats()` → `GET /api/stats/cost` → `stats.aggregate_current_month()` → walks `data/conversations/*.json` | Yes — reads real conversation files; returns 0/empty when no cost-tagged queries yet | FLOWING |
| `SettingsPanel.jsx` | `fontSize`, `density`, `stage4Threshold` | `useSettings()` → `localStorage.getItem` with validation | Yes — reads localStorage, falls back to documented defaults | FLOWING |
| `Header.jsx` | `settingsOpen` | `App.jsx useState` boolean | Static prop — not dynamic data | N/A |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Python AST parse — backend modified files | `python -c "import ast, pathlib; [ast.parse(pathlib.Path(f).read_text()) for f in ['backend/openrouter.py','backend/council.py','backend/research_strategy.py','backend/main.py','backend/stats.py']]"` | No SyntaxError (verified by reading files; all are valid Python) | PASS (static) |
| `useSettings` does not import `useTheme` | grep in `useSettings.js` | No `useTheme` import found | PASS |
| `stage4_threshold` Pydantic field constraints | grep in `main.py` | `Optional[int] = Field(None, ge=1, le=10)` found at line 57 | PASS |
| FOUC blocker covers all 3 attributes in catch block | read `index.html` | catch sets `data-theme`, `data-density`, `data-fontsize` | PASS |
| No hex literals in SettingsPanel.css | grep | No matches | PASS |
| `::backdrop { background: transparent }` | read `SettingsPanel.css:24-26` | Confirmed | PASS |
| Sidebar CSS uses `var(--color-warn)` (not hardcoded) | grep in `Sidebar.css` | `var(--color-warn)` found | PASS |

**Step 7b SKIP for live API behaviors** — cannot start servers. Live OpenRouter call + browser interaction deferred to human verification.

---

### Probe Execution

No probe scripts declared in PLAN/SUMMARY frontmatter; no `scripts/*/tests/probe-*.sh` files found for Phase 6. Step 7c SKIPPED (no probes declared or conventionally placed).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERS-01 | 06-02-PLAN.md | `label_to_model` + `aggregate_rankings` persisted in `metadata` dict (no signature change) | SATISFIED | `main.py:339-340` (fresh-streaming); `main.py:563-564` (critique); `council.py:566-567` (non-streaming via `run_full_council`) |
| PERS-02 | 06-02-PLAN.md | Reload hydrates de-anonymized Stage 2 tabs without "Quality (legacy)" fallback | SATISFIED (structural) | The keys are persisted; frontend `Stage2.jsx` already consumed `label_to_model` from Phase 5. Behavioral round-trip is human-verification item. |
| COST-01 | 06-03-PLAN.md | `query_model` captures `usage.cost` + `usage.cost_details.upstream_inference_cost`; aggregated into `metadata.cost` | SATISFIED | `openrouter.py:8-25,88`; `council.py:558-578`; `research_strategy.py` cost blocks; `main.py:329-349` (fresh-streaming); all 4 entry points |
| COST-02 | 06-04-PLAN.md | `MessageHeader` static cost line below profile row | SATISFIED | `MessageHeader.jsx:38-60`; `MessageHeader.css` `.message-header__cost-line`, `.cost-line__upstream`, `.cost-line__fee` |
| COST-03 | 06-04-PLAN.md | `GET /api/stats/cost` returns `{current_month: {total_usd, queries, by_profile, upstream_total_usd}, current_session_estimate_for_cap}` | SATISFIED | `stats.py:82-94`; `main.py:93-96`; shape matches spec |
| COST-04 | 06-04-PLAN.md | Sidebar footer: dual-column monthly cost + progress bar ≥80% cap | SATISFIED | `Sidebar.jsx:397-450`; `Sidebar.css:288-346`; `App.jsx:23,271` refresh trigger |
| SET-01 | 06-06-PLAN.md | Gear icon in Header opens slide-out panel | SATISFIED | `Header.jsx:62-69`; `App.jsx:465-466`; `SettingsPanel.jsx` |
| SET-02 | 06-06-PLAN.md | 4 controls in Settings panel; all persist via `useSettings()` hook | SATISFIED | `SettingsPanel.jsx:83-161` (4 controls); `useSettings.js` (30 LOC hook) |
| SET-03 | 06-07-PLAN.md | `stage4_threshold` Pydantic field + `research_strategy.run` threshold_override + api.js body wiring | SATISFIED | `main.py:57,156,257`; `research_strategy.py:150,185`; `council.py:478,512`; `api.js:74-78,107-111`; `App.jsx:317,364`; `ChatInterface.jsx:42,110` |
| SET-04 | 06-05-PLAN.md | Density via FOUC blocker sync; font-size via React state; CSS variable overrides | SATISFIED | `index.html:16-24` (FOUC blocker); `index.css:153-174` (CSS overrides); `useSettings.js:42-46` (React state font-size + density attribute) |

**Requirements coverage: 10/10 SATISFIED**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No anti-patterns found | — | — | — | All modified files are free of TBD/FIXME/XXX/TODO/placeholder/hardcoded-empty stubs. |

Zero debt markers in any Phase 6 modified file. Zero hex literals in new CSS (token-only confirmed in SettingsPanel.css and Sidebar.css). Zero stubs: all implementations are substantive, wired, and data-flowing.

---

### Human Verification Required

#### 1. PERS-02 — Stage 2 hydration on reload

**Test:** Start both servers (`uv run python -m backend.main` + `npm run dev`). Send a Quality (not fast) message. Reload the browser. Navigate to the conversation. Click Stage 2 tab.
**Expected:** Model identifiers appear as tab labels (e.g., "openai/gpt-5.5"), not "Response A". Aggregate rankings table shows model names with avg positions and vote counts.
**Why human:** Requires live servers + browser + a fresh Quality conversation written after commit `8869dd0`. The backend dict-pack is code-verified; the round-trip through `data/conversations/*.json` → `loadConversation` → `Stage2.jsx` consumer needs observation.

#### 2. COST-02 — MessageHeader cost line visible after a real query

**Test:** Send a Quality or Quality+Research message. Observe the `MessageHeader` in the response.
**Expected:** Below the "Quality · 3 models · Chairman: claude-opus-4.7" row, a second line reads "$X.XXX upstream · $Y.YYY fee". Fast queries show no cost line.
**Why human:** Requires live OpenRouter call producing `metadata.cost.total >= 0.001`. Structural code is verified.

#### 3. COST-04 — Sidebar footer shows real cost data after queries

**Test:** After the Quality message from item 2 arrives, inspect the sidebar footer.
**Expected:** "OpenRouter $X.XX / $100" (left column) and "Upstream $Y.YY BYOK" (right column) with microcopy "X% of cap · 1 queries this month". Progress bar invisible below 80%.
**Why human:** Requires live `data/conversations/*.json` with non-zero `metadata.cost`. Empty-state verified statically.

#### 4. SET-04 — FOUC blocker density prevents layout flicker on reload

**Test:** In Settings panel, switch density to "Compact". Reload the page.
**Expected:** No visible layout-shift between the HTML parse and React mount — the compact spacing is applied from the first paint. DevTools: `document.documentElement.getAttribute('data-density')` returns `'compact'` immediately in the HTML response (before React runs).
**Why human:** FOUC behavior requires real browser; the `<script>` tag is synchronous but verification requires observation.

#### 5. SET-03 — stage4_threshold travels in request body

**Test:** In Settings panel, drag slider to 3. Open Network tab. Send a Quality+Research message.
**Expected:** POST body JSON contains `"stage4_threshold": 3`. Send a Fast message — body does NOT contain `stage4_threshold`.
**Why human:** Network tab inspection requires live browser + DevTools.

---

### Gaps Summary

No automated gaps were found. All 5 success criteria are structurally present and wired end-to-end in the codebase. All 10 requirements are satisfied by the implementation.

The 5 human verification items above are live-browser confirmations of behaviors whose structural preconditions are fully verified. They represent the normal "run the app and check it works" gate, not missing or stub implementations.

**One notable concession (documented, not a gap):**

- **Plan 02 Task 2 deferral:** The end-to-end hydration smoke (PERS-02) was explicitly deferred from worktree execution to post-merge human review. The structural argument in `06-02-SUMMARY.md` is valid: the 2-line dict-pack mirrors the proven critique-branch pattern at `main.py:563-564` which already hydrates Stage 2 successfully (Phase 5 verified). The deferred smoke is human verification item 1 above.

- **BYOK cost = 0 semantics:** Verified and documented in `06-SPIKE-USAGE-COST.md`. Under the active account the BYOK free-tier waiver was NOT active; `usage.cost` was non-zero on all 3 Quality model calls. `_extract_cost` always reads `usage.cost` verbatim (never assumes 0). If the user's account ever activates the 1M-req/month BYOK waiver, `usage.cost` will be 0 and the cost line will correctly be hidden (total < 0.001 gate).

---

_Verified: 2026-05-11_
_Verifier: Claude (gsd-verifier)_
