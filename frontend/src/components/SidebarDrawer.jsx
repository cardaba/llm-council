import { useEffect, useRef } from 'react';
import './SidebarDrawer.css';

/**
 * SidebarDrawer — mobile-only (≤768px) left-anchored drawer that wraps the
 * existing Sidebar as `children`. The drawer is a thin shell: it does NOT
 * re-implement the Sidebar's header / new-conversation buttons / list rows.
 *
 * Pattern (verbatim from SettingsPanel.jsx:18-38):
 *   - useEffect #1 syncs `dlg.showModal()` / `dlg.close()` with the `open` prop.
 *     The `if (!dlg.open)` guard prevents React Strict Mode double-invocation
 *     from throwing "already open" — same idiom as SettingsPanel.
 *   - useEffect #2 listens for the native `cancel` event (ESC key) and
 *     preventDefault()s + calls onClose so the parent can drive state.
 *   - handleClick uses `e.target === e.currentTarget` to detect backdrop
 *     clicks; the inner wrapper stops propagation so taps inside the drawer
 *     do not dismiss it.
 *
 * Dismiss paths: ESC, backdrop click, swipe-left (handled in App.jsx via
 * useTouchSwipe), tap on a conversation row (App.jsx wraps the callbacks).
 * No "close X" button — the four dismiss paths above cover the mobile UX.
 */
export default function SidebarDrawer({ open, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return undefined;
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const handleClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="sidebar-drawer"
      onClick={handleClick}
      aria-label="Conversation list"
    >
      <div
        className="sidebar-drawer__inner"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );
}
