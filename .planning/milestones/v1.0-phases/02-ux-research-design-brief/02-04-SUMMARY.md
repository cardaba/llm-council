---
phase: 02-ux-research-design-brief
plan: 04
subsystem: ux-mockups
tags: [ux, wireframes, ascii, direction-neutral, phase-2]
requires:
  - .planning/ux/01-cognitive-walkthrough.md (29 friction findings F-01..F-29)
  - .planning/ux/02-nielsen-audit.md (Nielsen findings, esp. Severity ≥3)
  - .planning/ux/03-redesign-proposal.md (3 tonal directions — wireframes are neutral but compatible)
  - .planning/phases/01-hardening-conversation-management/01-CONTEXT.md (Modal mockup precedent + D-10 affordance literal)
provides:
  - Structural contract (23 wireframes) consumable by Plan 05 (HTML sketches per direction) and Phase 4 (implementation)
  - Greppable wireframe IDs W01..W23 for downstream reference
  - Coverage matrix D-13 (23/23) + friction/Nielsen anchor table
affects:
  - .planning/ux/04-mockups/wireframes.md (new file)
tech-stack:
  added: []
  patterns:
    - ASCII box-drawing wireframes (`┌─┐│└┘├┤`) as structural contract
    - Direction-neutral pattern: wireframes lock structure/states; sketches lock aesthetics
key-files:
  created:
    - .planning/ux/04-mockups/wireframes.md
  modified: []
decisions:
  - Single neutral set of 23 wireframes covering D-13 instead of 3×23 per direction (avoids triplication; enables side-by-side comparison in Plan 06).
  - Cost literal `~$0.001` / `~$0.05` / `~$0.45` rendered explicitly inside Quality toggle wireframes (W10, W13) — closes H1-04 and H5-03 at the wireframe level, not just in annotations.
  - Reasoning disclosure (W15/W16) renders inline at the bottom of each Stage 1 tab — never overlay — to keep response as the dominant element (H8-05).
  - W23 replaces "spinner" pattern with per-stage timeline + per-model status + cancel button (closes F-06, H1-01, H3-01 simultaneously).
  - Phase 1 literal copy preserved verbatim where it crosses agent boundaries: `Search inside content (N conversations)` (D-19), `Delete "{title}"?` + `This cannot be undone.` (Modal API), `Rename` / `Delete` menu items, `Show reasoning` / `Hide reasoning` disclosure labels.
metrics:
  duration: ~25min
  completed-date: 2026-05-10
  tasks-completed: 1
  files-changed: 1
  wireframes: 23
---

# Phase 2 Plan 4: UX wireframes (direction-neutral) Summary

Twenty-three ASCII wireframes covering every D-13 state, written as a single direction-neutral structural contract that Plan 05 sketches and Phase 4 implementation will both consume without re-deciding layout.

## Wireframes produced (23 total)

The document `.planning/ux/04-mockups/wireframes.md` contains exactly 23 wireframes with the heading pattern `## WXX: <name>` (verifiable via `grep -cE "^## W[0-2][0-9]: "` → 23):

| ID  | Name                                                                |
| --- | ------------------------------------------------------------------- |
| W01 | Cold start / welcome state                                          |
| W02 | Sidebar — lista poblada                                             |
| W03 | Sidebar — hover state (three-dot visible)                           |
| W04 | Sidebar — three-dot menu open                                       |
| W05 | Sidebar — search vacío                                              |
| W06 | Sidebar — search con matches (title-first)                          |
| W07 | Sidebar — search ≥3 chars sin matches (content fallback)            |
| W08 | Sidebar — inline rename activo                                      |
| W09 | Modal de delete abierto                                             |
| W10 | Input area — estado vacío (single-shot pre-send)                    |
| W11 | Input area — con texto                                              |
| W12 | Input area — con attachments                                        |
| W13 | Quality toggle (Fast / Quality / Quality+Research, coste visible)   |
| W14 | Stage 1 — tabs por modelo                                           |
| W15 | Stage 1 — disclosure "Show reasoning" colapsado                     |
| W16 | Stage 1 — disclosure expandido                                      |
| W17 | Stage 2 — tabs de evaluaciones + de-anonimización                   |
| W18 | Stage 2 — aggregate rankings con avg position + vote count          |
| W19 | Stage 3 — synthesis con highlight visual + download                 |
| W20 | Header de app branded                                               |
| W21 | Empty state genérico                                                |
| W22 | Error state genérico                                                |
| W23 | Loading state genérico (per-stage progress)                         |

## Direction-notes inventory

