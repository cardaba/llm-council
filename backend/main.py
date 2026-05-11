"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal, Optional
import uuid
import json
import asyncio

from . import stats
from . import storage
from . import research_strategy
from .config import PROFILES
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings


# ---------------------------------------------------------------------------
# Critique-mode upload caps (Phase 5 Plan 02)
# ---------------------------------------------------------------------------
MAX_CRITIQUE_FILE_BYTES = 750 * 1024     # 750KB cap per slot (D-04 lock)
PREFLIGHT_TOKEN_CAP = 150_000             # CONTEXT.md lock — 150K total tokens
HEURISTIC_TOKENS_PER_CHAR = 0.25          # PITFALLS.md §CRIT-1 — 4 chars/token estimate

# Detached deliberation tasks. The SSE handlers run their council work
# inside an asyncio.Task that's registered here so it survives client
# disconnect (closes Plan 06-09: when the browser tab navigates away
# or the user switches conversations, uvicorn cancels the SSE response
# generator — but the deliberation task remains alive, completes the
# council, and calls storage.add_assistant_message before exiting).
# Tasks self-discard via add_done_callback so the set never leaks.
_BACKGROUND_DELIBERATIONS: set = set()


def _spawn_background_deliberation(coro):
    """Run `coro` as a detached task that survives client disconnect."""
    task = asyncio.create_task(coro)
    _BACKGROUND_DELIBERATIONS.add(task)
    task.add_done_callback(_BACKGROUND_DELIBERATIONS.discard)
    return task


