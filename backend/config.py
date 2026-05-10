"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"

# Map model publisher (the part before "/") to the OpenRouter provider name
# expected by the `provider.only` payload field. Used to force BYOK routing
# so each call hits the user's own provider account, not OpenRouter's pool.
PUBLISHER_TO_PROVIDER = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google-ai-studio",
}


def get_provider_for_model(model: str) -> str | None:
    """Return the BYOK provider name for a model, or None if unknown publisher.

    Splits on `/` so any suffix after the model slug (e.g. `:online`, `:beta`)
    is ignored — only the publisher prefix matters for BYOK routing.
    """
    publisher = model.split("/")[0] if "/" in model else model
    return PUBLISHER_TO_PROVIDER.get(publisher)


# ---------------------------------------------------------------------------
# Quality Dial profiles (QUAL-02 + RSCH-01)
# ---------------------------------------------------------------------------
# Single source of truth for which models each Quality profile uses, the
# chairman that synthesises the final answer, and (for `quality_research`)
# the critic model + Stage 4 threshold + indicative cost.
#
# Consumed by:
#   - backend/council.py        (fast / quality routing — Plan 03-02)
#   - backend/research_strategy.py (quality_research orchestration — Plan 03-04)
#   - backend/main.py           (cost surfacing in the toggle — Plan 03-05)
#
# Decisions: D-06, D-10, D-11, D-12, D-14, D-21.
# Substitutions: CD-05 (gemini-3.1-pro -> gemini-3.1-pro-preview, per RESEARCH.md).
# Reasoning is enabled via the `reasoning` payload param (see openrouter.py),
# NOT via a `:thinking` model-ID suffix (RESEARCH.md confirms suffix does not exist).
PROFILES = {
    # Fast: cheap mix used today to validate the flow with BYOK on
    # OpenAI / Anthropic / Google AI Studio. Per QUAL-02 ROADMAP entry —
    # "fast using the current cheap mix". No reasoning, no web search.
    "fast": {
        "council_models": [
            "openai/gpt-5-mini",
            "openai/gpt-4.1-nano",
            "anthropic/claude-haiku-4.5",
            "google/gemini-2.5-flash",
        ],
        "chairman_model": "anthropic/claude-haiku-4.5",
        "typical_cost_usd": 0.001,
    },
    # Quality: premium 3-model tier (D-11). gpt-5.5 + claude-opus-4.7 +
    # gemini-3.1-pro-preview (CD-05 substitutes the canonical preview ID).
    # No web search, no reasoning toggle — these models are strong enough
    # without it for the non-research use cases.
    "quality": {
        "council_models": [
            "openai/gpt-5.5",
            "anthropic/claude-opus-4.7",
            "google/gemini-3.1-pro-preview",
        ],
        "chairman_model": "anthropic/claude-opus-4.7",
        "typical_cost_usd": 0.05,
    },
    # Quality+Research: 4 reasoning models, all with `:online` so OpenRouter
    # injects native web search results into the context (D-10). Critic =
    # Opus (D-06), Stage-4 threshold = 8 (D-06 — Stage 4 fires when the
    # critic's score is below 8/10). typical_cost = $0.45 (D-14).
    "quality_research": {
        "council_models": [
            "openai/o4-mini:online",
            "anthropic/claude-opus-4.7:online",
            "google/gemini-3.1-pro-preview:online",
            "openai/gpt-5.5:online",
        ],
        "chairman_model": "anthropic/claude-opus-4.7",
        "critic_model": "anthropic/claude-opus-4.7",
        "stage4_threshold": 8,
        "typical_cost_usd": 0.45,
    },
}
# Source of truth for QUAL-02. Decisions: D-06, D-10, D-11, D-12, D-14, D-21.
# Substitutions: CD-05 (gemini-3.1-pro -> gemini-3.1-pro-preview).

# Legacy aliases — preserved so the existing `fast` flow keeps working until
# Plan 03-02 reroutes council.py / main.py to read PROFILES directly.
# Re-exported as references (not copies) into PROFILES["fast"] so there is
# only ever one source of truth.
COUNCIL_MODELS = PROFILES["fast"]["council_models"]
CHAIRMAN_MODEL = PROFILES["fast"]["chairman_model"]
