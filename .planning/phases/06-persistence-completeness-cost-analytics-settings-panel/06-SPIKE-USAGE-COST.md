# Spike: OpenRouter `usage` cost shape (Plan 06-01)

Raw `response.json()` captures from one BYOK-routed `provider.only` query per Quality-profile model.

Source: `scripts/spike_usage_cost.py`. Prompt: `Say OK.`

## Raw responses

### `openai/gpt-5.5`

```json
{
  "id": "gen-1778454905-bVQVzXd24EO5VOdaA6tH",
  "object": "chat.completion",
  "created": 1778454905,
  "model": "openai/gpt-5.5-20260423",
  "provider": "OpenAI",
  "system_fingerprint": null,
  "service_tier": "default",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "completed",
      "message": {
        "role": "assistant",
        "content": "OK",
        "refusal": null,
        "reasoning": null,
        "reasoning_details": [
          {
            "type": "reasoning.encrypted",
            "data": "gAAAAABqARF6H03PwBoIwLYzObYMT5ICQhkDCxDhzeVhY_-ZbyUGSY0HvuJ7I5WrcmkZaq2Q0ayJ0LudAMjAaxW0cyc9kPetZcGbAunqtc7LqZjkJLDFzS4txcFt4yJx2XDF9mPXSfFmWHQonmMZcU7o3opPJ563-S_Gqfj6w3Tbh3LI-SC7Lvut1kl7f0vBE59H-JZYUIEB1oHdMkDKmzUH98aLNNpULnhwYDGlBtv3Jji7sqOqgNgkpGYuOFUhK8Zi9xhp4imjP-fR7ze9t479O-zc-ZxW8Hto8ojwrWAnzxtFsm_Fii0YWyc6_vfDkUZaiTvzHG9Y_nPJuNUnh5ZQ0Rho8V9QbUQOVvMwoWVucx5PSUwvnfc1jMv5Yr6d2FPaj2uCVcik5ysZ8m1VsHZZhOPuoMHSCqA6YlCRjh9O1ZC_EgXct3llP_kMSMX-DlOUKFqIZT7SNAfbU_CJNK1lhF1Tht8dzo1FYuOvQKozHl1X4fqKBBVV2ZEprbEJJBrkdYGXWOLCUpsq0aSkJGIgRYCPYFYMop5DaOKO9t477rCLgJkNTA8BXDSDUlRV1_rwJZUzWHoLe968V2jkLYR0sCGu0YfbMykxZilHjPApVtLU9nLxLdpNL7O5iHniZHvFe7_mS2lFQzEifHn1I-s1aPus2jv4mDS1VvSGlo4kUDrPNWR0IK8xA3QPBpdgvUU5gnlbJKE9bBLQwuRCJfpt5ty0Dq_FJfR7lpCeoPE0haLO9q6rUKEtSm5bJjIBI-Flh4b1RlqQoLmWO5KvhIbXogvV1a2G60EUwVP_FbZ-yNXoaOMjzwUBWnZO_jdmCttdoDbJVcwQhnhLm05Ikr9uU-n66sGikLTkVMPyyvt3b5xqLX7ymoq5MFYzm6bB6Vk3QxCecmmjwtV6agf-hlpSgZJxYx9b_e4vxAmZUSDmAZMEC06roCPlDZfxNQahzWx2u6G_o9j6",
            "format": "openai-responses-v1",
            "id": "rs_0d38219750f7d0b8016a01117a1fc48194a7c796f0071607a6",
            "index": 0
          }
        ]
      }
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 16,
    "total_tokens": 25,
    "cost": 0.000525,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.000525,
      "upstream_inference_prompt_cost": 4.5e-05,
      "upstream_inference_completions_cost": 0.00048
    },
    "completion_tokens_details": {
      "reasoning_tokens": 9,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  }
}
```

### `anthropic/claude-opus-4.7`

```json
{
  "id": "gen-1778454907-3NF6BedUuQEVKaObShne",
  "object": "chat.completion",
  "created": 1778454907,
  "model": "anthropic/claude-4.7-opus-20260416",
  "provider": "Anthropic",
  "system_fingerprint": null,
  "service_tier": "standard",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "end_turn",
      "message": {
        "role": "assistant",
        "content": "OK.",
        "refusal": null,
        "reasoning": null
      }
    }
  ],
  "usage": {
    "prompt_tokens": 16,
    "completion_tokens": 7,
    "total_tokens": 23,
    "cost": 0.000255,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.000255,
      "upstream_inference_prompt_cost": 8e-05,
      "upstream_inference_completions_cost": 0.000175
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  }
}
```

