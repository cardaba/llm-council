# Cognitive Walkthrough — LLM Council UI Baseline (Phase 2)

**Captured:** 2026-05-10
**Baseline audited:** branch `master` @ commit `3b7add9` (Phase 1 cerrada, Phase 2 plans creados; Phase 3/4 todavía no aplicadas).
**Scope:** UI actual de LLM Council tras Phase 1 (modal de delete, three-dot menu, inline rename, search progresivo). Excluye superficies hipotéticas Phase 3 (Quality toggle, reasoning_details disclosure) que se tratan como anticipatory findings en `02-nielsen-audit.md`.
**Skill applied:** `cognitive-walkthrough` (Nielsen-Polson 4 preguntas por paso).

## Actor Profile

- **Usuario único** — no hay multi-tenant, no hay auth, sin onboarding previo.
- **Perfil BI / data** (Power Query, Snowflake SQL, Power BI). Decisión basada en evidencia, alta tolerancia a densidad informacional, expectativas de productividad tipo herramienta interna.
- **Single-user local app** corriendo en `127.0.0.1:5173` (frontend) + `127.0.0.1:8001` (backend). Sin marketing, sin landing, primer contacto = la propia app abierta en el browser.
- **No hay tutorial integrado** — la app no introduce qué es ni qué hace antes de pedirle algo al usuario.
- **Modelo mental previo:** ChatGPT / Claude / Linear. Espera un sidebar con conversaciones a la izquierda y un panel central de chat. No tiene un modelo mental establecido sobre "deliberación 3-stage anonimizada".

## Method

Cada paso de cada flujo se evalúa con las 4 preguntas Nielsen-Polson de cognitive walkthrough:

- **Q1 — Intención:** ¿Qué intenta hacer el usuario en este paso?
- **Q2 — Disponibilidad:** ¿Está la acción correcta disponible en la UI?
- **Q3 — Visibilidad:** ¿Es la acción correcta visible / descubrible sin pista externa?
- **Q4 — Feedback:** ¿El feedback resultante es comprensible y conecta con la intención?

Cada friction point se etiqueta `Friction F-XX` (numeración global, no reinicia por flujo). Cada friction tiene:

- **Descripción** — 1–2 líneas con el problema concreto.
- **Evidencia** — `componente.jsx:linea` o copy literal entrecomillado.
- **Severity hint** — `low` / `med` / `high`. El hint es indicativo; el `02-nielsen-audit.md` re-puntúa con la escala Nielsen 0–4 oficial.
- **Implication** — dirección genérica para redesign (NO solución concreta — eso vive en `03-redesign-proposal.md`).

Las soluciones concretas no entran en este documento. El walkthrough cubre lo que YA existe en master tras Phase 1.

## Flow 1: Cold start

**Precondición:** El usuario abre la app por primera vez. `data/conversations/` está vacío. La pantalla muestra el sidebar (`Sidebar.jsx`) a la izquierda con el header "LLM Council" + botón "+ New Conversation" + search input + estado vacío "No conversations yet"; el panel central (`ChatInterface.jsx`) muestra el welcome state "Welcome to LLM Council" con copia "Create a new conversation to get started".

### Step 1: Reconocer qué es la app y qué se puede hacer con ella

- **Q1:** El usuario quiere entender qué hace esta app antes de invertir esfuerzo en escribir una pregunta.
- **Q2:** No hay acción que ejecutar aquí — es lectura. La app debe explicarse sola en este momento.
- **Q3:** El sidebar header dice únicamente "LLM Council" (`Sidebar.jsx:271`) y el panel central dice "Welcome to LLM Council / Create a new conversation to get started" (`ChatInterface.jsx:125-126`). No hay tagline, no hay descripción del modelo mental "3 stages + chairman", no hay ejemplo de pregunta, no hay link a docs.
- **Q4:** N/A — no hay acción que produzca feedback.

**Friction F-01:** Welcome state no comunica el valor diferencial del producto.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:125-126` — copy literal "Welcome to LLM Council / Create a new conversation to get started". Cero contexto sobre qué es un "council", qué stages hay, qué hace distinto de ChatGPT.
- **Severity hint:** med
- **Implication:** El cold start desperdicia el momento de mayor receptividad del usuario. El welcome state debe aprovecharse para vender el modelo mental "3-stage + anonymous peer review".

**Friction F-02:** El nombre "LLM Council" es la única pista del modelo mental, y aparece sin tipografía / icono / branding que lo soporte.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:271` — `<h1>LLM Council</h1>` plano, sin logo, sin tagline. No hay header global de app branded (ROADMAP.md Phase 2 explícitamente identifica "header de app branded" como pantalla a mockear).
- **Severity hint:** med
- **Implication:** Falta una identidad visual que ancle el producto. Phase 4 lo resuelve via mockups Phase 2.

### Step 2: Crear la primera conversación

- **Q1:** El usuario interpreta correctamente que tiene que crear una conversación para empezar (la copia "Create a new conversation to get started" lo dice explícitamente).
- **Q2:** Sí — botón "+ New Conversation" en el sidebar header (`Sidebar.jsx:272-274`).
- **Q3:** El botón es discoverable: copy explícito + prefijo "+" + posición top-left esperada. Pero el usuario tiene que hacer un saccade del welcome state central al sidebar superior izquierdo — la copia "Create a new conversation to get started" del welcome NO se enlaza visualmente con el botón (no hay flecha, no hay highlight, no hay foco).
- **Q4:** Tras click, se crea la conversación, se selecciona automáticamente (`App.jsx:43-54`), el sidebar muestra una nueva entrada "New Conversation" con "0 messages", y el panel central cambia al estado "Start a conversation / Ask a question to consult the LLM Council" (`ChatInterface.jsx:135-139`). El feedback es razonable pero silencioso (sin animación, sin toast).

