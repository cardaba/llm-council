# Codebase Concerns

**Analysis Date:** 2026-05-09

---

## Security

### OPEN — Vuln 2: Path Traversal in Conversation Storage

- **Risk:** `get_conversation_path` in `backend/storage.py:18` builds a file path with no UUID validation:
  ```python
  return os.path.join(DATA_DIR, f"{conversation_id}.json")
  ```
  On Windows, backslash separators in `conversation_id` (e.g., `..\secrets\file`) allow escaping the `data/conversations/` directory. An attacker with LAN access who can POST to any endpoint using a crafted `conversation_id` URL segment could read or overwrite arbitrary JSON files on the host filesystem.
- **Files:** `backend/storage.py:16-18`, `backend/main.py:73-79` (GET), `backend/main.py:82-123` (POST)
- **Current mitigation:** None. No UUID format check, no `os.path.abspath` + prefix assertion, no path sanitization.
- **Fix approach:** Validate `conversation_id` against a UUID4 regex before constructing the path, or assert that `os.path.abspath(path).startswith(os.path.abspath(DATA_DIR))` after joining.

### FIXED — Vuln 1: Backend Bound to 0.0.0.0 (LAN Exposure)

- **Fix applied:** `backend/main.py:199` now uses `host="127.0.0.1"`, so the API is loopback-only.
- **Residual note:** The streaming endpoint (`/message/stream`) still exposes full model outputs and incurs API cost with zero authentication. A second machine on the same host (e.g., VM, WSL) can still reach port 8001 via loopback forwarding.

### Low Risk — API Key Storage

- `OPENROUTER_API_KEY` is loaded from `.env` at `backend/config.py:9`. The `.env` file is gitignored (`.gitignore:14`). For solo local use this is acceptable, but there is no runtime check that the key is non-empty — a missing key silently sends `Authorization: Bearer None` to OpenRouter, which returns 401 errors that are swallowed as `None` responses.
- **Files:** `backend/config.py:9`, `backend/openrouter.py:24-26`

---

## Tech Debt

### No Automated Tests

- **Issue:** Zero test files exist anywhere in the repo. Only `test_openrouter.py` (manual connectivity script) is present.
- **Files:** Entire `backend/` and `frontend/src/` have no `.test.*` or `.spec.*` files.
- **Impact:** Any refactor of `parse_ranking_from_text`, the SSE event loop, or storage layer has no safety net. Silent regressions are likely.
- **Fix approach:** Add pytest unit tests for `parse_ranking_from_text` (edge cases: missing FINAL RANKING header, duplicate Response labels, lowercase variants) and for `get_conversation_path` validation once Vuln 2 is fixed.

### print() Instead of Structured Logging

- **Issue:** All error reporting uses a bare `print()` call.
- **Files:** `backend/openrouter.py:58`
  ```python
  print(f"Error querying model {model}: {e}")
  ```
  No timestamps, no log levels, no correlation IDs. When multiple parallel queries fail, stderr output is interleaved and unattributable.
- **Fix approach:** Replace with Python `logging` module; configure at `backend/main.py` startup with level and format. One-line change per call site.

### Metadata Not Persisted — De-anonymization Lost on Reload

- **Issue:** `backend/storage.py:130-156` (`add_assistant_message`) only saves `stage1`, `stage2`, `stage3` dicts. `label_to_model` and `aggregate_rankings` are ephemeral: returned in the API response but never written to the JSON file.
- **Impact:** If the frontend is reloaded or the conversation is fetched via `GET /api/conversations/{id}`, the `metadata` key is missing on all historical messages. `Stage2` de-anonymization falls back to raw anonymous labels ("Response A", "Response B") which are meaningless without context.
- **Files:** `backend/storage.py:130-156`, `backend/main.py:110-115`, `frontend/src/components/Stage2.jsx` (reads `msg.metadata?.label_to_model`)
- **Fix approach:** Add `metadata` field to the assistant message dict in `add_assistant_message` and pass it through from `main.py`.

### Single-Shot Design — No Multi-Turn Input

