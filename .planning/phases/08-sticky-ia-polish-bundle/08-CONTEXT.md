# Phase 8: Sticky/IA polish bundle - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is the **first v2.1 polish bundle** — eight requirements all touching three already-shipped surfaces (`StageNavigationStrip`, `Sidebar`, `BackToTopButton`) and tuning them so the v2.0 manual smoke findings stop being friction.

What the phase delivers:

1. **Sticky stage-nav-strip without ambiguous layering (NAV-V2.1-01)** — **close/verify only**. The partial fix already shipped in quick-task `260511-l5w` (drop `.messages-container { padding-top }` + add `box-shadow: 0 4px 8px -4px rgba(0,0,0,0.08)` on `.stage-nav-strip`). Phase 8 formalises the close: smoke under 3 stages × both themes × 4 viewports, re-checks no regression when IA-V2.1-01 extends the sticky to include a breadcrumb, and queues VRT baseline regen for Phase 10. Plan-time MUST NOT re-implement the CSS fix.
2. **Active tab connected to panel via 2px bottom border (NAV-V2.1-02)** — the `.stage-nav-strip__chip` already reserves `border-bottom: 2px solid transparent` (StageNavigationStrip.css:32) and `.is-active` already swaps to `border-bottom-color: var(--color-accent)` (line 59). The "tab connected" effect coexists with the existing strip box-shadow (per **D-08** below).
3. **Drop redundant H2s under tabs (NAV-V2.1-03)** — remove `<h3 className="stage-title">Stage X: …</h3>` from `Stage1.jsx:80`, `Stage2.jsx:15`, `Stage3.jsx:27`, `Stage4.jsx:30`. Preserve screen-reader heading structure (per **D-09**).
4. **Breadcrumb in sticky bar (IA-V2.1-01)** — surface the conversation title as a sub-context line inside the sticky stage-nav-strip (per **D-01..03**).
5. **Sidebar active-row 3px accent border (IA-V2.1-02)** — **already structurally shipped** in `Sidebar.css:106-125` (`.conversation-item { border-left: 3px solid transparent }` + `.conversation-item.active { border-left: 3px solid var(--color-accent) }`). Phase 8 verifies the border is **visible enough** post-manual-smoke; no structural change expected.
6. **Sidebar date grouping (IA-V2.1-03)** — group conversations by `created_at` bucket with English headers (per **D-04..05**).
7. **Sidebar metadata demote (IA-V2.1-04)** — `Sidebar.jsx:120-123` already renders `<div className="conversation-meta">{conv.message_count} messages</div>`. Demote to a more discreet form (per **D-06..07**).
8. **Scroll-to-top a11y baseline (A11Y-V2.1-01)** — `BackToTopButton.jsx` already has the `prefers-reduced-motion` per-click hook (line 29) and opacity-based fade-in (BackToTopButton.css:26-31). Adjust threshold `> 800` → `> 600` (line 18), keep `aria-label="Back to top"` (per **D-10**), and bump contrast (per **D-11**).

**Scope anchor:** Phase 8 does NOT add user-visible product capability and does NOT regenerate VRT baselines (Phase 10 owns that). Every change must stay inside the Direction A "calmo" token system — no new tokens, only value swaps and reuses.

</domain>

<decisions>
## Implementation Decisions

### Breadcrumb (IA-V2.1-01)

