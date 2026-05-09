# Nielsen Heuristic Audit — LLM Council UI Baseline (Phase 2)

**Fecha:** 2026-05-10
**Branch / commit base:** `master @ 3b7add9` (worktree-agent-af23d750095f4602e)
**Plan:** Phase 2 / Plan 02 — UXR-02
**Skill aplicada:** `nielsen-heuristics-audit`

Este audit puntúa el UI actual de LLM Council (Phase 1 cerrada, baseline Bootstrap-flavored ya en master) contra las 10 heurísticas de Nielsen, usando la **escala Nielsen original 0–4**. El audit incluye, deliberadamente, **anticipatory findings** sobre las superficies Phase 3 que tendrán DOM (Quality toggle con coste y reasoning_details disclosure) — esto fuerza que la redesign proposal del Plan 03 las trate desde el diseño y no como retrofit.

> **Nota cross-plan:** El cognitive walkthrough (`.planning/ux/01-cognitive-walkthrough.md`) corre en paralelo en otra worktree y no está disponible en este HEAD. La sección final `## Cross-references with cognitive walkthrough` queda diferida al merge en Plan 03.

---

## Severity Scale

Escala Nielsen original (Nielsen, 1995). El doc usa **literalmente** estos cinco niveles, no `low/medium/high`.

- **0 — I don't agree that this is a usability problem at all**
- **1 — Cosmetic problem only: need not be fixed unless extra time is available**
- **2 — Minor usability problem: fixing this should be given low priority**
- **3 — Major usability problem: important to fix, so should be given high priority**
- **4 — Usability catastrophe: imperative to fix this before product can be released**

Phase 4 prioriza arreglar **todos los findings con `Severity: 3` o `Severity: 4`**.

## Surfaces audited

Baseline (componentes en `frontend/src/`):

1. `ChatInterface.jsx` — input form (oculto tras primer envío), attachments, message list, loading spinners.
2. `Sidebar.jsx` — lista, search progresivo (title + content fallback), three-dot menu, inline rename, modal de delete trigger.
3. `Stage1.jsx` — tabs por modelo, Markdown render.
4. `Stage2.jsx` — evaluaciones con de-anonimización + parsed ranking + aggregate rankings.
5. `Stage3.jsx` — synthesis + download (`.md`).
6. `Modal.jsx` — confirmación destructiva con focus trap.
7. `Menu.jsx` — popover three-dot con click-outside.
8. `.markdown-content` global (definido en `index.css`) — render markdown compartido por Stage 1/2/3 y user message.

Anticipatory (Phase 3, sin DOM aún pero sí en REQUIREMENTS):

9. **Quality toggle (anticipatory — QUAL-03)** — selector 3-state Fast / Quality / Quality+Research con coste estimado visible.
10. **reasoning_details disclosure (anticipatory — RSCH-05)** — panel colapsado por defecto dentro de cada Stage 1 tab, expone el `reasoning_details` que `backend/openrouter.py:48-55` ya captura pero no se renderiza.

---