**Friction F-03:** El welcome state central y el CTA "+ New Conversation" del sidebar viven en zonas visuales separadas y no se enlazan.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:124-128` (welcome state) y `frontend/src/components/Sidebar.jsx:272-274` (CTA). El usuario tiene que descubrir el botón sin que el welcome lo señale ni le ceda foco.
- **Severity hint:** low-med
- **Implication:** En cold start, el CTA primario debería estar en el centro de atención (idealmente duplicado en el welcome state) y no relegado al sidebar.

### Step 3: Reconocer que está en una conversación nueva y entender qué pedir

- **Q1:** El usuario quiere saber qué tipo de pregunta esperar mejores resultados de este sistema vs. ChatGPT directo.
- **Q2:** No hay action item explícito — solo el placeholder del textarea.
- **Q3:** El placeholder del textarea dice "Ask your question... (Shift+Enter for new line, Enter to send)" (`ChatInterface.jsx:257`) — útil para el comportamiento del input, pero no orienta sobre qué tipo de query funciona mejor con un council de 3 modelos. La copia central "Ask a question to consult the LLM Council" (`ChatInterface.jsx:138`) es genérica.
- **Q4:** N/A — paso de orientación, sin acción.

**Friction F-04:** Falta orientación sobre qué tipo de pregunta justifica usar un "council" en vez de un single-model chat.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:135-139` — "Start a conversation / Ask a question to consult the LLM Council". Cero ejemplos, cero hint sobre cuándo usarlo.
- **Severity hint:** low
- **Implication:** Empty-state del primer mensaje es candidato a hospedar 3–4 ejemplos de queries "council-suited" (decisiones complejas, evaluaciones técnicas con trade-offs, etc.).

## Flow 2: Ask + review

**Precondición:** El usuario tiene una conversación creada y vacía. Va a escribir su primera pregunta.

### Step 1: Escribir y enviar la pregunta

- **Q1:** Escribir su pregunta y enviarla.
- **Q2:** Sí — `<textarea>` con `rows={3}` y botón "Send" (`ChatInterface.jsx:255-270`).
- **Q3:** El textarea es visible. El placeholder explica los shortcuts (Enter / Shift+Enter). El botón Send está deshabilitado mientras `!input.trim()` o `isLoading` (`ChatInterface.jsx:267`).
- **Q4:** Tras Enter / click Send, el mensaje aparece en `messages-container` con label "You" (`ChatInterface.jsx:144-145`), e inmediatamente debajo aparece un partial assistant message con label "LLM Council" + spinner "Running Stage 1: Collecting individual responses..." (`ChatInterface.jsx:170-173`). El input form **se oculta completamente** tras el primer envío (single-shot pattern: `ChatInterface.jsx:221` — `conversation.messages.length === 0` en el render del form). Esto es deliberado pero sorprendente para un usuario con modelo mental ChatGPT.

**Friction F-05:** El input form desaparece tras enviar el primer mensaje, sin previo aviso, rompiendo el modelo mental "1 chat = N turns".
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:221` — `{conversation.messages.length === 0 && (<form>...</form>)}`. Tras el primer envío, no hay form ni botón para "preguntar otra cosa en esta conversación".
- **Severity hint:** med (es deliberado per D-20: "1 conversación = 1 deliberación", pero no se comunica).
- **Implication:** Hace falta una pista visual previa al primer envío de que esto es single-shot, o un microcopy post-envío que explique "para una nueva pregunta, abre una nueva conversación".

### Step 2: Esperar las respuestas (Stage 1 — 15-30s típico)

- **Q1:** El usuario quiere saber que algo está pasando, cuánto va a tardar y si va a recibir parcialidad útil mientras espera.
- **Q2:** Hay loading indicators per stage. Hay una visualización muy básica de progreso ("Running Stage 1...", luego "Running Stage 2...", luego "Running Stage 3...").
- **Q3:** Cada loading state tiene un spinner animado + label de copy (`ChatInterface.jsx:169-174`, `178-183`, `193-198`). Es discoverable que la app está trabajando.
- **Q4:** El feedback dice qué stage está corriendo pero NO da pista de tiempo restante, NO indica qué modelos específicos están respondiendo, y NO hay parcialidad por modelo (Stage 1 es batch — todos los modelos llegan a la vez, `backend/openrouter.py:62-85` hace `asyncio.gather`). El usuario espera 15-30s mirando un spinner sin contexto cuantitativo.

**Friction F-06:** Loading indicators no comunican duración esperada ni qué modelos están corriendo.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:170-172` — copy "Running Stage 1: Collecting individual responses..." sin ETA, sin lista de modelos del council, sin progress por modelo. `Stage 1` además es batch — los 4 modelos llegan a la vez tras `await asyncio.gather` (`backend/openrouter.py:62-85`), pero el usuario no lo sabe.
- **Severity hint:** high (15-30s es justo el umbral en el que el usuario empieza a dudar si la app está rota).
- **Implication:** Need progress communication más rica — al menos lista de modelos del council, idealmente time-since-start o un visualizador per-stage.

### Step 3: Leer Stage 1 (tabs por modelo)

- **Q1:** Comparar las respuestas individuales de cada modelo del council.
- **Q2:** Sí — tabs por modelo (`Stage1.jsx:16-26`), una al lado de otra.
- **Q3:** Las tabs son visibles. Cada tab muestra el short-name del modelo (`resp.model.split('/')[1]`, `Stage1.jsx:23`) como `gpt-5-mini`, `claude-sonnet-4-5`, etc.
- **Q4:** Click en una tab cambia el contenido al markdown renderizado de ese modelo (`Stage1.jsx:28-33`). El feedback es inmediato. Pero no hay forma de comparar dos respuestas lado a lado — el patrón tabs fuerza serial.

