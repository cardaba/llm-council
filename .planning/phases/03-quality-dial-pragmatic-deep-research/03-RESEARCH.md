# Phase 3 Research: Quality Dial & Pragmatic Deep Research

**Researched:** 2026-05-10
**Domain:** OpenRouter orchestration, LLM-as-judge, SSE event extension, React state shape evolution
**Confidence:** HIGH for OpenRouter model availability and `reasoning_details` shape; HIGH for SSE/file-footprint mapping; MEDIUM for critic prompt calibration (no project-specific corpus yet)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 / D-02 / D-03 / D-04 — `research_strategy` API shape:** Thick API. `backend/research_strategy.py` posee la orquestación completa de `quality_research` (Stages 1-2-3-4 incluyendo critic invocation y Stage 4 trigger). `council.py` mantiene su orquestación actual para `fast` y `quality`. Branch único: `if profile == "quality_research": yield from research_strategy.run(...)`. Strategy expone async generator de stage events para preservar SSE per-stage. La inversión arquitectónica es para que RSCH-V2-01 (fully-agentic) reemplace `run()` sin tocar `council.py`.

- **D-05 / D-06 / D-07 / D-08 / D-09 — Stage 4 gating:** LLM-as-judge con critic independiente. Critic = `anthropic/claude-opus-4.7`. Threshold ≥8/10 = skip; <8 = fire. Coste del critic NO se optimiza (no Haiku). Rubric vive como constante en `research_strategy.py` cubriendo groundedness / completeness / absence-of-hedging / consistency-with-council. Stage 4 = una sola llamada al chairman con critic feedback embedded. Coste ~$0.10-$0.30/refinement.

- **D-10 / D-11 / D-12 / D-13 / D-14 — Web search & council composition:** 4 reasoning models todos con `:online` (NO 3+1, NO 2+2). Picks: `openai/o4-mini:online`, `anthropic/claude-opus-4.7:thinking:online` (con fallback `:online` si `:thinking:online` no compone), `google/gemini-3.1-pro:online`, `openai/gpt-5.5:online`. BYOK allowlist preservado (openai/anthropic/google-ai-studio). Chairman QR = `claude-opus-4.7`. Coste típico ~$0.40-$0.80.

- **D-15 / D-16 / D-17 / D-18 — Stage 4 UI placement:** Sub-sección directamente debajo de Stage 3 en el mismo panel. NO 4° tab. Stage 3 sigue visible arriba (trazabilidad). Sub-sección incluye header "Stage 4: Refinement" + critic score + razón de la rubric + respuesta refinada. Download "final answer" → Stage 4 si existe, si no Stage 3. Download "full deliberation" → todo incluyendo critic score + rationale.

- **D-19 / D-20 / D-21 — Quality toggle UX:** 3-state al lado del textarea, footnote-style cost surfacing ("~$0.001" / "~$0.05 typical" / "~$0.45 typical"). Numbers hardcoded en `PROFILES` dict. Live cost (post-API) fuera de scope.

- **D-22 / D-23 / D-24 — `reasoning_details` rendering:** Disclosure colapsado por defecto, hover/click expande, dentro de cada Stage 1 tab. Stage 4 usa el mismo pattern. Empty case → ocultar disclosure entirely. Format: markdown por default; JSON estructurado pretty-print en `<pre><code>`. Planner valida formato real al inspeccionar respuestas.

- **D-25 / D-26 / D-27 — Saved message header:** Cada assistant message persiste metadata `{profile, models, chairman, critic?, stage4_triggered}`. Header inline e.g. "Quality+Research • 4 models • Chairman: claude-opus-4.7" (Fast/Quality omiten critic). Mensajes pre-Phase-3 → "Quality (legacy)". NO migration de JSON existentes.

- **D-28 / D-29 — Profile defaults & validation:** Default `fast`. Pydantic `Literal["fast", "quality", "quality_research"]`. Profile desconocido → 422.

### Claude's Discretion

- **CD-01:** Microcopia exacta del header del saved message (Claude decide; user revisa visualmente).
- **CD-02:** Layout específico del Quality toggle (chip group / segmented control / radio-style) siguiendo wireframe W13 + sketch-notebook.html.
- **CD-03:** Calibración exacta de la rubric del critic (texto del prompt, peso de cada dimensión).
- **CD-04:** Threshold del critic locked en 8/10, ajustable a 7 o 9 después de N queries.
- **CD-05:** Si OpenRouter no expone alguno de los modelos picked, sustituir por equivalente más cercano dentro del allowlist BYOK.

### Deferred Ideas (OUT OF SCOPE)

- Live cost from OpenRouter usage response (QUAL-V2-02).
- Pre-send cost estimation detallada (QUAL-V2-02).
- Per-message "Regenerate with another profile" (QUAL-V2-01).
- Persist `label_to_model` y `aggregate_rankings` (PERS-V2-01).
- Inline citations con source URL + excerpt (RSCH-V2-02).
- Fully-agentic deep-research loop (RSCH-V2-01).
- Calibración automática del critic threshold.
- Stage 0 research-first pipeline (rejected).
- Migration de mensajes JSON antiguos.
- Copy-to-clipboard en Stage 3/4 (UX-V2-01).
- Dark mode runtime toggle (UX-V2-02).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | `SendMessageRequest.profile` Literal field, default `fast`, propagated through council and persisted in metadata | §SSE event extension plan, §File-by-file change footprint, §Backend SendMessageRequest extension |
| QUAL-02 | `PROFILES` dict in `config.py` mapping profile → `{council_models, chairman_model, critic_model?}` | §OpenRouter model availability (verified IDs), §research_strategy module structure |
| QUAL-03 | 3-state toggle next to textarea in `ChatInterface.jsx`, profile in component state, sent with message | §File-by-file change footprint (frontend), references W13 + Direction A locked |
| QUAL-04 | Profile + model set visible in saved message header inline | §SSE event extension plan (metadata propagation), §File-by-file change footprint |
| RSCH-01 | `quality_research` uses reasoning models (o4-mini, opus thinking, gemini-3.1-pro thinking) | §OpenRouter model availability, §reasoning_details shapes |
| RSCH-02 | At least one council member is web-search-capable (`:online`) | §`:online` plugin behavior |
| RSCH-03 | Optional Stage 4 refinement gated by quality threshold (LLM-as-judge) | §Critic prompt design |
| RSCH-04 | Strategy lives in dedicated module isolated from `council.py` | §research_strategy module structure |
| RSCH-05 | `reasoning_details` rendered as collapsed disclosure in Stage 1/4 tabs | §reasoning_details renderable shapes |

</phase_requirements>

## Domain landscape

Esta fase toca tres dominios técnicamente independientes que el plan deberá coordinar como un único vertical slice:

1. **OpenRouter capabilities (external dependency).** El éxito de `quality_research` depende de que cinco modelos específicos existan hoy en OpenRouter (`o4-mini`, `claude-opus-4.7`, `gemini-3.1-pro`, `gpt-5.5`, plus Opus como critic) y de que el plugin web search sea composable con thinking y compatible con BYOK. Toda la diferenciación funcional del profile vive en suffixes y parámetros de payload — un fallo en esta capa rompe la propuesta de valor del dial.

2. **Backend orquestación (internal change, async-first).** El módulo nuevo `research_strategy.py` se enchufa entre `main.py` event_generator y `openrouter.py`. El branch en `council.run_full_council` delega solo `quality_research`; el resto sigue funcionando exactamente igual. La API expuesta por el strategy es un async generator de stage events para integrarse en el SSE per-stage existente sin tocar el frontend dispatch loop más allá de añadir dos casos (`stage4_start`, `stage4_complete`) y un evento auxiliar (`critic_complete` opcional).