app = FastAPI(title="LLM Council API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation.

    `mode` selects the conversation entry point per Phase 5:
        - "fresh" (default, v1 behaviour): standard prompt → 3-stage council.
        - "critique": critique-mode entry point (Phase 5 Wave 1+).

    Default keeps v1 callers green — clients sending an empty body or omitting
    `mode` get fresh-mode conversations as before.
    """
    mode: Literal["fresh", "critique"] = "fresh"


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    profile: Literal["fast", "quality", "quality_research"] = "fast"
    # SET-03 — quality_research-only override of PROFILES["quality_research"]["stage4_threshold"].
    # Optional + None default keeps v1 clients green (Pitfall 2 backward-compat).
    stage4_threshold: Optional[int] = Field(None, ge=1, le=10)


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


class UpdateConversationRequest(BaseModel):
    """Request to update conversation metadata. Only `title` is editable in v1."""
    title: str = Field(..., min_length=1, max_length=200)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.get("/api/stats/cost")
async def get_cost_stats():
    """Aggregate current-month cost stats — read-only walk over conversation files."""
    return stats.aggregate_current_month()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest = CreateConversationRequest()):
    """Create a new conversation.

    Accepts an optional JSON body `{"mode": "fresh"|"critique"}`. Empty/missing
    body defaults to `mode="fresh"` so v1 clients continue to work unchanged.
    The selected mode is stamped at the root of the saved JSON alongside
    `schema_version` (Phase 5 Wave 0).
    """
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id, mode=request.mode)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process for the selected profile.
    # SET-03 — forward optional stage4_threshold so the non-streaming endpoint
    # honors the slider override on quality_research; v1 clients (no field)
    # pass None and fall back to PROFILES default.
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content, request.profile,
        stage4_threshold=request.stage4_threshold,
    )

    # Build per-message metadata (D-25 shape) — persisted verbatim alongside
    # the assistant message so the saved-message header can reflect WHICH
    # profile produced WHICH deliberation. Fast / Quality build it from
    # PROFILES; quality_research already produced the extended shape inside
    # research_strategy and packed it into `metadata["message_metadata"]`
    # alongside the optional `stage4` payload.
    if request.profile == "quality_research":
        message_metadata = metadata.get("message_metadata", {})
        stage4_data = metadata.get("stage4")
        # The legacy "metadata" sibling (label_to_model + aggregate_rankings)
        # is not produced by the QR path in this non-streaming endpoint;
        # the streaming endpoint emits aggregates in stage2_complete events.
        legacy_metadata = None
    else:
        profile_config = PROFILES[request.profile]
        message_metadata = {
            "profile": request.profile,
            "models": profile_config["council_models"],
            "chairman": profile_config["chairman_model"],
            # Phase 6 COST-01: forward the cost block produced by
            # run_full_council so non-streaming persistence matches SSE.
            "cost": metadata.get("cost"),
        }
        stage4_data = None
        legacy_metadata = metadata

    # Add assistant message with all stages + profile metadata (+ stage4 if any)
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result,
        metadata=message_metadata,
        stage4=stage4_data,
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "stage4": stage4_data,  # quality_research only; None otherwise
        "metadata": legacy_metadata,  # legacy SSE-style metadata (None for QR)
        "message_metadata": message_metadata,  # profile/models/chairman[/critic/stage4_triggered]
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        # Plan 06-09: deliberation runs in a detached asyncio.Task fed through
        # this queue. If the SSE client disconnects, uvicorn cancels the
        # generator (the `await queue.get()` below) but the deliberation task
        # is registered in _BACKGROUND_DELIBERATIONS and keeps running until it
        # finishes and persists via storage.add_assistant_message.
        queue: asyncio.Queue = asyncio.Queue()

        async def deliberation():
            try:
                # Add user message
                storage.add_user_message(conversation_id, request.content)

                # Start title generation in parallel for ALL profiles (don't await yet).
                # Started here (before the QR branch) so the title call runs concurrently
                # with the long QR pipeline (~30-60s total).
                title_task = None
                if is_first_message:
                    title_task = asyncio.create_task(generate_conversation_title(request.content))

                # SSE event order for quality_research:
                #   stage1_start → stage1_complete{data}
                #   stage2_start → stage2_complete{data, metadata}
                #   stage3_start → stage3_complete{data}
                #   critic_complete{data: {score, concern}}
                #   [optional] stage4_start → stage4_complete{data}
                #   [optional] title_complete{data}
                #   message_metadata{data}
                #   complete
                if request.profile == "quality_research":
                    # Strategy module owns the full QR pipeline (D-01 thick API).
                    # Pass-through every event whose type does NOT start with '_';
                    # the underscore-prefixed '_final' event carries the consolidated
                    # tuple shape used to persist the message.
                    final_stage1: List[Dict[str, Any]] = []
                    final_stage2: List[Dict[str, Any]] = []
                    final_stage3: Dict[str, Any] = {}
                    final_stage4: Any = None
                    final_message_metadata: Dict[str, Any] = {}

                    async for event in research_strategy.run(
                        request.content, PROFILES["quality_research"],
                        threshold_override=request.stage4_threshold,
                    ):
                        if event["type"] == "_final":
                            final_stage1 = event["stage1"]
                            final_stage2 = event["stage2"]
                            final_stage3 = event["stage3"]
                            final_stage4 = event["stage4"]
                            final_message_metadata = event["message_metadata"]
                        else:
                            await queue.put(event)

                    # Title generation (parallel — started before the strategy ran).
                    if title_task is not None:
                        title = await title_task
                        storage.update_conversation_title(conversation_id, title)
                        await queue.put({"type": "title_complete", "data": {"title": title}})

                    # Persist with stage4 (only when critic gated refinement).
                    storage.add_assistant_message(
                        conversation_id,
                        final_stage1,
                        final_stage2,
                        final_stage3,
                        metadata=final_message_metadata,
                        stage4=final_stage4,
                    )

                    # Emit message_metadata so the frontend hydrates the saved-message
                    # header with profile/models/chairman/critic/stage4_triggered.
                    await queue.put({"type": "message_metadata", "data": final_message_metadata})
                    await queue.put({"type": "complete"})
                    return

                # Resolve profile config once for fast / quality
                config = PROFILES[request.profile]
                council_models = config["council_models"]
                chairman_model = config["chairman_model"]

                # Stage 1: Collect responses
                await queue.put({"type": "stage1_start"})
                stage1_results = await stage1_collect_responses(request.content, council_models)
                await queue.put({"type": "stage1_complete", "data": stage1_results})

                # Stage 2: Collect rankings
                await queue.put({"type": "stage2_start"})
                stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results, council_models)
                aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
                await queue.put({
                    "type": "stage2_complete",
                    "data": stage2_results,
                    "metadata": {"label_to_model": label_to_model, "aggregate_rankings": aggregate_rankings},
                })

                # Stage 3: Synthesize final answer
                await queue.put({"type": "stage3_start"})
                stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results, chairman_model)
                await queue.put({"type": "stage3_complete", "data": stage3_result})

                # Wait for title generation if it was started
                if title_task:
                    title = await title_task
                    storage.update_conversation_title(conversation_id, title)
                    await queue.put({"type": "title_complete", "data": {"title": title}})

                # Build per-message metadata (D-25 shape) — Fast / Quality only.
                # Plan 03-04 owns the quality_research path and will emit the
                # extended shape (with critic + stage4_triggered keys) from the
                # research_strategy module.
                # Phase 6 PERS-01: persist label_to_model + aggregate_rankings
                # here too (analog of the critique branch at the bottom of this
                # file) so reload hydrates de-anonymized Stage 2 tabs instead of
                # falling back to the "Quality (legacy)" header.
                # Phase 6 COST-01: accumulate per-stage cost from the per-item
                # 'cost' dicts embedded by the council helpers. stage4=None here
                # (Fast / Quality never run refinement). Failed sub-queries
                # contribute 0.0 via the helpers' safe-default cost sub-dict.
                stage1_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage1_results), 0.0)
                stage1_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage1_results), 0.0)
                stage2_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage2_results), 0.0)
                stage2_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage2_results), 0.0)
                stage3_fee = stage3_result.get("cost", {}).get("openrouter_fee_usd", 0.0)
                stage3_upstream = stage3_result.get("cost", {}).get("upstream_usd", 0.0)
                message_metadata = {
                    "profile": request.profile,
                    "models": council_models,
                    "chairman": chairman_model,
                    "label_to_model": label_to_model,
                    "aggregate_rankings": aggregate_rankings,
                    "cost": {
                        "stage1": stage1_fee,
                        "stage2": stage2_fee,
                        "stage3": stage3_fee,
                        "stage4": None,
                        "total": stage1_fee + stage2_fee + stage3_fee,
                        "upstream_total": stage1_upstream + stage2_upstream + stage3_upstream,
                        "currency": "USD",
                    },
                }

                # Save complete assistant message with profile metadata
                storage.add_assistant_message(
                    conversation_id,
                    stage1_results,
                    stage2_results,
                    stage3_result,
                    metadata=message_metadata,
                )

                # Emit metadata event so the frontend can hydrate the saved
                # message header BEFORE the `complete` event closes the stream.
                await queue.put({"type": "message_metadata", "data": message_metadata})

                # Send completion event
                await queue.put({"type": "complete"})

            except storage.ConversationNotFoundError:
                await queue.put({"type": "error", "kind": "not_found", "message": "Conversation not found"})
            except Exception as e:
                # Send error event
                await queue.put({"type": "error", "message": str(e)})
            finally:
                # Sentinel — tells the SSE drain loop to exit cleanly.
                await queue.put(None)

        _spawn_background_deliberation(deliberation())

        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


async def _read_and_validate_upload(
    upload: Optional[UploadFile],
) -> Optional[Dict[str, Any]]:
    """Read + validate a single multipart upload slot.

    Returns ``None`` if the slot is empty (UploadFile is None). Otherwise
    returns ``{"filename", "content", "size_bytes"}`` after enforcing:
        - 750KB byte cap         → HTTP 413
        - .md / .txt extension   → HTTP 415
        - UTF-8 decoding         → HTTP 400

    Errors raise HTTPException so they fire BEFORE the StreamingResponse —
    the client sees a normal HTTP error, not a half-loaded SSE stream.
    """
    if upload is None:
        return None
    content_bytes = await upload.read()
    size = len(content_bytes)
    if size > MAX_CRITIQUE_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File '{upload.filename}' is {size} bytes; max is {MAX_CRITIQUE_FILE_BYTES}",
        )
    name = (upload.filename or "").lower()
    if not (name.endswith(".md") or name.endswith(".txt")):
        raise HTTPException(
            status_code=415,
            detail=f"File '{upload.filename}' must be .md or .txt",
        )
    try:
        text = content_bytes.decode("utf-8-sig")  # strips BOM if present
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8")
    text = text.replace("\r\n", "\n").replace("\r", "\n")  # normalize line endings
    return {"filename": upload.filename, "content": text, "size_bytes": size}


@app.post("/api/conversations/{conversation_id}/critique/stream")
async def critique_stream(
    conversation_id: str,
    critique_instruction: str = Form(..., min_length=1),
    file_slot_0: Optional[UploadFile] = File(None),
    file_slot_1: Optional[UploadFile] = File(None),
    file_slot_2: Optional[UploadFile] = File(None),
):
    """Critique-mode SSE endpoint (Phase 5 Plan 02).

    Multipart form fields:
        - critique_instruction: required; user-provided directive.
        - file_slot_0..2: up to 3 .md/.txt uploads, each ≤ 750KB.

    Pre-stream errors (raised as HTTPException — normal HTTP responses):
        - 400: invalid conversation ID, no files submitted, non-UTF-8 file.
        - 404: conversation not found.
        - 413: file > 750KB OR estimated input > 150K tokens.
        - 415: file extension not .md / .txt.

    SSE event sequence (after validation passes):
        stage1_start
        stage1_complete         data=stage1_results
        stage2_start
        stage2_complete         data, metadata.{label_to_model, aggregate_rankings}
                                (n=1 → data=[], empty metadata so the existing
                                 React reducer drains without UI changes)
        stage3_start
        stage3_complete         data=stage3_result
        title_complete          (optional, best-effort)
        message_metadata        metadata.{label_to_model, aggregate_rankings, mode}
        complete

    n=1/2/3 council collapses dynamically per D-05: only slots that received
    an upload contribute a council member. Each member sees ALL files
    attributed; its own marked [YOUR PRIOR WORK].
    """
    # UUID validity + existence — same idiom as send_message_stream.
    try:
        conversation = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Read + validate slots (may raise 413/415/400).
    uploads = [
        await _read_and_validate_upload(file_slot_0),
        await _read_and_validate_upload(file_slot_1),
        await _read_and_validate_upload(file_slot_2),
    ]

    # Build active council — collapse dynamically per D-05.
    quality_config = PROFILES["quality"]
    slot_models = quality_config["council_models"]
    chairman_model = quality_config["chairman_model"]

    active = [
        (model, upload)
        for model, upload in zip(slot_models, uploads)
        if upload is not None
    ]
    if len(active) == 0:
        raise HTTPException(status_code=400, detail="Submit at least one file")

    active_council_models = [m for m, _ in active]
    external_context: Dict[str, Dict[str, Any]] = {m: upload for m, upload in active}

    # Pre-flight token cap — PITFALLS.md §CRIT-1.
    # Each council model sees ALL files in its prompt → multiply per-file
    # char-count by n active members. Critique instruction is included once.
    total_input_chars = sum(len(u["content"]) for u in uploads if u) + len(critique_instruction)
    estimated_total_stage1_tokens = int(total_input_chars * HEURISTIC_TOKENS_PER_CHAR) * len(active)
    if estimated_total_stage1_tokens > PREFLIGHT_TOKEN_CAP:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Estimated input is ~{estimated_total_stage1_tokens // 1000}K tokens, "
                f"exceeding the {PREFLIGHT_TOKEN_CAP // 1000}K cap. "
                f"Reduce file sizes or use fewer files."
            ),
        )

    async def event_generator():
        # Plan 06-09: same detached-task pattern as send_message_stream.
        # The critique deliberation runs to completion even if the client
        # disconnects (closes the tab, switches conversations, network blip)
        # so the assistant message + per-file external_research entry is
        # always persisted via storage.add_assistant_message.
        queue: asyncio.Queue = asyncio.Queue()

        async def deliberation():
            try:
                # Persist user message — the critique instruction.
                storage.add_user_message(conversation_id, critique_instruction)

                # Stage 1 — per-model critique prompts via external_context.
                await queue.put({"type": "stage1_start"})
                stage1_results = await stage1_collect_responses(
                    critique_instruction,
                    active_council_models,
                    external_context=external_context,
                )
                await queue.put({"type": "stage1_complete", "data": stage1_results})

                # Stage 2 — anonymize + truncate; n=1 emits empty payload so the
                # existing React reducer drains without any frontend change (D-05).
                await queue.put({"type": "stage2_start"})
                if len(stage1_results) <= 1:
                    stage2_results: List[Dict[str, Any]] = []
                    label_to_model: Dict[str, str] = {}
                    aggregate_rankings: List[Dict[str, Any]] = []
                else:
                    stage2_results, label_to_model = await stage2_collect_rankings(
                        critique_instruction,
                        stage1_results,
                        active_council_models,
                        anonymize_critiques=True,
                        truncate_per_response_tokens=600,
                    )
                    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
                await queue.put({
                    "type": "stage2_complete",
                    "data": stage2_results,
                    "metadata": {"label_to_model": label_to_model, "aggregate_rankings": aggregate_rankings},
                })

                # Stage 3 — chairman synthesises across the (un-anonymized) Stage 1
                # results and the Stage 2 rankings (which were computed from the
                # anonymized copy but stored verbatim from the model).
                await queue.put({"type": "stage3_start"})
                stage3_result = await stage3_synthesize_final(
                    critique_instruction, stage1_results, stage2_results, chairman_model
                )
                await queue.put({"type": "stage3_complete", "data": stage3_result})

                # Title generation — best-effort; non-fatal on failure.
                try:
                    title = await generate_conversation_title(critique_instruction)
                    storage.update_conversation_title(conversation_id, title)
                    await queue.put({"type": "title_complete", "data": {"title": title}})
                except Exception:
                    pass  # fresh-prompt path also tolerates title failure

                # Persist with external_research so reload hydration finds the files.
                # Phase 6 COST-01: same per-stage accumulation as the fresh path.
                # Critique never runs Stage 4 refine in Phase 5 → stage4: None.
                stage1_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage1_results), 0.0)
                stage1_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage1_results), 0.0)
                stage2_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage2_results), 0.0)
                stage2_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage2_results), 0.0)
                stage3_fee = stage3_result.get("cost", {}).get("openrouter_fee_usd", 0.0)
                stage3_upstream = stage3_result.get("cost", {}).get("upstream_usd", 0.0)
                metadata = {
                    "label_to_model": label_to_model,
                    "aggregate_rankings": aggregate_rankings,
                    "mode": "critique",
                    "cost": {
                        "stage1": stage1_fee,
                        "stage2": stage2_fee,
                        "stage3": stage3_fee,
                        "stage4": None,
                        "total": stage1_fee + stage2_fee + stage3_fee,
                        "upstream_total": stage1_upstream + stage2_upstream + stage3_upstream,
                        "currency": "USD",
                    },
                }
                storage.add_assistant_message(
                    conversation_id,
                    stage1_results,
                    stage2_results,
                    stage3_result,
                    metadata=metadata,
                    external_research=external_context,
                )

                await queue.put({"type": "message_metadata", "data": metadata})
                await queue.put({"type": "complete"})

            except storage.ConversationNotFoundError:
                await queue.put({"type": "error", "kind": "not_found", "message": "Conversation not found"})
            except Exception as e:
                await queue.put({"type": "error", "message": str(e)})
            finally:
                await queue.put(None)

        _spawn_background_deliberation(deliberation())

        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.patch("/api/conversations/{conversation_id}", response_model=ConversationMetadata)
async def patch_conversation(conversation_id: str, request: UpdateConversationRequest):
    """
    Update a conversation's metadata. Only `title` is supported in v1 (CONV-02).

    Returns:
        - 200 with updated metadata on success.
        - 400 if conversation_id is not a valid UUID (inherited via
          storage.get_conversation → uuid.UUID(), Plan 01 / SEC-01).
        - 404 if the conversation file does not exist.
        - 422 if the body fails Pydantic validation (empty title or > 200 chars).

    Implementation notes:
        - Body validation lives in `UpdateConversationRequest` via
          `Field(min_length=1, max_length=200)`. Pydantic emits 422 BEFORE this
          handler runs, so we never see empty/oversized titles here.
        - The pre-existence check via `get_conversation` mirrors Plan 02's DELETE
          handler; the second try/except handles the TOCTOU race where the file
          is removed (concurrent DELETE) between the check and the update.
    """
    try:
        existing = storage.get_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    if existing is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        storage.update_conversation_title(conversation_id, request.title)
    except storage.ConversationNotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation_id,
        "created_at": existing["created_at"],
        "title": request.title,
        "message_count": len(existing["messages"]),
    }


@app.delete("/api/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    """
    Delete a conversation permanently.

    Per D-03: deletion is unconditional — confirmation is enforced
    client-side only; the backend does not implement a two-step API.

    Returns:
        - 204 No Content on success.
        - 400 if conversation_id is not a valid UUID (closes Vuln 2,
          inherited from storage.delete_conversation → uuid.UUID()).
        - 404 if the conversation file does not exist.
    """
    try:
        storage.delete_conversation(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return None  # 204 No Content; FastAPI elides the body


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
