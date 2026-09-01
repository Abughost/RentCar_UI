import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { auth as authApi, cars as carsApi, rentals as rentalsApi, toList } from '../api/endpoints'
import {
  Alert,
  Button,
  CarArt,
  Icon,
  Odometer,
  Plate,
  Spinner,
  Tag,
} from '../components/primitives'
import { daysBetween, formatRange, formatWhen, tripProgress } from '../lib/dates'
import { bodyShape, bookingRef, carTitle, plateFor } from '../lib/fleet'
import { coverOptions, money, quote } from '../lib/pricing'
import { SECTIONS } from './RentingLayout'
import { fullName, initials, useAuth } from '../state/AuthContext'

/** Frame 08. */
export default function Account() {
  const { section = 'trips' } = useParams()
  const { user, isClient } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState([])
  const [carsById, setCarsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const showTrips = isClient && section === 'trips'

  const load = useCallback(() => {
    if (!showTrips) {
      setLoading(false)
      return () => {}
    }
    const ac = new AbortController()
    setLoading(true)

    rentalsApi
      .mine({ signal: ac.signal })
      .then(async (data) => {
        const list = toList(data)
        setBookings(list)
        setError(null)

        const ids = [...new Set(list.map((r) => r.car).filter(Boolean))]
        const fetched = await Promise.all(
          ids.map((id) => carsApi.detail(id, { signal: ac.signal }).catch(() => null)),
        )
        if (ac.signal.aborted) return
        setCarsById(Object.fromEntries(fetched.filter(Boolean).map((car) => [car.id, car])))
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [showTrips])

  useEffect(() => load(), [load])

  const { live, upcoming, past } = useMemo(() => {
    const now = new Date()
    const withState = bookings.map((b) => ({
      ...b,
      state: tripProgress(b.pick_up_data_time, b.drop_of_data_time, now),
    }))
    return {
      live: withState.find((b) => b.state.running) || null,
      upcoming: withState
        .filter((b) => b.state.upcoming)
        .sort((a, b) => new Date(a.pick_up_data_time) - new Date(b.pick_up_data_time)),
      past: withState
        .filter((b) => b.state.finished)
        .sort((a, b) => new Date(b.drop_of_data_time) - new Date(a.drop_of_data_time)),
    }
  }, [bookings])

  async function cancel(id) {
    setCancelling(id)
    try {
      await rentalsApi.cancel(id)
      setBookings((list) => list.filter((b) => b.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(null)
    }
  }

  function totalFor(booking) {
    const car = carsById[booking.car]
    const days = daysBetween(booking.pick_up_data_time, booking.drop_of_data_time)
    return quote(car, days, { cover: coverOptions(car?.deposit)[0], extras: {} })
  }

  const spent = past.reduce((sum, b) => sum + totalFor(b).total, 0)
  const kmDriven = past.reduce((sum, b) => {
    const car = carsById[b.car]
    return sum + (car?.limit_km || 250) * daysBetween(b.pick_up_data_time, b.drop_of_data_time)
  }, 0)

  return (
    <>
      <div className="main__head">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            Account
          </p>
          <h1 className="dh2">{SECTIONS.find((s) => s.id === section)?.label || 'Trips'}</h1>
        </div>
        <Link to="/cars" className="btn btn--signal btn--sm">
          <Icon name="plus" size="sm" />
          Book another car
            </Link>
          </div>

          {error && (
            <div style={{ marginBottom: 18 }}>
              <Alert>{error}</Alert>
            </div>
          )}

          {section !== 'trips' ? (
            <OtherSection section={section} user={user} />
          ) : loading ? (
            <Spinner label="Loading your trips" />
          ) : (
            <>
              {/* ---- the running trip outranks everything ---- */}
              {live && (
                <LiveTrip
                  booking={live}
                  car={carsById[live.car]}
                  onOpen={() => navigate(`/trip/${live.id}`)}
                />
              )}

              <div className="mini">
                <div className="mini__c">
                  <div className="mini__k">Trips booked</div>
                  <div className="mini__v">{bookings.length}</div>
                  <div className="small">{upcoming.length} still ahead of you</div>
                </div>
                <div className="mini__c">
                  <div className="mini__k">Kilometres included</div>
                  <div className="mini__v">{kmDriven.toLocaleString('en-US')}</div>
                  <div className="small">Pooled across completed rentals</div>
                </div>
                <div className="mini__c">
                  <div className="mini__k">Spent with KM0</div>
                  <div className="mini__v">{money(spent, { cents: false })}</div>
                  <div className="small">Across {past.length} finished trips</div>
                </div>
              </div>

              <h2 className="dh3" style={{ marginBottom: 14 }}>
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <div className="empty" style={{ marginBottom: 30 }}>
                  <CarArt shape="sedan" className="empty__art" />
                  <h3 className="dh3" style={{ marginBottom: 8 }}>
                    No trips booked yet
                  </h3>
                  <p className="small" style={{ marginBottom: 18 }}>
                    Pick a station and a date, and the fleet held there shows up in seconds.
                  </p>
                  <Link to="/cars" className="btn btn--pine">
                    Find a car
                  </Link>
                </div>
              ) : (
                upcoming.map((booking) => (
                  <UpcomingTrip
                    key={booking.id}
                    booking={booking}
                    car={carsById[booking.car]}
                    total={totalFor(booking).total}
                    busy={cancelling === booking.id}
                    onCancel={() => cancel(booking.id)}
                  />
                ))
              )}

              <h2 className="dh3" style={{ margin: '30px 0 14px' }}>
                Past trips
              </h2>
              {past.length === 0 ? (
                <p className="small">Nothing finished yet — your first trip will land here.</p>
              ) : (
                <div className="tblwrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Car</th>
                        <th>Station</th>
                        <th>Dates</th>
                        <th>Length</th>
                        <th>Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((booking) => {
                        const car = carsById[booking.car]
                        const days = daysBetween(
                          booking.pick_up_data_time,
                          booking.drop_of_data_time,
                        )
                        return (
                          <tr key={booking.id}>
                            <td className="num">{bookingRef(booking.id)}</td>
                            <td>
                              <b>{car ? carTitle(car) : '—'}</b>
                            </td>
                            <td>{booking.pick_up_location}</td>
                            <td className="num">
                              {formatRange(booking.pick_up_data_time, booking.drop_of_data_time)}
                            </td>
                            <td className="num">
                              {days} day{days === 1 ? '' : 's'}
                            </td>
                            <td className="num">
                              <b>{money(totalFor(booking).total)}</b>
                            </td>
                            <td>
                              <Link to={`/booking/${booking.id}/confirmed`}>Voucher</Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
    </>
  )
}

/* ------------------------------------------------------------------ pieces */

function LiveTrip({ booking, car, onOpen }) {
  const days = daysBetween(booking.pick_up_data_time, booking.drop_of_data_time)
  const allowance = (car?.limit_km || 250) * days
  const used = Math.round((allowance * booking.state.percent) / 100)

  return (
    <div className="live">
      <div>
        <span className="live__pill">
          <span className="live__dot" />
          ON THE ROAD
        </span>
        <h2 className="dh3 live__t">
          {car ? carTitle(car) : 'Your car'} · {plateFor(booking.car)}
        </h2>
        <p className="live__x">
          {booking.pick_up_location} · return {formatWhen(booking.drop_of_data_time)}
        </p>
        <div className="progress">
          <span className="progress__f" style={{ width: `${booking.state.percent}%` }} />
        </div>
        <div className="live__meta">
          <span>
            {used.toLocaleString('en-US')} of {allowance.toLocaleString('en-US')} km used
          </span>
          <span>{booking.state.remaining}</span>
        </div>
        <div className="live__acts">
          <Button variant="signal" size="sm" icon="key" onClick={onOpen}>
            Unlock the car
          </Button>
          <Button variant="onDark" size="sm">
            Extend the rental
          </Button>
          <Button variant="onDark" size="sm">
            Report damage
          </Button>
        </div>
      </div>
      <div className="live__art">
        <CarArt shape={bodyShape(car)} />
        <Odometer
          value={String(used)}
          pad={6}
          size="sm"
          style={{ justifyContent: 'center', marginTop: 14 }}
        />
      </div>
    </div>
  )
}

function UpcomingTrip({ booking, car, total, busy, onCancel }) {
  return (
    <div className="car car--wide" style={{ marginBottom: 14 }}>
      <div className="car__art" style={{ width: 240 }}>
        <CarArt shape={bodyShape(car)} />
        <Plate number={plateFor(booking.car)} className="car__plate" />
      </div>
      <div className="car__body">
        <div className="car__head">
          <div>
            <div className="car__cls num" style={{ letterSpacing: '.08em' }}>
              {bookingRef(booking.id)}
            </div>
            <div className="car__n">{car ? carTitle(car) : 'Your car'}</div>
            <p className="car__alt">
              {booking.pick_up_location} · {formatWhen(booking.pick_up_data_time)} →{' '}
              {formatWhen(booking.drop_of_data_time)}
            </p>
          </div>
          <Tag tone="sage" icon="check">
            Confirmed
          </Tag>
        </div>
        <div className="car__foot">
          <div className="small">
            {money(total)} at the counter · paying by {booking.payment_method} · free to cancel
            until 24 hours before
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/booking/${booking.id}/confirmed`} className="btn btn--outline btn--sm">
              View voucher
            </Link>
            <Button size="sm" onClick={onCancel} disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel trip'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OtherSection({ section, user }) {
  const COPY = {
    licence: {
      title: 'Licence & ID',
      body: user?.is_registered
        ? 'Your licence and ID-card numbers are on file, which is what lets a booking complete without a counter check.'
        : 'No licence on file yet. Adding it once unlocks booking.',
      action: user?.is_registered ? null : { to: '/register/licence', label: 'Add licence' },
    },
    payment: {
      title: 'Payment',
      body: 'KM0 takes payment at the counter, so there is no card stored here. Choose cash or card per booking at checkout.',
      action: { to: '/cars', label: 'Book a car' },
    },
    loyalty: {
      title: 'Loyalty',
      body: 'Kilometres driven count toward the next tier. The figure on the left updates as trips finish.',
      action: null,
    },
    invoices: {
      title: 'Invoices',
      body: 'Each finished trip has a voucher with the full breakdown. Open one from the past-trips table.',
      action: { to: '/account/trips', label: 'Back to trips' },
    },
  }

  const copy = COPY[section] || COPY.licence

  return (
    <div className="empty" style={{ textAlign: 'left' }}>
      <h2 className="dh3" style={{ marginBottom: 10 }}>
        {copy.title}
      </h2>
      <p className="small" style={{ marginBottom: copy.action ? 18 : 0, maxWidth: '60ch' }}>
        {copy.body}
      </p>
      {copy.action && (
        <Link to={copy.action.to} className="btn btn--pine">
          {copy.action.label}
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ settings */

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: 'gear' },
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'documents', label: 'Documents', icon: 'doc' },
  { id: 'session', label: 'Session', icon: 'shield' },
]

export function SettingsPanel({ onClose }) {
  const { user, signOut, setUser } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const overlayRef = useRef(null)

  const [tab, setTab] = useState('general')
  const [form, setForm] = useState({ username: '', first_name: '', last_name: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [switchingType, setSwitchingType] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      })
    }
  }, [user])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.append('photo', file)
    try {
      const updated = await authApi.updateUser(fd)
      setUser(updated)
      setSuccess('Photo updated.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fd = new FormData()
    fd.append('username', form.username.trim())
    fd.append('first_name', form.first_name.trim())
    fd.append('last_name', form.last_name.trim())
    try {
      const updated = await authApi.updateUser(fd)
      setUser(updated)
      setSuccess('Profile saved.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSwitchType() {
    setSwitchingType(true)
    setError(null)
    const newType = user.account_type === 'owner' ? 'client' : 'owner'
    const fd = new FormData()
    fd.append('account_type', newType)
    try {
      const updated = await authApi.updateUser(fd)
      setUser(updated)
      setSuccess(`Switched to ${newType === 'owner' ? 'hosting' : 'renting'} mode.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSwitchingType(false)
    }
  }

  async function handleDeleteAccount() {
    setError(null)
    try {
      await authApi.deleteAccount()
      signOut()
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  const photoUrl = user?.photo ? mediaUrl(user.photo) : null
  const isOwner = user?.account_type === 'owner'

  return (
    <div className="stmod" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
      <div className="stmod__box">
        <aside className="stmod__side">
          <p className="stmod__ht">Settings</p>
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`stmod__tab${tab === t.id ? ' is-on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size="sm" />
              {t.label}
            </button>
          ))}
        </aside>

        <div className="stmod__main">
          <button type="button" className="stmod__close" onClick={onClose}>
            <Icon name="x" size="sm" />
          </button>

          {error && <div style={{ marginBottom: 16 }}><Alert>{error}</Alert></div>}
          {success && <div style={{ marginBottom: 16 }}><Alert tone="ok">{success}</Alert></div>}

          {tab === 'general' && (
            <>
              <h2 className="stmod__title">Profile</h2>

              <div className="stmod__row">
                <span className="stmod__label">Avatar</span>
                <div className="scard__avatar" onClick={() => fileRef.current?.click()} style={{ marginLeft: 'auto' }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="scard__photo" />
                  ) : (
                    <span className="scard__initials">{initials(user)}</span>
                  )}
                  <span className="scard__overlay">
                    <Icon name="plus" size="sm" />
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="stmod__row">
                  <label className="stmod__label">Full name</label>
                  <div className="stmod__fields">
                    <div className="fld">
                      <div className="fld__box">
                        <input
                          value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          placeholder="First name"
                        />
                      </div>
                    </div>
                    <div className="fld">
                      <div className="fld__box">
                        <input
                          value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stmod__row">
                  <label className="stmod__label">Username</label>
                  <div className="fld" style={{ flex: 1 }}>
                    <div className="fld__box">
                      <input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="Username"
                      />
                    </div>
                  </div>
                </div>

                <div className="stmod__row">
                  <label className="stmod__label">Contact</label>
                  <span className="small">{user?.contact || '—'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" className="btn btn--signal btn--sm" disabled={busy}>
                    {busy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </>
          )}

          {tab === 'account' && (
            <>
              <h2 className="stmod__title">Account</h2>

              <div className="stmod__row">
                <div>
                  <div className="stmod__label">Account type</div>
                  <p className="small" style={{ marginTop: 4 }}>
                    {isOwner
                      ? 'You are currently hosting. Switch to renting to book cars.'
                      : 'You are currently renting. Switch to hosting to list cars.'}
                  </p>
                </div>
                <div className="actype actype--sm" style={{ marginLeft: 'auto', minWidth: 200 }}>
                  <button
                    type="button"
                    className={`actype__btn${!isOwner ? ' is-on' : ''}`}
                    onClick={!isOwner ? undefined : handleSwitchType}
                    disabled={switchingType}
                  >
                    <Icon name="key" size="sm" /> Renting
                  </button>
                  <button
                    type="button"
                    className={`actype__btn${isOwner ? ' is-on' : ''}`}
                    onClick={isOwner ? undefined : handleSwitchType}
                    disabled={switchingType}
                  >
                    <Icon name="route" size="sm" /> Hosting
                  </button>
                  <span className="actype__thumb" style={{ transform: isOwner ? 'translateX(100%)' : 'translateX(0)' }} />
                </div>
              </div>

              <div className="stmod__divider" />

              <h2 className="stmod__title" style={{ color: 'var(--brick)' }}>Danger zone</h2>
              <p className="small" style={{ marginBottom: 14 }}>
                Permanently deactivate your account. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="small" style={{ fontWeight: 600, color: 'var(--brick)' }}>
                    Are you sure?
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{ background: 'var(--brick)', color: '#fff', borderColor: 'var(--brick)' }}
                    onClick={handleDeleteAccount}
                  >
                    Yes, delete
                  </button>
                  <Button size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(true)}>
                  Delete account
                </Button>
              )}
            </>
          )}

          {tab === 'documents' && (
            <>
              <h2 className="stmod__title">Licence & ID</h2>
              <div className="stmod__row">
                <div>
                  <div className="stmod__label">Driving licence</div>
                  <p className="small" style={{ marginTop: 4 }}>
                    {user?.is_registered
                      ? 'Your driving licence and ID card are verified and on file.'
                      : 'No licence registered yet. Add it to unlock bookings.'}
                  </p>
                </div>
                {user?.is_registered ? (
                  <Tag tone="sage" icon="check">Verified</Tag>
                ) : (
                  <Link to="/register/licence" className="btn btn--pine btn--sm" onClick={onClose}>
                    Add licence
                  </Link>
                )}
              </div>
            </>
          )}

          {tab === 'session' && (
            <>
              <h2 className="stmod__title">Session</h2>
              <div className="scard__session">
                <div className="scard__sessionDot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Current session</div>
                  <p className="small">Signed in as {user?.contact || '—'}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    signOut()
                    navigate('/signin')
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
