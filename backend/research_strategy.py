"""Research strategy for the `quality_research` profile.

Owns the full orchestration of Stage 1 + Stage 2 + Stage 3 + critic + Stage 4
for the `quality_research` profile. `council.py` delegates to this module via a
single line so future fully-agentic deep-research (RSCH-V2-01) can replace
`run()` here without touching `council.py` (RSCH-04 isolation).

Design notes (per .planning/phases/03-quality-dial-pragmatic-deep-research/03-RESEARCH.md):

- Stage 1 council uses 4 reasoning models all with `:online` suffix; reasoning
  is enabled via the OpenRouter `reasoning={"enabled": true}` payload param,
  NOT via a `:thinking` model-id suffix (that suffix does not exist).
- The `:online` plugin is deprecated upstream in favour of the
  `openrouter:web_search` server tool; v1 keeps `:online` and the migration
  to the server tool is explicitly deferred to RSCH-V2-XX.
- The critic uses LLM-as-judge with an anchored "CRITIC SCORE:" parser and a
  conservative fallback (skip Stage 4 on parse failure — see
  `parse_critic_score`).
- Stage 2 reuses `council.parse_ranking_from_text` and
  `council.calculate_aggregate_rankings` — these are profile-agnostic helpers
  and are the ONLY symbols this module imports from `council.py`.
- Annotations from web search (`data['choices'][0]['message']['annotations']`)
  are NOT captured in v1; citation extraction is RSCH-V2-02.
- KNOWN RISK: critic and chairman are the same model family (Opus 4.7) per
  D-06. The critic prompt is independent and the threshold is calibratable
  (CD-04). If scores skew systematically high after deployment, the
  recommended adjustment is to tune `stage4_threshold` upward in
  `config.py.PROFILES["quality_research"]`, NOT to change the critic model
  here (so this module stays config-agnostic).
- Quirks of Opus 4.7 (RESEARCH.md §"OpenRouter model availability"): the
  provider ignores `temperature` / `top_p` / `top_k` and ignores
  `reasoning.max_tokens`. `verbosity:"xhigh"` is available but unused here.
  None of these affect the v1 single-shot pipeline.

Public surface:
    CRITIC_RUBRIC: str             — module-level critic prompt template.
    STAGE4_PROMPT: str             — module-level refinement prompt template.
    parse_critic_score(text)       — defensive parser for the critic output.
    run(user_query, profile_config) — async generator that yields stage events.

The `_final` event yielded last is an INTERNAL convention between this
module and its callers (`main.py.event_generator` / `council.py.run_full_council`).
The leading underscore signals callers MUST NOT forward it as an SSE event;
they intercept it and use its payload to persist the message via storage.
"""

from typing import AsyncGenerator, Dict, Any, Optional, Tuple
import asyncio
import re

from .openrouter import query_model
from .council import (
    parse_ranking_from_text,
    calculate_aggregate_rankings,
)


CRITIC_RUBRIC = """You are an independent quality reviewer evaluating a synthesized answer from an LLM council.

Score the answer 1-10 on these four dimensions, then output a SINGLE overall score
that reflects whether this answer is ready to ship to the user, or whether it
should be refined.

Dimensions:
1. **Groundedness** — Does the answer rely on the council's research / web sources, or does it speculate? Citations or specific facts strengthen this dimension.
2. **Completeness** — Does it address the full scope of the user's question, or does it skip aspects?
3. **Clarity** — Is it free of unnecessary hedging ("I'm not sure", "it depends") that the question doesn't require?
4. **Consistency** — Does it align with the council's aggregate ranking — i.e., does it incorporate the strongest insights, not the weakest?

Score scale anchors:
- 9-10: Ship as-is. Strong on all dimensions.
- 7-8: Ship as-is. Minor weakness in 1-2 dimensions but overall solid.
- 5-6: Borderline. Refinement would meaningfully improve it.
- 1-4: Refinement required. Material gap in 2+ dimensions.

User question:
{question}

Council aggregate ranking (best to worst):
{aggregate_ranking_summary}

Synthesized answer to evaluate:
{chairman_synthesis}

Output your evaluation in EXACTLY this format:

CRITIC SCORE: <integer 1-10>
GROUNDEDNESS: <integer 1-10> — <one-sentence justification>
COMPLETENESS: <integer 1-10> — <one-sentence justification>
CLARITY: <integer 1-10> — <one-sentence justification>
CONSISTENCY: <integer 1-10> — <one-sentence justification>
PRIMARY CONCERN: <one sentence — the single most important reason for the overall score>

Output nothing else after this block.
"""