**Friction F-07:** Stage 1 fuerza lectura serial via tabs; comparar dos respuestas requiere ir y volver.
- **Evidencia:** `frontend/src/components/Stage1.jsx:16-33` — `activeTab` es un único `useState(0)`; solo una respuesta visible a la vez.
- **Severity hint:** med
- **Implication:** Con respuestas largas (~500-1500 palabras típicas en council usage), los tabs ocultan información que el usuario querría comparar. Patrón de columnas / accordion / split view es candidato — Plan 03 decide.

**Friction F-08:** El short-name del modelo en la tab no comunica el publisher (OpenAI / Anthropic / Google) ni la generación.
- **Evidencia:** `frontend/src/components/Stage1.jsx:23` — `{resp.model.split('/')[1] || resp.model}`. El usuario ve `gpt-5-mini` aislado del prefijo `openai/`. Si compara mentalmente "OpenAI vs Google vs Anthropic" no tiene esa pista.
- **Severity hint:** low
- **Implication:** Iconografía o color por publisher en tabs ayuda a mapear identidad rápida.

### Step 4: Leer Stage 2 (peer rankings + de-anonimización + aggregate)

- **Q1:** Entender qué pensaron los modelos unos de otros y a quién hay que creerle más.
- **Q2:** Sí — tabs de evaluaciones (`Stage2.jsx:34-44`) + bloque "Aggregate Rankings (Street Cred)" debajo (`Stage2.jsx:73-95`).
- **Q3:** Hay un párrafo `stage-description` (`Stage2.jsx:29-32`) que intenta explicar el modelo mental: "Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings. Below, model names are shown in **bold** for readability, but the original evaluation used anonymous labels." — denso, no ilustrado, asume mucho del lector.
- **Q4:** El de-anonymization se ve como **bold** en el texto renderizado (`Stage2.jsx:11-12`); el "Extracted Ranking" (`Stage2.jsx:56-69`) muestra la lista parseada; el "Aggregate Rankings" muestra `#1`, `#2`, ..., `Avg: 1.50`, `(3 votes)` (`Stage2.jsx:80-93`). Hay mucha información — pero la jerarquía visual (h3 / h4 / list / list) es plana y poco diferenciada.

**Friction F-09:** El concepto "anonymized peer review with de-anonymization" se explica con un párrafo de prosa denso, no con visualización.
- **Evidencia:** `frontend/src/components/Stage2.jsx:29-32` — copy "Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings. Below, model names are shown in **bold** for readability...". Esto es el corazón conceptual del producto y se entrega como pie de figura.
- **Severity hint:** high (es el feature diferencial — si el usuario no lo entiende, todo el "council" se reduce a "3 chats con resumen").
- **Implication:** El modelo mental "anonymous peer review" merece tratamiento visual de primera clase, no un párrafo bajo el h4.

**Friction F-10:** "Aggregate Rankings (Street Cred)" usa jerga imprecisa y no define qué significa "lower score is better" para el usuario casual.
- **Evidencia:** `frontend/src/components/Stage2.jsx:75-77` — h4 "Aggregate Rankings (Street Cred)" + descripción "Combined results across all peer evaluations (lower score is better):". "Street Cred" es un guiño jocoso que no se justifica con la audiencia BI/data; "lower score is better" sin explicar la métrica obliga al usuario a inferir.
- **Severity hint:** med
- **Implication:** Renombrar a algo neutro ("Aggregate ranking" o "Council consensus"), y mostrar la métrica de forma autoexplicativa (ej. "average position out of N").

**Friction F-11:** La jerarquía visual de Stage 2 es plana: h3 stage-title → h4 "Raw Evaluations" → tabs → h4 "Aggregate Rankings". Cuesta orientarse.
- **Evidencia:** `frontend/src/components/Stage2.jsx:26-95` — tres bloques sin separación visual fuerte; los `<h3>` y `<h4>` heredan de `index.css` `.markdown-content` y de los CSS co-located (`Stage2.css`) sin un sistema tipográfico jerárquico explícito.
- **Severity hint:** med
- **Implication:** Stage 2 es la pantalla más densa del UI; necesita un sistema tipográfico que separe "raw evaluations" del "aggregate" sin que ambos sean h4.

### Step 5: Leer Stage 3 (synthesis)

- **Q1:** Leer la respuesta final consolidada del chairman.
- **Q2:** Sí — bloque único con título y markdown renderizado (`Stage3.jsx:19-40`).
- **Q3:** Es discoverable: aparece debajo del Stage 2, con título "Stage 3: Final Council Answer" (`Stage3.jsx:22`) y `chairman-label` "Chairman: <model>" (`Stage3.jsx:33-35`).
- **Q4:** El bloque tiene background distinto (`Stage3.css` aplica el `#f0fff0` Bootstrap-flavored mencionado en CLAUDE.md). El feedback es claro: "este es el resumen final".

**Friction F-12:** El highlight visual de Stage 3 (verde claro `#f0fff0`) es Bootstrap-flavored y no comunica "respuesta autoritativa final".
- **Evidencia:** `frontend/src/components/Stage3.css` (background `#f0fff0`); CLAUDE.md `frontend/src/components/Stage3.jsx` notes lo describe explícitamente como provisional ("Background `#f0fff0` Bootstrap-flavored explícitamente provisional").
- **Severity hint:** med
- **Implication:** Stage 3 es la entrega del valor de toda la deliberación — necesita tratamiento visual de "conclusión", no de "alert verde".

