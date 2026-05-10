# PITFALLS — Adding v2.0 Features to v1.0 LLM Council

**Domain:** Subsequent milestone — adding 7 features to existing v1.0 architecture
**Researched:** 2026-05-10
**Confidence:** MEDIUM-HIGH (grounded in actual v1.0 source: `research_strategy.py`, `openrouter.py`, `download.js`, `CONCERNS.md`)

---

## Critical Pitfalls (cause rewrite, data loss, or budget blowout)

### CRIT-1 — Stage 2 token detonation when stacking critique mode on top of anonymized concatenation

**What goes wrong:** The Stage 2 prompt in `research_strategy.py:232-248` concatenates ALL Stage 1 responses verbatim into a single ranking prompt that is then sent to every council model. In Quality+Research today this is ~6-14K tokens. With critique mode, Stage 1 *responses* are critiques of 3 deep researches that the model has already digested, so each Stage 1 critique easily reaches 1500-3000 tokens. Stage 2 input becomes: `(3 critiques × ~2500 tokens) + ranking instructions ≈ 8K tokens` — multiplied by 3-4 council models in parallel. That is on top of the Stage 1 prompt which already carries the 3 deep-research files inline (~30K tokens of context per Stage 1 call × 3 council members = ~90K tokens of *input* across Stage 1 alone).

**Warning signs (how to detect):**
- A Quality+Critique run reports per-call `prompt_tokens` (once cost analytics ships) > 25K on Stage 1, > 8K on Stage 2.
- Provider returns 400 with `context_length_exceeded` (Anthropic) or `400 invalid_request_error` (OpenAI) — currently swallowed by `query_model` as a `None` return and the run silently degrades.
- Wall-clock for Stage 1 > 90s.

