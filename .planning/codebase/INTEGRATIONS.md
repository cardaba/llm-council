# External Integrations

**Analysis Date:** 2026-05-09

## APIs & External Services

**LLM Gateway:**
- OpenRouter — unified API gateway for all council model calls
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions` (declared in `backend/config.py:25`)
  - SDK/Client: `httpx` async client — `backend/openrouter.py:8-58`
  - Auth: `Authorization: Bearer <OPENROUTER_API_KEY>` header — `backend/openrouter.py:24-27`
  - Timeout: 120 seconds per request — `backend/openrouter.py:11`
  - Parallelism: `asyncio.gather()` for all council members — `backend/openrouter.py:62-85`
  - Error handling: returns `None` on any exception, council continues with remaining responses

## BYOK Provider Routing

OpenRouter supports routing calls through the user's own provider API keys via the `provider.only` payload field. This bills usage directly to the provider account rather than OpenRouter's credit pool.

**Implementation:** `backend/config.py:33-43` and `backend/openrouter.py:36-38`

**Supported publishers and their OpenRouter provider names:**

| Model prefix (publisher) | OpenRouter `provider.only` value | Example models |
|--------------------------|----------------------------------|----------------|
| `openai/` | `"openai"` | `openai/gpt-5-mini`, `openai/gpt-4.1-nano` |
| `anthropic/` | `"anthropic"` | `anthropic/claude-haiku-4.5` |
| `google/` | `"google-ai-studio"` | `google/gemini-2.5-flash` |

**Routing logic** (`backend/config.py:40-43`):
```python
def get_provider_for_model(model: str) -> str | None:
    publisher = model.split("/")[0] if "/" in model else model
    return PUBLISHER_TO_PROVIDER.get(publisher)
```

When the publisher is recognized, the payload is augmented:
```python
payload["provider"] = {"only": [provider]}   # backend/openrouter.py:38
```

When the publisher is unknown, no `provider` field is added and OpenRouter uses its default routing pool.

**Note:** Provider API keys (OpenAI key, Anthropic key, Google AI Studio key) are configured inside the user's OpenRouter account settings, not as local environment variables. Only `OPENROUTER_API_KEY` is needed locally.

## Data Storage

**Databases:**
- None. No database dependency detected.

**File Storage:**
- Local filesystem — JSON flat files in `data/conversations/`
  - One file per conversation: `data/conversations/<uuid>.json`
  - Schema: `{id, created_at, title, messages[]}` — `backend/storage.py`
  - Not suitable for multi-user or networked deployment

**Caching:**
- None

## Authentication & Identity

- None. No auth provider, no user accounts, no session management.
- All endpoints are unauthenticated.
- Backend binds to `127.0.0.1` only (`backend/main.py:199`) as the sole access control measure.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- `print()` statements to stdout on model query failures — `backend/openrouter.py:57`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Local development only. No cloud/container deployment config detected.

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars (`.env` at project root):**
- `OPENROUTER_API_KEY` — OpenRouter API key (format: `sk-or-v1-...`)
  - Obtain at: https://openrouter.ai/keys
  - Template: `.env.example`

**Optional / not required locally:**
- Provider-specific keys (OpenAI, Anthropic, Google AI Studio) are stored in the user's OpenRouter account, not in this repo's `.env`

**Secrets location:**
- `.env` file at project root (gitignored via `.gitignore`)
- `.env.example` committed as setup guide — contains placeholder value only

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None. All external calls are request-response (no webhooks, no event subscriptions).

## Server-Sent Events (SSE)

The backend exposes a streaming endpoint that delivers stage progress to the frontend:

- Endpoint: `POST /api/conversations/{id}/message/stream` — `backend/main.py:126-194`
- Format: `text/event-stream` (SSE)
- Events emitted in order:
  1. `stage1_start` / `stage1_complete` — individual model responses
  2. `stage2_start` / `stage2_complete` — peer rankings + metadata
  3. `stage3_start` / `stage3_complete` — chairman synthesis
  4. `title_complete` — auto-generated conversation title (first message only)
  5. `complete` — signals end of stream
  6. `error` — on exception
- Frontend consumer: `frontend/src/api.js:76-114` using `ReadableStream` + `TextDecoder`

---

*Integration audit: 2026-05-09*
