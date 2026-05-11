"""parse_critic_score test matrix.

Behavior verified empirically against backend.research_strategy.parse_critic_score
BEFORE encoding assertions ("tests document reality" guard from plan).

Key observations:
- Regex is `r'CRITIC SCORE:\s*(\d+)'` with `re.IGNORECASE`. `\d+` does NOT match
  a leading `-` sign, so `"CRITIC SCORE: -3"` matches NOTHING and returns
  `(None, None)`. The low-clamp test therefore exercises `0` (which DOES match,
  parses as 0, and clamps up to 1) — that is the only path the parser exposes
  for sub-1 input.
- Last-occurrence semantics: `list(re.finditer(...))[-1]` is taken, so when
  the rubric text echoes "CRITIC SCORE:" while explaining the format, the
  trailing actual score wins.
- PRIMARY CONCERN: greedy match ending at `\n\n` or end-of-string (`\Z`),
  case-insensitive, DOTALL.
"""

from backend.research_strategy import parse_critic_score


# ---------------------------------------------------------------------------
# Valid path
# ---------------------------------------------------------------------------


def test_parse_critic_score_valid_input():
    """Well-formed critic output parses to (score, concern)."""
    score, concern = parse_critic_score(
        "CRITIC SCORE: 7\nPRIMARY CONCERN: needs more detail"
    )
    assert score == 7
    assert concern == "needs more detail"


def test_parse_critic_score_score_only_returns_none_concern():
    """Score header without PRIMARY CONCERN header parses score only."""
    score, concern = parse_critic_score("CRITIC SCORE: 5")
    assert score == 5
    assert concern is None


def test_parse_critic_score_case_insensitive_header():
    """Lowercase header still parses (re.IGNORECASE)."""
    score, concern = parse_critic_score("critic score: 5")
    assert score == 5
    assert concern is None


def test_parse_critic_score_mixed_case_concern_header():
    """Mixed-case PRIMARY CONCERN still parses."""
    score, concern = parse_critic_score(
        "CRITIC SCORE: 8\nPrimary Concern: some concern"
    )
    assert score == 8
    assert concern == "some concern"


# ---------------------------------------------------------------------------
# Clamping
# ---------------------------------------------------------------------------


def test_parse_critic_score_clamps_high():
    """Score > 10 clamps to 10."""
    score, _ = parse_critic_score("CRITIC SCORE: 99")
    assert score == 10


def test_parse_critic_score_clamps_zero_to_one():
    """Score 0 clamps to 1 (lowest the parser can reach since \\d+ rejects negatives)."""
    score, _ = parse_critic_score("CRITIC SCORE: 0")
    assert score == 1


def test_parse_critic_score_negative_returns_none():
    """`\\d+` regex does not match leading `-`. `'CRITIC SCORE: -3'` parses no score.

    Documented reality (not aspiration): the plan asked for clamp-to-1 on negatives,
    but the actual implementation cannot see negative numbers — they fail the
    regex and return (None, None). If the project ever wants to handle negatives
    explicitly, the regex would need to become `(-?\\d+)`. For now, this test
    documents the current behaviour.
    """
    score, concern = parse_critic_score("CRITIC SCORE: -3")
    assert score is None
    assert concern is None


def test_parse_critic_score_clamps_inrange_unchanged():
    """Scores in [1,10] are returned as-is (no off-by-one)."""
    for n in [1, 5, 10]:
        score, _ = parse_critic_score(f"CRITIC SCORE: {n}")
        assert score == n


# ---------------------------------------------------------------------------
# Last-occurrence semantics
# ---------------------------------------------------------------------------


def test_parse_critic_score_last_occurrence_wins():
    """Multiple CRITIC SCORE matches: the trailing one wins (per docstring contract)."""
    score, concern = parse_critic_score(
        "Example: CRITIC SCORE: 3 in the rubric ...\n"
        "actually CRITIC SCORE: 8\n"
        "PRIMARY CONCERN: trailing wins"
    )
    assert score == 8
    assert concern == "trailing wins"


# ---------------------------------------------------------------------------
# Missing / empty input
# ---------------------------------------------------------------------------


def test_parse_critic_score_missing_returns_none():
    """No header at all → (None, None)."""
    assert parse_critic_score("no score here") == (None, None)


def test_parse_critic_score_empty_returns_none():
    """Empty string → (None, None) — early return guard."""
    assert parse_critic_score("") == (None, None)


def test_parse_critic_score_none_input_returns_none():
    """None-ish input (empty string) → (None, None). Parser does early-return on falsy."""
    # The signature is `str`, but the guard `if not text` catches "" / None / 0.
    # The production callers always pass `... or ""` — see research_strategy.py:358-359.
    assert parse_critic_score("") == (None, None)


# ---------------------------------------------------------------------------
# PRIMARY CONCERN edge cases
# ---------------------------------------------------------------------------


def test_parse_critic_score_concern_stops_at_blank_line():
    """PRIMARY CONCERN regex stops at the first `\\n\\n` boundary."""
    text = (
        "CRITIC SCORE: 6\n"
        "PRIMARY CONCERN: first paragraph concern\n"
        "\n"
        "Some trailing junk that must not be captured."
    )
    score, concern = parse_critic_score(text)
    assert score == 6
    assert concern == "first paragraph concern"


def test_parse_critic_score_concern_to_end_of_string():
    """When no blank line follows, concern extends to end-of-string."""
    text = "CRITIC SCORE: 4\nPRIMARY CONCERN: trailing concern with no terminator"
    score, concern = parse_critic_score(text)
    assert score == 4
    assert concern == "trailing concern with no terminator"
