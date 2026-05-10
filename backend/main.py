"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
import uuid
import json
import asyncio

from . import storage
from . import research_strategy
from .config import PROFILES
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings

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

    # Run the 3-stage council process for the selected profile
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content, request.profile,
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
                    request.content, PROFILES["quality_research"]
                ):
                    if event["type"] == "_final":
                        final_stage1 = event["stage1"]
                        final_stage2 = event["stage2"]
                        final_stage3 = event["stage3"]
                        final_stage4 = event["stage4"]
                        final_message_metadata = event["message_metadata"]
                    else:
                        yield f"data: {json.dumps(event)}\n\n"

                # Title generation (parallel — started before the strategy ran).
                if title_task is not None:
                    title = await title_task
                    storage.update_conversation_title(conversation_id, title)
                    yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

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
                yield f"data: {json.dumps({'type': 'message_metadata', 'data': final_message_metadata})}\n\n"
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                return

            # Resolve profile config once for fast / quality
            config = PROFILES[request.profile]
            council_models = config["council_models"]
            chairman_model = config["chairman_model"]

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = await stage1_collect_responses(request.content, council_models)
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results, council_models)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results, chairman_model)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Build per-message metadata (D-25 shape) — Fast / Quality only.
            # Plan 03-04 owns the quality_research path and will emit the
            # extended shape (with critic + stage4_triggered keys) from the
            # research_strategy module.
            message_metadata = {
                "profile": request.profile,
                "models": council_models,
                "chairman": chairman_model,
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
            yield f"data: {json.dumps({'type': 'message_metadata', 'data': message_metadata})}\n\n"

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except storage.ConversationNotFoundError:
            yield f"data: {json.dumps({'type': 'error', 'kind': 'not_found', 'message': 'Conversation not found'})}\n\n"
        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
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
