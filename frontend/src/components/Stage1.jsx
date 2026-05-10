import { useState } from 'react';
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

export default function Stage1({ responses }) {
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
        <div className="response-text markdown-content">
          <Markdown>{responses[activeTab].response}</Markdown>
        </div>
        <ReasoningDisclosure details={responses[activeTab].reasoning_details} />
      </div>
    </div>
  );
}
