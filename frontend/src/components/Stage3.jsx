import Markdown from './Markdown';
import Stage4 from './Stage4';
import {
  buildFinalAnswerMarkdown,
  buildFinalAnswerFilename,
  triggerDownload,
} from '../utils/download';
import './Stage3.css';

export default function Stage3({ finalResponse, question, stage4 }) {
  if (!finalResponse) {
    return null;
  }

  // D-18: when Stage 4 fired, the "final answer" download MUST contain the
  // refined response, not the original chairman synthesis.
  const handleDownload = () => {
    const md = buildFinalAnswerMarkdown({ question, finalResponse, stage4 });
    triggerDownload(buildFinalAnswerFilename(question), md);
  };

  return (
    <div className="stage stage3">
      <div className="stage3-header">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <button
          type="button"
          className="download-btn"
          onClick={handleDownload}
          title="Download final answer as markdown"
        >
          Download .md
        </button>
      </div>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="final-text markdown-content">
          <Markdown>{finalResponse.response}</Markdown>
        </div>
      </div>

      {/* D-15: Stage 4 lives INSIDE the Stage 3 panel as a sub-section,
          directly below the chairman's synthesis when refinement fired. */}
      <Stage4 stage4={stage4} />
    </div>
  );
}
