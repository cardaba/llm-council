"""Storage layer tests: UUID validation, path-traversal rejection, round-trip + v1->v2 migration."""

import json
from pathlib import Path

import pytest

from backend import storage
from backend.storage import (
    SCHEMA_VERSION_V2,
    _migrate_conversation_if_needed,
    add_assistant_message,
    create_conversation,
    get_conversation,
    get_conversation_path,
    migrate_message_v1_to_v2,
)


VALID_UUID = "00000000-0000-0000-0000-000000000001"


# ---------------------------------------------------------------------------
# get_conversation_path — UUID validation + path-traversal rejection (SEC-01)
# ---------------------------------------------------------------------------


def test_get_conversation_path_rejects_non_uuid():
    """Non-UUID strings raise ValueError (uuid.UUID parser fails)."""
    with pytest.raises(ValueError):
        get_conversation_path("not-a-uuid")


def test_get_conversation_path_rejects_path_traversal():
    """Path traversal payloads fail UUID parse — same code path as invalid UUID."""
    with pytest.raises(ValueError):
        get_conversation_path("../../etc/passwd")


def test_get_conversation_path_rejects_empty_string():
    """Empty string fails UUID parse."""
    with pytest.raises(ValueError):
        get_conversation_path("")


def test_get_conversation_path_accepts_valid_uuid(_tmp_data_dir: Path):
    """Valid UUID returns a path rooted in the tmp DATA_DIR."""
    path = get_conversation_path(VALID_UUID)
    assert str(_tmp_data_dir) in path
    assert path.endswith(f"{VALID_UUID}.json")


def test_get_conversation_path_canonicalises_braced_uuid(_tmp_data_dir: Path):
    """Braced UUID parses but canonicalises to hyphenated lowercase form."""
    path = get_conversation_path("{00000000-0000-0000-0000-000000000001}")
    assert path.endswith(f"{VALID_UUID}.json")


# ---------------------------------------------------------------------------
# create_conversation + get_conversation round-trip
# ---------------------------------------------------------------------------


def test_create_and_get_round_trip():
    """create then get returns a dict with matching id + v2 shape."""
    create_conversation(VALID_UUID)
    conv = get_conversation(VALID_UUID)
    assert conv is not None
    assert conv["id"] == VALID_UUID
    assert conv["schema_version"] == SCHEMA_VERSION_V2
    assert conv["mode"] == "fresh"
    assert conv["messages"] == []


def test_get_conversation_returns_none_when_missing():
    """get_conversation for a non-existent UUID returns None (not raises)."""
    assert get_conversation(VALID_UUID) is None


def test_create_conversation_with_critique_mode():
    """Passing mode='critique' stamps the mode field at the root."""
    create_conversation(VALID_UUID, mode="critique")
    conv = get_conversation(VALID_UUID)
    assert conv is not None
    assert conv["mode"] == "critique"


# ---------------------------------------------------------------------------
# add_assistant_message — metadata + stage4 + external_research persistence
# ---------------------------------------------------------------------------


def test_add_assistant_message_persists_metadata():
    """metadata dict is persisted verbatim and read back intact."""
    create_conversation(VALID_UUID)
    metadata = {
        "profile": "fast",
        "models": ["openai/gpt-4.1-nano"],
        "chairman": "anthropic/claude-haiku-4.5",
        "label_to_model": {"Response A": "openai/gpt-4.1-nano"},
        "aggregate_rankings": [{"model": "openai/gpt-4.1-nano", "average_rank": 1.0}],
    }
    add_assistant_message(
        VALID_UUID,
        stage1=[{"model": "m", "response": "r"}],
        stage2=[],
        stage3={"model": "c", "response": "final"},
        metadata=metadata,
    )
    conv = get_conversation(VALID_UUID)
    assert conv is not None
    msg = conv["messages"][0]
    assert msg["role"] == "assistant"
    assert msg["metadata"] == metadata


def test_add_assistant_message_persists_stage4_when_present():
    """stage4 dict is persisted when passed; absent when None."""
    create_conversation(VALID_UUID)
    stage4 = {
        "model": "anthropic/claude-opus-4.7",
        "response": "refined",
        "critic_score": 6,
        "primary_concern": "needs more grounding",
    }
    add_assistant_message(
        VALID_UUID,
        stage1=[],
        stage2=[],
        stage3={"model": "c", "response": "v1"},
        metadata={"profile": "quality_research"},
        stage4=stage4,
    )
    conv = get_conversation(VALID_UUID)
    msg = conv["messages"][0]
    assert msg["stage4"] == stage4


def test_add_assistant_message_omits_stage4_when_none():
    """stage4=None means the key is absent from the persisted message (not null)."""
    create_conversation(VALID_UUID)
    add_assistant_message(
        VALID_UUID,
        stage1=[],
        stage2=[],
        stage3={"model": "c", "response": "v1"},
        metadata={"profile": "fast"},
        stage4=None,
    )
    conv = get_conversation(VALID_UUID)
    msg = conv["messages"][0]
    assert "stage4" not in msg