### Step 6: Descargar markdown

- **Q1:** Guardar el resultado para uso posterior (paste en doc, archive personal, share).
- **Q2:** Sí — dos botones de download: "Download conversation" (full deliberation, en el `assistant-header`, `ChatInterface.jsx:158-164`) y "Download .md" (final answer only, en `Stage3.jsx:23-30`).
- **Q3:** Ambos botones son visibles, copy claro. Pero la diferencia entre los dos NO está documentada en la UI: tooltip del Stage 3 dice "Download final answer as markdown"; tooltip del header dice "Download full deliberation as markdown" (`ChatInterface.jsx:161` y `Stage3.jsx:27`). Tooltip-only es low-discoverability.
- **Q4:** El click dispara `triggerDownload` (`utils/download.js:13-23`) — file aparece en la carpeta de descargas del browser. No hay feedback in-app (no hay toast "Downloaded as filename.md") — el feedback queda fuera de la app.

**Friction F-13:** Existen dos botones de download con propósitos distintos sin disclosure visual de la diferencia.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:157-165` (button "Download conversation") y `frontend/src/components/Stage3.jsx:23-30` (button "Download .md"). La diferencia (full deliberation vs final answer only) solo se descubre por tooltip.
- **Severity hint:** low-med
- **Implication:** O unificar a un único punto de download con un selector ("full deliberation / final answer"), o etiquetar los botones de forma autoexplicativa ("Download all stages" / "Download final answer only").

## Flow 3: Manage conversations

**Precondición:** El usuario tiene N conversaciones (3-10 típicamente) en el sidebar. Quiere renombrar, borrar, o buscar.

### Step 1: Identificar la fila correcta en el sidebar

- **Q1:** Encontrar la conversación sobre la que quiere actuar.
- **Q2:** Sí — lista de filas con título + count de mensajes (`Sidebar.jsx:108-115`, `ConversationItem`).
- **Q3:** Cada fila muestra `conv.title || 'New Conversation'` y `${conv.message_count} messages`. Si la conversación nunca recibió mensaje, el título queda como "New Conversation" hasta que el backend genere uno con `generate_conversation_title` tras Stage 3.
- **Q4:** El `isActive` añade clase CSS (`Sidebar.jsx:96`) para resaltar la fila seleccionada. No hay timestamp visible, no hay preview del último mensaje, no hay agrupación por fecha.

**Friction F-14:** Conversaciones sin título generado quedan como "New Conversation" indistinguibles entre sí.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:110` — `{conv.title || 'New Conversation'}`. Si el usuario abre 2 conversaciones nuevas y luego cierra la app, vuelve y ve dos filas "New Conversation" con "0 messages" — no hay forma de distinguirlas.
- **Severity hint:** low (caso edge — solo aparece cuando hay conversaciones vacías persistidas).
- **Implication:** Mostrar al menos timestamp de creación o `id` corto cuando el título está vacío.

**Friction F-15:** El sidebar no agrupa por tiempo (Today / Yesterday / This week...) ni muestra previews del último mensaje.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:305-348` — render flat de la lista, ordenado por `created_at` descendente (orden viene del backend). Solo título + count.
- **Severity hint:** low (deferred per CONV-V2-01..03, pero impacta UX en uso diario incluso con 10-30 conversaciones).
- **Implication:** Anotar como input para v2 sidebar work; en Phase 2 los mockups deben dejar slot conceptual.

### Step 2: Abrir el three-dot menu

- **Q1:** Acceder a las acciones (Rename / Delete) sobre la fila.
- **Q2:** Sí — botón "⋮" a la derecha de cada fila (`Sidebar.jsx:118-129`) + right-click en la fila (`Sidebar.jsx:323-329`).
- **Q3:** El three-dot **NO** es persistentemente visible — depende de hover (typical CSS rule en `Sidebar.css` que oculta `.menu-trigger` salvo en `:hover`). Para un usuario que llegue por primera vez al sidebar sin saber dónde está la acción "Rename", el three-dot es invisible. El right-click es power-user knowledge — no descubrible sin tutorial.
- **Q4:** Tras click, el menú aparece como popover anclado a la posición del trigger (`Sidebar.jsx:332-340`) con items "Rename" / "Delete" (`Sidebar.jsx:356-373`). Feedback inmediato y correcto.

**Friction F-16:** El three-dot menu solo aparece en hover; sin hover no hay affordance visible para Rename / Delete.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:118-129` — el `<button class="menu-trigger">⋮</button>` se renderiza siempre en el DOM, pero el ChatGPT-pattern usa CSS hover para ocultarlo (D-19 en `01-CONTEXT.md` lo documenta como pattern aceptado). En dispositivos sin hover (tablets, accesibilidad keyboard-only) el affordance desaparece.
- **Severity hint:** med-high (es el único punto de entrada visible para Rename y Delete en single-user app — no hay shortcuts ni menú global).
- **Implication:** Considerar dejar el three-dot persistentemente visible al menos en la fila activa, o exponer keyboard-shortcuts. El right-click NO cuenta como mitigación porque no es discoverable.

**Friction F-17:** No hay ningún hint de keyboard-shortcut en los items del menú (Rename / Delete) ni en la fila.
- **Evidencia:** `frontend/src/components/Menu.jsx:67-83` — items se renderizan como `<button role="menuitem">` con solo `{item.label}`. Comparar con Linear / VSCode / Finder donde cada item del menú muestra su shortcut a la derecha. Adicionalmente, `Menu.jsx:23` documenta explícitamente: "Arrow-key navigation between items is intentionally deferred (RESEARCH §Pattern 3 marks it optional)".
- **Severity hint:** low-med
- **Implication:** Power user que vive en BI tools espera shortcuts. Mockups Phase 2 reservan slot tipográfico para shortcuts en menu items aunque la wiring sea v2.

