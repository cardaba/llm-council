# Phase 7: Mobile responsive + Visual regression + Tests - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is the **quality lock** of v2.0 — three bundled "freeze the surface" capabilities applied after Phases 5 + 6 have stabilized the deliberation engine and UI:

1. **Mobile responsive (MOBL-01..04)** — Make the app fully usable on ≤768px. Touch targets ≥44×44px (CSS var `--touch-target-min`), native `<dialog>` + `showModal()` sidebar drawer (no library), `viewport-fit=cover` + `env(safe-area-inset-*)` for notch / iOS home indicator, and a `useTouchSwipe` hook (~30 LOC) for edge-swipe drawer open/close.
2. **Visual regression (VRT-01..03)** — Playwright snapshot specs in `frontend/visual-tests/`, baselines exclusively on Linux Docker (`mcr.microsoft.com/playwright:v1.X.X`), with the 5 mandatory anti-flake measures (`document.fonts.ready`, `threshold: 0.2`, `maxDiffPixelRatio: 0.02`, `reducedMotion: 'reduce'`, animation/transition CSS override).
3. **Tests (TEST-01..03)** — pytest backend suite (storage UUID + path-traversal, `add_assistant_message` round-trip, council profile routing, research_strategy critic parser, v1→v2 migration), vitest + RTL v16 frontend co-located tests (`useTheme`, `useSettings`, `MessageHeader` legacy fallback, `QualityToggle` onChange, `Stage2` de-anon, `download.js` pure helpers), and README documenting the 3 commands. No CI in v2.0 — tagged as v2.1 backlog.

Scope anchor: this phase does not add user-visible product capability; it freezes what Phases 1–6 shipped so future changes are detectable and the existing skin is preserved across regressions.

</domain>

<decisions>
## Implementation Decisions

### MOBL-04 — Swipe gesture disposition

- **D-01 — `useTouchSwipe` ships in Phase 7 (no scope-cut).** The ~30 LOC hook lands as-spec'd in REQUIREMENTS.md: left-edge swipe-right opens the drawer, swipe-left closes it, with `touch-action: pan-y` applied to `.messages-container` to avoid gesture conflicts with vertical scroll. Plan-checker does NOT have authority to defer this at planning-time — the user explicitly chose to ship over scope-cut. Rationale: native-feel mobile UX is part of what makes "≤768px usable" actually usable; tap-only via hamburger is a degraded floor reserved for v2.1+ if a regression emerges. The roadmap's "scope-cut candidate" flag is hereby resolved as **no cut**.

### VRT-01 — Surfaces scope

- **D-02 — VRT scope expanded to 8 surfaces × 2 themes = 16 baselines (override of ROADMAP default).** The 5 lockeadas in ROADMAP (welcome state, Stage 3 highlight, ErrorBanner, sidebar empty state, theme toggle) PLUS Settings panel, Stage 2 (with expanded rankings), and Critique flow (with files loaded). Conscious override of the roadmap's "5 × 2 = 10" baseline because Stage 2 and Critique are the densest content surfaces (highest blast-radius if Direction A skin drifts), and Settings is the surface that moved most recently (Phase 6 SET-01..02 just shipped).
- **D-02b — Each new surface baselines a single "hero" state**, not multiple states. Specifically:
  - **Settings:** panel open, all controls at their default values (theme = system, font-size = M, density = comfortable, stage4_threshold = 8).
  - **Stage 2:** rankings expanded (all 4 evaluations visible, aggregate rankings table populated with realistic mock data via `page.route()` fixture).
  - **Critique:** 3 files loaded into all 3 slots (with realistic filenames + chip pills rendered), critique instruction tipeada in the textarea but NOT yet submitted (so no streaming spinner state).
  - One baseline per surface × 2 themes = 6 new baselines on top of the 10 lockeadas = **16 total**.
- **D-02c — All 5 anti-flake measures from REQUIREMENTS.md VRT-02 apply to every spec without exception.** No spec is allowed to be exempted from any of them — `document.fonts.ready`, `threshold: 0.2`, `maxDiffPixelRatio: 0.02`, `reducedMotion: 'reduce'`, and the global animation/transition CSS override. If a spec needs to escape one of them, that's evidence the surface is too flaky to baseline and gets pulled from VRT scope, not exempted from anti-flake.

