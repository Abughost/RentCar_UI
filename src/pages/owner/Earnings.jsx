import { useMemo, useState } from 'react'
import { Alert, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { earnedInWindow, HOST_FEE_RATE, rankRows } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

/** Frame 15 — every figure is a real sum over `Rental.total_price`. Payouts are always
 * "pending": nothing in this app talks to a bank, so nothing here claims to have been paid. */
export default function Earnings() {
  const { fleet, rentals, payouts, loading, error } = useOwner()
  const [period, setPeriod] = useState('year')

  const yearStart = useMemo(() => {
    const d = new Date()
    d.setMonth(0, 1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const now = useMemo(() => new Date(), [])

  const earnedYtd = earnedInWindow(rentals, yearStart, now)
  const grossYtd = earnedYtd / (1 - HOST_FEE_RATE)
  const feeYtd = grossYtd - earnedYtd

  const byCarRanked = rankRows(
    fleet,
    (c) => c.rentals.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + r.total_price * 0.8, 0),
    (c) => c,
  )

  return (
    <>
      <div className="hhead">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            Hosting
          </p>
          <h1 className="dh2">Earnings</h1>
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
        <Spinner label="Loading earnings" />
      ) : (
        <>
          <div
            style={{
              background: 'var(--pine-900)',
              color: 'var(--on-pine)',
              borderRadius: 'var(--r-l)',
              padding: '28px 32px',
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              alignItems: 'center',
            }}
          >
            <div>
              <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 14px' }}>
                Earned this year so far
              </p>
              <div className="num" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.02em' }}>
                {money(earnedYtd, { cents: false })}
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 14, color: 'rgba(233,235,228,.6)' }}>
                Across {fleet.length} car{fleet.length === 1 ? '' : 's'}. Payouts below are estimates
                — nothing has been transferred yet.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 30px' }}>
              <Figure label="Gross rentals" value={money(grossYtd, { cents: false })} />
              <Figure label="KM0 fee 20%" value={`−${money(feeYtd, { cents: false })}`} />
              <Figure label="Est. next payout" value={money(payouts[0]?.paidOut || 0, { cents: false })} highlight />
            </div>
          </div>

          <div className="chart" style={{ marginBottom: 20 }}>
            <p className="eyebrow" style={{ margin: '0 0 18px' }}>
              Which car earns what
            </p>
            {fleet.length === 0 ? (
              <p className="small">List a car to see it ranked here.</p>
            ) : (
              <div className="rank">
                {byCarRanked.map((row) => (
                  <div className="rank__r" key={row.car.id}>
                    <span className="rank__n">{String(row.rank).padStart(2, '0')}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        {carTitle(row.car.car)}{' '}
                        <span className="small" style={{ fontWeight: 400 }}>
                          · {row.car.plate}
                        </span>
                      </div>
                      <div className="rank__b">
                        <span className={`rank__f${row.rank === 1 ? ' rank__f--top' : ''}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                    <span className="rank__v">{money(row.value, { cents: false })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="dh3">Estimated payouts</h2>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Rentals</th>
                  <th>Gross</th>
                  <th>KM0 fee</th>
                  <th>Est. payout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.rangeLabel}</td>
                    <td className="num">{p.rentals}</td>
                    <td className="num">{money(p.gross, { cents: false })}</td>
                    <td className="num">−{money(p.fee, { cents: false })}</td>
                    <td className="num">
                      <b>{money(p.paidOut, { cents: false })}</b>
                    </td>
                    <td>
                      <span className="st st--due">
                        <span className="st__d" />
                        PENDING
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 12 }}>
            KM0 doesn't settle payouts automatically yet — every row here is a real total,
            waiting to be paid out.
          </p>
        </>
      )}
    </>
  )
}

function Figure({ label, value, highlight }) {
  return (
    <div>
      <div className="kpi__k" style={{ color: 'rgba(233,235,228,.45)' }}>
        {label}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, marginTop: 6, color: highlight ? 'var(--signal)' : undefined }}>
        {value}
      </div>
    </div>
  )
}
