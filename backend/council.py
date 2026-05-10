"""3-stage LLM Council orchestration.

Profile routing: `fast` and `quality` use this module's stages directly.
`quality_research` delegates to `research_strategy.run()` (Plan 03-04).

RSCH-04 isolation: this module MUST NOT import research-specific
configuration. Only the strategy module owns the critic model id, the
Stage 4 threshold, and the `:online` reasoning model lists. Council
accesses `PROFILES[profile]` with a variable, never with a literal.
"""

import re
from typing import List, Dict, Any, Tuple, Optional, Pattern
from .openrouter import query_models_parallel, query_model
from .config import PROFILES
from . import research_strategy


# ---------------------------------------------------------------------------
# Critique-mode helpers (Phase 5 Plan 02)
# ---------------------------------------------------------------------------
# Stage 2 truncate constants — PITFALLS.md §CRIT-1
STAGE2_TRUNCATE_MARKER = "\n\n[…truncated, full text in Stage 1 tab]"
STAGE2_TRUNCATE_DEFAULT_CHARS = 600 * 4  # 600 tokens × 4 chars/token heuristic = 2400 chars

# Anonymization patterns — D-08 verbatim from CONTEXT.md
# Model IDs come from PROFILES so a future quality-profile bump auto-updates the set.
_MODEL_ID_PATTERNS: List[Pattern] = [
    re.compile(re.escape(m_id), re.IGNORECASE)
    for m_id in PROFILES["quality"]["council_models"]
]
# D-08 first-person self-reference patterns (verbatim from CONTEXT.md).
# Third-person mentions (e.g. "GPT-4 hallucinations") are intentionally NOT
# stripped (D-09) — only first-person self-references and literal model IDs.
_SELF_REF_PATTERNS: List[Pattern] = [
    re.compile(r"\bAs Claude\b", re.IGNORECASE),
    re.compile(r"\bI am (Claude|GPT|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bI, (GPT|Claude|Gemini|Opus)\b", re.IGNORECASE),
    re.compile(r"\bas an AI assistant from (Anthropic|OpenAI|Google)\b", re.IGNORECASE),
]


def _build_critique_prompts(
    critique_instruction: str,
    external_context: Dict[str, Dict[str, Any]],
    council_models: List[str],
) -> Dict[str, List[Dict[str, str]]]:
    """Per-model messages — each model sees ALL files, its own marked [YOUR PRIOR WORK].

    Args:
        critique_instruction: User-provided critique directive.
        external_context: {model_id: {"filename": str, "content": str, "size_bytes": int}}
        council_models: Active council models (one per uploaded slot).

    Returns:
        {model_id: [{"role": "user", "content": <prompt>}]}. Each model's prompt
        includes ALL files, attributed by author; the model's own file is marked
        `[YOUR PRIOR WORK]`, peers' files `[PEER'S PRIOR WORK]`.
    """
    prompts: Dict[str, List[Dict[str, str]]] = {}
    for self_model in council_models:
        sections = []
        for other_model, file_obj in external_context.items():
            marker = "[YOUR PRIOR WORK]" if other_model == self_model else "[PEER'S PRIOR WORK]"
            sections.append(
                f"--- {marker} authored by {other_model} (file: {file_obj['filename']}) ---\n"
                f"{file_obj['content']}\n"
                f"--- END ---"
            )
        full = "\n\n".join(sections)
        prompt = (
            "You are participating in a council critique. Below are 1-3 deep "
            "research outputs. One is marked [YOUR PRIOR WORK] — that is YOUR "
            "own previous research that you must now critique self-critically. "
            "The others are [PEER'S PRIOR WORK].\n\n"
            f"{full}\n\n"
            f"USER'S CRITIQUE INSTRUCTION:\n{critique_instruction}\n\n"
            "Produce a critique addressing the instruction above. Be specific, "
            "cite sections, and treat your own prior work with the same scrutiny "
            "as your peers'."
        )
        prompts[self_model] = [{"role": "user", "content": prompt}]
    return prompts


