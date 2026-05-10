"""JSON-based storage for conversations."""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
from pathlib import Path
from .config import DATA_DIR


SCHEMA_VERSION_V2 = 2


class ConversationNotFoundError(Exception):
    """Raised when a conversation file is missing on disk.

    Distinct from ValueError (which storage uses for 'invalid UUID input') so
    that callers in main.py can translate the two conditions to different
    HTTP status codes (400 vs 404). Without this distinction, a TOCTOU race
    between an existence check and a write would either propagate as an
    unhandled 500 or be mis-mapped to 400 by a naive ValueError catch.
    """
    pass


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """
    Get the file path for a conversation.

    Validates that conversation_id is a parseable UUID, then canonicalises it
    to the hyphenated lowercase form before constructing the on-disk path.
    Without canonicalisation, braced ({...}) and URN (urn:uuid:...) forms
    would parse but produce filenames that diverge from the canonical form
    written at creation time, breaking GET/PATCH/DELETE round-trip and (on
    Windows NTFS) triggering Alternate Data Stream interpretation via ':'.

    Per D-13: validation lives at the storage boundary so no caller can
    produce a path for an invalid ID. Per D-14: callers in main.py translate
    the resulting ValueError into HTTP 400.

    Raises:
        ValueError: If conversation_id is not a parseable UUID.
    """
    canonical = str(uuid.UUID(conversation_id))
    return os.path.join(DATA_DIR, f"{canonical}.json")


def migrate_message_v1_to_v2(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotent migration of a single message dict from v1 to v2 shape.

    v1 assistant messages may lack `metadata`. v2 always carries it (may be
    empty `{}`). User messages have no schema-versioned fields — they pass
    through unchanged.

    Per Phase 5 Wave 0 safety net: lazy migration only. Callers must NOT
    write the result back to disk implicitly; persistence happens organically
    on the next message append.
    """
    if msg.get("role") != "assistant":
        return msg
    migrated = dict(msg)
    migrated.setdefault("metadata", {})
    return migrated


def _migrate_conversation_if_needed(conv: Dict[str, Any]) -> Dict[str, Any]:
    """Apply v1→v2 migration lazily on read. Idempotent.

    Pre-v2 conversations on disk lack `schema_version` and `mode`. This helper
    stamps both (default `mode="fresh"`) and migrates each message, returning
    a NEW dict. The file on disk is NOT rewritten — that happens organically
    when a subsequent write (e.g. `add_user_message` → `save_conversation`)
    flushes the in-memory v2 shape back. This preserves the "lazy forever"
    contract from CONTEXT.md D-04.
    """
    if conv.get("schema_version") == SCHEMA_VERSION_V2:
        return conv
    conv = dict(conv)
    conv["schema_version"] = SCHEMA_VERSION_V2
    conv.setdefault("mode", "fresh")
    conv["messages"] = [migrate_message_v1_to_v2(m) for m in conv.get("messages", [])]
    return conv


def create_conversation(
    conversation_id: str,
    mode: Literal["fresh", "critique"] = "fresh",
) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation.
        mode: Conversation mode — `"fresh"` (default, v1 behaviour) or
            `"critique"` (Phase 5 critique-mode entry point). Stamped at the
            root of the saved JSON alongside `schema_version`.

    Returns:
        New conversation dict (v2-shaped, with `schema_version` and `mode`).
    """
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "schema_version": SCHEMA_VERSION_V2,
        "mode": mode,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        conv = json.load(f)

    # Lazy migration: stamp schema_version=2 + mode='fresh' on legacy files in
    # memory only. The file on disk stays v1 until a subsequent message write
    # organically flushes the v2 shape back (see CONTEXT.md D-04 — lazy forever,
    # no eager write-back). Do NOT call save_conversation here.
    return _migrate_conversation_if_needed(conv)


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Returns:
        List of conversation metadata dicts
    """
    ensure_data_dir()

    conversations = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                # Return metadata only
                conversations.append({
                    "id": data["id"],
                    "created_at": data["created_at"],
                    "title": data.get("title", "New Conversation"),
                    "message_count": len(data["messages"]),
                    "mode": data.get("mode", "fresh"),
                })

    # Sort by creation time, newest first
    conversations.sort(key=lambda x: x["created_at"], reverse=True)

    return conversations


def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ConversationNotFoundError(conversation_id)

    conversation["messages"].append({
        "role": "user",
        "content": content
    })

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
    stage4: Optional[Dict[str, Any]] = None,
    external_research: Optional[Dict[str, Dict[str, Any]]] = None,
):
    """
    Add an assistant message with all stages + optional profile metadata.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
        metadata: Optional opaque dict persisted verbatim. Per QUAL-04 / D-25
            shape:
                {
                    "profile": "fast" | "quality" | "quality_research",
                    "models": [str, ...],
                    "chairman": str,
                    # quality_research only (added by Plan 03-04):
                    "critic": str,
                    "stage4_triggered": bool,
                }
        stage4: Optional refined response payload (Plan 03-04). Only persisted
            when the critic gated Stage 4 for `quality_research` and the
            refinement query succeeded. Shape:
                {
                    "model": str,
                    "response": str,
                    "reasoning_details": Any | None,
                    "critic_score": int,
                    "primary_concern": str | None,
                }
            Fast / Quality NEVER pass this — backwards compat preserved.

    Backwards compat (D-27): messages persisted before Phase 3 have no
    `metadata` field. The frontend renders 'Quality (legacy)' for those —
    no migration of historical JSON files happens here.
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ConversationNotFoundError(conversation_id)

    message = {
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
    }
    if metadata is not None:
        message["metadata"] = metadata
    if stage4 is not None:
        message["stage4"] = stage4
    if external_research is not None:
        message["external_research"] = external_research
    conversation["messages"].append(message)
    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ConversationNotFoundError(conversation_id)

    conversation["title"] = title
    save_conversation(conversation)


def delete_conversation(conversation_id: str) -> None:
    """
    Delete a conversation file from storage.

    Args:
        conversation_id: Conversation identifier.

    Raises:
        ValueError: If conversation_id is not a valid UUID
            (propagated from get_conversation_path).
        FileNotFoundError: If the conversation file does not exist.
    """
    path = get_conversation_path(conversation_id)
    os.remove(path)
