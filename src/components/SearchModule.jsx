import { useNavigate } from 'react-router-dom'
import { joinLocal, splitLocal } from '../lib/dates'
import { STATIONS } from '../lib/fleet'
import { useBooking } from '../state/BookingContext'
import { Button, Icon } from './primitives'

const TABS = [
  { id: 'daily', label: 'By the day' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'delivery', label: 'Delivered to me' },
]

/**
 * The search card that overlaps the hero. Every field writes straight into the booking
 * draft, so the results page and the rail already know the answer before they mount.
 */
export default function SearchModule({ resultCount }) {
  const { draft, update, days } = useBooking()
  const navigate = useNavigate()

  const pick = splitLocal(draft.pickUpAt)
  const drop = splitLocal(draft.dropOffAt)

  function setPickUp(date, time) {
    const iso = joinLocal(date, time)
    if (!iso) return
    // Keep the return after the pick-up; sliding one past the other silently produces a
    // zero-day rental the backend would happily store.
    const patch = { pickUpAt: iso }
    if (new Date(iso) >= new Date(draft.dropOffAt)) {
      const next = new Date(iso)
      next.setDate(next.getDate() + 1)
      patch.dropOffAt = next.toISOString()
    }
    update(patch)
  }

  function setDropOff(date, time) {
    const iso = joinLocal(date, time)
    if (!iso) return
    if (new Date(iso) <= new Date(draft.pickUpAt)) return
    update({ dropOffAt: iso })
  }

  return (
    <div className="search">
      <div className="search__tabs" role="tablist" aria-label="Rental type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={draft.mode === tab.id}
            className={`search__tab${draft.mode === tab.id ? ' is-on' : ''}`}
            onClick={() => update({ mode: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="search__body">
        <div className="search__cell">
          <div className="search__k" id="k-station">
            Pick-up &amp; return
          </div>
          <div className="search__v">
            <Icon name="pin" style={{ color: 'var(--pine-700)' }} />
            <select
              aria-labelledby="k-station"
              value={draft.station}
              onChange={(e) => update({ station: e.target.value, dropStation: e.target.value })}
            >
              {STATIONS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="search__sub">Return to the same station</div>
        </div>

        <div className="search__cell">
          <div className="search__k" id="k-from">
            From
          </div>
          <div className="search__v">
            <Icon name="cal" style={{ color: 'var(--pine-700)' }} />
            <input
              aria-labelledby="k-from"
              type="date"
              className="num"
              value={pick.date}
              onChange={(e) => setPickUp(e.target.value, pick.time)}
            />
          </div>
          <div className="search__sub">
            <input
              aria-label="Pick-up time"
              type="time"
              value={pick.time}
              onChange={(e) => setPickUp(pick.date, e.target.value)}
            />
          </div>
        </div>

        <div className="search__cell">
          <div className="search__k" id="k-until">
            Until
          </div>
          <div className="search__v">
            <Icon name="cal" style={{ color: 'var(--pine-700)' }} />
            <input
              aria-labelledby="k-until"
              type="date"
              className="num"
              min={pick.date}
              value={drop.date}
              onChange={(e) => setDropOff(e.target.value, drop.time)}
            />
          </div>
          <div className="search__sub">
            <input
              aria-label="Return time"
              type="time"
              value={drop.time}
              onChange={(e) => setDropOff(drop.date, e.target.value)}
            />
            <span style={{ fontFamily: 'var(--body)' }}>
              {' '}
              · {days} day{days === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="search__cell">
          <div className="search__k" id="k-age">
            Driver age
          </div>
          <div className="search__v">
            <Icon name="user" style={{ color: 'var(--pine-700)' }} />
            <select
              aria-labelledby="k-age"
              value={draft.driverAge}
              onChange={(e) => update({ driverAge: e.target.value })}
            >
              <option value="21-24">21–24</option>
              <option value="25-29">25–29</option>
              <option value="30+">30+</option>
            </select>
          </div>
          <div className="search__sub">
            {draft.driverAge === '30+' ? 'No young-driver fee' : 'Young-driver fee applies'}
          </div>
        </div>

        <div className="search__go">
          <Button variant="signal" size="lg" icon="search" onClick={() => navigate('/cars')}>
            {resultCount != null ? `Search ${resultCount} cars` : 'Search cars'}
          </Button>
        </div>
      </div>
    </div>
  )
}