- **Issue:** The input form is only rendered when `conversation.messages.length === 0` (`frontend/src/components/ChatInterface.jsx:221`). Once the first message is submitted, there is no way to continue the conversation in the UI.
- **Files:** `frontend/src/components/ChatInterface.jsx:221-273`
- **Impact:** Each conversation is effectively a one-question deliberation. This is the intended single-shot design, but it is a hard constraint — users cannot follow up or refine their question without creating a new conversation.
- **Fix approach:** Move the guard to disable (not hide) the form after the first submission, or add an explicit "one question per conversation" affordance in the UI to set expectations.

### reasoning_details Captured but Never Displayed

- **Issue:** `backend/openrouter.py:48-55` extracts `reasoning_details` from the OpenRouter response and returns it in the response dict. No component in the frontend renders it.
- **Files:** `backend/openrouter.py:52-55`, `frontend/src/components/Stage1.jsx` (only renders `response.response`, not reasoning)
- **Impact:** Extended thinking / chain-of-thought output from reasoning models (o1, Claude extended thinking) is silently discarded on the frontend.
- **Fix approach:** Pass `reasoning_details` through `stage1_results` alongside `response`; add a collapsible "Reasoning" section in `Stage1.jsx`.

### Unbounded Conversation File Growth

- **Issue:** User content (including full attachment text via `buildPromptWithAttachments`) is written verbatim to `data/conversations/*.json` with no size cap on the backend. The frontend enforces 500 KB/file and 2 MB total attachment limits at `frontend/src/utils/download.js` (`ATTACHMENT_LIMITS`), but `backend/main.py:97` accepts any `content` string without validation.
- **Files:** `backend/main.py:97`, `backend/storage.py:110-127`
- **Impact:** A crafted or manually assembled request (e.g., via curl) bypasses frontend limits and can write arbitrarily large files to `data/conversations/`.
- **Fix approach:** Add a max-length validator to `SendMessageRequest.content` in `backend/main.py:32-35` using Pydantic `Field(max_length=...)`.

---

## Performance and Cost

### Stage 2 Full-Context Broadcast — Dominant API Cost

- **Issue:** `backend/council.py:59-62` concatenates all Stage 1 responses into a single ranking prompt, then sends that prompt to every council model in parallel. With 4 council members and typical Stage 1 responses of 300–800 tokens each, the Stage 2 prompt is ~1,500–3,500 input tokens × 4 models = 6,000–14,000 tokens just for Stage 2 input. This is the dominant cost driver per query.
- **Files:** `backend/council.py:58-98`
- **Fix approach:** Consider truncating individual Stage 1 responses in the ranking prompt (e.g., first 500 tokens), or reducing the council size for ranking to a subset of models.

### No Caching

- **Issue:** Identical queries are fully re-executed through all 3 stages. There is no deduplication at the conversation, query hash, or model level.
- **Files:** `backend/council.py`, `backend/openrouter.py`
- **Impact:** Repeated or similar queries in development/testing multiply API cost unnecessarily.

### No Retry on Transient Failures

- **Issue:** `backend/openrouter.py:40-58` makes a single HTTP attempt per model. Any transient network error, rate-limit 429, or timeout causes that model's result to be silently dropped (returns `None`). With 4+ concurrent requests, partial failures are silent.
- **Files:** `backend/openrouter.py:40-58`
- **Fix approach:** Add exponential backoff with 2–3 retries using `httpx` or `tenacity` before returning `None`.

### No Per-Token Streaming

- **Issue:** The SSE stream in `backend/main.py:126-194` batches per stage: clients receive no data until an entire stage completes. With 4 parallel model calls, Stage 1 can take 15–30 seconds before the first token appears in the browser.
- **Files:** `backend/main.py:150-153`
- **Impact:** Perceived latency is high despite the async implementation.

---

## Fragile Areas

### Ranking Parser: Format-Dependent Correctness

- **Issue:** `backend/council.py:177-208` (`parse_ranking_from_text`) requires models to output the exact string `"FINAL RANKING:"` followed by a numbered list with lines of the form `"1. Response A"`. The fallback at line 203–204 grabs all `"Response [A-Z]"` occurrences in section order — if a model mentions "Response A" in its prose before the ranking section, the fallback produces a wrong order.
- **Files:** `backend/council.py:177-208`, `backend/council.py:211-255` (`calculate_aggregate_rankings` consumes parsed output)
- **Fix approach:** Add a unit test suite covering: missing header, wrong capitalization (`final ranking:`), extra prose in the ranking block, and duplicate label mentions. Consider stricter parsing (anchor to last occurrence of the header).

