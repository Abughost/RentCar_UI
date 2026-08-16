import { useEffect, useRef, useState } from 'react'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * A small month-grid popover for picking one date. Used where a day count alone stops being
 * a sensible control — past the last priced bracket, the customer is choosing a return date,
 * not nudging a number.
 *
 * Closes itself on an outside click or Escape; `onSelect` is the only way a date leaves it.
 */
export default function MiniCalendar({ value, min, onSelect, onClose }) {
  const [view, setView] = useState(() => startOfMonth(value || min || new Date()))
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) onClose()
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const first = startOfMonth(view)
  // getDay() is 0=Sunday..6=Saturday; shifting so Monday lands at 0 matches the WEEKDAYS row.
  const leadingBlanks = (first.getDay() + 6) % 7
  const total = daysInMonth(view)
  const floor = min ? atMidnight(min) : null

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d))

  return (
    <div className="minical" role="dialog" aria-label="Choose a return date" ref={rootRef}>
      <div className="minical__head">
        <button
          type="button"
          className="minical__nav"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="minical__title">
          {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          className="minical__nav"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="minical__grid minical__grid--head" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="minical__grid">
        {cells.map((date, i) =>
          date ? (
            <button
              key={date.toISOString()}
              type="button"
              className={`minical__day${sameDay(date, value) ? ' is-on' : ''}`}
              disabled={floor ? date < floor : false}
              onClick={() => onSelect(date)}
            >
              {date.getDate()}
            </button>
          ) : (
            // eslint-disable-next-line react/no-array-index-key -- leading blanks have no date to key on
            <span key={`b${i}`} />
          ),
        )}
      </div>
    </div>
  )
}
