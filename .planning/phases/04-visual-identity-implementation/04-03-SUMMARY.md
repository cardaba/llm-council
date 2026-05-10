---
phase: 04-visual-identity-implementation
plan: 03
subsystem: frontend-deliberation-surfaces
tags: [tokens, direction-a, stage3-terracota, accordion, progress-strip, welcome-state]
requires:
  - 04-01 (token system in :root, motion tokens, color-accent / color-accent-soft)
  - 04-02 (Header / App grid / MessageHeader migration pattern; useTheme)
provides:
  - Stage1.css migrated to tokens (active tab = border-bottom 2px var(--color-accent))
  - Stage2.css migrated; aggregate panel uses tabular-nums + mono ranks
  - Stage3.css with var(--color-accent-soft) + 3px terracota border-left (NO Bootstrap green)
  - Stage4.css transparent bg (continues stage3 panel); critic chip uses var(--color-warn) + inline rgba(140,102,32,0.12)
  - QualityToggle.css fully on tokens; active border var(--color-accent); cost subtitle tabular-nums
  - ReasoningDisclosure.css with chevron rotation + grid-template-rows 0fr→1fr accordion contract
  - ChatInterface.css fully on tokens; serif welcome state; accent-driven Send button
  - Stage1Progress.{jsx,css} (NEW) — 3-segment strip with @keyframes dot-pulse staggered 0/220/440ms
  - Stage1.jsx modelShort() helper + failed-tab rendering (.tab--failed + ⚠ glyph)
  - Welcome state copy locked verbatim from UI-SPEC §Copywriting Contract
affects:
  - frontend/src/components/Stage1.css (rewritten)
  - frontend/src/components/Stage1.jsx (helper + failed rendering)
  - frontend/src/components/Stage2.css (rewritten)
  - frontend/src/components/Stage3.css (rewritten — Bootstrap green eliminated)
  - frontend/src/components/Stage4.css (rewritten — tokens + soft amber inline rgba)
  - frontend/src/components/QualityToggle.css (rewritten — Phase-3 placeholders → tokens)
  - frontend/src/components/ReasoningDisclosure.css (rewritten — accordion grid contract)
  - frontend/src/components/ChatInterface.css (rewritten — full token migration)
  - frontend/src/components/ChatInterface.jsx (Stage1Progress mount + welcome state copy + activeStage derivation)
  - frontend/src/components/Stage1Progress.jsx (NEW)
  - frontend/src/components/Stage1Progress.css (NEW)
tech-stack:
  added: []
  patterns:
    - "CSS-only accordion via grid-template-rows: 0fr → 1fr (modern, no magic number)"
    - "Staggered keyframe dots: animation-delay 0/220/440ms on three siblings"
    - "Auto-collapse strip: grid + opacity + margin transition all on --motion-duration-slow"
    - "Soft amber tinted background: inline rgba(140,102,32,0.12) (token set closed for this wave)"
    - "Progress derivation pattern: activeStage from lastMessage.loading flags; isComplete = stage3 && !stage4 loading"
key-files:
  created:
    - frontend/src/components/Stage1Progress.jsx
    - frontend/src/components/Stage1Progress.css
  modified:
    - frontend/src/components/Stage1.css
    - frontend/src/components/Stage1.jsx
    - frontend/src/components/Stage2.css
    - frontend/src/components/Stage3.css
    - frontend/src/components/Stage4.css
    - frontend/src/components/QualityToggle.css
    - frontend/src/components/ReasoningDisclosure.css
    - frontend/src/components/ChatInterface.css
    - frontend/src/components/ChatInterface.jsx
decisions:
  - "Stage 3 highlight: var(--color-accent-soft) panel + 3px terracota border-left (UI-SPEC line 207-211) — Bootstrap green #f0fff0 prohibition delivered. The single most visible change of Phase 4."
  - "Stage 4 amber chip uses inline rgba(140,102,32,0.12) for the soft tint instead of adding a new --color-warn-soft token. Plan 04-01 closed the token set at end of Wave 1; Plan 04-03 does NOT modify index.css to avoid cross-wave file ownership confusion."
  - "ReasoningDisclosure ships BOTH the legacy class names (kept verbatim — JSX is in Phase-3 freeze) AND the modern grid-trick contract (.reasoning-disclosure__panel + data-open). Future migration that mounts the panel permanently can drop in without CSS rewrites."
  - "Welcome state mounted in BOTH the no-conversation cold start AND the empty-conversation branch. Same JSX block, identical copy — UI-SPEC welcome contract applies whenever no messages exist."
  - "Stage1Progress renders nothing when stage===null && !isComplete. Avoids reserving vertical space at cold start. Once any stage starts the strip becomes visible; once Stage 3 completes (and no Stage 4 is loading) it animates collapsed."
  - "isStageComplete gates on `!loadingState.stage4` so the strip stays expanded during the QR Stage 4 refinement (would be confusing if the strip auto-collapsed mid-pipeline)."
  - "Stage1.jsx modelShort() strips publisher prefix AND :online/:thinking suffix in one helper. The previous inline split('/')[1] left the :suffix on the tab label (visible regression with QR profile models)."
  - "Failed-tab uses the existing .tab + .tab--failed compound class consuming Stage1.css tokens (line-through + var(--color-error)). No inline styles introduced (Rule 0 of Wave 3 — JSX presentation via classes)."
