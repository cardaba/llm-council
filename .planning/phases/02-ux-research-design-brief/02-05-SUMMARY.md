---
phase: 02-ux-research-design-brief
plan: 05
subsystem: ux
tags: [ux, mockups, html, throwaway, light-dark, design-tokens]
requires:
  - .planning/ux/03-redesign-proposal.md
provides:
  - .planning/ux/04-mockups/sketch-notebook.html
  - .planning/ux/04-mockups/sketch-cockpit.html
  - .planning/ux/04-mockups/sketch-minimal.html
affects:
  - .planning/phases/02-ux-research-design-brief/02-06-PLAN.md (consumer — direction selection)
tech_stack_added: []
patterns:
  - HTML throwaway sketches (D-15) — visual contract, NOT production source
  - data-theme attribute toggle (D-14, D-16) light + dark canonical
  - per-direction cost surfacing (CD-02) materialized in three distinct treatments
key_files_created:
  - .planning/ux/04-mockups/sketch-notebook.html
  - .planning/ux/04-mockups/sketch-cockpit.html
  - .planning/ux/04-mockups/sketch-minimal.html
key_files_modified: []
decisions:
  - 'Default theme per sketch: cockpit defaults to data-theme="dark" (its natural habitat per Plan 03 § Direction B trade-offs); notebook and minimal default to light. Toggle is functional in all three.'
  - 'Font loading strategy: declared font-family stacks with system-ui fallbacks instead of @font-face / Google Fonts CDN. Phase 4 will load the real families. Documented inline as a comment in each sketch.'
  - 'Cost surfacing per direction (CD-02) materialized verbatim from Plan 03: Notebook footnote subtitle, Cockpit chrome chip with tabular nums + confirm-required + send button cost echo, Minimal subtle subtitle + send button cost echo without confirm-required.'
metrics:
  duration_minutes: ~30
  completed_date: 2026-05-10
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 02 Plan 05: HTML Throwaway Sketches Summary

Three one-page HTML sketches (one per tonal direction) materializing Plan 03's three design directions as tangible visual contracts. Each is self-contained, ships with a runtime light/dark toggle, and is explicitly marked throwaway so Phase 4 will not lift CSS verbatim.

## What was built

### `sketch-notebook.html` — Direction A: Research notebook

- **Default theme:** light (calm warm paper).
- **Palette:** warm neutrals `#FAF8F4 / #2A2724` light, `#1C1A17 / #EFEAE2` dark; single terracota accent `#B05A2A` (light) / `#E08A4F` (dark).
- **Typography stack:** Source Serif 4 (body, headings, Stage titles) + Inter (UI, sidebar, labels) + JetBrains Mono (code, model IDs). Stacks include system fallbacks.
- **Density:** medium. Sidebar 280px shows title + meta. Main panel max-width 65ch.
- **Cost surfacing:** footnote subtitle under each Quality option (`~$0.001 typical` / `~$0.05 typical` / `~$0.45 typical · web search`). No chip, no chrome.
- **Microinteractions implemented (17 transition/animation declarations):**
  1. Hover fade on sidebar items + buttons (180ms ease-out, accent-soft tint).
  2. Stage progress strip with three segments + animated progress dots (1100ms cycle).
  3. Quality option hover (160ms) with inset accent border on hover/selected.
  4. Reasoning disclosure accordion with chevron rotation 90° + max-height transition (220ms cubic-bezier).
  5. Theme toggle border + background fade (180ms).
  6. Stage tabs underline accent on active.
- **Stage 3:** `--color-accent-soft` background + 3px `--color-accent` border-left + serif h2 (replaces Phase 1 Bootstrap `#f0fff0` green per F-12).

### `sketch-cockpit.html` — Direction B: Tactical cockpit