3. **Frontend rendering (internal change, declarative).** Tres surfaces nuevas en el frontend: (a) un Quality toggle 3-state en `ChatInterface.jsx` que pasa `profile` con cada mensaje; (b) un disclosure colapsable de `reasoning_details` en cada Stage 1 tab; (c) una sub-sección Stage 4 debajo de Stage 3 cuando dispara. La estética se hereda de Direction A locked en Phase 2.

**External dependency vs internal change:** Los riesgos externos están concentrados en (1) — IDs de modelo que cambian, suffixes que dejan de componerse, deprecaciones (e.g. `:online` está marcado como deprecated en favor de `tools: [{type: "openrouter:web_search"}]`, ver §`:online` plugin behavior). Los riesgos internos están concentrados en preservar el patrón SSE per-stage durante la extensión y en no romper la compatibilidad backward del shape de message JSON (mensajes pre-Phase-3 tienen que seguir cargando).

## OpenRouter model availability

Verificado contra docs oficiales de OpenRouter (mayo 2026) y model listing pages.

| Model picked en CONTEXT.md (D-11) | Estado | ID canónico | Pricing | Decisión |
|-----------------------------------|--------|-------------|---------|----------|
| `openai/o4-mini` | ✓ disponible | `openai/o4-mini` (released 2025-04-16) | $1.10 in / $4.40 out / 1M tokens | Usar tal cual. `[VERIFIED: openrouter.ai/openai/o4-mini]` |
| `anthropic/claude-opus-4.7` | ✓ disponible | `anthropic/claude-opus-4.7` (NO `claude-4.7-opus` — la migration guide usa ambos pero el model listing page confirma `claude-opus-4.7`) | $5 in / $25 out / 1M tokens | Usar `anthropic/claude-opus-4.7`. `[VERIFIED: openrouter.ai/anthropic]` |
| `google/gemini-3.1-pro` | ⚠ solo preview | `google/gemini-3.1-pro-preview` (released 2026-02-19) | $2 in / $12 out / 1M tokens | **Sustitución requerida (CD-05):** usar `google/gemini-3.1-pro-preview`. Si planner prefiere un GA estable, fallback a `google/gemini-3-pro-preview`. `[VERIFIED: openrouter.ai/google]` |
| `openai/gpt-5.5` | ✓ disponible | `openai/gpt-5.5` (released 2026-04-24) | $5 in / $30 out / 1M tokens | Usar tal cual. `[VERIFIED: openrouter.ai/openai/gpt-5.5]` |

**BYOK allowlist (D-12) preservado.** Los cuatro publishers (`openai`, `anthropic`, `google`) están todos en `PUBLISHER_TO_PROVIDER` (`backend/config.py:33-37`). El split por `/` en `get_provider_for_model()` ignora suffixes (`:online`, `:thinking`), así que `provider.only` se inyecta correctamente para todos los IDs. Verificado por inspección del código y el patrón `model.split("/")[0]`.

**Suffix `:thinking:online` — composabilidad NO confirmada.** Las docs de OpenRouter muestran `:online` componible solamente con `:free` (e.g. `openai/gpt-oss-20b:free:online`). NO hay ejemplo documentado de `:thinking:online`. Tres consecuencias:

1. **Para Claude 4.7 Opus, `:thinking` no existe como suffix.** Las docs de migration son explícitas: thinking se enables via `reasoning: { enabled: true }` en el payload, no via suffix. `claude-opus-4.7` solo tiene "adaptive thinking" mode, no budget-based; `reasoning.max_tokens` se ignora. `[CITED: openrouter.ai/docs/guides/evaluate-and-optimize/model-migrations/claude-4-7]`
2. **Para Gemini 3.1 Pro Preview, thinking se enables via `reasoning` parameter** con niveles `minimal | low | medium | high`. NO hay suffix `:thinking`. `[CITED: openrouter.ai/google/gemini-3.1-pro-preview]`
3. **Para o4-mini y GPT-5.5, también via `reasoning` parameter.** Reasoning es opt-in con `reasoning: { enabled: true }`.

**Concrete decisión para el planner (sustituye D-11 sin perder intent):**

```python
# PROFILES["quality_research"]["council_models"] — verified shape
COUNCIL_QR = [
    "openai/o4-mini:online",                    # reasoning + web search
    "anthropic/claude-opus-4.7:online",          # adaptive thinking via reasoning param
    "google/gemini-3.1-pro-preview:online",      # thinking via reasoning param
    "openai/gpt-5.5:online",                      # reasoning via reasoning param
]
```

La diversidad reasoning del council se logra **vía payload parameter `reasoning: { enabled: true }`**, no via suffix. El planner debe extender `query_model()` en `openrouter.py` para aceptar un `reasoning` arg opcional y reenviarlo en el payload solo para los modelos del profile que lo necesitan.

**`:online` está deprecated** (ver siguiente sección). Para v1 sigue funcionando — la deprecación no es retiro inmediato — pero el planner debería registrar en STATE.md que migrar al nuevo `tools: [{type: "openrouter:web_search"}]` será trabajo de v2.

**`anthropic/claude-opus-4.7` adaptive thinking — quirks importantes:**
- `temperature`, `top_p`, `top_k` son ignorados silenciosamente.
- `reasoning.max_tokens` y `reasoning.effort` son ignorados (solo adaptive mode).
- `verbosity: "xhigh"` disponible (entre `high` y `max`).
- Continuar conversaciones requiere preservar `reasoning_details` completo en messages.

Estos quirks no afectan Phase 3 directamente porque el flujo es single-shot (1 mensaje user, 1 respuesta), pero el planner debe documentarlos en `research_strategy.py` para que futuras extensiones (multi-turn) los consideren.

## :online plugin behavior

`[CITED: openrouter.ai/docs/guides/features/plugins/web-search]` y `[CITED: openrouter.ai/docs/guides/features/server-tools/web-search]`

### Status: deprecated en favor de `openrouter:web_search` server tool

Las docs oficiales declaran:

> The `:online` variant provides a shortcut for enabling web search. It is equivalent to using the `openrouter/auto` model with the `web` plugin. Note that the `:online` variant is deprecated.

> The deprecated web search plugin and `:online` variant have been replaced by the `openrouter:web_search` server tool. The new implementation gives models the ability to decide when and whether to search, rather than always searching once per request.

**Decisión para v1:** seguir con `:online` (D-10 está locked en CONTEXT.md). La deprecación no implica retiro; el sufijo sigue siendo funcional. Migrar al server tool es un task de v2 (RSCH-V2-XX). Documentar el path de migración en `research_strategy.py` como comment para no perder la pista.

### Cost reality

