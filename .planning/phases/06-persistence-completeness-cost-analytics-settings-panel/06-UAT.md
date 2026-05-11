---
status: complete
phase: 06-persistence-completeness-cost-analytics-settings-panel
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md
started: 2026-05-11T00:00:00Z
updated: 2026-05-11T06:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend + frontend. `bash start.sh` arranca sin errores. Backend en `127.0.0.1:8001` responde a `GET /api/conversations` con array JSON. Frontend en `localhost:5173` carga sin errores en consola.
result: pass
note: Console logs en chino provienen de extensión Chrome "CLEARLY" (TTS reader), no de la app. App logs limpios.

### 2. PERS-01/02 — Reload Quality v2.0 Conversation
expected: Crear o abrir una conversación v2.0 con perfil `Quality` o `Quality+Research` que ya tenga al menos un mensaje del council. Recargar la página (F5). En la tab Stage 2 los nombres de modelo aparecen de-anonimizados (`openai/gpt-5.5`, `anthropic/claude-opus-4.7`, etc.) en lugar de "Response A/B/C". La tabla de aggregate rankings sigue completa.
result: pass
note: "El reload hidrata correctamente. Durante el test el usuario descubrió un crash incidental al cambiar de conversación mid-stream — race condition pre-existente, ver Gaps."

### 3. COST-02 — MessageHeader Cost Line
expected: Enviar una pregunta nueva en modo `Quality` o `Quality+Research`. Cuando termina la deliberación, en el `MessageHeader` del mensaje del council aparece una línea de coste estática (sin animación) tipo `$0.000824 upstream` (la microcopy `· $0.000 fee` aparece oculta porque BYOK enforcement deja `cost == 0`). Si total es <$0.001, la línea entera se oculta.
result: pass

### 4. COST-03 + COST-04 — Sidebar Cost Footer
expected: Tras enviar 1+ queries del mes en curso, en el footer del Sidebar aparece un bloque dual-column: columna izquierda `OpenRouter $0.00 / $100` (sin progress bar porque <80% cap), columna derecha `Upstream $X.XX BYOK (no cap)`. Una microcopy debajo: `0.0% of cap · N queries this month`. Al enviar otra query, el footer se actualiza tras el evento `complete` SSE.
result: pass

### 5. SET-01 — Open Settings Panel
expected: En el `Header` aparece un icono de gear (engranaje) junto al toggle de tema. Click en el gear abre un panel desde la derecha (380px de ancho), con título `Settings` y un botón X (`aria-label="Close settings"`). El contenido detrás del panel queda legible — NO hay scrim/overlay oscureciendo. ESC o click fuera del panel lo cierra.
result: pass

### 6. SET-02 — Settings Theme + Font Size + Density Controls
expected: Dentro del panel Settings, 4 controles en orden: Theme toggle (duplicado del header), Font Size radio S/M/L (15/17/19px), Density radio compact/comfortable, stage4_threshold slider 1-10 con valor numérico adyacente y microcopy `Higher = stricter; only refine when answer scores ≥{value}/10`. Cambiar Font Size a L → tipografía crece inmediatamente. Cambiar Density a compact → spacing se reduce inmediatamente. Sin botones Save/Cancel.
result: pass

### 7. SET-04 — FOUC Sync on Reload (Density)
expected: En Settings cambiar Density a `compact`. Cerrar panel. Recargar la página (F5). Al volver a renderizar, el spacing compact aparece desde el primer paint, SIN flicker de comfortable→compact. (Lo mismo con tema: theme `dark` ya tenía este comportamiento; ahora density y fontSize lo replican).
result: pass