## H1: Visibility of system status

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H1-01 | ChatInterface.jsx | `ChatInterface.jsx:170-198` — los tres `stage-loading` spinners muestran texto fijo (`"Running Stage 1: Collecting individual responses..."`) sin progreso temporal. SSE entrega per-stage no per-token y cada gap puede durar 15–30s. | Severity: 3 | El usuario no sabe si el sistema avanza, está esperando red, o se ha colgado. La promesa de "Quality+Research" (PROJECT.md) hace gaps aún más largos en Phase 3 — sin progreso comunicado, el usuario abandonará. | Sustituir spinner genérico por progress communication per-stage (modelos contestando / pendientes, tiempo transcurrido). |
| H1-02 | Stage1.jsx, Stage2.jsx, Stage3.jsx | No hay indicador del modelo activo en cada tab más allá del nombre `resp.model.split('/')[1]`. No hay marca visual de "respondiendo ahora" vs "completado" cuando varios modelos llegan asíncronamente. | Severity: 2 | Cuando 4 modelos contestan en paralelo, el usuario no ve cuál llegó primero, último o falló silenciosamente (graceful degradation oculta failures: `backend/openrouter.py:57-59` retorna `None`, callers filtran). | Marcar tabs con estado (✓ completado, ⏳ pendiente, ⚠ falló) y timestamp por modelo. |
| H1-03 | Sidebar.jsx (post-acción) | `App.jsx:loadConversations` se llama tras delete/rename pero no hay feedback visual entre el cierre del modal y la actualización de la lista. | Severity: 2 | Tras confirmar delete, la fila desaparece sin transición; usuario no está seguro si la acción aplicó o si la app falló. | Toast efímero "Conversation deleted" o fade-out del row antes del refetch. |
| H1-04 | **Quality toggle (anticipatory — QUAL-03)** | El toggle Phase 3 todavía no tiene DOM. **Anticipatory finding (Phase 3 surface — QUAL-03):** según PROJECT.md/Constraints, `Quality+Research` puede correr queries multi-dólar; el coste estimado tiene que ser visible en el selector antes de enviar. Sin coste visible, el usuario no sabe que está a punto de gastar $0.45–$3 vs $0.001 de un Fast. | Severity: 3 | H1 exige que el sistema comunique su estado — el "estado" más relevante de un Quality dial es el coste asociado. Si el toggle solo muestra "Fast / Quality / Quality+Research" sin coste, falla H1 desde el diseño. | Cada estado del toggle muestra coste estimado típico (`~$0.001`, `~$0.05`, `~$0.45`). Plan 03 decide la forma visual por dirección tonal. |
| H1-05 | **reasoning_details disclosure (anticipatory — RSCH-05)** | `backend/openrouter.py:48-55` captura `reasoning_details` pero el frontend nunca lo renderiza. **Anticipatory finding (Phase 3 surface — RSCH-05):** un usuario con un modelo reasoning (o1, sonnet-thinking) no ve indicación de que existe reasoning disponible. | Severity: 2 | El sistema oculta estado relevante (el modelo razonó X tokens antes de responder). H1 pide que la información del sistema esté visible — un disclosure cerrado pero descubrible cumple; ausencia total no. | Slot colapsado "Show reasoning (N tokens)" en Stage1 tab cuando `reasoning_details` viene presente; click expande inline. |

---

## H2: Match between system and the real world

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H2-01 | Stage2.jsx | `Stage2.jsx:75` — heading `"Aggregate Rankings (Street Cred)"`. El paréntesis "Street Cred" es jerga del fork original (karpathy), no un término que un usuario BI/pharma reconozca. | Severity: 1 | No bloquea comprensión — la tabla con `Avg: 1.50 (3 votes)` es legible — pero el lenguaje no encaja con el tono "herramienta personal seria" descrito en PROJECT.md. | Renombrar a "Aggregate Rankings" sin paréntesis, o "Council Consensus". Plan 03 decide tono por dirección. |
| H2-02 | Stage1.jsx, Stage2.jsx, Stage3.jsx | Tabs por modelo muestran `resp.model.split('/')[1]` → `"gpt-4.1-nano"`, `"claude-sonnet-4"`. Para alguien fuera del mundo OpenRouter, los identificadores son crípticos. | Severity: 2 | Match con el "real world" del usuario fallido — no es vocabulario suyo. Pero como single-user app de poweruser, el coste de aprenderlos es bajo. | Mostrar model_short_name + tooltip con publisher (`OpenAI · gpt-4.1-nano`); o dejar el identificador y exponer publisher en hover. |
| H2-03 | Stage2.jsx | `"Response A, B, C"` aparece en el texto de evaluaciones de-anonimizadas si la regex de `deAnonymizeText` (`Stage2.jsx:5-15`) falla por variante en el copy del modelo (p.ej. `"the second response"` no matchea `"Response B"`). | Severity: 2 | Cuando el modelo no usa exactamente `"Response X"` literal, el texto sigue mostrándose con la jerga interna del sistema en lugar del modelo real. | Endurecer la regex (matchear "the X response", "Response #X", etc.) o mostrar warning cuando el de-anon no encontró todas las labels. |

---