**Prevention (concrete steps):**
1. **Compute and surface a token budget *before* dispatching Stage 1.** Use `tiktoken` (or `len(text)/4` heuristic) to estimate prompt size from the 3 uploaded files + critique prompt. Block the run with a clear UI error if estimated > 150K tokens (safe margin under Opus 4.7's 200K window).
2. **For Stage 2 specifically, do NOT pass the full critiques.** Truncate each critique to its first 600 tokens + add a "[…truncated, full text in Stage 1 tab]" marker before building `responses_text` in the equivalent of `research_strategy.py:232-235`.
3. **Surface a `context_length_exceeded` error type** from `query_model` (currently raw `Exception → print → None`). Wrap with `try/except httpx.HTTPStatusError as e` and inspect `e.response.json()['error']['code']` — propagate as a structured event so the UI can show "Critique exceeded model context — please reduce file sizes or use fewer files".

**Phase to address:** Phase 5 (Critique mode foundation) — token budgeting and Stage 2 truncation must ship with the feature, not as a later patch.

---

### CRIT-2 — Cost shock: critique queries cost $0.50–$2.00 each, user has no preview

**What goes wrong:** v1's `quality_research` profile already costs ~$0.10–$0.40 per query. A critique run pre-loads ~30K input tokens × 3 Stage 1 calls = ~90K input tokens just on Stage 1. At Anthropic Opus pricing (~$15/M input + $75/M output as of 2025), a single critique on a 200K context = $1.50-$3 per run. The $100/month BYOK cap is the OpenRouter fee (5%); the real upstream provider bill — billed to the user's own OpenAI/Anthropic/Google accounts — can be $20-50/week of personal use.

**Warning signs:**
- User runs 3 critique queries in a session and the OpenRouter dashboard shows < $0.10 in fees (because the real cost is on the BYOK provider bills).
- User mentions "I'm out of Anthropic credits" without any OpenRouter alert firing.

**Prevention:**
1. **Add a pre-flight cost estimate on the critique entry-point UI** that multiplies estimated input tokens × 4 (the 3 Stage 1 critiques + Stage 2 concatenation + Stage 3 synthesis) × per-model rate. Display "Estimated upstream cost: $0.80–$2.40 (billed to your provider keys, not OpenRouter)". Make this prominent BEFORE the user submits.
2. **Document explicitly in the cost analytics UI** that the OpenRouter `cost` field returned is the **5% OpenRouter fee**, not the upstream provider cost. Show two columns: "OpenRouter fee" and "Estimated upstream cost".
3. **Add a hard rate limit per session in localStorage:** "More than 5 critique runs in 1 hour — confirm again".

**Phase to address:** Phase 7 (Cost analytics) for the dashboard, BUT the cost preview on the critique entry point is non-negotiable for Phase 5.

---

### CRIT-3 — Persistence schema break on reload of v1.0 conversations

**What goes wrong:** v1.0 conversations on disk lack `metadata.label_to_model` and `metadata.aggregate_rankings` (per `CONCERNS.md` "Metadata Not Persisted"). v2.0 will start persisting these fields. If the frontend assumes their presence after the v2.0 deploy, **all 100% of pre-v2 conversations crash on reload** when `Stage2.jsx` calls `metadata.label_to_model[label]`.

Critique mode adds yet another shape: `messages[].critique_files: [{model, filename, content}]` and `message.kind: "critique" | "fresh"`. Without an explicit schema version, every component in the render path becomes a defensive null-checking maze.

**Warning signs:**
- Console: `TypeError: Cannot read property 'openai/gpt-5-mini' of undefined` on conversation reload.
- Stage 2 component renders "Response A" / "Response B" instead of model names for old conversations.

**Prevention:**
1. **Add `schema_version` field to the conversation JSON shape** (default `1` if missing, set `2` on any new write). Persist in `storage.py:save_conversation` and read at the top of any component.
2. **Write a "lazy migration" helper:** `migrate_message_v1_to_v2(msg)` runs on load, defaults missing fields. Run it in `get_conversation` server-side so the frontend never sees a v1 shape after v2 deploys.
3. **Add a unit test** asserting that an unmigrated v1 conversation JSON still hydrates without throwing in v2. **Highest-value test in the entire milestone.**
4. Make every frontend access optional-chained with a fallback: `metadata?.label_to_model?.[label] ?? label`.

**Phase to address:** Phase 6 (Persistence completeness) must own the migration helper AND the schema_version field. Phase 5 critique mode must consume this from day one. **Do persistence schema FIRST, critique mode SECOND, OR plan them as a single conjoined phase.**

---

### CRIT-4 — Inline file blobs explode conversation file size and storage I/O

**What goes wrong:** A 1000-conversation history × 1.5MB average = 1.5GB on disk, AND the existing `storage.py` reads/writes the entire JSON synchronously in an async handler. A 1.5MB JSON parse takes 50-200ms. Sidebar listing (`list_conversations`) reads ALL files; with 1000 × 1.5MB this is multi-second blocking on each app load.

**Warning signs:**
- Sidebar takes > 2s to load after 50+ critique conversations.
- `data/conversations/` size > 500MB.
- App hangs on conversation switch.

**Prevention:**
1. **Sidecar files for critique attachments:** save uploaded file content in `data/conversations/{conv_id}/files/{model}.md` and reference by relative path in the JSON: `critique_files: [{model: "...", filename: "...", path: "files/...md", size_bytes: ...}]`. Load lazily only when rendering the file viewer.
2. **Storage layer change:** `list_conversations` should read `metadata.json` *only*, not the full conversation. Split each conversation into `index.json` (lightweight) + `messages.json` (heavy). v1 has all-in-one which breaks here.
3. **Hard cap upload size at backend** (Pydantic `Field(max_length=...)`). 750KB per file, 2.5MB total per critique submission.
4. Alternative: **gzip the inline content** with `gzip.compress(content.encode())` and store as base64. ~70% size reduction.

**Phase to address:** Phase 5 (Critique mode foundation) — the persistence shape decision must be made when critique mode lands. Cannot defer; refactoring to sidecar later means migrating every existing critique conversation.

---

## Moderate Pitfalls (cost a phase, not the milestone)

### MOD-1 — Anonymity break in Stage 2 critique peer-review via attribution leak

**What goes wrong:** The user identified this. Critiques in Stage 1 reference deep researches by their visible model labels ("the gpt-5.5 research is weak on point X"). When Stage 2 anonymizes the *critic* identity but keeps these inline references, a sufficiently observant peer reviewer can de-anonymize: "Response A is harsher on the gpt-5.5 research; Response C agrees with gpt-5.5 — therefore Response C might BE gpt-5.5". Soft leak; magnitude depends on self-preference bias in critique-of-critique chains.

**Prevention:**
1. **Strip explicit model names from critiques before Stage 2 concatenation.** Build a `model_to_alias` map (`"openai/gpt-5.5"` → `"Author 1"`). Regex-replace those literals in each Stage 1 critique text before they enter the Stage 2 prompt.
2. **Document this caveat in the UI** below Stage 2 in critique mode: "Note: critiques may indirectly identify each other via attribution; aggregate rankings are advisory only in critique mode".
3. **A/B sanity check:** run 3 critique queries with same inputs, swap which file is associated with which council member, and see whether each model still ranks its own critique highest.

**Phase to address:** Phase 5 — built INTO the prompt construction, not bolted on. ~20 LoC.

---

### MOD-2 — File encoding edge cases (UTF-8 BOM, UTF-16, CRLF)

**What goes wrong:** `download.js:194-201` uses `FileReader.readAsText(file)` with no explicit encoding. **Gemini AI Studio exports markdown with CRLF on Windows browsers** — this matters because `parse_ranking_from_text` in `council.py` uses `\n` boundaries. Mixed line endings → silent ranking parser failures.

**Prevention:**
1. **Pass explicit UTF-8 to `readAsText`:** `reader.readAsText(file, 'UTF-8')`.
2. **Strip BOM defensively:** after read, `text = text.replace(/^﻿/, '')`.
3. **Normalize line endings to LF:** `text = text.replace(/\r\n/g, '\n')`. Apply BEFORE persistence and before Stage 1 prompt construction.
4. **Add file preview** in the upload UI showing first 500 chars: if user sees garbage, they reject before submit.

**Phase to address:** Phase 5 — file ingestion path is built here.

---

### MOD-3 — `viewport-fit=cover` and notched-device safe-area handling

**What goes wrong:** v1's `index.html` likely lacks `viewport-fit=cover`. On iPhone with notch, drawer content can render *under* the rounded corners and home bar — looks broken even when CSS is correct.

**Prevention:**
1. Update `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.
2. Use `padding-bottom: max(env(safe-area-inset-bottom), 12px)` and similar for header/drawer/message input.

**Phase to address:** Phase 8 (Mobile responsive).

---

### MOD-4 — Sidebar drawer focus trap on mobile

**What goes wrong:** When the drawer opens, focus must be moved into the drawer AND tab cycling must stay inside until close. Without focus trap: blind keyboard users tab out of the drawer onto the chat backdrop, become disoriented.

**Prevention:**
1. **Use `<dialog>` element with `showModal()`** — native modal semantics, native focus trap, native ESC-to-close. Browser support: Safari 15.4+, Chrome 37+, Firefox 98+.
2. Alternative: `focus-trap-react` library (~3KB gzipped).
3. **Don't hand-roll.** Hand-rolling will leave at least one edge case broken.
4. **Add `inert` attribute on the main content while drawer is open** — modern HTML attribute, blocks all interaction and tab focus on the inerted subtree.

**Phase to address:** Phase 8.

---

### MOD-5 — Touch gesture conflict with native browser scroll

**What goes wrong:** Implementing swipe-to-open/swipe-to-close on the drawer edge fights with the browser's native horizontal scroll on the content area. Without `touch-action: pan-y` on the content area, a horizontal swipe on the message body confuses both the drawer gesture AND the browser.

**Prevention:**
1. **`touch-action: pan-y` on `.messages-container`** — only allow vertical scroll.
2. **`touch-action: pan-x` on the drawer-edge gesture handle** — only allow horizontal pan there.
3. **Use vanilla pointer events with `setPointerCapture`** for the swipe handler.
4. **Skip swipe in v2 if budget is tight** — tap-to-open via hamburger button is enough. Mark as scope-cut candidate.

**Phase to address:** Phase 8 (scope-cut candidate).

---

### MOD-6 — `pytest-asyncio` event-loop mode misconfiguration

**What goes wrong:** Choosing `auto` mode and trying to use `httpx.AsyncClient` for FastAPI testing produces `RuntimeError: This event loop is already running` because pytest's loop and httpx's transport loop conflict.

**Prevention:**
1. **Use `pytest-asyncio` mode `strict`** — explicit `@pytest.mark.asyncio` on every async test. Verbose but predictable.
2. Use `httpx.ASGITransport` for testing FastAPI directly (no real HTTP server needed): `async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`.
3. Pin versions in `pyproject.toml`: `pytest>=8`, `pytest-asyncio>=0.23`, `httpx>=0.27`.
4. **Document `asyncio_mode = "strict"` in `pyproject.toml`** under `[tool.pytest.ini_options]`.

**Phase to address:** Phase 10 (Automated tests) — first decision.

---

### MOD-7 — `vitest` + React 19 Strict Mode `act()` warnings

**What goes wrong:** React 19 Strict Mode in development double-invokes effects to surface bugs. With Vitest + React Testing Library, useEffect-driven state updates that aren't wrapped in `act(...)` produce noisy `Warning: An update to ComponentName inside a test was not wrapped in act(...)`.

**Prevention:**
1. **Use `@testing-library/react` v16+** — its `render` already wraps in `act` internally and handles React 19 quirks.
2. **For async effects, use `await waitFor(() => expect(...))`** — `waitFor` polls inside `act`.
3. **Mock SSE transport** with a `MockReadableStream` in test setup; don't actually open `EventSource` in unit tests.

**Phase to address:** Phase 10.

---

### MOD-8 — Visual regression false-positives from cross-platform font rendering

**What goes wrong:** ClearType (Windows) vs subpixel antialiasing (Linux) vs grayscale antialiasing (macOS) produce visibly different glyph outlines. Playwright on a Linux CI vs developer Windows machine differ by 1-2% pixel diff on every text-heavy region.

**Prevention:**
1. **Run snapshot tests ONLY on Linux CI** — single environment. Snapshots committed are Linux-CI baselines.
2. **Use Docker for CI snapshots** — `mcr.microsoft.com/playwright:v1.X.X` image gives reproducible font stack.
3. **Set explicit threshold:** `expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02, threshold: 0.2 })`.
4. **Wait for fonts to load:** `await page.evaluate(() => document.fonts.ready)`.
5. **Disable animations:** `page.emulateMedia({ reducedMotion: 'reduce' })` + global CSS override `*, *::before, *::after { animation: none !important; transition: none !important; }`.

**Phase to address:** Phase 9 (Visual regression). All 5 prevention steps must be in the first plan.

---

## Minor Pitfalls (annoyances, not blockers)

### MIN-1 — `localStorage` hydration FOUC for new settings (font-size, density)

**Prevention:**
1. **For density: extend the FOUC blocker** — add `data-density="compact"` to `<html>` synchronously based on localStorage. ~5 LoC addition.
2. **For font-size: accept React-hydrated state** — apply via inline style on a wrapper after mount.
3. Document the asymmetry in the Settings page code.

**Phase to address:** Phase 7 (Settings page).

---

### MIN-2 — `stage4_threshold` API contract drift

**Prevention:**
1. **Add `stage4_threshold: Optional[int] = None` to `SendMessageRequest`** with a Pydantic validator constraining 1-10.
2. Don't break existing requests: if the field is missing or `None`, behavior is identical to v1.
3. Test: existing v1 requests must continue to succeed in v2.

**Phase to address:** Phase 7.

---

### MIN-3 — Cost analytics aggregation perf on flat-file JSONs

**Prevention:**
1. **Lazy-load the cost view** — only compute when user navigates to it.
2. **Index file:** add `data/conversations/.index.json` mapping `id → {created_at, total_cost_usd}`.
3. **Cap the time window:** "Last 30 days" by default.

**Phase to address:** Phase 7.

---

### MIN-4 — `:online` plugin deprecation already in flight

Per `research_strategy.py:14-15`, the `:online` suffix is deprecated upstream in favor of `openrouter:web_search` server tool. v1 explicitly defers migration. If v2.0 lands after OpenRouter actually removes `:online`, Quality+Research silently breaks.

**Prevention:**
1. **Add a startup check** that pings OpenRouter once at server boot with a `:online` model.
2. **Watch OpenRouter changelog** quarterly.
3. **If migration becomes necessary mid-milestone:** scope-add migration to current phase. ~30 LoC change.

**Phase to address:** Document as deferred risk; re-evaluate in v2.1 milestone planning.

---

### MIN-5 — IPv4/IPv6 asymmetry already documented in CONCERNS.md

Re-flag: `CONCERNS.md` "IPv4/IPv6 Asymmetry" — fix is one line in `api.js` (`http://127.0.0.1:8001`). Trivial, but fix it in Phase 5 when touching the API client for critique-mode endpoints anyway.

