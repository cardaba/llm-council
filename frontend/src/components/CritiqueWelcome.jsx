import { useMemo, useState } from 'react';
import DropZoneSlot from './DropZoneSlot';
import { MAX_CRITIQUE_FILE_BYTES, readFileAsText } from '../utils/download';
import { shouldReconfirm, recordCritiqueRun } from '../utils/critiqueRateLimit';
import './CritiqueWelcome.css';

/**
 * Critique-mode welcome state (Phase 5 D-02 / D-04 / D-05 / D-07).
 *
 * IMPORTANT: this slot order MUST mirror PROFILES["quality"]["council_models"]
 * in backend/config.py — the per-slot file lands at the corresponding model
 * server-side (Plan 05-02). If the backend profile changes, this array MUST
 * be updated in lockstep.
 */
const QUALITY_SLOT_MODELS = [
  'openai/gpt-5.5',
  'anthropic/claude-opus-4.7',
  'google/gemini-3.1-pro-preview',
];

// Pre-flight cost-estimate heuristic — RESEARCH §4.2.
// 0.25 tokens per character is a coarse English average; the range below
// (×0.7 / ×1.3) absorbs the variance.
const HEURISTIC_TOKENS_PER_CHAR = 0.25;
const TOKEN_CAP = 150_000;

// Output token budget per model assumes Stage 1 critique (~1500-2500 tokens)
// + Stage 2 ranking (~400 tokens) + a shared Stage 3 synthesis (~1500 tokens).
// Costs anchored on the worst-case Opus 4.7 rates so the upper end is honest.
const RATE_INPUT_PER_M_USD = 5;
const RATE_OUTPUT_PER_M_USD = 25;
const OUTPUT_TOKENS_PER_MODEL = 2000;
const OUTPUT_TOKENS_SYNTHESIS = 1500;

function formatKB(bytes) {
  return (bytes / 1024).toFixed(1);
}

function estimateCostRange(slots, instruction) {
  const activeChars =
    slots.reduce((acc, s) => acc + (s ? s.content.length : 0), 0) +
    instruction.length;
  const n = slots.filter(Boolean).length;
  if (n === 0) return null;
  // Input is sent to every active model (full per-model fan-out).
  const inputTokens = activeChars * HEURISTIC_TOKENS_PER_CHAR * n;
  const outputTokens = OUTPUT_TOKENS_PER_MODEL * n + OUTPUT_TOKENS_SYNTHESIS;
  const baseCost =
    (inputTokens * RATE_INPUT_PER_M_USD) / 1_000_000 +
    (outputTokens * RATE_OUTPUT_PER_M_USD) / 1_000_000;
  const low = baseCost * 0.7;
  const high = baseCost * 1.3;
  return {
    low: low.toFixed(2),
    high: high.toFixed(2),
    tokens: Math.round(inputTokens),
  };
}

