import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { fullName, initials, useAuth } from '../state/AuthContext'
import ModeSwitch from './ModeSwitch'
import ThemeToggle from './ThemeToggle'
import { Button, Icon } from './primitives'

const LINKS = [
  { to: '/stations', label: 'Stations' },
  { to: '/long-term', label: 'Long term' },
  { to: '/business', label: 'Business' },
  { to: '/help', label: 'Help' },
]

/**
 * @param {'dark'|'light'} tone  dark sits on the pine hero, light on a bone page.
 * @param {boolean} minimal      checkout chrome: no links, no escape hatches.
 */
export default function Nav({ tone = 'light', minimal = false, notice }) {
  const { user, isAuthenticated, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <nav className={`nav${tone === 'light' ? ' nav--light' : ''}`}>
      {pathname !== '/' && (
        <button type="button" className="nav__back" onClick={() => navigate(-1)}>
          <Icon name="chev" size="sm" style={{ transform: 'rotate(180deg)' }} />
          Back
        </button>
      )}

      <Link to="/" className="nav__logo">
        KM<em>0</em>
      </Link>

      {minimal ? (
        <span className="nav__links">
          <span className="co__hold">{notice}</span>
        </span>
      ) : (
        <>
          <button
            type="button"
            className="nav__burger"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>
          <span className={`nav__links${open ? ' is-open' : ''}`}>
            {isAuthenticated ? (
              <ModeSwitch onNavigate={() => setOpen(false)} />
            ) : (
              <NavLink
                to="/cars"
                className={({ isActive }) => (isActive ? 'is-on' : undefined)}
                onClick={() => setOpen(false)}
              >
                Find a car
              </NavLink>
            )}
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'is-on' : undefined)}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </span>
        </>
      )}

      <span className="nav__right">
        <ThemeToggle compact />
        {isAuthenticated ? (
          <>
            <Link to="/account" className="avatar" title={fullName(user)} aria-label="Account">
              {initials(user)}
            </Link>
            <Button variant={tone === 'light' ? 'outline' : 'onDark'} size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : (
          !minimal && (
            <>
              <Link to="/signin" className="nav__signin">
                Sign in
              </Link>
              <Link to="/register" className="btn btn--signal btn--sm">
                Create account
              </Link>
            </>
          )
        )}
      </span>
    </nav>
  )
}
