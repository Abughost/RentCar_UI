import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cars as carsApi, rentals as rentalsApi, toList } from '../api/endpoints'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import ThemeToggle from '../components/ThemeToggle'
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
import { fullName, initials, useAuth } from '../state/AuthContext'

const SECTIONS = [
  { id: 'trips', label: 'Trips', icon: 'key' },
  { id: 'licence', label: 'Licence & ID', icon: 'doc' },
  { id: 'payment', label: 'Payment', icon: 'card' },
  { id: 'loyalty', label: 'Loyalty', icon: 'star' },
  { id: 'invoices', label: 'Invoices', icon: 'route' },
  { id: 'settings', label: 'Settings', icon: 'user' },
]

/** Frame 08. */
export default function Account() {
  const { section = 'trips' } = useParams()
  const { user, isStaff } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState([])
  const [carsById, setCarsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const load = useCallback(() => {
    const ac = new AbortController()
    setLoading(true)

    rentalsApi
      .mine({ signal: ac.signal })
      .then(async (data) => {
        const list = toList(data)
        setBookings(list)
        setError(null)

        // Rentals carry only the car's UUID, so hydrate the ones on screen.
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
  }, [])

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
    <div className="page">
      <Nav />

      <div className="acct">
        <aside className="side">
          <div className="side__u">
            <span className="avatar">{initials(user)}</span>
            <div>
              <div className="side__n">{fullName(user)}</div>
              <div className="side__t">
                {isStaff ? String(user?.role || 'STAFF').toUpperCase() : 'MEMBER'} ·{' '}
                {kmDriven.toLocaleString('en-US')} KM
              </div>
            </div>
          </div>

          <div className="side__nav">
            {SECTIONS.map((item) => (
              <Link
                key={item.id}
                to={`/account/${item.id}`}
                className={`side__l${section === item.id ? ' is-on' : ''}`}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
                {item.id === 'trips' && bookings.length > 0 && (
                  <span className="side__badge">{bookings.length}</span>
                )}
              </Link>
            ))}
          </div>

          <div className="divider--onDark" style={{ margin: '18px 0' }} />
          <Link className="side__l" to="/owner">
            <Icon name="key" size="sm" />
            Hosting — list a car
          </Link>

          <div className="divider--onDark" style={{ margin: '18px 0' }} />
          <p className="eyebrow eyebrow--onDark" style={{ marginBottom: 10 }}>
            Theme
          </p>
          <ThemeToggle />

          {isStaff && (
            <>
              <div className="divider--onDark" style={{ margin: '18px 0' }} />
              <a className="side__l" href="/en/admin/" target="_blank" rel="noreferrer">
                <Icon name="out" size="sm" />
                Django admin
              </a>
            </>
          )}

          {!user?.is_registered && !isStaff && (
            <>
              <div className="divider--onDark" style={{ margin: '18px 0' }} />
              <div className="side__warn">
                <div className="side__warnT">Licence not on file</div>
                <div className="side__warnX">
                  Add it once and every pick-up becomes a plate number and a key.
                </div>
                <Link to="/register/licence" className="btn btn--signal btn--sm" style={{ marginTop: 10 }}>
                  Add licence
                </Link>
              </div>
            </>
          )}
        </aside>

        <main className="main">
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
        </main>
      </div>

      <TabBar />
    </div>
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

/**
 * The sidebar sections the API has no endpoints for yet. Rather than pretend, each one says
 * what it will hold and points at the thing that does work today.
 */
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
    settings: {
      title: 'Settings',
      body: `Signed in as ${user?.contact || '—'}. Contact details are set during sign-up and cannot be changed from here yet.`,
      action: null,
    },
  }

  const copy = COPY[section] || COPY.settings

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