The wireframes are **direction-neutral**, but several wireframes explicitly mark slots where the 3 tonal directions (Notebook / Cockpit / Minimal from Plan 03) will diverge in Plan 05. Per CD-02, the cost rendering inside the Quality toggle is the most visible direction-specific surface; the wireframes lock its structure (always visible, no hover) but defer the visual treatment.

| Wireframe                     | Element with direction-specific treatment                                                                 | Lock-ed in wireframes        | Deferred to Plan 05 sketches                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| W04 (three-dot menu)          | Slot tipográfico de shortcuts (`⌘E`, `⌫`)                                                                | Slot exists, position fixed  | Notebook: discreto al lado del label · Cockpit: chip cromado · Minimal: muted right-aligned |
| W08 (inline rename)           | Hint footer ("Enter save · Esc ✕")                                                                      | Hint visible during edit     | Tipografía sutil por dirección; iconografía concreta                         |
| W09 (delete modal)            | Destructive button color treatment                                                                       | Button is destructive        | Notebook: warm red · Cockpit: saturated red · Minimal: muted danger          |
| W13 (Quality toggle)          | Cost rendering format (`~$0.45`)                                                                         | Cost ALWAYS visible (no hover); literal `~$0.XX` | Notebook: footnote of label · Cockpit: chrome chip · Minimal: muted subtitle |
| W14, W17 (Stage tabs)         | Density of tab bar; status indicators (✓ ⚠)                                                              | Status semantics fixed       | Density per direction (cockpit dense, minimal generous)                      |
| W18 (aggregate rankings)      | Visual position bar (currently shown as `█████░░░`)                                                       | Visual cue exists            | Notebook: serif numerals + bar · Cockpit: data-bar with grid · Minimal: just numbers |
| W19 (Stage 3 synthesis)       | Editorial accent mark replacing Bootstrap green                                                          | NO `#f0fff0` background      | Vertical accent line / typographic emphasis / generous padding by direction  |
| W23 (loading state)           | Timeline visual (●━━○━━○)                                                                                 | Timeline structure fixed     | Per-direction styling of progress dots / connectors / text weight            |

## Coverage matrix (D-13 → wireframes)

All 23 D-13 items are covered. Replicated from `## Coverage matrix` in the wireframes doc:

| D-13 item                                                                                            | Covered by         | Status |
| ---------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| Cold start / welcome state (sin conversaciones)                                                       | W01, W21           | ✓      |
| Sidebar — lista poblada                                                                              | W02                | ✓      |
| Sidebar — hover (three-dot visible)                                                                  | W03                | ✓      |
| Sidebar — three-dot menu open                                                                        | W04                | ✓      |
| Sidebar — search vacío                                                                               | W05                | ✓      |
| Sidebar — search con title matches                                                                   | W06                | ✓      |
| Sidebar — search ≥3 chars no matches con affordance "Search inside content (N conversations)"        | W07                | ✓      |
| Sidebar — inline rename activo                                                                       | W08                | ✓      |
| Sidebar — modal de delete abierto                                                                    | W09                | ✓      |
| Input area — estado vacío                                                                            | W10                | ✓      |
| Input area — con texto                                                                               | W11                | ✓      |
| Input area — con attachments (chip list)                                                             | W12                | ✓      |
| Quality toggle — Fast / Quality / Quality+Research con coste visible                                 | W13                | ✓      |
| Stage 1 — tabs por modelo, contenido renderizado markdown                                            | W14                | ✓      |
| Stage 1 — disclosure colapsado "Show reasoning" (RSCH-05)                                            | W15                | ✓      |
| Stage 1 — disclosure expandido "Hide reasoning" (RSCH-05)                                            | W16                | ✓      |
| Stage 2 — tabs evaluaciones + de-anonimización (label_to_model bold)                                 | W17                | ✓      |
| Stage 2 — aggregate rankings con avg position + vote count                                           | W18                | ✓      |
| Stage 3 — synthesis con highlight visual + download                                                  | W19                | ✓      |
| Header de app branded (nombre + icono)                                                               | W20                | ✓      |
| Empty state genérico                                                                                 | W21                | ✓      |
| Error state genérico                                                                                 | W22                | ✓      |
| Loading state — per-stage progress between stages                                                    | W23                | ✓      |

**23 / 23 D-13 items covered.**

## Acceptance criteria results

