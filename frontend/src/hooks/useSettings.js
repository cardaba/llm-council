import { useState, useEffect, useCallback } from 'react';

const KEY_FONT = 'fontSize';
const KEY_DENSITY = 'density';
const KEY_STAGE4 = 'stage4Threshold';
const DEFAULT_FONT = 'm';
const DEFAULT_DENSITY = 'comfortable';
const DEFAULT_STAGE4 = 8; // MIRROR: backend/config.py PROFILES["quality_research"]["stage4_threshold"]

function readInitial(key, fallback, validate) {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const ok = validate(stored);
      if (ok !== null) return ok;
    }
  } catch {
    /* private browsing / disabled storage — treat as "no preference stored". */
  }
  return fallback;
}

export function useSettings() {
  const [fontSize, setFontSizeState] = useState(() =>
    readInitial(KEY_FONT, DEFAULT_FONT, (v) =>
      ['s', 'm', 'l'].includes(v) ? v : null
    )
  );
  const [density, setDensityState] = useState(() =>
    readInitial(KEY_DENSITY, DEFAULT_DENSITY, (v) =>
      ['compact', 'comfortable'].includes(v) ? v : null
    )
  );
  const [stage4Threshold, setStage4ThresholdState] = useState(() =>
    readInitial(KEY_STAGE4, DEFAULT_STAGE4, (v) => {
      const n = parseInt(v, 10);
      return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
    })
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-fontsize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setFontSize = useCallback((v) => {
    setFontSizeState(v);
    try {
      localStorage.setItem(KEY_FONT, v);
    } catch {
      /* private browsing / disabled storage — proceed without persistence. */
    }
  }, []);

  const setDensity = useCallback((v) => {
    setDensityState(v);
    try {
      localStorage.setItem(KEY_DENSITY, v);
    } catch {
      /* private browsing / disabled storage — proceed without persistence. */
    }
  }, []);

  const setStage4Threshold = useCallback((v) => {
    setStage4ThresholdState(v);
    try {
      localStorage.setItem(KEY_STAGE4, String(v));
    } catch {
      /* private browsing / disabled storage — proceed without persistence. */
    }
  }, []);

  return {
    fontSize,
    density,
    stage4Threshold,
    setFontSize,
    setDensity,
    setStage4Threshold,
  };
}