- **Default theme:** dark (Raycast-flavored natural habitat — explicit Plan 03 trade-off note).
- **Palette:** slate cool `#F5F6F8 / #0F1419` light, `#0B0E14 / #E8EAEF` dark; cyan accent `#0090C9` light / `#22C7F0` dark; instrument slabs `#1A1F2A / #1F2630`. Status colors: amber (active), green (done), red (failed).
- **Typography stack:** JetBrains Mono (UI everywhere — sidebar, tabs, headers, status grid) + IBM Plex Sans (body markdown, max-width 72ch). Stage titles uppercase tracking 0.10em.
- **Density:** high. Sidebar 260px with title + meta + status dot per item. Status grid sticky (3 instrument cards × 56px tall) with elapsed time tabular nums + status pulse animation.
- **Cost surfacing:** chrome chip with prominent number (`~$0.001` / `~$0.05` / `~$0.45`) inside each Quality option card. Quality+Research option carries `⚠ confirm required` state; send button echoes cost (`SEND · ~$0.45`). H5-03 friction explicit.
- **Microinteractions implemented (16 transition/animation declarations):**
  1. Hover on sidebar items: 100ms fade + accent border-left slide-in.
  2. Status-dot pulse (`cockpit-pulse` keyframes, 1200ms cycle, opacity + box-shadow glow).
  3. Quality option hover with cyan glow (border + inset shadow, 120ms).
  4. Reasoning chip → reasoning panel with amber border-left and uppercase metadata header.
  5. Send button hover with cyan glow box-shadow.
  6. Theme toggle hover with accent-bright border + inset glow.
- **Stage 3:** border-top 2px accent + uppercase chip `[ FINAL · CHAIRMAN: gemini-2.5-pro ]`.

### `sketch-minimal.html` — Direction C: Claude-like minimal

- **Default theme:** light (anthropic.com-aligned warm sand).
- **Palette:** warm sands `#FBFAF8 / #1A1815` light, `#1A1815 / #F0EDE7` dark; clay accent `#C7551E` (light) / `#E07A3F` (dark). Reduced palette (~11 tokens vs 12-13 in A/B) — deliberate austerity.
- **Typography stack:** Inter as protagonist (UI + body, 16px line-height 1.6, max-width 62ch) + Newsreader serif italic ONLY on Stage 3 "Final answer" title (single accent). JetBrains Mono for code only.
- **Density:** low. Sidebar 240px shows title only; meta `2h ago` revealed on hover. No status dots. Generous main-panel padding `clamp(48px, 8vw, 120px)`.
- **Cost surfacing:** subtle subtitle under each Quality option label (`~$0.001 typical` / `~$0.05 typical` / `~$0.45 typical`). No chip, no chrome. Send button echoes cost (`Send · ~$0.45`) — friction visible, not blocking. NO confirm-required.
- **Microinteractions implemented (19 transition/animation declarations):**
  1. Sidebar item hover background (200ms ease-in-out, accent-soft).
  2. Conversation meta opacity fade-in on hover (200ms).
  3. Reasoning text-link with fade-in body (220ms opacity + max-height).
  4. Thin progress line (2px) with `transform: scaleX()` 280ms ease-out.
  5. Progress phrase opacity transition (180ms).
  6. Theme toggle and search input border fades (250ms).
  7. Quality option background + cost-hint color intensification on hover/selected.
- **Stage 3:** hairline 1px border-top `--color-accent-soft` + Newsreader serif italic title "Final answer" — no fill, no chip. Most austere treatment of the three.

## Common compliance checklist (all 3 sketches)

| Check | sketch-notebook | sketch-cockpit | sketch-minimal |
|---|---|---|---|
| `data-theme="light"` defined in CSS | OK | OK | OK |
| `data-theme="dark"` defined in CSS | OK | OK | OK |
| Theme toggle visible in `position: fixed` | OK | OK | OK |
| `THROWAWAY` disclaimer in HTML comment + footer | OK | OK | OK |
| Stage 1 / Stage 2 / Stage 3 sections present | OK | OK | OK |
| `Show reasoning` disclosure visible | OK | OK | OK |
| Cost matches `~$0.XX` pattern | OK (3 occurrences) | OK (4 occurrences inc. send) | OK (4 occurrences inc. send) |
| `transition:` / `animation:` count >= 4 | 17 | 16 | 19 |
| Self-contained (no external `<link>` or `<script src>`) | OK | OK | OK |
| Stage 1 tabs (4 models) + reasoning disclosure | OK | OK | OK |
| Stage 2 de-anonymization (label → model) + aggregate rankings | OK | OK | OK |
| Stage 3 synthesis + download affordance | OK | OK | OK |
| Three-dot menu popover (Rename / Delete / shortcuts) | OK (active row) | OK (all rows + Duplicate) | OK (active row) |
| File size < 200KB | 35.9 KB | 39.2 KB | 29.5 KB |

