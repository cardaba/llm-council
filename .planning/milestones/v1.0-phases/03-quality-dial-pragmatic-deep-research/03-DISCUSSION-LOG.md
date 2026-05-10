# Phase 3: Quality Dial & Pragmatic Deep Research - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 03-quality-dial-pragmatic-deep-research
**Areas discussed:** research_strategy module API shape, Stage 4 gating mechanism, Web search model choice, Stage 4 UI placement

---

## research_strategy module API shape

### Discussion 1.1 — Thick vs Hybrid vs Thin

| Option | Description | Selected |
|--------|-------------|----------|
| Thick — strategy orquesta `quality_research` completo | Strategy expone `run(query) -> stages[]`. council.py hace `if profile == 'quality_research': return await strategy.run(...)`. Listo para RSCH-V2-01 sin refactor. | ✓ |
| Hybrid — strategy posee solo Stage 4 trigger+exec | Stages 1/2/3 viven en council.py leyendo modelos del strategy. Stage 4 (decisión + ejecución) aislado en strategy. Compromiso simple. | |
| Thin — strategy solo expone listas de modelos | council.py orquesta todo, lee modelos del strategy vía `get_council_models(profile)`. Lo más simple ahora pero RSCH-V2-01 requerirá mover código desde council.py. | |

**User's choice:** Thick — strategy orquesta `quality_research` completo.
**Notes:** Anclado a la inversión arquitectónica para que RSCH-V2-01 (fully-agentic deep research) se enchufe en el futuro sin tocar council.py.

### Discussion 1.2 — Routing scope

| Option | Description | Selected |
|--------|-------------|----------|
| Solo `quality_research` delega a strategy | council.py mantiene su orquestación actual para `fast`/`quality` (3 stages). Mínimo cambio en código existente. | ✓ |
| Los 3 profiles via strategy | council.py se convierte en dispatcher delgado. Más limpio pero requiere mover Stages 1-3 actuales también. | |

**User's choice:** Solo `quality_research` delega.
**Notes:** Reduce blast radius del cambio. council.py para fast/quality queda intocado.

---

## Stage 4 refinement gating

### Discussion 2.1 — Mecanismo (primer turno)

| Option | Description | Selected |
|--------|-------------|----------|
| Critic model (LLM-as-judge) | Modelo independiente puntúa 1-10 con rubric fija. Threshold ≥8 = skip. ~$0.05-$0.10. | ✓ (en segundo turno) |
| Council re-vote | Mismos modelos del Stage 1 puntúan synthesis. ~$0.05. Riesgo auto-confirmación. | |
| Heurística sin LLM | Reglas: longitud, citations, no hedging. Costo cero. Crudo. | |
| Always run Stage 4 | No gating. Siempre paga +$0.20-$0.50. | |

**User's choice (primer turno):** "Pero el quality research no debería ser un research previo que sirva de input a los modelos?"
**Notes:** Usuario reframed la arquitectura completa (research-first pipeline en lugar de online-per-member). Provoqué follow-up para cerrar shape arquitectónico antes de gating.

### Discussion 2.2 — Reframing arquitectónico (research-first vs REQ original)

| Option | Description | Selected |
|--------|-------------|----------|
| Stage 0 research → council reasoning sin `:online` | 1 web-search agent genera dossier; council recibe como contexto. Más coherente, más barato. | |
| Stage 0 research + 1 council member `:online` | Mezcla grounding base + búsqueda adicional. ~$0.10 extra. | |
| Mantener REQ original — cada member `:online` | 4 búsquedas paralelas duplicadas. Cumple RSCH-02 literal. Más caro. | ✓ |

**User's choice:** Mantener REQ original.
**Notes:** Usuario priorizó diversidad de búsquedas paralelas y compliance literal del REQ sobre coherence/cost-saving. Reframing registrado en deferred ideas por si el coste demuestra ser dominante en uso real.

### Discussion 2.3 — Mecanismo (segundo turno, post-reframing)

| Option | Description | Selected |
|--------|-------------|----------|
| Critic model (LLM-as-judge) | Modelo independiente con rubric. ~$0.05-$0.10. | ✓ |
| Council re-vote | Mismos del Stage 1 votan. ~$0.05. Bias. | |
| Heurística sin LLM | Reglas. Cero costo. Crudo. | |
| Always run Stage 4 | Siempre dispara. | |

**User's choice:** Critic model (LLM-as-judge).
**Notes:** Independencia genuina via modelo separado del council y del chairman.

### Discussion 2.4 — Critic config (primer turno)

| Option | Description | Selected |
|--------|-------------|----------|
| Critic = chairman, threshold ≥8 | Reusa Opus chairman. Implica Opus puntúa su propia synthesis. | |
| Critic = modelo dedicado distinto, threshold ≥8 | `claude-sonnet-4.6` como critic. ~$0.03 extra. Independencia. | (recomendación inicial) |
| Critic = council member rotado, threshold ≥7 | El primer Stage 1 model que NO sea chairman puntúa. Costo cero. | |

