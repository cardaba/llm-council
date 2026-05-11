"""Council profile routing tests.

Verifies that `run_full_council(profile=...)`:
- For `fast` and `quality`, fans out Stage 1/2 across exactly the profile's
  `council_models` list and synthesises via the profile's `chairman_model`.
- For `quality_research`, delegates to `research_strategy.run` (RSCH-04
  isolation invariant).

Stage 4 gating tests live alongside the routing tests so the council module
is tested as one cohesive routing surface.
"""

import pytest

from backend import research_strategy
from backend.config import PROFILES
from backend.council import run_full_council


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ok_response(content: str = "ok") -> dict:
    """Build a minimal successful response shape mimicking openrouter output."""
    return {
        "content": content,
        "reasoning_details": None,
        "cost": {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
    }


def _ranking_response_for(label_letters: list[str]) -> dict:
    """Build a Stage 2 ranking response listing labels in order."""
    body = "FINAL RANKING:\n" + "\n".join(
        f"{i+1}. Response {letter}" for i, letter in enumerate(label_letters)
    )
    return _ok_response(body)


# ---------------------------------------------------------------------------
# fast / quality routing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fast_profile_routes_to_fast_council_models(patch_query_model):
    """`profile='fast'` queries exactly the models in PROFILES['fast']."""
    expected_models = PROFILES["fast"]["council_models"]
    expected_chairman = PROFILES["fast"]["chairman_model"]

    def fake(model, messages):
        # Stage 2 ranking prompts include the literal "FINAL RANKING:" instruction —
        # for those, return a parseable ranking. Otherwise a generic ok.
        if any("FINAL RANKING:" in m.get("content", "") for m in messages):
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("response")

    calls = patch_query_model(fake)
    stage1, stage2, stage3, metadata = await run_full_council("test query", profile="fast")

    # Stage 1 — each council model queried once.
    stage1_models = [c[0] for c in calls if "FINAL RANKING:" not in c[1][0]["content"]
                     and c[0] != expected_chairman]
    # Better: collect models passed to Stage 1 directly from results.
    assert [r["model"] for r in stage1] == list(expected_models)
    # Chairman must be the profile's chairman_model.
    assert stage3["model"] == expected_chairman


@pytest.mark.asyncio
async def test_quality_profile_routes_to_quality_council_models(patch_query_model):
    """`profile='quality'` queries exactly the models in PROFILES['quality']."""
    expected_models = PROFILES["quality"]["council_models"]
    expected_chairman = PROFILES["quality"]["chairman_model"]

    def fake(model, messages):
        if any("FINAL RANKING:" in m.get("content", "") for m in messages):
            return _ranking_response_for(["A", "B", "C"])
        return _ok_response("response")

    patch_query_model(fake)
    stage1, stage2, stage3, metadata = await run_full_council("test", profile="quality")

    assert [r["model"] for r in stage1] == list(expected_models)
    assert stage3["model"] == expected_chairman


@pytest.mark.asyncio
async def test_fast_and_quality_use_disjoint_chairmen():
    """Profile config invariant: fast / quality chairmen differ — sanity gate.

    Doesn't exercise the council; just a structural assertion on PROFILES
    so the routing tests above remain meaningful even if PROFILES is edited.
    """
    assert PROFILES["fast"]["chairman_model"] != PROFILES["quality"]["chairman_model"]


# ---------------------------------------------------------------------------
# quality_research delegation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_quality_research_delegates_to_research_strategy(monkeypatch, patch_query_model):
    """`profile='quality_research'` calls `research_strategy.run`, NOT council's own Stage 1/2.

    Verifies RSCH-04 isolation: council.py never hits its own Stage 1/2/3 path
    for the research profile.
    """
    rs_calls: list[tuple] = []

    async def fake_run(user_query, profile_config, threshold_override=None):
        """Recorder fake for research_strategy.run that yields a minimal _final event."""
        rs_calls.append((user_query, profile_config, threshold_override))
        yield {
            "type": "_final",
            "stage1": [],
            "stage2": [],
            "stage3": {"model": profile_config["chairman_model"], "response": "research synth"},
            "stage4": None,
            "message_metadata": {
                "profile": "quality_research",
                "models": profile_config["council_models"],
                "chairman": profile_config["chairman_model"],
                "critic": profile_config["critic_model"],
                "stage4_triggered": False,
                "cost": {
                    "stage1": 0.0, "stage2": 0.0, "stage3": 0.0,
                    "stage4": None, "total": 0.0, "upstream_total": 0.0,
                    "currency": "USD",
                },
            },
        }

    # `run_full_council` imports research_strategy as `from . import research_strategy`
    # then calls `research_strategy.run(...)`. Patch on the module.
    monkeypatch.setattr(research_strategy, "run", fake_run)

    # Also install a query_model fake so any accidental fallthrough fails loudly.
    query_calls = patch_query_model(lambda m, msgs: _ok_response("must not be called"))

    stage1, stage2, stage3, metadata = await run_full_council(
        "research query", profile="quality_research"
    )

    # research_strategy.run was called exactly once with the QR profile config.
    assert len(rs_calls) == 1
    assert rs_calls[0][0] == "research query"
    assert rs_calls[0][1] == PROFILES["quality_research"]
    # council.py's own Stage 1/2/3 path must NOT have invoked query_model.
    assert query_calls == []
    # Returned shape matches the legacy 4-tuple contract.
    assert stage3 == {"model": PROFILES["quality_research"]["chairman_model"], "response": "research synth"}
    assert "message_metadata" in metadata
    assert metadata["message_metadata"]["profile"] == "quality_research"


@pytest.mark.asyncio
async def test_quality_research_forwards_threshold_override(monkeypatch, patch_query_model):
    """`stage4_threshold` kwarg is forwarded to `research_strategy.run` (SET-03)."""
    captured: dict = {}

    async def fake_run(user_query, profile_config, threshold_override=None):
        captured["threshold_override"] = threshold_override
        yield {
            "type": "_final",
            "stage1": [], "stage2": [],
            "stage3": {"model": "c", "response": "x"},
            "stage4": None,
            "message_metadata": {
                "profile": "quality_research",
                "models": profile_config["council_models"],
                "chairman": profile_config["chairman_model"],
                "critic": profile_config["critic_model"],
                "stage4_triggered": False,
                "cost": {
                    "stage1": 0.0, "stage2": 0.0, "stage3": 0.0,
                    "stage4": None, "total": 0.0, "upstream_total": 0.0,
                    "currency": "USD",
                },
            },
        }

    monkeypatch.setattr(research_strategy, "run", fake_run)
    patch_query_model(lambda m, msgs: _ok_response("ignored"))

    await run_full_council("q", profile="quality_research", stage4_threshold=5)
    assert captured["threshold_override"] == 5


# ---------------------------------------------------------------------------
# Stage 4 gating (research_strategy.run direct tests)
# ---------------------------------------------------------------------------
# These exercise research_strategy.run() directly because that's where the
# Stage 4 routing decision lives (council.py never gates Stage 4 — it only
# forwards to the strategy module).


async def _collect_events(gen) -> list[dict]:
    """Drain an async generator into a list (helper for stage-flow assertions)."""
    return [event async for event in gen]


@pytest.mark.asyncio
async def test_stage4_triggers_below_threshold(patch_query_model):
    """Critic score < threshold → stage4_complete event emitted + stage4_triggered=True."""
    qr_cfg = PROFILES["quality_research"]

    def fake(model, messages):
        prompt = messages[0]["content"]
        if "CRITIC SCORE:" in prompt and "PRIMARY CONCERN:" in prompt:
            # We're being asked to BE the critic — output a low score (below threshold=8).
            return _ok_response("CRITIC SCORE: 5\nPRIMARY CONCERN: needs grounding")
        if "FINAL RANKING:" in prompt:
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("ok")

    patch_query_model(fake)
    events = await _collect_events(research_strategy.run("q", qr_cfg))
    types = [e["type"] for e in events]
    final = next(e for e in events if e["type"] == "_final")

    assert "stage4_start" in types
    assert "stage4_complete" in types
    assert final["stage4"] is not None
    assert final["message_metadata"]["stage4_triggered"] is True


@pytest.mark.asyncio
async def test_stage4_skipped_at_or_above_threshold(patch_query_model):
    """Critic score >= threshold (8 by default) → no stage4 events; stage4_triggered=False."""
    qr_cfg = PROFILES["quality_research"]

    def fake(model, messages):
        prompt = messages[0]["content"]
        if "CRITIC SCORE:" in prompt and "PRIMARY CONCERN:" in prompt:
            # Score exactly at threshold — `score < threshold` is False, so Stage 4 skipped.
            return _ok_response("CRITIC SCORE: 8\nPRIMARY CONCERN: minor nitpick")
        if "FINAL RANKING:" in prompt:
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("ok")

    patch_query_model(fake)
    events = await _collect_events(research_strategy.run("q", qr_cfg))
    types = [e["type"] for e in events]
    final = next(e for e in events if e["type"] == "_final")

    assert "stage4_start" not in types
    assert "stage4_complete" not in types
    assert final["stage4"] is None
    assert final["message_metadata"]["stage4_triggered"] is False


@pytest.mark.asyncio
async def test_stage4_skipped_when_critic_unparseable(patch_query_model):
    """Critic returns no parseable score → conservative fallback, Stage 4 skipped."""
    qr_cfg = PROFILES["quality_research"]

    def fake(model, messages):
        prompt = messages[0]["content"]
        if "CRITIC SCORE:" in prompt and "PRIMARY CONCERN:" in prompt:
            # No score header at all — parser returns (None, None).
            return _ok_response("This response is generally fine.")
        if "FINAL RANKING:" in prompt:
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("ok")

    patch_query_model(fake)
    events = await _collect_events(research_strategy.run("q", qr_cfg))
    types = [e["type"] for e in events]
    final = next(e for e in events if e["type"] == "_final")

    assert "stage4_start" not in types
    assert final["stage4"] is None
    assert final["message_metadata"]["stage4_triggered"] is False


@pytest.mark.asyncio
async def test_stage4_threshold_override_changes_gating(patch_query_model):
    """threshold_override=5 + critic score 6 → score >= override → Stage 4 SKIPPED."""
    qr_cfg = PROFILES["quality_research"]  # default threshold 8

    def fake(model, messages):
        prompt = messages[0]["content"]
        if "CRITIC SCORE:" in prompt and "PRIMARY CONCERN:" in prompt:
            return _ok_response("CRITIC SCORE: 6\nPRIMARY CONCERN: meh")
        if "FINAL RANKING:" in prompt:
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("ok")

    patch_query_model(fake)
    # Override threshold downward from 8 to 5: 6 >= 5, so Stage 4 must skip.
    events = await _collect_events(
        research_strategy.run("q", qr_cfg, threshold_override=5)
    )
    final = next(e for e in events if e["type"] == "_final")
    assert final["stage4"] is None
    assert final["message_metadata"]["stage4_triggered"] is False


@pytest.mark.asyncio
async def test_quality_research_metadata_includes_critic_model(patch_query_model):
    """`message_metadata` carries critic_model = profile's critic_model (D-06)."""
    qr_cfg = PROFILES["quality_research"]

    def fake(model, messages):
        prompt = messages[0]["content"]
        if "CRITIC SCORE:" in prompt and "PRIMARY CONCERN:" in prompt:
            return _ok_response("CRITIC SCORE: 9\nPRIMARY CONCERN: nothing major")
        if "FINAL RANKING:" in prompt:
            return _ranking_response_for(["A", "B", "C", "D"])
        return _ok_response("ok")

    patch_query_model(fake)
    events = await _collect_events(research_strategy.run("q", qr_cfg))
    final = next(e for e in events if e["type"] == "_final")
    assert final["message_metadata"]["critic"] == qr_cfg["critic_model"]
