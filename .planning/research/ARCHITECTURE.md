# Architecture Research — v2.0 Integration into v1.0 LLM Council

**Investigated:** 2026-05-10
**Confidence:** HIGH (todo basado en lectura directa del código v1.0)
**Mode:** Project Research — integration design

## Executive Summary

v1.0 ya tiene la mayoría de las extensiones que v2.0 necesita: SSE event protocol con tipos discriminables (`stage1_start`, `stage1_complete`, `stage2_complete`, `message_metadata`, `complete`, `error`, etc.), `add_assistant_message(metadata=..., stage4=...)` que acepta dict opaco, `PROFILES` dict centralizado, `:online` reasoning, `ConversationNotFoundError` distinto de `ValueError`, y `legacy_metadata`/`message_metadata` ya separados en main.py. Esto significa que v2.0 es **mayormente extensión, no refactor**.

Los tres ejes que sí requieren cambio estructural son:

1. **Conversation type discriminator** (`type: "fresh" | "critique"`) — campo nuevo en el JSON raíz, lo único que toca la "schema" del conversation file. Todo lo demás (cost, label_to_model persistido) cabe dentro de los dicts `metadata`/`message_metadata` existentes sin cambiar la signatura.
2. **Multipart upload** — el único endpoint nuevo "estructuralmente diferente". Hasta ahora todo es JSON; critique aporta `multipart/form-data`. Endpoint dedicado `/critique/stream` es más limpio que multiplexar mode en `/message/stream` (Pydantic `SendMessageRequest` no acepta files; FastAPI `UploadFile` no convive con `BaseModel` body en el mismo handler).
3. **Settings persistence** — decisión crítica: `stage4_threshold` y `font_size` viven en lugares distintos por naturaleza. `stage4_threshold` es un parámetro de request del backend (research_strategy lo lee); el resto es 100% client-side localStorage.

**Build order recomendado:**
- Phase 5: Persistence completeness (PERS-V2-01) — pre-requisito de cost analytics
- Phase 6: Cost analytics — usa los hooks de persistence
- Phase 7: External Critique — feature pesada, mejor con persistence sólido
- Phase 8: Settings page — agrupa stage4_threshold + cost cap visualization
- Phase 9: Mobile responsive — CSS-first, no toca backend
- Phase 10: Visual regression + automated tests — al final, locks the surface

---

## 1. External Deep Research Critique

### 1.1 Backend endpoint: NEW dedicated endpoint

**Decision:** `POST /api/conversations/{id}/critique/stream` (NEW), no extender `/message/stream`.

**Rationale:**
- `SendMessageRequest` es un `BaseModel` con `content: str` y `profile: Literal[...]`. Pydantic **no soporta** `UploadFile` dentro de un `BaseModel` body — los files requieren `Form()` + `File()` parameters como argumentos separados del handler. Multiplexar en un solo endpoint forzaría a romper el contrato JSON existente o a aceptar archivos como base64 dentro del JSON (feo, infla payload, doble parse).
- Los handlers son mutuamente excluyentes en su shape de input → endpoints separados ✓ separation of concerns.
- El SSE protocol downstream **es idéntico** (`stage1_start`, `stage1_complete`, `stage2_*`, `stage3_*`, `message_metadata`, `complete`). Solo el handler superior cambia.

**Signature:**
```python
@app.post("/api/conversations/{conversation_id}/critique/stream")
async def critique_stream(
    conversation_id: str,
    critique_query: str = Form(...),
    file_a: UploadFile = File(...),
    model_a: str = Form(...),  # "openai/gpt-5.1" — model attribution
    file_b: UploadFile = File(...),
    model_b: str = Form(...),
    file_c: UploadFile = File(...),
    model_c: str = Form(...),
):
```

Validación adicional dentro del handler: `file.size <= MAX_FILE_BYTES` (1-2MB sugerido, alineado con el cap actual del frontend `ATTACHMENT_LIMITS.total = 2MB`), `file.content_type in ("text/plain", "text/markdown")` o sniff por extensión.

### 1.2 Backend logic: parameterized stage1 (NO new module)

**Decision:** Extender `council.stage1_collect_responses` con un parámetro opcional `external_context: dict[str, str] | None`. NO crear `backend/critique.py`.

