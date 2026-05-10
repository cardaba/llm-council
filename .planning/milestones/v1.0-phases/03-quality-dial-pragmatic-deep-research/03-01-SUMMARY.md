---
phase: 03-quality-dial-pragmatic-deep-research
plan: 01
subsystem: backend-config-transport
tags: [config, profiles, openrouter, reasoning, byok, foundation]
dependency_graph:
  requires:
    - "phase 1-2 complete (foundation untouched)"
  provides:
    - "PROFILES dict (single source of truth for Quality Dial profiles)"
    - "query_model(reasoning=True) opt-in transport for reasoning models"
    - "Legacy aliases COUNCIL_MODELS / CHAIRMAN_MODEL preserved as views into PROFILES['fast']"
  affects:
    - "Plan 03-02 (consumes PROFILES['fast'] / PROFILES['quality'] for routing)"
    - "Plan 03-04 (consumes PROFILES['quality_research'] including critic_model + stage4_threshold)"
    - "Plan 03-05 (renders typical_cost_usd in the toggle footnote)"
tech_stack:
  added: []
  patterns:
    - "Aliases-as-views: COUNCIL_MODELS / CHAIRMAN_MODEL are direct references into PROFILES['fast'] (not copies) to guarantee a single source of truth during the migration window."
    - "Opt-in reasoning via payload: reasoning=False default preserves existing behavior; True injects `{'reasoning': {'enabled': True}}` after BYOK provider routing."
key_files:
  created: []
  modified:
    - "backend/config.py (PROFILES dict + comments + reordered legacy aliases)"
    - "backend/openrouter.py (reasoning kwarg + docstring + conditional payload injection)"
decisions:
  - "PROFILES dict shape exactly matches the plan's <interfaces> block — no field renaming, no extra fields, no missing fields."
  - "Legacy aliases (COUNCIL_MODELS, CHAIRMAN_MODEL) reassigned at end of file as views into PROFILES['fast'] (NOT separate inline lists). Plan 03-02 will retire them."
  - "Reordered file: PUBLISHER_TO_PROVIDER + get_provider_for_model now precede PROFILES, since the BYOK helper is conceptually lower-level than the profile catalog. No semantic change."
  - "No `:thinking` model-ID suffix used anywhere (RESEARCH.md confirms it does not exist). The single `:thinking` substring in config.py is in a comment that documents its NON-use."
  - "query_models_parallel left untouched — Plan 03-04 will wrap it if it needs to forward `reasoning=True` per-model. Keeping the existing surface area unchanged minimizes blast radius."
metrics:
  duration_minutes: 8
  tasks_completed: 2
  files_modified: 2
  files_created: 0
  completed_date: "2026-05-10"
---

# Phase 3 Plan 1: Quality Dial Foundation — Config + Transport Summary

**One-liner:** Centralizes Quality Dial model selection in a single `PROFILES` dict (`backend/config.py`) with three tiers (fast / quality / quality_research) and adds an opt-in `reasoning` kwarg to `query_model` for OpenRouter's payload-level reasoning toggle, while preserving the legacy fast-flow API via reference-aliases.

## What Was Built

The architectural foundation that downstream Phase 3 plans consume.

### `backend/config.py` — `PROFILES` dict (Task 1)

```python
PROFILES = {
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
    "quality": {
        "council_models": [
            "openai/gpt-5.5",
            "anthropic/claude-opus-4.7",
            "google/gemini-3.1-pro-preview",
        ],
        "chairman_model": "anthropic/claude-opus-4.7",
        "typical_cost_usd": 0.05,
    },
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
COUNCIL_MODELS = PROFILES["fast"]["council_models"]
CHAIRMAN_MODEL = PROFILES["fast"]["chairman_model"]
```

**Substitutions applied** (per RESEARCH.md):