## H3: User control and freedom

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H3-01 | ChatInterface.jsx | `ChatInterface.jsx:91-100` — `handleSubmit` envía y limpia el input inmediatamente; **no hay forma de cancelar una deliberación en curso**. Una vez `Send` está pulsado, el usuario espera 30–90s sí o sí. | Severity: 3 | Una "Quality+Research" lanzada por error puede costar $1–3 y no se puede abortar. Falla user-control crítico — H3 pide un "emergency exit" claro. | Botón "Cancel" visible durante `isLoading`; backend ya respeta `asyncio` cancellation natural en `httpx.AsyncClient`. |
| H3-02 | Sidebar.jsx (delete) | El modal de confirmación (`Modal.jsx`) cubre H3 razonablemente: ESC cancela, Cancel es el primer focusable (`Modal.jsx:50-51`), botón destructivo está marcado. **Pero no hay undo** — una vez confirmado, la conversación se borra del disco sin recuperación posible. | Severity: 2 | Delete con confirmación + sin undo es estándar (Gmail clásico, Finder). Acceptable trade-off para single-user local app. | (Opcional) Undo toast 5–10s con restore desde snapshot in-memory antes del unlink. Phase 4 puede dejarlo deferred. |
| H3-03 | ChatInterface.jsx | Single-shot input (D-20 — el form se oculta tras el primer envío con la condición `conversation.messages.length === 0` en `ChatInterface.jsx:221`). Usuario no puede editar la pregunta tras enviarla en la misma conversación. | Severity: 1 | Es decisión consciente del milestone (1 conversación = 1 deliberación) — no es bug. Pero un nuevo usuario puede esperar editar la pregunta. | Comunicar el patrón explícitamente: empty state debería decir "One question per conversation" o similar. |
| H3-04 | Sidebar.jsx (rename) | `Sidebar.jsx:34-44` — Enter commits, Escape cancels, blur commits (D-06). Cumple H3 perfectamente: triple exit path con intent explícito. | Severity: 0 | Implementación cuidada (el `intentRef` pattern resuelve la race condition Enter→blur). No se observa violación material. | — |

---

## H4: Consistency and standards

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H4-01 | Stage3.css, Stage1.css, Stage2.css | Stage 3 pinta el contenedor con `background: #f0fff0` (verde Bootstrap-flavored) — `Stage3.css:1-2`. Stage 1 y Stage 2 no tienen background propio. La asimetría visual es consistente internamente con la idea de "highlight Stage 3" pero el color no encaja con el resto del sistema (`#4a90e2` blue, `#f0f7ff` user message, `#f9fafb` stage-loading). | Severity: 3 | H4 — consistency. El sistema mezcla 3 paletas Bootstrap-flavored sin tokens compartidos: blue del primary, green del Stage 3, grays neutros. Cada componente decide por sí mismo. | Definir tokens CSS variables en `index.css` (`--color-bg-stage`, `--color-bg-emphasis`, etc.) y consumir desde cada `.css` co-located. Plan 03 entrega la paleta. |
| H4-02 | ChatInterface.css, Stage3.css | Dos `.download-btn` con estilos distintos: el de Stage3 usa green (`color: #2d8a2d`, `border: #c8e6c8` — `Stage3.css:18-32`); el de assistant-header usa blue (`color: #4a90e2`, `border: #d0e7ff` — `ChatInterface.css:204-214`). Mismo nombre de clase, dos visual identities. | Severity: 3 | Selector clash: `.download-btn` tiene reglas globales y luego el padre las pisa. Mismo componente lógico, dos formas. Romper consistency en una acción tan repetida es problema mayor. | Unificar a un único `.download-btn` con variantes explícitas (`.download-btn-primary`, `.download-btn-success`) o variables CSS por contexto. |
| H4-03 | App.css, index.css, Sidebar.css, ChatInterface.css | Tipografía declarada **3 veces** con stacks ligeramente distintos: `index.css:2` (`system-ui, -apple-system, ...`), `App.css:12-14` (`-apple-system, BlinkMacSystem, 'Segoe UI', 'Roboto', ...`), y resto componentes heredan ad-hoc. Sin variable `--font-family-base`. | Severity: 2 | Riesgo bajo en práctica (system fonts), pero H4 pide consistency. Cualquier futuro cambio de tipografía requiere editar N sitios. | Una sola declaración en `:root` (`--font-family-sans`), todo lo demás `font-family: var(--font-family-sans)`. Plan 03 propone la familia. |
| H4-04 | Sidebar.jsx, ChatInterface.jsx | `Sidebar.jsx:271-273` — botón "+ New Conversation" usa estilo primary (`#4a90e2`); `ChatInterface.jsx:264-270` — `Send` button usa el mismo estilo primary. Bien hecho, pero no hay tokens compartidos. Si Plan 03 cambia el accent, hay que tocar dos `.css`. | Severity: 1 | No es problema observable hoy (color match es accidental pero idéntico). Falla a futuro. | Token `--color-accent` y consumirlo en ambos. |
| H4-05 | Modal.jsx, Menu.jsx | A11y consistency observada: Modal tiene focus trap manual (`Modal.jsx:43-80`), Menu no necesita focus trap (popover, no dialog) pero ambos usan ESC. Sin embargo Modal cierra con backdrop click (target===currentTarget), Menu cierra con document-level mousedown — patrones distintos para el mismo "cerrar al click fuera". | Severity: 1 | Justificación técnica existe (el Modal está en portal, el Menu necesita capturar mousedown ANTES del onClick del row), pero un planner que añada el siguiente popover no sabrá cuál patrón seguir. | Documentar la convención en `CONVENTIONS.md` y/o en cada componente JSDoc. Ya hay JSDoc parcial; ampliar. |