### Step 3: Disparar Delete y confirmar en el modal

- **Q1:** Borrar la conversación con confirmación de seguridad.
- **Q2:** Sí — item "Delete" del menú dispara `requestDelete(conv)` (`Sidebar.jsx:367-371`), que abre `Modal` con `destructive` (`Sidebar.jsx:377-395`).
- **Q3:** El modal aparece centered, con backdrop + dialog. Title "Delete conversation" (`Sidebar.jsx:381`). Body: "Delete \"<title>\"?" + "This cannot be undone." (`Sidebar.jsx:385-388`). Botones "Cancel" + "Delete" (rojo, vía `destructive` prop, `Sidebar.jsx:394`). Initial focus sobre Cancel (`Modal.jsx:50-51` — comentario explícito: "Safer default for destructive flows").
- **Q4:** Click en Delete → modal se cierra inmediatamente (`Sidebar.jsx:256` — `setPendingDelete(null)` antes del await), `App.jsx:60-80` ejecuta `setCurrentConversationId(null)` si era la activa, y luego await `api.deleteConversation`. Si era la activa, el panel central muestra welcome state "Welcome to LLM Council" inmediatamente. El sidebar refresca tras el await. Feedback muy correcto.

**Friction F-18:** El modal de delete usa "Modal" como confirmación destructiva pero no muestra metadata diferenciadora (number of messages, fecha, preview) para que el usuario verifique que está borrando la conversación correcta.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:381-388` — body del modal muestra solo el título: `<p>Delete &quot;{pendingDelete.title || 'New Conversation'}&quot;?</p><p>This cannot be undone.</p>`. Si dos conversaciones tienen títulos similares (ej. "Pricing analysis" y "Pricing strategy"), el usuario no tiene cómo verificar.
- **Severity hint:** med
- **Implication:** El modal de confirmación destructiva debe mostrar evidencia suficiente para verificar identidad: timestamp, message count, primer mensaje truncado.

**Friction F-19:** Tras delete de la conversación activa, el panel central vuelve al welcome state genérico sin acknowledge de la acción ("Conversation deleted") ni undo opcional.
- **Evidencia:** `frontend/src/App.jsx:66-80` — tras delete, `setCurrentConversation(null)` y `loadConversations()`. `frontend/src/components/ChatInterface.jsx:121-129` muestra el welcome state estándar. No hay toast, no hay undo, no hay history.
- **Severity hint:** med
- **Implication:** Patrón Gmail/Slack de undo (5-10s) es estándar en delete destructivo. Phase 2 mockea al menos un toast de confirmación; undo queda para evaluar (no es trivial sin soft-delete server-side).

### Step 4: Renombrar inline

- **Q1:** Cambiar el título por algo más útil que el autogenerado.
- **Q2:** Sí — item "Rename" del menú activa `setEditingId(openMenuFor.id)` (`Sidebar.jsx:357-362`); aparece `<RenameInput>` (`Sidebar.jsx:101-106`) en la fila.
- **Q3:** El input recibe focus + select-all automáticos (`Sidebar.jsx:27-32`). Pero NO hay indicador visual de que el campo está editable más allá del input mismo — no hay icono de pencil, no hay border highlight especial, no hay banner "Editing — Enter to save, Esc to cancel".
- **Q4:** Enter commit / Escape cancel / Blur commits-or-cancels según la lógica de `intentRef` (`Sidebar.jsx:34-60`). Tras commit: `loadConversations()` refresca el sidebar (`App.jsx:88-89`). NO hay feedback visual de "saved" — el input desaparece y reaparece como `<div class="conversation-title">` con el nuevo texto. NO hay indicador de error si el rename falla en backend (catch silencioso, `App.jsx:90-92` — `console.error`).

**Friction F-20:** El inline rename no comunica los shortcuts (Enter/Esc) ni el comportamiento de blur.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:62-75` — el `<input>` solo tiene `aria-label="Conversation title"`. No hay tooltip, no hay placeholder, no hay nota inferior. La lógica `Enter commits, Escape cancels, blur commits` (`Sidebar.jsx:34-60`) es invisible al usuario.
- **Severity hint:** med
- **Implication:** Mockup Phase 2 debe incluir hint visual sutil (footnote, tooltip, o iconografía) que comunique los shortcuts.

**Friction F-21:** Errores en rename (e.g. PATCH 500, network down) son silenciosos — solo `console.error`, sin estado UI.
- **Evidencia:** `frontend/src/App.jsx:82-93` — `handleRenameConversation` cachea con `console.error` y no expone error a la UI. El usuario ve el sidebar reload sin el cambio aplicado y no sabe por qué.
- **Severity hint:** low (caso edge en local app, pero sigue siendo silencioso).
- **Implication:** Mockear estado de error inline en la fila (revert + tooltip / chip rojo) — pero la solución concreta vive en Plan 03.

### Step 5: Buscar conversaciones (search progresivo title-first + content-fallback)

- **Q1:** Encontrar una conversación previa por título o contenido.
- **Q2:** Sí — search input (`Sidebar.jsx:278-285`) + content-fallback button cuando aplica (`Sidebar.jsx:286-297`).
- **Q3:** El input está visible bajo el header del sidebar. Placeholder "Search conversations..." (`Sidebar.jsx:281`). Si la query tiene ≥3 chars y no hay matches por título, aparece un botón "Search inside content (N conversations)" (`Sidebar.jsx:289-296`). Si el usuario escribe 1-2 chars sin match, NO aparece el affordance — silencio.
- **Q4:** El title-first es debounced 200ms (`Sidebar.jsx:171-174`) — siente responsivo. El contenido-fallback dispara `Promise.all(api.getConversation(...))` para cachear todos los bodies y luego filtra (`Sidebar.jsx:230-245`). Mientras carga, el botón muestra "Loading content from N conversations..." (`Sidebar.jsx:294`). Tras activar, aparece la note "Searching titles + content" (`Sidebar.jsx:298-302`) — sticky para el resto de la sesión.