| Original (CONTEXT.md) | Final ID | Reason |
|---|---|---|
| `google/gemini-3.1-pro` | `google/gemini-3.1-pro-preview` | CD-05 — RESEARCH.md verified the canonical OpenRouter ID is the `-preview` suffix. Used in both `quality` and `quality_research` profiles. |

**Confirmation: no `:thinking` suffix** (RESEARCH.md override of CONTEXT.md):

The original active-scope text in `PROJECT.md` mentioned `anthropic/claude-opus-4.7:thinking`. RESEARCH.md confirmed that OpenRouter does NOT expose a `:thinking` model-ID suffix — thinking is enabled via the `reasoning` payload field. The implementation reflects this:

- `quality_research` uses `anthropic/claude-opus-4.7:online` (NOT `:thinking:online`).
- `query_model(reasoning=True)` (Task 2) is the path that turns thinking on.
- The single occurrence of the substring `:thinking` in `backend/config.py` is in a comment that documents its non-use.

**BYOK allowlist preserved** (D-12): Every model ID in PROFILES has a publisher prefix that resolves to one of `openai`, `anthropic`, `google-ai-studio` via `get_provider_for_model`. The `:online` suffix is ignored by `get_provider_for_model` because it splits on `/` and only looks at the publisher prefix. Verified by the inline acceptance test:

```python
all(get_provider_for_model(m) in {'openai', 'anthropic', 'google-ai-studio'}
    for p in PROFILES.values() for m in p['council_models'])  # True
```

### `backend/openrouter.py` — `reasoning` kwarg (Task 2)

Final signature:

```python
async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0,
    reasoning: bool = False,
) -> Optional[Dict[str, Any]]:
```

Behavior:

- `reasoning=False` (default) → payload identical to before. The legacy fast flow is byte-for-byte unchanged.
- `reasoning=True` → after BYOK `provider.only` routing is set, the payload gains:
  ```python
  payload["reasoning"] = {"enabled": True}
  ```

`query_models_parallel` (the batched helper used by `council.py`) was intentionally left untouched. Plan 03-04 will introduce a thin wrapper if it needs to forward `reasoning=True` per-model when orchestrating the `quality_research` strategy. Keeping the parallel helper signature stable minimizes the blast radius of this foundational plan.

### Reasoning response shape preserved

The unpacking of `data['choices'][0]['message']` already extracts both `content` and `reasoning_details` (from prior commits). No change there — Plan 03-05 is responsible for rendering `reasoning_details` in the frontend.

## Acceptance Verification

Both inline `python -c` acceptance tests passed:

| Task | Verification | Result |
|---|---|---|
| 1 | `PROFILES` keys, common fields, critic_model, stage4_threshold, `:online` suffix on all 4 QR models, alias identity, BYOK allowlist | ✓ OK |
| 2 | `reasoning` kwarg present, default `False`, annotation `bool` | ✓ OK |

Additional acceptance grep checks:

- `:online` appears 6 times in `config.py` (4 in model IDs + 2 in comments) — > acceptance threshold of 4.
- `:thinking` appears once, in a comment documenting its NON-use — acceptance criteria require it to not appear in any model ID; satisfied.
- `gemini-3.1-pro-preview` appears 5 times — > acceptance threshold of 2.
- `critic_model` appears once inside `quality_research`.
- `stage4_threshold` appears once with value 8.
- `reasoning: bool = False` appears once in the signature.
- `if reasoning:` block appears once in `query_model`.

Smoke test for the legacy fast flow (no profile passed yet — Plan 03-02 wires the routing):

```python
from backend.config import COUNCIL_MODELS, CHAIRMAN_MODEL, PROFILES
assert COUNCIL_MODELS is PROFILES['fast']['council_models']  # identity alias
assert CHAIRMAN_MODEL == 'anthropic/claude-haiku-4.5'
from backend import council  # import still resolves
```
All pass.

## Deviations from Plan

None — plan executed exactly as written.

There was one **minor structural choice** worth noting (not a deviation per se, but a design decision the plan left open):