**Rationale:** El usuario locked "no new strategy module isolated". `research_strategy.py` se justificó porque la pipeline QR es estructuralmente distinta (4 modelos `:online`, critic gating, stage4 condicional). Critique reusa la pipeline 3-stage exacta — solo cambia el prompt de Stage 1. Aislar sería over-engineering.

**Implementation:**
```python
# backend/council.py
async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
    external_context: Optional[Dict[str, Dict[str, str]]] = None,  # {model_id: {"filename":..., "content":...}}
) -> List[Dict[str, Any]]:
    if external_context is not None:
        # Build per-model prompt: "You are critiquing 3 deep research outputs.
        # YOUR own previous research is the one labeled '[YOUR PRIOR WORK]'..."
        messages_per_model = build_critique_prompts(user_query, external_context, council_models)
        responses = await query_models_individually(council_models, messages_per_model)
    else:
        # Existing flow — fan-out same prompt to all models
        messages = [{"role": "user", "content": user_query}]
        responses = await query_models_parallel(council_models, messages)
```

**Note importante:** `query_models_parallel` actualmente envía el mismo `messages` payload a todos los modelos. Critique necesita **prompts distintos por modelo** (cada uno se ve a sí mismo etiquetado como autor de uno de los 3 archivos). Habrá que añadir `query_models_individually(models, messages_per_model: Dict[str, List])` en `openrouter.py` que itera los pares model→messages y hace `asyncio.gather`. Pequeña función, ~15 LOC, NO module nuevo.

**Stage 2 + Stage 3 sin cambios.** El council ya recibe un `stage1_results` shape `[{model, response}, ...]`; le da igual si el `response` es "una respuesta directa" o "una crítica de research externa". La anonimización funciona idéntica.

**SSE event order (idéntico al fresh flow):**
```
stage1_start → stage1_complete → stage2_start → stage2_complete{metadata}
→ stage3_start → stage3_complete → title_complete → message_metadata → complete
```

Ningún evento nuevo necesario, salvo que decidamos enviar `external_research_attached` para que el frontend muestre los archivos como context-chips antes de stage1 (cosmético, opcional).

### 1.3 Storage: campo `external_research` en assistant message + `type` en conversation root

**Decision:** Files **inlined en el JSON** del assistant message, NO sidecar.

**Rationale:**
- Single source of truth — un solo file por conversation, recargar es atómico.
- 3 archivos × ~500KB max = ~1.5MB JSON. Manageable en una app local single-user. JSON.parse está optimizado en V8.
- Sidecar files complicarían deletion (race con conversation file delete), backup (¿qué se incluye en download?), y la propiedad single-shot de la conversation.

**Schema additions:**

```json
{
  "id": "...",
  "created_at": "...",
  "title": "...",
  "type": "critique",
  "messages": [
    { "role": "user", "content": "Critique these three deep research outputs..." },
    {
      "role": "assistant",
      "stage1": [...],
      "stage2": [...],
      "stage3": {...},
      "metadata": { ... },
      "external_research": {
        "openai/gpt-5.1": {
          "filename": "chatgpt-deep-research.md",
          "content": "<full file content>",
          "size_bytes": 487231,
          "uploaded_at": "2026-05-10T14:32:00Z"
        },
        "anthropic/claude-opus-4.7": { ... },
        "google/gemini-3.1-pro-preview": { ... }
      }
    }
  ]
}
```

**Backwards compat:** `conversation.get("type", "fresh")` en lectura. Conversaciones v1.0 legacy NO tienen `type` — default a `"fresh"` y todo sigue funcionando. Storage signature actualizada:

```python
def add_assistant_message(
    conversation_id, stage1, stage2, stage3,
    metadata=None, stage4=None,
    external_research: Optional[Dict[str, Dict[str, Any]]] = None,
):
```

**`type` se setea en `create_conversation`:**
```python
def create_conversation(conversation_id: str, type: str = "fresh") -> Dict[str, Any]:
    conversation = {"id": ..., "type": type, "created_at": ..., "title": ..., "messages": []}
```

Endpoint `POST /api/conversations` acepta `{"type": "fresh" | "critique"}` (default "fresh").

### 1.4 Frontend entry point: segmented control en welcome state

**Decision:** En `ChatInterface.__welcome` añadir un **segmented control** (radio-as-buttons) al final del welcome:

```
┌─────────────────────────────────────────┐
│ What do you want to think about today?  │
│                                          │
│ Ask one question. Three models answer.  │
│ ...                                      │
│ [ Examples list ]                        │
│                                          │
│ ┌────────────────┬─────────────────────┐ │
│ │ Fresh question │ Critique research   │ │
│ └────────────────┴─────────────────────┘ │
└─────────────────────────────────────────┘
```

