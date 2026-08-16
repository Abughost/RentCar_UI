import { formatWhen } from '../lib/dates'
import { km, money } from '../lib/pricing'
import { Odometer } from './primitives'

/**
 * The sticky price rail. Frame 05 shows it under a per-day odometer, frame 06 under the
 * chosen car — same skeleton, so one component renders both via `head`.
 */
export default function BookingRail({ head, when, quote, footer, children }) {
  // Whole units, like the per-day drum — the odometer metaphor doesn't carry cents.
  const totalValue = String(Math.round(quote.total))

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
          <div className="eyebrow eyebrow--onDark">Total</div>
          <div className="small book__note" style={{ marginTop: 3 }}>
            Pay at the counter
          </div>
        </div>
        {/* `roll` only fires for this instance's first paint (see Odometer in primitives.jsx)
            — after that, a day-count change or a swapped cover just ticks the digits over
            like a real counter, not a fresh spin-down every time. A genuine reveal (landing
            on a different car) comes from BookingRail itself being remounted, keyed by the
            car in CarDetail.jsx — not from anything in here. */}
        <Odometer value={totalValue} pad={4} unit="USD" roll />
      </div>

      <div className="book__cta">{footer}</div>
      {children}
    </aside>
  )
}

/**
 * Frame 05's rail head: the per-day rate on the odometer.
 *
 * `roll` reuses the hero's drum reveal — same mechanism as the "000000" on the home page —
 * but here the rest state is the car's real per-day rate, never zero, and it only plays for
 * this instance's first paint (see Odometer in primitives.jsx). A day-count change re-prices
 * the rate and the digits just tick over to match — the reveal itself belongs to landing on
 * the car, and CarDetail.jsx is what replays it by keying <BookingRail> on the car's id.
 */
export function RateHead({ perDay, note }) {
  const value = perDay != null ? String(Math.round(perDay)) : '0'
  return (
    <div className="book__top">
      <p className="eyebrow eyebrow--onDark" style={{ margin: '0 0 10px' }}>
        Your price
      </p>
      <Odometer value={value} pad={3} unit="USD / DAY" roll />
      {note && <p className="book__note">{note}</p>}
    </div>
  )
}
