import { useEffect, useState, useMemo } from 'react';
import './StageNavigationStrip.css';

/**
 * StageNavigationStrip (NAV-02) — horizontal scroll-spy chip strip rendered
 * above the deliberation. Sticky at `top: 0` of `.messages-container` (NOT
 * the global viewport — the scroll container already sits below the Header
 * in the App grid layout per RESEARCH §5.1).
 *
 * - Chips render only for stages with non-empty data on the assistant message
 *   (n=1 case skips Stage 2 because `msg.stage2` is an empty array).
 * - Click smooth-scrolls to the matching `[data-stage]` section; honors
 *   `prefers-reduced-motion` per-click via `matchMedia` (Safari does not
 *   auto-honor `scrollTo({behavior})`, RESEARCH §5.5).
 * - IntersectionObserver root = `.messages-container` ref, NOT the default
 *   viewport (RESEARCH §5.3). rootMargin `-48px 0px -50% 0px` excludes the
 *   sticky strip on top and treats a section as "active" once it crosses
 *   the upper half of the visible scroll area.
 */

function buildChips(msg) {
  if (!msg) return [];
  const chips = [];

  // Stage 1
  if (msg.loading?.stage1) {
    chips.push({ id: 'stage1', label: 'Stage 1 · streaming…' });
  } else if (msg.stage1 && Array.isArray(msg.stage1) && msg.stage1.length > 0) {
    const n = msg.stage1.length;
    chips.push({ id: 'stage1', label: `Stage 1 · ${n} response${n === 1 ? '' : 's'}` });
  }

  // Stage 2 — chip omitted when stage2 is empty array (n=1 case, D-05 collapse).
  if (msg.loading?.stage2) {
    chips.push({ id: 'stage2', label: 'Stage 2 · evaluating…' });
  } else if (msg.stage2 && Array.isArray(msg.stage2) && msg.stage2.length > 0) {
    chips.push({ id: 'stage2', label: 'Stage 2 · peer review' });
  }

  // Stage 3
  if (msg.loading?.stage3) {
    chips.push({ id: 'stage3', label: 'Stage 3 · synthesising…' });
  } else if (msg.stage3) {
    chips.push({ id: 'stage3', label: 'Stage 3 · synthesis' });
  }

  // Stage 4 (optional, only when refinement fired)
  if (msg.stage4) {
    chips.push({ id: 'stage4', label: 'Stage 4 · refinement' });
  }

  return chips;
}

export default function StageNavigationStrip({ assistantMsg, scrollContainerRef }) {
  const chips = useMemo(() => buildChips(assistantMsg), [assistantMsg]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root) return;
    if (chips.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Pick the entry with the highest intersection ratio — the section
        // most prominently in view becomes the active chip.
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const stageId = visible[0].target.dataset.stage;
        if (stageId) setActiveId(stageId);
      },
      {
        root,
        rootMargin: '-48px 0px -50% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    const targets = root.querySelectorAll('[data-stage]');
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [scrollContainerRef, chips.length]);

  const handleChipClick = (stageId) => {
    const root = scrollContainerRef?.current;
    if (!root) return;
    const target = root.querySelector(`[data-stage="${stageId}"]`);
    if (!target) return;
    // Re-check `prefers-reduced-motion` per click (Safari does not auto-honor
    // the {behavior} option, RESEARCH §5.5).
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  };

  if (chips.length === 0) return null;

  return (
    <div className="stage-nav-strip" role="navigation" aria-label="Stage navigation">
      {chips.map((chip) => {
        const isActive = activeId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            className={`stage-nav-strip__chip${isActive ? ' is-active' : ''}`}
            onClick={() => handleChipClick(chip.id)}
            aria-current={isActive ? 'true' : undefined}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
