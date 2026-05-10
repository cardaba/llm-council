/**
 * Soft rate-limit for critique submissions — UX guard, NOT security.
 *
 * Keeps a rolling-hour timestamp array in localStorage. Once the user has
 * launched LIMIT critiques in the WINDOW_MS, `shouldReconfirm` returns true
 * and the welcome state surfaces a re-confirmation modal before dispatching
 * the next run (CRIT-07 / RESEARCH §4.3).
 *
 * Threat T-05-09 — accepted: clearing localStorage bypasses the gate.
 * This is intentional; we only want to slow the user down on accidental
 * 5-in-a-row clicks, not enforce a hard cap.
 */
const STORAGE_KEY = 'critique-run-timestamps';
const WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const LIMIT = 5;

export function getRecentRunCount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - WINDOW_MS;
    const filtered = arr.filter((ts) => ts > cutoff);
    if (filtered.length !== arr.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered.length;
  } catch {
    return 0;
  }
}

export function recordCritiqueRun() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - WINDOW_MS;
    const filtered = arr.filter((ts) => ts > cutoff);
    filtered.push(Date.now());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    /* best-effort */
  }
}

export function shouldReconfirm() {
  return getRecentRunCount() >= LIMIT;
}
