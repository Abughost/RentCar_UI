import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cars as carsApi, rentals as rentalsApi } from '../api/endpoints'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Alert, Button, CarArt, Icon, Odometer, Plate, Spinner } from '../components/primitives'
import { daysBetween, formatWhen, tripProgress } from '../lib/dates'
import { bodyShape, carTitle, plateFor } from '../lib/fleet'

/**
 * Frame 09c — the screen that happens outdoors: find the bay, open the car.
 *
 * The unlock is a hold-to-confirm, because an accidental tap on a phone in a pocket should
 * not open a car. There is no unlock endpoint on the API, so it resolves locally and says so.
 */
export default function TripLive() {
  const { id } = useParams()

  const [rental, setRental] = useState(null)
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unlocked, setUnlocked] = useState(false)
  const [holding, setHolding] = useState(0)

  const timer = useRef(null)

  useEffect(() => {
    const ac = new AbortController()
    rentalsApi
      .detail(id, { signal: ac.signal })
      .then(async (data) => {
        setRental(data)
        if (data?.car) setCar(await carsApi.detail(data.car, { signal: ac.signal }).catch(() => null))
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [id])

  useEffect(() => () => clearInterval(timer.current), [])

  function startHold() {
    if (unlocked) return
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setHolding((v) => {
        if (v >= 100) {
          clearInterval(timer.current)
          setUnlocked(true)
          return 100
        }
        return v + 4
      })
    }, 40)
  }

  function endHold() {
    clearInterval(timer.current)
    if (!unlocked) setHolding(0)
  }

  if (loading) {
    return (
      <div className="page page--dark">
        <Nav tone="dark" />
        <div className="sec">
          <Spinner label="Finding your car" />
        </div>
      </div>
    )
  }

  if (error || !rental) {
    return (
      <div className="page page--dark">
        <Nav tone="dark" />
        <div className="sec">
          <Alert onDark>{error || 'That trip is not on your account.'}</Alert>
          <Link to="/account" className="btn btn--signal" style={{ marginTop: 18 }}>
            Back to my trips
          </Link>
        </div>
      </div>
    )
  }

  const days = daysBetween(rental.pick_up_data_time, rental.drop_of_data_time)
  const state = tripProgress(rental.pick_up_data_time, rental.drop_of_data_time)
  const allowance = (car?.limit_km || 250) * days
  const used = Math.round((allowance * state.percent) / 100)

  return (
    <div className="page page--dark">
      <Nav tone="dark" />

      <div className="trip">
        <div className="trip__inner">
          <span className="live__pill">
            <span className="live__dot" />
            {state.running ? 'ON THE ROAD' : state.upcoming ? 'STARTS SOON' : 'FINISHED'}
          </span>

          <h1 className="dh2" style={{ fontSize: 28, color: 'var(--bone-050)', margin: '18px 0 6px' }}>
            {car ? carTitle(car) : 'Your car'}
          </h1>
          <p className="trip__x">
            {rental.pick_up_location} · return {formatWhen(rental.drop_of_data_time)}
          </p>

          <div className="trip__art">
            <CarArt shape={bodyShape(car)} />
          </div>
          <div className="trip__plate">
            <Plate number={plateFor(rental.car)} />
          </div>

          <button
            type="button"
            className={`btn btn--signal btn--lg btn--block trip__unlock`}
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            style={{ marginBottom: 10 }}
          >
            <span className="trip__unlockFill" style={{ width: `${holding}%` }} />
            <Icon name="key" />
            {unlocked ? 'Unlocked — doors open' : 'Hold to unlock'}
          </button>
          <p className="trip__hint">
            {unlocked
              ? 'DEMO ONLY — THE API HAS NO UNLOCK ENDPOINT'
              : 'WORKS WITHIN 30 M OF THE CAR'}
          </p>

          <div className="trip__meter">
            <div className="trip__meterK">
              <span>DISTANCE USED</span>
              <span>
                {used.toLocaleString('en-US')} / {allowance.toLocaleString('en-US')} KM
              </span>
            </div>
            <div className="progress" style={{ margin: '0 0 12px' }}>
              <span className="progress__f" style={{ width: `${state.percent}%` }} />
            </div>
            <Odometer value={String(used)} pad={6} size="sm" style={{ justifyContent: 'center' }} />
          </div>

          <div className="trip__grid">
            <Button variant="onDark" size="sm">
              Extend rental
            </Button>
            <Button variant="onDark" size="sm">
              Find fuel
            </Button>
            <Button variant="onDark" size="sm">
              Report damage
            </Button>
            <Button variant="onDark" size="sm">
              Call support
            </Button>
          </div>
        </div>
      </div>

      <TabBar dark />
    </div>
  )
}
