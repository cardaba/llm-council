# Phase 3: Quality Dial & Pragmatic Deep Research - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 entrega el **Quality dial funcional end-to-end**: un toggle de 3 estados (`Fast` / `Quality` / `Quality+Research`) en `ChatInterface.jsx` enruta cada query a un backend con orquestación distinta. `Fast` mantiene el flujo actual (cheap mix), `Quality` sube a tier premium, y `Quality+Research` introduce un módulo aislado (`backend/research_strategy.py`) que orquesta un pipeline 1+3+1 de stages: 4 reasoning models con `:online` (Stage 1), rankings (Stage 2), Opus chairman synthesis (Stage 3), y un Stage 4 opcional de refinement gated por un critic LLM independiente. El reasoning capturado en `backend/openrouter.py:48` se renderiza en frontend como disclosure colapsable.

**Requirements covered:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, RSCH-01, RSCH-02, RSCH-03, RSCH-04, RSCH-05 (9 of 21 v1 total).

**In scope:**
- Backend: `SendMessageRequest.profile` field opcional (default `fast`), propagado por los 3-4 stages y persistido en metadata.
- `backend/config.py`: `PROFILES` dict con `fast` / `quality` / `quality_research`, cada uno con `council_models` + `chairman_model` + (para QR) `critic_model`. Cost estimates típicos hardcoded por profile.
- `backend/research_strategy.py`: módulo nuevo. **Thick API** — posee la orquestación completa de `quality_research` (Stages 1, 2, 3, 4 incluyendo critic invocation y Stage 4 trigger). `council.py` solo delega cuando `profile == "quality_research"`; mantiene su orquestación actual para `fast` y `quality`.
- Stage 4: triggered por LLM-as-judge con `claude-opus-4.7` como critic (independiente del chairman). Threshold ≥8/10 = skip; <8 = fire Stage 4 refinement.
- Frontend: 3-state Quality toggle al lado del textarea con cost surfacing footnote-style (Direction A locked en Phase 2). Saved message header muestra "Profile • N models • Chairman: <model>". Reasoning disclosure colapsado por tab Stage 1 / Stage 4.
- UI Stage 4: sub-sección directamente debajo de Stage 3 en el mismo panel (NO 4° tab). Stage 3 sigue visible arriba (preserva trazabilidad). Botón de descarga MD se extiende a incluir Stage 4 cuando existe.

**Out of scope (this phase):**
- **Pre-research stage que alimente al council como contexto compartido** (research-first pipeline) — explorado y rechazado: usuario prefiere mantener REQ original con `:online` por miembro para diversidad de búsquedas paralelas.
- **Persistir `label_to_model` y `aggregate_rankings`** — sigue diferido a v2 (PERS-V2-01).
- **Re-render con otro profile per message ("Regenerate")** — QUAL-V2-01.
- **Cost estimation pre-send detallado** — los típicos hardcoded en PROFILES son el mínimo viable; desglose pre-send queda para QUAL-V2-02.
- **Inline citations con URL/excerpt** — RSCH-V2-02 v2.
- **Fully-agentic deep research loop** — RSCH-V2-01 v2 (se enchufa después en `research_strategy.py` reemplazando `run()`).
- **Restyle visual de los componentes Phase 1** — Phase 4 lo hace siguiendo Direction A.
- **Toggle interactivo light/dark runtime** — UX-V2-02 v2.

</domain>

<decisions>
## Implementation Decisions

### `research_strategy` module API shape (RSCH-04)

- **D-01:** El módulo `backend/research_strategy.py` adopta forma **Thick API**: posee la orquestación completa de `quality_research` (Stages 1, 2, 3, 4 incluyendo critic invocation y Stage 4 trigger).
- **D-02:** Solo `quality_research` delega al strategy. `council.py` mantiene su orquestación actual para `fast` y `quality` (Stages 1-2-3 como hoy). Branch único: `if profile == "quality_research": yield from research_strategy.run(...)`.
- **D-03:** El strategy expone una API streaming-compatible (async generator de stage events) para preservar el SSE per-stage del frontend (`main.py` event_generator). NO romper el patrón "1 SSE event por stage completion" que el frontend ya consume.
- **D-04:** Razón estratégica: cuando llegue RSCH-V2-01 (fully-agentic deep research loop, v2), reemplaza `research_strategy.run()` con la versión iterativa search→read→reason→synthesize sin tocar `council.py`. El aislamiento es la inversión arquitectónica que permite la evolución.

