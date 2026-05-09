import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Reusable confirmation modal.
 *
 * Plan 01-02 (CONV-01) ships this as an opinionated confirmation dialog —
 * `title` / `body` / two action buttons — instead of a fully-generic shell.
 * Future plans (rename, cost prompts, etc.) can reuse the same primitives;
 * if a less-opinionated variant is needed later, this component can be
 * extended with a `children` prop without breaking existing call sites.
 *
 * A11y per RESEARCH §Pattern 2:
 * - role="dialog" + aria-modal="true" + aria-labelledby="modal-title"
 * - Manual focus trap (Tab cycles inside the dialog)
 * - ESC closes
 * - Click on backdrop closes (RESEARCH §Pitfall 4: target===currentTarget
 *   guards against text-selection drag closing the modal)
 * - Focus restored to the previously-focused element on unmount
 *
 * Intentionally NOT included (deferred to Phase 4 / future plans):
 * - Open/close animations
 * - body scroll lock (the backdrop covers the viewport visually)
 * - aria-hidden on the rest of the DOM (RESEARCH discourages it when
 *   aria-modal is set)
 */
export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement;

    // Initial focus = first focusable in dialog (the Cancel button).
    // Safer default for destructive flows — user must consciously press
    // Tab → Enter or click Confirm.
    const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE);
    focusables?.[0]?.focus();

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const list = dialogRef.current.querySelectorAll(FOCUSABLE);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      // Restore focus to whatever opened the modal.
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    // Per RESEARCH §Pitfall 4: use onClick (not onMouseDown) and check
    // target===currentTarget so a text-selection drag started inside the
    // dialog and released over the backdrop does NOT close the modal.
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
        )}
        {body && <div className="modal-body">{body}</div>}
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`modal-btn ${
              destructive ? 'modal-btn-destructive' : 'modal-btn-primary'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
