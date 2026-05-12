import { useEffect, useState } from 'react';
import './BackToTopButton.css';

/**
 * BackToTopButton (NAV-04) — floating round button anchored bottom-right of
 * `.chat-interface`. Becomes visible when `.messages-container.scrollTop > 600`
 * (A11Y-V2.1-01 / D-12); click smooth-scrolls the container to top.
 *
 * `prefers-reduced-motion` is re-checked PER-CLICK via `matchMedia` (Safari
 * does not auto-honor `scrollTo({behavior})`, RESEARCH §5.5).
 */
export default function BackToTopButton({ scrollContainerRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 600);
    el.addEventListener('scroll', onScroll, { passive: true });
    // Run once in case the container is already scrolled (e.g. after a
    // re-render when the user was deep in a previous message).
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  const handleClick = () => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' is-visible' : ''}`}
      onClick={handleClick}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
    >
      ↑
    </button>
  );
}