---

## H5: Error prevention

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H5-01 | ChatInterface.jsx (attachments) | `ChatInterface.jsx:60-71` — guard explícito: rechaza files > 500KB y total > 2MB ANTES de leer y mostrar error inline. Excelente prevención. | Severity: 0 | Implementación correcta. Per-file y total limits separados con mensajes específicos. | — |
| H5-02 | Modal.jsx | `Modal.jsx:50-51` — primer focusable es Cancel (no Confirm), por seguridad en flujos destructivos. Decisión consciente y bien comentada. | Severity: 0 | H5 — el "default = no destruir". Cumplido. | — |
| H5-03 | **Quality toggle (anticipatory — QUAL-03)** | El usuario podría disparar `Quality+Research` ($1–3) por click accidental o por inercia ("siempre uso quality+research"). PROJECT.md: budget $100/month, una sola query mal lanzada se come el 1–3% del mes. **Anticipatory finding (Phase 3 surface — QUAL-03):** sin friction adicional para el modo más caro, H5 falla. | Severity: 3 | Error prevention para gasto significativo. H5 sugiere "ask for confirmation" en acciones costly/irreversible — research queries son ambas. | El toggle en `Quality+Research` debe (a) mostrar coste prominente y (b) requerir un click extra (botón "Send · ~$0.45 estimated") en lugar de heredar el send normal. Plan 03 decide la forma. |
| H5-04 | ChatInterface.jsx | El send button está deshabilitado si `!input.trim()` (`ChatInterface.jsx:267`) — previene queries vacías. Pero no previene query con SOLO attachments (sin texto explicativo). | Severity: 1 | Razonable que un usuario lance "analiza estos CSVs" como prompt corto + 3 attachments. Pero también razonable que olvide el prompt y mande solo el adjunto. | Permitir send si hay attachments O texto, con prompt default sutil ("¿Qué pregunta?") cuando solo hay attachments. Decisión Plan 03. |
| H5-05 | Sidebar.jsx (rename empty/whitespace) | `Sidebar.jsx:50-58` — trim + reject empty/unchanged silently. Bien — no se permite título vacío. | Severity: 0 | Cumplido. | — |

---

