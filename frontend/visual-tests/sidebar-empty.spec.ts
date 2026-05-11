// VRT spec — sidebar empty state (D-02 surface 4).
//
// Same backend state as welcome-state.spec.ts (empty conversation list) but
// the baseline framing is intentionally identical-full-viewport — Playwright
// snapshots the page, not a cropped region, so the sidebar-empty + welcome
// surfaces both appear in the snapshot but serve different purposes:
//   - welcome-state captures the chat-interface welcome copy as primary anchor
//   - sidebar-empty captures the "No conversations yet" + branded ampersand
//     empty-state on the left as the primary anchor
// Both produce different visual diffs when their respective surface drifts,
// even though the screenshots are nominally similar. This is intentional per
// D-02 — both surfaces are listed in ROADMAP as VRT-critical.
import { test, expect, settle } from './_fixtures';

test('sidebar-empty', async ({ page }) => {
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

  await expect(page).toHaveScreenshot('sidebar-empty.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
