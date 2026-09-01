import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { auth as authApi } from '../api/endpoints'
import ThemeToggle from '../components/ThemeToggle'
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Icon,
  SelectField,
  Steps,
  Tag,
} from '../components/primitives'
import { useAuth } from '../state/AuthContext'

const STEP_LABELS = ['Account', 'Verify']

const COUNTRIES = [
  'Uzbekistan',
  'Netherlands',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Poland',
  'Türkiye',
  'United Kingdom',
]

/** Survives a page reload so step 2 still knows which address the code went to. */
const PENDING_KEY = 'km0.signup.email'

/**
 * Sign-up for people who do not have an account yet. Two steps, two backend calls:
 *
 *   1. /auth/send-code   parks username + email + password in Redis behind a one-time code.
 *                        Nothing is written to the database yet.
 *   2. /auth/verify-code creates the User once the code matches and answers with a JWT pair,
 *                        so the customer lands on the main page already signed in.
 *
 * A wrong code costs one of the backend's OTP_MAX_ATTEMPTS chances and comes back with
 * `attempts_left`; spending the last one locks the address out for OTP_LOCKOUT_TIMEOUT and
 * sends the customer back to step 1. Both limits are env-driven server-side.
 *
 * The licence step (/register/licence) is no longer part of this chain — it is what
 * IsRegisteredUser wants before a booking, and the customer is sent there from checkout.
 *
 * The step lives in the URL so a refresh does not throw the customer back to the start.
 */
