---
phase: 04-visual-identity-implementation
plan: 04
subsystem: ui
tags: [react, css, design-tokens, sidebar, modal, menu, error-banner, favicon, accessibility, h9-01, terracota, direction-a]

requires:
  - phase: 04-visual-identity-implementation
    provides: "token taxonomy (Plan 04-01), branded shell + Header + grid (Plan 04-02), deliberation surfaces on tokens (Plan 04-03)"
provides:
  - "Sidebar / Modal / Menu CSS fully migrated to Direction A tokens (zero Bootstrap hex)"
  - "Sidebar empty state branded with 96px serif ampersand mark + UI-SPEC body copy"
  - "Active sidebar row with border-left 3px var(--color-accent) + var(--color-accent-soft) tint"
  - "Inline rename microcopy hint 'Enter para guardar · Esc para cancelar'"
  - "Modal locked to UI-SPEC copy: 'Delete this conversation?' / 'Delete conversation'"
  - "Menu items with shortcut hints (R / U+232B) — visual-only, no keyboard handlers"
  - "ErrorBanner persistent component for H9-01 catastrophic interruption recovery"
  - "Favicon ampersand SVG (Georgia serif on cream)"
  - "Closed phase-wide grep gate (zero #4a90e2|#357abd|#f0fff0|#f5f5f5|#f0f0f0 in frontend/src/)"
  - "VIS-01 / VIS-02 / VIS-03 / VIS-04 fully closed — Phase 4 complete"
affects: [phase-5, future-features, dark-mode-polish]

tech-stack:
  added: []
  patterns:
    - "Inline rgba literals for soft tints when token taxonomy is closed (cross-wave file ownership rule)"
    - "Wrapper div for grid cells that host secondary chrome (banners) above primary panels"
    - "Visual-only shortcut hints in menus (separates affordance from keyboard handling)"

key-files:
  created:
    - "frontend/src/components/ErrorBanner.jsx"
    - "frontend/src/components/ErrorBanner.css"
    - "frontend/public/favicon-ampersand.svg"
  modified:
    - "frontend/src/components/Sidebar.css (full token migration + empty state + rename hint + active row)"
    - "frontend/src/components/Sidebar.jsx (empty state branch + rename hint + Modal/Menu copy + shortcut wiring)"
    - "frontend/src/components/Modal.css (full token migration)"
    - "frontend/src/components/Menu.css (full token migration + shortcut span styling)"
    - "frontend/src/components/Menu.jsx (shortcut span rendering)"
    - "frontend/src/App.jsx (useCallback + streamError state + ErrorBanner wiring + .app__main-with-banner wrapper)"
    - "frontend/src/App.css (delta: removed direct .chat-interface grid placement, added .app__main-with-banner wrapper)"
    - "frontend/src/index.css (.markdown-content block — closed phase-wide hex gate)"