### 8. SET-03 — stage4_threshold body field on Quality+Research
expected: En Settings, mover el slider `stage4_threshold` a `3`. Cerrar Settings. Abrir DevTools → Network tab. Enviar una query con perfil `Quality+Research`. En la request `POST /api/conversations/{id}/message`, el body JSON incluye `"stage4_threshold": 3`. La respuesta funciona (critic se gatea con threshold 3).
result: pass
note: |
  User no podía ver Network tab. Verificado por tres vías equivalentes:
  - Pydantic live probe: stage4_threshold=15 → 422 less_than_equal le=10; stage4_threshold=0 → 422 greater_than_equal ge=1. El campo está bound, ge/le constraints activas.
  - api.js líneas 76-77 + 109-110: `if (stage4Threshold !== null && profile === 'quality_research') body.stage4_threshold = stage4Threshold`. Frontend inyecta solo en QR.
  - research_strategy.run threshold_override (verificado en 06-VERIFICATION.md): consume override con Pitfall-3 fallback `is not None ? override : PROFILES[default]`.

### 9. SET-03 — Backward compat: Fast / Quality / Critique requests omit field
expected: Con el slider en 3, enviar query con perfil `Fast`. En el body NO aparece `stage4_threshold` (omitted from JSON). Lo mismo con perfil `Quality` (sin research) y `Critique`. Esos perfiles no usan el threshold; api.js gatea la extensión del body por `profile === 'quality_research'`.
result: pass
note: |
  Cubierto por el mismo proof chain de Test 8. Pydantic Optional con default=None garantiza que requests sin el campo validan como None (ge/le no aplican a None). api.js gate `profile === 'quality_research'` impide inyección en otros perfiles.

### 10. Direction A "calmo" — No animations
expected: Durante la deliberación, ninguna superficie de coste anima. La línea en `MessageHeader` aparece estática post-deliberación (no ticker animado contando hacia arriba). El footer del Sidebar tampoco anima totales. La progress bar (cuando >80%) aparece estática.
result: pass

## Summary

total: 10
passed: 10
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Switching conversations during an active SSE stream must NOT crash the App component."
  status: failed
  reason: "User reported: 'se me ha ocurrido cambiar de conversación mientras esperaba y se ha producido un error'. Console: `App.jsx:167 Uncaught TypeError: Cannot set properties of undefined (setting 'stage1')`. Stack trace points at `lastMsg.loading.stage1 = false` inside the `stage1_complete` SSE event handler."
  severity: blocker
  test: 2
  discovered_during: "Test 2 (PERS-01/02 reload) — incidental finding while waiting for council response, not a regression of Phase 6 code."
  root_cause: "Race condition in handleStreamEvent (App.jsx:151-): SSE events from a previous conversation's stream keep firing setCurrentConversation after the user switched to another conversation via handleSelectConversation. The new conversation's messages were loaded from JSON via loadConversation/api.getConversation — persisted messages do NOT carry a `loading` object (only freshly-sent in-flight messages do). The setter destructures `prev.messages`, takes the last message (loaded from disk, no `loading` key), and tries to set `lastMsg.loading.stage1 = false` → TypeError because `lastMsg.loading` is undefined. Same vulnerability pattern in lines 157, 167, 176, 190, 198 (every *_start / *_complete handler that touches `lastMsg.loading.*`)."
  artifacts:
    - path: "frontend/src/App.jsx"
      issue: "handleStreamEvent has no guard against SSE events for stale conversations."
      lines: "151-200"
  missing:
    - "Defensive guard in handleStreamEvent: skip the SSE event if the conversation ID it refers to no longer matches currentConversationId (the SSE event payload should include or be associated with the conversation it belongs to)."
    - "OR: AbortController cancellation in handleSelectConversation that aborts the in-flight SSE stream before loading the new conversation."
    - "OR (minimal fix): defensive optional-chaining + early-return when `lastMsg?.loading` is undefined — silently drop stale events."
  debug_session: ""
  classification: "Pre-existing race condition exposed by UAT — NOT introduced by Phase 6 changes to App.jsx. Phase 6 only added settingsOpen state, useSettings call, costStatsRefreshTrigger state, and stage4Threshold thread — none of which touch handleStreamEvent."