export default function Register() {
  const { step = 'account' } = useParams()
  const navigate = useNavigate()
  const { adoptSession, refreshUser, isAuthenticated, isRegistered } = useAuth()

  const [accountType, setAccountType] = useState('client')
  const [account, setAccount] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [attemptsLeft, setAttemptsLeft] = useState(null)
  const [busy, setBusy] = useState(false)

  const stepIndex = step === 'verify' ? 1 : 0

  // The address is the only thing step 2 needs, and it is not a secret — the password never
  // leaves this tab. A reload on /register/verify would otherwise post an empty email.
  const pendingEmail = account.email || sessionStorage.getItem(PENDING_KEY) || ''

  // Someone already signed in and verified has no business back on step 1.
  useEffect(() => {
    if (isAuthenticated && isRegistered && step !== 'licence') navigate('/account', { replace: true })
  }, [isAuthenticated, isRegistered, step, navigate])

  /* ------------------------------------------------------------ step 1 */

  async function handleSendCode(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const email = account.email.trim().toLowerCase()
      const res = await authApi.sendCode({
        username: account.username.trim(),
        email,
        password: account.password,
        account_type: accountType,
      })
      sessionStorage.setItem(PENDING_KEY, email)
      setNotice(res?.message || 'Code sent.')
      setAttemptsLeft(res?.attempts_left ?? null)
      navigate('/register/verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------ step 2 */

  async function handleVerify(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      // verify-code returns {access, refresh, user}, so there is nothing left to exchange —
      // adopt the session and go straight to the main page.
      const data = await authApi.verifyCode({ email: pendingEmail, code })
      sessionStorage.removeItem(PENDING_KEY)
      adoptSession(data)
      setNotice(null)
      setAttemptsLeft(null)
      navigate('/', { replace: true })
    } catch (err) {
      const left = err instanceof ApiError ? err.data?.attempts_left : null
      setAttemptsLeft(typeof left === 'number' ? left : null)
      setError(err.message)
      setCode('')

      // Out of chances: the backend has dropped the pending sign-up, so the only way forward
      // is to start again once the lockout expires.
      if (left === 0) {
        sessionStorage.removeItem(PENDING_KEY)
        setTimeout(() => navigate('/register'), 2500)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setError(null)
    try {
      const res = await authApi.sendCode({
        username: account.username.trim(),
        email: pendingEmail,
        password: account.password,
      })
      setNotice(res?.message || 'Code sent again.')
      setAttemptsLeft(res?.attempts_left ?? null)
    } catch (err) {
      setError(err.message)
    }
  }

  /* ------------------------------------------------------------ render */

  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__top">
          <Link to="/" className="auth__logo">
            KM<em>0</em>
          </Link>
          <ThemeToggle compact />
        </div>
        <div style={{ margin: 'auto 0' }}>
          <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 16px' }}>
            {step === 'licence' ? 'Licence details' : `Step ${stepIndex + 1} of 2`}
          </p>
          {step === 'licence' ? (
            <>
              <h1 className="auth__claim" style={{ fontSize: 44 }}>
                We check
                <br />
                the licence
                <br />
                <span>once</span>.
              </h1>
              <p className="auth__lede" style={{ marginBottom: 24 }}>
                After this, every pick-up is a plate number and a key. No counter paperwork, no
                photocopies.
              </p>
              <ul className="auth__checks">
                <li>
                  <Icon name="check" style={{ color: 'var(--signal)' }} />
                  Verified in about 4 minutes
                </li>
                <li>
                  <Icon name="check" style={{ color: 'var(--signal)' }} />
                  Stored encrypted, deleted on request
                </li>
                <li>
                  <Icon name="check" style={{ color: 'var(--signal)' }} />
                  Never shared with insurers
                </li>
              </ul>
            </>
          ) : (
            <>
              <h1 className="auth__claim" style={{ fontSize: 46 }}>
                {accountType === 'owner' ? (
                  <>
                    Your car,
                    <br />
                    your <span>rules</span>,
                    <br />
                    your income.
                  </>
                ) : (
                  <>
                    Start at
                    <br />
                    <span>zero</span>,
                    <br />
                    not at a desk.
                  </>
                )}
              </h1>
              <p className="auth__lede">
                {accountType === 'owner'
                  ? 'List your car, set your price, and earn while it sits in the driveway. You can switch to renting anytime from settings.'
                  : 'Pick a username, give us an email, and confirm the code we send. That is the whole sign-up — licence details wait until you actually book.'}
              </p>
            </>
          )}
        </div>
        <div className="auth__stats">
          <div style={{ gridColumn: 'span 3' }}>
            <div className="auth__statL" style={{ margin: 0 }}>
              Held under licence agreement KM0-DPA-2026. You can download or erase your documents
              from Account → Licence &amp; ID at any time.
            </div>
          </div>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </div>

        <div className="auth__form auth__form--wide">
          {step !== 'licence' && <Steps items={STEP_LABELS} current={stepIndex} />}

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert>{error}</Alert>
            </div>
          )}
          {notice && !error && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="ok">{notice}</Alert>
            </div>
          )}

          {step === 'account' && (
            <form onSubmit={handleSendCode}>
              <h1 className="dh2" style={{ marginBottom: 8, fontSize: 32 }}>
                Create your account
              </h1>
              <p className="small" style={{ marginBottom: 26 }}>
                We send a one-time code to the email you sign up with. Nothing is saved until you
                confirm it.
              </p>

              <div className="actype">
                <button
                  type="button"
                  className={`actype__btn${accountType === 'client' ? ' is-on' : ''}`}
                  onClick={() => setAccountType('client')}
                >
                  <Icon name="key" size="sm" />
                  I want to rent
                </button>
                <button
                  type="button"
                  className={`actype__btn${accountType === 'owner' ? ' is-on' : ''}`}
                  onClick={() => setAccountType('owner')}
                >
                  <Icon name="route" size="sm" />
                  I want to host
                </button>
                <span
                  className="actype__thumb"
                  style={{ transform: accountType === 'owner' ? 'translateX(100%)' : 'translateX(0)' }}
                />
              </div>
              <div style={{ height: 14 }} />

              <Field
                label="Username"
                name="username"
                autoComplete="username"
                placeholder="aziz"
                hint="Letters, digits and @ . + - _ only. You can sign in with this or your email."
                value={account.username}
                onChange={(e) => setAccount({ ...account, username: e.target.value })}
                required
                maxLength={150}
              />
              <div style={{ height: 14 }} />

              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@mail.com"
                hint="The verification code goes here."
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                required
              />
              <div style={{ height: 14 }} />

              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="At least 8 characters, and not all digits."
                value={account.password}
                onChange={(e) => setAccount({ ...account, password: e.target.value })}
                required
                minLength={8}
              />

              <button
                type="submit"
                className="btn btn--signal btn--block btn--lg"
                style={{ marginTop: 24 }}
                disabled={busy}
              >
                {busy ? 'Sending code…' : 'Send me a code'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <VerifyStep
              contact={pendingEmail}
              code={code}
              setCode={setCode}
              busy={busy}
              attemptsLeft={attemptsLeft}
              onSubmit={handleVerify}
              onResend={handleResend}
              onBack={() => navigate('/register')}
            />
          )}

          {step === 'licence' && (
            <LicenceStep
              onDone={async () => {
                await refreshUser()
                navigate('/cars')
              }}
              countries={COUNTRIES}
              setError={setError}
            />
          )}
        </div>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ step 2 */

function VerifyStep({ contact, code, setCode, busy, attemptsLeft, onSubmit, onResend, onBack }) {
  const inputs = useRef([])
  // The code is held as a plain 6-character string; a space marks a slot not yet filled, so
  // clearing digit 2 cannot silently shift digits 3–6 down.
  const digits = code.padEnd(6, ' ').slice(0, 6).split('')

  function setDigit(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1)
    setCode(digits.map((d, i) => (i === index ? clean || ' ' : d)).join(''))
    if (clean && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index].trim() && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    event.preventDefault()
    setCode(pasted)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const complete = code.replace(/\D/g, '').length === 6

  return (
    <form onSubmit={onSubmit}>
      <h1 className="dh2" style={{ marginBottom: 8, fontSize: 32 }}>
        Enter the code
      </h1>
      <p className="small" style={{ marginBottom: 26 }}>
        Six digits, sent to <strong style={{ color: 'var(--ink)' }}>{contact || 'your email'}</strong>.
        It expires in six minutes.
      </p>

      {typeof attemptsLeft === 'number' && (
        <p className="small" style={{ margin: '-16px 0 20px', fontWeight: 600 }}>
          {attemptsLeft > 0
            ? `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before this address is locked.`
            : 'No attempts left — start again in a few minutes.'}
        </p>
      )}

      <div className="otp" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1}`}
            maxLength={1}
            value={digit.trim()}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoFocus={i === 0}
          />
        ))}
      </div>

      <p className="small" style={{ marginTop: 14 }}>
        In development the code is printed to the Django console rather than emailed — look for the
        line starting <code>[OTP]</code>.
      </p>

      <button
        type="submit"
        className="btn btn--signal btn--block btn--lg"
        style={{ marginTop: 24 }}
        disabled={busy || !complete}
      >
        {busy ? 'Checking…' : 'Confirm and continue'}
      </button>

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <Button size="sm" onClick={onBack}>
          Change contact
        </Button>
        <Button size="sm" onClick={onResend}>
          Send another code
        </Button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ step 3 */

function LicenceStep({ onDone, countries, setError }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    data_of_birth: '',
    driver_licence_number: '',
    driver_licence_date_of_issue: '',
    id_card_number: '',
    personal_number: '',
  })
  const [country, setCountry] = useState(countries[0])
  const [expires, setExpires] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [docs, setDocs] = useState({ front: null, back: null })
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const { user } = useAuth()

  // Prefill the name captured at sign-up; the profile carries its own copy.
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        first_name: f.first_name || user.first_name || '',
        last_name: f.last_name || user.last_name || '',
      }))
    }
  }, [user])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      await authApi.createProfile(form)
      onDone()
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        setFieldErrors(err.data)
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const errorFor = (key) => {
    const v = fieldErrors[key]
    if (!v) return null
    return Array.isArray(v) ? String(v[0]) : String(v)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="dh2" style={{ marginBottom: 8, fontSize: 32 }}>
        Add your driving licence
      </h1>
      <p className="small" style={{ marginBottom: 26 }}>
        It must be valid for the whole rental and held for at least one year.
      </p>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <Field
          label="First name"
          name="first_name"
          autoComplete="given-name"
          value={form.first_name}
          onChange={(e) => set('first_name', e.target.value)}
          error={errorFor('first_name')}
          required
        />
        <Field
          label="Last name"
          name="last_name"
          autoComplete="family-name"
          value={form.last_name}
          onChange={(e) => set('last_name', e.target.value)}
          error={errorFor('last_name')}
          required
        />
      </div>

      <SelectField
        label="Country of issue"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="fld"
      >
        {countries.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </SelectField>
      <div style={{ height: 14 }} />

      <div className="grid2" style={{ marginBottom: 14 }}>
        <Field
          label="Licence number"
          name="driver_licence_number"
          maxLength={9}
          placeholder="AB1234567"
          hint="9 characters, from the front of the card."
          value={form.driver_licence_number}
          onChange={(e) => set('driver_licence_number', e.target.value.toUpperCase())}
          error={errorFor('driver_licence_number')}
          required
        />
        <Field
          label="Date of birth"
          name="data_of_birth"
          type="date"
          icon="cal"
          value={form.data_of_birth}
          onChange={(e) => set('data_of_birth', e.target.value)}
          error={errorFor('data_of_birth')}
          required
        />
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <Field
          label="Issued"
          name="driver_licence_date_of_issue"
          type="date"
          value={form.driver_licence_date_of_issue}
          onChange={(e) => set('driver_licence_date_of_issue', e.target.value)}
          error={errorFor('driver_licence_date_of_issue')}
          required
        />
        <Field
          label="Expires"
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          hint={
            expires && new Date(expires) > new Date() ? 'Covers your trip.' : 'Must outlast the rental.'
          }
        />
      </div>

      <div className="grid2" style={{ marginBottom: 20 }}>
        <Field
          label="ID card number"
          name="id_card_number"
          maxLength={9}
          placeholder="AA1234567"
          value={form.id_card_number}
          onChange={(e) => set('id_card_number', e.target.value.toUpperCase())}
          error={errorFor('id_card_number')}
          required
        />
        <Field
          label="Personal number"
          name="personal_number"
          maxLength={14}
          placeholder="12345678901234"
          value={form.personal_number}
          onChange={(e) => set('personal_number', e.target.value)}
          error={errorFor('personal_number')}
          required
        />
      </div>

      <Upload
        label="Front of the card"
        file={docs.front}
        onPick={(file) => setDocs((d) => ({ ...d, front: file }))}
      />
      <div style={{ height: 14 }} />
      <Upload
        label="Back of the card"
        file={docs.back}
        onPick={(file) => setDocs((d) => ({ ...d, back: file }))}
      />
      <p className="small" style={{ margin: '8px 0 22px' }}>
        Photos stay on this device — the profile endpoint stores the numbers above, not the images.
      </p>

      <Checkbox
        checked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
        className="check"
      >
        I confirm the licence is mine and currently valid.
      </Checkbox>

      <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
        <Button onClick={() => window.history.back()}>Back</Button>
        <button
          type="submit"
          className="btn btn--signal btn--lg"
          style={{ flex: 1 }}
          disabled={busy || !confirmed}
        >
          {busy ? 'Saving…' : 'Save and find a car'}
        </button>
      </div>
    </form>
  )
}

function Upload({ label, file, onPick }) {
  const input = useRef(null)

  return (
    <div className="upload" style={file ? undefined : { borderColor: 'var(--pine-700)', background: 'rgba(25,74,62,.05)' }}>
      <span
        className="upload__ic"
        style={file ? undefined : { background: 'var(--bone-200)', color: 'var(--ink-45)' }}
      >
        <Icon name={file ? 'doc' : 'plus'} size="lg" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file
            ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
            : 'Drop a photo here, or take one with your phone camera.'}
        </div>
      </div>
      {file ? (
        <Tag tone="sage" icon="check">
          Read
        </Tag>
      ) : (
        <Button size="sm" onClick={() => input.current?.click()}>
          Choose file
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={label}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </div>
  )
}