key-decisions:
  - "Sidebar.jsx active marker convention CONFIRMED at execution time: existing className conditional `${isActive ? 'active' : ''}` from Phase 1 / Plan 03 is the single source of truth. Sidebar.css selector `.conversation-item.active` matches exactly — no JSX changes needed for the marker."
  - "Modal copy adjusted to UI-SPEC literal: title 'Delete this conversation?' (not 'Delete conversation') and confirm 'Delete conversation' (not 'Delete'). The body now uses italic quoted title + N messages metadata; `time_ago` deferred (created_at to time-ago string requires client-side helper not yet present, partial satisfaction acceptable — UI-SPEC line 257-258)."
  - "Shortcut hints in Menu.jsx are visual-only (R / U+232B). Plan explicitly out-of-scope keyboard handlers; affordance is purely a hint, not a binding."
  - "App.css delta executed cleanly: replaced `.app > .chat-interface { grid-column: 2; row: 2 }` direct rule (Plan 04-02 ownership) with `.app > .app__main-with-banner` wrapper rule that owns grid-column:2 / row:2 / display:flex column. ChatInterface flows as flex child via `.app__main-with-banner > .chat-interface { flex: 1; min-height: 0 }`. Mobile rule renamed symmetrically."
  - "Banner stage-number derivation walks the message slots: stage1 → still in stage 1; stage1 set → stage 2; stage2 set → stage 3; stage3 set → stage 4 (QR refinement step, only relevant for QR profile). Read via setCurrentConversation(prev => ...) functional setter pattern to avoid stale closure."
  - "ErrorBanner soft-tint background uses literal `rgba(160, 56, 40, 0.10)` — index.css token taxonomy is closed at end of Wave 1 (Plan 04-01 ownership). Adding a `--color-error-soft` token would have been a cross-wave file ownership violation; literal is the ratified pattern (same as Stage4's amber tint in Plan 04-03)."
  - "Favicon hex literals (#FAF8F4 bg, #6B635A glyph) are intentional — SVG files outside the React tree do not consume CSS custom properties. Single-theme (light palette only) — per-theme favicon support is patchy across 2026 browsers; CONTEXT D-16 explicitly plans a single 32×32 SVG/PNG."
  - "Favicon font = Georgia (universal serif fallback). Source Serif 4 isn't loaded yet at favicon-render time, so using it would produce inconsistent first-paint behavior."

patterns-established:
  - "Empty state ampersand mark: `.sidebar__empty-mark { font-family: var(--font-serif); font-weight: 400; font-size: 96px; opacity: 0.55; user-select: none }` — reusable for any future empty state needing brand reinforcement."
  - "Persistent error recovery banner: role=alert + aria-live=assertive + conditional Dismiss (only after first retry) — pattern transferable to any future critical-flow interruption."
  - "Wrapper div for grid-cell secondary chrome: `.app__main-with-banner` owns the grid placement; the primary panel (ChatInterface) flows as a flex child. Future banners (announcements, cost warnings) reuse the same wrapper without disturbing the grid."
  - "Shortcut hint convention in menus: `<span className=\"menu-item__shortcut\" aria-hidden=\"true\">{label}</span>` — visual-only affordance separated from binding; future plans can wire the actual key handlers without touching the hint markup."

requirements-completed: [VIS-01, VIS-02, VIS-03, VIS-04]

duration: ~32min
completed: 2026-05-10
---

# Phase 4 Plan 04: Conversations & Polish Summary

**Sidebar/Modal/Menu fully on Direction A tokens, branded empty state with 96px serif ampersand, persistent ErrorBanner for H9-01 recovery, and the favicon ampersand asset — Phase 4 closed at 100%.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-05-10T16:35:00Z
- **Completed:** 2026-05-10T17:07:00Z
- **Tasks:** 3 (+ 1 deviation cleanup commit)
- **Files modified:** 9 (3 new, 6 edited)

## Accomplishments

