import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 07-03 — Playwright Visual Regression config (VRT-01..03).
 *
 * D-03 revised (2026-05-11): runs natively on Windows. Docker deferred to
 * v2.1+ contingency. The `snapshotPathTemplate` below forces the OS suffix
 * into the PNG filename so an accidental cross-OS run never silently
 * overwrites an existing baseline.
 *
 * The theme matrix (chromium-light / chromium-dark) expands 8 specs into
 * 16 baselines — matches D-02 (8 surfaces × 2 themes).
 */
export default defineConfig({
  testDir: '.',
  // {testDir}/{testFilePath}-snapshots/{arg}{ext} — Playwright also appends
  // -<projectName>-<platform> automatically when `{arg}` is the screenshot
  // name passed to toHaveScreenshot(). On Windows this yields
  // *-chromium-light-win32.png and *-chromium-dark-win32.png; Linux would
  // produce *-linux suffixes that coexist without collision.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:4173', // vite preview default
    viewport: { width: 1280, height: 800 }, // single desktop viewport per ROADMAP scope
  },
  projects: [
    {
      name: 'chromium-light',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'chromium-dark',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
  ],
  webServer: {
    // Build + preview = a stable, production-equivalent bundle (vite preview
    // serves the build output). Dev server would re-emit on file change and
    // is unsuitable for VRT.
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
