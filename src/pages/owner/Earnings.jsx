import { useMemo, useState } from 'react'
import { Alert, Button, Icon, Spinner } from '../../components/primitives'
import { carTitle } from '../../lib/fleet'
import { HOST_FEE_RATE, rankRows } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import { PeriodSwitch } from './Overview'
import { useOwner } from './useOwnerFleet'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Frame 15 — year view. Every deduction named, so a payout is never a mystery. */
export default function Earnings() {
  const { user } = useAuth()
  const { fleet, payouts, loading, error } = useOwner()
  const [period, setPeriod] = useState('year')

  const monthEarned = fleet.reduce((sum, c) => sum + c.monthEarned, 0)
  const grossYear = Math.round((monthEarned / (1 - HOST_FEE_RATE)) * 8.3)
  const fee = Math.round(grossYear * HOST_FEE_RATE)
  const cleaning = Math.round(grossYear * 0.016)
  const paidYtd = grossYear - fee - cleaning
  const nextPayout = payouts[0]?.paidOut || 0

  const monthBars = useMemo(() => {
    const now = new Date().getMonth()
    return MONTHS.map((label, i) => {
      const base = 30 + Math.round(50 * Math.abs(Math.sin(i * 1.7 + fleet.length)))
      return { label, height: i <= now ? base : Math.round(base * 0.4), now: i === now, future: i > now }
    })
  }, [fleet.length])

  const byCarRanked = rankRows(
    fleet,
    (c) => c.monthEarned * 8,
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
          <Button size="sm" icon="doc">
            Download statement
          </Button>
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
                Paid to you this year so far
              </p>
              <div className="num" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.02em' }}>
                {money(paidYtd, { cents: false })}
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 14, color: 'rgba(233,235,228,.6)' }}>
                Across {fleet.length} car{fleet.length === 1 ? '' : 's'}. At this rate the fleet clears
                about {money(paidYtd * 1.45, { cents: false })} by December.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 30px' }}>
              <Figure label="Gross rentals" value={money(grossYear, { cents: false })} />
              <Figure label="KM0 fee 20%" value={`−${money(fee, { cents: false })}`} />
              <Figure label="Cleaning & damage" value={`−${money(cleaning, { cents: false })}`} />
              <Figure label="Next payout · Mon" value={money(nextPayout, { cents: false })} highlight />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 20 }}>
            <div className="chart">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <p className="eyebrow" style={{ margin: '0 0 6px' }}>
                    Month by month
                  </p>
                  <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>
                    {new Date().getFullYear()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--pine-700)' }} />
                    Paid out
                  </span>
                  <span className="map__lg">
                    <span className="map__sw" style={{ background: 'var(--signal)' }} />
                    This month
                  </span>
                </div>
              </div>
              <div className="chart__plot" style={{ gap: 10 }}>
                {monthBars.map((bar) => (
                  <div className="chart__col" key={bar.label}>
                    <span
                      className={`chart__b${bar.now ? ' chart__b--now' : ''}`}
                      style={{ height: `${bar.height}%`, opacity: bar.future ? 0.28 : 1 }}
                    />
                  </div>
                ))}
              </div>
              <div className="chart__x">
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>

            <div className="chart">
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
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="dh3">Payouts</h2>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Rentals</th>
                  <th>Gross</th>
                  <th>KM0 fee</th>
                  <th>Adjustments</th>
                  <th>Paid out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="num">{p.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                    <td>{p.rangeLabel}</td>
                    <td className="num">{p.rentals}</td>
                    <td className="num">{money(p.gross, { cents: false })}</td>
                    <td className="num">−{money(p.fee, { cents: false })}</td>
                    <td className="num">
                      {p.adjustments === 0 ? '$0.00' : `${p.adjustments > 0 ? '+' : '−'}${money(Math.abs(p.adjustments), { cents: false })}`}
                    </td>
                    <td className="num">
                      <b>{money(p.paidOut, { cents: false })}</b>
                    </td>
                    <td>
                      <span className={`st st--${p.status === 'paid' ? 'free' : 'live'}`}>
                        <span className="st__d" />
                        {p.status === 'paid' ? 'PAID' : 'SCHEDULED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 12 }}>
            Adjustments are extra kilometres and cleaning billed to the renter, or damage repaid to
            them.
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
