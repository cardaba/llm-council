# Milestones

## v1.0 MVP (Shipped: 2026-05-10)

**Phases completed:** 4 phases, 20 plans, 21 requirements satisfied
**Timeline:** 2026-05-09 → 2026-05-10 (~2 days, 33 feat commits)
**Diff:** 140 files changed, +33,406 / −606 LOC

### Delivered

LLM Council fork transformed from "99% vibe-coded Saturday hack" into a daily-driver personal tool: hardened storage layer + sidebar conversation lifecycle (delete/rename/search), research-backed UX brief locked to "Direction A — Research notebook", 3-profile Quality dial (Fast / Quality / Quality+Research) with reasoning models + web search + critic-gated Stage 4 refinement, and the bespoke visual identity applied across the entire surface (zero Bootstrap defaults).

### Key Accomplishments

1. **Vuln 2 closed** — UUID validation + canonicalisation at the storage boundary; `try/except ValueError → HTTPException(400)` propagates from `storage.get_conversation_path` to all 5 conversation endpoints (DELETE, PATCH, GET, POST, SSE). SEC-01.
2. **Conversation lifecycle in sidebar** — delete (modal confirm + DELETE 204/400/404), inline rename (PATCH + intentRef pattern resolving Enter/Escape/Blur race), progressive content-fallback search (200ms debounce, lazy body load + Map cache). CONV-01..03.
3. **UX research-first design lock** — cognitive walkthrough (29 friction points) + Nielsen audit (36 findings, 11 priority Severity≥3) + 3 explored directions + locked Direction A "Research notebook" + 23 wireframes (W01-W23) + 3 HTML throwaway sketches. UXR-01..04. *No code change — pure design lock that drove Phase 4 implementation without re-decisions.*
4. **Quality dial end-to-end** — `PROFILES` dict in `config.py` (single source of truth), `SendMessageRequest.profile` Pydantic Literal, profile-aware routing in `main.py` + `council.py`, 3-state UI toggle with cost surfacing (footnote-style microcopy per Direction A), profile + model set persisted in saved messages and rendered in `MessageHeader`. QUAL-01..04.
5. **Pragmatic deep research** — `backend/research_strategy.py` aislado del `council.py` (verified: 0 occurrences of `critic_model`/`stage4_threshold`/`CRITIC_RUBRIC` in council.py): 4 reasoning models con `:online` web search, opt-in `reasoning` payload param (overriding the documented `:thinking` suffix that doesn't exist on OpenRouter), critic with `CRITIC_RUBRIC` + parser tolerant a malformed responses, conditional Stage 4 refinement gated por threshold ≥8 con conservative-skip on parse failure, `ReasoningDisclosure` accordion (`grid-template-rows: 0fr → 1fr` CSS-only modern technique). RSCH-01..05.
6. **Visual identity Direction A applied** — Source Serif 4 + Inter + JetBrains Mono variable woff2 self-hosted (~300KB), terracota+warm-neutral palette (light + dark canónicos con `prefers-color-scheme` + UI toggle persistido en localStorage), branded shell (52px header con wordmark + ampersand SVG mark + theme toggle), `<Header>` + `useTheme` hook + FOUC blocking script in `index.html`, Stage 1 progress strip (3-segmento con dots animados staggered 0/220/440ms), `prefers-reduced-motion` global override que preserva focus rings, ErrorBanner persistente para H9-01 catastrophic recovery, ampersand SVG favicon. Phase-wide grep gates: zero Bootstrap hex (`#4a90e2 #357abd #f0fff0 #f5f5f5 #f0f0f0`) en `frontend/src/`, zero raw `system-ui` outside `--font-sans` fallback. VIS-01..04.

### Phase Summary

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 01 | Hardening & Conversation Management | 5/5 (4 + 1 gap closure) | Complete |
| 02 | UX Research & Design Brief | 6/6 | Complete |
| 03 | Quality Dial & Pragmatic Deep Research | 5/5 | Complete |
| 04 | Visual Identity Implementation | 4/4 | Complete |

### Audit

✓ Milestone audit PASSED (`milestones/v1.0-MILESTONE-AUDIT.md`):
- 21/21 requirements satisfied (3-source cross-reference: REQUIREMENTS.md checkboxes + SUMMARY frontmatter + VERIFICATION.md narrative)
- 6/6 cross-phase integration surfaces wired
- 1/1 E2E flow verified end-to-end (User → New conversation → QR query → Stage 1-4 streaming → Critic + Stage 4 refinement → ErrorBanner recovery → Persisted with profile + stage4 → Reload preserves header)

### Known Tech Debt (Backlog for v1.1+)

- `stage4_threshold = 8` con critic = chairman = Opus puede tener self-preference bias — recalibrable via config tras observar 5-10 queries reales (no requiere code change).
- Modal de delete: `time_ago` copy deferida (necesita helper client-side).
- Favicon ampersand single-theme — `prefers-color-scheme` favicon support es inconsistent en browsers 2026.
- Pre-existing `react-hooks/immutability` lint warnings en `App.jsx:25-29`.
- Sin tests automatizados (backend ni frontend) — accepted milestone debt.
- Visual regression testing (Playwright + screenshots) — backlog.
- Mobile responsive ≤768px completo (más allá del drawer básico W23) — backlog.
- Settings/Preferences page (más allá del theme toggle) — backlog.
- Phase 01 `01-HUMAN-UAT.md` listed as "open" by audit-open but status is `passed` with 0 pending scenarios — false positive, acknowledged at close.

---

*Tag: `v1.0`*
*Archive: `.planning/milestones/v1.0-{ROADMAP,REQUIREMENTS,MILESTONE-AUDIT}.md`*
