// VRT spec — Stage 2 rankings (D-02 surface 7, new in this phase).
//
// Hero state per D-02b: a fully-hydrated conversation with 4 evaluations + a
// populated aggregate-rankings table. The fixture lives at
// frontend/visual-tests/fixtures/stage2-mock-sse.json and is loaded via
// page.route(). The active tab in Stage 2.jsx defaults to 0 (the first
// model's evaluation); we don't switch tabs so the baseline locks the
// first-tab state across both themes.
import { test, expect, settle } from './_fixtures';
import fs from 'node:fs';
import path from 'node:path';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'stage2-mock-sse.json');
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
const CONVERSATION_ID = FIXTURE.id;

test('stage2-rankings', async ({ page }) => {
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
  // Wait for the Stage 2 section to render — it gates on
  // msg.stage2 && msg.stage2.length > 0 in ChatInterface.jsx.
  await page.locator('section[data-stage="stage2"]').waitFor({ state: 'visible' });
  await settle(page);

  await expect(page).toHaveScreenshot('stage2-rankings.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
