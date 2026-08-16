import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cars as carsApi } from '../../api/endpoints'
import { Alert, Button, CarArt, Gauge, Icon, Plate, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { daysRentedInWindow, earnedInWindow, fleetCount, renterName, STATUS_LABEL, STATUS_TONE } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on_rent', label: 'On rent' },
  { key: 'free', label: 'Free' },
  { key: 'paused', label: 'Paused' },
]

const WINDOW_DAYS = 30

/** Frame 13 — one row per car, status and money read left to right. */
export default function MyCars() {
  const { fleet, loading, error, refresh } = useOwner()
  const [filter, setFilter] = useState('all')
  const [period, setPeriod] = useState('month')

  const shown = filter === 'all' ? fleet : fleet.filter((c) => c.status === filter)

  return (
    <>
      <div className="hhead">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            Hosting
          </p>
          <h1 className="dh2">My cars</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodSwitch value={period} onChange={setPeriod} />
          <Link to="/owner/cars/new" className="btn btn--signal btn--sm">
            <Icon name="plus" size="sm" />
            Add a car
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18 }}>
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading your cars" />
      ) : fleet.length === 0 ? (
        <div className="empty">
          <Icon name="key" size="lg" />
          <h3 className="dh3" style={{ margin: '14px 0 8px' }}>
            No cars listed yet
          </h3>
          <p className="small" style={{ marginBottom: 18 }}>
            Once you list a car it shows up here, with its status and what it earns.
          </p>
          <Link to="/owner/cars/new" className="btn btn--pine">
            Put a car on KM0
          </Link>
        </div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 18 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`chip${filter === f.key ? ' is-on' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {fleetCount(fleet, f.key === 'all' ? null : f.key)}
              </button>
            ))}
          </div>

          {shown.map((c) => (
            <CarRow key={c.id} hostCar={c} onChanged={refresh} />
          ))}
        </>
      )}
    </>
  )
}

function CarRow({ hostCar: c, onChanged }) {
  const [toggling, setToggling] = useState(false)
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS)

  const daysRented = daysRentedInWindow(c.rentals, windowStart, now)
  const occGauge = Math.max(0, Math.min(6, Math.round((daysRented / WINDOW_DAYS) * 6)))
  const earned = earnedInWindow(c.rentals, windowStart, now)

  async function togglePause() {
    setToggling(true)
    try {
      const form = new FormData()
      form.set('is_available', c.status === 'paused' ? 'true' : 'false')
      await carsApi.update(c.id, form)
      onChanged()
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="car car--wide" style={{ marginBottom: 14, opacity: c.status === 'paused' ? 0.72 : 1 }}>
      <div className="car__art" style={{ width: 230 }}>
        <CarArt shape={c.shape} />
        <Plate number={c.plate} className="car__plate" />
      </div>
      <div className="car__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div>
            <span className={`st st--${STATUS_TONE[c.status]}`}>
              <span className="st__d" />
              {STATUS_LABEL[c.status].toUpperCase()}
              {c.status === 'on_rent' && ` · ${renterName(c.activeRental).toUpperCase()}`}
              {c.status === 'paused' && ' · HIDDEN FROM SEARCH'}
            </span>
            <div className="car__n" style={{ marginTop: 6 }}>
              {carTitle(c.car)}
            </div>
            <p className="car__alt">
              {c.status === 'on_rent'
                ? `Returns ${new Date(c.activeRental.drop_of_data_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                : c.status === 'free'
                  ? 'Free to book now'
                  : 'Paused — not shown to renters'}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 26, textAlign: 'right' }}>
            <Stat label={`Last ${WINDOW_DAYS}d`} value={money(earned, { cents: false })} />
            <Stat label="Days rented" value={`${daysRented} / ${WINDOW_DAYS}`} />
            <Stat label="Rating" value={c.rating != null ? `${c.rating} ★` : '—'} />
          </div>
        </div>
        <div className="car__foot">
          {c.status === 'paused' ? (
            <div className="small" style={{ color: 'var(--ink-45)' }}>
              Not visible in search until you switch it back on.
            </div>
          ) : (
            <Gauge filled={occGauge} caption={`${Math.round((daysRented / WINDOW_DAYS) * 100)}% booked, last ${WINDOW_DAYS}d`} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={togglePause} disabled={toggling}>
              {toggling ? 'Saving…' : c.status === 'paused' ? 'Put back online' : 'Pause listing'}
            </Button>
            <Link to={`/owner/cars/${c.id}`} className="btn btn--pine btn--sm">
              Open car
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="kpi__k">{label}</div>
      <div className="num" style={{ fontSize: 19, fontWeight: 600, marginTop: 5 }}>
        {value}
      </div>
    </div>
  )
}
