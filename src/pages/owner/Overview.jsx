import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Icon, Spinner } from '../../components/primitives'
import {
  chartSeries, daysRentedInWindow, earnedInWindow, fleetCount, PERIODS, renterName,
} from '../../lib/owner'
import { money } from '../../lib/pricing'
import { useOwner } from './useOwnerFleet'

/** Frame 12 — money, in real numbers, then where the fleet stands. */
export default function Overview() {
  const { fleet, rentals, loading, error } = useOwner()
  const [period, setPeriod] = useState('month')

  const windowDays = PERIODS.find((p) => p.key === period)?.days || 30
  const windowEnd = useMemo(() => new Date(), [])
  const windowStart = useMemo(() => {
    const d = new Date(windowEnd)
    d.setDate(d.getDate() - windowDays)
    return d
  }, [windowEnd, windowDays])

  const earned = earnedInWindow(rentals, windowStart, windowEnd)
  const daysRented = daysRentedInWindow(rentals, windowStart, windowEnd)
  const daysAvailable = fleet.length * windowDays
  const avgPerDay = daysRented > 0 ? earned / daysRented : 0
  const onRent = fleetCount(fleet, 'on_rent')

  const chart = useMemo(() => chartSeries(rentals, 20), [rentals])
  const grossThisPeriod = earned / 0.8
  const km0Fee = grossThisPeriod - earned

  return (
    <>
      <div className="hhead">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="dh2">
            {onRent > 0
              ? `${onRent} of your car${onRent === 1 ? ' is' : 's are'} out right now`
              : loading
                ? 'Loading your fleet…'
                : 'Nothing is out right now'}
          </h1>
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
        <Spinner label="Loading your fleet" />
      ) : fleet.length === 0 ? (
        <EmptyFleet />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="kpi__k">Earned this {period}</div>
              <div className="kpi__v">{money(earned, { cents: false })}</div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Days rented</div>
              <div className="kpi__v">{daysRented}</div>
              <div className="kpi__d">
                <span style={{ color: 'var(--ink-45)' }}>
                  of {daysAvailable} available · {Math.round((daysRented / (daysAvailable || 1)) * 100)}%
                </span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Cars listed</div>
              <div className="kpi__v">{fleet.length}</div>
              <div className="kpi__d">
                <span style={{ color: 'var(--ink-45)' }}>{onRent} on rent right now</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Average per day</div>
              <div className="kpi__v">{money(avgPerDay, { cents: false })}</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.35fr 1fr',
              gap: 18,
              marginBottom: 20,
            }}
          >
            <div className="chart">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="eyebrow" style={{ margin: '0 0 6px' }}>
                    Earnings by day
                  </p>
                  <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                    {money(earned, { cents: false })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--pine-700)' }} />
                    Booked
                  </span>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--bone-300)' }} />
                    Nothing booked
                  </span>
                </div>
              </div>
              <div className="chart__plot">
                {chart.map((bar, i) => (
                  <div className="chart__col" key={i}>
                    <span
                      className={`chart__b${bar.idle ? ' chart__b--idle' : bar.now ? ' chart__b--now' : ''}`}
                      style={{ height: `${bar.height}%`, opacity: bar.faded ? 0.35 : 1 }}
                    />
                  </div>
                ))}
              </div>
              <p className="small" style={{ marginTop: 10 }}>
                Last 20 days, by the date each booking was made.
              </p>
            </div>

            <div>
              <div className="kpi" style={{ marginBottom: 14 }}>
                <div className="kpi__k">Earned this {period}, before payout</div>
                <div className="num" style={{ fontSize: 27, fontWeight: 600, margin: '12px 0 6px' }}>
                  {money(earned, { cents: false })}
                </div>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div className="book__row" style={{ padding: '5px 0' }}>
                  <span>Rental income</span>
                  <b className="num">{money(grossThisPeriod)}</b>
                </div>
                <div className="book__row" style={{ padding: '5px 0' }}>
                  <span>KM0 fee 20%</span>
                  <b className="num">−{money(km0Fee)}</b>
                </div>
              </div>
              <div className="kpi">
                <div className="kpi__k">Needs you</div>
                <NeedsYou fleet={fleet} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export function PeriodSwitch({ value, onChange }) {
  return (
    <div className="period">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`period__b${value === p.key ? ' is-on' : ''}`}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function NeedsYou({ fleet }) {
  const paused = fleet.filter((c) => c.status === 'paused')
  const onRent = fleet.find((c) => c.status === 'on_rent')
  const items = []

  if (paused.length > 0) {
    items.push({
      icon: 'doc',
      color: 'var(--brick)',
      text: `${paused[0].car.model} is paused — switch it back on when it's ready to rent.`,
    })
  }
  if (onRent) {
    const days = Math.max(
      0,
      Math.ceil((new Date(onRent.activeRental.drop_of_data_time) - new Date()) / 86400000),
    )
    items.push({
      icon: 'user',
      color: 'var(--signal-700)',
      text: `${renterName(onRent.activeRental)} has the ${onRent.car.model} — returns in ${days} day${days === 1 ? '' : 's'}.`,
    })
  }
  if (items.length === 0) {
    items.push({ icon: 'check', color: 'var(--verified)', text: 'Nothing needs your attention right now.' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name={item.icon} size="sm" style={{ color: item.color, marginTop: 2, flex: 'none' }} />
          <span style={{ fontSize: 13 }}>{item.text}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyFleet() {
  return (
    <div className="empty">
      <Icon name="key" size="lg" />
      <h3 className="dh3" style={{ margin: '14px 0 8px' }}>
        List your first car
      </h3>
      <p className="small" style={{ marginBottom: 18 }}>
        A car parked most of the day earns while you don't need it. You choose the price, the
        dates and who drives it.
      </p>
      <Link to="/owner/cars/new" className="btn btn--pine">
        Put a car on KM0
      </Link>
    </div>
  )
}