metrics:
  duration: ~25 min
  date: 2026-05-10
  tasks_completed: 3
  files_changed: 11 (2 created, 9 modified)
  commits: 3
---

# Phase 4 Plan 03: Deliberation surfaces — Direction A migration

**One-liner:** Migrated all 7 deliberation-surface CSS files to design tokens (most visibly Stage 3 swapping Bootstrap green for terracota-soft + 3px accent border-left), shipped the new Stage1Progress strip with staggered dot-pulse animation and auto-collapse, and locked the welcome-state copy verbatim from UI-SPEC.

## What was built

**Token migration (Bootstrap hex elimination):**

| File | Bootstrap hex eliminated | Phase-3 placeholders eliminated | Tokens consumed |
|------|--------------------------|--------------------------------|-----------------|
| Stage1.css | `#4a90e2` ×4, `#f0f0f0`, `#ffffff` ×3 | `#666` ×2, `#333` ×2, `#888`, `#d0d0d0`, `#e0e0e0` | 19 |
| Stage2.css | `#4a90e2` ×3, `#357abd` ×0, `#f0f0f0`, `#ffffff` ×4 | `#666` ×2, `#333` ×3, `#888`, `#999`, `#2a7ae2` ×3 | 35 |
| Stage3.css | `#4a90e2` ×0, `#f0fff0` ×1, `#ffffff` ×3 | `#333` ×1, `#2d8a2d` ×3, `#c8e6c8` ×3 | 21 |
| Stage4.css | `#f0fff0` ×0, `#ffffff` ×1 | `#555`, `#666`, `#333`, `#d97706`, `#fffaf0`, `#f5e1c4`, `#c8e6c8` | 17 |
| ChatInterface.css | `#4a90e2` ×8, `#357abd` ×2, `#f0f7ff`, `#f5f5f5`, `#ffffff` ×8 | `#666` ×3, `#333` ×3, `#888` ×3, `#999` ×0, `#555`, `#c00` ×2, etc. | 75+ |
| QualityToggle.css | — (no Bootstrap hex; only Phase-3 placeholders) | `#333`, `#666` (literal `888` no), `#555`, `#888`, `#fafafa`, `#fff`, `#f0f0f0`, `#e5e5e5` | 16 |
| ReasoningDisclosure.css | `#4a90e2` ×1, `#f0f0f0` ×1, `#f5f5f5` ×1 | `#666` ×1, `#333` ×1, `#555`, `#e5e5e5`, `#d0d0d0`, `#e0e0e0` | 21 |

**After Wave 3 grep gate (UI-SPEC line 417):**
```
grep -iE "#(4a90e2|357abd|f0fff0|f5f5f5|f0f0f0)" frontend/src/components/{Stage1,Stage2,Stage3,Stage4,ChatInterface,QualityToggle,ReasoningDisclosure}.css
→ 0 matches
```

**Stage 3 highlight delivered (UI-SPEC line 207-211, the most visible Phase 4 change):**
```css
.stage3 {
  background: var(--color-accent-soft);   /* light: #EFD9C5  dark: #3A2A20 */
  border-left: 3px solid var(--color-accent);
  /* No more #f0fff0 (Bootstrap green). */
}
```
Plus a one-shot reveal animation (`stage3-reveal` keyframe: opacity 0→1 + translateY 8px→0 over `--motion-duration-slow`).

**Stage1Progress visual contract:**
- 3 segments: `Stage 1 · {N} modelos` / `Stage 2 · evaluating` / `Stage 3 · synthesis`.
- Per-segment `data-state="active|done|pending"`:
  - `active` = border-color `--color-accent`, dots animate `dot-pulse` 660ms staggered 0/220/440ms.
  - `done` = background `--color-accent-soft`, dots removed.
  - `pending` = bg `--color-bg-secondary`, muted text.
