---
phase: 260511-l5w
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/ChatInterface.css
  - frontend/src/components/StageNavigationStrip.css
autonomous: true
requirements: [NAV-01-FIX]
tags: [frontend, css, sticky, navigation, regression]

must_haves:
  truths:
    - "Scrolling within a conversation no longer shows a previous line of content above the sticky stage header — the sticky bar sits flush against the top edge of the scroll viewport."
    - "Sticky chip strip has visible bottom-edge feedback (existing border + an added soft box-shadow) so the layering between the sticky chrome and the scrolling content below is unambiguous."
    - "Mobile viewport ≤768px: the sticky still respects the global app-header bar (which lives outside .messages-container in the App grid) and notch safe-area-insets; no regression to Phase 7 MOBL work."
  artifacts:
    - path: "frontend/src/components/ChatInterface.css"
      provides: "Scroll container with no top padding; horizontal padding preserved via padding-inline; vertical rhythm preserved via .message-group / .messages-container__top-spacer."
      contains: "padding-inline"
    - path: "frontend/src/components/StageNavigationStrip.css"
      provides: "Sticky chip strip with opaque background + box-shadow for unambiguous layering."
      contains: "box-shadow"
  key_links:
    - from: ".messages-container (scroll container)"
      to: ".stage-nav-strip (sticky element)"
      via: "shared top edge — no padding-top on the scroll container"
      pattern: "padding-inline"
    - from: ".stage-nav-strip"
      to: "content scrolling beneath it"
      via: "opaque background + box-shadow + existing border-bottom"
      pattern: "box-shadow"
---

<objective>
Fix the NAV-01 regression caught during the v2.0 milestone-close manual smoke (2026-05-11): the sticky stage header has a ghost strip above it where content keeps scrolling visibly. The root cause is the scroll container `.messages-container` carrying `padding: var(--space-5)` on all four sides — the top padding creates a 20px gap above the sticky's `top: 0` through which the preceding line of content shows.

Purpose: close the v2.0 NAV-01 spirit-vs-letter gap before it becomes a v2.1 commitment. The sticky exists; it just doesn't pin flush. One-file CSS fix plus a small shadow upgrade for perceptible layering.