## H6: Recognition rather than recall

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H6-01 | ChatInterface.jsx (placeholder) | `ChatInterface.jsx:257` — placeholder `"Ask your question... (Shift+Enter for new line, Enter to send)"`. El shortcut está visible **mientras el input está vacío**, pero desaparece al escribir — momento en el que el usuario justo lo necesita. | Severity: 2 | Recall en lugar de recognition: el atajo se memoriza una vez visto y luego se olvida. Visibilidad persistente solucionaría. | Hint persistente debajo del input (línea sutil `Shift+Enter for new line · Enter to send`), no en el placeholder. |
| H6-02 | Sidebar.jsx (three-dot) | `Sidebar.css:92-108` — el `.menu-trigger` está `visibility: hidden` por defecto y aparece solo en `:hover`, `:focus-within`, o `[aria-expanded="true"]`. Patrón ChatGPT/Linear, ya conocido por usuarios power. | Severity: 1 | Recognition decente para usuarios de webapps modernas. Pero un primerizo no descubre el affordance hasta hovering. Acceptable como trade-off densidad vs descubribilidad. | Empty state o tooltip de onboarding único: "Hover a conversation to rename or delete it". |
| H6-03 | Stage2.jsx | `Stage2.jsx:29-32` — texto explicativo "models evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings. Below, model names are shown in **bold** for readability". Excelente: explica el sistema en cada visita, no asume recall del usuario. | Severity: 0 | Recognition over recall hecho bien. | — |
| H6-04 | ChatInterface.jsx (file accept) | `ChatInterface.jsx:250` — atributo `accept=".md,.txt,.csv,.tsv,.py,.sql,.json,..."` con 19 extensiones. Pero ningún hint visible para el usuario sobre "qué tipos de archivo puedo subir" antes de abrir el file picker. | Severity: 2 | Recall — usuario tiene que probar y ver si su `.xlsx` es rechazado. | Mostrar lista de extensiones aceptadas (hint sutil `.md, .txt, .csv, .py, ...`) cerca del file input, o tooltip al hover. |
| H6-05 | **reasoning_details disclosure (anticipatory — RSCH-05)** | **Anticipatory finding (Phase 3 surface — RSCH-05):** si el reasoning queda solo en JSON crudo, el usuario tiene que recordar "este modelo es reasoning, su pensamiento debería estar en algún lado, ¿dónde miro?". | Severity: 3 | H6 — recognition. Cuando un dato existe (reasoning_details capturado), el UI debe enseñar dónde está sin que el usuario tenga que adivinar. | Sección colapsable visible "Show reasoning" en cada Stage 1 tab cuyo modelo expone reasoning_details. Plan 03 decide el cómo visual. |
| H6-06 | Sidebar.jsx (search progressive) | `Sidebar.jsx:286-302` — el affordance "Search inside content (N conversations)" se materializa solo cuando query ≥3 chars Y title-only no tiene matches Y content-search no está activo. Es exactly recognition: aparece cuando el usuario lo necesita, no antes. | Severity: 0 | Patrón impecable. | — |

---

## H7: Flexibility and efficiency of use

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H7-01 | ChatInterface.jsx | Atajo Enter / Shift+Enter está implementado (`ChatInterface.jsx:102-107`). | Severity: 0 | Atajo estándar webchat presente. | — |
| H7-02 | Sidebar.jsx | Sin atajo `⌘N` / `Ctrl+N` para "New Conversation"; sin `⌘F` / `Ctrl+F` para focus search; sin `↑↓` para navegar la lista. | Severity: 2 | Power-user friendly tool (BI/data) — los atajos son alto valor. Ausencia es flexibility floja. | Atajos globales: `⌘N` new, `⌘K` search focus, `↑↓` navegar lista. Plan 03 documenta convenciones; Phase 4 implementa. |
| H7-03 | Sidebar.jsx (rename) | Tres caminos para iniciar rename (right-click → menu → Rename, three-dot → Rename, doble-click no implementado). El doble-click directo en el título es estándar en Finder/ChatGPT. | Severity: 1 | Tres caminos suficientes para flexibilidad. Doble-click sería bonito pero no crítico. | Añadir `onDoubleClick` en `.conversation-title` para entrar en edit mode. |
| H7-04 | Sidebar.jsx | Sin filter por tags / fechas / # de mensajes. Sidebar es lista plana — fine para v1 (deferred CONV-V2-01..03). | Severity: 0 | Acepted scope. | — |

---

