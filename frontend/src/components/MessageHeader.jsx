import './MessageHeader.css';

// Microcopy locked per CD-01 (Claude proposes, user reviews visually):
// - 'Fast', 'Quality', 'Quality+Research' match CONTEXT.md D-26.
// - Singular/plural for the model count: '1 model' / 'N models'.
// - Chairman short name (drop publisher prefix and any :online / :thinking suffix).
// - Stage 4 suffix only when metadata.stage4_triggered === true (Plan 03-04 sets this).
// - Legacy fallback 'Quality (legacy)' per D-27 — no migration of pre-Phase-3 JSONs.
const PROFILE_LABELS = {
  fast: 'Fast',
  quality: 'Quality',
  quality_research: 'Quality+Research',
};

function shortName(model) {
  if (!model) return 'unknown';
  // Drop publisher prefix ('anthropic/claude-opus-4.7' -> 'claude-opus-4.7'),
  // then drop any trailing route suffix ('claude-opus-4.7:online' -> 'claude-opus-4.7').
  const afterSlash = model.split('/')[1] ?? model;
  return afterSlash.split(':')[0] || afterSlash;
}

export default function MessageHeader({ metadata }) {
  // D-27 backwards compat: messages persisted before Phase 3 have no
  // `metadata.profile`. Render a muted legacy tag so the UI never breaks.
  if (!metadata?.profile) {
    return <div className="message-header legacy">Quality (legacy)</div>;
  }
  const label = PROFILE_LABELS[metadata.profile] || metadata.profile;
  const count = metadata.models?.length ?? 0;
  const chairman = shortName(metadata.chairman);
  const stage4Suffix = metadata.stage4_triggered ? ' + Stage 4 refinement' : '';

  // Phase 6 / COST-02 — render the per-message cost line beneath the
  // profile/models/chairman row. D-01 hide-zero gate: skip the line entirely
  // when `metadata.cost.total` is missing or below the $0.001 threshold so
  // Fast queries (~$0 cost) and legacy v2 messages stay clean.
  const cost = metadata.cost;
  const showCostLine =
    cost && typeof cost.total === 'number' && cost.total >= 0.001;
  const upstream = cost?.upstream_total ?? 0;
  const fee = cost?.total ?? 0;

  return (
    <div className="message-header">
      <div className="message-header__row">
        <span className="profile-label">{label}</span>
        <span className="header-sep">•</span>
        <span>{count} model{count === 1 ? '' : 's'}</span>
        <span className="header-sep">•</span>
        <span>Chairman: {chairman}</span>
        {stage4Suffix && <span className="stage4-suffix">{stage4Suffix}</span>}
      </div>
      {showCostLine && (
        <div className="message-header__cost-line">
          <span className="cost-line__upstream">${upstream.toFixed(3)} upstream</span>
          <span className="header-sep">·</span>
          <span className="cost-line__fee">${fee.toFixed(3)} fee</span>
        </div>
      )}
    </div>
  );
}
