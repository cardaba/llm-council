---
phase: 02-ux-research-design-brief
plan: 01
subsystem: ux-research
tags: [ux, cognitive-walkthrough, nielsen-polson, baseline-audit, evidence-document]
requires:
  - frontend Phase 1 surfaces (Modal, Menu, three-dot, inline rename, progressive search) shipped on master
provides:
  - .planning/ux/01-cognitive-walkthrough.md as evidence input for Plan 02 (Nielsen audit) and Plan 03 (redesign proposal)
affects:
  - .planning/ux/ (new artefact directory)
tech-stack:
  added: []
  patterns:
    - cognitive-walkthrough Nielsen-Polson 4-question method
key-files:
  created:
    - .planning/ux/01-cognitive-walkthrough.md
  modified: []
decisions:
  - Severity hint scale (low/med/high) is indicative only — Plan 02 re-scores with Nielsen 0–4 official scale
  - Friction Index numbered globally (F-01..F-29) without per-flow restart so Plan 02 / Plan 03 can grep stable IDs
  - Headings forced to English (Flow 1, Step N, Friction F-XX, Q1..Q4) for grep stability per plan constraint
metrics:
  duration_minutes: ~25
  completed_date: 2026-05-10
  friction_total: 29
  friction_high: 3
  friction_med: 13
  friction_low: 13
  components_referenced: 52
---

# Phase 2 Plan 01: Cognitive Walkthrough Summary

**One-liner:** Walkthrough cognitivo end-to-end de los 4 flujos del UI baseline tras Phase 1 (cold start, ask+review, manage conversations, attachments) usando Nielsen-Polson 4 preguntas por paso, produciendo 29 friction points con evidencia citable componente+línea — insumo para el Nielsen audit de Plan 02 y la redesign proposal de Plan 03.

## Output

Single artefact: `.planning/ux/01-cognitive-walkthrough.md` (383 líneas, 1 commit).

Sections delivered:

- Actor profile (single-user, perfil BI/data, sin onboarding).
- Method (las 4 preguntas Nielsen-Polson + convención de etiquetado F-XX + severity hint).
- Flow 1: Cold start (3 steps, 4 friction points F-01..F-04).
- Flow 2: Ask + review (6 steps, 9 friction points F-05..F-13).
- Flow 3: Manage conversations (6 steps, 11 friction points F-14..F-24).
- Flow 4: Attachments (4 steps, 5 friction points F-25..F-29).
- Friction Index (tabla canónica con 29 entradas: ID, flow, step, severity hint, componente/línea, descripción una línea).

## Friction count per flow

| Flow                       | Friction count | F-IDs              |
| -------------------------- | -------------- | ------------------ |
| Flow 1: Cold start         | 4              | F-01, F-02, F-03, F-04 |
| Flow 2: Ask + review       | 9              | F-05..F-13         |
| Flow 3: Manage conversations | 11           | F-14..F-24         |
| Flow 4: Attachments        | 5              | F-25..F-29         |
| **Total**                  | **29**         |                    |

Cada flujo cumple el mínimo de ≥2 friction points (objetivo del plan).

## Top 3 friction points (severity hint = high)

1. **F-06 (Flow 2 Step 2)** — Loading indicators no comunican duración esperada ni qué modelos están corriendo.
   - Evidencia: `frontend/src/components/ChatInterface.jsx:170-172`.
   - Impacto: 15-30s de espera ciega es justo el umbral en que el usuario duda si la app está rota; afecta el Core Value "Quality dial works as advertised at every level" del PROJECT.md.

2. **F-09 (Flow 2 Step 4)** — Concepto "anonymized peer review with de-anonymization" se explica con prosa densa, no visualización.
   - Evidencia: `frontend/src/components/Stage2.jsx:29-32`.
   - Impacto: Es el feature diferencial del producto. Si el usuario no lo entiende, el "council" se reduce mentalmente a "3 chats con resumen" y se pierde el valor anti-favoritism.

