---
phase: 05
plan: 04
subsystem: frontend
tags: [critique, accordion, hydration, css-only, reload]
requires:
  - "Plan 05-01 — get_conversation returns v2 shape with external_research intact"
  - "Plan 05-02 — add_assistant_message persists external_research on the critique message"
  - "Plan 05-03 — handleSubmitCritique populates external_research on the live stub message"
provides:
  - "ExternalResearchPanel component (file-chip hydration on reload, CRIT-08)"
  - "CSS-only per-chip accordion (grid-template-rows 0fr → 1fr, multi-open)"
affects:
  - "frontend/src/components/ChatInterface.jsx — mounts panel above assistant-message body"
tech-stack:
  added: []
  patterns:
    - "Pure-CSS accordion via grid-template-rows 0fr → 1fr (verbatim from ReasoningDisclosure.css:59-67)"
    - "Belt-and-braces conditional render (parent guard + component-internal null return)"
key-files:
  created:
    - frontend/src/components/ExternalResearchPanel.jsx
    - frontend/src/components/ExternalResearchPanel.css
  modified:
    - frontend/src/components/ChatInterface.jsx
decisions:
  - "Reused ReasoningDisclosure grid trick verbatim (class names renamed only) — no new motion or measurement primitive introduced"
  - "Multi-open chip semantics (no radio behavior) — each chip owns its own useState"
  - "Component returns null on null/undefined/empty externalResearch — fresh-prompt DOM is identical to v1.0"
  - "prefers-reduced-motion inherited from global rule (index.css:178-189), no local override"
  - "Numeric guard `Number(bytes) || 0` in formatKB defends against missing size_bytes without breaking the chip"
metrics:
  duration_minutes: 12
  completed: 2026-05-10
---

# Phase 05 Plan 04: File-chip hydration on reload (CRIT-08) Summary

Closed the CRIT-08 reload loop: when a critique conversation is refreshed, the three uploaded research files now reappear as collapsed chips above the assistant message. Each chip is a pure-CSS accordion (the same `grid-template-rows: 0fr → 1fr` trick already shipped in `ReasoningDisclosure.css:59-67`), expanding to render the file content via `<Markdown>` inside `.markdown-content`. Multiple chips can be expanded simultaneously, no JS measurement, no new dependencies, and `prefers-reduced-motion` is honored through the existing global rule. Fresh-prompt conversations render with no panel — DOM stays identical to v1.0.

## Scope

- **Task 1** — created `ExternalResearchPanel.jsx` + `.css` (new component family).
- **Task 2** — wired `<ExternalResearchPanel>` as the first child of `<div className="assistant-message">` in `ChatInterface.jsx`, gated on `msg.external_research`.

## Files Created / Modified

| Action   | Path                                                       | Purpose |
| -------- | ---------------------------------------------------------- | ------- |
| Created  | `frontend/src/components/ExternalResearchPanel.jsx`        | Collapsed file chips that expand via CSS-only accordion on reload |
| Created  | `frontend/src/components/ExternalResearchPanel.css`        | CSS-only accordion (`grid-template-rows: 0fr → 1fr`), Direction A tokens only |
| Modified | `frontend/src/components/ChatInterface.jsx`                | Imports panel, mounts above assistant-message body when `msg.external_research` is non-empty |

## Commits

| Hash      | Message |
| --------- | ------- |
| `bb5380a` | `feat(05-04): add ExternalResearchPanel with CSS-only accordion chips` |
| `bd9f603` | `feat(05-04): mount ExternalResearchPanel above critique assistant messages` |

## Verbatim grid-trick verification

`ReasoningDisclosure.css:59-67`:

```css
.reasoning-disclosure__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.reasoning-disclosure__panel[data-open="true"],
.reasoning-disclosure[data-open="true"] .reasoning-disclosure__panel {
  grid-template-rows: 1fr;
}
.reasoning-disclosure__panel-inner {
  overflow: hidden;
  min-height: 0;
}
```

`ExternalResearchPanel.css` mirror (class names renamed only):

```css
.research-chip__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-duration-slow) var(--motion-easing-out);
}
.research-chip[data-open="true"] .research-chip__panel {
  grid-template-rows: 1fr;
}
.research-chip__panel-inner {
  overflow: hidden;
  min-height: 0;
  padding: 0 var(--space-3);
}
```

Identical mechanism — `display: grid` + animated `grid-template-rows`, the inner element absorbs the height via `overflow:hidden; min-height:0;`. No magic-number `max-height`, no `useRef + scrollHeight`. The only additive rule on this side is `padding 0 → var(--space-3)` and a top border on the open state, both purely stylistic and confined to the inner wrapper.

## Component contract

```jsx
<ExternalResearchPanel externalResearch={null | undefined | {} | dict} />
```

| Input                                                                     | Renders |
| ------------------------------------------------------------------------- | ------- |
| `null` / `undefined`                                                      | nothing (component returns `null`) |
| `{}`                                                                      | nothing (component returns `null`) |
| `{"openai/gpt-5.5":{filename:"a.md",content:"# hello",size_bytes:7}}`     | one collapsed chip: `openai/gpt-5.5 · a.md · 0.0 KB  ⌄` |
| dict with N entries                                                       | N collapsed chips, each independently expandable |