## Cross-direction visual contrast verification (CD-05 convergence check)

The Plan 03 convergence-risk-check flagged A↔C as "low risk but present" — both are calm and share warm palette. The sketches confirm the divergence is real:

- **A vs C — typography decision is the strongest divergence point.** Notebook leads with Source Serif 4 protagonist (17px body, line-height 1.65); Minimal leads with Inter sans (16px body, line-height 1.6) and uses Newsreader serif italic only on a single Stage 3 title. Open the two side by side and the body-text feel diverges immediately.
- **A vs C — density divergence.** Notebook sidebar shows title + count + last-activity; Minimal shows title only with meta on hover. Notebook has structured stage cards with backgrounds; Minimal has ungrounded stages flowing through whitespace.
- **A vs C — Stage 3 treatment.** Notebook fills with `--color-accent-soft` background + 3px border-left; Minimal applies a 1px hairline border-top `--color-accent-soft` and an italic serif title. The two Stage 3 surfaces feel categorically different.
- **B is unmistakably distinct from both.** Mono UI everywhere + status grid sticky + chrome cost chips + dark-first stance — there is no risk of B converging with A or C in the user's perception.

**Conclusion:** the three sketches stay in three corners of the design space. Plan 06 will be a real choice, not a tie-break.

## Deviations from Plan

**None.** Plan executed exactly as written. All acceptance criteria from each task's `<verify>` block satisfied. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural questions arose.

## Notes on the materialization

- **Wireframes file referenced in plan does not exist.** The plan's `<read_first>` mentioned `.planning/ux/04-mockups/wireframes.md` as the source of structural truth, but that file is not present in the repo (the `04-mockups/` directory was created by this plan). The Plan 03 § Direction X "Information architecture" sections, plus the wireframe ASCII diagrams embedded inside Plan 03 itself, served as the canonical structural reference. This is documented in each sketch's header comment so Phase 4 readers know the canonical wireframe source upgraded mid-execution.
- **Default-theme choice per sketch.** Notebook and Minimal default to `data-theme="light"`; Cockpit defaults to `data-theme="dark"` because Plan 03 § Direction B explicitly trades off "light mode is less natural in this direction — the dirección is claramente dark-first; light mode es funcional pero la identidad real vive en dark." Defaulting to dark on first paint is the truthful presentation of B; the toggle still surfaces light for parity testing.
- **No contrast issues discovered.** All three palettes shipped with the contrast ratios documented in Plan 03; no token had to be retroactively adjusted during implementation.
- **No additional Phase 4 implementation hints emerged.** Sketches behaved as documented in Plan 03 — no surprise on, e.g., the reasoning disclosure UX feeling wrong, or the cockpit chip cost feeling under-prominent. The proposal was concrete enough that materialization was mechanical.

## Threat surface scan

N/A — pure throwaway HTML in `.planning/ux/04-mockups/`. No runtime, no endpoints, no data input processing beyond a `data-theme` attribute toggle. Plan 05 frontmatter `<threat_model>` already documented this exclusion.

## Self-Check: PASSED

Files exist:
- `.planning/ux/04-mockups/sketch-notebook.html` — FOUND
- `.planning/ux/04-mockups/sketch-cockpit.html` — FOUND
- `.planning/ux/04-mockups/sketch-minimal.html` — FOUND

Commits exist:
- `5047148` (sketch-notebook) — verified via git log
- `b84c869` (sketch-cockpit) — verified via git log
- `317041d` (sketch-minimal) — verified via git log

Acceptance verifications: all three sketches pass each `<verify>` block (data-theme light + dark, throwaway disclaimer, Stage 1/2/3, ~$0.XX cost, Show reasoning, ≥4 transitions/animations).
