import Markdown from './Markdown';
import ReasoningDisclosure from './ReasoningDisclosure';
import './Stage4.css';

/**
 * Stage 4: Refinement sub-section (D-15..D-17).
 *
 * Lives DIRECTLY UNDER the Stage 3 panel (rendered as a child of <Stage3>) so
 * it reads visually as a sub-section of the chairman's synthesis, not a peer
 * stage on the same hierarchy as Stage 1 / 2.
 *
 * The sub-section surfaces the critic metadata that drove the refinement
 * (score + primary concern) and renders the refined chairman markdown. If the
 * chairman emitted reasoning_details for the refinement step, the disclosure
 * is reused below the response.
 *
 * Renders nothing when `stage4` is null/undefined — D-15 contract: Stage 3
 * always shows; Stage 4 only when the QR critic gated below threshold.
 */
export default function Stage4({ stage4 }) {
  if (!stage4) return null;

  const score = stage4.critic_score ?? '?';
  const concern = stage4.primary_concern || '(no specific concern parsed)';

  return (
    <div className="stage stage4">
      <h3 className="stage-title">Stage 4: Refinement</h3>
      <div className="stage4-meta">
        <div className="critic-score">
          Critic scored synthesis <strong>{score}/10</strong> — refinement triggered
        </div>
        <div className="critic-concern">
          <em>Reason:</em> {concern}
        </div>
      </div>
      <div className="stage4-response markdown-content">
        <Markdown>{stage4.response || '_(no refined answer)_'}</Markdown>
      </div>
      {stage4.reasoning_details && (
        <ReasoningDisclosure details={stage4.reasoning_details} />
      )}
    </div>
  );
}
