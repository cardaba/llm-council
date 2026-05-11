// VRT spec — theme toggle (D-02 surface 5).
//
// Hero state: header rendered with the theme toggle button (sun/moon icon)
// in its idle, focused-by-keyboard state so its outline/background-hover
// styling is captured. We focus rather than hover because hover state is
// pointer-only on desktop and disappears as soon as Playwright re-takes the
// screenshot; focus is sticky and is the keyboard-equivalent state we
// actually want to lock visually.
import { test, expect, settle } from './_fixtures';

test('theme-toggle', async ({ page }) => {
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

  // Focus the theme toggle. aria-label flips with theme so we match either
  // "Switch to light mode" or "Switch to dark mode".
  const toggle = page.locator('button.app-header__theme-toggle');
  await toggle.focus();

  await settle(page);

  await expect(page).toHaveScreenshot('theme-toggle.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