Output: two CSS files modified. No JSX changes. No JS. No IntersectionObserver-on-sentinel pattern (deferred — static shadow is acceptable per Direction A "calmo" and matches v1.0/v2.0 CSS-only precedent like `ReasoningDisclosure`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/v2.1-BACKLOG-FROM-MANUAL-SMOKE.md
@.planning/phases/05-critique-mode-schema-migration-in-conversation-navigation/05-05-SUMMARY.md
@frontend/src/components/ChatInterface.css
@frontend/src/components/ChatInterface.jsx
@frontend/src/components/StageNavigationStrip.jsx
@frontend/src/components/StageNavigationStrip.css

<interfaces>
<!-- Sticky stack contract established by Phase 5 Plan 05-05 (NAV-01/02). -->
<!-- The executor must preserve this stack exactly; only the scroll-container -->
<!-- top edge and the strip's shadow change. -->

Sticky stack inside .messages-container (extracted from existing code):

```
.stage-nav-strip            top: 0;                z-index: 3   (sticky)
.stage1 .stage-title        top: var(--space-7);   z-index: 2   (sticky, 48px)
.stage2 .stage-title        top: var(--space-7);   z-index: 2   (sticky)
.stage3-header              top: var(--space-7);   z-index: 2   (sticky)
.stage3 .stage-title        top: var(--space-7);   z-index: 2   (sticky)
.stage4 .stage-title        top: var(--space-7);   z-index: 2   (sticky)
[data-stage] sections       scroll-margin-top: var(--space-7);
```

The global Header (52px, --layout-header-h) lives in the App grid above .messages-container — it is NOT part of this scroll context. Strip `top: 0` is already below it from the viewport perspective. (RESEARCH §5.1, 05-05-SUMMARY decisions.)

Scroll container (current, buggy):

```css
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);        /* ← all four sides; the top side is the bug */
  touch-action: pan-y;
}
```

Target shape (after fix):

```css
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding-inline: var(--space-5);  /* keep horizontal rhythm */
  padding-bottom: var(--space-5);  /* keep bottom rhythm */
  /* NO padding-top — the scroll container shares its top edge with the
     sticky stage-nav-strip so nothing scrolls above it. */
  touch-action: pan-y;
}
```

Strip (current, layering ambiguous):

```css
.stage-nav-strip {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  /* ...rest unchanged... */
}
```

Target shape:

```css
.stage-nav-strip {
  /* ...existing rules unchanged... */
  box-shadow: 0 4px 8px -4px var(--color-shadow, rgba(0, 0, 0, 0.08));
}
```

Note on `--color-shadow`: this token already exists in the Direction A palette (used by other elevated surfaces). If grep against `frontend/src/index.css` does not find `--color-shadow`, fall back to the literal `rgba(0, 0, 0, 0.08)` (`rgba(0, 0, 0, 0.16)` in dark theme via `@media (prefers-color-scheme: dark)` if needed — but check first; v2.0 may have already set up a token).
</interfaces>

<reproduction>
1. `bash start.sh`
2. Open http://localhost:5173, send any prompt (Fast profile is fine — the bug is structural, not data-dependent).
3. Wait for Stage 1 to populate.
4. Scroll the central panel up and down.
5. **Bug:** above the sticky `Stage 1 · N responses` chip strip, a thin strip of the previous line of body text remains visible and scrolls through. Should be invisible — the sticky should pin flush against the panel top.
</reproduction>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove scroll-container top padding + add shadow to sticky chip strip</name>
  <files>frontend/src/components/ChatInterface.css, frontend/src/components/StageNavigationStrip.css</files>
  <action>
Two surgical CSS edits. No JSX, no JS, no new tokens.

**Edit A — `frontend/src/components/ChatInterface.css`, the `.messages-container` rule (lines 19-26):**

Replace the shorthand `padding: var(--space-5);` with explicit per-axis padding that omits the top side. Use `padding-inline` for left/right and `padding-bottom` for the bottom; leave the top edge bare so the scroll container's top edge coincides with the sticky strip's `top: 0`.

Result block:

```
.messages-container {
  flex: 1;
  overflow-y: auto;
  /* NAV-01 fix (2026-05-11 quick-task 260511-l5w): no padding-top —
     the scroll container shares its top edge with the sticky
     .stage-nav-strip so nothing scrolls above the sticky chrome.
     Horizontal + bottom rhythm preserved. */
  padding-inline: var(--space-5);
  padding-bottom: var(--space-5);
  /* MOBL-04 prerequisite — allow vertical scroll, reserve horizontal for the
     07-02 swipe-to-close drawer hook. */
  touch-action: pan-y;
}
```

Rationale for keeping the comment block: WHY is non-obvious (anyone reading the file would otherwise put the padding back). CLAUDE.md `# Comments` convention permits comments explaining WHY non-obvious. The MOBL-04 line was already there; preserve it.

**Verify the welcome state still breathes.** Lines 40-51 of the same file already set `padding: var(--space-7) var(--layout-content-padding)` on `.chat-interface__welcome`. The welcome state has its own padding and does NOT depend on `.messages-container` padding-top. Confirmed by reading the file — no change needed.

**Verify the first message group still breathes from the strip.** When a message is rendered, the order inside `.messages-container > .message-group > .assistant-message` is: `ExternalResearchPanel?` → `.assistant-header` → `<MessageHeader>` → `<StageNavigationStrip>` → stage sections. The strip is the first sticky element; everything else is below it. Removing the container's top padding pulls `ExternalResearchPanel` / `assistant-header` up to the top edge — but those scroll away under the strip on first scroll, so this is the desired behavior (the strip pins, the rest scrolls). No new spacer needed.

**Edit B — `frontend/src/components/StageNavigationStrip.css`, the `.stage-nav-strip` rule (lines 12-23):**

Add a `box-shadow` line at the end of the rule (after `-webkit-overflow-scrolling: touch;`, before the closing `}`). Keep the existing `border-bottom: 1px solid var(--color-border-subtle);` — together they give a calm, soft layering signal without becoming loud.

First, confirm whether `--color-shadow` exists as a token: `grep -n -- '--color-shadow' frontend/src/index.css frontend/src/styles/*.css frontend/src/components/*.css 2>$null`.

- If `--color-shadow` IS defined → use `box-shadow: 0 4px 8px -4px var(--color-shadow);`
- If it is NOT defined → use `box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.08);` (literal, no new token; defer token introduction to v2.1 if a wider audit reveals shadow patterns are absent across the codebase)

Add a one-line comment above it: `/* NAV-01 fix (260511-l5w): static soft shadow makes the sticky->scrolling layering unambiguous. Direction A calmo — shadow is always present, not toggled. */`

**Do NOT touch:**
- The stage section header sticky CSS (Stage1.css, Stage2.css, Stage3.css, Stage4.css) — their `top: var(--space-7)` stacking is correct; the bug is the container, not the inner stickies.
- ChatInterface.jsx — no structural changes needed; the strip already wraps as a single block (it's a flex container with all the chips + its own border-bottom).
- StageNavigationStrip.jsx — no JS changes; static shadow per Direction A "calmo".
- Tests / Playwright VRT baselines — they will visual-diff fail; that is expected. Update of baselines is a separate task (see `<defer>` block below).
  </action>
  <verify>
    <automated>
Run from project root in PowerShell (or bash — both syntaxes provided):

PowerShell:
```
cd frontend; npm run build
```

Bash:
```
cd frontend && npm run build
```

Build must exit 0 (no CSS parser errors).

Then static checks (use Grep tool from project root):

1. `.messages-container` must NOT contain `padding: var(--space-5)` shorthand (case-sensitive search inside the rule body). Grep pattern: `padding: var\(--space-5\);` inside `frontend/src/components/ChatInterface.css` — should match ZERO times on a line that follows `.messages-container {`. Acceptable: per-axis declarations like `padding-inline:` and `padding-bottom:`.

2. `.messages-container` must contain `padding-inline: var(--space-5);` AND `padding-bottom: var(--space-5);`. Grep pattern: `padding-inline: var\(--space-5\);` in `frontend/src/components/ChatInterface.css` — must match once. Same for `padding-bottom`.

3. `.messages-container` must NOT contain `padding-top` (any value). Grep pattern: `padding-top` in `frontend/src/components/ChatInterface.css` — should match ZERO times.

4. `.stage-nav-strip` must contain `box-shadow`. Grep pattern: `box-shadow:` in `frontend/src/components/StageNavigationStrip.css` — must match at least once.

5. Stage*.css top offsets unchanged: Grep `top: var\(--space-7\);` in `frontend/src/components/Stage1.css`, `Stage2.css`, `Stage3.css`, `Stage4.css` — must still match in each.

6. ESLint clean on the two modified files (CSS doesn't run through ESLint, but if any eslint-plugin-css were configured, run `cd frontend && npm run lint` — must exit 0; if no lint script, skip).
    </automated>
    <manual>
After automated checks pass, manual smoke (the executor reports the visual verdict in their SUMMARY.md; the user does the final acceptance separately):

1. `bash start.sh` from project root.
2. Open http://localhost:5173.
3. Send a Fast-profile prompt that triggers a real Stage 1 (e.g. "List three Snowflake performance pitfalls").
4. Wait for Stage 1 to populate (Stage 2 + 3 will follow but Stage 1 alone reproduces the bug).
5. Scroll the central panel up and down.
6. **Expected:** the sticky chip strip (`Stage 1 · N responses`) pins flush against the top edge of the panel. No content scrolls visibly above it. A soft shadow is perceptible below the strip when content has scrolled past.
7. Resize the window to ≤768px (or use DevTools mobile emulation — iPhone 14 Pro is a fair proxy). Repeat scroll. Sticky still pins flush. App-header bar above is unaffected. Notch safe-area-inset still respected (composer at the bottom still sits above the home indicator).
8. Toggle dark theme via the theme button (Phase 4 work). Sticky still legible; shadow still subtle, not loud.

If any of those fail, the fix is incomplete. Most likely failure mode: an unexpected `padding-top` on an inner wrapper (`.message-group`, `.assistant-message`) reintroducing the gap. Inspect via DevTools "computed" tab on the topmost element inside `.messages-container` at scroll-top=0.
    </manual>
  </verify>
  <done>
- `cd frontend && npm run build` exits 0.
- Grep gates 1-5 in `<automated>` all pass.
- Manual smoke confirms the ghost strip is gone and the sticky shadow is perceptible at all viewport sizes (≥768px and ≤768px) in both light and dark themes.
- No JSX, no JS, no new tokens introduced.
- No regressions to Stage*.css sticky offsets.
- Two-file CSS diff, both files committed in a single `fix(260511-l5w):` commit by the executor (or the orchestrator on close).
  </done>
</task>

</tasks>

<defer>
**Out of scope for this quick-task — defer to v2.1 phase 1 or later:**

1. **Playwright VRT baseline update.** The 24 PNG baselines × 4 viewports captured in Phase 7 (07-03) will visual-diff fail against this fix because the sticky chrome now sits flush instead of with a 20px gap above it. That is the correct behavior — the baselines were captured with the bug present. Baseline regeneration is a separate task: `npx playwright test --update-snapshots` against the Linux-Docker harness, then commit the new PNGs. Do NOT regenerate from Windows local (cross-platform pixel diff). Tracked: v2.1 phase 1 follow-up.

2. **"Shadow only when stuck" upgrade.** The v2.1 backlog suggests an IntersectionObserver sentinel that toggles the shadow ON only when the strip is actually pinned (vs scrolled past). Static shadow is the v1.0 / v2.0 ship; IO upgrade is enhancement, not regression-fix. Direction A "calmo" precedent (see ReasoningDisclosure accordion, also CSS-only) supports keeping it static.

3. **Tab + H2 redundancy collapse** (v2.1 backlog P1). Drop the per-stage H2 ("Stage 1: Individual Responses") and let the chip strip carry the semantic. This is a JSX + a11y change, not in scope here.

4. **Sticky breadcrumb with prompt context** (v2.1 backlog P1). Show the conversation title or active model name inside the sticky bar. Requires JSX wiring + scroll-spy of H3 model-names — explicit P1 work, not regression-fix.

5. **Cross-mode behavior in critique conversations.** The fix applies universally because both fresh-prompt and critique conversations render through the same `.messages-container` (per 05-05-SUMMARY §Universality). No critique-specific work needed.
</defer>

<verification>
- Build: `cd frontend && npm run build` exits 0.
- Static gates: 5 grep assertions in Task 1 `<automated>` all pass.
- Visual: manual smoke confirms ghost strip is gone, shadow is perceptible, mobile + dark theme unaffected.
- No regressions: Stage*.css top offsets unchanged; `.chat-interface { position: relative }` (NAV-04 anchor) unchanged; `touch-action: pan-y` (MOBL-04) preserved.
</verification>

<success_criteria>
- Two CSS files modified (`ChatInterface.css`, `StageNavigationStrip.css`).
- Zero JSX changes.
- `npm run build` green.
- Manual reproduction steps in `<context><reproduction>` no longer reproduce the bug.
- Sticky chip strip has perceptible soft shadow + existing border for unambiguous layering.
- Mobile + safe-area-inset behavior preserved (no regression to MOBL-01..04).
- One conventional commit by the executor: `fix(260511-l5w): sticky stage header pins flush — drop scroll-container padding-top + add soft shadow`.
</success_criteria>

<output>
After completion, create `.planning/quick/260511-l5w-arreglar-el-bug-sticky-nav-01/SUMMARY.md` per `@$HOME/.claude/get-shit-done/templates/summary.md`. SUMMARY must include:
- Confirmation of the two file edits with line numbers.
- Result of the 5 grep gates.
- Manual smoke verdict (one line: bug reproduces y/n, shadow perceptible y/n, mobile + dark theme intact y/n).
- A pointer to the deferred items (`<defer>` block above) so the user knows what is NOT shipping in this commit.
- Note: VRT baseline regeneration is explicitly out of scope and tracked for v2.1 phase 1.
</output>