def test_add_assistant_message_persists_external_research_when_present():
    """external_research dict is persisted when passed; absent when None."""
    create_conversation(VALID_UUID, mode="critique")
    external_research = {
        "openai/gpt-4.1-nano": {
            "filename": "research.md",
            "content": "# Research\nSome findings.",
            "size_bytes": 32,
        }
    }
    add_assistant_message(
        VALID_UUID,
        stage1=[],
        stage2=[],
        stage3={"model": "c", "response": "ok"},
        metadata={"profile": "fast"},
        external_research=external_research,
    )
    conv = get_conversation(VALID_UUID)
    msg = conv["messages"][0]
    assert msg["external_research"] == external_research


def test_add_assistant_message_omits_external_research_when_none():
    """external_research=None means the key is absent from the persisted message."""
    create_conversation(VALID_UUID)
    add_assistant_message(
        VALID_UUID,
        stage1=[],
        stage2=[],
        stage3={"model": "c", "response": "ok"},
        metadata={"profile": "fast"},
        external_research=None,
    )
    conv = get_conversation(VALID_UUID)
    msg = conv["messages"][0]
    assert "external_research" not in msg


# ---------------------------------------------------------------------------
# v1 -> v2 migration (PERS-03)
# ---------------------------------------------------------------------------


# Fixture file path resolution — sits beside this test module.
_FIXTURES_DIR = Path(__file__).parent / "fixtures"
_V1_FIXTURE_PATH = _FIXTURES_DIR / "conversation_v1_sample.json"


def _load_v1_fixture() -> dict:
    """Load the v1 conversation sample from disk."""
    with open(_V1_FIXTURE_PATH, "r") as f:
        return json.load(f)


def test_v1_fixture_lacks_schema_version_and_mode():
    """Sanity: the fixture is genuinely pre-v2 (no schema_version, no mode)."""
    v1 = _load_v1_fixture()
    assert "schema_version" not in v1
    assert "mode" not in v1


def test_migration_adds_schema_version_2_to_v1_dict():
    """v1 dict gets schema_version=2 after migration."""
    v1 = _load_v1_fixture()
    migrated = _migrate_conversation_if_needed(v1)
    assert migrated["schema_version"] == SCHEMA_VERSION_V2


def test_migration_adds_mode_fresh_to_v1_dict():
    """v1 dict gets mode='fresh' after migration (default)."""
    v1 = _load_v1_fixture()
    migrated = _migrate_conversation_if_needed(v1)
    assert migrated["mode"] == "fresh"


def test_migration_is_idempotent():
    """Running migration on an already-v2 dict is a no-op (same values)."""
    v1 = _load_v1_fixture()
    once = _migrate_conversation_if_needed(v1)
    twice = _migrate_conversation_if_needed(once)
    assert twice["schema_version"] == SCHEMA_VERSION_V2
    assert twice["mode"] == "fresh"
    # No double-mutation of messages either.
    assert twice["messages"] == once["messages"]


def test_migration_adds_empty_metadata_to_legacy_assistant_messages():
    """Assistant messages without `metadata` key receive metadata: {} after migration."""
    v1 = _load_v1_fixture()
    migrated = _migrate_conversation_if_needed(v1)
    assistant_msgs = [m for m in migrated["messages"] if m.get("role") == "assistant"]
    assert assistant_msgs, "fixture must contain at least one assistant message"
    for msg in assistant_msgs:
        assert "metadata" in msg
        assert msg["metadata"] == {}


def test_migration_does_not_touch_user_messages():
    """User messages pass through migration unchanged."""
    v1 = _load_v1_fixture()
    migrated = _migrate_conversation_if_needed(v1)
    user_msgs = [m for m in migrated["messages"] if m.get("role") == "user"]
    assert user_msgs
    for msg in user_msgs:
        # No metadata key added to user messages.
        assert "metadata" not in msg


def test_migrate_message_v1_to_v2_idempotent_for_v2_message():
    """A message that already has metadata is not double-stamped."""
    msg = {"role": "assistant", "stage1": [], "metadata": {"profile": "fast"}}
    migrated = migrate_message_v1_to_v2(msg)
    assert migrated["metadata"] == {"profile": "fast"}


def test_migrate_message_v1_to_v2_passes_user_through():
    """User messages are returned unchanged (same object permitted)."""
    msg = {"role": "user", "content": "hello"}
    migrated = migrate_message_v1_to_v2(msg)
    assert migrated == msg


def test_get_conversation_applies_migration_lazily(_tmp_data_dir: Path):
    """Writing a v1 file to disk and reading via get_conversation yields a v2 dict in memory."""
    v1 = _load_v1_fixture()
    file_path = _tmp_data_dir / f"{VALID_UUID}.json"
    with open(file_path, "w") as f:
        json.dump(v1, f)
    conv = get_conversation(VALID_UUID)
    assert conv is not None
    assert conv["schema_version"] == SCHEMA_VERSION_V2
    assert conv["mode"] == "fresh"
    # Disk file must remain unchanged (lazy migration: no eager rewrite).
    with open(file_path, "r") as f:
        on_disk = json.load(f)
    assert "schema_version" not in on_disk