### PUBLISHER_TO_PROVIDER: Incomplete BYOK Coverage

- **Issue:** `backend/config.py:33-37` only maps `openai`, `anthropic`, and `google`. Any model from another publisher (e.g., `meta-llama/llama-3.3-70b`, `mistralai/mistral-large`, `cohere/command-r-plus`) returns `None` from `get_provider_for_model`, meaning the `provider.only` field is omitted from the payload. That model routes through OpenRouter's credit pool rather than the user's BYOK key.
- **Files:** `backend/config.py:33-43`
- **Impact:** Unexpected billing via OpenRouter credits if council members are changed to non-big-3 publishers.
- **Fix approach:** Add a startup warning log when any `COUNCIL_MODELS` entry has no provider mapping.

### No UUID Validation on conversation_id Route Parameter

- **Issue:** FastAPI path parameters typed as `str` accept any string. `conversation_id` in `backend/main.py:73`, `82`, `127` is passed directly to `storage.get_conversation_path` without format validation. This is the root cause of Vuln 2 (see Security section) but also means non-UUID strings (typos, empty strings) silently result in file-not-found 404s with no helpful error.
- **Files:** `backend/main.py:73`, `backend/main.py:82`, `backend/main.py:127`, `backend/storage.py:16-18`
- **Fix approach:** Use a FastAPI `Path` validator with a UUID regex pattern, or change the parameter type to `uuid.UUID` and let Pydantic enforce format.

### SSE Parser: Silent Partial Event Corruption

- **Issue:** `frontend/src/api.js:100-113` splits chunks on `\n` and parses each `data:` line independently. TCP fragmentation can split an SSE event across two `reader.read()` calls, causing a partial JSON string to be passed to `JSON.parse`. The `try/catch` at line 105-109 logs the error to console but discards the event, potentially dropping an entire stage payload silently.
- **Files:** `frontend/src/api.js:95-113`
- **Fix approach:** Buffer incomplete lines across chunks using a carried-over remainder string, only parsing lines that form a complete `data: {...}\n\n` event boundary.

### IPv4/IPv6 Asymmetry Between Frontend and Backend

- **Issue:** Vite's dev server binds to IPv6 `[::1]` by default, while `backend/main.py:199` binds to IPv4 `127.0.0.1`. `frontend/src/api.js:5` uses `http://localhost:8001` which resolves to whichever loopback address the OS prefers. On Windows 11 this is typically `::1` first, causing intermittent connection refused errors when the backend is only on `127.0.0.1`.
- **Files:** `frontend/src/api.js:5`, `backend/main.py:199`
- **Fix approach:** Explicitly use `http://127.0.0.1:8001` in `api.js` to force IPv4, or bind the backend to `::1`/`::` to accept both.

---

## Missing Observability

### No Token Usage or Cost Tracking

- **Issue:** OpenRouter responses include a `usage` field (prompt_tokens, completion_tokens, total_tokens, cost). `backend/openrouter.py:49-55` only extracts `content` and `reasoning_details`; `usage` is discarded.
- **Files:** `backend/openrouter.py:49-55`
- **Impact:** There is no way to know per-model latency, token consumption, or dollar cost per query without checking the OpenRouter dashboard manually.
- **Fix approach:** Extract and log `usage` alongside each model response; aggregate totals per council run and include in the `metadata` returned by `run_full_council`.

### No Structured Logs

- **Issue:** The only runtime diagnostic is the single `print()` in `backend/openrouter.py:58`. There are no log lines for: request received, stage transitions, model response sizes, total duration, or storage writes.
- **Files:** `backend/openrouter.py:58`, `backend/main.py` (no logging)
- **Fix approach:** Instrument key lifecycle events with Python `logging` at INFO level; use a structured format (JSON or key=value) for easy filtering.

---

*Concerns audit: 2026-05-09*