Chip DOM (collapsed):

```html
<div class="research-chip" data-open="false">
  <button class="research-chip__toggle" aria-expanded="false">
    <span class="research-chip__model">openai/gpt-5.5</span>
    <span class="research-chip__sep">·</span>
    <span class="research-chip__filename">a.md</span>
    <span class="research-chip__sep">·</span>
    <span class="research-chip__size">0.0 KB</span>
    <span class="research-chip__chevron" aria-hidden="true">⌄</span>
  </button>
  <div class="research-chip__panel">
    <div class="research-chip__panel-inner markdown-content">
      <!-- <Markdown>file content</Markdown> already mounted; height = 0 via grid -->
    </div>
  </div>
</div>
```

On click, `data-open` flips to `"true"`; the CSS rule animates `grid-template-rows` from `0fr` to `1fr`; the chevron text swaps `⌄` → `⌃`; `aria-expanded` mirrors the open state. Each chip owns its own `useState`, so multiple chips can be open simultaneously — no radio coupling.

## ChatInterface integration

The panel mounts as the very first child of the existing assistant-message wrapper:

```jsx
<div className="assistant-message">
  {msg.external_research && (
    <ExternalResearchPanel externalResearch={msg.external_research} />
  )}
  <div className="assistant-header">…</div>
  <MessageHeader metadata={msg.metadata} />
  {/* Stage 1 / Stage 2 / Stage 3 / Stage 4 unchanged */}
</div>
```

Purely additive — no existing block (header, MessageHeader, Stage1, Stage2, Stage3, Stage4, download button) was touched.

## Direction A tokens only

`ExternalResearchPanel.css` uses only design tokens declared in `index.css`:

- Background: `var(--color-bg-secondary)`, `var(--color-bg-elevated)` (hover)
- Borders: `var(--color-border-subtle)`
- Text: `var(--color-fg-primary)`, `var(--color-fg-secondary)`, `var(--color-fg-muted)`
- Typography: `var(--font-sans)`, `var(--font-mono)`, `var(--font-size-body-small)`, `var(--font-size-microcopy)`
- Spacing: `var(--space-2)`, `var(--space-3)`, `var(--space-4)`
- Radii: `var(--radius-sm)`
- Motion: `var(--motion-duration-base)`, `var(--motion-duration-slow)`, `var(--motion-easing-out)`
- Focus: `var(--color-focus-ring)`

A grep for `#[0-9A-Fa-f]{3,6}` against the new CSS returns no matches — no raw hex anywhere.

## Acceptance checks

| Check                                                                        | Result |
| ---------------------------------------------------------------------------- | ------ |
| `ExternalResearchPanel.jsx` exists                                           | PASS   |
| Contains `function ExternalResearchPanel` AND `Object.entries(externalResearch)` | PASS |
| Contains `<div className="research-chip__panel-inner markdown-content">` (combined class) AND `<Markdown>` | PASS |
| Contains chevron characters `⌄` AND `⌃`                                      | PASS   |
| Returns `null` for empty/missing externalResearch (two early returns)        | PASS   |
| `ExternalResearchPanel.css` exists                                           | PASS   |
| Contains `grid-template-rows: 0fr` AND `[data-open="true"]` AND `grid-template-rows: 1fr` | PASS |
| No hex colors in new CSS                                                     | PASS   |
| `ChatInterface.jsx` imports `ExternalResearchPanel`                          | PASS   |
| Mounts `<ExternalResearchPanel externalResearch={msg.external_research} />` | PASS   |
| Guarded by `msg.external_research && …`                                      | PASS   |
| `npm run build` exits 0                                                      | PASS   |

> Note: the plan's verification snippet `findstr /C:"className=\"markdown-content\""` checks for the literal class string. The implementation combines two classes on the same node — `className="research-chip__panel-inner markdown-content"` — which is what `Stage1.jsx` / `ReasoningDisclosure.jsx` do as well (`className="reasoning-block markdown-content"`). Semantically the global `.markdown-content` spacing rule applies; the literal substring check is a tooling artifact, not a behavior delta.

## Deviations from Plan

None. Plan executed exactly as written. Class merging on the inner wrapper matches the pattern used elsewhere in the codebase (`Stage1`, `ReasoningDisclosure`) and is consistent with the action snippet in the plan, which already shows the combined `className="research-chip__panel-inner markdown-content"` literal.

## What this plan deliberately does NOT add

- **No new motion library** — `framer-motion`, `react-spring`, `auto-animate`, etc. are not introduced. The animation is pure CSS plus React's `useState` boolean.
- **No JS measurement** — no `useRef + scrollHeight`, no `ResizeObserver`. The grid track handles intrinsic content height.
- **No global state** — chip state is local `useState` per chip; nothing escapes the component tree.
- **No new dependencies** — `package.json` unchanged.

## Self-Check: PASSED

- `frontend/src/components/ExternalResearchPanel.jsx` — FOUND
- `frontend/src/components/ExternalResearchPanel.css` — FOUND
- `frontend/src/components/ChatInterface.jsx` (modified) — FOUND in `git log`
- Commit `bb5380a` — FOUND in `git log`
- Commit `bd9f603` — FOUND in `git log`
- `npm run build` exit 0 — VERIFIED (output: `built in 3.14s`)