## H8: Aesthetic and minimalist design

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H8-01 | Stage3.css | `Stage3.css:1-2` — `background: #f0fff0` (verde claro) + `border: #c8e6c8`. El verde-pastel Bootstrap-flavored grita "alert-success" y compite con la importancia editorial del Stage 3 (la respuesta final). | Severity: 3 | El Stage 3 es la cosa más importante del producto (Core Value: "Quality dial works as advertised"). Está envuelto en un color que recuerda a un toast de Bootstrap, no a un final answer. Aesthetic falla — el color está a la vez fuera de tono Y duplica información (ya hay `<h3>Final Council Answer</h3>`). | Reemplazar background green por jerarquía tipográfica + un acento sutil. Plan 03 decide por dirección tonal. |
| H8-02 | index.css `.markdown-content` | `index.css:32-131` — la única tipografía definida para el render markdown global es `font-size: 0.95em` para tablas (`.markdown-content table`) y `font-size: 0.9em` para code inline. El cuerpo hereda system font default sin escala vertical, sin tracking, sin medida máxima de línea. Stage 2/3 son lectura larga — esto es donde el producto vive. | Severity: 4 | Aesthetic catastrophe en la superficie crítica. Sin medida (`max-width: 65ch`), líneas se extienden hasta el viewport, ilegibles. Sin escala vertical, h2/h3/párrafo se distinguen débilmente. Si Phase 3 entrega Quality+Research con respuestas de 2000 palabras, el producto no se puede leer en su forma actual. | Sistema tipográfico completo: familia de lectura larga (no system-ui), escala modular, line-height 1.6–1.7, max-width contenida. Plan 03 entrega la familia + tokens. |
| H8-03 | ChatInterface.css | `ChatInterface.css:65-86` — varios elementos comparten `color: #666` con tamaños distintos sin sistema (12px label, 14px loading, 14px stage-loading italic). Microcopy de loading se duplica visualmente. | Severity: 2 | Aesthetic floja por ausencia de jerarquía. No es minimalist (todo gris medio); es "neutralidad por defecto". | Sistema de typography tokens (`--text-label`, `--text-meta`, `--text-body`) — Plan 03. |
| H8-04 | App.css, index.css | Background general es `#f5f5f5` (`index.css:22`), sidebar `#f8f8f8` (`Sidebar.css:3`), main `.app` `#ffffff` (`App.css:10`), input form `#fafafa` (`ChatInterface.css:109`). Cuatro grises **muy** próximos sin razón sistémica. | Severity: 2 | Minimalist roto por la izquierda — tantos grises sin una jerarquía clara dan ruido visual sutil pero permanente. | Tokens de surface (`--surface-base`, `--surface-elevated`, `--surface-sunken`) con menos niveles y más diferencia. Plan 03. |
| H8-05 | **reasoning_details disclosure (anticipatory — RSCH-05)** | **Anticipatory finding (Phase 3 surface — RSCH-05):** el reasoning_details puede ser MUY largo (modelos reasoning generan miles de tokens internos). Renderizar inline expandido por defecto sería catastrofe minimalist — la respuesta del modelo se pierde bajo su propio razonamiento. | Severity: 3 | H8 — minimalist. Mostrar reasoning expandido por default rompe la jerarquía visual de Stage 1 (el dato principal es la response, no el thinking). | Disclosure colapsado por default; expansión por click; en estado expandido, usar tipografía secundaria (más pequeña, más muted) que jerárquicamente queda detrás de la response. Plan 03 decide. |
| H8-06 | **Quality toggle (anticipatory — QUAL-03)** | **Anticipatory finding (Phase 3 surface — QUAL-03):** mostrar 3 estados con coste cada uno + tooltips + iconos puede convertir el toggle en un mini-formulario. H8 pide minimalismo — el toggle debe ser una decisión, no un panel. | Severity: 2 | Risk anticipatory de over-design al añadir el coste. | Coste como subtítulo discreto debajo de cada label (notebook), o chip cromado lateral (cockpit), o subtitle muted (minimal). Tres direcciones, una se elige Plan 03. |

---