STAGE4_PROMPT = """The chairman synthesized this answer:

{synthesis}

An independent critic flagged these issues:

{critic_reason}

Score: {critic_score}/10. Threshold for refinement is <8.

Produce a refined answer addressing the critic's points. Keep what works; revise what was flagged. Do NOT mention the critic in the output.
"""


def parse_critic_score(text: str) -> Tuple[Optional[int], Optional[str]]:
    """
    Defensive parser for the critic's output.

    Anchors on the literal "CRITIC SCORE:" header (case-insensitive) and
    takes the LAST occurrence — some models echo the header verbatim while
    explaining the rubric, so the actual score is the trailing match.
    Clamps the score to 1-10. Returns (None, None) when no score header is
    present, signalling to the caller that Stage 4 must be skipped
    (conservative fallback per RESEARCH.md §"Critic prompt design").

    Args:
        text: Full text response from the critic LLM.

    Returns:
        (overall_score, primary_concern) tuple. Either component is None
        when not parseable.
    """
    if not text:
        return None, None

    score_matches = list(re.finditer(r'CRITIC SCORE:\s*(\d+)', text, re.IGNORECASE))
    if not score_matches:
        return None, None
    score = int(score_matches[-1].group(1))
    score = max(1, min(10, score))

    concern_match = re.search(
        r'PRIMARY CONCERN:\s*(.+?)(?:\n\n|\Z)',
        text, re.IGNORECASE | re.DOTALL,
    )
    concern = concern_match.group(1).strip() if concern_match else None
    return score, concern


