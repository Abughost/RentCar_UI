import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Which theme the page is painted in.
 *
 * Three choices, not two: `light`, `dark`, and `system` — which follows the operating
 * system and keeps following it if the user changes it while the tab is open. The choice
 * is stored under the same key the inline script in index.html reads, so a reload paints
 * the right theme on the first frame instead of flashing light and correcting itself.
 */

const ThemeContext = createContext(null)

export const THEME_KEY = 'km0.theme'

export const THEMES = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'Auto', icon: 'system' },
]

function readChoice() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** The theme actually painted, once `system` has been resolved against the OS. */
function resolve(choice) {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return choice
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice)
  const [resolved, setResolved] = useState(() => resolve(readChoice()))

  // Paint. The attribute is what every [data-theme="dark"] rule keys off.
  useEffect(() => {
    const next = resolve(choice)
    setResolved(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(THEME_KEY, choice)
    } catch {
      /* private mode — the choice just will not survive a reload */
    }
  }, [choice])

  // Track the OS while on `system`, so flipping the system theme flips the page live.
  useEffect(() => {
    if (choice !== 'system') return undefined

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = query.matches ? 'dark' : 'light'
      setResolved(next)
      document.documentElement.setAttribute('data-theme', next)
    }

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  // Another tab changed the theme — follow it rather than disagreeing.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === THEME_KEY && event.newValue) setChoice(readChoice())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({
      /** What the user picked: 'light' | 'dark' | 'system'. */
      choice,
      /** What is on screen: 'light' | 'dark'. */
      resolved,
      setTheme: setChoice,
      isDark: resolved === 'dark',
    }),
    [choice, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
