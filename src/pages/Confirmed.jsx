import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { cars as carsApi, rentals as rentalsApi } from '../api/endpoints'
import Nav from '../components/Nav'
import { Button, CarArt, Icon, Odometer, Plate, Spinner, Tag } from '../components/primitives'
import { daysBetween, formatDay, formatWhen } from '../lib/dates'
import {
  bodyShape,
  bookingRef,
  carTitle,
  fuelLabel,
  plateFor,
  transmissionLabel,
} from '../lib/fleet'
import { km, money, quote as buildQuote, coverOptions } from '../lib/pricing'
import { useAuth } from '../state/AuthContext'

/**
 * Frame 07 — the tear-off voucher.
 *
 * Checkout hands the rental, the car and the priced quote over in router state, which
 * makes the common path a single render with no spinner. Arriving cold (a bookmark, a
 * refresh) falls back to fetching the rental and its car.
 */
export default function Confirmed() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()

  const passed = location.state || {}
  const [rental, setRental] = useState(passed.rental || null)
  const [car, setCar] = useState(passed.car || null)
  const [loading, setLoading] = useState(!passed.rental)

  useEffect(() => {
    if (passed.rental) return undefined

    const ac = new AbortController()
    rentalsApi
      .detail(id, { signal: ac.signal })
      .then(async (data) => {
        setRental(data)
        if (data?.car) {
          const full = await carsApi.detail(data.car, { signal: ac.signal }).catch(() => null)
          setCar(full)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [id, passed.rental])

  if (loading) {
    return (
      <div className="page page--dark">
        <Nav tone="dark" />
        <div className="sec">
          <Spinner label="Loading your voucher" />
        </div>
      </div>
    )
  }

  const days = rental ? daysBetween(rental.pick_up_data_time, rental.drop_of_data_time) : 0
  const quote =
    passed.quote || buildQuote(car, days, { cover: coverOptions(car?.deposit)[0], extras: {} })
  const reference = bookingRef(rental?.id || id)
  const plate = plateFor(car?.id || rental?.car)
  const title = car ? carTitle(car) : 'Your car'

  return (
    <div className="page page--dark">
      <Nav tone="dark" />

      <div className="conf">
        <div className="conf__grid">
          <div>
            <Tag tone="signal" icon="check" className="conf__tag">
              Confirmed
            </Tag>
            <h1 className="dh1 conf__h1" style={{ marginTop: 18 }}>
              You're driving
              <br />
              on {formatDay(rental?.pick_up_data_time).split(' ')[0] || 'Friday'}.
            </h1>
            <p className="conf__p">
              We've saved the trip to your account under {reference}
              {user?.contact ? ` and sent the voucher to ${user.contact}` : ''}. Your plate number
              arrives by text an hour before pick-up.
            </p>

            <div className="conf__acts">
              <Link to="/account" className="btn btn--signal">
                Go to my trip
              </Link>
              <Button variant="onDark" icon="cal" onClick={() => window.print()}>
                Print the voucher
              </Button>
            </div>

            <div className="divider--onDark" style={{ marginBottom: 22 }} />
            <p className="eyebrow eyebrow--onDark" style={{ marginBottom: 14 }}>
              Before you go
            </p>
            <ul className="conf__list">
              <li>
                <Icon name="user" size="sm" />
                Add a second driver's licence from your account so they can drive too.
              </li>
              <li>
                <Icon name="card" size="sm" />
                Bring the card in your own name. We check it at the counter.
              </li>
              <li>
                <Icon name="clock" size="sm" />
                Free to cancel until 24 hours before {formatWhen(rental?.pick_up_data_time)}.
              </li>
            </ul>
          </div>

          {/* ---------------------------------------------------- the ticket */}
          <div className="ticket">
            <div className="ticket__top">
              <div>
                <div className="ticket__k">Booking reference</div>
                <Odometer value={reference.replace('-', '')} size="sm" />
              </div>
              <Plate number={plate} />
            </div>

            <div className="ticket__art">
              <CarArt shape={bodyShape(car)} />
            </div>

            <div className="ticket__perf" />

            <div className="ticket__mid">
              <div>
                <div className="ticket__k">Car</div>
                <div className="ticket__v">{title}</div>
                <div className="small">
                  {car
                    ? `${transmissionLabel(car.transmission_type)} · ${fuelLabel(car.fuel_type)}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="ticket__k">Station</div>
                <div className="ticket__v">{rental?.pick_up_location || '—'}</div>
                <div className="small">Return to {rental?.drop_of_location || '—'}</div>
              </div>
              <div>
                <div className="ticket__k">Pick-up</div>
                <div className="ticket__v num" style={{ fontSize: 14 }}>
                  {formatWhen(rental?.pick_up_data_time)}
                </div>
              </div>
              <div>
                <div className="ticket__k">Return</div>
                <div className="ticket__v num" style={{ fontSize: 14 }}>
                  {formatWhen(rental?.drop_of_data_time)}
                </div>
              </div>
              <div>
                <div className="ticket__k">Included</div>
                <div className="ticket__v num" style={{ fontSize: 14 }}>
                  {km(quote.kmAllowance)}
                </div>
              </div>
              <div>
                <div className="ticket__k">Payment</div>
                <div className="ticket__v" style={{ fontSize: 14, textTransform: 'capitalize' }}>
                  {rental?.payment_method || 'card'}
                </div>
              </div>
            </div>

            <div className="ticket__bot">
              <div className="eyebrow eyebrow--onDark">Total at pick-up</div>
              <div className="ticket__tot">{money(quote.total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