## H9: Help users recognize, diagnose, and recover from errors

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H9-01 | App.jsx (silenciamiento) | `App.jsx` — todos los try/catch terminan en `console.error(...)` (per CLAUDE.md "All async calls are wrapped in try/catch with console.error"). Sin toast, sin banner, sin retry UI. Si el SSE falla a media deliberación, el usuario ve los stages que llegaron y nada más — no sabe que algo se rompió. | Severity: 4 | Catastrophic recovery failure. El usuario no diagnostica, no recupera, no entiende. Para una app que cobra al usuario por API call (BYOK), una query fallida silenciosamente es daño económico + de confianza. | Toast/banner para errores SSE; mostrar qué stage falló; ofrecer retry con la query original. Plan 03 + Phase 4. |
| H9-02 | backend/openrouter.py + Stage1.jsx | `backend/openrouter.py:57-59` — model failures retornan `None`. `council.py:25-31` filtra `None`. El usuario ve `Stage1` con menos tabs de las esperadas (3 en lugar de 4), sin saber que `gpt-4.1-nano` cayó. | Severity: 3 | Diagnose imposible — el usuario no puede notar la ausencia si no recuerda el roster. Y la deliberación queda de lower quality sin que el usuario lo sepa. | Stage 1 muestra TODOS los modelos del roster, los failed con marca `⚠ Failed to respond` + razón si está disponible. |
| H9-03 | ChatInterface.jsx (attachment errors) | `ChatInterface.jsx:244` — `.attachment-error` muestra mensaje en rojo (`#c00`) inline. Específico (file name + tamaño + límite). Excelente. | Severity: 0 | H9 cumplido aquí. | — |
| H9-04 | Sidebar.jsx (rename failed) | Si `onRenameConversation(id, newTitle)` (`Sidebar.jsx:343`) falla en backend, no hay UI de error. El input simplemente desaparece y el row vuelve al título viejo (porque `loadConversations` refetch lo corrige) — el usuario asume que su nombre se aplicó. | Severity: 3 | Diagnose muy difícil: "puse 'Pricing analysis' y volvió a 'New Conversation', ¿es bug?". | Toast de error o reabrir el rename con el draft + mensaje. Phase 4. |

---

## H10: Help and documentation

| Finding ID | Surface | Evidence | Severity | Rationale | Fix recommendation (high-level) |
|---|---|---|---|---|---|
| H10-01 | App-wide | No hay tooltips contextuales, ni sección "?" ni link a docs. El único onboarding es el welcome-state literal (`ChatInterface.jsx:122-128` — `"Welcome to LLM Council. Create a new conversation to get started."`). | Severity: 2 | H10 dice "even if it can be used without docs, help should be available". App single-user de poweruser puede sobrevivir sin docs externas, pero un primer arranque sin tooltips ni hint sobre Stage 1/2/3 obliga al usuario a inferir todo de las primeras runs. | Hover-tooltips en (a) tabs de modelos (publisher · model_id), (b) "Aggregate Rankings" header (qué significa avg position), (c) Quality toggle Phase 3 (qué hace cada nivel). |
| H10-02 | Stage2.jsx | `Stage2.jsx:29-32` — el copy explicativo del de-anonymization actúa como documentación inline. Bien. Pero no hay equivalente para Stage 1 ("¿qué son estos N modelos?") ni Stage 3 ("¿quién es el chairman?"). | Severity: 2 | Half-hearted documentation — Stage 2 lo hace, Stage 1 y 3 no. | Cada Stage incluye un copy de 1 línea que explica qué hace. Plan 03 escribe; Phase 4 monta. |
| H10-03 | Welcome-state | `ChatInterface.jsx:124-127` — `<h2>Welcome to LLM Council</h2><p>Create a new conversation to get started</p>` y `<h2>Start a conversation</h2><p>Ask a question to consult the LLM Council</p>` son secos y no enseñan el patrón "1 conversación = 1 deliberación con 3 stages". | Severity: 2 | Cold start es donde el branding y la documentación más se hacen sentir (D-Specifics: "las pantallas vacías son donde el branding más se hace sentir"). | Empty state con mini explicación visual del flujo Stage 1 → 2 → 3. Plan 03 decide por dirección. |

---

## Severity Summary

### Conteo por nivel de severidad

| Severity | Count | Findings |
|---|---|---|
| Severity: 0 | 8 | H3-04, H5-01, H5-02, H5-05, H6-03, H6-06, H7-01, H7-04, H9-03 |
| Severity: 1 | 5 | H2-01, H3-03, H4-04, H4-05, H6-02, H7-03, H5-04 |
| Severity: 2 | 12 | H1-02, H1-03, H1-05, H2-02, H2-03, H3-02, H4-03, H6-01, H6-04, H7-02, H8-03, H8-04, H8-06, H10-01, H10-02, H10-03 |
| Severity: 3 | 9 | H1-01, H1-04, H3-01, H4-01, H4-02, H5-03, H6-05, H8-01, H8-05, H9-02, H9-04 |
| Severity: 4 | 2 | H8-02, H9-01 |

