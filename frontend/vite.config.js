/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    css: false,
    // Scope vitest to src/ so the visual-tests/*.spec.ts Playwright suites
    // (07-03) do not get picked up — they use @playwright/test's `test()`
    // builder which crashes outside the Playwright runner.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
