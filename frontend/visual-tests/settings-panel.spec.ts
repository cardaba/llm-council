// VRT spec — Settings panel (D-02 surface 6, new in this phase).
//
// Hero state per D-02b: panel open, all controls at their default values:
//   - theme: matches the project colorScheme (light or dark via the matrix)
//   - fontSize: M
//   - density: comfortable
//   - stage4Threshold: 8 (matches PROFILES["quality_research"]["stage4_threshold"])
//
// We open the panel by clicking the gear icon in the Header. No control is
// mutated — the defaults are the visual lock.
import { test, expect, settle } from './_fixtures';

test('settings-panel', async ({ page }) => {
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

  // Ensure localStorage starts clean so useSettings returns its defaults.
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* private mode — ignore */
    }
  });

  await page.goto('/');
  await page.locator('button.app-header__settings-toggle').click();
  await page.locator('dialog.settings-panel').waitFor({ state: 'visible' });
  await settle(page);

  await expect(page).toHaveScreenshot('settings-panel.png', {
    threshold: 0.2,
    maxDiffPixelRatio: 0.02,
  });
});
