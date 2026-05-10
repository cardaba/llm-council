import { useEffect, useRef } from 'react';
import './Menu.css';

/**
 * Reusable popover menu (used by Sidebar's three-dot trigger and right-click).
 *
 * Props:
 *   x, y       — viewport coords where the menu should anchor (top-left).
 *   items      — array of { label, onClick, destructive? }.
 *   onClose    — called when ESC, click-outside, or an item is selected.
 *
 * A11y per RESEARCH §Pattern 3:
 *   - role="menu" / role="menuitem"
 *   - ESC closes (also calls e.stopPropagation so a Modal opened above
 *     this menu does not also receive ESC).
 *   - Click outside closes — implemented as a document-level mousedown
 *     listener so a click on another sidebar row closes the menu BEFORE
 *     that row's onClick handler fires.
 *
 * Arrow-key navigation between items is intentionally deferred (RESEARCH
 * §Pattern 3 marks it optional). Click + ESC cover D-04 / D-07.
 */
export default function Menu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Constrain to viewport so a right-click near the bottom-right edge
  // still produces a fully-visible popover.
  const ITEM_HEIGHT = 36;
  const VERTICAL_PADDING = 16;
  const MENU_WIDTH = 180;
  const style = {
    position: 'fixed',
    left: `${Math.min(x, window.innerWidth - MENU_WIDTH)}px`,
    top: `${Math.min(
      y,
      window.innerHeight - (items.length * ITEM_HEIGHT + VERTICAL_PADDING)
    )}px`,
  };

  return (
    <div
      ref={menuRef}
      className="menu-popover"
      role="menu"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          role="menuitem"
          className={`menu-item ${item.destructive ? 'menu-item-destructive' : ''}`}
          onClick={() => {
            onClose();
            item.onClick();
          }}
        >
          <span className="menu-item__label">{item.label}</span>
          {item.shortcut && (
            <span className="menu-item__shortcut" aria-hidden="true">
              {item.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