- The plan said "insert PROFILES at the end of the file" and "reassign aliases at the end". I additionally moved `PUBLISHER_TO_PROVIDER` and `get_provider_for_model` BEFORE `PROFILES` so the file reads top-to-bottom: env → endpoint constants → BYOK helper → PROFILES catalog → legacy aliases. This is a pure-textual reorder; no semantics change. Rationale: the BYOK helper is conceptually lower-level than the profile catalog, and PROFILES is now the prominent end-of-file artifact rather than burying the new architecture below legacy code.

## Authentication Gates Encountered

None.

## Decisions Made During Execution

1. **Aliases-as-views, not copies.** `COUNCIL_MODELS = PROFILES["fast"]["council_models"]` binds the alias to the same list object inside PROFILES. The acceptance test `COUNCIL_MODELS is PROFILES['fast']['council_models']` enforces this. Result: there is only one source of truth even during the Plan 03-02 transition window — no risk of drift between two definitions of the fast model list.

2. **`query_models_parallel` left untouched.** The plan permits this explicitly ("NO toques `query_models_parallel`"), but the architectural reason is worth recording: Plan 03-04 will need to forward `reasoning=True` for the `quality_research` profile, and a wrapper is the right shape for that — it can also enrich payloads with web-search hints without bloating the low-level transport.

3. **No filtering of `reasoning.encrypted` here.** The plan called this out, and RESEARCH.md routes responsibility for filtering encrypted reasoning blocks to the frontend (Plan 03-05). Backend transport stays content-agnostic — it returns `reasoning_details` as-is.

## Downstream Contract Surface

What Plan 03-02 / 03-04 / 03-05 can rely on:

- **Plan 03-02 (Quality routing):** `from backend.config import PROFILES`, then `models = PROFILES[profile]["council_models"]` and `chairman = PROFILES[profile]["chairman_model"]`. Both fields are present for every profile — guaranteed by the acceptance test.

- **Plan 03-04 (Pragmatic deep research):** Additionally reads `PROFILES["quality_research"]["critic_model"]` and `PROFILES["quality_research"]["stage4_threshold"]` (= 8). When orchestrating reasoning models, calls `query_model(..., reasoning=True)` per model in the council. The `:online` suffix on all 4 QR models triggers OpenRouter's native web search at the transport level — no extra param needed.

- **Plan 03-05 (Toggle UI + cost surfacing):** Reads `PROFILES[profile]["typical_cost_usd"]` for the footnote-style cost hint per Direction A.

- **Legacy fast flow (until Plan 03-02 lands):** `from backend.config import COUNCIL_MODELS, CHAIRMAN_MODEL` continues to work and continues to point at the `fast` profile's lists. Zero migration work needed before Plan 03-02 reroutes callers.

## Commits

| Hash | Type | Subject |
|---|---|---|
| `4497f09` | feat(03-01) | add PROFILES dict for Quality Dial (Fast/Quality/Quality+Research) |
| `c8eec8e` | feat(03-01) | add opt-in reasoning kwarg to query_model |

## Files Changed

| File | Lines added | Lines removed | Net |
|---|---|---|---|
| `backend/config.py` | +76 | -14 | +62 |
| `backend/openrouter.py` | +14 | -1 | +13 |

## Self-Check: PASSED

Verified files exist:

- `backend/config.py` — FOUND (modified, contains `PROFILES = {`)
- `backend/openrouter.py` — FOUND (modified, contains `reasoning: bool = False`)

Verified commits exist in git history:

- `4497f09` — FOUND (Task 1: PROFILES dict)
- `c8eec8e` — FOUND (Task 2: reasoning kwarg)

Verified acceptance tests:

- Task 1 inline `python -c` test — PASSED (`OK`)
- Task 2 inline `python -c` test — PASSED (`OK`)
- Legacy fast-flow smoke test — PASSED (`Legacy fast flow OK`)