- **D-01 — Content rule: conversation title only.** The breadcrumb shows the conversation's current title and nothing else. It does NOT switch to the active Stage 1 sub-model name, and it does NOT echo the chip strip's active stage. Rationale: simplest behavior, no coupling to Stage 1's internal `activeTab`, no additional IntersectionObserver wiring. Resolves the **Phase 8 open decision** that STATE.md flagged ("show conversation title always, or switch to active Stage 1 model name when reading a specific Stage 1 response").
- **D-02 — Host: line above the chip strip inside the same `.stage-nav-strip` container.** Single sticky element, two-line layout: line 1 = conversation title (microcopy size, muted color, single-line truncation), line 2 = existing chip strip. Rationale: one sticky element guarantees the requirement "Sticky bar layout must not jump on stick / unstick" without coordinating offsets between stacked sticky elements. Reuses the existing `box-shadow` from `260511-l5w` without duplicating it. Direction A "calmo": title and chips read as one navigation block. *(Claude's discretion — user said "decide tú".)*
- **D-03 — Title source: assistant message's parent conversation title.** Read `conversation.title` from `App.jsx` state and pass via prop to `ChatInterface` → `StageNavigationStrip`. Truncate with `text-overflow: ellipsis` on overflow (no marquee, no wrap). If `conversation.title` is empty, fall back to the literal `"New Conversation"` string already used in `Sidebar.jsx:115`.

### Sidebar date grouping (IA-V2.1-03)

- **D-04 — Bucket field: `created_at`.** The `/api/conversations` endpoint already returns `created_at` on every conversation row. No backend shape change. Aligns with the "1 conversation = 1 deliberation" mental model (conversations do not get updated post-Stage-3). Renames do NOT bump the bucket. *(Claude's discretion — user said "decide tú".)*
- **D-05 — Header copy: English.** Date group headers render as **Today / This week / This month / Older**. This is a **conscious override** of the requirement text in `REQUIREMENTS.md:26` and the user-authored backlog at `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md:52` (both say "Hoy / Esta semana / Este mes / Más antiguo"). Rationale: consistency with the rest of the sidebar copy (`Search conversations…`, `+ New Conversation`, `+ New critique`, `Rename`, `Delete`). Downstream agents MUST use the English strings; the literal Spanish in REQUIREMENTS.md is hereby overridden.

### Sidebar metadata demote (IA-V2.1-04)

- **D-06 — Glyph: unicode bullet `•` before the count.** Renders as `• 4` (microcopy size). Rationale: consistent with the existing unicode-glyph idiom in this codebase (`⋮` for menu trigger in `Sidebar.jsx:135`, `+` in "+ New Conversation", `↑` in `BackToTopButton.jsx:42`). Cero asset additions, cero SVG icon system introduction. The bullet (`•`) is preferred over emoji `💬` because emoji renders coloured on some OSes and breaks Direction A calmness. *(Claude's discretion on the exact glyph — user picked the "unicode glyph" option category.)*
- **D-07 — Visibility: hide entirely when `message_count === 0`.** New conversations start at 0 messages until the user submits a prompt; rendering `• 0` is noise. Conditional render of the `.conversation-meta` block. *(Claude's discretion.)*

### Sticky tab/panel layering (NAV-V2.1-01 + NAV-V2.1-02 coexistence)

- **D-08 — Keep `box-shadow` on `.stage-nav-strip` AND `border-bottom: 2px var(--color-accent)` on active chip.** Both layered together. Rationale: this is the classic "tab connected to panel" pattern — the soft shadow (alpha 0.08) marks the sticky plane, and the active chip's accent border is the single element that interrupts the shadow toward the panel. NAV-V2.1-01 stays closed exactly as `260511-l5w` shipped. NAV-V2.1-02 layers on top without conflict. **Plan-time MUST NOT drop the box-shadow** to "improve continuity" — that would re-introduce the ambiguous-layering bug from the 2026-05-11 manual smoke.

### H2 drop (NAV-V2.1-03)

- **D-09 — Replace each `<h3 className="stage-title">` with the parent section's `aria-labelledby` pointing at the corresponding chip in the strip.** No new `sr-only` heading nodes. The chip strip becomes the canonical labelling source for each stage section. The four target sites: `Stage1.jsx:80`, `Stage2.jsx:15`, `Stage3.jsx:27`, `Stage4.jsx:30`. The stage sections (`[data-stage="stage1"]`, etc., already used by the IntersectionObserver in `StageNavigationStrip.jsx:81`) gain a matching `id` attribute on each chip so `aria-labelledby` resolves. *(Default — discussion settled with "listo para CONTEXT.md" without selecting an alternative.)*

### Scroll-to-top (A11Y-V2.1-01)

- **D-10 — `aria-label` stays `"Back to top"` (English).** The requirement literal in `REQUIREMENTS.md:39` says `"Volver al inicio"`; this is a **conscious override** for consistency with the rest of the UI copy (which is English) and the already-shipped value in `BackToTopButton.jsx:38`. Downstream agents MUST use `"Back to top"`.
- **D-11 — Contrast bump via color swap, not new tokens.** Current code: `background: var(--color-bg-elevated)` + `color: var(--color-fg-secondary)` + `border: 1px solid var(--color-border-subtle)` (`BackToTopButton.css:18-22`). Plan-time: swap `color` to `var(--color-fg-primary)` to raise contrast in both themes without introducing tokens. If devtools verify still fails WCAG AA after the swap, escalate by also changing `background` to `var(--color-bg-secondary)` (one step deeper into the token chain) — still no new tokens. *(Default — discussion settled with "listo para CONTEXT.md".)*
- **D-12 — Threshold: scroll > 600px** (down from current `> 800` in `BackToTopButton.jsx:18`). Matches REQUIREMENTS.md literal.

### Carry-forward from prior phases (locked, not re-asked)

- **Direction A "calmo / research notebook" tone** (v1.0 Phase 2 decision) — every Phase 8 change stays inside the existing palette + typography + spacing token system. No new tokens introduced.
- **No new CSS variables** — D-11 commits to value swaps inside the existing token chain only.
- **`prefers-reduced-motion` per-click pattern** (v2.0 Phase 5/7) — the breadcrumb's truncation transition and the scroll-to-top fade both honour reduced motion. `BackToTopButton.jsx:29` already implements per-click `matchMedia` check; `StageNavigationStrip.jsx:93` does too. No change needed in this phase.
- **No CI in this milestone (D-04b lock from v2.0)** — Phase 8 ships without any CI gate. Manual smoke + Phase 10 VRT regen are the verification surface.
- **VRT baseline regeneration is Phase 10**, not Phase 8 (ROADMAP.md non-negotiable ordering). Phase 8 plans MUST NOT run `npx playwright test --update-snapshots`.

### Claude's Discretion

- **Exact microcopy font size for the breadcrumb line** (D-02): `var(--font-size-microcopy)` is the natural choice from the existing token set; planner picks the final value based on the chip strip's vertical rhythm.
- **Exact truncation rule for the breadcrumb title** (D-03): single-line `text-overflow: ellipsis` with `min-width: 0` on the flex parent. Tooltip on truncated title is OPTIONAL (omit if it complicates the sticky bar's stacking context).
- **Date bucket boundaries** (D-04): "Today" = same calendar day local-time; "This week" = previous 6 calendar days; "This month" = remainder of current calendar month; "Older" = anything else. Planner can shift if it makes the boundary math simpler (e.g. ISO week vs rolling 7-day) as long as the user-visible buckets remain 4.
- **Glyph color/opacity for the demote** (D-06): the existing `.conversation-meta { color: var(--color-fg-muted) }` is the natural pick; no additional styling needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Direction A "calmo" tone, stack constraints, single-user posture (constrains Phase 8: no new tokens, no CI, English copy override is intentional).
- `.planning/REQUIREMENTS.md` lines 12-39 — Full text of NAV-V2.1-01..03, IA-V2.1-01..04, A11Y-V2.1-01. **Note:** the literal Spanish copy in IA-V2.1-03 ("Hoy / Esta semana / Este mes / Más antiguo") and A11Y-V2.1-01 ("Volver al inicio") is **overridden to English** by D-05 and D-10 of this CONTEXT.md.
- `.planning/ROADMAP.md` §"Phase 8: Sticky/IA polish bundle" (lines 48-60) — Goal, success criteria (5 items), scope-note that NAV-V2.1-01 is close/verify (no re-implementation of `260511-l5w`).
- `.planning/STATE.md` §"Open Decisions" — Confirms IA-V2.1-01 breadcrumb content rule was the explicit deferred decision (now resolved by D-01).
- `.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md` — Source backlog for the v2.1 milestone. Captures the user-supplied diagnosis of the sticky-header layering bug (resolved partially by `260511-l5w`, formally by Phase 8 verify) and the literal copy proposals (overridden in D-05/D-10).

### Quick-task fix referenced (close/verify only)
- `.planning/quick/260511-l5w-arreglar-el-bug-sticky-nav-01/` — The partial CSS fix already shipped (drop `.messages-container` `padding-top` + `box-shadow` on `.stage-nav-strip`). Phase 8 verifies; MUST NOT re-implement.

### Codebase maps (pre-read by planner)
- `.planning/codebase/STRUCTURE.md` — Component locations, frontend file conventions (one `.jsx` + one `.css` per component, kebab-case classes, PascalCase filenames).
- `.planning/codebase/ARCHITECTURE.md` — App layout (Header + sidebar grid; `.messages-container` is the scroll container for `StageNavigationStrip`'s IntersectionObserver).

### Prior phase CONTEXT.md (pattern references)
- `.planning/milestones/v2.0-phases/07-mobile-responsive-visual-regression-tests/07-CONTEXT.md` — D-04b "no CI" lock that Phase 8 inherits.
- `.planning/milestones/v2.0-phases/06-persistence-completeness-cost-analytics-settings-panel/06-CONTEXT.md` — Native `<dialog>` modal pattern (not used in Phase 8, but D-04 token-only philosophy carries forward).

### Spec/copy overrides created by this discussion (record explicitly)
- **D-05 overrides REQUIREMENTS.md:26 + v2.1-BACKLOG-FROM-MANUAL-SMOKE.md:52** — date group headers go in English (Today / This week / This month / Older), NOT Spanish.
- **D-10 overrides REQUIREMENTS.md:39** — `aria-label` stays "Back to top" (English), NOT "Volver al inicio".

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`StageNavigationStrip.jsx`** (115 LOC) — Already sticky at `top: 0` of `.messages-container`, already builds chips dynamically from `assistantMsg`, already runs IntersectionObserver scoped to the scroll container (NOT viewport), already honours `prefers-reduced-motion` per-click. D-02 extends this same component to host the breadcrumb line above the chip row.
- **`.stage-nav-strip__chip { border-bottom: 2px solid transparent }`** (StageNavigationStrip.css:32) + **`.is-active { border-bottom-color: var(--color-accent) }`** (line 59) — NAV-V2.1-02 is essentially already structurally in place. The phase is verify + confirm coexistence with the strip shadow (D-08).
- **`.conversation-item { border-left: 3px solid transparent }`** (Sidebar.css:106) + **`.conversation-item.active { border-left: 3px solid var(--color-accent) }`** (lines 121-125) — IA-V2.1-02 is structurally shipped. Phase 8 verifies visual prominence post-manual-smoke; no structural change expected.
- **`.conversation-meta { font-size: var(--font-size-microcopy); font-variant-numeric: tabular-nums }`** (Sidebar.css:159-165) — IA-V2.1-04 demote target. D-06 changes content (`{count} messages` → `• {count}`); existing styling already aligns with the demote intent.
- **`BackToTopButton.jsx` `prefers-reduced-motion` per-click pattern** (line 29) — A11Y-V2.1-01 fade behaviour already collapses to instant under reduced motion. Phase 8 only changes the threshold (D-12) and contrast (D-11).
- **`var(--color-fg-primary)` / `var(--color-fg-secondary)` / `var(--color-bg-elevated)`** — Existing token chain that D-11 navigates to bump contrast without new tokens.

### Established Patterns

- **One sticky element per scroll container** — `.stage-nav-strip` is the only `position: sticky` element inside `.messages-container`. D-02 keeps this invariant (two-line single sticky, not two stacked sticky elements).
- **Unicode glyph idiom for chrome** — `⋮`, `+`, `↑` are inline literals in JSX. D-06 follows this for the `•` bullet.
- **English copy across UI** — Sidebar text, modal text, settings panel text, error banner text are all English. D-05 and D-10 inherit this; do not mix languages.
- **`box-shadow: var(--shadow-sm)` on elevated controls** — `.back-to-top` already uses this (BackToTopButton.css:20). The strip's static shadow (StageNavigationStrip.css:24) is a custom one-off value chosen by `260511-l5w` to match the sticky's elevation cue. Both coexist.

### Integration Points

- **Conversation title plumbing for D-03** — `App.jsx` already holds `currentConversation` in state with `title` field. Pass `currentConversation.title` from `App.jsx` → `ChatInterface` → `StageNavigationStrip` as a new prop (e.g. `conversationTitle`). The prop becomes the breadcrumb's content; null/empty falls back to the literal `"New Conversation"` already used in `Sidebar.jsx:115`.
- **`data-stage` ↔ chip `id` linking for D-09** — `StageNavigationStrip.jsx:101-114` already renders chip buttons. Add an `id={`stage-nav-chip-${chip.id}`}` to each `<button>`, and add `aria-labelledby={`stage-nav-chip-${stageId}`}` to each `<section data-stage="...">` in `ChatInterface.jsx` (or wherever the Stage1/2/3/4 components are wrapped). The chip strip is rendered once per assistant message at a stable location, so the IDs are unique per page.
- **Date grouping for D-04** — `Sidebar.jsx:228-257` already has a `filteredConversations` `useMemo`. The grouping is a *render-time* transformation applied AFTER `filteredConversations` resolves: `useMemo(() => groupByBucket(filteredConversations), [filteredConversations])` returns `[{bucket, items}]` which the JSX iterates over with `<h2 className="conversation-group-header sr-only-with-visual">{bucket}</h2>` headers. **No backend change.**
- **VRT impact** — Every change in Phase 8 touches pixels covered by 16 v2.0 baselines × 4 viewports = 64 PNGs. Phase 10 owns the regen. Phase 8 plans MUST NOT regenerate baselines.

</code_context>

<specifics>
## Specific Ideas

- **User authored the backlog (`v2.1-BACKLOG-FROM-MANUAL-SMOKE.md`) themselves** with very specific copy in Spanish ("Hoy / Esta semana", "Volver al inicio"). Both literal strings are consciously overridden in D-05 and D-10 *for consistency with the rest of the EN-only UI*. Downstream agents that read REQUIREMENTS.md should read this CONTEXT.md alongside and use the English strings.
- **The `260511-l5w` quick-task fix is the floor**, not a starting point. Plan-time and execute-time both honour this: re-applying the CSS fix is a regression to be caught in plan-check.
- **The H2 → `aria-labelledby` swap (D-09)** is preferred over `sr-only` heading nodes because the chip strip already exists and is the natural labelling source; adding a parallel `sr-only` `<h2>` would duplicate the semantic role.

</specifics>

<deferred>
## Deferred Ideas

- **P3 scroll-spy in sticky bar** (show current H3/section name in sticky) — already deferred to v2.2 at roadmap time; not raised again in this discussion.
- **PDF/DOCX critique upload + auto-detect model attribution** — already deferred at roadmap time.
- **AbortController in `handleSelectConversation` + per-event `conversation_id` SSE scoping** — UX polish, deferred unless regression observed.
- **Token tweaks to brighten Direction A accents** — out of scope; D-11 commits to value swaps inside the existing token chain.
- **Tooltip on truncated breadcrumb title** — optional polish, plan-time discretion (D-03 says "OMIT if it complicates stacking context").
- **i18n infrastructure for full Spanish translation of the UI** — explicit non-goal of Phase 8 (D-05). If/when the user wants the UI in Spanish, that is a separate milestone-level decision.

</deferred>

---

*Phase: 8-sticky-ia-polish-bundle*
*Context gathered: 2026-05-12*
