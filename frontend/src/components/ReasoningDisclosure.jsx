import { useState } from 'react';
import Markdown from './Markdown';
import './ReasoningDisclosure.css';

/**
 * Collapsable reasoning disclosure (RSCH-05).
 *
 * Whitelist filter (RESEARCH.md §"reasoning_details renderable shapes"):
 *   - 'reasoning.summary' → render `d.summary` as markdown
 *   - 'reasoning.text'    → render `d.text` as markdown
 *   - everything else (including 'reasoning.encrypted' base64 blobs) → DROPPED
 *
 * D-23: when nothing is renderable (null / empty array / all entries
 * encrypted), the disclosure is hidden entirely — no empty UI affordance.
 *
 * The toggle text matches W15/W16 wireframes literally:
 *   collapsed → '▶ Show reasoning'
 *   expanded  → '▼ Hide reasoning'
 */
export default function ReasoningDisclosure({ details }) {
  const [expanded, setExpanded] = useState(false);

  // OpenRouter sometimes returns reasoning_details as an array, sometimes
  // wrapped in an object — normalise to an array for the filter pass.
  const arr = Array.isArray(details)
    ? details
    : details
    ? [details]
    : [];

  const renderable = arr.filter(
    (d) => d && (d.type === 'reasoning.summary' || d.type === 'reasoning.text')
  );

  if (renderable.length === 0) {
    return null; // D-23: hide entirely when nothing safe to render.
  }

  return (
    <div className="reasoning-disclosure">
      <button
        type="button"
        className="reasoning-toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? '▼ Hide reasoning' : '▶ Show reasoning'}
      </button>
      {expanded && (
        <div className="reasoning-body">
          {renderable.map((d, i) => (
            <div key={i} className="reasoning-block markdown-content">
              <Markdown>
                {d.type === 'reasoning.summary' ? d.summary || '' : d.text || ''}
              </Markdown>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
