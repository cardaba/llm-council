import { useRef, useCallback } from 'react';

/**
 * useTouchSwipe — left-edge horizontal swipe detector for the mobile drawer.
 *
 * Contract:
 *   - `onTouchStart` / `onTouchMove` / `onTouchEnd` are stable handlers that
 *     the caller spreads onto the app-shell root: `<div {...swipe}>`.
 *   - On swipe-right starting in the leftmost EDGE_ZONE px and traversing
 *     `threshold` px or more horizontally → `onOpen()` fires.
 *   - On swipe-left of `threshold` px or more (any start position) while
 *     `isOpen === true` → `onClose()` fires.
 *
 * Non-negotiable gates (see Plan 07-02 D-01 and RESEARCH Recipe 5):
 *   1. Vertical-dominance rejection — `Math.abs(dy) > Math.abs(dx)` short-
 *      circuits onTouchEnd. Without this, scrolling messages opens the
 *      drawer. This is the single most important line in the hook.
 *   2. Edge-zone gate — `startX <= EDGE_ZONE` is the only condition under
 *      which a swipe-right opens the drawer. Mid-viewport horizontal swipes
 *      are NOT drawer-open candidates.
 *
 * Known landmines (preserved as inline comments):
 *   1. Touch listeners are passive by default in React; `preventDefault()`
 *      cannot be called from onTouchMove. The handler is a documented no-op.
 *   2. Vertical scroll wins — Math.abs(dy) > Math.abs(dx) is the rejection.
 *   3. `onTouchEnd` MUST read `e.changedTouches[0]`, NOT `e.touches[0]`
 *      (which is empty at touchend).
 *   4. Only gestures that START in the left 24px count as drawer-open
 *      candidates — `startedAtEdge` ref captures this at touchstart.
 *
 * Discipline: refs only (no state cells → no re-renders). All three handlers
 * are wrapped in useCallback to stay referentially stable across renders.
 *
 * Caller-side requirement: `.messages-container` must already declare
 * `touch-action: pan-y` (added in 07-01) so vertical scroll on the message
 * list bypasses the swipe handler entirely.
 *
 * Public API: { onTouchStart, onTouchMove, onTouchEnd }.
 */

const DEFAULT_THRESHOLD = 40; // px — iOS Safari back-swipe default
const EDGE_ZONE = 24; // px — only swipes starting in this left strip open the drawer

export function useTouchSwipe({ isOpen, onOpen, onClose, threshold = DEFAULT_THRESHOLD }) {
  const startX = useRef(null);
  const startY = useRef(null);
  const startedAtEdge = useRef(false);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (!t) return;
    startX.current = t.clientX;
    startY.current = t.clientY;
    // Landmine 4 — edge-zone gate captured at touchstart, not touchend.
    startedAtEdge.current = t.clientX <= EDGE_ZONE;
  }, []);

  // Landmine 1 — passive listener can't preventDefault; reserved for future cap.
  const onTouchMove = useCallback(() => {}, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (startX.current === null) return;
      // Landmine 3 — touches is empty at touchend; use changedTouches.
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      // Landmine 2 — vertical-dominance rejection. Non-negotiable.
      if (Math.abs(dy) > Math.abs(dx)) {
        startX.current = null;
        return;
      }
      if (!isOpen && startedAtEdge.current && dx >= threshold) {
        onOpen();
      } else if (isOpen && dx <= -threshold) {
        onClose();
      }
      startX.current = null;
    },
    [isOpen, onOpen, onClose, threshold]
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
