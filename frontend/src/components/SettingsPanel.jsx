import { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';
import './SettingsPanel.css';

export default function SettingsPanel({ open, onClose }) {
  const dialogRef = useRef(null);
  const { theme, toggle } = useTheme();
  const {
    fontSize,
    density,
    stage4Threshold,
    setFontSize,
    setDensity,
    setStage4Threshold,
  } = useSettings();

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return undefined;
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);

  const handleClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const nextThemeLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <dialog
      ref={dialogRef}
      className="settings-panel"
      onClick={handleClick}
      aria-labelledby="settings-panel-title"
    >
      <div
        className="settings-panel__inner"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-panel__header">
          <h2 id="settings-panel-title" className="settings-panel__title">
            Settings
          </h2>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Close settings"
            title="Close settings"
          >
            <CloseIcon />
          </button>
        </header>

        <section className="settings-panel__section">
          <span className="settings-panel__label">Theme</span>
          <button
            type="button"
            className="settings-panel__theme-toggle"
            onClick={toggle}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            <span className="settings-panel__theme-label">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        </section>

        <fieldset className="settings-panel__section settings-panel__fieldset">
          <legend className="settings-panel__label">Font size</legend>
          <div className="settings-panel__radio-group">
            {[
              { value: 's', label: 'Small' },
              { value: 'm', label: 'Medium' },
              { value: 'l', label: 'Large' },
            ].map((opt) => (
              <label key={opt.value} className="settings-panel__radio">
                <input
                  type="radio"
                  name="fontSize"
                  value={opt.value}
                  checked={fontSize === opt.value}
                  onChange={() => setFontSize(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-panel__section settings-panel__fieldset">
          <legend className="settings-panel__label">Density</legend>
          <div className="settings-panel__radio-group">
            {[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
            ].map((opt) => (
              <label key={opt.value} className="settings-panel__radio">
                <input
                  type="radio"
                  name="density"
                  value={opt.value}
                  checked={density === opt.value}
                  onChange={() => setDensity(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className="settings-panel__section">
          <label
            htmlFor="stage4-threshold"
            className="settings-panel__label"
          >
            Stage 4 threshold
          </label>
          <div className="settings-panel__slider-row">
            <input
              id="stage4-threshold"
              type="range"
              min="1"
              max="10"
              step="1"
              value={stage4Threshold}
              onChange={(e) =>
                setStage4Threshold(parseInt(e.target.value, 10))
              }
              aria-label="Stage 4 threshold"
            />
            <span
              className="settings-panel__slider-value"
              aria-live="polite"
            >
              {stage4Threshold}
            </span>
          </div>
          <p className="settings-panel__microcopy">
            Higher = stricter; only refine when answer scores ≥
            {stage4Threshold}/10
          </p>
        </section>
      </div>
    </dialog>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
