import { useTheme } from '../hooks/useTheme';
import './Header.css';

/**
 * Header — branded shell rendered as the first row of the App grid.
 * Layout:
 *   [ & LLM Council .................... (sun/moon toggle) ]
 *
 * The ampersand <text> uses currentColor so that the surrounding
 * .app-header__brand color cascades through the SVG (SVG attribute values
 * do not resolve CSS custom properties consistently across engines —
 * inheriting via `color` is the robust pattern; see RESEARCH §Pitfall 5).
 *
 * Accessibility:
 *   - <header role="banner"> is the canonical landmark for the page header.
 *   - The toggle's aria-label and title flip with the next theme it would set
 *     (UI-SPEC §Copywriting Contract).
 */
export default function Header() {
  const { theme, toggle } = useTheme();

  const nextThemeLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="app-header" role="banner">
      <div className="app-header__brand">
        <svg
          className="app-header__mark"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <text
            x="12"
            y="18"
            textAnchor="middle"
            fontFamily="'Source Serif 4 Variable', Georgia, serif"
            fontSize="22"
            fontWeight="400"
            fill="currentColor"
          >
            &amp;
          </text>
        </svg>
        <span className="app-header__name">LLM Council</span>
      </div>

      <button
        type="button"
        className="app-header__theme-toggle"
        onClick={toggle}
        aria-label={nextThemeLabel}
        title={nextThemeLabel}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
