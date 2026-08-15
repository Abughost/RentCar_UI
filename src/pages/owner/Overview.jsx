import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Icon, Spinner } from '../../components/primitives'
import { chartSeries, fleetCount, PERIODS, scaleToPeriod } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import CityMap from './CityMap'
import { useOwner } from './useOwnerFleet'

/** Frame 12 — money and location, in that order. */
export default function Overview() {
  const { user } = useAuth()
  const { fleet, loading, error } = useOwner()
  const [period, setPeriod] = useState('month')

  const monthEarned = fleet.reduce((sum, c) => sum + c.monthEarned, 0)
  const daysRented = fleet.reduce((sum, c) => sum + c.daysRented, 0)
  const daysAvailable = fleet.reduce((sum, c) => sum + c.daysAvailable, 0)
  const kmDriven = fleet.reduce((sum, c) => sum + c.kmDriven, 0)
  const avgPerDay = daysRented > 0 ? monthEarned / daysRented : 0
  const onRent = fleetCount(fleet, 'on_rent')

  const chart = useMemo(() => chartSeries(user?.id || 'host', 20), [user?.id])
  const grossThisMonth = monthEarned / 0.8
  const km0Fee = grossThisMonth - monthEarned

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
              <div className="kpi__v">{money(scaleToPeriod(monthEarned, period), { cents: false })}</div>
              <div className="kpi__d">
                <span className="up">↑ 18%</span>
                <span style={{ color: 'var(--ink-45)' }}>vs last {period}</span>
              </div>
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
              <div className="kpi__k">Kilometres driven</div>
              <div className="kpi__v">{kmDriven.toLocaleString('en-US')}</div>
              <div className="kpi__d">
                <span className="down">↑ 6%</span>
                <span style={{ color: 'var(--ink-45)' }}>more wear than usual</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Average per day</div>
              <div className="kpi__v">{money(avgPerDay, { cents: false })}</div>
              <div className="kpi__d">
                <span className="up">↑ $4.10</span>
                <span style={{ color: 'var(--ink-45)' }}>vs last {period}</span>
              </div>
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
                    {money(monthEarned, { cents: false })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--pine-700)' }} />
                    Rented
                  </span>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--bone-300)' }} />
                    Idle
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
              <div className="chart__x">
                <span>1</span>
                <span>7</span>
                <span>TODAY</span>
                <span>21</span>
                <span>31</span>
              </div>
              <p className="small" style={{ marginTop: 10 }}>
                Faded bars are days already booked but not yet paid out.
              </p>
            </div>

            <div>
              <div className="kpi" style={{ marginBottom: 14 }}>
                <div className="kpi__k">Paid to you this {period}</div>
                <div className="num" style={{ fontSize: 27, fontWeight: 600, margin: '12px 0 6px' }}>
                  {money(scaleToPeriod(monthEarned, period), { cents: false })}
                </div>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div className="book__row" style={{ padding: '5px 0' }}>
                  <span>Rental income</span>
                  <b className="num">{money(grossThisMonth)}</b>
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

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h2 className="dh3">Where your cars are</h2>
            <span className="small">Location is visible to you while a car is on rent, and to nobody else.</span>
          </div>
          <CityMap fleet={fleet} />
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
  const items = []

  if (paused.length > 0) {
    items.push({
      icon: 'doc',
      color: 'var(--brick)',
      text: `${paused[0].car.model} is paused — insurance needs a fresh upload.`,
    })
  }
  const onRent = fleet.find((c) => c.status === 'on_rent')
  if (onRent) {
    items.push({
      icon: 'user',
      color: 'var(--signal-700)',
      text: `${onRent.renter} has the ${onRent.car.model} — returns in ${onRent.returnsIn} day${onRent.returnsIn === 1 ? '' : 's'}.`,
    })
  }
  items.push({ icon: 'star', color: 'var(--ink-45)', text: 'Renters are waiting on a review from you.' })

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
