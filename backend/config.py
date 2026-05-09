"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers.
# Cheap mix to validate the flow with BYOK on OpenAI / Anthropic / Google AI Studio.
# Swap to gpt-5.1, claude-sonnet-4.6, gemini-2.5-pro... once the app is validated.
COUNCIL_MODELS = [
    "openai/gpt-5-mini",
    "openai/gpt-4.1-nano",
    "anthropic/claude-haiku-4.5",
    "google/gemini-2.5-flash",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "anthropic/claude-haiku-4.5"

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
    """Return the BYOK provider name for a model, or None if unknown publisher."""
    publisher = model.split("/")[0] if "/" in model else model
    return PUBLISHER_TO_PROVIDER.get(publisher)