**Phase to address:** Phase 5 incidental.

---

## Phase-Specific Pitfall Map

| Phase | Phase Topic | Pitfalls That Must Be Addressed |
|-------|-------------|---------------------------------|
| **Phase 5** | Critique mode foundation | CRIT-1 (Stage 2 token explosion), CRIT-2 (cost preview UI minimum), CRIT-4 (file storage shape), MOD-1 (anonymity strip), MOD-2 (encoding/CRLF), MIN-5 (IPv4 fix) |
| **Phase 6** | Persistence completeness | CRIT-3 (schema_version + migration helper) — must land BEFORE or WITH Phase 5 |
| **Phase 7** | Cost analytics + Settings | CRIT-2 full dashboard, MIN-1 (FOUC asymmetry), MIN-2 (API contract), MIN-3 (lazy aggregation) |
| **Phase 8** | Mobile responsive | MOD-3 (viewport-fit), MOD-4 (focus trap via `<dialog>`), MOD-5 (touch-action) |
| **Phase 9** | Visual regression | MOD-8 (cross-platform pixel diffs — all 5 prevention steps in first plan) |
| **Phase 10** | Automated tests | MOD-6 (pytest-asyncio strict mode), MOD-7 (`act()` + RTL v16) |
| **N/A (deferred)** | OpenRouter changelog watch | MIN-4 (`:online` deprecation) |

