# Requirements — Milestone v2.1 UX Polish + IA Gaps

**Started:** 2026-05-12
**Status:** 🔄 Defining (0/11 satisfied)
**Continuation from v2.0:** REQ-IDs use the `[CATEGORY]-V2.1-[NN]` form for this milestone to distinguish from v2.0 REQs that share the same categories (NAV, COST). Archived v2.0 reqs live at `milestones/v2.0-REQUIREMENTS.md`.
**Source backlog:** `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md` (captured 2026-05-11 during v2.0 manual smoke).

---

## v2.1 Requirements

### Navigation & sticky header (NAV)

**Goal:** Resolve the P0 sticky-header regression flagged in the v2.0 manual smoke, eliminate the tabs+H2 redundancy, and connect the active tab visually to the content panel below.

- [ ] **NAV-V2.1-01**: User scrolling a long Stage response sees the sticky header bar (tabs + title context) anchored to the top of the main panel with no visible strip of underlying content above it. Quick-task `260511-l5w` shipped the partial fix (drop `.messages-container` `padding-top`, add `box-shadow` to `.stage-nav-strip`); this requirement formalises the close, verifies under all 3 stages × both themes × 4 viewports, and regenerates VRT baselines (see `VRT-V2.1-01`).
- [ ] **NAV-V2.1-02**: The active tab in the StageNavigationStrip carries a 2px bottom border that connects visually to the content panel below (standard "tab connected to panel" pattern), preserving the Direction A calm contrast level.
- [ ] **NAV-V2.1-03**: User does not see a redundant H2 ("Stage 1: Individual Responses") immediately below the active tab label ("Stage 1 · 4 responses"). The active tab carries the semantic identity for the stage; the H2 is removed without losing screen-reader heading structure (use `aria-labelledby` or an `sr-only` heading if needed).

### Information architecture (IA)

**Goal:** Restore conversation/model context at long-scroll positions, and re-rank the sidebar so the active item, recent dates, and metadata read at the right priority.

- [ ] **IA-V2.1-01**: User scrolling past the assistant message header still sees the conversation title (or active model name when reading a specific Stage 1 response) inside the sticky bar as a breadcrumb / sub-context line. Sticky bar layout must not jump on stick / unstick.
- [ ] **IA-V2.1-02**: The active conversation item in the sidebar carries a 3px left border in the accent color in addition to the existing background tint. The border survives hover/focus states.
- [ ] **IA-V2.1-03**: Sidebar conversation items are grouped by relative date — "Hoy", "Esta semana", "Este mes", "Más antiguo" (or equivalent Direction A copy). Group headers are visually subdued (uppercase small caps, muted color) and do not steal weight from item titles.
- [ ] **IA-V2.1-04**: The "N messages" metadata under each sidebar item is demoted: rendered as an icon + smaller font size on a single line below the title, and never re-flows above the title.

### Cost UI (COST)

**Goal:** Revisit the v2.0 Phase 6 D-02 dual-column sidebar lock — the cost footer is "visually disconnected" per manual smoke. Relocate to a place where it is opt-in to read, not constantly competing with navigation weight.

- [ ] **COST-V2.1-01**: User no longer sees the cost block (`$0.00/$100 · Upstream $2.97 BYOK`) inside the sidebar footer competing with conversation navigation. The cost block is reachable through one of {popover from a spending icon in the Header, sub-section inside the Settings panel, or a dedicated route} — the exact target is decided in `/gsd-discuss-phase` for this requirement's phase, with an ADR noting the v2.0 D-02 lock revisit and rationale. Cap progress bar at ≥80% still works in the new location.

### Accessibility (A11Y)

**Goal:** The back-to-top button shipped structurally in v2.0 NAV-04 but failed manual smoke on contrast + missing accessible label + premature visibility. Bring it to a11y baseline without breaking Direction A calm tone.

- [ ] **A11Y-V2.1-01**: The scroll-to-top floating button carries `aria-label="Volver al inicio"` (or equivalent localised string), passes WCAG AA contrast against the page background in both themes, appears only after the user has scrolled past 600px (not earlier), and fades in/out with `prefers-reduced-motion` honored (cross-fade collapses to instant when motion is reduced).

### Test coverage (TEST)

**Goal:** Close the App.test.jsx gap that was explicitly deferred from v2.0 Phase 7 Plan 05 (07-05-SUMMARY.md §"App.test.jsx deferred").

