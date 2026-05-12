# Phase 6: Persistence completeness + Cost analytics + Settings panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 6-persistence-completeness-cost-analytics-settings-panel
**Areas discussed:** Cost display format & precision, Settings panel apply behavior, Settings panel dismiss + scrim, stage4_threshold slider UX

---

## Cost display format & precision — sub-q 1: MessageHeader cost line shape

| Option | Description | Selected |
|--------|-------------|----------|
| Upstream first, big + bold; OpenRouter discreto | upstream bold body-size + fee microcopy; hides if total=$0.00 | ✓ |
| OpenRouter first, paridad visual | both same weight, OpenRouter first chronologically | |
| Solo upstream visible; OpenRouter fee en tooltip | minimalist; fee only on hover/focus | |
| Línea separada para cada stage | "S1 $0.42 · S2 $0.58 · S3 $0.43 · Total ..." | |

**User's choice:** Upstream first, big + bold.
**Notes:** Visual hierarchy mirrors monetary hierarchy (upstream ~95% of real spend). Hide line when total=$0.00. tabular-nums for alignment.

---

## Cost display format & precision — sub-q 2: Sidebar footer layout

| Option | Description | Selected |
|--------|-------------|----------|
| Two-column: OpenRouter \| Upstream | left = capped + progress bar ≥80%, right = BYOK no cap | ✓ |
| Stacked rows con upstream prominent | mirrors MessageHeader hierarchy | |
| One-line summary minimalista | "$42.55 · $1.20 fee · 47q" | |

**User's choice:** Two-column.
**Notes:** Footer context shows cap pressure (OpenRouter cap visible); MessageHeader context shows per-message real cost. Different surfaces, different jobs — divergence intentional.

---

## Settings panel apply behavior — sub-q 1

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate apply (macOS-style) | each control writes through useSettings → localStorage → DOM same tick | ✓ (via Claude recommendation) |
| Immediate apply except stage4_threshold (which has Save) | mixed pattern with Save next to threshold slider | |
| Save/Cancel buttons al fondo del panel | all controls are local state; bottom buttons commit | |

**User's choice:** "seguiré tu consejo" → Immediate apply.
**Claude rationale:** Mirrors v1.0 useTheme pattern (already immediate); Direction A "calmo" favors fluid feedback; stage4_threshold is non-destructive in the moment (only affects next quality_research, not in-flight); reversibility is trivial (slide back); cost preview can live in QualityToggle/Submit row instead of a gate.

---

## Settings panel dismiss + scrim — sub-q 1

| Option | Description | Selected |
|--------|-------------|----------|
| Permisivo: backdrop click + ESC + X, sin scrim oscurecido | three exit paths, no overlay darkening | ✓ (via Claude recommendation) |
| Permisivo con scrim oscurecido | three exit paths + var(--color-overlay-scrim) 0.4 darkening | |
| Solo ESC + X button (sin backdrop click) | strict; no backdrop dismiss | |

**User's choice:** "seguiré tu consejo" → Permisivo sin scrim.
**Claude rationale:** Direction A "calmo" preserves ambient reading; immediate apply means no in-flight state to protect on accidental dismiss; backdrop + ESC + X is the standard drawer convention (macOS, Slack, Discord); ESC + focus trap are WCAG a11y baseline; mobile (Phase 7 ≤768px) degrades gracefully because backdrop area disappears but ESC/X remain.

---

## stage4_threshold slider UX — sub-q 1

| Option | Description | Selected |
|--------|-------------|----------|
| Slider mínimo + valor + microcopy fijo | native range + integer label + fixed line "Higher = stricter…" | ✓ |
| Slider con tick marks + dynamic explanation | 10 visible ticks + microcopy that changes per value | |
| Numeric input + buttons (sin slider) | -/+ buttons around numeric input | |

**User's choice:** Slider mínimo.
**Notes:** Direction A "calmo" maximized. Default 8 (from PROFILES["quality_research"]).

---

## Claude's Discretion

Resolved by Claude on the user's "seguiré tu consejo" responses:
- Settings panel apply behavior → immediate apply for all 4 controls.
- Settings panel dismiss → permisivo (backdrop + ESC + X) without scrim.

Open to planner at plan-time:
- Cost decimal precision exact rules (recommend 3/3 for OpenRouter/upstream).
- Cost line hide-zero threshold (recommend < $0.001).
- Progress bar color at ≥80% (recommend var(--color-warning)).
- Panel slide-out transition timing (recommend 200ms ease-out in, 150ms exit).
- Font-size token mapping S/M/L → 15/17/19px in rem or px (either acceptable).
- Settings panel control ordering (recommend theme → font-size → density → stage4_threshold).
- OpenRouter `usage.cost` shape (REQUIRED spike in plan-1 before any aggregation code lands; STATE.md active TODO).

## Deferred Ideas

- Single-namespaced localStorage object (rejected for `useTheme` mirror consistency).
- Save/Cancel buttons.
- Scrim/overlay darkening.
- Animated cost ticker (already anti-feature AA2).
- Dynamic per-value slider microcopy (revisit if UX-testing finds confusion).
- Numeric input + buttons for stage4_threshold.
- Tick marks on slider.
- Per-conversation cost drill-down panel (v2.1+).
- Cost currency conversion (USD-only locked).
- Settings export/import.
