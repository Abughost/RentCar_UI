import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'
import { Alert, Button, Checkbox, Field, Icon } from '../components/primitives'
import { useAuth } from '../state/AuthContext'

/** Frame 01. */
export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [keep, setKeep] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const from = location.state?.from?.pathname || '/account'

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await signIn({ contact: contact.trim(), password })
      // Staff land on the Django admin they actually use; customers on their trips.
      if (user?.is_staff || user?.role === 'admin' || user?.role === 'moderator') {
        navigate('/account', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'No account matches that contact and password.'
          : err.message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__top">
          <Link to="/" className="auth__logo">
            KM<em>0</em>
          </Link>
          <ThemeToggle compact />
        </div>
        <div>
          <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 16px' }}>
            Kilometre zero
          </p>
          <h1 className="auth__claim">
            Your next
            <br />
            car is at
            <br />
            <span>000000</span>.
          </h1>
          <p className="auth__lede">
            Sign in to see the cars held at your usual station, reuse your licence details, and skip
            the counter queue.
          </p>
        </div>
        <div className="auth__stats">
          <div>
            <div className="auth__statN">4</div>
            <div className="auth__statL">Cities, 11 stations</div>
          </div>
          <div>
            <div className="auth__statN">912</div>
            <div className="auth__statL">Cars in the fleet</div>
          </div>
          <div>
            <div className="auth__statN">250</div>
            <div className="auth__statL">km included daily</div>
          </div>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__switch">
          New to KM0? <Link to="/register">Create an account</Link>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <p className="eyebrow" style={{ margin: '0 0 10px' }}>
            Welcome back
          </p>
          <h2 className="dh2" style={{ marginBottom: 8 }}>
            Sign in
          </h2>
          <p className="small" style={{ marginBottom: 28 }}>
            Use the username you picked, or the email you signed up with.
          </p>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert>{error}</Alert>
            </div>
          )}

          <Field
            label="Username or email"
            name="contact"
            type="text"
            autoComplete="username"
            placeholder="aziz or you@mail.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
          <div style={{ height: 16 }} />

          <Field
            label="Password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            trailing={
              <button type="button" className="fld__reveal" onClick={() => setShow((v) => !v)}>
                {show ? 'Hide' : 'Show'}
              </button>
            }
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              margin: '14px 0 26px',
              flexWrap: 'wrap',
            }}
          >
            <Checkbox checked={keep} onChange={(e) => setKeep(e.target.checked)}>
              Keep me signed in
            </Checkbox>
            <Link
              to="/register"
              style={{
                fontSize: 13,
                color: 'var(--ink-70)',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '1px solid var(--ink-20)',
              }}
            >
              Reset password
            </Link>
          </div>

          <button type="submit" className="btn btn--signal btn--block btn--lg" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth__or">OR</div>
          <div className="sso">
            <span className="sso__btn" aria-disabled="true" title="Not connected yet">
              <svg className="ico" viewBox="0 0 24 24" style={{ stroke: 'none', fill: 'currentColor' }}>
                <path d="M12 11v3.2h5.3c-.2 1.4-1.6 4-5.3 4a5.8 5.8 0 0 1 0-11.6c1.7 0 2.9.7 3.5 1.4l2.4-2.3A9 9 0 1 0 12 21c5.2 0 8.7-3.7 8.7-8.8 0-.6 0-1-.1-1.4z" />
              </svg>
              Google
            </span>
            <span className="sso__btn" aria-disabled="true" title="Not connected yet">
              <svg className="ico" viewBox="0 0 24 24" style={{ stroke: 'none', fill: 'currentColor' }}>
                <path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.2-.8-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.7 3.1-.7 1.5 0 1.9.7 3.2.7 1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-1-2.3-3.6zM14.1 5.2c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.3z" />
              </svg>
              Apple
            </span>
          </div>

          <div className="divider" style={{ margin: '26px 0 18px' }} />
          <p className="auth__legal">
            <Icon name="shield" size="sm" style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Renting for work? <Link to="/business">Sign in with your company account</Link> to bill
            the trip to your employer.
          </p>
        </form>
      </main>
    </div>
  )
}
