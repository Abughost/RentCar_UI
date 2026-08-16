import { useMemo, useState } from 'react'
import { Alert, Button, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { formatDateRange, historyRows } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

/** Frame 16 — one row per completed rental, from real bookings on the host's own cars. */
export default function History() {
  const { fleet, rentals, loading, error } = useOwner()
  const [period, setPeriod] = useState('week')

  const carById = useMemo(() => new Map(fleet.map((c) => [c.id, c.car])), [fleet])
  const rows = useMemo(() => historyRows(rentals), [rentals])

  const totalEarned = rows.reduce((sum, r) => sum + r.earned, 0)
  const avgDays = rows.length ? (rows.reduce((sum, r) => sum + r.days, 0) / rows.length).toFixed(1) : 0

  return (
    <>
      <div className="hhead">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            Hosting
          </p>
          <h1 className="dh2">History</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PeriodSwitch value={period} onChange={setPeriod} />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18 }}>
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading history" />
      ) : rows.length === 0 ? (
        <p className="small">Nothing rented yet — completed trips will land here.</p>
      ) : (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="kpi">
              <div className="kpi__k">Completed rentals</div>
              <div className="kpi__v">{rows.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Average rental</div>
              <div className="kpi__v">{avgDays}d</div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Total earned</div>
              <div className="kpi__v">{money(totalEarned, { cents: false })}</div>
            </div>
          </div>

          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Rental</th>
                  <th>Car</th>
                  <th>Renter</th>
                  <th>Dates</th>
                  <th>Length</th>
                  <th>You earned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{r.id}</td>
                    <td>
                      <b>{carById.has(r.rental.car) ? carTitle(carById.get(r.rental.car)) : '—'}</b>
                    </td>
                    <td>{r.renter}</td>
                    <td className="num">{formatDateRange(r.start, r.end)}</td>
                    <td className="num">
                      {r.days} day{r.days === 1 ? '' : 's'}
                    </td>
                    <td className="num">
                      <b>{money(r.earned)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 12 }}>
            {money(totalEarned)} earned across {rows.length} rentals shown here.
          </p>
        </>
      )}
    </>
  )
}
