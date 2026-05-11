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
  // Force OS + project name into the snapshot filename so:
  //   1) chromium-light and chromium-dark do not overwrite each other (the
  //      default Playwright suffix is only auto-appended when {arg} is
  //      omitted; we must include {projectName} explicitly).
  //   2) An accidental cross-OS run produces a different filename (e.g.
  //      `-win32` vs `-linux`) instead of silently overwriting.
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',
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
