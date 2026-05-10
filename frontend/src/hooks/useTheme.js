import { useState, useEffect, useCallback } from 'react';

/**
 * useTheme — coordinates the active visual theme (`light` | `dark`) with:
 *   1. localStorage persistence (key matches the FOUC blocker in index.html — Plan 04-01).
 *   2. The `prefers-color-scheme` media query, but ONLY while the user has
 *      not made an explicit choice (`followSystem === true`).
 *   3. The `<html data-theme="...">` attribute, which drives all token
 *      overrides defined in `frontend/src/index.css [data-theme="dark"]`.
 *
 * Behavioural contract per RESEARCH §Code Example 3 + UI-SPEC §Microinteractions:
 *   - First mount reads localStorage → falls back to matchMedia → defaults to 'light'.
 *   - Calling `setTheme` or `toggle` flips `followSystem` to false; subsequent
 *     OS-level changes will NOT override the user's manual choice.
 *   - matchMedia listener is removed on unmount and on followSystem flip
 *     (mitigates threat T-04-06 — listener leak DoS).
 *
 * Public API: { theme, setTheme, toggle }.
 */

const STORAGE_KEY = 'theme';

function readInitialTheme() {
  // Synchronous read so the hook's first render already matches the
  // attribute the FOUC blocker set on <html>.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Private browsing / disabled storage — treat as "no preference stored".
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

function readInitialFollowSystem() {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(readInitialTheme);
  const [followSystem, setFollowSystem] = useState(readInitialFollowSystem);

  // Apply the theme to <html> on every change. The FOUC blocker already
  // set this on initial load; this effect keeps it in sync afterwards.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Subscribe to OS-level theme changes only while the user has not made
  // a manual choice. Cleanup on unmount AND when followSystem flips false.
  useEffect(() => {
    if (!followSystem) return undefined;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      setThemeState(event.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
    };
  }, [followSystem]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setFollowSystem(false);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / disabled storage — proceed without persistence.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
