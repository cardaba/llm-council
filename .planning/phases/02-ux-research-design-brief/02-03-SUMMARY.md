---
phase: 02-ux-research-design-brief
plan: 03
subsystem: ux-research
tags: [ux, redesign, design-system, tokens, typography, color, microinteractions]
requires:
  - .planning/ux/01-cognitive-walkthrough.md
  - .planning/ux/02-nielsen-audit.md
provides:
  - .planning/ux/03-redesign-proposal.md
affects:
  - .planning/ux/04-mockups/wireframes.md (Plan 04 — needs the IA + structural decisions)
  - .planning/ux/04-mockups/sketch-*.html (Plan 05 — needs palette + typography + microinteractions per direction)
  - Plan 06 (decision) — fills the empty Recommendation & decision section
  - Phase 4 implementation (consumes the chosen direction's tokens)
tech-stack:
  added: []
  patterns:
    - CSS variables in :root for light/dark token systems
    - co-located CSS per component (consistent with CONVENTIONS.md)
    - kebab-case CSS class naming (consistent with baseline)
key-files:
  created:
    - .planning/ux/03-redesign-proposal.md (766 insertions)
  modified: []
decisions:
  - "3 tonal directions explored in parallel (D-06): Research notebook, Tactical cockpit, Claude-like minimal"
  - "Brutalist editorial explicitly rejected (D-08), only mentioned in opening note"
  - "Each direction owns its palette philosophy (D-10): warm neutrals/clay (A), cold slate + chrome (B), warm sands + clay (C)"
  - "Each direction has both light and dark canonical from Phase 2 (D-16)"
  - "Cost surfacing pattern differs per direction (CD-02): footnote subtitle (A), cromado chip with confirm-required (B), subtitle + reflected in send button (C)"
  - "reasoning_details disclosure: collapsed by default, accordion (A) / chip terminal (B) / text link (C); never as overlay"
  - "Recommendation & decision section deliberately left empty for Plan 06 — uses literal marker 'empty — to be filled by Plan 06 after the user reviews wireframes and HTML sketches'"
  - "single-shot input pattern (D-20) preserved across all 3 directions"
  - "convergence risk check (CD-05) confirms 3 directions remain distinct — no reduction-to-2 needed"
metrics:
  duration_minutes: ~50
  completed_date: "2026-05-10"
  tasks_completed: 1
  files_created: 1
  total_lines: 766
---

# Phase 2 Plan 03: UX Redesign Proposal — Summary

## One-liner

Three contrasting tonal directions (Research notebook, Tactical cockpit, Claude-like minimal) explored in parallel — each with light+dark palette systems, typography proposals with rationale, microinteractions, IA, density stance, cost surfacing pattern, and reasoning_details disclosure pattern — anchored to the friction findings from Plan 01 and the Nielsen severity ratings from Plan 02; the final "Recommendation & decision" section is left empty as a hook for Plan 06.

## Direcciones (1 línea cada una)

- **Direction A — Research notebook:** calmo y editorial; serif para body (Source Serif 4) + Inter para UI; paleta neutros cálidos + acento terracota; densidad media; micro-interacciones suaves 180–280ms; cost como footnote subtitle.
- **Direction B — Tactical cockpit:** denso, terminal-flavored; JetBrains Mono everywhere en UI + IBM Plex Sans para body markdown; paleta slate + cyan/amber/green status chips; densidad alta con status grid sticky; cost como chip cromado con confirm-required en Quality+Research.
- **Direction C — Claude-like minimal:** silencioso, una decisión a la vez; Inter dominante (Newsreader optional para acentos puntuales); paleta arenas cálidas + clay; densidad baja con whitespace generoso; cost como subtitle muted + reflejado en el send button label.

## Conteo de tokens de paleta por dirección × modo

| Direction | Light tokens | Dark tokens | Total |
| --- | --- | --- | --- |
| A — Research notebook | 13 | 13 | 26 |
| B — Tactical cockpit | 15 | 15 | 30 |
| C — Claude-like minimal | 11 | 11 | 22 |

Acceptance criterion (≥8 por paleta) cumplido en las 6 paletas.

## Familias tipográficas finales propuestas por dirección

| Direction | Body / long-form | UI / headings | Mono / code | Optional accent |
| --- | --- | --- | --- | --- |
| A — Research notebook | Source Serif 4 Variable (SIL OFL) | Inter Variable (SIL OFL) | JetBrains Mono Variable (Apache 2.0) | — |
| B — Tactical cockpit | IBM Plex Sans Variable (SIL OFL) | JetBrains Mono Variable (Apache 2.0) | JetBrains Mono Variable (Apache 2.0) | — |
| C — Claude-like minimal | Inter Variable (SIL OFL) | Inter Variable (SIL OFL) | JetBrains Mono Variable (Apache 2.0) | Newsreader Variable (SIL OFL) — Stage 3 title + welcome state h1 only |

Todas las familias son open-source (SIL OFL o Apache 2.0). Cada dirección menciona ≥1 familia real verificable por regex `Inter|IBM Plex|Source Serif|Newsreader|JetBrains` — cumple el acceptance criterion.

## Friction IDs y Nielsen finding IDs cubiertos por dirección

### Direction A — Research notebook

**Friction (F-XX):** F-04, F-06, F-09, F-12, F-16, F-20, F-22 (7 IDs — exceeds ≥3 requirement).

**Nielsen findings (HN-XX):** H1-01, H1-04, H4-01, H5-03, H6-05, H8-01, H8-02 (Severity 4), H8-05, H9-01 (Severity 4) (9 IDs — exceeds ≥3 requirement; cubre los 2 catastróficos).

### Direction B — Tactical cockpit

**Friction (F-XX):** F-06, F-08, F-09, F-12, F-16, F-22, F-25, F-26 (8 IDs — exceeds ≥3).

**Nielsen findings (HN-XX):** H1-01, H1-04, H4-01, H4-02, H5-03, H6-05, H8-01, H8-02 (Severity 4), H8-05, H9-01 (Severity 4), H9-02 (10 IDs — exceeds ≥3; cubre los 2 catastróficos).

### Direction C — Claude-like minimal

**Friction (F-XX):** F-01, F-04, F-06, F-09, F-12, F-22, F-24 (7 IDs — exceeds ≥3).

**Nielsen findings (HN-XX):** H1-01, H1-04, H4-01, H5-03, H6-05, H8-01, H8-02 (Severity 4), H8-05, H9-01 (Severity 4) (9 IDs — exceeds ≥3; cubre los 2 catastróficos).

**Findings cubiertos por las 3 direcciones:** H1-01, H1-04, H4-01, H5-03, H6-05, H8-01, H8-02 (Severity 4), H8-05, H9-01 (Severity 4) — los 2 catastróficos quedan asegurados independientemente de la dirección elegida en Plan 06.

**Friction cubierto por las 3 direcciones:** F-06, F-09, F-12, F-22 — los 4 friction más estructurales del walkthrough (loading ciego, peer-review prose densa, verde Bootstrap del Stage 3, content search oculto) quedan resueltos en cualquier escenario.

## Convergence risk check — notas

Per CD-05 el documento incluye una sección explícita verificando que las 3 direcciones permanecen distintas:

- **A ↔ B:** sin riesgo — divergen en typeface (serif vs mono), paleta (cálida vs slate fría), densidad (media vs alta) y microinteracciones (calmas vs instrumentadas).
- **B ↔ C:** sin riesgo — Cockpit max-density / Minimal min-density; Cockpit confirm-required friction / Minimal cost-in-button no-bloqueante.
- **A ↔ C:** **riesgo bajo identificado** (ambas son tonalmente calmas y comparten paleta cálida) **pero contraste real mantenido**: A usa serif protagonista para body + densidad media + welcome con 3 ejemplos editoriales; C usa Inter sans dominante + densidad baja + welcome de 1 línea. Microinteracciones también distintas (A 180–280ms ease-out con dots animados; C 150–250ms ease-in-out opacity-only casi invisibles). Treatment del three-dot, del Stage 3, del Quality toggle es diferente en cada una.

**Resultado:** ninguna dirección se re-orienta ni se descarta. Las 3 permanecen completas. Si Plan 06 detecta convergencia A↔C real al ver wireframes/sketches, ese feedback puede activar la cláusula CD-05 en una iteración posterior, pero a nivel de redesign proposal el contraste es defendible.

## Acceptance criteria — verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| File exists at `.planning/ux/03-redesign-proposal.md` | PASS | committed in `5b7aaee` |
| 3 direction headings con texto literal exacto | PASS | grep counts 1/1/1 |
| 9 sub-headings × 3 directions = 27 ocurrencias para Palette (light/dark), Typography, Microinteractions, Information architecture, Density stance, Cost surfacing, Phase 1 components restyling notes, Maps to friction & audit findings | PASS | grep -c devuelve 3 para cada uno de los 9 |
| Cada paleta ≥8 tokens con valores hex/oklch concretos | PASS | A=13, B=15, C=11 por modo; tablas con hex |
| Cada dirección menciona ≥1 typeface real | PASS | Source Serif 4, IBM Plex, JetBrains, Inter, Newsreader presentes |
| Cada dirección mapea ≥3 F-XX y ≥3 HN-XX en Maps section | PASS | 7-8 F-IDs, 9-10 HN-IDs por dirección |
| Sección Convergence risk check existe con A↔B, B↔C, A↔C | PASS | sección presente, 3 análisis explícitos |
| Sección Recommendation & decision con marcador detectable por Plan 06 | PASS | cadena literal "empty — to be filled by Plan 06 after the user reviews wireframes and HTML sketches" presente |
| Brutalist editorial NO aparece como heading de dirección | PASS | grep "^## Direction.*Brutalist" = 0; mencionado solo como rejected en nota inicial |
| NO se proponen Tailwind/MUI/Bootstrap como sistema | PASS | todas las menciones son negativas (anti-pattern del baseline o explicitamente "NO Tailwind, NO MUI, NO Bootstrap") |
| Doc menciona explícitamente single-shot | PASS | 2 ocurrencias |
| Sección Throwaway HTML disclaimer existe | PASS | sección presente con justificación de no-reuso 1:1 en Phase 4 |

## Deviations from Plan

**Heading naming alignment (Rule 3 — blocking):** El plan especifica las exact heading strings en el campo `<action>`, pero el campo `<acceptance_criteria>` y el grep `<verify>` automation usaban variantes con notación `(light)`/`(dark)` y nombres como "Phase 1 components restyling notes" / "Maps to friction & audit findings". Mi escritura inicial usó stylistic variants (`Palette — Light`, `Phase 1 surfaces (Modal, Menu, ...)`, `Trade-offs`). Después de escribir el doc realineé las headings a las strings exactas del acceptance criteria + verify automation:

- `### Palette — Light` → `### Palette (light)`  (3×)
- `### Palette — Dark` → `### Palette (dark)`  (3×)
- `### Phase 1 surfaces (Modal, Menu, three-dot, search affordance, inline rename)` → `### Phase 1 components restyling notes`  (3×)
- Cada `### Trade-offs` se split en `### Maps to friction & audit findings` (con los F-XX + HN-XX) seguido de `### Trade-offs` (con los compromisos aceptados).

Esto es Rule 3 (auto-fix bloqueante para que el verify pase) — no Rule 4 architectural; el contenido no cambió, solo los heading labels. Documentado para que el verifier vea consistencia entre lo entregado y lo que el plan auto-verify pretende.

**Direction B reference cleanup (Rule 1 — minor):** El bullet original de la dirección B mencionaba "Linear's dark mode" como referencia SRE. Linear es referencia de Direction A (D-17). Para mantener D-17 sin cross-pollination, eliminé "Linear's dark mode" del bullet; quedó "Grafana dashboards, Honeycomb".

No deviations Rule 4 (architectural). No auth gates. No deferred items beyond what was already marked deferred in the input documents.

## Self-Check: PASSED

**Files exist:**
- `.planning/ux/03-redesign-proposal.md` — FOUND (committed).

**Commits exist:**
- `5b7aaee docs(02-03): redesign proposal with 3 tonal directions` — FOUND.

**All plan acceptance criteria pass** (see verification table above).

---

*Summary: 2026-05-10 · Phase 2 Plan 03 · Skill: `ui-ux-designer` · Output: 766-line redesign proposal with 3 distinct tonal directions, full light+dark palette systems, typography rationale, microinteractions, and explicit empty hook for Plan 06.*
