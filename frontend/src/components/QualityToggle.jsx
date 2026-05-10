import './QualityToggle.css';

// PROFILES is the single source of truth for the toggle UI.
// Cost labels are intentionally hardcoded here (D-21 — backend keeps its own
// `typical_cost` in PROFILES, frontend literal-mirrors the strings). When the
// backend updates the cost band, this array must be updated to match.
const PROFILES = [
  { id: 'fast', label: 'Fast', cost: '~$0.001' },
  { id: 'quality', label: 'Quality', cost: '~$0.05 typical' },
  { id: 'quality_research', label: 'Quality+Research', cost: '~$0.45 typical' },
];

/**
 * 3-state segmented control for the Quality Dial (QUAL-03).
 *
 * Direction A footnote-style cost surfacing (D-19/D-20): each option shows the
 * label on top and the cost band as a small italic footnote below. No tooltip
 * — the cost is always visible by design.
 *
 * Controlled component: parent owns the `value` (one of 'fast' | 'quality' |
 * 'quality_research') and receives `onChange(newId)` callbacks.
 */
export default function QualityToggle({ value, onChange, disabled }) {
  return (
    <div className="quality-toggle" role="radiogroup" aria-label="Quality profile">
      {PROFILES.map((p) => (
        <label
          key={p.id}
          className={`quality-option ${value === p.id ? 'active' : ''}`}
        >
          <input
            type="radio"
            name="quality-profile"
            value={p.id}
            checked={value === p.id}
            onChange={() => onChange(p.id)}
            disabled={disabled}
          />
          <span className="quality-label">{p.label}</span>
          <span className="quality-cost">{p.cost}</span>
        </label>
      ))}
    </div>
  );
}