### `google/gemini-3.1-pro-preview`

```json
{
  "id": "gen-1778454909-SRR1aGQ94XJTkylWpQSZ",
  "object": "chat.completion",
  "created": 1778454909,
  "model": "google/gemini-3.1-pro-preview-20260219",
  "provider": "Google AI Studio",
  "system_fingerprint": null,
  "service_tier": "standard",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "STOP",
      "message": {
        "role": "assistant",
        "content": "OK.",
        "refusal": null,
        "reasoning": null,
        "reasoning_details": [
          {
            "type": "reasoning.encrypted",
            "data": "EuoDCucDAQw51scOpeSZ5bhTaIIJfpu90e1duWVYeI9SBVgTY+W8Jo/Q0n5ROL1ZLtpPKNYIdvAAact2CCAVkHqdHT6mP2eww2lx8v6ScpGkx+rLHZe/lJnsnVxCPHG5fzObgOJQHnkAoPECdmOqAI23CG5AwyNupFL4yGI73TM5cxZVf/7UVa+usPorGG2SxkPNzXwEFFuHO8uF8Dof1AVC3RGysCV+WaKu0dyODHbPM9RThowlFTOS8G1rnuVnyhRiUWdXOd+/vfwFCqOfXpIz1RAM5T66Fxq+diCs06vM1Ly2/KvrGpJ16Drv27pqWKIZgE1WhA4UFpA0DZivTVHNnB/Uph/4puvw5HPvsulivZcv5ZV+9W4aMB/gW52ptiUAWVHRZDvbV/whjuOYKmP5pm8qYBUzFrhUo0B+t1L+t28TjMWwG0dbIXq5FigOdmNskZWf/Z0MVq4Lu3ouUbv0xlUyrGVxIvb+jRvEGAAAM/W3jg7RY0iSDgg6UT7+8bioPd9T/bzkIwAyT9y84WHj3mgVjiJgEXLBeEBO53CadwhM2THgaUcJWNLVtSyjSn8v6xllrcw7q7KoJmVl9CfbVVsN2yJk6vnIDM7KrWKERf8NCTx4F8Du2TXJ0joG6BuuQeJz1qm0vSCF8w==",
            "format": "google-gemini-v1",
            "index": 0
          }
        ]
      }
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 91,
    "total_tokens": 95,
    "cost": 0.0011,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.0011,
      "upstream_inference_prompt_cost": 8e-06,
      "upstream_inference_completions_cost": 0.001092
    },
    "completion_tokens_details": {
      "reasoning_tokens": 89,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  }
}
```

## VERIFIED

Captured 2026-05-11 against the live OpenRouter API using `scripts/spike_usage_cost.py` with BYOK `provider.only` routing for each Quality-profile model.

- `openrouter_fee_path: usage.cost`
- `upstream_path: usage.cost_details.upstream_inference_cost`
- `is_byok_path: usage.is_byok`
- `currency_path: N/A (implicit USD — no `currency` field present on any of the 3 responses)`
- `byok_fee_waiver: no (every response returned `is_byok: false` and `cost > 0` despite `provider.only` routing — the 1M free BYOK reqs/month fee waiver was NOT observed on this account at the time of capture; Plan 03 must treat `usage.cost` as the authoritative OpenRouter fee number and NOT assume cost=0 on BYOK)`

### Field-path shape (all 3 models consistent)

```text
usage.prompt_tokens               int
usage.completion_tokens           int
usage.total_tokens                int
usage.cost                        float   ← OpenRouter fee (USD)
usage.is_byok                     bool    ← false on every Quality-model call in this capture
usage.cost_details.upstream_inference_cost              float   ← Upstream provider fee (USD)
usage.cost_details.upstream_inference_prompt_cost       float   ← (bonus granularity)
usage.cost_details.upstream_inference_completions_cost  float   ← (bonus granularity)
usage.prompt_tokens_details.cached_tokens               int
usage.prompt_tokens_details.cache_write_tokens          int
usage.completion_tokens_details.reasoning_tokens        int     ← non-zero for gpt-5.5 (9) and gemini-3.1-pro-preview (89); zero for claude-opus-4.7 on this prompt
```

### Surprises (vs. RESEARCH.md predictions)