async def _query_models_individually(
    models: List[str],
    messages_per_model: Dict[str, List[Dict[str, str]]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Per-model fan-out — DIFFERENT messages per model.

    Analog of `query_models_parallel` but each model receives its own message
    list (built by `_build_critique_prompts`). Failures return None per model
    and are filtered out by the caller (graceful degradation idiom).
    """
    import asyncio
    tasks = [query_model(model, messages_per_model[model]) for model in models]
    responses = await asyncio.gather(*tasks)
    return {model: response for model, response in zip(models, responses)}


def _anonymize_critique_text(text: str, slot_index: int) -> str:
    """Strip authorship signals BEFORE Stage 2 concatenation (D-08).

    Replaces literal model IDs from `PROFILES["quality"]["council_models"]`
    with `Author N` (slot_index+1) and first-person self-references with
    `[author redacted]`. Third-person mentions (e.g. "GPT-4 hallucinations")
    are intentionally NOT stripped (D-09).

    Args:
        text: Raw Stage 1 response text from a single model.
        slot_index: Zero-based slot index used to derive the redacted label.

    Returns:
        Anonymized copy of `text`. Does not mutate the caller.
    """
    result = text
    author_label = f"Author {slot_index + 1}"
    for pattern in _MODEL_ID_PATTERNS:
        result = pattern.sub(author_label, result)
    for pattern in _SELF_REF_PATTERNS:
        result = pattern.sub("[author redacted]", result)
    return result


def _truncate_for_stage2(text: str, max_chars: int = STAGE2_TRUNCATE_DEFAULT_CHARS) -> str:
    """Truncate to max_chars with marker. PITFALLS.md §CRIT-1.

    Runs AFTER anonymization so the un-truncated tail can't leak a model name.
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + STAGE2_TRUNCATE_MARKER


async def stage1_collect_responses(
    user_query: str,
    council_models: List[str],
    external_context: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Stage 1: Collect individual responses from all council models.

    Args:
        user_query: The user's question (or critique instruction in critique mode).
        council_models: Council model IDs for this profile (PROFILES[profile]["council_models"]).
        external_context: Optional per-model file context for critique mode.
            Shape: ``{model_id: {"filename": str, "content": str, "size_bytes": int}}``.
            - ``None`` (default): legacy fresh-prompt broadcast — every model
              sees the same single user message. Behavior unchanged from v1.
            - non-``None``: critique-mode path — each model receives a per-model
              prompt built by ``_build_critique_prompts`` so its own file is
              attributed ``[YOUR PRIOR WORK]`` and peers' files
              ``[PEER'S PRIOR WORK]``.

    Returns:
        List of dicts with 'model' and 'response' keys.
    """
    if external_context is None:
        # Existing fresh-prompt path — broadcast same message to all models.
        messages = [{"role": "user", "content": user_query}]
        responses = await query_models_parallel(council_models, messages)
    else:
        # Critique path — per-model prompts (each model sees ALL files attributed).
        messages_per_model = _build_critique_prompts(
            user_query, external_context, council_models
        )
        responses = await _query_models_individually(council_models, messages_per_model)

    # Format results — same loop for both paths.
    stage1_results = []
    for model, response in responses.items():
        if response is not None:  # Only include successful responses
            stage1_results.append({
                "model": model,
                "response": response.get('content', '')
            })

    return stage1_results


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: List[str],
    anonymize_critiques: bool = False,
    truncate_per_response_tokens: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Stage 2: Each model ranks the anonymized responses.

    Args:
        user_query: The original user query (or critique instruction).
        stage1_results: Results from Stage 1. NEVER mutated — copies are made
            internally when anonymization or truncation are enabled.
        council_models: Council model IDs for this profile.
        anonymize_critiques: When True (critique mode), strip literal model IDs
            and first-person self-references from each Stage 1 response BEFORE
            concatenation (D-08). Third-person mentions are preserved (D-09).
        truncate_per_response_tokens: When set (e.g. 600 for critique mode),
            truncate each Stage 1 response to ``tokens * 4`` chars with a
            marker before concatenation (PITFALLS.md §CRIT-1). Truncation
            runs AFTER anonymization so the tail cannot leak a model name.

    Returns:
        Tuple of (rankings list, label_to_model mapping).
    """
    # Critique-mode transforms — operate on a COPY so the caller's stage1_results
    # (and the persisted Stage 1 tab) stay un-anonymized / un-truncated.
    if anonymize_critiques:
        stage1_results = [
            {**r, "response": _anonymize_critique_text(r["response"], i)}
            for i, r in enumerate(stage1_results)
        ]
    if truncate_per_response_tokens is not None:
        truncate_chars = truncate_per_response_tokens * 4
        stage1_results = [
            {**r, "response": _truncate_for_stage2(r["response"], truncate_chars)}
            for r in stage1_results
        ]

    # Create anonymized labels for responses (Response A, Response B, etc.)
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...

    # Create mapping from label to model name
    label_to_model = {
        f"Response {label}": result['model']
        for label, result in zip(labels, stage1_results)
    }

    # Build the ranking prompt
    responses_text = "\n\n".join([
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    ])

    ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:"""

    messages = [{"role": "user", "content": ranking_prompt}]

    # Get rankings from all council models in parallel
    responses = await query_models_parallel(council_models, messages)

    # Format results
    stage2_results = []
    for model, response in responses.items():
        if response is not None:
            full_text = response.get('content', '')
            parsed = parse_ranking_from_text(full_text)
            stage2_results.append({
                "model": model,
                "ranking": full_text,
                "parsed_ranking": parsed
            })

    return stage2_results, label_to_model


async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    chairman_model: str,
) -> Dict[str, Any]:
    """
    Stage 3: Chairman synthesizes final response.

    Args:
        user_query: The original user query
        stage1_results: Individual model responses from Stage 1
        stage2_results: Rankings from Stage 2
        chairman_model: Chairman model ID for this profile

    Returns:
        Dict with 'model' and 'response' keys
    """
    # Build comprehensive context for chairman
    stage1_text = "\n\n".join([
        f"Model: {result['model']}\nResponse: {result['response']}"
        for result in stage1_results
    ])

    stage2_text = "\n\n".join([
        f"Model: {result['model']}\nRanking: {result['ranking']}"
        for result in stage2_results
    ])

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Query the chairman model
    response = await query_model(chairman_model, messages)

    if response is None:
        # Fallback if chairman fails
        return {
            "model": chairman_model,
            "response": "Error: Unable to generate final synthesis."
        }

    return {
        "model": chairman_model,
        "response": response.get('content', '')
    }


def parse_ranking_from_text(ranking_text: str) -> List[str]:
    """
    Parse the FINAL RANKING section from the model's response.

    Args:
        ranking_text: The full text response from the model

    Returns:
        List of response labels in ranked order
    """
    import re

    # Look for "FINAL RANKING:" section
    if "FINAL RANKING:" in ranking_text:
        # Extract everything after "FINAL RANKING:"
        parts = ranking_text.split("FINAL RANKING:")
        if len(parts) >= 2:
            ranking_section = parts[1]
            # Try to extract numbered list format (e.g., "1. Response A")
            # This pattern looks for: number, period, optional space, "Response X"
            numbered_matches = re.findall(r'\d+\.\s*Response [A-Z]', ranking_section)
            if numbered_matches:
                # Extract just the "Response X" part
                return [re.search(r'Response [A-Z]', m).group() for m in numbered_matches]

            # Fallback: Extract all "Response X" patterns in order
            matches = re.findall(r'Response [A-Z]', ranking_section)
            return matches

    # Fallback: try to find any "Response X" patterns in order
    matches = re.findall(r'Response [A-Z]', ranking_text)
    return matches


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]],
    label_to_model: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Calculate aggregate rankings across all models.

    Args:
        stage2_results: Rankings from each model
        label_to_model: Mapping from anonymous labels to model names

    Returns:
        List of dicts with model name and average rank, sorted best to worst
    """
    from collections import defaultdict

    # Track positions for each model
    model_positions = defaultdict(list)

    for ranking in stage2_results:
        ranking_text = ranking['ranking']

        # Parse the ranking from the structured format
        parsed_ranking = parse_ranking_from_text(ranking_text)

        for position, label in enumerate(parsed_ranking, start=1):
            if label in label_to_model:
                model_name = label_to_model[label]
                model_positions[model_name].append(position)

    # Calculate average position for each model
    aggregate = []
    for model, positions in model_positions.items():
        if positions:
            avg_rank = sum(positions) / len(positions)
            aggregate.append({
                "model": model,
                "average_rank": round(avg_rank, 2),
                "rankings_count": len(positions)
            })

    # Sort by average rank (lower is better)
    aggregate.sort(key=lambda x: x['average_rank'])

    return aggregate


async def generate_conversation_title(user_query: str) -> str:
    """
    Generate a short title for a conversation based on the first user message.

    Args:
        user_query: The first user message

    Returns:
        A short title (3-5 words)
    """
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {user_query}

Title:"""

    messages = [{"role": "user", "content": title_prompt}]

    # Use gemini-2.5-flash for title generation (fast and cheap)
    response = await query_model("google/gemini-2.5-flash", messages, timeout=30.0)

    if response is None:
        # Fallback to a generic title
        return "New Conversation"

    title = response.get('content', 'New Conversation').strip()

    # Clean up the title - remove quotes, limit length
    title = title.strip('"\'')

    # Truncate if too long
    if len(title) > 50:
        title = title[:47] + "..."

    return title


async def run_full_council(
    user_query: str,
    profile: str = "fast",
) -> Tuple[List, List, Dict, Dict]:
    """
    Run the complete 3-stage council process for the given profile.

    Args:
        user_query: The user's question
        profile: One of "fast" / "quality" / "quality_research".
                 "quality_research" raises NotImplementedError until Plan 03-04
                 connects the research_strategy module.

    Returns:
        Tuple of (stage1_results, stage2_results, stage3_result, metadata)
    """
    config = PROFILES[profile]

    if profile == "quality_research":
        # Single-line delegate to the research_strategy module (RSCH-04 isolation).
        # The streaming endpoint in main.py consumes research_strategy.run()
        # directly and forwards per-stage events as SSE; this branch supports
        # the non-streaming endpoint by collecting events and returning the
        # legacy 4-tuple shape. The combined_metadata dict packs both the
        # message_metadata (profile/models/chairman/critic/stage4_triggered)
        # and the optional stage4 payload so main.py.send_message can persist
        # them without owning QR-specific knowledge.
        stage1_results: List[Dict[str, Any]] = []
        stage2_results: List[Dict[str, Any]] = []
        stage3_result: Dict[str, Any] = {}
        stage4_result: Any = None
        message_metadata: Dict[str, Any] = {}
        async for event in research_strategy.run(user_query, config):
            if event["type"] == "_final":
                stage1_results = event["stage1"]
                stage2_results = event["stage2"]
                stage3_result = event["stage3"]
                stage4_result = event.get("stage4")
                message_metadata = event["message_metadata"]
        combined_metadata = {
            "message_metadata": message_metadata,
            "stage4": stage4_result,
        }
        return stage1_results, stage2_results, stage3_result, combined_metadata

    council_models = config["council_models"]
    chairman_model = config["chairman_model"]

    # Stage 1: Collect individual responses
    stage1_results = await stage1_collect_responses(user_query, council_models)

    # If no models responded successfully, return error
    if not stage1_results:
        return [], [], {
            "model": "error",
            "response": "All models failed to respond. Please try again."
        }, {}

    # Stage 2: Collect rankings
    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, stage1_results, council_models
    )

    # Calculate aggregate rankings
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)

    # Stage 3: Synthesize final answer
    stage3_result = await stage3_synthesize_final(
        user_query,
        stage1_results,
        stage2_results,
        chairman_model,
    )

    # Prepare metadata
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings
    }

    return stage1_results, stage2_results, stage3_result, metadata