**User's choice (primer turno):** "que me recomeindas?"
**Notes:** Pedí recomendación. Recomendé Sonnet 4.6 + threshold ≥8 con razones de independencia y calibración.

### Discussion 2.5 — Critic pushback + recommit

**User's pushback:** "por qué optimizar el coste con esto? no es contrasentido?"
**Reframe:** Tienes razón, `Quality+Research` ya optó por la senda premium. Pellizcar $0.02 en el critic contradice la lógica del profile.

| Option | Description | Selected |
|--------|-------------|----------|
| Sonnet 4.6 — critic independiente, threshold ≥8 | Modelo distinto del chairman. ~$0.03/critic call. | |
| Opus 4.7 — misma clase que chairman, threshold ≥8 | Misma family pero invocación independiente con prompt distinto. ~$0.10/critic call. Top-tier judgment. | ✓ |
| GPT-5.5 — cross-vendor, threshold ≥8 | Cambio de proveedor para diversidad. ~$0.03. | |

**User's choice:** Opus 4.7 — misma clase que chairman, threshold ≥8.
**Notes:** Cost rationale alineado con la propuesta de valor del profile premium.

---

## Web search model choice

### Discussion 3.1 — Composición del council

| Option | Description | Selected |
|--------|-------------|----------|
| 4 reasoning models, todos `:online` | o4-mini:online, claude-opus-4.7:thinking:online, gemini-3.1-pro:online, gpt-5.5:online. ~$0.40-$0.80/query. | ✓ |
| 3 reasoning + 1 `:online` puro | 3 thinking sin `:online` + 1 modelo rápido `:online`. Mezcla diversidad funcional. ~$0.25-$0.50/query. | |
| 2 reasoning + 2 `:online` | Equilibrio. ~$0.30-$0.60/query. | |

**User's choice:** 4 reasoning models, todos `:online`.
**Notes:** Máxima diversidad de búsquedas paralelas. Confirma compliance estricto con RSCH-02.

---

## Stage 4 UI placement

### Discussion 4.1 — Donde renderizar Stage 4 cuando dispara

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-sección debajo de Stage 3 | Stage 3 sigue visible arriba. Bajo él aparece "Stage 4: Refinement" con critic score + respuesta refinada. Preserva trazabilidad. | ✓ |
| 4° tab al lado de Stage 1/2/3 | Tab strip de 3→4. Si no dispara, tab no aparece. Rompe simetría visual cuando ausente. | |
| Reemplaza Stage 3 cuando dispara | Stage 3 a disclosure colapsado. Stage 4 ocupa slot principal. Pierde trazabilidad. | |

**User's choice:** Sub-sección debajo de Stage 3 + opción de descarga MD que cubra Stage 4.
**Notes:** Botón de descarga MD se extiende para incluir Stage 4. Final answer download = Stage 4 cuando existe; full deliberation download incluye TODO (Stage 1, 2, 3 original, critic score, Stage 4).

---

## Claude's Discretion

- **CD-01:** Microcopia exacta del header del saved message ("Quality+Research • 4 models • Chairman: ...").
- **CD-02:** Layout específico del Quality toggle (chip group / segmented control / radio-style) — Direction A locked al concept; el componente concreto lo decide el planner siguiendo W13 + sketch-notebook.html.
- **CD-03:** Calibración exacta de la rubric del critic (texto del prompt, peso de cada dimensión).
- **CD-04:** Threshold del critic (locked en 8/10) puede ajustarse a 7 o 9 después de N queries reales.
- **CD-05:** Si OpenRouter no expone alguno de los modelos picked, el planner sustituye por el equivalente más cercano dentro del allowlist BYOK.
- **`reasoning_details` empty case:** ocultar disclosure entirely cuando null/empty (no mostrar "no reasoning available").
- **Format del reasoning rendered:** markdown por default; pretty-print con `<pre><code>` si llega como JSON estructurado.
- **Backwards compat (mensajes pre-Phase 3 sin metadata profile):** render como "Quality (legacy)" sin migration.

## Deferred Ideas

- Live cost from OpenRouter usage response — v2 (QUAL-V2-02).
- Pre-send cost estimation detallada por tokens — v2 (QUAL-V2-02).
- Per-message "Regenerate with another profile" — v2 (QUAL-V2-01).
- Persistir `label_to_model` y `aggregate_rankings` — v2 (PERS-V2-01).
- Inline citations con URL + excerpt — v2 (RSCH-V2-02).
- Fully-agentic deep-research loop — v2 (RSCH-V2-01); enchufa en `research_strategy.py` reemplazando `run()`.
- Calibración automática del critic threshold — manual en v1.
- Stage 0 research-first pipeline — explorado y rechazado; revisitar como RSCH-V2-XX si el coste de 4× online demuestra ser dominante en uso real.
- Migration formal de mensajes JSON antiguos a metadata `profile` — fuera de scope.
- Copy-to-clipboard en Stage 3/4 — v2 (UX-V2-01).
- Dark mode runtime toggle — v2 (UX-V2-02).
