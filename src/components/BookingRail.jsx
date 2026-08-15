import { formatWhen } from '../lib/dates'
import { km, money } from '../lib/pricing'
import { Odometer } from './primitives'

/**
 * The sticky price rail. Frame 05 shows it under a per-day odometer, frame 06 under the
 * chosen car — same skeleton, so one component renders both via `head`.
 */
export default function BookingRail({ head, when, quote, footer, children }) {
  return (
    <aside className="book">
      {head}

      {when && (
        <div className="book__when">
          <div className="book__leg">
            <span className="book__dot" />
            <div>
              <div className="book__legT">{formatWhen(when.pickUpAt)}</div>
              <div className="small">{when.station}</div>
            </div>
          </div>
          <div className="book__leg book__leg--end">
            <span className="book__dot book__dot--end" />
            <div>
              <div className="book__legT">{formatWhen(when.dropOffAt)}</div>
              <div className="small">
                {when.dropStation === when.station ? 'Same station' : when.dropStation} ·{' '}
                {quote.days} day{quote.days === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          {when.action}
        </div>
      )}

      <div className="book__lines">
        <div className="book__row">
          <span>
            {quote.days} day{quote.days === 1 ? '' : 's'} × {money(quote.perDay, { cents: false })}
          </span>
          <b className="num">{money(quote.base)}</b>
        </div>

        {quote.cover && (
          <div className={`book__row${quote.coverTotal ? '' : ' book__row--muted'}`}>
            <span>{quote.cover.title} cover</span>
            <b className="num">{quote.coverTotal ? money(quote.coverTotal) : 'Included'}</b>
          </div>
        )}

        <div className="book__row book__row--muted">
          <span>Kilometre allowance</span>
          <b className="num">{km(quote.kmAllowance)}</b>
        </div>

        {quote.extraLines.map((line) => (
          <div className="book__row" key={line.id}>
            <span>
              {line.name}
              {line.countable && line.count > 1 ? ` × ${line.count}` : ''}
            </span>
            <b className="num">{money(line.total)}</b>
          </div>
        ))}

        <div className="book__row">
          <span>Local tax 9%</span>
          <b className="num">{money(quote.tax)}</b>
        </div>
      </div>

      <div className="book__tot">
        <div>
          <div className="eyebrow">Total</div>
          <div className="small" style={{ marginTop: 3 }}>
            Pay at the counter
          </div>
        </div>
        <div className="book__totV">{money(quote.total)}</div>
      </div>

      <div className="book__cta">{footer}</div>
      {children}
    </aside>
  )
}

/** Frame 05's rail head: the per-day rate on the odometer. */
export function RateHead({ perDay, note }) {
  return (
    <div className="book__top">
      <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 10px' }}>
        Your price
      </p>
      <Odometer
        value={perDay != null ? String(Math.round(perDay)) : '0'}
        pad={3}
        unit="USD / DAY"
      />
      {note && <p className="book__note">{note}</p>}
    </div>
  )
}
