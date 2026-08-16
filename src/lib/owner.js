/**
 * Owner ("hosting") dashboard — derived data.
 *
 * Every number here now comes from a real `Car` (fetched with `?mine=true`, so it is
 * genuinely the host's own) and a real `Rental` (from `GET /host/rentals`, scoped server-side
 * to `car.author === request.user`). Nothing is seeded from a car's id or picked from a
 * hard-coded list — see git history on this file for what that looked like.
 *
 * Two things stay out of scope on purpose, per an explicit product decision: live GPS
 * (location, speed, fuel level, "parked N hours ago") and confirmed bank payouts. Neither has
 * a real source — no tracker feeds this app and no payment gateway settles a payout — and
 * inventing plausible numbers for either is exactly the failure mode this rewrite exists to
 * remove. Payout rows below are therefore always "pending": a real total, an honest status.
 */

import { daysBetween } from './dates'
import { bodyShape, bookingRef, plateFor } from './fleet'
import { dailyRate } from './pricing'

/** KM0's cut of every rental. Mirrors the design's "KM0 fee 20%" line. */
export const HOST_FEE_RATE = 0.2

const DAY_MS = 24 * 60 * 60 * 1000

export const STATUS_LABEL = {
  on_rent: 'On rent',
  free: 'Free',
  paused: 'Paused',
}

export const STATUS_TONE = {
  on_rent: 'live',
  free: 'free',
  paused: 'due',
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isLive(rental, now) {
  return (
    rental.status !== 'cancelled' &&
    new Date(rental.pick_up_data_time) <= now &&
    now <= new Date(rental.drop_of_data_time)
  )
}

/** Renter's display name, from the real booking — never a name picked off a fake roster. */
export function renterName(rental) {
  const name = [rental?.renter?.first_name, rental?.renter?.last_name].filter(Boolean).join(' ').trim()
  return name || 'Guest'
}

/* ------------------------------------------------------------------ fleet */

/**
 * Wrap one real `Car` (from `cars.list({ mine: true })`) with the bookings made on it and the
 * status that follows from them: paused mirrors `is_available`, on_rent means a real booking
 * covers this instant, free is everything else.
 */
export function hostCar(car, carRentals = []) {
  const now = new Date()
  const active = carRentals.find((r) => isLive(r, now))
  const status = !car.is_available ? 'paused' : active ? 'on_rent' : 'free'

  return {
    car,
    id: car.id,
    plate: plateFor(car.id),
    shape: bodyShape(car),
    perDay: dailyRate(car),
    rating: car.rating ?? null,
    status,
    activeRental: active || null,
    rentals: carRentals,
  }
}

/** `cars.list({ mine: true })` results wrapped with the real rentals made on each one. */
export function buildFleet(cars, rentals) {
  const byCar = new Map()
  rentals.forEach((r) => {
    const list = byCar.get(r.car) || []
    list.push(r)
    byCar.set(r.car, list)
  })
  return cars.map((car) => hostCar(car, byCar.get(car.id) || []))
}

export function fleetCount(fleet, status) {
  if (!status) return fleet.length
  return fleet.filter((c) => c.status === status).length
}

/* ------------------------------------------------------------------ period */

export const PERIODS = [
  { key: 'day', label: 'Day', days: 1 },
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'year', label: 'Year', days: 365 },
]

/** Days a car (or a fleet's worth of rentals) was actually booked inside a window. */
export function daysRentedInWindow(rentals, windowStart, windowEnd) {
  return rentals.reduce((sum, r) => {
    if (r.status === 'cancelled') return sum
    const start = new Date(r.pick_up_data_time)
    const end = new Date(r.drop_of_data_time)
    const overlapStart = start > windowStart ? start : windowStart
    const overlapEnd = end < windowEnd ? end : windowEnd
    const ms = overlapEnd - overlapStart
    return sum + (ms > 0 ? Math.ceil(ms / DAY_MS) : 0)
  }, 0)
}

