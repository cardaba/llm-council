// Global vitest setup — registered via `setupFiles` in vite.config.js.
//
// 1. Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc).
// 2. Calls cleanup() after each test — defensive even with RTL v16 auto-clean.
// 3. Polyfills window.matchMedia — jsdom 29 does NOT implement it, so the
//    useTheme hook would crash on first render without this shim.

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
