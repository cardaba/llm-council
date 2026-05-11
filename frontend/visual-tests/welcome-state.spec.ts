// VRT spec — welcome state (D-02 surface 1).
//
// Hero state: no conversations yet, no current conversation selected. The
// ChatInterface renders the welcome copy ("What do you want to think about
// today?") and the empty sidebar. We intercept the conversation-list endpoint
// to force an empty list deterministically — depending on the local
// data/conversations/ directory would couple the baseline to dev state.
import { test, expect, settle } from './_fixtures';

test('welcome-state', async ({ page }) => {
  await page.route('**/api/conversations', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/api/stats/cost', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ current_month: { queries: 0, total_usd: 0, upstream_total_usd: 0 } }),
    })
  );

  await page.goto('/');
  await settle(page);

  await expect(page).toHaveScreenshot('welcome-state.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
