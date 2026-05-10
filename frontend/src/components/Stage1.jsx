import { useEffect, useRef, useState } from 'react';
import Markdown from './Markdown';
import ReasoningDisclosure from './ReasoningDisclosure';
import './Stage1.css';

/**
 * Strip publisher prefix and any :suffix (`:online`, `:thinking`) from a
 * model identifier per UI-SPEC line 241 ('{model_short} · {elapsed}s' format).
 *   `openai/gpt-5.1`                       → `gpt-5.1`
 *   `anthropic/claude-opus-4.7:online`     → `claude-opus-4.7`
 */
function modelShort(modelId) {
  if (!modelId) return '';
  const noPrefix = modelId.includes('/') ? modelId.split('/').pop() : modelId;
  return noPrefix.split(':')[0];
}

/**
 * Stage1Tab — per-tab response body. Wraps long content (scrollHeight > 600px)
 * in a `.stage1-collapsible` accordion (Show more ⌄ / Show less ⌃) using the
 * same grid-template-rows: 0fr → 1fr trick as ReasoningDisclosure.
 *
 * Direction A: short responses (≤600px) render without any toggle — we never
 * show controls that are not useful.
 */
function Stage1Tab({ resp, defaultCollapsed }) {
  const contentRef = useRef(null);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [open, setOpen] = useState(!defaultCollapsed);

  useEffect(() => {
    if (contentRef.current && contentRef.current.scrollHeight > 600) {
      setNeedsToggle(true);
    }
  }, [resp?.response]);

  if (!needsToggle) {
    return (
      <div ref={contentRef} className="response-text markdown-content">
        <Markdown>{resp.response}</Markdown>
      </div>
    );
  }

  return (
    <div className="stage1-collapsible" data-open={open ? 'true' : 'false'}>
      <div className="stage1-collapsible__panel">
        <div
          ref={contentRef}
          className="stage1-collapsible__panel-inner response-text markdown-content"
        >
          <Markdown>{resp.response}</Markdown>
        </div>
      </div>
      <button
        type="button"
        className="stage1-collapsible__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? 'Show less ⌃' : 'Show more ⌄'}
      </button>
    </div>
  );
}

// `defaultCollapsed` (Phase 5 NAV-03) — true on historical conversations
// (msg.stage3 already present at first render) so we don't dump multiple
// 800px walls on reload; false during live streaming so the active tab
// stays expanded.
export default function Stage1({ responses, defaultCollapsed = false }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="tabs">
        {responses.map((resp, index) => {
          const failed = resp == null || resp.response == null || resp.failed === true;
          return (
            <button
              key={index}
              className={`tab ${activeTab === index ? 'active' : ''} ${failed ? 'tab--failed' : ''}`.trim()}
              onClick={() => setActiveTab(index)}
            >
              {modelShort(resp?.model) || 'unknown'}
              {failed && ' ⚠'}
            </button>
          );
        })}
      </div>

      <div className="tab-content">
        <div className="model-name">{responses[activeTab].model}</div>
        <Stage1Tab
          key={activeTab}
          resp={responses[activeTab]}
          defaultCollapsed={defaultCollapsed}
        />
        <ReasoningDisclosure details={responses[activeTab].reasoning_details} />
      </div>
    </div>
  );
}
