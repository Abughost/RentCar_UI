import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Icon, Plate, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { chartSeries, rankRows, seeded, STATUS_LABEL, STATUS_TONE } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { CityMapBackdrop } from './CityMap'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

const STOPS = ['Home base', 'Airport Terminal 2', 'Riverside retail park', 'Northgate Centre', 'Lakeside, 90 km north']

/** Frame 14 — the route it's driving now, the odometer, and where it keeps going back to. */
export default function CarLive() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fleet, loading, error } = useOwner()
  const [period, setPeriod] = useState('month')

  const c = fleet.find((car) => car.id === id)
  const chart = useMemo(() => (c ? chartSeries(`${c.id}:earn`, 15) : []), [c])

  const stops = useMemo(() => {
    if (!c) return []
    const rows = STOPS.map((name, i) => ({
      name,
      value: i === 0 ? 100 : Math.round(60 * seeded(c.id, `stop:${i}`)) + 5,
    })).sort((a, b) => b.value - a.value)
    const top = rows[0].value
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / top) * 100) }))
  }, [c])

  if (loading) return <Spinner label="Loading this car" />
  if (error) return <Alert>{error}</Alert>
  if (!c) {
    return (
      <div className="empty">
        <h3 className="dh3" style={{ marginBottom: 8 }}>
          Car not found
        </h3>
        <p className="small" style={{ marginBottom: 18 }}>
          It may have been removed from the fleet since you last looked.
        </p>
        <Link to="/owner/cars" className="btn btn--pine">
          Back to my cars
        </Link>
      </div>
    )
  }

  const odometer = 60000 + (parseInt(c.plate.replace(/\D/g, ''), 10) || 0) * 3
  const kmByRenter = Math.round(c.kmDriven * 0.91)
  const kmByYou = c.kmDriven - kmByRenter

  return (
    <>
      <div className="crumb" style={{ padding: '0 0 14px', background: 'transparent' }}>
        <Link to="/owner/cars">My cars</Link> <Icon name="chev" size="sm" />{' '}
        <span style={{ color: 'var(--ink)' }}>
          {carTitle(c.car)} · {c.plate}
        </span>
      </div>

      <div className="hhead">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Plate number={c.plate} style={{ height: 32 }} />
          <div>
            <h1 className="dh2" style={{ fontSize: 32 }}>
              {carTitle(c.car)}
            </h1>
            <span className={`st st--${STATUS_TONE[c.status]}`} style={{ marginTop: 6, display: 'inline-flex' }}>
              <span className="st__d" />
              {STATUS_LABEL[c.status].toUpperCase()}
              {c.status === 'on_rent' && ` · ${c.renter.toUpperCase()} · RETURNS IN ${c.returnsIn}D`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodSwitch value={period} onChange={setPeriod} />
          <Button size="sm" onClick={() => navigate('/owner/cars')}>
            Edit listing
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 18, marginBottom: 20 }}>
        <div className="map">
          <CityMapBackdrop />
          <div className="map__pin" style={{ left: '13.6%', top: '79.5%' }}>
            <span className="map__dot">
              <Icon name="key" size="sm" />
            </span>
            <span className="map__lab">
              {c.status === 'on_rent' ? 'PICKED UP THIS TRIP' : 'HOME BASE'}
            </span>
          </div>
          <div className="map__pin" style={{ left: `${c.pin.left}%`, top: `${c.pin.top}%` }}>
            <span className={`map__dot${c.status === 'on_rent' ? ' map__dot--live' : ''}`}>
              <Icon name="key" size="sm" />
            </span>
            <span className="map__lab">
              {c.status === 'on_rent' ? `NOW · ${c.speed} KM/H` : STATUS_LABEL[c.status].toUpperCase()}
            </span>
          </div>
          <div className="map__legend">
            <span className="map__lg">
              <span className="map__sw" style={{ background: 'var(--signal)' }} />
              Driven today · {c.status === 'on_rent' ? Math.round(c.kmDriven / c.daysRented) : 0} km
            </span>
            <span className="map__lg">
              <span className="map__sw" style={{ background: 'rgba(244,203,46,.4)' }} />
              Predicted return route
            </span>
          </div>
        </div>

        <div>
          <div className="kpi" style={{ marginBottom: 14 }}>
            <div className="kpi__k">Odometer now</div>
            <div className="num" style={{ fontSize: 27, fontWeight: 600, margin: '12px 0 10px' }}>
              {odometer.toLocaleString('en-US')} <span style={{ fontSize: 14, color: 'var(--ink-45)' }}>KM</span>
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>Driven this month</span>
              <b className="num">{c.kmDriven.toLocaleString('en-US')} km</b>
            </div>
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>By renters</span>
              <b className="num">{kmByRenter.toLocaleString('en-US')} km</b>
            </div>
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>By you</span>
              <b className="num">{kmByYou.toLocaleString('en-US')} km</b>
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>Next service</span>
              <b className="num" style={{ color: 'var(--brick)' }}>
                in {c.nextServiceKm.toLocaleString('en-US')} km
              </b>
            </div>
          </div>
          <div className="kpi">
            <div className="kpi__k">Right now</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14, fontSize: 13, color: 'var(--ink-70)' }}>
              <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <Icon name="fuel" size="sm" style={{ color: 'var(--pine-700)' }} />
                Fuel {c.fuelPct}% · about {Math.round(c.fuelPct * 5.5)} km left
              </span>
              <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <Icon name="clock" size="sm" style={{ color: 'var(--pine-700)' }} />
                {c.status === 'on_rent' ? `Parked ${c.parkedHours} hours ago` : 'Free to book now'}
              </span>
              <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <Icon name="shield" size="sm" style={{ color: 'var(--verified)' }} />
                No alerts. No harsh braking logged.
              </span>
            </div>
            {c.status === 'on_rent' && (
              <Button size="sm" block style={{ marginTop: 16 }}>
                Message {c.renter.split(' ')[0]}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="chart">
          <p className="eyebrow" style={{ margin: '0 0 4px' }}>
            Where this car spends its time
          </p>
          <p className="small" style={{ marginBottom: 20 }}>
            Stops longer than 30 minutes, this month.
          </p>
          <div className="rank">
            {stops.map((s, i) => (
              <div className="rank__r" key={s.name}>
                <span className="rank__n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{s.name}</div>
                  <div className="rank__b">
                    <span className={`rank__f${i === 0 ? ' rank__f--top' : ''}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
                <span className="rank__v">{s.value} stops</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <p className="eyebrow" style={{ margin: '0 0 6px' }}>
                Earned by this car
              </p>
              <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                {money(c.monthEarned, { cents: false })}
              </div>
            </div>
          </div>
          <div className="chart__plot" style={{ height: 150, gap: 5 }}>
            {chart.map((bar, i) => (
              <div className="chart__col" key={i}>
                <span
                  className={`chart__b${bar.idle ? ' chart__b--idle' : bar.now ? ' chart__b--now' : ''}`}
                  style={{ height: `${bar.height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: '16px 0 14px' }} />
          <div className="book__row" style={{ padding: '5px 0' }}>
            <span>
              {c.daysRented} rented days × {money(c.perDay, { cents: false })}
            </span>
            <b className="num">{money(c.daysRented * c.perDay)}</b>
          </div>
        </div>
      </div>
    </>
  )
}