- Below the active segment: model-list microcopy line `gpt-5.1 · claude-opus-4.7 · gemini-3.1-pro` (only visible during stage1) — solves F-06.
- Auto-collapse: `data-collapsed="true"` triggers `grid-template-rows: 1fr → 0fr` + `opacity: 1 → 0` + `margin: 16px 0 → 0` over `--motion-duration-slow`.
- Hidden entirely when `stage===null && !isComplete` (cold start) — avoids reserved vertical space.
- `prefers-reduced-motion` collapses dot-pulse to a static state via the global override in `index.css`.

**Welcome state locked verbatim:**
```
h1 (serif, 26px / --font-size-h1):  What do you want to think about today?

lead (serif body, fg-secondary):     Ask one question. Three models answer.
                                      They peer-review each other's work
                                      anonymously. A chairman synthesizes.

ul (sans body-small, italic, muted):
  • Should I migrate this Snowflake schema to a star model?
  • Compare strategies for handling currency conversion in pharma BI
  • Review my approach to incremental partition pruning
```

**ReasoningDisclosure accordion (CSS-only modern):**
The legacy JSX (frozen) keeps `expanded && <div className="reasoning-body">…</div>` — but the CSS now ships BOTH the existing `.reasoning-body` (still works under the conditional mount) AND the modern `grid-template-rows: 0fr → 1fr` contract under `.reasoning-disclosure__panel[data-open="true"]` for any future migration that switches to permanent mount + data-open toggle. Chevron `›` rotates 90deg via `::before { transform }` keyed on `aria-expanded="true"`.

**Stage1.jsx model-short helper + failed-tab rendering:**
- New `modelShort(modelId)` strips publisher prefix AND `:online`/`:thinking` suffix → `anthropic/claude-opus-4.7:online` becomes `claude-opus-4.7`. Fixes the previous `split('/')[1]` which left `claude-opus-4.7:online` on the tab.
- Failed responses (`resp == null` or `resp.response == null` or `resp.failed === true`) render as `.tab.tab--failed` with line-through + `var(--color-error)` (from Stage1.css) plus `⚠` glyph after the model name.

## Token set unchanged

Per Plan 04-01 contract: the token set in `:root` of `index.css` was closed at end of Wave 1. **Plan 04-03 does NOT modify `index.css`.** Where a soft tint was needed (Stage 4 critic-meta amber), an inline `rgba(140, 102, 32, 0.12)` literal is used, not a new token. This avoids cross-wave file ownership confusion (Plan 04-01 owns index.css; later waves are read-only).

## Acceptance criteria

| Criterion | Result |
|-----------|--------|
| Wave 3 grep gate (Bootstrap hex) on 7 .css | **0 matches** |
| Wave 3 grep gate (Phase-3 placeholder #666/#333/#999) on QualityToggle/ReasoningDisclosure/Stage4 | **0 matches** |
| Stage3.css contains `border-left: 3px solid var(--color-accent)` AND `var(--color-accent-soft)` | OK |
| ReasoningDisclosure.css has both `grid-template-rows: 0fr` and `grid-template-rows: 1fr` | OK |
| Stage1.css has `border-bottom: 2px solid var(--color-accent)` (active tab indicator) | OK |
| Each migrated file consumes ≥ 3 var(--*) tokens | All ≥ 16 |
| Stage1Progress keyframe `dot-pulse` + animation-delay 220ms + 440ms present | OK |
| Welcome state copy verbatim (h1 + lead + 3 examples) | OK in both no-conversation and empty-conversation paths |
| `npm --prefix frontend run build` | passes (CSS 32.50 kB / gzip 6.02 kB) |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 - Bug] modelShort() helper introduced (Stage1.jsx)**
- **Found during:** Task 3 — original `resp.model.split('/')[1]` left `:online`/`:thinking` suffix in tab labels. UI-SPEC line 241 explicitly requires the short form.
- **Fix:** Extracted to a `modelShort(modelId)` helper that strips both prefix and suffix; consistent with how MessageHeader.jsx (Phase 3) already strips both.
- **Files modified:** `frontend/src/components/Stage1.jsx`
- **Commit:** `a4e7a19`