/** What the host keeps (after KM0's fee) for bookings *made* inside a window.
 *
 * Recognised on `created_at` — the day the booking happened, not the day the trip starts —
 * which is what makes a same-length "earnings by day" bar chart possible from real rows
 * without a separate ledger table, and is why a car booked today for a trip next month still
 * shows up in today's bar rather than vanishing off the edge of every chart until then.
 */
export function earnedInWindow(rentals, windowStart, windowEnd) {
  return rentals
    .filter((r) => r.status !== 'cancelled')
    .filter((r) => {
      const bookedOn = new Date(r.created_at)
      return bookedOn >= windowStart && bookedOn < windowEnd
    })
    .reduce((sum, r) => sum + r.total_price * (1 - HOST_FEE_RATE), 0)
}

/* ------------------------------------------------------------------ chart */

/**
 * `days` real bars, oldest first, each the host's share of whatever was booked that day.
 * A bar reads `idle` when nothing was — not a random 12% chance of one, as before.
 */
export function chartSeries(rentals, days = 20) {
  const today = startOfDay(new Date())
  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))

  const byDay = new Map()
  rentals
    .filter((r) => r.status !== 'cancelled')
    .forEach((r) => {
      const key = startOfDay(r.created_at).getTime()
      const share = r.total_price * (1 - HOST_FEE_RATE)
      byDay.set(key, (byDay.get(key) || 0) + share)
    })

  const max = Math.max(1, ...byDay.values())

  return Array.from({ length: days }, (_, i) => {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    const value = byDay.get(day.getTime()) || 0
    return {
      value,
      height: value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 4,
      idle: value === 0,
      now: day.getTime() === today.getTime(),
      faded: day > today,
    }
  })
}

/* ------------------------------------------------------------------ ranking */

/** `fleet` sorted by `valueFn` descending, with each row's bar width relative to the top row. */
export function rankRows(fleet, valueFn, labelFn) {
  const rows = fleet
    .map((c) => ({ car: c, value: valueFn(c), label: labelFn(c) }))
    .sort((a, b) => b.value - a.value)
  const top = rows[0]?.value || 1
  return rows.map((r, i) => ({ ...r, rank: i + 1, pct: Math.round((r.value / top) * 100) }))
}

/* ------------------------------------------------------------------ payouts */

/**
 * Weekly totals, most recent first — real gross and a real KM0 fee, both summed straight off
 * `Rental.total_price`. `status` is always `'pending'`: nothing in this codebase talks to a
 * bank, so claiming a payout was ever "paid" would be exactly the kind of invented fact this
 * module used to traffic in.
 */
export function payoutRows(rentals, weeks = 5) {
  const today = new Date()

  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(today)
    end.setDate(end.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)

    const inWeek = rentals.filter((r) => {
      if (r.status === 'cancelled') return false
      const bookedOn = new Date(r.created_at)
      return bookedOn >= start && bookedOn <= end
    })
    const gross = inWeek.reduce((sum, r) => sum + r.total_price, 0)
    const fee = Math.round(gross * HOST_FEE_RATE)

    return {
      id: `payout-${i}`,
      date: end,
      rangeLabel: formatDateRange(start, end),
      rentals: inWeek.length,
      gross,
      fee,
      paidOut: gross - fee,
      status: 'pending',
    }
  })
}

/* ------------------------------------------------------------------ history */

/** Completed rentals across the fleet, newest first — real bookings, not invented ones. */
export function historyRows(rentals) {
  const now = new Date()
  return rentals
    .filter((r) => r.status !== 'cancelled' && new Date(r.drop_of_data_time) < now)
    .map((r) => ({
      id: bookingRef(r.id),
      rental: r,
      renter: renterName(r),
      start: new Date(r.pick_up_data_time),
      end: new Date(r.drop_of_data_time),
      days: daysBetween(r.pick_up_data_time, r.drop_of_data_time),
      earned: Math.round(r.total_price * (1 - HOST_FEE_RATE)),
    }))
    .sort((a, b) => b.end - a.end)
}

/* ------------------------------------------------------------------ format */

export function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

/** "9–12 Aug" within a month, "28 Jul–3 Aug" across two — the design's own date-range style. */
export function formatDateRange(start, end) {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })}`
  }
  return `${formatShortDate(start)}–${formatShortDate(end)}`
}
