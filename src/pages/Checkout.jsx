import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cars as carsApi, rentals as rentalsApi } from '../api/endpoints'
import BookingRail from '../components/BookingRail'
import Nav from '../components/Nav'
import {
  Alert,
  Button,
  CarArt,
  CheckMark,
  Checkbox,
  Field,
  Icon,
  Spinner,
  Steps,
} from '../components/primitives'
import { formatWhen } from '../lib/dates'
import { STATIONS, bodyShape, carTitle } from '../lib/fleet'
import { EXTRAS, coverOptions, money, quote } from '../lib/pricing'
import { useAuth } from '../state/AuthContext'
import { useBooking } from '../state/BookingContext'

/**
 * Frame 06.
 *
 * Cover and extras are priced entirely in the browser — the Rental model has no line-item
 * table — but the booking itself is a real POST to /user/rentals. What the backend stores
 * is the car, the two locations, the two timestamps and the payment method.
 */
export default function Checkout() {
  const { carId } = useParams()
  const navigate = useNavigate()
  const { draft, update, setExtra, days } = useBooking()
  const { user } = useAuth()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [hold, setHold] = useState(20 * 60)

  useEffect(() => {
    const ac = new AbortController()
    carsApi
      .detail(carId, { signal: ac.signal })
      .then((data) => {
        setCar(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => ac.abort()
  }, [carId])

  // The 20-minute hold the design puts in the checkout chrome.
  useEffect(() => {
    const timer = setInterval(() => setHold((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [])

  const covers = useMemo(() => coverOptions(car?.deposit), [car])
  const cover = covers.find((c) => c.id === draft.cover) || covers[0]
  const priced = useMemo(
    () => quote(car, days, { cover, extras: draft.extras }),
    [car, days, cover, draft.extras],
  )

  async function confirm() {
    setError(null)
    setBusy(true)
    try {
      // RentModelSerializer excludes `user` — the view resolves the UserProfile from the
      // request, and 400s if the licence step was skipped.
      const rental = await rentalsApi.create({
        car: car.id,
        pick_up_location: draft.station,
        pick_up_data_time: draft.pickUpAt,
        drop_of_location: draft.dropStation,
        drop_of_data_time: draft.dropOffAt,
        payment_method: draft.paymentMethod,
      })

      navigate(`/booking/${rental.id}/confirmed`, {
        // The rail's figures are front-end arithmetic, so carry them to the voucher rather
        // than recomputing and risking a different total.
        state: { rental, quote: priced, car, station: draft.station },
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Nav minimal notice="SECURE CHECKOUT" />
        <div className="sec">
          <Spinner label="Loading your booking" />
        </div>
      </div>
    )
  }

  if (!car) {
    return (
      <div className="page">
        <Nav minimal notice="SECURE CHECKOUT" />
        <div className="sec">
          <Alert>{error || 'That car is no longer available.'}</Alert>
          <Link to="/cars" className="btn btn--pine" style={{ marginTop: 18 }}>
            Back to results
          </Link>
        </div>
      </div>
    )
  }

  const mm = String(Math.floor(hold / 60)).padStart(2, '0')
  const ss = String(hold % 60).padStart(2, '0')

  return (
    <div className="page">
      <Nav minimal notice={`SECURE CHECKOUT · BOOKING HELD ${mm}:${ss}`} />

      <div className="co">
        <div>
          <Steps items={['Car', 'Cover & extras', 'Driver', 'Confirm']} current={1} />

          {error && (
            <div style={{ marginBottom: 18 }}>
              <Alert>{error}</Alert>
            </div>
          )}

          {/* ---- 1. cover ---- */}
          <div className="panel">
            <div className="panel__h">
              <span className="panel__n">1</span>
              <h2 className="dh3">Choose your damage cover</h2>
            </div>
            <p className="small panel__lede">
              The excess is what you pay if the car is damaged. Lower it now, or keep it and cover
              the risk yourself.
            </p>
            <div className="cover">
              {covers.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={cover.id === option.id}
                  className={`cover__c${cover.id === option.id ? ' is-on' : ''}`}
                  onClick={() => update({ cover: option.id })}
                >
                  <span className="cover__hd">
                    <span className={`eyebrow${option.signal ? ' eyebrow--signal' : ''}`}>
                      {option.eyebrow}
                    </span>
                    {cover.id === option.id && <CheckMark on />}
                  </span>
                  <span className="cover__t">{option.title}</span>
                  <span className="cover__x">{option.blurb}</span>
                  <span className="cover__p">{option.priceLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ---- 2. extras ---- */}
          <div className="panel">
            <div className="panel__h">
              <span className="panel__n">2</span>
              <h2 className="dh3">Add extras</h2>
            </div>
            <div className="extras">
              {EXTRAS.map((extra) => {
                const raw = draft.extras[extra.id]
                const count = extra.countable ? Number(raw) || 0 : raw ? 1 : 0
                const on = count > 0

                // A countable extra owns a stepper, and a button cannot contain buttons —
                // so it gets a checkbox label instead of a whole-row toggle.
                if (extra.countable) {
                  return (
                    <div key={extra.id} className={`extra${on ? ' is-on' : ''}`}>
                      <Checkbox
                        checked={on}
                        onChange={() => setExtra(extra.id, on ? 0 : 1)}
                        aria-label={extra.name}
                      />
                      <div className="extra__mid">
                        <div style={{ flex: 1 }}>
                          <div className="extra__t">{extra.name}</div>
                          <div className="small">{extra.blurb}</div>
                        </div>
                        <span className="stepper">
                          <button
                            type="button"
                            className="stepper__b"
                            aria-label={`One fewer ${extra.name}`}
                            disabled={count === 0}
                            onClick={() => setExtra(extra.id, Math.max(0, count - 1))}
                          >
                            −
                          </button>
                          <span className="num" style={{ fontSize: 13 }}>
                            {count}
                          </span>
                          <button
                            type="button"
                            className="stepper__b"
                            aria-label={`One more ${extra.name}`}
                            disabled={count >= extra.max}
                            onClick={() => setExtra(extra.id, Math.min(extra.max, count + 1))}
                          >
                            +
                          </button>
                        </span>
                      </div>
                      <span className="extra__p num">${extra.perDay} / day</span>
                    </div>
                  )
                }

                return (
                  <button
                    key={extra.id}
                    type="button"
                    aria-pressed={on}
                    className={`extra${on ? ' is-on' : ''}`}
                    onClick={() => setExtra(extra.id, !on)}
                  >
                    <CheckMark on={on} />
                    <span style={{ flex: 1 }}>
                      <span className="extra__t" style={{ display: 'block' }}>
                        {extra.name}
                      </span>
                      <span className="small">{extra.blurb}</span>
                    </span>
                    <span className="extra__p num">${extra.perDay} / day</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---- 3. driver ---- */}
          <div className="panel">
            <div className="panel__h">
              <span className="panel__n">3</span>
              <h2 className="dh3">Driver details</h2>
            </div>
            <div className="grid2" style={{ marginBottom: 14 }}>
              <Field label="First name" value={user?.first_name || ''} readOnly />
              <Field label="Last name" value={user?.last_name || ''} readOnly />
            </div>
            <div className="grid2" style={{ marginBottom: 14 }}>
              <Field label="Contact on the account" value={user?.contact || ''} readOnly />
              <Field
                label="Pick-up station"
                value={draft.station}
                readOnly
                hint="We text the plate number an hour before pick-up."
              />
            </div>
            <div className="verified">
              <Icon name="shield" />
              <span>
                Licence verified on this account. Nothing to bring — the plate number and bay
                arrive by text.
              </span>
            </div>
          </div>

          {/* ---- 4. payment method ---- */}
          <div className="panel">
            <div className="panel__h">
              <span className="panel__n">4</span>
              <h2 className="dh3">How you'll pay at the counter</h2>
            </div>
            <div className="paymethods">
              {[
                { id: 'card', label: 'Card', blurb: 'Charged when you collect the keys.', icon: 'card' },
                { id: 'cash', label: 'Cash', blurb: 'Pay the station desk on arrival.', icon: 'doc' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  aria-pressed={draft.paymentMethod === method.id}
                  className={`extra${draft.paymentMethod === method.id ? ' is-on' : ''}`}
                  onClick={() => update({ paymentMethod: method.id })}
                >
                  <CheckMark on={draft.paymentMethod === method.id} />
                  <div style={{ flex: 1 }}>
                    <div className="extra__t">{method.label}</div>
                    <div className="small">{method.blurb}</div>
                  </div>
                  <Icon name={method.icon} />
                </button>
              ))}
            </div>
          </div>

          {/* ---- station recap ---- */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel__h">
              <span className="panel__n">
                <Icon name="pin" size="sm" />
              </span>
              <h2 className="dh3">Where you collect it</h2>
            </div>
            <div className="grid2">
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Pick-up
                </p>
                <div style={{ fontWeight: 600 }}>{draft.station}</div>
                <p className="small">
                  {STATIONS.find((s) => s.name === draft.station)?.address || '—'} ·{' '}
                  {formatWhen(draft.pickUpAt)}
                </p>
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Return
                </p>
                <div style={{ fontWeight: 600 }}>{draft.dropStation}</div>
                <p className="small">
                  {STATIONS.find((s) => s.name === draft.dropStation)?.address || '—'} ·{' '}
                  {formatWhen(draft.dropOffAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- rail */}
        <BookingRail
          head={
            <div className="book__top">
              <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 12px' }}>
                {carTitle(car)}
              </p>
              <div className="book__car">
                <CarArt shape={bodyShape(car)} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(233,235,228,.6)' }}>
                {draft.station} · {days} day{days === 1 ? '' : 's'}
                <br />
                {formatWhen(draft.pickUpAt)} → {formatWhen(draft.dropOffAt)}
              </div>
            </div>
          }
          quote={priced}
          footer={
            <>
              <Button variant="signal" size="lg" block onClick={confirm} disabled={busy}>
                {busy ? 'Confirming…' : 'Confirm booking'}
              </Button>
              <p className="small" style={{ textAlign: 'center', marginTop: 10 }}>
                Free to cancel until 24 hours before pick-up. By confirming you accept the rental
                agreement. Total {money(priced.total)}.
              </p>
            </>
          }
        />
      </div>
    </div>
  )
}