async def run(
    user_query: str,
    profile_config: Dict[str, Any],
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Async generator that yields stage event dicts for the quality_research pipeline.

    Each yielded dict has shape compatible with `main.py.event_generator`:
        {"type": "stage1_start"} | {"type": "stage1_complete", "data": [...]}
        {"type": "stage2_start"} | {"type": "stage2_complete", "data": [...], "metadata": {...}}
        {"type": "stage3_start"} | {"type": "stage3_complete", "data": {...}}
        {"type": "critic_complete", "data": {"score": int|None, "concern": str|None}}
        {"type": "stage4_start"}    # only when score < threshold
        {"type": "stage4_complete", "data": {"response": str, "critic_score": int, "primary_concern": str}}

    A final yield carries the consolidated tuple-like shape used by storage:
        {"type": "_final", "stage1": [...], "stage2": [...], "stage3": {...},
         "stage4": {...} | None, "message_metadata": {...}}

    `main.py` consumes events whose type does not start with `_` and emits them
    as SSE; it intercepts `_final` and uses its payload to call
    `storage.add_assistant_message`.

    Args:
        user_query: The user's original question.
        profile_config: PROFILES["quality_research"] dict — passed in by the
            caller so this module never imports `PROFILES` directly
            (RSCH-04 isolation).
    """
    council_models = profile_config["council_models"]
    chairman_model = profile_config["chairman_model"]
    critic_model = profile_config["critic_model"]
    threshold = profile_config["stage4_threshold"]

    # ------------------------------------------------------------------
    # Stage 1: 4 reasoning models with `:online` + reasoning=True
    # ------------------------------------------------------------------
    # NOTE: query_models_parallel does NOT accept the reasoning kwarg
    # (extending it would impact fast/quality flows). Build the gather
    # inline here so reasoning stays opt-in per call.
    # NOTE: web search annotations are at
    # data['choices'][0]['message']['annotations'] but are NOT captured
    # in v1 — RSCH-V2-02 will surface citations.
    yield {"type": "stage1_start"}
    messages = [{"role": "user", "content": user_query}]
    tasks = [query_model(m, messages, reasoning=True) for m in council_models]
    raw_responses = await asyncio.gather(*tasks)
    stage1_results = []
    for model, response in zip(council_models, raw_responses):
        if response is not None:
            stage1_results.append({
                "model": model,
                "response": response.get("content", ""),
                "reasoning_details": response.get("reasoning_details"),
                "cost": response.get("cost") or {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
            })
    yield {"type": "stage1_complete", "data": stage1_results}

    if not stage1_results:
        # All models failed — surface a stage3-shaped error so storage stays
        # consistent and finalize without firing critic/Stage 4.
        yield {
            "type": "_final",
            "stage1": [],
            "stage2": [],
            "stage3": {"model": "error", "response": "All research models failed."},
            "stage4": None,
            "message_metadata": {
                "profile": "quality_research",
                "models": council_models,
                "chairman": chairman_model,
                "critic": critic_model,
                "stage4_triggered": False,
                "cost": {
                    "stage1": 0.0,
                    "stage2": 0.0,
                    "stage3": 0.0,
                    "stage4": None,
                    "total": 0.0,
                    "upstream_total": 0.0,
                    "currency": "USD",
                },
            },
        }
        return

    # ------------------------------------------------------------------
    # Stage 2: rankings (reuse council.py helpers — profile-agnostic)
    # ------------------------------------------------------------------
    yield {"type": "stage2_start"}
    labels = [chr(65 + i) for i in range(len(stage1_results))]
    label_to_model = {
        f"Response {label}": r["model"]
        for label, r in zip(labels, stage1_results)
    }
    responses_text = "\n\n".join(
        f"Response {label}:\n{r['response']}"
        for label, r in zip(labels, stage1_results)
    )
    ranking_prompt = (
        "You are evaluating different responses to the following question:\n\n"
        f"Question: {user_query}\n\n"
        f"Here are the responses from different models (anonymized):\n\n{responses_text}\n\n"
        "Your task:\n"
        "1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.\n"
        "2. Then, at the very end of your response, provide a final ranking.\n\n"
        "IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:\n"
        "- Start with the line \"FINAL RANKING:\" (all caps, with colon)\n"
        "- Then list the responses from best to worst as a numbered list\n"
        "- Each line should be: number, period, space, then ONLY the response label (e.g., \"1. Response A\")\n"
        "- Do not add any other text or explanations in the ranking section\n"
    )
    ranking_messages = [{"role": "user", "content": ranking_prompt}]
    # Reasoning models still benefit from reasoning during ranking — they
    # produce more discriminating evaluations when allowed to think first.
    ranking_tasks = [query_model(m, ranking_messages, reasoning=True) for m in council_models]
    ranking_raw = await asyncio.gather(*ranking_tasks)
    stage2_results = []
    for model, response in zip(council_models, ranking_raw):
        if response is not None:
            full_text = response.get("content", "")
            stage2_results.append({
                "model": model,
                "ranking": full_text,
                "parsed_ranking": parse_ranking_from_text(full_text),
                "cost": response.get("cost") or {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
            })
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
    yield {
        "type": "stage2_complete",
        "data": stage2_results,
        "metadata": {
            "label_to_model": label_to_model,
            "aggregate_rankings": aggregate_rankings,
        },
    }

    # ------------------------------------------------------------------
    # Stage 3: chairman synthesis (reasoning enabled)
    # ------------------------------------------------------------------
    yield {"type": "stage3_start"}
    stage1_text = "\n\n".join(
        f"Model: {r['model']}\nResponse: {r['response']}" for r in stage1_results
    )
    stage2_text = "\n\n".join(
        f"Model: {r['model']}\nRanking: {r['ranking']}" for r in stage2_results
    )
    chairman_prompt = (
        "You are the Chairman of an LLM Council. Multiple AI models have provided responses "
        "to a user's question, and then ranked each other's responses.\n\n"
        f"Original Question: {user_query}\n\n"
        f"STAGE 1 - Individual Responses:\n{stage1_text}\n\n"
        f"STAGE 2 - Peer Rankings:\n{stage2_text}\n\n"
        "Your task as Chairman is to synthesize all of this information into a single, "
        "comprehensive, accurate answer to the user's original question. Consider:\n"
        "- The individual responses and their insights\n"
        "- The peer rankings and what they reveal about response quality\n"
        "- Any patterns of agreement or disagreement\n\n"
        "Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"
    )
    chairman_response = await query_model(
        chairman_model,
        [{"role": "user", "content": chairman_prompt}],
        reasoning=True,
    )
    if chairman_response is None:
        stage3_result = {
            "model": chairman_model,
            "response": "Error: Unable to generate final synthesis.",
            "cost": {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
        }
    else:
        stage3_result = {
            "model": chairman_model,
            "response": chairman_response.get("content", ""),
            "reasoning_details": chairman_response.get("reasoning_details"),
            "cost": chairman_response.get("cost") or {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
        }
    yield {"type": "stage3_complete", "data": stage3_result}

    # ------------------------------------------------------------------
    # Critic invocation — LLM-as-judge with anchored parser
    # ------------------------------------------------------------------
    # KNOWN RISK: critic and chairman are the same model family (Opus 4.7).
    # Recalibrate `stage4_threshold` (CD-04) in config.py if scores skew high.
    # Critic does NOT use reasoning=True — the rubric is deterministic and
    # we want a fast, anchored output, not a chain-of-thought meditation.
    aggregate_summary = "\n".join(
        f"{i+1}. {row['model']} (avg rank {row['average_rank']})"
        for i, row in enumerate(aggregate_rankings)
    ) or "(no aggregate ranking available)"
    critic_prompt = CRITIC_RUBRIC.format(
        question=user_query,
        aggregate_ranking_summary=aggregate_summary,
        chairman_synthesis=stage3_result["response"],
    )
    critic_response = await query_model(
        critic_model,
        [{"role": "user", "content": critic_prompt}],
    )
    critic_score: Optional[int] = None
    primary_concern: Optional[str] = None
    critic_cost = {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0}
    if critic_response is not None:
        critic_score, primary_concern = parse_critic_score(
            critic_response.get("content", "") or ""
        )
        critic_cost = critic_response.get("cost") or critic_cost
    yield {
        "type": "critic_complete",
        "data": {"score": critic_score, "concern": primary_concern},
    }

    # ------------------------------------------------------------------
    # Stage 4 conditional refinement
    # ------------------------------------------------------------------
    # Conservative fallback: skip Stage 4 if parse failed. RESEARCH.md
    # §"Critic prompt design" — better to ship the chairman synthesis than
    # to refine blindly when we cannot judge whether refinement is needed.
    stage4_result: Optional[Dict[str, Any]] = None
    stage4_triggered = False
    if critic_score is not None and critic_score < threshold:
        yield {"type": "stage4_start"}
        stage4_prompt = STAGE4_PROMPT.format(
            synthesis=stage3_result["response"],
            critic_reason=primary_concern or "(no specific concern parsed)",
            critic_score=critic_score,
        )
        stage4_raw = await query_model(
            chairman_model,
            [{"role": "user", "content": stage4_prompt}],
            reasoning=True,
        )
        if stage4_raw is not None:
            stage4_result = {
                "model": chairman_model,
                "response": stage4_raw.get("content", ""),
                "reasoning_details": stage4_raw.get("reasoning_details"),
                "critic_score": critic_score,
                "primary_concern": primary_concern,
                "cost": stage4_raw.get("cost") or {"openrouter_fee_usd": 0.0, "upstream_usd": 0.0},
            }
            stage4_triggered = True
            yield {"type": "stage4_complete", "data": stage4_result}
        else:
            # Stage 4 query failed — graceful degradation per CONTEXT.md
            # "Si Stage 4 falla → fallback to chairman synthesis". Do NOT
            # emit stage4_complete; frontend will not render the section.
            stage4_triggered = False

    # ------------------------------------------------------------------
    # Per-stage cost accumulation (Phase 6 COST-01)
    # ------------------------------------------------------------------
    # Critic is a QR-specific call that always runs, but the locked schema
    # exposes only stage1-4. Folding its cost into stage3 preserves the
    # invariant `total == stage1+stage2+stage3+(stage4 or 0)` while keeping
    # the user's spend faithful. `stage4` stays None when refinement was
    # blocked (per plan contract) — critic cost is in stage3 either way.
    stage1_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage1_results), 0.0)
    stage1_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage1_results), 0.0)
    stage2_fee = sum((r.get("cost", {}).get("openrouter_fee_usd", 0.0) for r in stage2_results), 0.0)
    stage2_upstream = sum((r.get("cost", {}).get("upstream_usd", 0.0) for r in stage2_results), 0.0)
    stage3_fee = stage3_result.get("cost", {}).get("openrouter_fee_usd", 0.0) + critic_cost["openrouter_fee_usd"]
    stage3_upstream = stage3_result.get("cost", {}).get("upstream_usd", 0.0) + critic_cost["upstream_usd"]
    stage4_fee: Optional[float] = None
    stage4_upstream_val: float = 0.0
    if stage4_result is not None:
        stage4_fee = stage4_result.get("cost", {}).get("openrouter_fee_usd", 0.0)
        stage4_upstream_val = stage4_result.get("cost", {}).get("upstream_usd", 0.0)

    cost_block = {
        "stage1": stage1_fee,
        "stage2": stage2_fee,
        "stage3": stage3_fee,
        "stage4": stage4_fee,
        "total": stage1_fee + stage2_fee + stage3_fee + (stage4_fee or 0.0),
        "upstream_total": stage1_upstream + stage2_upstream + stage3_upstream + stage4_upstream_val,
        "currency": "USD",
    }

    # ------------------------------------------------------------------
    # Final consolidation event for storage (internal — not SSE)
    # ------------------------------------------------------------------
    yield {
        "type": "_final",
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "stage4": stage4_result,
        "message_metadata": {
            "profile": "quality_research",
            "models": council_models,
            "chairman": chairman_model,
            "critic": critic_model,
            "stage4_triggered": stage4_triggered,
            "cost": cost_block,
        },
    }