---

## Cross-Cutting Recommendation

**Do Phase 6 (persistence schema_version + migration) BEFORE or PHYSICALLY BUNDLED WITH Phase 5 (critique mode).** If Phase 5 ships first without a versioned schema, every existing v1.0 conversation becomes a migration headache the moment Phase 6 lands. **The cleanest move is to merge persistence-schema work into Phase 5's first plan ("Schema migration + critique JSON shape"), then let Phase 6 own only the metadata-completeness aspect** (`label_to_model`, `aggregate_rankings` for fresh-prompt mode).

---

## Confidence Summary

| Area | Confidence | Why |
|------|------------|-----|
| Stage 2 token explosion math | HIGH | Read `research_strategy.py` directly; concatenation pattern verified |
| BYOK cost field semantics | MEDIUM | Verified that `usage` is discarded in `openrouter.py:65-68`; OpenRouter `usage.cost` semantics under BYOK should be re-verified before shipping cost UI |
| Schema migration mandate | HIGH | `CONCERNS.md` confirms metadata-not-persisted; v1.0 conversations are concretely broken without migration |
| File encoding edge cases | MEDIUM-HIGH | FileReader spec verified; specific Gemini AI Studio CRLF behavior is anecdotal |
| Mobile / viewport / focus trap | MEDIUM-HIGH | `<dialog>` element semantics verified via 2026 browser support tables |
| pytest-asyncio mode + RTL v16 | MEDIUM | Best practice as of 2024-2025 |
| Visual regression cross-OS | HIGH | Well-known Playwright pain point; Docker baseline is the standard fix |
| `:online` deprecation timing | LOW | Per source comment, deferred — actual upstream timeline unknown |