**2. [Rule 2 - Missing critical functionality] Failed-tab rendering (Stage1.jsx)**
- **Found during:** Task 3 — UI-SPEC §Copywriting Contract line 198 requires failed-model tabs to render with strikethrough + ⚠ glyph. The plan acceptance criteria mentioned this in Task 3 read_first but the original Stage1.jsx had no failed-state branch.
- **Fix:** Added `failed` boolean evaluated per response; conditional class `tab--failed` (consumes Stage1.css token from Task 1) + `' ⚠'` suffix on the label.
- **Files modified:** `frontend/src/components/Stage1.jsx`, `frontend/src/components/Stage1.css` (token already added in Task 1)
- **Commit:** `a4e7a19`

**3. [Rule 1 - Bug] Welcome state mounted in both no-conversation and empty-conversation branches**
- **Found during:** Task 2 — the plan asked to "REPLACE the existing welcome block completely". The existing component had TWO welcome blocks (one in `if (!conversation)` early return, another in the empty `messages.length === 0` branch). Replacing only one would have left the legacy "Start a conversation / Ask a question to consult the LLM Council" copy reachable.
- **Fix:** Replaced both blocks with the same locked UI-SPEC copy (h1 + lead + 3 examples). Same `chat-interface__welcome` class; same DOM shape.
- **Commit:** `d3393c4`

**4. [Rule 1 - Bug] `isStageComplete` gates on absence of stage4 loading**
- **Found during:** Task 2 design — naive gate `lastMessage.stage3 != null` would auto-collapse the progress strip while the QR Stage 4 critic/refinement is still running. That contradicts H1-01 (visible progress) for QR queries.
- **Fix:** `isStageComplete = isAssistantTurn && lastMessage.stage3 != null && !loadingState?.stage4`. Strip stays expanded during Stage 4; collapses when the whole pipeline is settled.
- **Commit:** `d3393c4`

### Token set additions

**None.** Plan 04-01 token set remains closed (60 unique custom properties). Stage 4 amber soft tint uses inline `rgba(140,102,32,0.12)` per the plan's explicit "no new tokens in this wave" rule.

## Wave-3 close-out: VIS-01 / VIS-02 / VIS-04 status

- **VIS-01 (paleta Direction A applied):** ~80% closed. All deliberation surfaces consume terracota accent + warm bg + accent-soft. Sidebar / Modal / Menu still hold Bootstrap blue placeholders → Wave 4 (Plan 04-04) closes the remaining 20%.
- **VIS-02 (typography hierarchy on long-reading surfaces):** ~80% closed. Stage 1/2/3/4 + ChatInterface markdown surfaces use serif body, sans labels, mono for model IDs and rank columns. The `.markdown-content` block in `index.css` still has Phase-3 hex placeholders for inline code background and table borders — out of Wave 3 scope (Wave 4 cleanup).
- **VIS-04 (microinteractions):** ~85% closed. Delivered: progress strip dots (660ms staggered), accordion grid trick, Stage 3 reveal keyframe, Stage 4 spinner. Remaining for Wave 4: sidebar conversation row hover ramps, modal fade/scale, menu transition.

Wave 4 closes the last 15-20% (Sidebar / Modal / Menu / favicon SVG / ErrorBanner).

## Smoke test (manual, deferred to next session)

The plan called for an end-to-end smoke (cold start → welcome → Fast query → progress strip → Stage 3 panel terracota → reasoning accordion → reduce-motion). Not executed in this session because backend startup requires `OPENROUTER_API_KEY` env. Build passes; visual verification deferred.

## Self-Check: PASSED

**Files created exist:**
- `frontend/src/components/Stage1Progress.jsx` — FOUND
- `frontend/src/components/Stage1Progress.css` — FOUND

**Commits exist on master:**
- `ca11b11` (Task 1 — 6 .css migrations) — FOUND
- `d3393c4` (Task 2 — Stage1Progress + ChatInterface) — FOUND
- `a4e7a19` (Task 3 — Stage1.jsx helper + failed-tab) — FOUND

**Wave 3 grep gates pass:**
- Bootstrap hex on 7 .css files: 0 matches
- Phase-3 placeholder hex on QualityToggle/ReasoningDisclosure/Stage4: 0 matches
- Stage3.css has `var(--color-accent-soft)` + `border-left: 3px solid var(--color-accent)`: OK
- Stage1.css has `border-bottom: 2px solid var(--color-accent)`: OK
- ReasoningDisclosure.css has `grid-template-rows: 0fr` + `1fr`: OK
- Stage1Progress.css has `@keyframes dot-pulse` + animation-delay 220ms + 440ms: OK
- ChatInterface.jsx has `<Stage1Progress` + welcome lead literal: OK

**Build:** `npm --prefix frontend run build` passes (CSS 32.50 kB / gzip 6.02 kB).