### Stage 4 refinement gating (RSCH-03)

- **D-05:** Stage 4 se gatilla con **LLM-as-judge**: un critic independiente puntúa la chairman synthesis sobre una rubric fija y emite un score 1-10. Si score ≥8 → skip Stage 4. Si score <8 → fire refinement.
- **D-06:** **Critic model = `anthropic/claude-opus-4.7`** (mismo family que chairman pero invocación independiente con prompt rubric-based distinto). Threshold ≥8/10 default, calibrable post-deploy leyendo logs de las primeras N queries.
- **D-07:** **Cost rationale (locked):** NO se optimiza el coste del critic. `Quality+Research` ya optó por la senda premium; pellizcar $0.02 ahí (usando Haiku/Flash como critic) contradice la propuesta de valor del dial. Opus como critic respeta la lógica del profile.
- **D-08:** La rubric del critic vive como constante en `research_strategy.py` (e.g. `CRITIC_RUBRIC`). Cubre al menos: groundedness (¿se apoya en research/citations?), completeness (¿responde la pregunta entera?), absence-of-hedging (¿"I'm not sure" sin justificación?), consistency-with-council (¿contradice fuertemente el aggregate ranking?).
- **D-09:** Stage 4 refinement = una sola llamada al chairman con un prompt nuevo que incluye: synthesis original + critic feedback + instrucción de "produce a refined answer addressing the critic's points". No se reentra al council; solo el chairman re-sintetiza. Costo ~$0.10-0.30/refinement.

### Web search model choice (RSCH-01, RSCH-02)

- **D-10:** Composición del council `quality_research` = **4 reasoning models, todos con `:online`**. Diversidad de búsquedas paralelas es la propuesta de valor del profile (vs. research compartido).
- **D-11:** Picks específicos (verificar disponibilidad en OpenRouter al planear; sustituir por equivalente más cercano si alguno no existe):
  - `openai/o4-mini:online` (o successor disponible)
  - `anthropic/claude-opus-4.7:thinking:online` (si OpenRouter expone `:thinking:online`; fallback `claude-opus-4.7:online`)
  - `google/gemini-3.1-pro:online`
  - `openai/gpt-5.5:online` (4° miembro, diversifica más allá de los 3 reasoning standard)
- **D-12:** **BYOK allowlist preservado.** Solo `openai/anthropic/google-ai-studio`. Perplexity Sonar evaluado y descartado (fuera del allowlist; constraint PROJECT.md).
- **D-13:** **Chairman de `quality_research` = Opus 4.7** (mismo que `quality`). Se reusa porque ya está pagando el tier premium.
- **D-14:** **Cost expectation por query `quality_research`:** ~$0.40-$0.80 typical (cubre Stage 1 con 4× online + Stage 2 rankings + Stage 3 chairman + critic invocation + opcional Stage 4). El "~$0.45 typical" en el footnote del toggle (Direction A) es mid-range.

### Stage 4 UI placement (cierra deferred de Phase 2)

- **D-15:** Stage 4 renderiza como **sub-sección directamente debajo de Stage 3** en el mismo panel principal. **NO un 4° tab** al lado de Stage 1/2/3 (rompe simetría visual cuando ausente). **NO reemplaza Stage 3** (perdería trazabilidad).
- **D-16:** Stage 3 (synthesis original del chairman) **sigue visible arriba** cuando Stage 4 dispara. Esto preserva la trazabilidad — el usuario puede leer "qué dijo el chairman antes del refinement". Auditable.
- **D-17:** Sub-sección Stage 4 incluye: header "Stage 4: Refinement" + **score del critic que la disparó** (e.g. "Critic scored synthesis 6/10 — refinement triggered") + razón citada de la rubric (e.g. "Reason: insufficient groundedness") + la respuesta refinada renderizada como markdown.
- **D-18:** **Botón de descarga MD se extiende para Stage 4.**
  - Download "final answer" → si existe Stage 4, descarga Stage 4 (es la respuesta final). Si no, descarga Stage 3 (comportamiento actual).
  - Download "full deliberation" → incluye TODO: Stage 1 (con reasoning_details si existen), Stage 2 (rankings + de-anonymization), Stage 3 (synthesis original), critic score + rationale, Stage 4 refined (si existe).