**Friction F-22:** El affordance "Search inside content (N conversations)" solo aparece bajo condición específica (≥3 chars + 0 title-matches), confundiendo al usuario que escribió 2 chars o tiene 1 title-match.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:188-191` — `showContentFallback = debouncedQuery.length >= 3 && titleMatches.length === 0 && !contentSearchActive`. El umbral está bien diseñado (D-10 evita flicker), pero no hay descubribilidad pasiva — el usuario nunca sabe que content search existe hasta que cumple las 3 condiciones.
- **Severity hint:** med
- **Implication:** El affordance es feature oculta. Mockup Phase 2 debería considerar superficie persistente del modo content-search (toggle visible en search bar, o copy explicativa al lado).

**Friction F-23:** "Search inside content" carga el body completo de TODAS las conversaciones en una sola llamada paralela — para 50+ conversaciones esto puede ser >2MB y un freeze visible.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:230-245` — `Promise.all(conversations.map((c) => api.getConversation(c.id)))`. Comentario en código explícitamente documenta "~10-100 conversations × ~50KB each = ~500KB, viable client-side", pero no hay límite ni paginación.
- **Severity hint:** low (deferred — usage actual es <30 conversaciones).
- **Implication:** Anotar como anticipated friction; mockear estado de "loading inside content" con progreso si vamos a aceptar que crezca a 100+.

**Friction F-24:** Estado "no matches" para el search es genérico ("No matches for \"<query>\"") sin sugerencias de qué hacer.
- **Evidencia:** `frontend/src/components/Sidebar.jsx:308-313` — `<div className="no-conversations">{debouncedQuery ? \`No matches for "${debouncedQuery}"\` : 'No conversations yet'}</div>`. No sugiere "try searching inside content" cuando aplique, no sugiere relajar la query.
- **Severity hint:** low
- **Implication:** Empty state del search es candidato a microcopy más útil — Phase 2 puede mockear pero no resuelve.

### Step 6: Reaccionar a la conversación activa cuando cae fuera del filtro

- **Q1:** Que el panel central siga mostrando lo que está mirando aunque el sidebar lo oculte por filtro.
- **Q2:** Sí — el código deliberadamente NO deselecciona (`Sidebar.jsx:262-266` lo documenta como "Slack/Discord-like behaviour", "RESEARCH §Pitfall 6 sealed").
- **Q3:** Discoverable solo por experimentación. No hay hint visual en el sidebar ("hidden by filter" / "still active in main panel").
- **Q4:** El feedback es correcto pero asimétrico: el panel central muestra la conversación, el sidebar ya no la lista. Sin pista visual explícita el usuario puede pensar que la conversación se borró.

(no friction nuevo — cubierto implícitamente por F-22 y por la naturaleza del decision; la asimetría es deliberada y correcta. Se anota aquí solo por completitud del walkthrough.)

## Flow 4: Attachments

**Precondición:** El usuario está en una conversación recién creada, con el input form visible. Quiere adjuntar un CSV / .md / .py / etc. para que el council lo analice.

### Step 1: Descubrir que se puede adjuntar

- **Q1:** Adjuntar un archivo al prompt.
- **Q2:** Sí — `<input type="file" multiple>` con `accept=".md,.txt,.csv,.tsv,.py,.sql,.json,.yml,.yaml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.sh,.ps1,.ini,.toml,.log,.conf,.ipynb"` (`ChatInterface.jsx:246-254`).
- **Q3:** El input es nativo HTML — el browser renderiza el botón "Choose Files" / "Examinar" con copy del browser, no de la app. Su estilo NO está customizado en el código actual (no hay clase `.file-input` en `ChatInterface.css` que lo wrapee con un botón estilizado). NO hay copy en la app que diga "drop files here", NO hay icono de paperclip, NO hay zona de drop visible. El drag-and-drop NO está implementado — solo file picker via click en el input nativo.
- **Q4:** Una vez seleccionado, los archivos aparecen como chips en `attachment-list` (`ChatInterface.jsx:223-243`). Cada chip muestra `{att.name}`, `{formatBytes(att.size)}`, y un botón "×" para eliminar. Hay un total visible "Total: X / Y" (`ChatInterface.jsx:239-241`).

**Friction F-25:** El input file es nativo del browser, sin estilizar — copy "Choose Files" depende del browser/idioma, no es parte del lenguaje visual de la app.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:246-254` — `<input ref={fileInputRef} type="file" className="file-input" accept="..." multiple onChange={handleFilesSelected} disabled={isLoading} />`. No hay `<label>` estilizado encima, el botón nativo del browser es el único affordance.
- **Severity hint:** high (es un attachment system con extensiones específicas — el affordance debe ser claro y consistente con el resto del UI).
- **Implication:** Mockup Phase 2 incluye attachment trigger estilizado (paperclip + label "Attach files" o similar) y opcionalmente drop zone visible.

**Friction F-26:** La lista de extensiones aceptadas (`accept` del input) es larga y no se comunica al usuario antes de elegir el archivo.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:250` — 23 extensiones explícitas en `accept`. Si el usuario intenta adjuntar un `.docx`, el browser rechaza el archivo en el dialog del file picker, sin explicación in-app de por qué.
- **Severity hint:** med
- **Implication:** Mockup Phase 2 considera mostrar las extensiones aceptadas en el affordance, o un tooltip "Supports: code, text, CSV, JSON, ..." adjacente al trigger.

