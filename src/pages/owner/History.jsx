import { useMemo, useState } from 'react'
import { Alert, Button, Spinner, Tag } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { formatDateRange, historyRows } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

/** Frame 16 — one row per completed rental, odometer at both ends. */
export default function History() {
  const { user } = useAuth()
  const { fleet, loading, error } = useOwner()
  const [period, setPeriod] = useState('week')

  const rows = useMemo(() => historyRows(fleet, user?.id || 'host', 8), [fleet, user?.id])

  const totalKm = rows.reduce((sum, r) => sum + r.km, 0)
  const totalEarned = rows.reduce((sum, r) => sum + r.earned, 0)
  const avgDays = rows.length ? (rows.reduce((sum, r) => sum + (r.end - r.start) / 86400000, 0) / rows.length).toFixed(1) : 0
  const late = rows.filter((r) => r.late).length

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
          <Button size="sm">Export CSV</Button>
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
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="kpi">
              <div className="kpi__k">Rentals shown</div>
              <div className="kpi__v">{rows.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Kilometres</div>
              <div className="kpi__v">{totalKm.toLocaleString('en-US')}</div>
              <div className="kpi__d">
                <span style={{ color: 'var(--ink-45)' }}>{Math.round(totalKm / rows.length)} km average trip</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Average rental</div>
              <div className="kpi__v">{avgDays}d</div>
            </div>
            <div className="kpi">
              <div className="kpi__k">Returned late</div>
              <div className="kpi__v">{late}</div>
              <div className="kpi__d">
                <span style={{ color: 'var(--ink-45)' }}>of {rows.length} rentals</span>
              </div>
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
                  <th>Odometer</th>
                  <th>Distance</th>
                  <th>Rating</th>
                  <th>You earned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{r.id}</td>
                    <td>
                      <b>{carTitle(r.car.car)}</b>
                      <br />
                      <span className="small num">{r.car.plate}</span>
                    </td>
                    <td>{r.renter}</td>
                    <td className="num">{formatDateRange(r.start, r.end)}</td>
                    <td className="num">
                      {r.odoStart.toLocaleString('en-US')} → {r.odoEnd.toLocaleString('en-US')}
                    </td>
                    <td className="num">{r.km.toLocaleString('en-US')} km</td>
                    <td>
                      {r.late ? (
                        <Tag tone="brick">Returned late</Tag>
                      ) : (
                        <span className="num">{r.rating} ★</span>
                      )}
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
            {money(totalEarned)} paid out across {rows.length} rentals shown here.
          </p>
        </>
      )}
    </>
  )
}
