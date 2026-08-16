import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cars as carsApi } from '../../api/endpoints'
import { Alert, Button, Icon, Plate, Spinner } from '../../components/primitives'
import { formatRange } from '../../lib/dates'
import { carTitle } from '../../lib/fleet'
import { chartSeries, earnedInWindow, renterName, STATUS_LABEL, STATUS_TONE } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

/** Frame 14, redone: no GPS feed exists, so this shows what actually is on record for the
 * car — its bookings, past and upcoming, and what it has earned — rather than a live map. */
export default function CarLive() {
  const { id } = useParams()
  const { fleet, loading, error, refresh } = useOwner()
  const [period, setPeriod] = useState('month')
  const [toggling, setToggling] = useState(false)

  const c = fleet.find((car) => car.id === id)
  const chart = useMemo(() => (c ? chartSeries(c.rentals, 15) : []), [c])

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

  const now = new Date()
  const upcoming = c.rentals
    .filter((r) => r.status !== 'cancelled' && new Date(r.drop_of_data_time) >= now)
    .sort((a, b) => new Date(a.pick_up_data_time) - new Date(b.pick_up_data_time))
  const past = c.rentals
    .filter((r) => r.status !== 'cancelled' && new Date(r.drop_of_data_time) < now)
    .sort((a, b) => new Date(b.drop_of_data_time) - new Date(a.drop_of_data_time))
    .slice(0, 8)

  const earned30d = earnedInWindow(c.rentals, new Date(now - 30 * 86400000), now)

  async function togglePause() {
    setToggling(true)
    try {
      const form = new FormData()
      form.set('is_available', c.status === 'paused' ? 'true' : 'false')
      await carsApi.update(c.id, form)
      refresh()
    } finally {
      setToggling(false)
    }
  }

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
              {c.status === 'on_rent' && ` · ${renterName(c.activeRental).toUpperCase()}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodSwitch value={period} onChange={setPeriod} />
          <Button size="sm" onClick={togglePause} disabled={toggling}>
            {toggling ? 'Saving…' : c.status === 'paused' ? 'Put back online' : 'Pause listing'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 18, marginBottom: 20 }}>
        <div className="chart">
          <p className="eyebrow" style={{ margin: '0 0 4px' }}>
            Upcoming bookings
          </p>
          <p className="small" style={{ marginBottom: 16 }}>
            {upcoming.length === 0 ? 'Nothing booked yet.' : `${upcoming.length} booking${upcoming.length === 1 ? '' : 's'} ahead.`}
          </p>
          {upcoming.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((r) => (
                <div key={r.id} className="book__row" style={{ padding: '8px 0', borderBottom: '1px solid var(--bone-200)' }}>
                  <span>
                    {renterName(r)} · {formatRange(r.pick_up_data_time, r.drop_of_data_time)}
                  </span>
                  <b className="num">{money(r.total_price, { cents: false })}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="kpi" style={{ marginBottom: 14 }}>
            <div className="kpi__k">Earned, last 30 days</div>
            <div className="num" style={{ fontSize: 27, fontWeight: 600, margin: '12px 0 10px' }}>
              {money(earned30d, { cents: false })}
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>Daily rate</span>
              <b className="num">{money(c.perDay, { cents: false })}</b>
            </div>
            <div className="book__row" style={{ padding: '5px 0' }}>
              <span>Rating</span>
              <b className="num">{c.rating != null ? `${c.rating} ★` : 'No ratings yet'}</b>
            </div>
          </div>
          {c.status === 'on_rent' && (
            <div className="kpi">
              <div className="kpi__k">Right now</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14, fontSize: 13, color: 'var(--ink-70)' }}>
                <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <Icon name="user" size="sm" style={{ color: 'var(--pine-700)' }} />
                  With {renterName(c.activeRental)}
                </span>
                <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <Icon name="clock" size="sm" style={{ color: 'var(--pine-700)' }} />
                  Returns {formatRange(c.activeRental.pick_up_data_time, c.activeRental.drop_of_data_time).split('–')[1]}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>
              Earned by this car
            </p>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
              {money(chart.reduce((sum, b) => sum + b.value, 0), { cents: false })}
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
        <p className="small" style={{ marginTop: 10 }}>
          Last 15 days, by the date each booking was made.
        </p>
      </div>

      {past.length > 0 && (
        <div className="tblwrap" style={{ marginTop: 20 }}>
          <p className="eyebrow" style={{ margin: '0 0 12px' }}>
            Past bookings
          </p>
          <table className="tbl">
            <thead>
              <tr>
                <th>Renter</th>
                <th>Dates</th>
                <th>You earned</th>
              </tr>
            </thead>
            <tbody>
              {past.map((r) => (
                <tr key={r.id}>
                  <td>{renterName(r)}</td>
                  <td className="num">{formatRange(r.pick_up_data_time, r.drop_of_data_time)}</td>
                  <td className="num">
                    <b>{money(r.total_price * 0.8, { cents: false })}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