**Rationale:**
- Modal "What kind of conversation?" es un step extra que rompe la inmediatez de Direction A.
- "+ Critique deep research" como segundo botón en sidebar diluye la jerarquía visual y obliga al usuario a aprender dos puntos de entrada.
- Segmented control es 1 click adicional dentro del flow ya visible, mantiene Direction A "Research notebook" tone (segmented controls son típicos en research/note-taking UIs como Notion / Logseq).

**Implementation:** Nuevo state en `ChatInterface`: `const [conversationType, setConversationType] = useState('fresh')`. El form adapta su shape según el tipo:

- `fresh` → textarea + QualityToggle (existing).
- `critique` → 3 file-pickers (cada uno con dropdown de model-attribution: openai/anthropic/google) + textarea para `critique_query` + (sin QualityToggle — critique siempre usa el set Quality por defecto, evita explosión de UI).

**`handleSubmit` bifurca:**
```jsx
if (conversationType === 'critique') {
  await api.sendCritiqueStream(conversationId, critiqueQuery, files, modelAttribution, onEvent);
} else {
  await api.sendMessageStream(conversationId, content, profile, onEvent);
}
```

`api.sendCritiqueStream` construye `FormData`, POST a `/critique/stream`, mismo SSE reader loop (SSE protocol idéntico downstream).

### 1.5 Hydration on reload

`GET /api/conversations/{id}` ya devuelve el JSON raw. Frontend lee `conversation.type` y `lastMessage.external_research`. `ChatInterface` muestra los archivos como **collapsed chips** sobre el assistant message (filename + size, click para expandir markdown rendered). Componente nuevo: `ExternalResearchPanel.jsx` (~80 LOC) + `.css`.

### 1.6 Files: NEW vs MODIFIED

| File | Status | Change |
|------|--------|--------|
| `backend/main.py` | MODIFIED | New `critique_stream` handler; modify `CreateConversationRequest` add `type` field |
| `backend/council.py` | MODIFIED | Extend `stage1_collect_responses` with `external_context` param; add `build_critique_prompts` helper |
| `backend/openrouter.py` | MODIFIED | Add `query_models_individually(models, messages_per_model)` |
| `backend/storage.py` | MODIFIED | `create_conversation(type=...)`; `add_assistant_message(external_research=...)` |
| `frontend/src/api.js` | MODIFIED | Add `sendCritiqueStream`; `createConversation(type)` |
| `frontend/src/components/ChatInterface.jsx` | MODIFIED | Add `conversationType` state; conditional form rendering |
| `frontend/src/components/CritiqueForm.jsx` | NEW | 3 file-pickers + model-attribution dropdowns + critique_query textarea |
| `frontend/src/components/CritiqueForm.css` | NEW | — |
| `frontend/src/components/ExternalResearchPanel.jsx` | NEW | Collapsed chips for hydrated `external_research` |
| `frontend/src/components/ExternalResearchPanel.css` | NEW | — |
| `frontend/src/App.jsx` | MODIFIED | Pass `conversationType` to `handleSendMessage`; handleNewConversation accepts type |

---

## 2. Persistence Completeness (Stage 2 metadata)

### 2.1 Decision: pack into `metadata` dict (NO new kwargs)

**Pack `label_to_model` and `aggregate_rankings` inside the existing `metadata` dict.** Don't extend the signature with new positional kwargs.

**Rationale:**
- Storage docstring (D-25 from Phase 3) ya define `metadata` como "opaque dict persisted verbatim".
- Cero cambio en `add_assistant_message` signature → cero refactor en callsites.
- En `main.py` ya existe la separación `legacy_metadata` (label_to_model + aggregate) vs `message_metadata` (profile + models + chairman). El fix es **mergear ambos al persistir**.

**Code change in `main.py` (streaming endpoint, fast/quality branch):**

```python
combined_metadata = {
    **message_metadata,
    "label_to_model": label_to_model,
    "aggregate_rankings": aggregate_rankings,
}
storage.add_assistant_message(
    conversation_id, stage1_results, stage2_results, stage3_result,
    metadata=combined_metadata,
)
```

**For QR pipeline (research_strategy):** El strategy module debe incluirlos en el `_final` event (ya los calcula internamente para emitir `stage2_complete` SSE).