export default function CritiqueWelcome({ onSubmit, isLoading }) {
  const [slots, setSlots] = useState([null, null, null]);
  const [instruction, setInstruction] = useState('');
  const [slotErrors, setSlotErrors] = useState([null, null, null]);
  const [tokenCapError, setTokenCapError] = useState(null);
  const [showReconfirm, setShowReconfirm] = useState(false);

  const cost = useMemo(
    () => estimateCostRange(slots, instruction),
    [slots, instruction]
  );

  const hasFile = slots.some(Boolean);
  const hasInstruction = instruction.trim().length > 0;
  const hasError = slotErrors.some(Boolean) || !!tokenCapError;
  const canSubmit = hasFile && hasInstruction && !hasError && !isLoading;
  const disabledTooltip = canSubmit
    ? undefined
    : 'Attach at least one file and write a critique instruction to submit';

  const handleFile = async (idx, file) => {
    const nextErrors = [...slotErrors];
    nextErrors[idx] = null;

    // Size validation — verbatim copy from UI-SPEC §Copywriting Contract.
    if (file.size > MAX_CRITIQUE_FILE_BYTES) {
      nextErrors[idx] =
        `${file.name} is ${formatKB(file.size)} KB — maximum is 750 KB. Trim the file or split it.`;
      setSlotErrors(nextErrors);
      return;
    }

    // Extension validation — verbatim copy from UI-SPEC.
    const lower = file.name.toLowerCase();
    if (!(lower.endsWith('.md') || lower.endsWith('.txt'))) {
      nextErrors[idx] =
        `${file.name} must be .md or .txt. PDF and DOCX are not supported.`;
      setSlotErrors(nextErrors);
      return;
    }

    let content;
    try {
      content = await readFileAsText(file);
    } catch (e) {
      nextErrors[idx] = `Could not read ${file.name}: ${e.message}`;
      setSlotErrors(nextErrors);
      return;
    }
    // Normalize line endings client-side (server normalizes too).
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const nextSlots = [...slots];
    nextSlots[idx] = {
      file,
      modelId: QUALITY_SLOT_MODELS[idx],
      name: file.name,
      size: file.size,
      content,
    };
    setSlots(nextSlots);
    setSlotErrors(nextErrors);
    setTokenCapError(null);
  };

  const handleRemove = (idx) => {
    const nextSlots = [...slots];
    nextSlots[idx] = null;
    setSlots(nextSlots);
    const nextErrors = [...slotErrors];
    nextErrors[idx] = null;
    setSlotErrors(nextErrors);
    setTokenCapError(null);
  };

  const dispatch = () => {
    recordCritiqueRun();
    onSubmit(instruction.trim(), slots);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Pre-flight token cap — CRIT-06 verbatim copy.
    if (cost && cost.tokens > TOKEN_CAP) {
      setTokenCapError(
        `These files total ≈${Math.round(cost.tokens / 1000)}K tokens, above the 150K cap. Remove one file or trim the largest.`
      );
      return;
    }

    // Soft rate-limit — CRIT-07 verbatim modal copy.
    if (shouldReconfirm()) {
      setShowReconfirm(true);
      return;
    }

    dispatch();
  };

  return (
    <div className="critique-welcome">
      <h1 className="critique-welcome__title">Critique research</h1>
      <p className="critique-welcome__lead">
        Upload up to three deep-research files. The council will read them all,
        critique each one, then synthesise.
      </p>

      <form onSubmit={handleSubmit} className="critique-welcome__form">
        {QUALITY_SLOT_MODELS.map((modelId, i) => (
          <DropZoneSlot
            key={modelId}
            modelId={modelId}
            slot={slots[i]}
            onFile={(file) => handleFile(i, file)}
            onRemove={() => handleRemove(i)}
            error={slotErrors[i]}
          />
        ))}

        <textarea
          className="critique-welcome__instruction"
          placeholder="Identify factual errors, missing perspectives, and weak arguments in these research files…"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          required
          rows={4}
          disabled={isLoading}
          aria-label="Critique instruction"
        />

        {tokenCapError && (
          <div className="critique-welcome__error" role="alert">
            {tokenCapError}
          </div>
        )}

        <div className="critique-welcome__cost-row">
          {cost && (
            <span
              className="critique-welcome__cost"
              aria-live="polite"
            >
              Estimated upstream: ${cost.low}–${cost.high} (billed to your provider keys, not OpenRouter)
            </span>
          )}
          <button
            type="submit"
            className="critique-welcome__submit"
            disabled={!canSubmit}
            title={disabledTooltip}
          >
            Submit critique
          </button>
        </div>
      </form>

      {showReconfirm && (
        <>
          <div
            className="critique-welcome__reconfirm-backdrop"
            onClick={() => setShowReconfirm(false)}
            aria-hidden="true"
          />
          <div
            className="critique-welcome__reconfirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="critique-reconfirm-msg"
          >
            <p
              id="critique-reconfirm-msg"
              className="critique-welcome__reconfirm-msg"
            >
              You have launched 5 critiques in the last hour. Continue?
            </p>
            <div className="critique-welcome__reconfirm-actions">
              <button
                type="button"
                className="critique-welcome__reconfirm-cancel"
                onClick={() => setShowReconfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="critique-welcome__reconfirm-confirm"
                onClick={() => {
                  setShowReconfirm(false);
                  dispatch();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