### Quality toggle UX (QUAL-03)

- **D-19:** 3-state toggle al lado del textarea en `ChatInterface.jsx`. Estados visuales según Direction A locked en Phase 2 (`03-redesign-proposal.md § Direction A`).
- **D-20:** Cost surfacing per state: footnote-style "~$0.001" (Fast), "~$0.05 typical" (Quality), "~$0.45 typical" (Quality+Research). Numbers hardcoded en `PROFILES` dict per D-21; live cost (post-API) queda fuera de scope (v2 territory).
- **D-21:** **Cost numbers source:** hardcoded "typical" per profile en `PROFILES` (`config.py`). Justificación: live cost requiere parsear OpenRouter usage response y llamadas adicionales que añaden complejidad sin valor incremental para v1. Calibración: revisar mensualmente leyendo billing real y ajustar los números si se desvían >25%.

### `reasoning_details` rendering (RSCH-05)

- **D-22:** Disclosure pattern locked en Phase 2 Direction A: collapsed por defecto, hover/click expande, dentro de cada Stage 1 tab (NO overlay). Stage 4 (cuando dispara) usa el mismo pattern.
- **D-23:** **Empty case (Claude's discretion):** cuando `reasoning_details` es null/empty (modelo no lo devolvió), **ocultar el disclosure entirely** (no mostrar "no reasoning available"). Razón: el reasoning es opt-in del modelo; ausencia ≠ failure. Mantener UI clean.
- **D-24:** **Format del reasoning rendered:** markdown-rendered por default (los `summary` y `signature` de OpenRouter son texto). Si el field contiene JSON estructurado anidado (encrypted reasoning, tool calls), pretty-print con `<pre><code>`. Decisión final implementacional: planner valida formato real al inspeccionar respuestas reales de Opus thinking, o4-mini, gemini.

### Saved message header (QUAL-04)

- **D-25:** Cada assistant message persistido lleva metadata `profile` con shape:
  ```json
  { "profile": "quality_research", "models": ["..."], "chairman": "...", "critic": "claude-opus-4.7", "stage4_triggered": true|false }
  ```
- **D-26:** Header rendered inline en cada assistant message: e.g. "Quality+Research • 4 models • Chairman: claude-opus-4.7" (Fast / Quality omiten critic). Si Stage 4 disparó, sufijo "+ Stage 4 refinement" visible.
- **D-27:** **Backwards compat (Claude's discretion):** mensajes guardados antes de Phase 3 no tienen metadata `profile`. Render: "Quality (legacy)" como header sustituto. NO migration de archivos JSON existentes — se aceptan como estado heredado.

### Profile defaults & validation

- **D-28:** Default profile cuando `SendMessageRequest.profile` se omite: **`fast`** (per QUAL-01). Pydantic field con `default="fast"`.
- **D-29:** Validation: profile es Literal["fast", "quality", "quality_research"]. Profile desconocido → 422 vía Pydantic. NO error custom.

### Claude's Discretion

- **CD-01:** Microcopia exacta del header del saved message ("Quality+Research • 4 models • Chairman: ..." vs alternativas) — Claude decide al implementar; user revisa visualmente cuando vea las primeras queries.
- **CD-02:** Layout específico del Quality toggle (chip group / segmented control / radio-style) — Direction A locked al concept; el componente concreto lo decide el planner siguiendo el wireframe W13 + sketch-notebook.html.
- **CD-03:** Calibración exacta de la rubric del critic (texto del prompt, peso de cada dimensión) — Claude propone, user puede ajustar después leyendo los primeros logs de score.
- **CD-04:** Threshold del critic (locked en 8/10) puede ajustarse a 7 o 9 después de N queries reales si la calibración pinta mal — registrar en STATE.md como decision update.
- **CD-05:** Si OpenRouter no expone alguno de los modelos picked (`o4-mini`, `gpt-5.5`, `gemini-3.1-pro`), el planner sustituye por el equivalente más cercano dentro del allowlist BYOK y deja el cambio registrado.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Active hypothesis ("The Quality dial works as advertised at every level"); Constraints (BYOK allowlist, $100/month cap, single-user); Key Decisions table (Quality dial as 3 profiles, Pragmatic deep research not agentic).
- `.planning/REQUIREMENTS.md` §Quality Dial — QUAL-01..QUAL-04 detallados.
- `.planning/REQUIREMENTS.md` §Pragmatic Deep Research — RSCH-01..RSCH-05 con criterios verificables.
- `.planning/REQUIREMENTS.md` §Out of Scope — multi-turn rejected, free-tier providers rejected (refuerza BYOK constraint).
- `.planning/ROADMAP.md` §Phase 3 — Goal y 5 success criteria.
- `.planning/STATE.md` — Phase 2 cerrada; Phase 3 unblocked; Direction A elegida es contexto downstream.

### Phase 2 outputs (consumed by Phase 3)
- `.planning/ux/03-redesign-proposal.md` §`## Recommendation & decision` — **dirección elegida = Direction A: Research notebook**. Phase 3 NO redecide visuales; lee de aquí.
- `.planning/ux/03-redesign-proposal.md` §`## Direction A: Research notebook` — paleta light+dark, tipografía (Source Serif 4 + Inter), microinteracciones (easing suave 240ms+), IA, density stance, **cost surfacing footnote-style "~$0.45 typical"**, reasoning disclosure pattern, Phase 1 components restyling notes.
- `.planning/ux/02-nielsen-audit.md` §H1 + §H6 + §H8 + **anticipatory findings on QUAL-03 + RSCH-05** — Phase 2 ya ancló qué problemas ataca cada surface de Phase 3. Especialmente:
  - H1-04 anticipatory: cost visibility en Quality toggle.
  - RSCH-05 disclosure: progressive reveal pattern para reasoning_details.
- `.planning/ux/01-cognitive-walkthrough.md` §F-06 (loading 15-30s blind) — Phase 3 introduce stages adicionales que extienden ese gap; el loading state debe surfacing per-stage progreso (no spinner genérico).
- `.planning/ux/04-mockups/wireframes.md` §W13 (Quality toggle states) + §W15/W16 (reasoning disclosure colapsado/expandido) — contrato estructural neutral. Phase 3 los implementa con la estética de Direction A.
- `.planning/ux/04-mockups/sketch-notebook.html` — referencia visual ÚNICA para Phase 3 (Phase 4 las implementa con CSS variables; Phase 3 puede inspirarse pero NO copiar CSS verbatim per §`## Throwaway HTML disclaimer`).

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — entender el flujo SSE per-stage, donde ya están definidos los layers (API routing → council orchestration → OpenRouter client → Storage). El strategy module se enchufa entre council orchestration y openrouter client.
- `.planning/codebase/STRUCTURE.md` §components/ — los 7 componentes; Phase 3 modifica ChatInterface.jsx (toggle), Stage1.jsx (reasoning disclosure), añade Stage4.jsx nuevo.
- `.planning/codebase/CONVENTIONS.md` — Python: snake_case + 4-space + PEP 8 sin enforcement. Frontend: PascalCase components + camelCase handlers + kebab-case CSS. CSS co-located por componente.
- `.planning/codebase/CONCERNS.md` §Tech Debt — `reasoning_details` capturado server-side pero no rendered: Phase 3 cierra esta deuda (RSCH-05).
- `.planning/codebase/INTEGRATIONS.md` — el patrón existente de `provider.only=[publisher]` debe seguir aplicándose a TODOS los modelos del PROFILES dict, incluyendo `:online` variants.

### Phase 1 (precedente — surfaces a respetar)
- `frontend/src/components/ChatInterface.jsx` (276 líneas) — surface donde aterriza el Quality toggle. Patrón single-shot: input visible solo `messages.length === 0`. Toggle vive ANTES del primer envío; queda en metadata después.
- `frontend/src/components/Stage1.jsx` (36 líneas) — añade slot para reasoning disclosure por tab.
- `frontend/src/components/Stage3.jsx` (42 líneas) — añade slot para sub-sección Stage 4 + extender botón de descarga.
- `frontend/src/utils/download.js` — funciones `buildFinalAnswerMarkdown` + `buildFullDeliberationMarkdown` deben extenderse para incluir Stage 4 cuando existe.

### Backend surfaces a modificar
- `backend/main.py:32-34` — `SendMessageRequest` añade `profile: Literal["fast", "quality", "quality_research"] = "fast"`.
- `backend/main.py:154-201` — `event_generator` debe propagar profile al council/strategy y emitir Stage 4 SSE event cuando dispara.
- `backend/council.py:1-180` — `run_full_council`/`stage1_collect_responses` aceptan profile param. Si `profile == "quality_research"` delega a strategy.
- `backend/openrouter.py:48-55` — `reasoning_details` ya capturado; respetar la shape al pasar a frontend.
- `backend/storage.py:160-186` — `add_assistant_message` extiende para persistir metadata `{profile, models, chairman, critic?, stage4_triggered}`.
- **`backend/research_strategy.py`** (NUEVO) — Thick API; vive aquí toda la lógica research-specific.

### External / library docs
- OpenRouter `:online` plugin docs — verificar al planear: ¿`:thinking:online` es composable? ¿el web plugin pre-fetcha o el modelo decide cuándo? Esto afecta latencia y coste real.
- OpenRouter usage object — para QUAL-04, el response trae `usage.total_cost`. Hoy se descarta. Futuro v2 (live cost) lo lee; Phase 3 lo ignora.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `query_models_parallel(models, messages)` en `openrouter.py:62` — funciona con cualquier lista de modelos; el strategy lo reusa sin cambios.
- `get_provider_for_model(model)` + `PUBLISHER_TO_PROVIDER` en `config.py:33` — el routing BYOK es publisher-based; sigue funcionando con `:online` y `:thinking` (split por `/`, no afectado por suffix).
- `parse_ranking_from_text` + `calculate_aggregate_rankings` en `council.py` — Stage 2 logic agnostic al profile; reusable verbatim.
- `Markdown.jsx` (15 líneas) — wrapper de ReactMarkdown ya con GFM + highlight.js. Reusable para Stage 4 + reasoning disclosure expanded.
- `Modal.jsx` + `Menu.jsx` ya implementados Phase 1 — no relevantes para Phase 3 directamente.

### Established Patterns
- **SSE per-stage no per-token** (`main.py:140-201`) — Phase 3 emite events nuevos: `stage4_start` / `stage4_complete` cuando dispara. Si critic skip, NO se emiten events de Stage 4 (frontend no renderiza la sub-sección).
- **Single-shot input** — el toggle vive en `ChatInterface.jsx` ANTES del primer envío. Después, el input form se oculta (línea 221 actual) y el toggle también; lo único que queda es el header del saved message con el profile metadata.
- **CSS co-located** — Stage4 se introduce como `Stage4.jsx` + `Stage4.css`. Stage3.css se extiende para incluir el slot del Stage 4 sub-sección.
- **`.markdown-content` global** — Stage 4 refined answer y reasoning expanded ambos usan `<div className="markdown-content">` por consistencia.
- **Async-first backend** — todo el strategy module debe ser `async def`. No bloquear el event loop.
- **Graceful degradation** — `query_model` devuelve None on failure; el strategy lo respeta. Si critic falla → fallback: NO disparar Stage 4 (mejor skip que romper la query). Si Stage 4 falla → fallback: marcar `stage4_triggered: false` y mostrar solo Stage 3.

### Integration Points
- **`run_full_council` en `council.py`** se convierte en `run_full_council(query, profile)`. Branch:
  ```python
  if profile == "quality_research":
      async for event in research_strategy.run(query, PROFILES[profile]):
          yield event
  else:
      # current 3-stage flow with PROFILES[profile]["council_models"]
  ```
- **`event_generator` en `main.py`** propaga `request.profile` y, al recibir `stage4_complete` event, lo emite al frontend. Frontend lo incorpora al state del mensaje.
- **`storage.add_assistant_message`** acepta nuevo arg `metadata: Dict[str, Any]` y lo merge en el message dict antes de save.
- **Frontend `App.jsx`** consume metadata del SSE response y la pasa como prop al `Message` component (que renderiza el header con profile + Stage 4 sub-sección si aplica).

</code_context>

<specifics>
## Specific Ideas

- **Critic prompt template (CD-03):** Inspiración en LLM-as-judge papers (e.g. MT-Bench rubric). Estructura sugerida:
  ```
  You are evaluating a synthesized answer from an LLM council. Score it 1-10 on:
  1. Groundedness (does it cite sources? avoid unsupported claims?)
  2. Completeness (does it address the full question?)
  3. Clarity (free of hedging like "I'm not sure"?)
  4. Consistency (does it align with the council's aggregate ranking?)

  Output:
  SCORE: <integer 1-10>
  REASON: <one sentence per dimension>
  ```

- **Stage 4 refinement prompt (D-09):**
  ```
  The chairman synthesized this answer:
  <synthesis>

  An independent critic flagged these issues:
  <critic_reason>

  Score: <critic_score>/10. Threshold for refinement is <8.

  Produce a refined answer addressing the critic's points. Keep what works; revise what was flagged. Do NOT mention the critic in the output.
  ```

- **Hardcoded cost numbers (D-21) for `PROFILES`:**
  ```python
  PROFILES = {
      "fast": {
          "council_models": [...],
          "chairman_model": "anthropic/claude-haiku-4.5",
          "typical_cost_usd": 0.001,
      },
      "quality": {
          "council_models": [...],
          "chairman_model": "anthropic/claude-opus-4.7",
          "typical_cost_usd": 0.05,
      },
      "quality_research": {
          "council_models": [...],
          "chairman_model": "anthropic/claude-opus-4.7",
          "critic_model": "anthropic/claude-opus-4.7",
          "stage4_threshold": 8,
          "typical_cost_usd": 0.45,
      },
  }
  ```

- **Cost rationale recorded explicitly:** `Quality+Research` puede generar queries multi-dollar. El user lo aceptó conscientemente (PROJECT.md / Constraints). El toggle muestra "~$0.45 typical" (Direction A footnote) — eso es UX honesta. NO se requiere confirmación pre-send (no QUAL-V2-02 en este milestone).

- **Reasoning disclosure on Stage 4:** Cuando Stage 4 dispara, su tab/sub-sección también soporta `reasoning_details` si el chairman (que ejecuta el refinement) los devuelve. Mismo pattern que Stage 1 disclosure.

- **Architectural reframing considered + rejected:** Durante discusión, se exploró "Stage 0 research → council reasoning sin :online" (research-first pipeline). Usuario lo rechazó: prefiere mantener REQ original (cada member `:online`) por diversidad de búsquedas paralelas. Decisión registrada por trazabilidad — un futuro RSCH-V2-XX puede revisitar si la diversidad demuestra ser ruido vs. señal.

</specifics>

<deferred>
## Deferred Ideas

- **Live cost from OpenRouter usage response** — para QUAL-04 message header mostrar coste real del query. v2 territory (QUAL-V2-02 incluye este desglose).
- **Pre-send cost estimation detallada** — basada en token estimation × profile pricing. v2 (QUAL-V2-02 expand).
- **Per-message "Regenerate with another profile"** — re-ejecutar la misma query con otro setting para side-by-side comparison. v2 (QUAL-V2-01).
- **Persistir `label_to_model` y `aggregate_rankings`** — sigue diferido (PERS-V2-01).
- **Inline citations con source URL + excerpt** en Stage 3/4 markdown — RSCH-V2-02 v2.
- **Fully-agentic deep-research loop** que reemplaza `research_strategy.run()` — RSCH-V2-01 v2. La inversión arquitectónica de D-04 (Thick API isolated) es precisamente para que esto se enchufe sin tocar council.py.
- **Calibración automática del critic threshold** — leer logs de scores históricos y ajustar threshold dinámicamente. Manual revisitado por el usuario en v1; automatización es v2.
- **Stage 0 research-first pipeline** — explorado y rechazado en discussion (usuario prefirió REQ original). Si el coste de 4× online demuestra ser dominante en uso real, revisitar como RSCH-V2-XX.
- **Migration de mensajes JSON antiguos a metadata `profile`** — backwards compat se cubre con label "Quality (legacy)"; migration formal queda fuera de scope.
- **Copy-to-clipboard en Stage 3/4 final answer** — UX-V2-01 v2.
- **Dark mode runtime toggle** — UX-V2-02 v2.

</deferred>

---

*Phase: 3-Quality Dial & Pragmatic Deep Research*
*Context gathered: 2026-05-10*
