import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, CarArt, Gauge, Icon, Plate, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { fleetCount, STATUS_LABEL, STATUS_TONE } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on_rent', label: 'On rent' },
  { key: 'free', label: 'Free' },
  { key: 'paused', label: 'Paused' },
]

/** Frame 13 — one row per car, status and money read left to right. */
export default function MyCars() {
  const { fleet, loading, error } = useOwner()
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
            Once you list a car it shows up here, with its status, location and what it earns.
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
            <CarRow key={c.id} hostCar={c} />
          ))}
        </>
      )}
    </>
  )
}

function CarRow({ hostCar: c }) {
  const occGauge = Math.max(1, Math.round((c.occupancyPct / 100) * 6))

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
              {c.status === 'on_rent' && ` · ${c.renter.split(' ')[0].toUpperCase()} ${c.renter.split(' ')[1]?.[0] || ''}. · RETURNS IN ${c.returnsIn}D`}
              {c.status === 'free' && ` · PARKED AT ${c.area.toUpperCase()}`}
              {c.status === 'paused' && ' · INSURANCE NEEDS RENEWAL'}
            </span>
            <div className="car__n" style={{ marginTop: 6 }}>
              {carTitle(c.car)}
            </div>
            <p className="car__alt">
              {c.status === 'on_rent'
                ? `Moving now near ${c.area} · ${c.speed} km/h`
                : c.status === 'free'
                  ? `Parked near ${c.area}`
                  : `Paused since this week · ${c.area}`}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 26, textAlign: 'right' }}>
            <Stat label="This month" value={money(c.monthEarned, { cents: false })} />
            <Stat label="Days rented" value={`${c.daysRented} / ${c.daysAvailable}`} />
            <Stat label="Km driven" value={c.kmDriven.toLocaleString('en-US')} />
            <Stat label="Rating" value={c.rating} />
          </div>
        </div>
        <div className="car__foot">
          {c.status === 'paused' ? (
            <div className="small" style={{ color: 'var(--brick)', fontWeight: 500 }}>
              Insurance certificate expired — the listing is hidden until you upload a new one.
            </div>
          ) : (
            <Gauge filled={occGauge} caption={`${c.occupancyPct}% occupied${occGauge >= 5 ? ' — your best car' : ''}`} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {c.status === 'paused' ? (
              <>
                <Button size="sm">Upload insurance</Button>
                <Button variant="signal" size="sm">
                  Put back online
                </Button>
              </>
            ) : (
              <>
                <Link to={`/owner/cars/${c.id}`} className="btn btn--outline btn--sm">
                  Live location
                </Link>
                <Button size="sm">Message renter</Button>
                <Link to={`/owner/cars/${c.id}`} className="btn btn--pine btn--sm">
                  Open car
                </Link>
              </>
            )}
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
