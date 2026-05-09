import Markdown from './Markdown';
import {
  buildFinalAnswerMarkdown,
  buildFinalAnswerFilename,
  triggerDownload,
} from '../utils/download';
import './Stage3.css';

export default function Stage3({ finalResponse, question }) {
  if (!finalResponse) {
    return null;
  }

  const handleDownload = () => {
    const md = buildFinalAnswerMarkdown({ question, finalResponse });
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
    </div>
  );
}
