"""Throwaway spike script — Plan 06-01 Wave 0 gate.

Captures the raw OpenRouter `usage` response shape for each Quality-profile
model so Plan 03 (COST-01) can wire `_extract_cost(data)` to the verbatim
field paths instead of guessing. DO NOT import this from `backend/`.

Run: `uv run python scripts/spike_usage_cost.py`
"""

import asyncio
import json
import sys
from pathlib import Path

import httpx

# Resolve project root so the script works whether invoked from project root
# or the scripts/ directory. The .env file lives at project root (gitignored).
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
    PROFILES,
    get_provider_for_model,
)

SPIKE_MD = ROOT / ".planning" / "phases" / "06-persistence-completeness-cost-analytics-settings-panel" / "06-SPIKE-USAGE-COST.md"


async def query_model_raw(model: str) -> dict | None:
    # Mirrors backend/openrouter.py:31-58 exactly — headers, BYOK provider.only,
    # and the same defensive try/except style. Returns the FULL raw JSON body
    # (not just message.content) so we can inspect every usage.* field.
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say OK."}],
    }

    provider = get_provider_for_model(model)
    if provider is not None:
        payload["provider"] = {"only": [provider]}

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


def append_to_markdown(model: str, data: dict | None) -> None:
    with open(SPIKE_MD, "a", encoding="utf-8") as f:
        f.write(f"\n### `{model}`\n\n")
        if data is None:
            f.write("**FAILED** — no response captured (see stdout for error).\n")
            return
        f.write("```json\n")
        f.write(json.dumps(data, indent=2, ensure_ascii=False))
        f.write("\n```\n")


async def main() -> None:
    if not OPENROUTER_API_KEY:
        print("FATAL: OPENROUTER_API_KEY not set (.env missing?)")
        sys.exit(1)

    models = PROFILES["quality"]["council_models"]
    print(f"Querying {len(models)} Quality models with BYOK routing:")
    for m in models:
        print(f"  - {m}")

    # Initialise the markdown file with a header so each model gets appended below.
    SPIKE_MD.parent.mkdir(parents=True, exist_ok=True)
    with open(SPIKE_MD, "w", encoding="utf-8") as f:
        f.write("# Spike: OpenRouter `usage` cost shape (Plan 06-01)\n\n")
        f.write("Raw `response.json()` captures from one BYOK-routed `provider.only` query per Quality-profile model.\n\n")
        f.write("Source: `scripts/spike_usage_cost.py`. Prompt: `Say OK.`\n\n")
        f.write("## Raw responses\n")

    for model in models:
        print(f"\n--- {model} ---")
        data = await query_model_raw(model)
        if data is not None:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        append_to_markdown(model, data)

    print(f"\nResponses appended to: {SPIKE_MD}")
    print("\nNext step: inspect the raw JSON and fill in the ## VERIFIED block (field paths).")


if __name__ == "__main__":
    asyncio.run(main())
