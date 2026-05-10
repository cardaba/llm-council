import { useState } from 'react';
import Markdown from './Markdown';
import './ExternalResearchPanel.css';

/**
 * ExternalResearchPanel — collapsable file chips above critique assistant messages (CRIT-08).
 *
 * Renders one collapsed chip per uploaded research file. Each chip uses the same
 * CSS-only accordion pattern (grid-template-rows: 0fr → 1fr) shipped in
 * ReasoningDisclosure.css (lines 59-67). Multiple chips can expand independently.
 *
 * Hidden entirely when `externalResearch` is null/undefined/empty so that
 * fresh-prompt assistant messages render identically to v1.0.
 *
 * externalResearch shape (from backend, persisted by Plan 05-02):
 *   {
 *     "openai/gpt-5.5": {filename, content, size_bytes, ...},
 *     "anthropic/claude-opus-4.7": {filename, content, size_bytes, ...},
 *     ...
 *   }
 */

function formatKB(bytes) {
  const n = Number(bytes) || 0;
  return (n / 1024).toFixed(1);
}

function ResearchChip({ modelId, fileObj }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="research-chip" data-open={open}>
      <button
        type="button"
        className="research-chip__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="research-chip__model">{modelId}</span>
        <span className="research-chip__sep">·</span>
        <span className="research-chip__filename">{fileObj.filename}</span>
        <span className="research-chip__sep">·</span>
        <span className="research-chip__size">{formatKB(fileObj.size_bytes)} KB</span>
        <span className="research-chip__chevron" aria-hidden="true">{open ? '⌃' : '⌄'}</span>
      </button>
      <div className="research-chip__panel">
        <div className="research-chip__panel-inner markdown-content">
          <Markdown>{fileObj.content || ''}</Markdown>
        </div>
      </div>
    </div>
  );
}

export default function ExternalResearchPanel({ externalResearch }) {
  if (!externalResearch) return null;
  const entries = Object.entries(externalResearch);
  if (entries.length === 0) return null;
  return (
    <div className="external-research-panel">
      {entries.map(([modelId, fileObj]) => (
        <ResearchChip key={modelId} modelId={modelId} fileObj={fileObj} />
      ))}
    </div>
  );
}