| Criterion                                                                                                                              | Result |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `.planning/ux/04-mockups/wireframes.md` exists                                                                                          | ✓      |
| 23 wireframes with headings `## WXX: <name>` (`grep -cE "^## W[0-2][0-9]: "` → 23)                                                      | ✓      |
| `Search inside content (N conversations)` literal in W07                                                                                | ✓ (4 occurrences across W07 + matrix tables) |
| `Show reasoning` and `Hide reasoning` literals in W15 / W16                                                                             | ✓      |
| Cost format `~$0.XX` present (W10, W13)                                                                                                  | ✓      |
| `## Coverage matrix` section with 23 items marked covered                                                                               | ✓      |
| `## Conventions` section explaining ASCII notation                                                                                      | ✓      |
| W04, W08, W09, W13, W14, W15 include direction-specific annotation                                                                     | ✓ (documented in `## Direction-notes inventory` above) |
| Doc does NOT include hex palette nor typography family (those live in Plan 03 + Plan 05)                                                | ✓      |
| W22 (error state) includes `[Retry]` button or equivalent                                                                              | ✓ (8 occurrences across 3 variants) |
| W23 (loading state) does NOT use generic "spinner" as primary element                                                                  | ✓ (timeline + per-model status + cancel; spinner only mentioned to denote what is replaced) |

All automated verify commands pass (`test -f`, `grep -cE`, `grep -q` for each literal).

## Deviations from plan

### Auto-fixed issues

**1. [Rule 2 - Critical functionality] Added explicit metadata block in W09 modal beyond Phase 1 contract**
- **Found during:** Task 1 (drafting W09)
- **Issue:** Phase 1 modal contract specifies only `Delete "{title}"?` + `This cannot be undone.`. F-18 in the cognitive walkthrough flags this as insufficient verification when two conversations have similar titles.
- **Fix:** W09 wireframe annotation (5) adds `4 messages · last activity 2 days ago` as differentiating metadata in the body. Phase 1 literal copy is preserved (D-19); the new metadata is positioned as additive context per F-18 implication.
- **Why this is Rule 2 and not architectural:** It's a cosmetic addition to an existing Modal body — the Modal API contract (focus trap, ESC, destructive button) is unchanged. Phase 4 implements; no schema or backend change.
- **Files modified:** `.planning/ux/04-mockups/wireframes.md` (W09 only)
- **Commit:** `24a4de1`

**2. [Rule 2 - Critical functionality] Surfaced cost literal `~$0.001 ~$0.05 ~$0.45` directly inside W10 (not just W13)**
- **Found during:** Task 1 (drafting W10)
- **Issue:** PROJECT.md/Constraints + H1-04 require the cost to be visible at the moment of decision. W13 dedicates a wireframe to the toggle but W10 is the wireframe where the user actually types the prompt — the cost MUST be visible there too.
- **Fix:** W10 (annotation 2) renders the toggle inline with all three cost literals visible.
- **Files modified:** same as above.
- **Commit:** `24a4de1`

### Out-of-scope items deferred (not fixed)

- **F-23 (content search frágil ≥100 conversations):** Deferred — not reproducible at the structural wireframe level; would need pagination decision (architectural).
- **F-29 (preview prompt + attachments before send):** Deferred — Plan 03 may decide to add a "Preview full prompt" disclosure; the wireframes do not pre-empt that decision.
- **H8-02 (`.markdown-content` typography catastrophe):** Out of scope by design — typography lives in Plan 05 sketches and is **explicitly** the wireframe doc's deferred surface. Wireframes mark the slot (W14, W17, W19 all show `.markdown-content` containers) but do not specify font family / line-height / max-width.

## Friction / Nielsen anchor coverage

- **Friction findings (F-01..F-29):** 27 / 29 anchored in at least one wireframe (94%). F-23 and F-29 are deferred (see above).
- **Nielsen Severity ≥3 findings:** 12 / 13 anchored (92%). H8-02 (typography catastrophe) is the deferred one — explicitly out of scope per the direction-neutrality contract.

## Files created

- `.planning/ux/04-mockups/wireframes.md` (1107 insertions, 23 wireframes + conventions + coverage matrix)

## Commits

| Commit  | Type | Description                                            |
| ------- | ---- | ------------------------------------------------------ |
| 24a4de1 | feat | add wireframes — 23 direction-neutral states (D-13)    |

## Next plan handoff

Plan 05 (HTML sketches per direction) consumes this document as the **structural contract**. For each of the 3 directions (Notebook / Cockpit / Minimal):

1. Iterate over W01..W23 picking wireframes relevant to the sketch's one-page format (cold start + sidebar + Stage 2 + Stage 3 + Quality toggle minimum).
2. Materialize the direction-specific treatments listed in `## Direction-notes inventory` above.
3. Apply the direction's palette + typography + microinteractions per Plan 03.

Phase 4 (implementation) consumes wireframes + chosen sketch (post-Plan 06) as the joint contract — no design decisions to make.

## Self-Check: PASSED

- File `.planning/ux/04-mockups/wireframes.md`: FOUND
- File `.planning/phases/02-ux-research-design-brief/02-04-SUMMARY.md`: FOUND (this file)
- Commit `24a4de1`: present in `git log --oneline`