### VRT iteration workflow (Windows ↔ Docker)

- **D-03 — Docker-only. No Windows-local Playwright iteration.** The user's stated workflow is "yo no quiero desarrollar, solo documentar el código" — implementation lives inside `gsd-executor` subagents, and review happens via the committed `.png` snapshots. Concretely:
  - Every baseline generation, every snapshot regeneration, every test run during dev happens inside `docker run --rm -v $(pwd):/work mcr.microsoft.com/playwright:v1.X.X` (the spec version is pinned in `frontend/visual-tests/playwright.config.ts`).
  - Windows-side `npx playwright` is NEVER invoked. There is no `.gitignore` entry for "Windows snapshots" because they don't exist.
  - The executor agent (Phase 7 Plan executor) MUST set up Docker once during the first VRT plan and use it for every subsequent VRT-related task. If Docker isn't available in the executor's env, the plan halts with a clear error — there is no Windows fallback.
  - README (TEST-03) documents the Docker command for completeness, but the framing is "this is how the AI agent regenerates baselines", not "this is how the user develops tests". Tone: documentation, not instruction.
- **D-03b — Spec edits happen in Windows (the user's repo); execution happens in Docker.** Standard split: write the `.spec.ts` file on Windows with any editor, the executor mounts the workspace into the container and runs there. No symlinks, no WSL bridge — just `-v $(pwd):/work`. Filesystem path differences (CRLF / Windows path separators) are handled by Playwright + git's existing autocrlf config.

### Plan grouping / wave structure

- **D-04 — Wave 1 (MOBL) → Wave 2 (VRT ∥ TEST).** Two waves:
  - **Wave 1 (sequential plan(s)) — Mobile responsive.** All four MOBL reqs land first because VRT cannot baseline a moving target. The plan(s) may be split or bundled at plan-time (planner's discretion: 1 plan vs 2 plans depending on LOC count and blast-radius), but they are wave 1 and they finish before wave 2 starts.
  - **Wave 2 (parallel plans) — VRT and TEST in parallel.** VRT (one plan) and TEST (one plan, or split into pytest plan + vitest plan if the planner sees value) execute in parallel because TEST is pure-logic coverage (storage, hooks, helpers) that doesn't depend on the mobile UI surface, and VRT consumes the now-stable mobile surface for baselines. README documentation (TEST-03) belongs in whichever TEST plan lands last.
- **D-04b — No CI in this phase.** TEST-03 explicitly forbids CI configuration in v2.0. The three commands (`uv run pytest backend/tests/ -v`, `npm test --prefix frontend`, `npx playwright test --config frontend/visual-tests/playwright.config.ts` — the last one via Docker per D-03) are documented in README only. CI is tagged as v2.1 backlog. Plans MUST NOT add `.github/workflows/`, `.gitlab-ci.yml`, or equivalent.

### Carry-forward from prior phases (locked, not re-asked)

- **Native `<dialog>` + `showModal()` pattern (Phase 6 D-04).** MOBL-02 inherits this exact pattern — the SettingsPanel already established it as the canonical modal idiom in this codebase. No hand-rolled focus trap, no library dependency. The sidebar drawer uses the same `<dialog>` + `showModal()` + `inert` on main content combo.
- **localStorage individual-key pattern (Phase 6 D-03).** Any new persisted state (none expected in Phase 7, but useTouchSwipe might need a "user has seen swipe hint" flag if a hint banner is added) would follow this pattern: one `localStorage.key` per setting, no bundled JSON object.
- **Direction A "calmo / research notebook" tone.** Mobile drawer overlay (the area outside `<dialog>` when `showModal()` is active) follows the same posture as the Phase 6 SettingsPanel: no harsh scrim, soft backdrop. The exact opacity is plan-time discretion but the spirit is "reveal, don't darken-and-isolate".
- **`--touch-target-min: 44px` CSS variable consumption.** MOBL-01 declares the variable; every interactive component (Header buttons, Sidebar items, QualityToggle segments, ChatInterface attachment chips, file pickers, Settings controls) consumes `var(--touch-target-min)` for its `min-width` / `min-height` in the ≤768px media query. No magic numbers.

### Claude's Discretion

- **Plan splitting within Wave 1.** Whether MOBL-01..04 land as one plan or two (e.g., MOBL-01+03 as "responsive substrate" + MOBL-02+04 as "drawer + gesture") is planner's call based on LOC count and dependency analysis.
- **Plan splitting within Wave 2 — TEST.** Pytest backend tests + vitest frontend tests can be one plan (`07-tests-end-to-end`) or two parallel plans (`07-tests-backend` + `07-tests-frontend`). Planner decides based on file-touch overlap.
- **Test fixture strategy.** Whether `backend/tests/fixtures/` uses hand-rolled JSON files, golden fixtures committed alongside, or factory functions in `conftest.py` is the planner's call after reading the existing test-free codebase. No prior preference exists since v1.0/v2.0 has not shipped tests yet.
- **Exact swipe distance threshold for MOBL-04.** Plan-time decision based on Playwright reference behavior + a quick smoke (e.g., 40px gesture distance to trigger drawer open). Not a user-visible decision.
- **README documentation tone for TEST-03.** Minimal vs verbose. Default to minimal (one paragraph + 3 fenced code blocks) to match Direction A's "calmo" tone.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level

- `.planning/PROJECT.md` — Core value statement, stack constraints, BYOK rules, single-user local-only posture (these constrain Phase 7 — e.g., no CI, no remote dashboard, no auth on test surfaces).
- `.planning/REQUIREMENTS.md` — Lines 63-66 (MOBL-01..04), 72-74 (VRT-01..03), 80-82 (TEST-01..03). Full text of every requirement with source references to ARCHITECTURE.md / PITFALLS.md / FEATURES.md sections.
- `.planning/ROADMAP.md` — Phase 7 §Phase Details with the 5 success criteria. Cross-Phase Notes ("Phase 7 bundling") + "Decisiones diferidas a plan-time" entries.
- `.planning/STATE.md` — Latest milestone progress (v2.0 nearing close, Phase 5 + 6 complete, Phase 7 is the final phase before milestone close).

### Research artefacts (read before plan-1 of each bucket)

- `.planning/research/ARCHITECTURE.md` §5.1 — Mobile responsive architecture (touch targets, drawer pattern, swipe hook).
- `.planning/research/ARCHITECTURE.md` §6.2 — Frontend test architecture (vitest + RTL v16 + jsdom).
- `.planning/research/ARCHITECTURE.md` §6.3 — Visual regression test architecture (Playwright + Docker baseline).
- `.planning/research/ARCHITECTURE.md` §6.4 — Test command surface for README (TEST-03).
- `.planning/research/PITFALLS.md` §MOD-3 — `viewport-fit=cover` + safe-area-inset (MOBL-03 source).
- `.planning/research/PITFALLS.md` §MOD-4 — `<dialog>` + `showModal()` + `inert` (MOBL-02 source).
- `.planning/research/PITFALLS.md` §MOD-5 — `touch-action: pan-y` gesture conflict prevention (MOBL-04 source).
- `.planning/research/PITFALLS.md` §MOD-7 — Frontend test pitfalls (TEST-02 source, jsdom limitations etc.).
- `.planning/research/PITFALLS.md` §MOD-8 — VRT 5 prevention steps (VRT-02 source) and Linux-only baseline rationale (VRT-03 source).
- `.planning/research/FEATURES.md` §F — VRT feature description and 5-surface initial list.

### Codebase maps (read during plan-1 of each bucket)

- `.planning/codebase/ARCHITECTURE.md` — Current architecture state including async/parallel boundaries, threading model, storage shape — informs test setup (no concurrent file I/O races to test for).
- `.planning/codebase/STRUCTURE.md` — File layout for placing `backend/tests/`, `frontend/src/**/*.test.jsx` (co-located), `frontend/visual-tests/`.
- `.planning/codebase/TESTING.md` — Confirms current zero-test state and any conventions adjacent test-adjacent files (none expected).
- `.planning/codebase/CONVENTIONS.md` — Naming/style conventions (4-space backend, 2-space frontend) that test files must follow.

### Phase 6 artefacts (Phase 7 builds on top — no schema/contract changes)

- `.planning/phases/06-persistence-completeness-cost-analytics-settings-panel/06-CONTEXT.md` — D-03 (immediate-apply settings, no save/cancel), D-04 (native `<dialog>` pattern). MOBL-02 inherits D-04 verbatim.

### External documentation (for VRT)

- Playwright Docker image registry: `mcr.microsoft.com/playwright:v1.X.X` — pin the Playwright version in `playwright.config.ts` and use the matching Docker tag. The "X" placeholder gets resolved at plan-time to whatever version `npm install @playwright/test` lands.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<dialog>` + `showModal()` idiom in `frontend/src/components/SettingsPanel.jsx`** (Phase 6) — Direct template for MOBL-02 (sidebar drawer). The exact `<dialog>` element, `useEffect` to call `showModal()` / `close()` on state change, `inert` on main content, and ESC/backdrop dismiss are all already proven. MOBL-02 should mirror this file's structure verbatim with sidebar content instead of settings content.
- **`useTheme` hook in `frontend/src/hooks/useTheme.js`** (Phase 4) — Template for `useTouchSwipe` (MOBL-04) and any other hook in this phase. Same shape: localStorage round-trip (if needed), single useEffect to wire/unwire listeners, return a tuple/object the consumer reads.
- **`useSettings` hook in `frontend/src/hooks/useSettings.js`** (Phase 6) — Direct test target for TEST-02. Already follows the localStorage-individual-key pattern.
- **`MessageHeader.jsx`** (Phase 5) — Has the "legacy fallback" branch (when `metadata.label_to_model` is missing for v1 conversations) that TEST-02 explicitly tests.
- **`Stage2.jsx` de-anonymization logic** (Phase 5) — Direct test target for TEST-02. Pure JSX/JS, no async, easy to RTL.
- **`download.js` helpers** in `frontend/src/utils/download.js` (Phase 4) — Pure functions (`buildFinalAnswerMarkdown`, `buildFullDeliberationMarkdown`, etc.). Direct test target for TEST-02 — zero mocking needed.
- **`backend/storage.py`** UUID validation + path-traversal rejection logic (Phase 1, hardened in Phase 5 with schema_version: 2) — Direct test target for TEST-01. The `ConversationNotFoundError` shape is already established.
- **`backend/research_strategy.py`** critic parser (Phase 3, refined in Phase 5) — Direct test target for TEST-01. Returns `(score, concern)` from natural-language critic output.

### Established Patterns
- **CSS variable indirection for layout tokens** — `var(--font-size-body)`, `var(--font-size-microcopy)`, `var(--space-N)`, `var(--color-warning)` are all already defined globally. MOBL-01's new `--touch-target-min` variable joins this pattern. Direction A token system is the source of truth.
- **Co-located CSS imports** — Every `*.jsx` imports its sibling `*.css`. MOBL UI additions (drawer overlay styling, swipe affordance if added) follow this convention.
- **`async/parallel via asyncio.gather`** — All council/research fan-out uses `asyncio.gather`. Tests for `query_models_parallel` must monkeypatch `query_model` rather than mock the HTTP layer.
- **Storage tests must use `tmp_path` fixture** — `pytest`'s built-in `tmp_path` is the canonical way to redirect `DATA_DIR` without monkeypatching global state.
- **No threading; single async event loop** — Tests do NOT need to worry about thread safety or lock ordering. Async tests use `pytest-asyncio`'s `asyncio_mode = "strict"`.

### Integration Points
- **Mobile drawer ↔ existing Header.jsx hamburger button** — There's no hamburger yet (the Header currently only has the gear icon for Settings, per Phase 6). MOBL-02 + MOBL-04 plans must add the hamburger button as part of Wave 1; it shows only at ≤768px via CSS media query, and toggles the drawer's `open` state. Plan-time decision: whether to use the same gear-button styling (consistent) or a distinct hamburger icon (Material/Lucide style).
- **VRT specs ↔ existing components** — Specs in `frontend/visual-tests/*.spec.ts` import nothing from `src/` directly; they navigate to a built page (vite preview) and snapshot the DOM. Each spec uses `page.route()` to mock `/api/conversations/**` calls with fixture data — no real backend needed during VRT runs.
- **Pytest ↔ `backend.storage` + `backend.council` + `backend.research_strategy`** — Tests import from `backend.*` (4-space indent, snake_case, relative imports). `conftest.py` injects fixtures via `pytest.fixture` decorators.
- **Vitest ↔ frontend `src/`** — Co-located `*.test.jsx` import siblings directly (`import { useSettings } from './useSettings.js'`). Vitest config (`vite.config.js` test block or `vitest.config.js`) sets `environment: 'jsdom'`.

</code_context>

<specifics>
## Specific Ideas

- **MOBL-04 swipe distance default — 40px from left edge to trigger open.** Plan-time can adjust if smoke testing reveals a better number, but 40px is the iOS Safari default for back-swipe and is a sensible anchor.
- **Settings panel "hero" state for VRT baseline** — open with default values (`theme=system, fontSize=M, density=comfortable, stage4Threshold=8`). The `8` matches PROFILES["quality_research"]["stage4_threshold"] in `backend/config.py`.
- **Stage 2 "hero" state for VRT baseline** — mock data with 4 council members + realistic aggregate rankings table. The mock SSE fixture in `frontend/visual-tests/fixtures/` should use deterministic content (no timestamps, no random IDs) so the snapshot is stable.
- **Critique "hero" state for VRT baseline** — 3 files in all 3 slots with deterministic filenames (e.g., `model-a-notes.md`, `model-b-notes.md`, `model-c-notes.md`), instruction tipeada but NOT yet submitted (no streaming spinner). The pre-submit state captures the "ready to send" UX surface, which is where critique mode's distinctive UI lives.

</specifics>

<deferred>
## Deferred Ideas

- **CI pipeline (GitHub Actions / GitLab CI) for the three test commands.** Tagged as v2.1 backlog by ROADMAP + REQUIREMENTS TEST-03. Reason: single-user local-only posture, no team to share signal with yet. If the project grows to multi-user or gains contributors, this is the first thing to add.
- **Windows-local Playwright iteration workflow.** Discarded in D-03 because the user doesn't iterate manually. If future contributors join who DO want Windows-local dev, add `npx playwright test --update-snapshots-os=linux` (or equivalent) doc to README.
- **VRT baselines for "more than hero" states** (Settings closed, Stage 2 collapsed, Critique mid-stream / completed). Discarded in D-02b in favor of one hero state per surface. If visual regressions slip past the hero baselines because they're in transient states, expand here in v2.1.
- **Test coverage % targets (e.g., 80% line coverage)** — Not declared in Phase 7. Reason: the spec lists which functions/components to cover, which is more actionable than a number. If coverage drift becomes a maintenance issue post-v2.0, set an explicit floor in v2.1.
- **Critique drawer state baseline** (drawer open during file load, drawer open while streaming) — discarded because Phase 5 Critique flow doesn't use a drawer; files load directly into the sidebar-adjacent slot UI. Note for v2.1: if Critique gets a dedicated drawer/sheet pattern, baseline it.
- **`useTouchSwipe` hint banner** ("Swipe right to open sidebar" on first mobile visit) — not in scope. If user reports MOBL-04 discoverability issues post-v2.0, add a one-shot localStorage flag + dismissable banner in v2.1.
- **CI-gated visual-regression breakpoint coverage** (test at 320px + 768px + 1024px) — discarded because Phase 7 baselines are at the default desktop viewport only (per VRT spec implicit reading). If mobile regressions slip past the desktop baselines, add `viewport: { width: 375, height: 667 }` variants in v2.1.

### Reviewed Todos (not folded)

None — no pending todos matched Phase 7's scope at discussion time.

</deferred>

---

*Phase: 7-Mobile responsive + Visual regression + Tests*
*Context gathered: 2026-05-11*