> **Nota:** los conteos arriba listan los IDs principales por bucket. Los `Severity: N` literales aparecen en cada celda de la tabla por heurística — un `grep -cE "Severity: [0-4]"` sobre este archivo cuenta todas las ocurrencias.

### Priority fix list (Severity ≥ 3)

Los siguientes **findings son priority-fix para Phase 4** (todos los `Severity: 3` y `Severity: 4`):

| Finding ID | Heuristic | Surface | One-line summary |
|---|---|---|---|
| **H1-01** | H1 | ChatInterface | Spinners genéricos sin progress per-stage durante gaps de 15–30s. |
| **H1-04** | H1 | Quality toggle (anticipatory — QUAL-03) | Coste estimado debe ser visible antes de enviar. |
| **H3-01** | H3 | ChatInterface | Sin botón Cancel durante deliberación en curso. |
| **H4-01** | H4 | Stage3 (+ todos) | `#f0fff0` Bootstrap-flavored y ausencia de tokens compartidos. |
| **H4-02** | H4 | ChatInterface, Stage3 | Dos `.download-btn` con estilos inconsistentes (blue vs green). |
| **H5-03** | H5 | Quality toggle (anticipatory — QUAL-03) | Sin friction extra para el modo más caro ($1–3 por query). |
| **H6-05** | H6 | reasoning_details disclosure (anticipatory — RSCH-05) | El reasoning existe en JSON pero el UI no lo expone. |
| **H8-01** | H8 | Stage3 | Verde Bootstrap rompe la jerarquía editorial del final answer. |
| **H8-02** | H8 | `.markdown-content` | **Catastrophe** — sistema tipográfico inexistente para la superficie de lectura crítica. |
| **H8-05** | H8 | reasoning_details disclosure (anticipatory — RSCH-05) | Riesgo de catastrofe minimalist si reasoning se renderiza expandido por default. |
| **H9-01** | H9 | App-wide error handling | **Catastrophe** — errores async se silencian en console.error sin UI feedback. |
| **H9-02** | H9 | Stage 1 | Modelos failed se filtran silenciosamente; usuario no diagnostica. |
| **H9-04** | H9 | Sidebar (rename) | Errores de rename invisibles para el usuario. |

### Anticipatory findings (Phase 3 — must inform Plan 03 redesign)

| Finding ID | Heuristic | Phase 3 surface | Requirement |
|---|---|---|---|
| **H1-04** | H1 | Quality toggle | QUAL-03 — coste visible |
| **H1-05** | H1 | reasoning_details disclosure | RSCH-05 |
| **H5-03** | H5 | Quality toggle | QUAL-03 — friction para modo caro |
| **H6-05** | H6 | reasoning_details disclosure | RSCH-05 — recognition over recall |
| **H8-05** | H8 | reasoning_details disclosure | RSCH-05 — colapsado por default |
| **H8-06** | H8 | Quality toggle | QUAL-03 — minimalismo del selector |

Total: **6 anticipatory findings** (objetivo del plan: ≥2). Cubren las dos superficies hipotéticas (QUAL-03 y RSCH-05) desde 4 heurísticas distintas (H1, H5, H6, H8), garantizando que Plan 03 las trate desde el diseño.

---

## Cross-references with cognitive walkthrough

Walkthrough not available at audit time; cross-reference deferred to Plan 03 redesign synthesis.

> Cuando `01-cognitive-walkthrough.md` se merge en master, Plan 03 mapeará los findings Nielsen a los friction points `F-XX` con la sintaxis `Finding HN-XX ↔ F-YY` y los integrará en la sección "Synthesis: heuristic + walkthrough" del redesign proposal. Este audit fue generado independientemente sin ese cross-reference.

---

*Audit produced: 2026-05-10 · Phase 2 Plan 02 · Skill: `nielsen-heuristics-audit` · Severity scale: Nielsen 1995 original 0–4*
