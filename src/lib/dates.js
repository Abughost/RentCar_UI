/**
 * Dates. The Rental model stores pick_up_data_time / drop_of_data_time as DateTimeFields,
 * and USE_TZ is on, so everything crossing the wire is ISO-8601 with an offset.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Days billed for a rental. Any started day counts, and a booking is never zero days. */
export function daysBetween(from, to) {
  const a = toDate(from)
  const b = toDate(to)
  if (!a || !b) return 0
  const diff = b.getTime() - a.getTime()
  if (diff <= 0) return 0
  return Math.max(1, Math.ceil(diff / DAY_MS))
}

/** "Fri 21 Aug" */
export function formatDay(value) {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}

/** "09:30" */
export function formatTime(value) {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** "Fri 21 Aug · 09:30" */
export function formatWhen(value) {
  const d = toDate(value)
  if (!d) return '—'
  return `${formatDay(d)} · ${formatTime(d)}`
}

/** "12–16 Jun", collapsing the month when both ends share it. */
export function formatRange(from, to) {
  const a = toDate(from)
  const b = toDate(to)
  if (!a || !b) return '—'
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const left = a.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const right = b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${left}–${right}`
}

/* ------------------------------------------------------------------ inputs */

/** Split an ISO instant into the two halves an <input type=date|time> pair wants. */
export function splitLocal(value) {
  const d = toDate(value)
  if (!d) return { date: '', time: '' }
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Recombine a date and a time input into an ISO instant for the API. */
export function joinLocal(date, time) {
  if (!date) return null
  const d = new Date(`${date}T${time || '09:00'}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function addDays(value, days) {
  const d = toDate(value) || new Date()
  return new Date(d.getTime() + days * DAY_MS)
}

/** Default pick-up: tomorrow at 09:30. Nobody books a car for five minutes from now. */
export function defaultPickUp() {
  const d = addDays(new Date(), 1)
  d.setHours(9, 30, 0, 0)
  return d
}

export function defaultDropOff() {
  const d = addDays(defaultPickUp(), 4)
  d.setHours(18, 0, 0, 0)
  return d
}

/* ------------------------------------------------------------------ live trip */

/** How far through a running rental we are, plus the time left, for the account page. */
export function tripProgress(from, to, now = new Date()) {
  const a = toDate(from)
  const b = toDate(to)
  if (!a || !b) return { percent: 0, remaining: '—', running: false, upcoming: false }

  const total = b.getTime() - a.getTime()
  const elapsed = now.getTime() - a.getTime()
  const running = now >= a && now <= b
  const upcoming = now < a

  const percent = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0
  const leftMs = Math.max(0, b.getTime() - now.getTime())
  const days = Math.floor(leftMs / DAY_MS)
  const hours = Math.floor((leftMs % DAY_MS) / (60 * 60 * 1000))

  return {
    percent,
    running,
    upcoming,
    finished: now > b,
    remaining: days > 0 ? `${days} day${days === 1 ? '' : 's'} ${hours} h left` : `${hours} h left`,
  }
}