3. **F-25 (Flow 4 Step 1)** — Input file nativo del browser sin estilizar — affordance fuera del lenguaje visual de la app.
   - Evidencia: `frontend/src/components/ChatInterface.jsx:246-254`.
   - Impacto: El attachment system soporta 23 extensiones específicas pero usa el botón nativo "Choose Files" del browser; rompe la cohesión visual y reduce la descubribilidad del feature.

## Componentes con mayor concentración de friction (input para Plan 03)

| Componente                                    | Friction count | F-IDs                                            |
| --------------------------------------------- | -------------- | ------------------------------------------------ |
| `frontend/src/components/Sidebar.jsx`         | 9              | F-02, F-14, F-15, F-16, F-18, F-20, F-22, F-23, F-24 |
| `frontend/src/components/ChatInterface.jsx`   | 9              | F-01, F-03, F-04, F-05, F-06, F-13, F-25, F-26, F-27, F-29 |
| `frontend/src/components/Stage2.jsx`          | 3              | F-09, F-10, F-11                                 |
| `frontend/src/components/Stage1.jsx`          | 2              | F-07, F-08                                       |
| `frontend/src/components/Stage3.{jsx,css}`    | 2              | F-12, F-13                                       |
| `frontend/src/components/Menu.jsx`            | 1              | F-17                                             |
| `frontend/src/App.jsx`                        | 2              | F-19, F-21                                       |
| `frontend/src/utils/download.js`              | 1              | F-28                                             |

**Insight para Plan 03:** Sidebar y ChatInterface concentran el 62% de los friction points (18/29). Stage 2 con 3 friction points concentra los más severos (F-09 high — el corazón conceptual del producto). El redesign proposal debe priorizar: (a) sidebar IA + descubribilidad (F-15, F-16, F-22), (b) loading communication entre stages (F-06), (c) framing visual del peer-review (F-09, F-11), (d) attachment system end-to-end (F-25, F-26, F-28).

## Deviations from Plan

None — plan ejecutado exactamente como escrito. El producto entregado supera el mínimo (29 friction vs. 12 requeridos; 52 referencias a componente vs. 8 requeridas) sin cambios al alcance.

## Acceptance Criteria — verification

| Criterio                                                                              | Estado |
| ------------------------------------------------------------------------------------- | ------ |
| El archivo `.planning/ux/01-cognitive-walkthrough.md` existe.                         | PASS   |
| 4 headings `## Flow [1-4]: ...` exactos.                                              | PASS (4) |
| Sección `## Method` enumera Q1..Q4.                                                   | PASS   |
| Sección `## Friction Index` al final.                                                 | PASS   |
| ≥ 12 friction points marcados `**Friction F-XX:**`.                                   | PASS (29) |
| Cada flujo ≥ 2 friction points propios.                                               | PASS (4 / 9 / 11 / 5) |
| ≥ 8 friction points citan componente concreto `frontend/src/components/.*\.jsx`.      | PASS (52 referencias en total) |
| Flow 3 menciona explícitamente `Sidebar.jsx`, `Modal.jsx`, `Menu.jsx`.                | PASS   |
| Flow 4 menciona los límites "500KB" o "2MB".                                          | PASS (9 menciones) |
| El doc NO propone soluciones concretas de redesign.                                   | PASS (cada friction tiene "Implication" como dirección genérica, no solución) |
| El doc NO menciona Quality toggle ni reasoning_details como friction propios.         | PASS (deliberadamente excluidos — son anticipatory findings de Plan 02) |

Plan automated verify command: `VERIFY PASS`.

## Self-Check: PASSED

- File exists: `C:/GIT/llm-council/.claude/worktrees/agent-a4778cd64cc05482f/.planning/ux/01-cognitive-walkthrough.md` — verified via Bash test -f.
- Commit `a631db8` exists — verified via `git rev-parse --short HEAD`.
- Verification command from plan returns 0 — confirmed `VERIFY PASS`.
- No unintended deletions — confirmed via `git diff --diff-filter=D HEAD~1 HEAD`.