### 2.2 SSE event: `stage2_complete` ya emite metadata — no nuevo evento

**Frontend `App.jsx` ya hidrata** `lastMsg.metadata = event.metadata` desde `stage2_complete`. Cuando se reload una conversation antigua via `getConversation`, `currentConversation.messages[].metadata` ya tendrá el shape completo después de este fix.

### 2.3 Backwards compat (legacy v1.0 conversations)

Conversaciones persistidas antes de v2.0 NO tendrán `label_to_model` / `aggregate_rankings` en el JSON. `Stage2.jsx` ya hace optional chaining → degrada gracefully (muestra los labels A/B/C sin de-anonimización, sin aggregate panel). **No migration script needed.**

---

## 3. Cost Analytics

### 3.1 Backend: capture from OpenRouter response

**OpenRouter returns `usage` field per response containing prompt_tokens, completion_tokens, and (since 2024) a `cost` field.** **MEDIUM confidence** hasta verificar shape exacta con request real (5-min spike antes de Phase 6).

**Implementation in `openrouter.py:query_model`:**
```python
return {
    'content': data['choices'][0]['message'].get('content', ''),
    'reasoning_details': data['choices'][0]['message'].get('reasoning_details'),
    'usage': data.get('usage', {}),
}
```

**Aggregate per-message en `message_metadata`:**

```python
message_metadata = {
    "profile": ...,
    "models": ...,
    "chairman": ...,
    "cost": {
        "stage1": <sum>,
        "stage2": <sum>,
        "stage3": <num>,
        "stage4": <num | null>,
        "total": <sum>,
        "currency": "USD",
    }
}
```

### 3.2 Conversation-level + monthly aggregate: computed on-read

**Don't persist a `total_cost` field at conversation root.** Compute on-demand from `messages[].metadata.cost.total`.

**New endpoint:** `GET /api/stats/cost` returns:
```json
{
  "current_month": { "total_usd": 12.34, "queries": 47, "by_profile": {"fast": 0.04, "quality": 2.1, "quality_research": 10.2} },
  "current_session_estimate_for_cap": { "remaining_pct": 88, "cap_usd": 100 }
}
```

Backend: `backend/stats.py` (~30 LOC, read-only aggregation).

### 3.3 Frontend display: 3 places

1. **Per-message footer** (in `MessageHeader`, MODIFIED): "$0.024 · 4.2s" pegado bajo profile/models.
2. **Sidebar footer** (NEW small section in `Sidebar.jsx`): "$12.34 this month · 47 queries".
3. **Settings page** (Phase 8): full breakdown by profile + monthly chart.

---

## 4. Settings Page

### 4.1 Routing: pure React state, NO router lib

**Decision:** Slide-out panel from the right (drawer pattern), triggered from a gear icon in `Header.jsx`. `useState` boolean en `App.jsx`.

### 4.2 Backend vs client-side split

| Setting | Where | Why |
|---------|-------|-----|
| `theme` (light/dark) | localStorage (already done in v1.0 via `useTheme`) | Pure UI |
| `font_size_override` | localStorage | Pure UI |
| `density` (comfortable/compact) | localStorage | Pure UI |
| `stage4_threshold` | **request body field** | Backend reads it per-request from request, NOT from localStorage server-side |
| `monthly_cap_warning_threshold` | localStorage (default 80%) | UI-only, used for cost banner |

**`stage4_threshold` mechanism:**
- Frontend stores threshold in localStorage.
- `api.sendMessageStream` reads it and includes in request body when profile is `quality_research`.
- Backend `SendMessageRequest` gets new field: `stage4_threshold: int | None = None`. If absent, falls back to `PROFILES["quality_research"]["stage4_threshold"]`.
- `research_strategy.run(query, config, threshold_override=None)` accepts optional override.

```python
class SendMessageRequest(BaseModel):
    content: str
    profile: Literal["fast", "quality", "quality_research"] = "fast"
    stage4_threshold: Optional[int] = Field(None, ge=1, le=10)
```

---

## 5. Mobile Responsive

### 5.1 CSS-first, JS gestures opcional

**Decision:** Custom `useTouchSwipe` hook (~30 LOC) — NO library.

**Hook signature:**
```js
useTouchSwipe(elementRef, {
  onSwipeRight: () => openSidebar(),
  onSwipeLeft: () => closeSidebar(),
  edgeThreshold: 20,
  distanceThreshold: 50,
});
```