### Step 2: Reaccionar a errores de tamaño (500KB / 2MB)

- **Q1:** Recuperarse del error si excede límites.
- **Q2:** Sí — `setAttachError` cubre ambos casos (`ChatInterface.jsx:60-71`).
- **Q3:** El error aparece como `<div className="attachment-error">` debajo de los chips (`ChatInterface.jsx:244`). Copy literal: `"<filename>" exceeds per-file limit (XKB > 500KB)` o `Total attachment size would exceed 2MB`.
- **Q4:** El error es visible y específico, pero NO indica acción correctiva además del límite ("considera reducir el archivo", "puedes adjuntar otros archivos hasta XX KB"). Tampoco se reset al cambiar de pestaña / interactuar con otro archivo — solo se limpia con `removeAttachment` o con `handleSubmit` exitoso (`ChatInterface.jsx:88, 98`).

**Friction F-27:** Mensaje de error de tamaño es informativo pero no orienta sobre cómo recuperarse.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:61-69` — copy literal `"<file>" exceeds per-file limit (XKB > 500KB)` y `Total attachment size would exceed 2MB`. No sugiere "elimina algún attachment" ni explica los límites antes del intento.
- **Severity hint:** low-med
- **Implication:** Pre-warn del límite (banner discreto antes de adjuntar) + copy de error con acción correctiva.

**Friction F-28:** Los límites (500KB / 2MB) no se comunican antes del intento — solo aparecen como número en el mensaje de error.
- **Evidencia:** `frontend/src/utils/download.js:5-11` — `MAX_FILE_BYTES = 500 * 1024; MAX_TOTAL_BYTES = 2 * 1024 * 1024`. La UI nunca muestra estos números proactivamente. El "Total: X / Y" del attachment-list (`ChatInterface.jsx:239-241`) los muestra solo cuando ya hay archivos adjuntados.
- **Severity hint:** med
- **Implication:** Mockup Phase 2 muestra el límite en el affordance del trigger ("Attach files (max 500KB each, 2MB total)") o como subtitle persistente bajo el input.

### Step 3: Eliminar un attachment

- **Q1:** Quitar un attachment ya adjuntado.
- **Q2:** Sí — botón "×" en cada chip (`ChatInterface.jsx:229-236`).
- **Q3:** El "×" es visualmente reconocible. `aria-label="Remove <filename>"` (`ChatInterface.jsx:233`).
- **Q4:** Click → chip desaparece, total se actualiza, error se limpia (`ChatInterface.jsx:86-89`). Feedback inmediato y correcto.

(no friction nuevo en este step — la mecánica está bien resuelta.)

### Step 4: Entender qué le pasa al texto del prompt cuando hay attachments

- **Q1:** Saber cómo el LLM va a recibir el archivo — concatenado al prompt? Adjuntado como parte separada? Resumido?
- **Q2:** El comportamiento existe (`buildPromptWithAttachments` en `utils/download.js`). El usuario no tiene visibilidad sobre el resultado.
- **Q3:** No hay preview del prompt final que se va a enviar. El usuario escribe en el textarea, ve los chips, da Send, y NO ve cómo se compone el envío.
- **Q4:** La respuesta del council viene basada en el prompt completo — pero si el usuario quiere validar "¿el LLM realmente vio el archivo?" no hay forma de hacerlo desde la UI antes de enviar. Solo después de Stage 1, leyendo las respuestas, puede inferir si los modelos leyeron el contenido.

**Friction F-29:** No hay preview del prompt final compuesto (texto + attachments serializados) antes de enviar.
- **Evidencia:** `frontend/src/components/ChatInterface.jsx:91-100` — `handleSubmit` llama `buildPromptWithAttachments(input, attachments)` (`utils/download.js`) y dispara `onSendMessage(fullPrompt)` directamente sin mostrar el resultado al usuario.
- **Severity hint:** low-med
- **Implication:** Para attachments grandes (cerca de 500KB), el usuario merece poder verificar qué se está enviando. Mockup Phase 2 puede considerar disclosure colapsado "Preview full prompt" o un line-count estimate.

## Friction Index

Tabla canónica de friction points. Plan 02 (Nielsen audit) re-puntúa con escala 0–4 y mapea a heurísticas. Plan 03 (redesign) consume esta lista como constraint de qué tiene que resolver.

| F-ID  | Flow                | Step | Severity hint | Componente / línea                                | Una línea descriptiva                                                              |
| ----- | ------------------- | ---- | ------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| F-01  | 1 Cold start        | 1    | med           | `frontend/src/components/ChatInterface.jsx:125-126` | Welcome state no comunica el valor diferencial del producto.                       |
| F-02  | 1 Cold start        | 1    | med           | `frontend/src/components/Sidebar.jsx:271`           | Falta header de app branded — solo `<h1>LLM Council</h1>` plano.                    |
| F-03  | 1 Cold start        | 2    | low-med       | `frontend/src/components/ChatInterface.jsx:124-128` | Welcome state y CTA "+ New Conversation" viven en zonas separadas sin enlace visual. |
| F-04  | 1 Cold start        | 3    | low           | `frontend/src/components/ChatInterface.jsx:135-139` | Falta orientación sobre qué tipo de pregunta justifica usar un council.            |
| F-05  | 2 Ask + review      | 1    | med           | `frontend/src/components/ChatInterface.jsx:221`     | El input form desaparece tras el primer envío sin previo aviso (single-shot).      |
| F-06  | 2 Ask + review      | 2    | high          | `frontend/src/components/ChatInterface.jsx:170-172` | Loading indicators no comunican duración esperada ni qué modelos están corriendo.  |
| F-07  | 2 Ask + review      | 3    | med           | `frontend/src/components/Stage1.jsx:16-33`          | Stage 1 fuerza lectura serial via tabs; comparar dos respuestas requiere ir y volver. |
| F-08  | 2 Ask + review      | 3    | low           | `frontend/src/components/Stage1.jsx:23`             | Short-name del modelo en tab no comunica publisher ni generación.                  |
| F-09  | 2 Ask + review      | 4    | high          | `frontend/src/components/Stage2.jsx:29-32`          | Concepto "anonymized peer review with de-anonymization" se explica con prosa densa, no visualización. |
| F-10  | 2 Ask + review      | 4    | med           | `frontend/src/components/Stage2.jsx:75-77`          | "Aggregate Rankings (Street Cred)" usa jerga imprecisa y no define la métrica.     |
| F-11  | 2 Ask + review      | 4    | med           | `frontend/src/components/Stage2.jsx:26-95`          | Jerarquía visual de Stage 2 plana — h3, h4, h4 sin separación fuerte.              |
| F-12  | 2 Ask + review      | 5    | med           | `frontend/src/components/Stage3.css`                | Highlight verde `#f0fff0` Bootstrap-flavored no comunica "respuesta autoritativa". |
| F-13  | 2 Ask + review      | 6    | low-med       | `frontend/src/components/ChatInterface.jsx:157-165`, `Stage3.jsx:23-30` | Dos botones de download con propósitos distintos sin disclosure visual de la diferencia. |
| F-14  | 3 Manage            | 1    | low           | `frontend/src/components/Sidebar.jsx:110`           | Conversaciones sin título quedan como "New Conversation" indistinguibles entre sí. |
| F-15  | 3 Manage            | 1    | low           | `frontend/src/components/Sidebar.jsx:305-348`       | Sidebar no agrupa por tiempo ni muestra previews del último mensaje.               |
| F-16  | 3 Manage            | 2    | med-high      | `frontend/src/components/Sidebar.jsx:118-129`       | Three-dot menu solo aparece en hover; sin hover no hay affordance visible.         |
| F-17  | 3 Manage            | 2    | low-med       | `frontend/src/components/Menu.jsx:67-83`            | Items del menú no muestran keyboard-shortcuts.                                     |
| F-18  | 3 Manage            | 3    | med           | `frontend/src/components/Sidebar.jsx:381-388`       | Modal de delete no muestra metadata diferenciadora (count, fecha, preview).        |
| F-19  | 3 Manage            | 3    | med           | `frontend/src/App.jsx:66-80`                        | Tras delete no hay acknowledge ("Conversation deleted") ni undo opcional.          |
| F-20  | 3 Manage            | 4    | med           | `frontend/src/components/Sidebar.jsx:62-75`         | Inline rename no comunica los shortcuts (Enter/Esc/Blur).                          |
| F-21  | 3 Manage            | 4    | low           | `frontend/src/App.jsx:82-93`                        | Errores en rename son silenciosos — solo `console.error`, sin estado UI.           |
| F-22  | 3 Manage            | 5    | med           | `frontend/src/components/Sidebar.jsx:188-191`       | Affordance "Search inside content" oculto hasta que se cumplen 3 condiciones.      |
| F-23  | 3 Manage            | 5    | low           | `frontend/src/components/Sidebar.jsx:230-245`       | Content search carga TODOS los bodies en paralelo — frágil para 100+ conversaciones. |
| F-24  | 3 Manage            | 5    | low           | `frontend/src/components/Sidebar.jsx:308-313`       | "No matches" del search es genérico, sin sugerencias de qué hacer.                 |
| F-25  | 4 Attachments       | 1    | high          | `frontend/src/components/ChatInterface.jsx:246-254` | Input file nativo del browser sin estilizar — affordance fuera del lenguaje visual de la app. |
| F-26  | 4 Attachments       | 1    | med           | `frontend/src/components/ChatInterface.jsx:250`     | Lista de extensiones aceptadas no se comunica al usuario antes de elegir.          |
| F-27  | 4 Attachments       | 2    | low-med       | `frontend/src/components/ChatInterface.jsx:61-69`   | Mensaje de error de tamaño es informativo pero no orienta sobre cómo recuperarse.  |
| F-28  | 4 Attachments       | 2    | med           | `frontend/src/utils/download.js:5-11`               | Límites 500KB / 2MB no se comunican antes del intento — solo en el error.          |
| F-29  | 4 Attachments       | 4    | low-med       | `frontend/src/components/ChatInterface.jsx:91-100`  | No hay preview del prompt final compuesto antes de enviar.                         |

**Distribución por flujo:**

- Flow 1 (Cold start): 4 friction points (F-01..F-04).
- Flow 2 (Ask + review): 9 friction points (F-05..F-13).
- Flow 3 (Manage conversations): 11 friction points (F-14..F-24).
- Flow 4 (Attachments): 5 friction points (F-25..F-29).

**Total:** 29 friction points. Cada flujo tiene ≥ 2 friction points (objetivo del plan).

**Severity hint distribution:**

- `high`: 3 (F-06 loading indicators, F-09 peer-review framing, F-25 file input nativo).
- `med` o `med-high`: 13 — bloque dominante; mayoría son issues de descubribilidad / framing.
- `low` o `low-med`: 13 — issues de pulido y edge cases.

Plan 02 (Nielsen audit) re-puntúa con escala 0–4 oficial y mapea a las 10 heurísticas; este Friction Index es el insumo de evidencia.