1. **`is_byok` was `false` on all 3 calls** despite `provider.only` routing being set in the payload. RESEARCH.md Pitfall 2 (lines 424-436) anticipated `is_byok: true` with `cost=0` on BYOK fee-waiver months. The observed behaviour is the opposite — OpenRouter still billed its fee on every call. Possible explanations: (a) account is past the 1M free BYOK reqs/month, (b) `provider.only` does not by itself flip `is_byok` to true on this account, (c) the fee waiver semantics have changed since RESEARCH.md was written. Plan 03 MUST NOT assume `cost=0` on BYOK; the `_extract_cost` helper must always read `usage.cost` as the truth.
2. **Both `usage.cost` and `usage.cost_details.upstream_inference_cost` were equal on all 3 calls.** OpenAI: 0.000525 == 0.000525. Anthropic: 0.000255 == 0.000255. Google: 0.0011 == 0.0011. This suggests OpenRouter's BYOK markup is currently 0% for these accounts (the OpenRouter fee field carries the same number as the upstream cost, not a separate markup). Plan 03's `metadata.cost.total` vs `metadata.cost.upstream_total` segmentation is therefore meaningful as DATA SHAPE but the two numbers may be equal in practice — the UI should still show both segments per D-01.
3. **Bonus fields available:** `usage.cost_details.upstream_inference_prompt_cost` and `upstream_inference_completions_cost` give per-input/output cost granularity. Plan 03 may optionally capture these but the must-have schema only needs `cost` + `upstream_inference_cost`.
4. **Implicit currency:** no `currency` field is present anywhere in the response. Plan 03's `metadata.cost.currency = "USD"` is a CLIENT-SIDE annotation, not a server-supplied value. Safe to hardcode.
5. **Reasoning tokens leak:** gpt-5.5 and gemini-3.1-pro-preview both returned `reasoning_tokens > 0` on a trivial `Say OK.` prompt even though `reasoning` was NOT enabled in the payload. This is upstream behaviour (the models reason internally regardless) and is captured in `completion_tokens` — it does NOT inflate the cost beyond what `usage.cost` reports. No action needed for Plan 03.

### Authoritative `_extract_cost` skeleton for Plan 03

```python
def _extract_cost(data: dict) -> dict:
    usage = data.get("usage") or {}
    cost_details = usage.get("cost_details") or {}
    return {
        "openrouter_fee": usage.get("cost", 0.0),
        "upstream": cost_details.get("upstream_inference_cost", 0.0),
        "is_byok": usage.get("is_byok", False),
    }
```

Plan 03 may extend this with the bonus prompt/completion segmentation if desired, but the two must-have keys are `usage.cost` and `usage.cost_details.upstream_inference_cost`.

---

## Re-spike post-BYOK enforcement (2026-05-11)

**Trigger:** the original spike was captured with **"Always use this key" = FALSE** in OpenRouter Settings → Integrations, which let OpenRouter silently fall back to its pooled credits. Per the official BYOK guide (`openrouter.ai/docs/guides/overview/auth/byok`), `is_byok` only flips to `true` when the request actually consumed BYOK credentials — so the original `is_byok: false` was correct **but unrepresentative of intended production behaviour**. The flag was toggled to **TRUE** ("Never fall back to OpenRouter credits") and the spike script was re-executed verbatim.

**Re-spike command:** `uv run scripts/spike_usage_cost.py` (unchanged — same prompt `Say OK.`, same 3 Quality models, same `provider.only` payload).

### Raw responses (post-BYOK enforcement)

#### `openai/gpt-5.5`

```json
{
  "id": "gen-1778456246-brF8Udckhq7k4UToAyj9",
  "model": "openai/gpt-5.5-20260423",
  "provider": "OpenAI",
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 5,
    "total_tokens": 14,
    "cost": 0,
    "is_byok": true,
    "cost_details": {
      "upstream_inference_cost": 0.000195,
      "upstream_inference_prompt_cost": 4.5e-05,
      "upstream_inference_completions_cost": 0.00015
    }
  }
}
```

#### `anthropic/claude-opus-4.7`

```json
{
  "id": "gen-1778456251-47Evxtdingt47VfIuVrk",
  "model": "anthropic/claude-4.7-opus-20260416",
  "provider": "Anthropic",
  "usage": {
    "prompt_tokens": 16,
    "completion_tokens": 7,
    "total_tokens": 23,
    "cost": 0,
    "is_byok": true,
    "cost_details": {
      "upstream_inference_cost": 0.000255,
      "upstream_inference_prompt_cost": 8e-05,
      "upstream_inference_completions_cost": 0.000175
    }
  }
}
```

