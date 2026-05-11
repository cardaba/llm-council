import { useRef, useState } from 'react';
import './DropZoneSlot.css';

/**
 * Single labeled drop-zone slot used by CritiqueWelcome (Phase 5 D-04/D-05/D-06).
 *
 * States:
 *   - idle: shows the empty microcopy, accepts click or drag-and-drop
 *   - dragover: outline switches to accent
 *   - loaded: chip rendered (✅ {filename} {size} KB ✕); click on the chip
 *     area does NOT re-open the picker (D-06 — remove + re-upload only,
 *     no drag-between-slots, no caret dropdown)
 *
 * Props:
 *   modelId   - string, displayed verbatim above the zone in JetBrains Mono
 *   slot      - {file, modelId, name, size, content} | null
 *   onFile    - (file: File) => void  — fired on drop or picker selection
 *   onRemove  - () => void
 *   error     - string | null — inline error rendered below the zone
 */
function formatKB(bytes) {
  return (bytes / 1024).toFixed(1);
}

export default function DropZoneSlot({ modelId, slot, onFile, onRemove, error }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleClick = () => {
    if (slot) return;  // loaded — clicking the chip area should NOT re-open picker (D-06)
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (slot) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!slot) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (slot) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handlePicked = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Reset so picking the same file twice still triggers onChange
    e.target.value = '';
  };

  return (
    <div className="drop-zone-slot">
      <div className="drop-zone-slot__label">{modelId}</div>
      <div
        className={
          'drop-zone-slot__area' +
          (dragOver ? ' is-dragover' : '') +
          (slot ? ' is-loaded' : '')
        }
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role={slot ? undefined : 'button'}
        tabIndex={slot ? -1 : 0}
        aria-label={slot ? undefined : `Upload research for ${modelId}`}
      >
        {slot ? (
          <span className="drop-zone-slot__chip">
            <span className="drop-zone-slot__check" aria-hidden="true">✅</span>
            <span className="drop-zone-slot__filename">{slot.name}</span>
            <span className="drop-zone-slot__size">{formatKB(slot.size)} KB</span>
            <button
              type="button"
              className="drop-zone-slot__remove"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              aria-label={`Remove ${slot.name}`}
            >
              ✕
            </button>
          </span>
        ) : (
          <span className="drop-zone-slot__empty">
            Drop deep research here, or click to upload (.md / .txt, max 750KB)
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          // Bug A (quick-task 260511-lcu): expanded to cover Windows + Chrome/Edge,
          // where the native file dialog hides `.md` if `text/markdown` isn't in the
          // OS MIME registry. CritiqueWelcome.handleFile still enforces .md/.txt
          // post-pick, so widening here is safe.
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          style={{ display: 'none' }}
          onChange={handlePicked}
        />
      </div>
      {error && <div className="drop-zone-slot__error">{error}</div>}
    </div>
  );
}
