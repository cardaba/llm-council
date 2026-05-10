import './Stage1Progress.css';

/**
 * 3-segment progress strip for the council deliberation.
 * Resolves F-06 ("which models are running") + H1-01 (visible progress).
 *
 * Props:
 *   stage: 'stage1' | 'stage2' | 'stage3' | null
 *   models: string[]  — short model names, used in the active-stage microcopy line
 *   isComplete: bool  — when true, the strip auto-collapses
 */
export default function Stage1Progress({ stage, models = [], isComplete = false }) {
  // Determine state per segment
  const segmentState = (segId) => {
    if (isComplete) return 'done';
    if (stage === segId) return 'active';
    const order = ['stage1', 'stage2', 'stage3'];
    const currIdx = order.indexOf(stage);
    const segIdx = order.indexOf(segId);
    if (currIdx === -1) return 'pending';
    return segIdx < currIdx ? 'done' : 'pending';
  };

  const labels = {
    stage1: `Stage 1 · ${models.length} ${models.length === 1 ? 'modelo' : 'modelos'}`,
    stage2: 'Stage 2 · evaluating',
    stage3: 'Stage 3 · synthesis',
  };

  // Hide entirely when there's nothing to show (no active stage and not collapsing).
  if (!stage && !isComplete) return null;

  return (
    <div
      className="stage1-progress"
      data-collapsed={isComplete ? 'true' : 'false'}
      role="status"
      aria-live="polite"
    >
      <div className="stage1-progress__strip">
        {['stage1', 'stage2', 'stage3'].map((segId) => {
          const state = segmentState(segId);
          return (
            <div
              key={segId}
              className="stage1-progress__segment"
              data-state={state}
            >
              <span className="stage1-progress__label">{labels[segId]}</span>
              {state === 'active' && (
                <span className="stage1-progress__dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {stage === 'stage1' && models.length > 0 && (
        <div className="stage1-progress__model-list">
          {models.join(' · ')}
        </div>
      )}
    </div>
  );
}