| Engine | Cost |
|--------|------|
| Exa (default) | **$4 / 1000 results ≈ $0.02 / request** con default 5 results |
| Native (provider's own search) | Provider-specific, pass-through |
| Parallel | $0.005 / request + $0.001 / additional result beyond 10 |
| Firecrawl | BYOK (10K free credits expire 3 months) |

**Implicación para D-14 ($0.40-$0.80 typical):** Stage 1 con 4× `:online` añade ~$0.08 (4 × $0.02 Exa) sobre el coste del modelo. La estimación de CONTEXT.md sigue siendo razonable. Verificación matemática:
- Stage 1: 4 × (model + Exa search) ≈ 4 × ($0.05 + $0.02) = $0.28
- Stage 2: 4 × ranking × ~3K input tokens (full context broadcast, ver `CONCERNS.md` §Stage 2 cost) ≈ 4 × $0.015 = $0.06
- Stage 3: chairman opus single call ≈ $0.10
- Critic: opus single call ≈ $0.05
- Stage 4 (when fires): chairman opus refinement ≈ $0.10
- **Total when Stage 4 skips: ~$0.49** (matches D-14 mid-range)
- **Total when Stage 4 fires: ~$0.59**

Outlier risk: una query que arranque Stage 1 con muchos search results (max_results alto) o un input largo (attachments) puede multiplicar input tokens × 4 modelos en Stage 2. **Pitfall:** el prompt de Stage 2 concatena todas las respuestas de Stage 1 (ver `council.py:59-62`). Con 4 reasoning models × thinking habilitado, las respuestas de Stage 1 son más largas que en `fast` (típicamente 800-2000 tokens cada una), inflando Stage 2 input a ~12K tokens × 4 = 48K tokens. **No se mitiga en Phase 3** (PROJECT.md acepta esta deuda como conocida — `CONCERNS.md` §"Stage 2 Full-Context Broadcast"), solo registrar en `research_strategy.py` como TODO.

### Failure modes

Las docs no documentan explícitamente qué pasa cuando la búsqueda falla. Comportamiento empírico esperado (sin verificar contra runtime):
- **Search timeout:** el modelo ignora la búsqueda y responde de su training data — equivalente a una query sin `:online`.
- **All 4 searches fail simultáneamente (improbable):** 4 modelos responden sin grounding; output sigue siendo válido, calidad degradada. Critic score probablemente baja → Stage 4 dispara, lo cual es el comportamiento deseado (refinement con feedback de "lacks groundedness").
- **API rate limit:** `query_model` ya devuelve `None` en `except Exception` (ver `openrouter.py:57`). Graceful degradation existente cubre este caso.

**Recomendación:** no añadir lógica nueva de manejo de fallo de search. El patrón existente (None on failure → filter out) es suficiente. Documentar en `research_strategy.py`.

### Citation extraction

Las docs muestran que las respuestas con web search incluyen un campo `annotations` en la message:

```json
{
  "type": "url_citation",
  "url": "https://example.com/article",
  "start_index": 0,
  "end_index": 50,
  "title": "...",
  "content": "..."
}
```

`[CITED: openrouter.ai/docs/api/reference/responses/web-search]`

**Para Phase 3 v1:** el Stage 1 response actual solo extrae `content` y `reasoning_details` (ver `openrouter.py:52-55`). Las annotations no se capturan. **Decisión recomendada:** NO capturar annotations en v1 — RSCH-V2-02 (inline citations) las usará. Añadir un comment en `openrouter.py` registrando que existen y dónde están en la response.

## reasoning_details renderable shapes

`[CITED: openrouter.ai/docs/guides/best-practices/reasoning-tokens]`

### Schema canónico (verified)

`reasoning_details` es un **array** de objetos. Cada objeto tiene un campo `type` que determina su shape concreta. Tres tipos posibles:

#### Type 1: `reasoning.summary`
```json
{
  "type": "reasoning.summary",
  "summary": "The model analyzed the problem by first identifying key constraints, then evaluating possible solutions...",
  "id": "reasoning-summary-1",
  "format": "anthropic-claude-v1",
  "index": 0
}
```
**Render:** texto plano markdown-ready en el campo `summary`. Renderizar con `<Markdown>{detail.summary}</Markdown>`.

#### Type 2: `reasoning.text`
```json
{
  "type": "reasoning.text",
  "text": "Let me think through this systematically:\n1. First consideration...\n2. Second consideration...",
  "signature": "sha256:abc123def456...",
  "id": "reasoning-text-1",
  "format": "anthropic-claude-v1",
  "index": 1
}
```
**Render:** texto plano markdown-ready en el campo `text`. La `signature` es metadata interna — no se muestra al usuario.

#### Type 3: `reasoning.encrypted`
```json
{
  "type": "reasoning.encrypted",
  "data": "eyJlbmNyeXB0ZWQiOiJ0cnVlIiwiY29udGVudCI6IltSRURBQ1RFRF0ifQ==",
  "id": "reasoning-encrypted-1",
  "format": "anthropic-claude-v1",
  "index": 1
}
```
**Render:** **NO renderizar el blob.** El `data` es base64 opaco que el modelo necesita para continuar conversaciones, no contenido legible. Mostrar literal `"(reasoning redacted by provider)"` o **omitir el detail entirely**. El usuario no puede leer un base64.

### Possible `format` values (canonical list)
- `unknown`
- `openai-responses-v1`
- `azure-openai-responses-v1`
- `xai-responses-v1`
- `anthropic-claude-v1`
- `google-gemini-v1`

### Rendering decision tree (recomendado para `Stage1.jsx`)

```
function renderReasoningDetail(detail):
  if detail.type === "reasoning.summary":
    render <Markdown>{detail.summary}</Markdown>
  elif detail.type === "reasoning.text":
    render <Markdown>{detail.text}</Markdown>
  elif detail.type === "reasoning.encrypted":
    skip entirely  // o muestra muted "Reasoning redacted by provider"
  else:
    // Unknown future type; pretty-print JSON as fallback
    render <pre><code>{JSON.stringify(detail, null, 2)}</code></pre>
```

### Empty case (D-23 — Claude's discretion locked)
Cuando `msg.reasoning_details` es `null`, `undefined`, o `[]`, **ocultar el disclosure entirely**. NO mostrar "no reasoning available". Razón documentada en CONTEXT.md: ausencia ≠ failure; reasoning es opt-in del modelo.

### Pitfall: array filter para encrypted-only

Si un modelo devuelve un array donde TODOS los items son `reasoning.encrypted`, no hay nada legible para mostrar. El disclosure debe ocultarse en ese caso. Implementación recomendada:

```javascript
const renderableDetails = (msg.reasoning_details || []).filter(
  d => d.type === "reasoning.summary" || d.type === "reasoning.text"
);
const hasReasoning = renderableDetails.length > 0;
// Solo renderizar disclosure si hasReasoning === true
```

### Streaming caveat

El doc muestra que en streaming, los `reasoning_details` llegan en `delta.reasoning_details` chunk a chunk. **Phase 3 NO usa streaming per-token** (`ARCHITECTURE.md` lo confirma — SSE es per-stage, no per-token). El backend hace `await query_model(...)` que recibe la respuesta completa. Por tanto: el frontend recibe el array completo en el evento `stage1_complete`. No hay complejidad de streaming acumulado.

### Format-specific shapes confirmados

| Modelo | Shape esperado | Notas |
|--------|---------------|-------|
| `anthropic/claude-opus-4.7` con `reasoning.enabled=true` | array de `reasoning.summary` + `reasoning.text` con `format: "anthropic-claude-v1"` | Adaptive thinking only. Preservar al continuar conversación (no aplica en single-shot Phase 3). |
| `openai/o4-mini` con reasoning | array que puede incluir `reasoning.encrypted` (encrypted_content) + `reasoning.summary` con `format: "openai-responses-v1"` | OpenAI puede redact-ear el reasoning text en encrypted blob. |
| `google/gemini-3.1-pro-preview` con `reasoning.enabled=true` | array de `reasoning.text` con `format: "google-gemini-v1"` | Niveles configurables (`minimal/low/medium/high`); usar `medium` por default. |
| `openai/gpt-5.5` con reasoning | similar a o4-mini — encrypted blob + summary | mismo treatment. |

## Critic prompt design

`[ASSUMED based on MT-Bench / G-Eval methodology — no project corpus exists yet]`

### Recomendación: Single-call structured output, deterministic parse

El critic debe emitir output que se pueda parsear sin ambigüedad. Tres patrones evaluados:

| Patrón | Pros | Contras | Recomendación |
|--------|------|---------|---------------|
| Plain integer | Más simple parse (`int(re.search(r'\d+', x).group())`) | No captura razón → no se puede surfacing en Stage 4 sub-sección (D-17 lo requiere) | ❌ no captura razón |
| Markdown headers (SCORE:/REASON:) | Trivial regex parse, modelo respeta formato cuando se pide | Models ocasionalmente añaden prosa antes; necesita anchored regex | ✓ recomendado |
| JSON output | Schema-strict, parse infalible | Modelos pueden envolver en markdown ` ```json ` o añadir comentarios → JSON parse falla | ❌ fragil con thinking models |

**Conclusión:** patrón "Markdown headers" — refleja el patrón existente `FINAL RANKING:` que ya se usa en Stage 2 (`council.py:177-208`) y que ha demostrado funcionar. El parser ya tiene un fallback regex defensivo; replicar el mismo enfoque.

### Recommended critic prompt (CD-03 — Claude propone, user calibra)

```python
CRITIC_RUBRIC = """You are an independent quality reviewer evaluating a synthesized answer from an LLM council.

Score the answer 1-10 on these four dimensions, then output a SINGLE overall score
that reflects whether this answer is ready to ship to the user, or whether it
should be refined.

Dimensions:
1. **Groundedness** — Does the answer rely on the council's research / web sources, or does it speculate? Citations or specific facts strengthen this dimension.
2. **Completeness** — Does it address the full scope of the user's question, or does it skip aspects?
3. **Clarity** — Is it free of unnecessary hedging ("I'm not sure", "it depends") that the question doesn't require?
4. **Consistency** — Does it align with the council's aggregate ranking — i.e., does it incorporate the strongest insights, not the weakest?

Score scale anchors:
- 9-10: Ship as-is. Strong on all dimensions.
- 7-8: Ship as-is. Minor weakness in 1-2 dimensions but overall solid.
- 5-6: Borderline. Refinement would meaningfully improve it.
- 1-4: Refinement required. Material gap in 2+ dimensions.

User question:
<question>

Council aggregate ranking (best to worst):
<aggregate_ranking_summary>

Synthesized answer to evaluate:
<chairman_synthesis>

Output your evaluation in EXACTLY this format:

CRITIC SCORE: <integer 1-10>
GROUNDEDNESS: <integer 1-10> — <one-sentence justification>
COMPLETENESS: <integer 1-10> — <one-sentence justification>
CLARITY: <integer 1-10> — <one-sentence justification>
CONSISTENCY: <integer 1-10> — <one-sentence justification>
PRIMARY CONCERN: <one sentence — the single most important reason for the overall score>

Output nothing else after this block.
"""
```

### Parser logic

```python
import re

def parse_critic_score(text: str) -> tuple[int | None, str | None]:
    """
    Returns (overall_score, primary_concern) or (None, None) if parse fails.
    Defensive: handles models that add prose before/after, capitalization variation.
    """
    # Anchor on "CRITIC SCORE:" — last occurrence (in case model echoes header)
    score_matches = list(re.finditer(r'CRITIC SCORE:\s*(\d+)', text, re.IGNORECASE))
    if not score_matches:
        return None, None
    score = int(score_matches[-1].group(1))
    score = max(1, min(10, score))  # clamp to 1-10

    concern_match = re.search(
        r'PRIMARY CONCERN:\s*(.+?)(?:\n\n|\Z)',
        text, re.IGNORECASE | re.DOTALL,
    )
    concern = concern_match.group(1).strip() if concern_match else None
    return score, concern
```

**Fallback on parse failure (graceful degradation, mirrors `query_model` philosophy):**
- If parser returns `(None, None)` → log + treat as "skip Stage 4" (conservative: don't refine if we can't grade).
- Alternative aggressive fallback: treat as score=5 (mid) and fire Stage 4. Recommendation: **conservative skip** — avoids unnecessary $0.10-$0.30 refinement when critic is malformed.

### Threshold calibration plan (CD-04)

CONTEXT.md locks ≥8 = skip, <8 = fire. Validation plan post-deploy:

1. **First 5 queries:** log critic score + manually grade chairman synthesis as "ship-ready" / "needs work" / "broken".
2. **If 4/5 scores match human judgment:** threshold is good.
3. **If critic systematically scores too high (>8 when human says "needs work"):** raise threshold to 9.
4. **If critic systematically scores too low (<7 when human says "ship-ready"):** lower threshold to 7. Or strengthen the rubric prompt to emphasize "Ship as-is at 7-8".

Register adjustment in `STATE.md` as a Phase 3 post-execution decision update (per CD-04).

### Pitfalls específicos al LLM-as-judge

| Pitfall | Cómo manifiesta | Mitigación en este diseño |
|---------|----------------|--------------------------|
| **Positional bias** | Modelo prefiere lo que ve primero/último en el contexto | No aplica aquí — solo se evalúa UN synthesis, no múltiples options |
| **Length bias** | Modelo puntúa más alto answers más largos | Rubric explícita "Clarity" y "absence of hedging" mitiga moderadamente |
| **Self-preference** | Critic = chairman model = Opus. Critic puede preferir su propio output | **Mitigado por D-06 — critic es invocación independiente con prompt distinto.** No ve que es Opus quien sintetizó. Aún así, **registrar como riesgo conocido** y revisar en calibración. |
| **Refusal to score low** | Models reluctant to score <5 ("could be worse") | Anchors explícitos en el prompt ("1-4: Refinement required") + score scale calibrada empuja la distribución hacia el centro |
| **Hallucinated rationale** | Critic inventa razones que no están en el synthesis | Parsing solo extrae el score; rationale es para UX visibility, no afecta el gate. Daño contenido. |

## SSE event extension plan

### Event protocol actual (`backend/main.py:154-201`)

```
stage1_start → stage1_complete{data}
stage2_start → stage2_complete{data, metadata: {label_to_model, aggregate_rankings}}
stage3_start → stage3_complete{data}
title_complete{data: {title}} (opcional)
complete
error{message, kind?}
```

### Event protocol extendido para Phase 3

**Para `fast` y `quality` profiles:** sin cambios. Mismo flujo exacto.

**Para `quality_research` profile:** añadir 3 events nuevos al final de la secuencia, antes de `complete`:

```
stage1_start → stage1_complete{data}
stage2_start → stage2_complete{data, metadata}
stage3_start → stage3_complete{data}
critic_start → critic_complete{score, primary_concern, stage4_triggered: bool}
[if stage4_triggered:]
  stage4_start → stage4_complete{data}
title_complete (opcional)
complete
```

### Event payload shapes recomendados

```json
// critic_start — minimal, frontend muestra "Critic scoring..."
{ "type": "critic_start" }

// critic_complete — metadata para UI (Stage 4 sub-section header)
{
  "type": "critic_complete",
  "score": 6,
  "primary_concern": "Insufficient groundedness — synthesis claims X but no source supports it",
  "stage4_triggered": true,
  "threshold": 8
}

// stage4_start — minimal
{ "type": "stage4_start" }

// stage4_complete — same shape as stage3_complete data
{
  "type": "stage4_complete",
  "data": {
    "model": "anthropic/claude-opus-4.7",
    "response": "<refined markdown>",
    "reasoning_details": [...] // si chairman lo expone
  }
}
```

### Frontend dispatch impact (`frontend/src/App.jsx:128-207`)

El switch existente tiene un `default: console.log('Unknown event type:', eventType)` (línea 204). **Esto significa que añadir events nuevos NO rompe el frontend en sí mismo** — los logs simplemente ignorarían los events nuevos. Sin embargo, sin cases nuevos, el state no se actualiza y la sub-sección Stage 4 nunca renderiza.

**Cambios mínimos en `App.jsx`:**
```javascript
case 'critic_complete':
  setCurrentConversation((prev) => {
    const messages = [...prev.messages];
    const lastMsg = messages[messages.length - 1];
    lastMsg.critic = {
      score: event.score,
      primary_concern: event.primary_concern,
      stage4_triggered: event.stage4_triggered,
      threshold: event.threshold,
    };
    return { ...prev, messages };
  });
  break;

case 'stage4_start':
  setCurrentConversation((prev) => { /* set lastMsg.loading.stage4 = true */ });
  break;

case 'stage4_complete':
  setCurrentConversation((prev) => {
    const messages = [...prev.messages];
    const lastMsg = messages[messages.length - 1];
    lastMsg.stage4 = event.data;
    lastMsg.loading.stage4 = false;
    return { ...prev, messages };
  });
  break;
```

**Backwards compat:** Mensajes guardados pre-Phase-3 (sin `critic` ni `stage4`) renderizan igual que antes — los componentes ya hacen guard `if (!finalResponse) return null` (`Stage3.jsx:11`). Mismo guard en el nuevo `Stage4.jsx`.

### SSE parser bug existente (out of scope)

`CONCERNS.md` §"SSE Parser: Silent Partial Event Corruption" documenta que `frontend/src/api.js:95-113` puede romper eventos largos (TCP fragmentation). Phase 3 introduce events más grandes (Stage 4 con reasoning_details puede ser varios KB). **Riesgo aumentado.** Mitigación recomendada: **el planner añade un task opcional Wave-fin** para implementar el line-buffering del SSE reader. Si no, queda como riesgo conocido — registrar en `STATE.md`.

## research_strategy module structure

### Async generator pattern (idiomatic FastAPI)

```python
# backend/research_strategy.py

from typing import AsyncGenerator, Dict, Any
from .openrouter import query_models_parallel, query_model
from .council import (
    stage2_collect_rankings,         # reused — anonymization logic identical
    calculate_aggregate_rankings,     # reused — pure function
    parse_ranking_from_text,          # reused — same parser
)

CRITIC_RUBRIC = """..."""
STAGE4_REFINEMENT_PROMPT = """..."""

async def run(
    user_query: str,
    profile_config: Dict[str, Any],
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Thick API: own the entire quality_research orchestration.

    Yields stage events as dicts; main.py serializes them as SSE.
    """
    # Stage 1: research-enabled council
    yield {"type": "stage1_start"}
    stage1_results = await _stage1_research_council(
        user_query, profile_config["council_models"]
    )
    yield {"type": "stage1_complete", "data": stage1_results}

    # Stage 2: rankings (reuse council.py)
    yield {"type": "stage2_start"}
    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, stage1_results, profile_config["council_models"]
    )
    aggregate = calculate_aggregate_rankings(stage2_results, label_to_model)
    yield {
        "type": "stage2_complete",
        "data": stage2_results,
        "metadata": {"label_to_model": label_to_model, "aggregate_rankings": aggregate},
    }

    # Stage 3: chairman
    yield {"type": "stage3_start"}
    stage3_result = await _stage3_chairman(
        user_query, stage1_results, stage2_results, profile_config["chairman_model"]
    )
    yield {"type": "stage3_complete", "data": stage3_result}

    # Critic
    yield {"type": "critic_start"}
    score, concern = await _critic_score(
        user_query, stage3_result, aggregate, profile_config["critic_model"]
    )
    threshold = profile_config["stage4_threshold"]
    triggered = score is not None and score < threshold
    yield {
        "type": "critic_complete",
        "score": score,
        "primary_concern": concern,
        "stage4_triggered": triggered,
        "threshold": threshold,
    }

    # Stage 4: refinement (gated)
    stage4_result = None
    if triggered:
        yield {"type": "stage4_start"}
        stage4_result = await _stage4_refinement(
            user_query, stage3_result, concern, score, profile_config["chairman_model"]
        )
        yield {"type": "stage4_complete", "data": stage4_result}

    # Final: yield aggregated state for storage layer
    yield {
        "type": "_finalize",  # internal — not sent over SSE
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "critic": {"score": score, "primary_concern": concern, "stage4_triggered": triggered},
        "stage4": stage4_result,
        "metadata": {"label_to_model": label_to_model, "aggregate_rankings": aggregate},
    }
```

### Helper sharing decision: keep helpers in council.py, import from strategy

**Decisión recomendada:** NO extraer `parse_ranking_from_text` ni `calculate_aggregate_rankings` a un nuevo `utils.py`. Razones:

1. **Stage 2 es agnostic al profile.** `stage2_collect_rankings` se llama igual desde council y desde strategy — pasar `profile_config["council_models"]` como parámetro es la única diferencia. Esto sugiere que `stage2_collect_rankings` debe extenderse para aceptar `models` como param (lo cual es un refactor pequeño que también beneficia a `stage1_collect_responses`).

2. **Aislamiento ≠ duplicación.** RSCH-04 dice "isolated from `council.py`" significando "no model lists ni branching logic en `council.py`". Importar funciones puras (parsers, aggregators) NO viola la intención — esas funciones son layer abstractions, no research-specific.

3. **YAGNI:** crear `utils.py` para 2 funciones añade un módulo nuevo cuyo único cliente actual es ambos. Cuando llegue v2 con multi-strategy, refactorizar entonces.

**Refactor mínimo en `council.py`:** las 4 funciones helper (stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings, parse_ranking_from_text) deben aceptar `models` y `chairman_model` como parámetros explícitos en lugar de leer `COUNCIL_MODELS` y `CHAIRMAN_MODEL` del module global. El planner debe registrar este refactor como un task de Wave 1 separado de la extensión funcional.

### Branch único en council.py (D-02)

```python
# backend/council.py — modified
from .config import PROFILES
from . import research_strategy

async def run_full_council(
    user_query: str,
    profile: str = "fast",
) -> AsyncGenerator[Dict[str, Any], None]:
    profile_config = PROFILES[profile]

    if profile == "quality_research":
        async for event in research_strategy.run(user_query, profile_config):
            yield event
        return

    # Fast / Quality path — existing 3-stage flow with profile_config
    yield {"type": "stage1_start"}
    stage1_results = await stage1_collect_responses(
        user_query, profile_config["council_models"]
    )
    yield {"type": "stage1_complete", "data": stage1_results}
    # ... etc
```

`run_full_council` se transforma de "function returning tuple" a "async generator". Esto es un breaking change interno pero contained — solo `main.py` y `research_strategy.py` lo consumen.

`main.py` event_generator pasa a iterar sobre `run_full_council`:

```python
async for event in run_full_council(request.content, request.profile):
    if event["type"] == "_finalize":
        # Internal — persist to storage, do not yield over SSE
        storage.add_assistant_message(conversation_id, event)
        continue
    yield f"data: {json.dumps(event)}\n\n"
```

## File-by-file change footprint

| File | Change | Lines impactadas | Wave-friendliness |
|------|--------|------------------|-------------------|
| `backend/config.py` | Añadir `PROFILES` dict (D-21 shape). Mantener `COUNCIL_MODELS` y `CHAIRMAN_MODEL` como aliases-of-fast (backward compat) o eliminarlos si nada los importa fuera de council.py | +30 lines | **Wave 1 (foundation)** — todo lo demás depende de este shape |
| `backend/openrouter.py` | Extender `query_model` para aceptar `reasoning: dict | None` opcional y reenviarlo en payload. Capturar también `annotations` (web search citations) en el return — usable en RSCH-V2-02 sin re-fetch. | +10 lines | **Wave 1** — paralelo a config.py |
| `backend/council.py` | Parametrizar `stage1_collect_responses(query, models)`, `stage2_collect_rankings(query, results, models)`, `stage3_synthesize_final(query, s1, s2, chairman_model)`. Convertir `run_full_council` a async generator con branch a strategy. | ~80 lines refactor | **Wave 1** — bloquea Wave 2 |
| `backend/research_strategy.py` | NUEVO. CRITIC_RUBRIC, STAGE4_REFINEMENT_PROMPT, parse_critic_score helper, run() async generator, _stage1/_stage3/_critic/_stage4 internals | ~250 lines new | **Wave 2** — depende de Wave 1 |
| `backend/main.py` | `SendMessageRequest.profile: Literal[...] = "fast"`. Cambiar event_generator a `async for event in run_full_council(...)`. Aplicar mismo cambio a non-streaming `/message` (D-29). Shape de respuesta no-streaming: añadir `critic`, `stage4` keys condicionalmente. | ~40 lines | **Wave 2** — depende de council.py refactor |
| `backend/storage.py` | `add_assistant_message` acepta `metadata: dict` y persiste `{profile, models, chairman, critic?, stage4?}` en el message dict | ~15 lines | **Wave 2** — independiente del frontend |
| `frontend/src/components/ChatInterface.jsx` | Añadir Quality toggle (3-state, segmented control). State `profile`. Pasar a `onSendMessage(content, profile)`. Toggle solo visible cuando `messages.length === 0` (single-shot pattern). | ~50 lines | **Wave 3 (UI)** — depende de Wave 2 backend ready |
| `frontend/src/App.jsx` | Extender `handleSendMessage(content, profile)`. Añadir cases `critic_complete`, `stage4_start`, `stage4_complete` en SSE switch. Persistir profile metadata en assistant message shape. | ~40 lines | **Wave 3** — paralelo a ChatInterface |
| `frontend/src/components/Stage1.jsx` | Reasoning disclosure colapsable por tab, con filter de renderable details (skip encrypted). Reusa `<Markdown>`. | ~30 lines | **Wave 3** — independiente |
| `frontend/src/components/Stage3.jsx` | Sub-sección Stage 4 debajo cuando `msg.stage4` existe. Header con critic score + primary_concern. Botón download "final answer" actualizado para preferir Stage 4. | ~40 lines | **Wave 3** — depende de Wave 2 (SSE shape) |
| `frontend/src/components/Stage4.jsx` | NUEVO. Mismo pattern que Stage3.jsx + reasoning disclosure (igual que Stage1). | ~50 lines new | **Wave 3** |
| `frontend/src/components/Stage4.css` | NUEVO. Co-located styles (D-Conventions). | ~30 lines | **Wave 3** |
| `frontend/src/api.js` | `sendMessageStream(conversationId, content, profile, onEvent)` — añadir profile a body | ~3 lines | **Wave 2** |
| `frontend/src/utils/download.js` | Extender `buildFinalAnswerMarkdown` y `buildFullDeliberationMarkdown` para incluir Stage 4 + critic score + critic rationale (D-18) | ~40 lines | **Wave 3** — depende de message shape de Wave 2 |
| **Saved-message header rendering** | Inline en `ChatInterface.jsx` cuando renderiza assistant messages — usar `msg.metadata.profile` para mostrar "Quality+Research • 4 models • Chairman: ..." | ~15 lines en ChatInterface.jsx | **Wave 3** |

### Recommended wave decomposition

- **Wave 1 (Foundation):** `config.py PROFILES`, `openrouter.py reasoning param`, `council.py refactor a parametrized + async generator`. ~140 lines total. Sin behavior change para fast profile (pasa profile='fast' a las funciones refactorizadas).
- **Wave 2 (Backend strategy + persistence):** `research_strategy.py` nuevo, `main.py SendMessageRequest + event loop`, `storage.py metadata`, `api.js profile param`. ~325 lines. Backend ahora soporta los 3 profiles end-to-end (verificable con curl).
- **Wave 3 (Frontend rendering):** Quality toggle, Stage1 disclosure, Stage4 component, Stage3 sub-section, App.jsx SSE cases, download.js extensión, message header. ~300 lines.
- **Wave 4 (validation + polish):** manual UAT con queries de los 5 success criteria; calibración inicial del critic threshold leyendo logs de las primeras 5 queries; ajustes microcopia.

## Validation Architecture

`workflow.nyquist_validation` está en `false` en `.planning/config.json` — sin tests automáticos requeridos. Reemplazo: **manual UAT script** que el planner traduce en acceptance criteria por task.

### Manual validation script (post-Wave-3)

3 sample queries × 3 profiles = 9 ejecuciones. Cada query elegida para que `quality_research` añada valor visible.

| Profile | Query | Expected behaviors (grep-verifiable on saved JSON) |
|---------|-------|---------------------------------------------------|
| `fast` | "What is the capital of France?" | Header: "Fast • N models • Chairman: claude-haiku-4.5". `metadata.profile === "fast"`. No `critic`, no `stage4`. |
| `fast` | "Sort algorithms in Python" | Same header pattern. Markdown renders code blocks correctly. |
| `fast` | "Explain TCP/IP in 3 sentences" | Same header pattern. Latency < 10s end-to-end (subjetivo, anotar). |
| `quality` | "Compare Snowflake vs BigQuery for medium data" | Header: "Quality • N models • Chairman: claude-opus-4.7". `metadata.profile === "quality"`. No `critic`, no `stage4`. Reasoning disclosure visible en Opus tab si reasoning capturado. |
| `quality` | "Best practices for SQL CTE design" | Same. Verify reasoning_details rendered cuando expandido (no encrypted blob visible). |
| `quality` | "Explain dimensional modeling vs Data Vault" | Same. Latency 30-60s. |
| `quality_research` | "What are the latest releases of Power BI as of this month?" | Header: "Quality+Research • 4 models • Chairman: claude-opus-4.7". `metadata.critic.score` registrado. Web search citations visibles en al menos 1 Stage 1 tab (markdown links). Stage 4 dispara o no — both legitimate. |
| `quality_research` | "What does Anthropic's most recent research paper say about constitutional AI?" | Same header. Critic score logged. Stage 4 likely triggered (research-heavy). |
| `quality_research` | "Compare current pricing of Snowflake vs Databricks SQL Warehouse" | Same. Coste real $ visible en OpenRouter dashboard ≈ $0.40-$0.80 (D-14 verificable). |

### Grep checks per success criterion

`ROADMAP.md §Phase 3` lista 5 success criteria. Mapeo a grep-able evidence:

| SC | Verifiable by |
|----|---------------|
| SC-1 (`fast` works + header) | `grep -c '"profile": "fast"' data/conversations/<id>.json` ≥1 + visual header check |
| SC-2 (`quality` premium mix + Opus chairman + header) | `grep -c '"profile": "quality"'` ≥1 + `grep '"chairman": "anthropic/claude-opus-4.7"'` |
| SC-3 (`quality_research` web + Stage 4 conditional + UI) | `grep '"stage4_triggered"'` returns true/false explicitly. UI shows Stage 4 when triggered. |
| SC-4 (`research_strategy.py` exists, `council.py` no research imports) | `grep -l "openai/o4-mini" backend/council.py` returns nothing. `grep -l "research_strategy" backend/council.py` returns 1 line (the import). |
| SC-5 (reasoning disclosure renders) | Visual + `grep "reasoning_details" data/conversations/<id>.json` finds populated arrays for opus/o4-mini messages. |

### Critic calibration log (first 5 quality_research queries)

Crear `.planning/phases/03-quality-dial-pragmatic-deep-research/critic-calibration.md` post-Wave-3 con tabla:

| # | Query | Critic score | Primary concern | Human grade (ship/refine/broken) | Match? |
|---|-------|-------------|-----------------|----------------------------------|--------|
| 1 | ... | 7 | ... | ship | ✓ |
| 2 | ... | 5 | ... | refine | ✓ |

Si match rate <4/5, ajustar threshold per CD-04 y registrar en STATE.md.

## Pitfalls and landmines

### 1. `:online` deprecation creep
**Symptom:** OpenRouter retira `:online` mid-deployment.
**Impact:** Stage 1 deja de tener web search → critic siempre puntúa bajo "Groundedness" → Stage 4 dispara siempre → coste alto sin valor.
**Mitigación:** registrar en `research_strategy.py` un comment con el path de migración a `tools: [{type: "openrouter:web_search"}]`. Detectable en logs si todas las Stage 1 responses pierden citations consistently.

### 2. `claude-opus-4.7` adaptive thinking ignora `reasoning.max_tokens`
**Symptom:** El planner intenta limitar reasoning tokens para controlar coste, no funciona.
**Impact:** Reasoning puede ser largo, inflando completion tokens. Ya documentado por OpenRouter migration guide.
**Mitigación:** documentar en code comment dentro de `research_strategy.py`. NO intentar limitar — Opus 4.7 decide adaptively cuánto pensar.

### 3. Encrypted reasoning_details exclusively
**Symptom:** Para o4-mini / gpt-5.5 con thinking, el array de reasoning_details puede ser 100% `reasoning.encrypted` (sin summary).
**Impact:** Disclosure se renderiza pero está vacío → mala UX.
**Mitigación:** filtrar antes de mostrar disclosure (ver §reasoning_details renderable shapes). `hasReasoning = renderableDetails.length > 0`.

### 4. SSE backward compat para mensajes legacy
**Symptom:** Mensajes guardados pre-Phase-3 carecen de `metadata.profile`. Al reload, frontend renderiza con metadata undefined.
**Impact:** UI rota o blank header.
**Mitigación:** D-27 locked: render `"Quality (legacy)"` cuando `msg.metadata?.profile` es `undefined`. Implementar como guard explícito en el header rendering, no como migration.

### 5. Stage 2 cost explosion en `quality_research`
**Symptom:** Stage 2 input prompt = concatenation de 4× Stage 1 responses. Con thinking enabled, cada Stage 1 response puede ser 2K tokens → Stage 2 input = 8K tokens × 4 modelos = 32K input tokens, dominando el coste de la query.
**Impact:** Coste real puede superar $0.80 (top of D-14 range) consistently, no solo en outliers.
**Mitigación:** documentar en `research_strategy.py` como deuda conocida (`CONCERNS.md` ya lista). NO mitigar en Phase 3. Si calibración inicial muestra coste >$1.00 typical, registrar en STATE.md y revisitar.

### 6. Critic self-preference (Opus evaluates Opus)
**Symptom:** Score systematically high (>8) → Stage 4 nunca dispara → propuesta de valor del refinement no se materializa.
**Impact:** Quality+Research costs ~$0.50 pero no entrega refinement visible.
**Mitigación:** durante calibración (CD-04), si Stage 4 nunca dispara en 5/5 primeras queries, considerar: (a) bajar threshold a 7, (b) cambiar critic prompt para emphasize "be skeptical", (c) trade-off del cost rationale (D-07) y considerar Sonnet como critic en V2.

### 7. JSON shape divergence entre `/message` (batch) y `/message/stream`
**Symptom:** El endpoint non-streaming `send_message` devuelve `{stage1, stage2, stage3, metadata}` (`main.py:128-134`). Phase 3 lo extiende a `{stage1, stage2, stage3, metadata, critic?, stage4?}`. Si frontend nunca lo usa pero un test/curl lo invoca, shape inconsistency confunde al usuario.
**Impact:** Bajo — frontend solo usa stream. Pero si el planner añade un test futuro que usa el endpoint batch, fallará silently para `quality_research`.
**Mitigación:** ambos endpoints deben aceptar `profile` y devolver shape consistente. Refactor de `run_full_council` a async generator afecta también el batch path — debe hacer `async for event in run_full_council(...)` y aggregar en un dict antes de devolver.

### 8. Frontend `onSendMessage(content)` signature breaking change
**Symptom:** App.jsx pasa `(content)`; ChatInterface ahora pasa `(content, profile)`. Si hay otros consumidores, breaking.
**Impact:** Bajo — solo App.jsx es consumidor.
**Mitigación:** verificar que solo hay 1 consumer y actualizar both en la misma wave.

### 9. UUID/JSON file size growth con Stage 4
**Symptom:** Cada `quality_research` message ahora persiste stage1 (con reasoning_details) + stage2 + stage3 + critic + stage4. Files pueden ser 50-200KB cada uno.
**Impact:** El listado de conversaciones (`list_conversations`, `storage.py:111-137`) lee TODOS los JSON files al cargar el sidebar. Con 50 conversations × 200KB = 10MB sync read en cada GET.
**Mitigación:** `list_conversations` ya solo extrae metadata pero abre cada file. **No es problema de Phase 3 introducir, ya existe.** Documentar como riesgo conocido en `STATE.md` si la lista se vuelve perceptiblemente lenta.

### 10. Critic score parse failure causes silent skip
**Symptom:** Critic responde "I think this is pretty good, maybe an 8" sin formato. Parser devuelve `(None, None)` → Stage 4 skipped.
**Impact:** Para queries donde Stage 4 SÍ debería disparar, no lo hace. Visualmente invisible (UI muestra solo Stage 3).
**Mitigación:** logear cada parse failure (level WARNING) en backend. Si la frecuencia >10%, robustecer el prompt o añadir retry. Inicialmente: aceptar el comportamiento conservativo.

## Open questions

1. **¿`reasoning.enabled=true` es necesario explícitamente, o los modelos `:online` ya activan thinking por default cuando son reasoning-capable?**
   What we know: Opus 4.7 requires `reasoning.enabled=true` explicit. Gemini 3.1 Pro Preview tiene niveles configurables. o4-mini/GPT-5.5 también opt-in.
   What's unclear: si pasar `reasoning: { enabled: true }` a un modelo no-reasoning rompe la request (probablemente lo ignora, pero sin verificar).
   Recommendation: extender `query_model` con un arg opcional `reasoning_config: dict | None`. Para QR profile, los 4 modelos lo reciben. Para los demás, no. Verificar en runtime que ningún publisher rechaza el field.

2. **¿El critic = Opus puede ver el aggregate ranking de Stage 2, o solo el chairman synthesis?**
   D-08 dice "consistency-with-council" como una de las dimensiones. La rubric recomendada incluye `<aggregate_ranking_summary>` en el contexto. Pero pasarle a Opus el ranking completo de 4 modelos es ~3K input tokens extra.
   Recommendation: pasar solo el aggregate ranking summary (top model + avg rank), no las 4 evaluaciones completas. Si calibración revela que falta contexto, expandir.

3. **¿Qué pasa si Stage 4 también devuelve `reasoning_details`?**
   D-22 implica que sí — "Stage 4 (cuando dispara) usa el mismo pattern". Pero si Stage 4 chairman es Opus y se invoca sin `reasoning.enabled`, no habrá reasoning. Si SÍ se invoca con reasoning, el coste sube.
   Recommendation: para v1, NO habilitar reasoning en Stage 4 explícitamente. Stage 4 = synthesis refinement, no needs deep thinking. Ahorra coste. Si Opus devuelve reasoning_details adaptively de todos modos, renderizarlos.

4. **¿Profile saved en metadata o también en una columna nueva del JSON top-level?**
   D-25 dice "metadata `profile`" pero el shape sugiere que `profile` es campo del message (no metadata anidada).
   Recommendation: persist as `message.metadata = {profile, models, chairman, critic?, stage4_triggered}`. Al reload, `Stage1/Stage3/Stage4` y header leen `msg.metadata.profile`. Mantiene shape predecible y permite future v2 fields sin romper schema.

5. **Latencia esperada `quality_research` end-to-end.**
   What we know: Stage 1 con `:online` añade 5-10s por modelo. 4 en paralelo = 10-15s para Stage 1. Stage 2 ranking ~10s. Stage 3 chairman ~5-10s. Critic ~5s. Stage 4 ~10s.
   What's unclear: si supera 60s, el navegador puede timeout en algunas configuraciones de proxy/SSE.
   Recommendation: NO añadir keep-alive heartbeats en v1 (aceptado risk). Si UAT muestra timeouts, añadir un `data: {"type": "heartbeat"}\n\n` cada 15s.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile selection (3-state toggle) | Browser/Client | — | UI state, viaja con la request |
| Profile validation | API/Backend | — | Pydantic Literal at API boundary (D-29) |
| Profile-aware model routing | Backend (council.py) | — | Branching único en `run_full_council` |
| Web-search-enabled querying | Backend (openrouter.py) | OpenRouter (external) | Suffix `:online` injection en payload; OpenRouter ejecuta búsqueda |
| Anonymized peer ranking (Stage 2) | Backend (council.py shared) | — | Reused logic, agnostic to profile |
| Critic scoring + Stage 4 gate | Backend (research_strategy.py) | — | Aislado en strategy module per D-04 |
| Reasoning details capture | Backend (openrouter.py) | — | Already in code; pass through to frontend |
| Reasoning disclosure rendering | Browser/Client (Stage1.jsx, Stage4.jsx) | — | Pure UI concern with `<Markdown>` wrapper |
| Stage 4 sub-section rendering | Browser/Client (Stage3.jsx + Stage4.jsx) | — | Below Stage 3 in same panel (D-15) |
| Profile metadata persistence | Backend (storage.py) | — | JSON file extension (D-25) |
| Saved-message header | Browser/Client (ChatInterface.jsx) | — | Reads `msg.metadata.profile` from JSON |
| Markdown export with Stage 4 | Browser/Client (download.js) | — | Pure utility; consumes message shape |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Critic prompt template (rubric structure, score anchors) is calibratable post-deploy without breaking integration | §Critic prompt design | Bajo — solo ajusta rubric text, no shape |
| A2 | LLM-as-judge methodology (MT-Bench/G-Eval style) applies to single-output evaluation | §Critic prompt design | Bajo — método probado para chairman synthesis evaluation |
| A3 | OpenRouter `:online` plugin uses Exa as default engine (not native provider search) | §`:online` plugin behavior | Bajo — pricing diferente pero behavior similar; afecta cost estimate ±$0.05 |
| A4 | Search failure causes graceful degradation (model responds from training data, not 500) | §`:online` plugin behavior | Medio — si rompe la request, Stage 1 fallaría con 4× None y UI quedaría rota |
| A5 | Critic Opus does not exhibit strong self-preference bias when scoring Opus chairman synthesis | §Pitfalls #6 | Medio — calibration plan lo detecta, pero corrección requiere prompt tuning |
| A6 | Frontend SSE parser handles new event types via passthrough without crashing | §SSE event extension plan | Bajo — verified by reading `App.jsx:128-207` default case |
| A7 | Backend non-streaming `/message` endpoint compatibility with profile param doesn't break frontend | §Pitfalls #7 | Bajo — frontend usa stream exclusively |
| A8 | Latency for `quality_research` stays under 60s typical (no SSE timeout) | §Open Questions #5 | Medio — aceptable risk for personal local app |

## Project Constraints (from CLAUDE.md)

- **GSD enforcement:** No Edit/Write outside a GSD command. Phase 3 work happens via `/gsd-execute-phase`.
- **Stack locked:** FastAPI + httpx + uv (backend), React 19 + Vite 7 + react-markdown (frontend). No framework migration.
- **BYOK constraint:** Solo openai/anthropic/google-ai-studio. Cualquier modelo nuevo en PROFILES debe respetar `PUBLISHER_TO_PROVIDER`.
- **Single-user local-only:** backend bound to 127.0.0.1, no auth.
- **No automated tests required:** acceptable milestone debt; manual UAT cubre Phase 3.
- **Single-shot conversation:** input form solo cuando `messages.length === 0`. Toggle vive ahí.
- **`commit_docs: true`:** RESEARCH.md y future PLAN.md deben commitearse.

## Sources

### Primary (HIGH confidence — verified via Context7)
- [Context7 / openrouter_ai] — `/websites/openrouter_ai` snippets on `:online` deprecation, web_search server tool, reasoning_details schema, claude-opus-4.7 adaptive thinking
- [openrouter.ai/docs/guides/best-practices/reasoning-tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens) — reasoning_details types canonical schema
- [openrouter.ai/docs/guides/features/server-tools/web-search](https://openrouter.ai/docs/guides/features/server-tools/web-search) — new web search tool replacing `:online`
- [openrouter.ai/docs/guides/evaluate-and-optimize/model-migrations/claude-4-7](https://openrouter.ai/docs/guides/evaluate-and-optimize/model-migrations/claude-4-7) — Opus 4.7 quirks (adaptive thinking, ignored params)

### Secondary (HIGH confidence — official OpenRouter pages)
- [openrouter.ai/anthropic](https://openrouter.ai/anthropic) — canonical model IDs for Claude family
- [openrouter.ai/openai/o4-mini](https://openrouter.ai/openai/o4-mini) — pricing + release date
- [openrouter.ai/google/gemini-3.1-pro-preview](https://openrouter.ai/google/gemini-3.1-pro-preview) — preview-only status
- [openrouter.ai/openai/gpt-5.5](https://openrouter.ai/openai/gpt-5.5) — pricing + reasoning support
- [openrouter.ai/anthropic/claude-opus-4.7](https://openrouter.ai/anthropic/claude-opus-4.7) — Opus 4.7 model card
- [openrouter.ai/docs/guides/features/plugins/web-search](https://openrouter.ai/docs/guides/features/plugins/web-search) — `:online` cost breakdown

### Tertiary (MEDIUM confidence — methodology, not project-specific)
- LLM-as-judge methodology (MT-Bench, G-Eval, AlpacaEval) — assumed knowledge, calibration plan flagged for empirical validation

## Metadata

**Confidence breakdown:**
- OpenRouter model availability: **HIGH** — all 5 models verified via direct page fetch + Context7
- `:online` plugin behavior: **HIGH** — official docs explicit on cost, deprecation, citations
- reasoning_details shapes: **HIGH** — canonical schema documented in OpenRouter best practices
- Critic prompt design: **MEDIUM** — recommended template based on established methodology, but no project-specific calibration data exists yet
- SSE event extension: **HIGH** — verified by reading existing code (`main.py:154-201`, `App.jsx:128-207`)
- File-by-file footprint: **HIGH** — based on direct file inspection
- Pitfall list: **MEDIUM-HIGH** — combination of verified docs + reasoned extrapolation

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 días para stable areas; OpenRouter `:online` deprecation warrants re-check before Phase 3 wave 2 starts if elapsed >2 weeks)

## RESEARCH COMPLETE

Los 4 modelos picked en CONTEXT.md D-11 existen en OpenRouter (uno requiere sustitución a `gemini-3.1-pro-preview`); `:online` está deprecated pero funcional para v1; `reasoning_details` tiene schema canónico de 3 tipos con regla clara de filtrado; el critic Opus = chairman Opus arrastra riesgo de self-preference (calibrable post-deploy); el strategy module se enchufa como async generator preservando SSE per-stage; la decomposición wave-friendly es 3 waves de ~140 / ~325 / ~300 líneas con dependency chain config → strategy → frontend; el plan debe registrar 4 quirks de Opus 4.7 (params ignorados) y la migración futura de `:online` a `openrouter:web_search` server tool.

Sources:
- [OpenRouter Web Search Plugin](https://openrouter.ai/docs/guides/features/plugins/web-search)
- [OpenRouter Web Search Server Tool](https://openrouter.ai/docs/guides/features/server-tools/web-search)
- [OpenRouter Reasoning Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- [OpenRouter Claude 4.7 Migration Guide](https://openrouter.ai/docs/cookbook/evaluate-and-optimize/model-migrations/claude-4-7)
- [OpenRouter BYOK](https://openrouter.ai/docs/guides/overview/auth/byok)
- [Anthropic Models on OpenRouter](https://openrouter.ai/anthropic)
- [o4-mini on OpenRouter](https://openrouter.ai/openai/o4-mini)
- [GPT-5.5 on OpenRouter](https://openrouter.ai/openai/gpt-5.5)
- [Gemini 3.1 Pro Preview on OpenRouter](https://openrouter.ai/google/gemini-3.1-pro-preview)
- [Claude Opus 4.7 on OpenRouter](https://openrouter.ai/anthropic/claude-opus-4.7)