- [ ] **TEST-V2.1-01**: A vitest test covers the `handleStreamEvent` stale-event guard regression at the `<App />` level — given a conversation switch mid-stream, the test asserts no `TypeError` is thrown and no white-screen state appears, exercising the defensive `if (!lastMsg?.loading) return prev;` guard that 06-08 introduced at the 10 in-flight setter sites. Implementation strategy (extract `handleStreamEvent` to a pure reducer module vs mount full `<App />` with mocked SSE) is decided in `/gsd-discuss-phase` — both are acceptable as long as the regression is structurally exercised.

### Visual regression (VRT)

**Goal:** The sticky fix + IA breadcrumb + tab connection + cost footer relocation will all touch pixels covered by the 16 v2.0 baselines × 4 viewports = 64 PNGs. Regenerate intentionally to lock the new visual baseline.

- [ ] **VRT-V2.1-01**: All 64 Playwright VRT baselines (16 surfaces × 4 viewports) regenerated against `npx playwright test --update-snapshots` after NAV-V2.1-01..03 + IA-V2.1-01..04 + COST-V2.1-01 + A11Y-V2.1-01 land. New baselines committed; old baselines git-removed in same commit. Manual eyeball review of the diff confirms every changed pixel is intentional (no incidental regressions in non-touched surfaces).

---

## Future Requirements (deferred from v2.1, candidates for v2.2+)

- **P3 scroll-spy in sticky bar** — show current H3/section name inside the sticky bar via IntersectionObserver per H3. Enhancement, not a fix; deferred to keep v2.1 focused.
- **PDF/DOCX critique upload + auto-detect model attribution** — captured from v2.0 deferred items. Not on user's path right now.
- **AbortController in `handleSelectConversation` + per-event `conversation_id` SSE scoping** — `06-08` shipped Option 1 (defensive guard) structurally; Options 2 + 3 are UX-polish-grade and only worth doing if multi-tab / multi-stream UX matters.
- **`stage4_threshold` calibration after 5-10 real QR queries** — carried since v1.0; settings slider is in place, decision is user-side.

---

## Out of Scope (explicit boundaries — reasons recorded so they don't quietly get re-added)

- **CI pipeline (GitHub Actions / equivalent)** — Lock `D-04b` from v2.0: no CI for this single-user local-only app. Tests run locally and intentionally so. Revisitable in v3.0 if posture changes (e.g., publishing).
- **Multi-user / authentication / sharing** — single-user personal app; auth would dominate complexity for zero benefit at this scale (inherited from PROJECT.md).
- **Multi-turn chat inside a conversation** — `1 conversation = 1 deliberation` preserves the council mental model (inherited).
- **Database backend (SQLite/Postgres) instead of JSON files** — `data/conversations/*.json` is sufficient (inherited).
- **Fully-agentic deep-research loop** — pragmatic approximation only (inherited).
- **Persisting `label_to_model` / `aggregate_rankings` outside `metadata` dict** — already inside opaque `metadata` shape since v2.0 PERS-01 (closed).
- **Publishing / packaging (Docker, public deploy, install script)** — personal local use only (inherited).
- **Re-styling Direction A** — Direction A "Research notebook" locked in v1.0 Phase 2; v2.1 polish must stay inside the existing palette + typography + spacing token system. Adjust tokens carefully if needed, do not introduce new ones.

---

## Traceability

<!-- Populated by /gsd-new-milestone roadmapper after roadmap approval. -->

| REQ-ID | Category | Phase | Status |
|--------|----------|-------|--------|
| NAV-V2.1-01 | Navigation | TBD | Pending |
| NAV-V2.1-02 | Navigation | TBD | Pending |
| NAV-V2.1-03 | Navigation | TBD | Pending |
| IA-V2.1-01 | IA | TBD | Pending |
| IA-V2.1-02 | IA | TBD | Pending |
| IA-V2.1-03 | IA | TBD | Pending |
| IA-V2.1-04 | IA | TBD | Pending |
| COST-V2.1-01 | Cost UI | TBD | Pending |
| A11Y-V2.1-01 | A11Y | TBD | Pending |
| TEST-V2.1-01 | Test | TBD | Pending |
| VRT-V2.1-01 | VRT | TBD | Pending |

**Coverage:** 0/11 mapped (will be 11/11 after roadmap approval).

---

*Last updated: 2026-05-12 at milestone start. Traceability table will be filled by roadmapper.*
