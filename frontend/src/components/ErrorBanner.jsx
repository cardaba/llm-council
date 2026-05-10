import './ErrorBanner.css';

/**
 * Persistent error banner — H9-01 catastrophic interruption recovery.
 *
 * Triggered when the SSE stream emits an `error` event mid-deliberation
 * (network drop, backend exception, model failure aggregate). Sits ABOVE
 * the ChatInterface so it cannot be missed; a `role="alert"` +
 * `aria-live="assertive"` announce it to assistive tech.
 *
 * The Dismiss button only appears once `retryAttempted === true` so the
 * user must explicitly attempt recovery before being allowed to silence
 * the banner — UI-SPEC §Copywriting Contract line 256 ("Dismiss only
 * after retry attempted at least once").
 */
export default function ErrorBanner({
  stageNumber,
  onRetry,
  onDismiss,
  retryAttempted = false,
}) {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <p className="error-banner__copy">
        La deliberación se interrumpió en Stage {stageNumber}. ¿Quieres
        reintentar con la misma pregunta?
      </p>
      <div className="error-banner__actions">
        <button
          type="button"
          className="error-banner__retry"
          onClick={onRetry}
        >
          Retry
        </button>
        {retryAttempted && (
          <button
            type="button"
            className="error-banner__dismiss"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