**Touch targets:** Add CSS variable `--touch-target-min: 44px` in tokens. Audit existing buttons (`.send-button`, `.attachment-remove`, `.conversation-item`, `QualityToggle` segments) for `min-height` / `min-width` >= 44px on mobile breakpoint.

**Focus trap:** When drawer is open on mobile, trap Tab focus within drawer using `useFocusTrap` hook (~25 LOC).

---

## 6. Visual Regression + Automated Tests

### 6.1 Backend tests

**Layout:** `backend/tests/` (NEW). pytest + pytest-asyncio + httpx.AsyncClient.

```
backend/tests/
├── __init__.py
├── conftest.py             # fixtures: tmp DATA_DIR, dummy OPENROUTER_API_KEY, monkeypatch query_model
├── test_storage.py         # CRUD + UUID validation + ConversationNotFoundError
├── test_main_routes.py     # endpoint contracts + 400/404/422
├── test_council.py         # stage1/2/3 with mocked openrouter
├── test_research_strategy.py  # critic parser + threshold gating
└── test_critique.py        # external research integration
```

**Run command:** `uv run pytest backend/tests/ -v`.

### 6.2 Frontend tests

**Stack:** vitest + @testing-library/react + @testing-library/jest-dom.

**Layout:** Co-located `*.test.jsx` next to components.

**`package.json`:** add `"test": "vitest"`, deps `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.

### 6.3 Visual regression (Playwright)

**Layout:** `frontend/visual-tests/` (NEW root).

```
frontend/visual-tests/
├── playwright.config.ts
├── snapshots/
└── tests/
    ├── welcome-state.spec.ts
    ├── stage3-highlight.spec.ts
    ├── error-banner.spec.ts
    ├── sidebar-empty.spec.ts
    ├── theme-toggle.spec.ts
    └── critique-form.spec.ts
```

**Mock backend:** Use `page.route()` to intercept `/api/*` calls and return fixtures.

### 6.4 CI: out of scope for v2.0

**Decision:** No GitHub Actions in v2.0. Tests are runnable locally.

---

## Build Order (suggested phases)

| Phase | Theme | Why this order | Deps |
|-------|-------|----------------|------|
| **5** | Persistence completeness (PERS-V2-01) | Smallest change — unblocks every downstream feature that wants to inspect historical conversations. | None |
| **6** | Cost analytics | Builds on persistence: add `cost` key to the now-persisted `metadata` dict. | Phase 5 |
| **7** | External Deep Research Critique | Largest feature, isolated module-wise. Best done when persistence is solid. | Phase 5, 6 |
| **8** | Settings page | Needs cost analytics to display the monthly aggregate. | Phase 6 |
| **9** | Mobile responsive | Frontend-only, touches CSS + 2 hooks. | Phase 8 |
| **10** | Visual regression + automated tests | At the end, locks the now-stable surface. | All previous |

---

## Open Questions for Roadmapper

1. **Critique flow profile selection:** Locked to `quality` (3 council models matching the 3 uploaded files), or expose toggle? Recommend lock — file count = model count is a structural invariant.
2. **OpenRouter cost field verification:** A 5-min spike before Phase 6 to print `data` from a real call and confirm `usage.cost` shape. Don't assume.
3. **Critique mode in Sidebar:** Add a small badge ("C") on critique conversations? Recommend yes for at-a-glance discrimination.
4. **`stage4_threshold` exposure:** Defer to v2.1? Settings just exposes theme + font_size + density for now.
5. **Monthly cost cap visualization:** Progress bar at 80% threshold or just numeric? Recommend progress bar.
6. **CI in v2.0:** Confirmed out of scope — but document test commands in README.

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Endpoint design (multipart vs JSON) | HIGH | Pydantic + FastAPI behavior well-understood |
| Storage schema additions | HIGH | Existing `metadata` dict already opaque |
| SSE protocol reuse for critique | HIGH | Verified events already exist |
| `stage1` parameterization vs new module | HIGH | Lock from PROJECT.md is explicit |
| OpenRouter `cost` field shape | MEDIUM | Needs runtime verification |
| `query_models_individually` necessity | HIGH | `query_models_parallel` sends same `messages` to all |
| Test framework choices | HIGH | pytest + vitest + playwright are de facto |
| Phase ordering | MEDIUM | Reasonable; user may want critique earlier for value-first delivery |
