// frontend/visual-tests/_fixtures.ts
//
// Centralised anti-flake substrate for the VRT suite (Phase 07-03 / VRT-02).
//
// D-02c lock: all 5 anti-flake measures apply to every spec without exception.
// Measures 4 + 5 (reducedMotion + global animation override) are enforced
// STRUCTURALLY here — every spec MUST import `test` from this file rather
// than from `@playwright/test`, so no spec can accidentally use a "raw" page
// without these protections.
//
// Measure 1 (document.fonts.ready + networkidle) is exposed as `settle(page)`
// and must be called per-spec after navigation, before toHaveScreenshot.
// Measures 2 + 3 (threshold + maxDiffPixelRatio) live at each toHaveScreenshot
// call site so they are visible during review.

import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Anti-flake 4 — emulate reduced-motion. Disables CSS @media
    // (prefers-reduced-motion) animations the app honours natively.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Anti-flake 5 — belt-and-suspenders global override for animations
    // that don't honour the media query. `caret-color: transparent`
    // prevents the blinking text cursor from flaking baselines on
    // surfaces with focused inputs (Settings panel, Critique textarea).
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }`,
    });

    await use(page);
  },
});

/**
 * settle — wait for fonts to load and the network to go idle.
 *
 * Anti-flake 1: web fonts ship with FOUT (flash of unstyled text) until
 * `document.fonts.ready` resolves; without this wait, the text glyph
 * advance changes between runs and produces 1-2px diffs that defeat
 * threshold / maxDiffPixelRatio.
 *
 * Call AFTER navigation, BEFORE toHaveScreenshot. Each spec is responsible
 * for calling it at the right moment because the right moment depends on
 * the spec's navigation pattern (some specs drive interactions after goto;
 * settle goes after those interactions, not after goto).
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

export { expect };
