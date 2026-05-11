// VRT spec — Stage 3 highlight (D-02 surface 2).
//
// Hero state: a completed conversation whose Stage 3 final-answer panel is
// rendered with its distinctive green-tinted background (the highlight
// container per CLAUDE.md). We reuse the Stage 2 fixture because it carries
// a populated stage3.response and the full multi-stage deliberation; the
// baseline locks the green Stage 3 surface visible at the end of the
// scrollable content. Both stage3 and stage2 share the fixture but the
// resulting screenshots will diverge because Playwright captures the entire
// page, including all stages — so any drift in either surface registers
// against its own spec.
import { test, expect, settle } from './_fixtures';
import fs from 'node:fs';
import path from 'node:path';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'stage2-mock-sse.json');
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
const CONVERSATION_ID = FIXTURE.id;

test('stage3-highlight', async ({ page }) => {
  const conversationList = [
    {
      id: CONVERSATION_ID,
      title: FIXTURE.title,
      created_at: FIXTURE.created_at,
      message_count: FIXTURE.messages.length,
      mode: FIXTURE.mode,
    },
  ];

  await page.route('**/api/conversations', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(conversationList),
    })
  );
  await page.route(`**/api/conversations/${CONVERSATION_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FIXTURE),
    })
  );
  await page.route('**/api/stats/cost', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current_month: { queries: 0, total_usd: 0, upstream_total_usd: 0 } }),
    })
  );

  await page.goto('/');
  await page.locator('.conversation-item').first().click();
  // Wait for Stage 3 panel — gates on msg.stage3 truthy in ChatInterface.jsx.
  await page.locator('section[data-stage="stage3"]').waitFor({ state: 'visible' });
  // Scroll the Stage 3 section into view so it anchors the framing for this
  // surface's baseline (distinct from stage2-rankings which keeps Stage 2 in
  // the upper third of the viewport).
  await page.locator('section[data-stage="stage3"]').scrollIntoViewIfNeeded();
  await settle(page);

  await expect(page).toHaveScreenshot('stage3-highlight.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