#### `google/gemini-3.1-pro-preview`

```json
{
  "id": "gen-1778456253-LuW3LgWbuw2CIZaaaig4",
  "model": "google/gemini-3.1-pro-preview-20260219",
  "provider": "Google AI Studio",
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 68,
    "total_tokens": 72,
    "cost": 0,
    "is_byok": true,
    "cost_details": {
      "upstream_inference_cost": 0.000824,
      "upstream_inference_prompt_cost": 8e-06,
      "upstream_inference_completions_cost": 0.000816
    }
  }
}
```

### Comparison vs. original spike

| Model | original `is_byok` | original `cost` | original `upstream_inference_cost` | new `is_byok` | new `cost` | new `upstream_inference_cost` |
|---|---|---|---|---|---|---|
| `openai/gpt-5.5` | `false` | `0.000525` | `0.000525` | **`true`** | **`0`** | `0.000195` |
| `anthropic/claude-opus-4.7` | `false` | `0.000255` | `0.000255` | **`true`** | **`0`** | `0.000255` |
| `google/gemini-3.1-pro-preview` | `false` | `0.0011` (approx) | `0.0011` | **`true`** | **`0`** | `0.000824` |

### Conclusion — Rama B: BYOK enforced, gratuito hasta cutoff

**3/3 modelos devolvieron `is_byok: true`** y `usage.cost == 0` — la cuenta está aprovechando la free-tier BYOK (≤1M requests/mes hasta Oct 2026, después 5% del precio OpenRouter equivalente). `cost_details.upstream_inference_cost` continúa siendo el precio nativo del proveedor y es la **única fuente de verdad del coste real del usuario** durante v2.0.

**Implicaciones para el diseño:**

- **D-01 (MessageHeader)** sigue siendo válido como contrato de UI (campos `upstream` + `fee` rendered). Aplica la regla "hide-zero" del CONTEXT.md (`Cost line hide-zero threshold: total < 0.001`) sobre la **fee**: mientras BYOK on, `cost == 0` → ocultar la microcopy `· $0.000 fee` y mostrar solo `$X.XXX upstream`. Cuando OpenRouter empiece a cobrar el 5% (post-Oct >1M req), la fee aparecerá automáticamente.
- **D-02 (Sidebar footer)** sigue siendo válido como contrato. La columna izquierda mostrará `$0.00 / $100` durante v2.0 y la progress bar nunca aparecerá (siempre <80% del cap). Esto comunica honestamente al usuario que su gasto OR pool es $0 — es información útil, no ruido.
- **`metadata.cost` schema** se mantiene `{stage1, stage2, stage3, stage4, total, upstream_total, currency}`. `total` (OpenRouter pool) será 0 en condiciones normales; `upstream_total` es el dato significativo para el usuario.
- **`_extract_cost` helper** del bloque anterior (líneas 215-223) sigue siendo correcto sin cambios. La interpretación de los campos cambia (cost = BYOK fee tier — actualmente 0), pero la lectura de campos es la misma.
- **Pitfall 2 de RESEARCH.md** queda resuelto: la semántica anticipada (BYOK + free tier → `cost=0`) coincide con la realidad observada una vez el flag está activo. La nota original sobre "Plan 03 MUST NOT assume `cost=0` on BYOK" se mantiene como salvaguarda defensiva — si el usuario excede 1M req/mes o cambia la configuración, `cost` volverá a ser no-cero.
- **`is_byok` field** vale capturarlo en `metadata.cost` aunque no se renderice en UI v2.0. Sirve como audit-trail en `data/conversations/*.json` por si alguna conversación accidentalmente sale por pool (fallback inesperado).

**Plan 06-03 (COST-01 instrumentación) puede arrancar tal cual está planificado** — no necesita cambios al diseño ni al `_extract_cost` helper. Plan 06-04 (UI de coste) tampoco — la regla hide-zero ya está en CONTEXT.md.

**Recommend next:** continuar `/gsd-execute-phase 06` para los plans 06-02..06-07.

### Coste del re-spike

Total: **$0.00 OpenRouter pool** + **~$0.00127 upstream** (sum of `upstream_inference_cost` × 3 calls). Pagado vía BYOK keys configuradas (OpenAI / Anthropic / Google AI Studio).