- **Sidebar.css full token migration** — 39 `var(--color-*)` consumptions; zero Bootstrap hex; new `.sidebar__empty` / `.sidebar__empty-mark` (96px serif, opacity 0.55) / `.sidebar__empty-body` / `.sidebar__rename-hint` classes; active row uses `border-left: 3px solid var(--color-accent)` + `var(--color-accent-soft)` background tint.
- **Modal.css full token migration** — 13 token consumptions; cream elevated card (`var(--color-bg-elevated)` + `var(--shadow-md)`); destructive button uses `var(--color-error)`; body locked to UI-SPEC italic quoted title + message count.
- **Menu.css full token migration** — 8 token consumptions; hover background `var(--color-accent-soft)` per UI-SPEC accent allowlist item 10; new `.menu-item__shortcut` span styled with `var(--color-fg-muted)` microcopy.
- **Sidebar.jsx surgical edits** — empty state branch with ampersand SVG mark + UI-SPEC literal copy; RenameInput now wraps `<input>` + microcopy hint `Enter para guardar · Esc para cancelar`; Modal title/confirm copy locked; Menu items now carry `shortcut: 'R' | '⌫'`.
- **Menu.jsx surgical edit** — items render `.menu-item__label` + optional `.menu-item__shortcut` span (`aria-hidden="true"`).
- **ErrorBanner.{jsx,css} new** — persistent recovery banner for H9-01; `role="alert"` + `aria-live="assertive"`; copy `La deliberación se interrumpió en Stage {N}. ¿Quieres reintentar con la misma pregunta?`; Retry always, Dismiss conditional on `retryAttempted === true`; soft-tint background literal `rgba(160, 56, 40, 0.10)`.
- **App.jsx wiring** — new `streamError` + `retryAttempted` state; `'error'` SSE handler now derives stageNumber from completed slots; `handleRetryError` re-enters `handleSendMessage` with the captured `(originalContent, originalProfile)` tuple; `handleDismissError` clears state. `useCallback` import added.
- **App.css delta** — removed `.app > .chat-interface { grid-column: 2; row: 2 }` (Plan 04-02 ownership) and replaced with `.app > .app__main-with-banner` wrapper that owns grid placement + `display: flex column`. Mobile rule renamed symmetrically.
- **favicon-ampersand.svg new** — 32×32 SVG with Georgia serif `&` glyph (#6B635A) on cream background (#FAF8F4); `index.html` slot was reserved by Plan 04-01.
- **index.css `.markdown-content` cleanup** — Rule 2 deviation: closed remaining Phase-3 hex placeholders (#f5f5f5 / #fafafa / #ddd / #e0e0e0 / #4a90e2 / #357abd / #666) consuming existing tokens; tracked in STATE.md Open Todos as Wave-4 cleanup.

## Task Commits

1. **Task 1: Migrate Sidebar/Modal/Menu CSS to tokens; restructure Sidebar empty state with big ampersand** — `b7afb09` (feat)
2. **Task 2: Create ErrorBanner component + wire into App.jsx** — `f07bb19` (feat)
3. **Task 3: Create favicon-ampersand.svg and update index.html link** — `728dfbb` (feat)
4. **Cleanup: Close .markdown-content phase-wide hex gate (Rule 2 deviation)** — `a805d63` (fix)

## Files Created/Modified

**Created:**
- `frontend/src/components/ErrorBanner.jsx` — persistent H9-01 recovery banner with role=alert + conditional Dismiss
- `frontend/src/components/ErrorBanner.css` — soft tint + var(--color-error) border-top + retry/dismiss buttons (tokens)
- `frontend/public/favicon-ampersand.svg` — 32×32 SVG ampersand serif mark

**Modified:**
- `frontend/src/components/Sidebar.css` — full token migration + new empty state + rename hint classes + active row indicator
- `frontend/src/components/Sidebar.jsx` — empty state branch + rename hint + Modal/Menu copy locked
- `frontend/src/components/Modal.css` — full token migration; destructive button on var(--color-error)
- `frontend/src/components/Menu.css` — full token migration; shortcut span styling
- `frontend/src/components/Menu.jsx` — shortcut span rendering (visual-only)
- `frontend/src/App.jsx` — useCallback import + streamError/retryAttempted state + ErrorBanner wiring + .app__main-with-banner wrapper
- `frontend/src/App.css` — delta: removed direct `.chat-interface` grid placement; added `.app__main-with-banner` wrapper rule; mobile rule symmetrically renamed
- `frontend/src/index.css` — `.markdown-content` block migrated from Phase-3 hex placeholders to tokens (Rule 2)

## Decisions Made

- **Sidebar active marker convention CONFIRMED.** The existing `${isActive ? 'active' : ''}` className conditional from Phase 1 / Plan 03 was already in place; no JSX edit needed for the indicator. CSS selector `.conversation-item.active { border-left: 3px solid var(--color-accent); background: var(--color-accent-soft); padding-left: calc(var(--space-3) - 3px) }` matches exactly.
- **Modal body uses partial UI-SPEC metadata.** UI-SPEC §Copywriting Contract line 258 specifies `"{title}" · N messages · {time_ago}` but the sidebar `conversations` list provides `created_at` (ISO timestamp) without a built-in time-ago helper. Implemented `"{title}" · N messages` for now; `time_ago` is a Phase-1-follow-up (mentioned in plan body — "if missing, that's out of scope; flag in SUMMARY"). Tracked under "Deferred Issues" below.
- **Banner stage-number derivation** — read via `setCurrentConversation(prev => ...)` functional setter to walk the latest message slots without stale closure issues. Logic: `stage1 → 1; stage1 set → 2; stage2 set → 3; stage3 set → 4` (the last only relevant for QR profile's Stage 4 refinement).
- **App.css migrated cleanly.** The Plan 04-02 → 04-04 ordered execution prevented merge conflicts: Wave 2 committed the direct `.chat-interface` grid rule, Wave 4 replaced it with the wrapper. Net result: zero behavioral change in the desktop layout (ChatInterface still occupies the same cell), banner sits above as a flex child when present.
- **Soft-tint literals over new tokens.** `rgba(160, 56, 40, 0.10)` (banner background) + `rgba(160, 56, 40, 0.12)` (retry hover) follow the same pattern Plan 04-03 used for Stage 4 amber. The token taxonomy in `index.css` is closed at end of Wave 1; cross-wave file ownership prevents Plan 04-04 from extending it.
- **Favicon trade-offs documented.** Single-theme (light palette only). Per CONTEXT D-16 explicit decision; per-theme favicon support across 2026 browsers (Chrome `media="(prefers-color-scheme: dark)"`) is patchy in Firefox/Safari. Backlog item: revisit when coverage improves. Hex literals are intentional (SVG cannot consume CSS custom properties). Font = Georgia (universally available; consistent with in-app brand mark which uses Source Serif 4 with Georgia as fallback).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Closed `.markdown-content` block in `index.css` to satisfy phase-wide grep gate**

- **Found during:** Phase-wide verification after Task 3
- **Issue:** Plan 04-04 listed 9 files to modify, but the phase-wide grep gate (UI-SPEC line 207-211: zero `#4a90e2|#357abd|#f0fff0|#f5f5f5|#f0f0f0` in `frontend/src/`) failed because the `.markdown-content` block in `index.css` still held Phase-3 hex placeholders (`#f5f5f5` for code/pre/table-header/even-row backgrounds; `#4a90e2`/`#357abd` for link colors; `#ddd`/`#666`/`#e0e0e0`/`#fafafa` for table borders + blockquote). STATE.md Open Todos explicitly flagged this as "Wave 4 (Plan 04-04) closes them along with the favicon SVG."
- **Fix:** Migrated the block to consume existing tokens. NO new tokens added — index.css token taxonomy stays closed at end of Wave 1 per Plan 04-01 ownership. Migration map: `#f5f5f5 → var(--color-bg-secondary)`, `#fafafa → var(--color-bg-secondary)`, `#ddd → var(--color-border-strong)`, `#e0e0e0 → var(--color-border-subtle)`, `#666 → var(--color-fg-secondary)`, `#4a90e2 → var(--color-accent)`, `#357abd hover → filter: brightness(0.85)`, `'monospace' → var(--font-mono)`.
- **Files modified:** `frontend/src/index.css`
- **Verification:** Phase-wide grep gate now reports `phase-wide bootstrap hex: clean`. Build succeeds.
- **Committed in:** `a805d63` (separate fix commit, post-Task-3)

---

**Total deviations:** 1 auto-fixed (Rule 2 — required for Phase 4 success criterion #9 "ALL Wave A/B/C/D grep gates pass cumulatively").
**Impact on plan:** No scope creep; closure of the explicitly-flagged STATE.md Open Todo. The plan body's "NO añadir nuevos tokens a `index.css`" rule was respected — only literal-to-existing-token swaps.

## Issues Encountered

- **PowerShell argument escaping under Bash tool** — Initial inline verifier scripts failed because `$` got interpreted by the shell. Resolved by writing `.tmp-verify-04-04-task{1,2,3,final}.ps1` files and running them via `pwsh -NoProfile -ExecutionPolicy Bypass -File`. The temp files are git-ignored (start with `.tmp-`).
- **Comment false-positive in Wave 4 grep gate** — First version of the phase-wide gate flagged `MessageHeader.css` line 2 because the *comment* mentioned the migrated hex (`#666 #333 #999 #4a90e2`). Fixed the verifier to strip `/* ... */` comments before matching. The CSS code itself was clean.

## Deferred Issues

- **Modal `time_ago` portion of metadata copy** — UI-SPEC §Copywriting Contract line 258 specifies `"{title}" · N messages · {time_ago}`. Sidebar's `conversations` list provides `created_at` ISO timestamps but no client-side time-ago helper exists. Current implementation: `"{title}" · N messages`. Adding the time-ago column is a Phase-1-class follow-up (formatter utility); flagged in plan body as out-of-scope. Tracked for a future polish pass.
- **Per-theme favicon** — Currently single-theme (light palette only). Per CONTEXT D-16 explicit decision and 2026 browser support reality. Backlog item: revisit when `<link rel="icon" media="(prefers-color-scheme: dark)">` coverage stabilizes across Chrome/Firefox/Safari.
- **Banner triggers only on full-stream `'error'` event.** Individual model failures inside Stage 1 are still rendered as failed tabs (per Phase 1 / RESEARCH §Error Handling — Stage 1 just renders failed tabs with strikethrough; Plan 04-03 added the `.tab--failed` styling). The banner is reserved for catastrophic interruption (network drop, backend exception, all-models-failed aggregate).

## Phase 4 Closing Checklist

- [x] **All Wave A/B/C/D grep gates pass cumulatively.**
  - Phase-wide bootstrap hex: clean (`#4a90e2|#357abd|#f0fff0|#f5f5f5|#f0f0f0` count = 0 in `frontend/src/` code, comments stripped)
  - Phase-wide system-ui: clean (only fallback inside `--font-sans` declaration in `index.css`)
  - Phase 3 placeholder hex (`#666 #333 #999`): clean in MessageHeader/QualityToggle/ReasoningDisclosure/Stage4 .css code
  - Sidebar.css `var(--color-)` count: 39 (≥5 required)
  - Modal.css `var(--color-)` count: 13 (≥4 required)
  - Menu.css `var(--color-)` count: 8 (≥4 required)
- [x] **VIS-01 closed** — Bootstrap palette gone, terracota + neutrals applied across the entire frontend tree.
- [x] **VIS-02 closed** — `system-ui` only present as fallback inside `--font-sans` declaration; Source Serif 4 / Inter / JetBrains Mono Variable applied via tokens.
- [x] **VIS-03 closed** — Header brand mark + Sidebar empty state ampersand + ChatInterface welcome state copy all materialized intentionally.
- [x] **VIS-04 closed** — Stage1Progress dot-pulse, ReasoningDisclosure accordion, Stage 3 fade-in, sidebar hover/active fades, ErrorBanner motion all respect `prefers-reduced-motion: reduce` global override.
- [x] **All 23 wireframes (W01–W23) materialised under Direction A skin.**
  - W01 Welcome state — Plan 04-03 (welcome copy + 3 italic examples)
  - W02 Cold start — Plan 04-03 (welcome state in no-conversation branch)
  - W03 Sidebar empty — Plan 04-04 (96px serif `&` mark)
  - W04 Sidebar populated — Plan 04-04 (active row indicator + hover states)
  - W05 Quality dial — Plan 04-03 (QualityToggle segmented control)
  - W06 Stage 1 progress strip — Plan 04-03 (Stage1Progress with @keyframes dot-pulse staggered 0/220/440ms)
  - W07 Stage 1 individual tabs — Plan 04-03 (active tab border-bottom 2px accent)
  - W08 Stage 2 anonymized rankings — Plan 04-03 (tabular-nums on aggregate)
  - W09 Stage 3 final synthesis — Plan 04-03 (terracota panel: var(--color-accent-soft) + 3px border-left + stage3-reveal keyframe)
  - W10 Stage 4 refinement — Plan 04-03 (transparent bg + var(--color-warn) chip)
  - W11 Critic score panel — Plan 04-03 (Stage 4 mounted as child of Stage3)
  - W12 ReasoningDisclosure — Plan 04-03 (modern grid-template-rows accordion + chevron rotation 90deg)
  - W13 Inline rename — Plan 04-04 (rename hint microcopy `Enter para guardar · Esc para cancelar`)
  - W14 Three-dot menu — Plan 04-04 (Menu.css accent-soft hover + shortcut hints R / U+232B)
  - W15 Delete confirmation modal — Plan 04-04 (`Delete this conversation?` title + italic quoted metadata + var(--color-error) destructive button)
  - W16 Search affordance — Plan 04-04 (search input + content-fallback affordance on tokens)
  - W17 Header brand + theme toggle — Plan 04-02 (Header component with sun/moon toggle)
  - W18 Light theme — covered by Plan 04-01 token taxonomy + Plan 04-02 shell
  - W19 Dark theme — covered by Plan 04-01 dark-override block in index.css
  - W20 Catastrophic interruption banner — Plan 04-04 (ErrorBanner persistent with retry + conditional dismiss)
  - W21 ChatInterface input form — Plan 04-03 (Send button accent + spinner border-top accent)
  - W22 Markdown body styles — Plan 04-04 cleanup (table borders + inline-code bg + links on tokens)
  - W23 Mobile drawer — Plan 04-02 (sidebar collapses to fixed overlay, transform translateX)

## Markdown Export Contract

Markdown export from a deliberation produces unchanged output (Phase 3 / Plan 03-05 contract preserved — Phase 4 is CSS + JSX-microcopy-only; `download.js` was not touched).

## Next Phase Readiness

- **Phase 4 visual identity implementation: COMPLETE.** All 4 plans shipped (04-01 foundations, 04-02 branded shell, 04-03 deliberation surfaces, 04-04 conversations & polish).
- **All 21 v1 requirements satisfied** (SEC-01, CONV-01..03, UXR-01..04, QUAL-01..04, RSCH-01..05, VIS-01..04). Phase 4 was the closing phase.
- **Recommended next session:** Update `.planning/STATE.md` to mark Phase 4 complete + 21/21 v1 requirements satisfied. Then either (a) move to phase verification + retrospective, or (b) start the Out-of-Scope items list (multi-turn conversations, citation extraction, persistence of metadata).

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: `frontend/src/components/ErrorBanner.jsx`
- FOUND: `frontend/src/components/ErrorBanner.css`
- FOUND: `frontend/public/favicon-ampersand.svg`

**Commits verified to exist (`git log --oneline`):**
- FOUND: `b7afb09` — Sidebar/Modal/Menu CSS migration + ampersand mark
- FOUND: `f07bb19` — ErrorBanner + App.jsx wiring
- FOUND: `728dfbb` — favicon SVG
- FOUND: `a805d63` — markdown-content phase-wide gate cleanup

**Build verified:** `npm --prefix frontend run build` succeeds (CSS 38.07 kB / gzip 6.27 kB; JS 562.57 kB / gzip 172.80 kB).

**Phase-wide grep gates verified:** All gates pass (bootstrap hex 0, system-ui 0 outside index.css, phase-3 placeholders 0).

---
*Phase: 04-visual-identity-implementation*
*Completed: 2026-05-10*
