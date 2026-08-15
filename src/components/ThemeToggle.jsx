import { THEMES, useTheme } from '../state/ThemeContext'
import { Icon } from './primitives'

/**
 * The design's `.themetog` pill, with a third segment for following the system.
 * Rendered as a radio group so a screen reader announces it as one control with
 * three states rather than three unrelated buttons.
 */
export default function ThemeToggle({ compact = false }) {
  const { choice, setTheme } = useTheme()

  return (
    <div className="themetog" role="radiogroup" aria-label="Colour theme">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          role="radio"
          aria-checked={choice === theme.id}
          className={choice === theme.id ? 'is-on' : undefined}
          title={`${theme.label} theme`}
          onClick={() => setTheme(theme.id)}
        >
          <Icon name={theme.icon} size="sm" />
          {!compact && <span className="themetog__label">{theme.label}</span>}
        </button>
      ))}
    </div>
  )
}
