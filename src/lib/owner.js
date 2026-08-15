/**
 * Owner ("hosting") dashboard — derived data.
 *
 * The backend has no peer-to-peer ownership model yet: `Car.author` never leaves the API
 * (`HiddenField`), there is no GPS tracker, no payout ledger and no per-car rental history
 * scoped to who listed it. Rather than fake a second backend, every number here is *derived*
 * from a real `Car` the fleet endpoint actually returned — the id, its daily rate, its
 * deposit — the same way `lib/fleet.js` turns a car's UUID into a stable licence plate.
 *
 * `hashString` makes it deterministic: reload the page and a given car keeps the same
 * status, renter, route and earnings, because they are all seeded from `car.id`. Nothing
 * here is randomised per render.
 */

import { hashString, plateFor } from './fleet'
import { dailyRate } from './pricing'

/** KM0's cut of every rental. Mirrors the design's "KM0 fee 20%" line. */
export const HOST_FEE_RATE = 0.2

const RENTERS = [
  'Nadia Okonkwo',
  'Mark Vilhelm',
  'Sara Lindqvist',
  'Amara Diallo',
  'Dovid Berger',
  'Jonas Weber',
  'Elif Kaya',
  'Priya Nair',
]

const AREAS = [
  'Northgate',
  'Harbour Yard',
  'Riverside',
  'Airport Terminal 2',
  'Westfield',
  'Old Town',
  'Central Station',
]

/** A stable float in [0, 1) for `${seed}:${salt}` — the one primitive everything below uses. */
export function seeded(seed, salt = '') {
  return (hashString(`${seed}:${salt}`) % 100000) / 100000
}

/** Pick from `list` deterministically for this seed. */
function pick(list, seed, salt) {
  return list[Math.floor(seeded(seed, salt) * list.length)]
}

/** Integer in [min, max], deterministic. */
function range(seed, salt, min, max) {
  return min + Math.floor(seeded(seed, salt) * (max - min + 1))
}

/* ------------------------------------------------------------------ fleet */

const STATUSES = ['on_rent', 'on_rent', 'free', 'paused']

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

/**
 * Wrap one real `Car` (from `cars.list()`) in the derived hosting numbers the design shows:
 * status, renter, location, occupancy, earnings, kilometres. `index` breaks ties when two
 * cars hash into the same bucket, so a small fleet still reads as varied as the design.
 */
export function hostCar(car, index = 0) {
  const seed = car.id
  const perDay = dailyRate(car) || range(seed, 'rate', 38, 72)
  const status = STATUSES[(range(seed, 'status', 0, 9) + index) % STATUSES.length]
  const occupancyPct = range(seed, 'occ', 42, 87)
  const daysAvailable = 28
  const daysRented = Math.round((occupancyPct / 100) * daysAvailable)
  const kmDriven = daysRented * range(seed, 'kmday', 65, 165)
  const rating = (4.5 + seeded(seed, 'rating') * 0.5).toFixed(1)
  const monthEarned = Math.round(daysRented * perDay * (1 - HOST_FEE_RATE))
  const area = pick(AREAS, seed, 'area')
  const renter = pick(RENTERS, seed, 'renter')
  const speed = range(seed, 'speed', 38, 84)
  const parkedHours = range(seed, 'parked', 1, 6)
  const returnsIn = range(seed, 'returns', 1, 4)

  return {
    car,
    id: car.id,
    plate: plateFor(car.id),
    shape: bodyShapeKey(seed),
    perDay,
    status,
    occupancyPct,
    daysAvailable,
    daysRented,
    kmDriven,
    rating,
    monthEarned,
    area,
    renter,
    speed,
    parkedHours,
    returnsIn,
    fuelPct: range(seed, 'fuel', 30, 92),
    nextServiceKm: range(seed, 'service', 900, 6200),
    /** Stable [top%, left%] on the 0–100 map viewport. */
    pin: { left: 12 + Math.round(seeded(seed, 'lat') * 76), top: 14 + Math.round(seeded(seed, 'lng') * 72) },
  }
}

function bodyShapeKey(seed) {
  const shapes = ['sedan', 'suv', 'hatch', 'van']
  return shapes[range(seed, 'shape', 0, shapes.length - 1)]
}

/** `cars.list()` results wrapped as a host fleet, most-recent first (the API's own order). */
export function buildFleet(cars) {
  return cars.map((car, i) => hostCar(car, i))
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

/** Scale a monthly figure to another period. Not a real time series — a consistent ratio. */
export function scaleToPeriod(monthlyValue, periodKey) {
  const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[2]
  return Math.round(monthlyValue * (period.days / 30))
}

/* ------------------------------------------------------------------ chart */

/**
 * `n` bars as 0–100 heights, deterministic from `seed`. `todayIndex` marks the tallest-looking
 * "now" bar; a handful of low bars are flagged `idle` the way the design fades an unrented day.
 */
export function chartSeries(seed, n = 20, todayIndex = Math.floor(n * 0.65)) {
  return Array.from({ length: n }, (_, i) => {
    const idle = seeded(seed, `idle:${i}`) < 0.12
    const height = idle ? range(seed, `h:${i}`, 4, 8) : range(seed, `h:${i}`, 22, 88)
    return { height, idle, now: i === todayIndex, faded: i > todayIndex }
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

/** Weekly payout rows, most recent first. `seed` is usually the host's own id. */
export function payoutRows(seed, weeks = 5, grossPerWeek = 1100) {
  const today = new Date()
  return Array.from({ length: weeks }, (_, i) => {
    const weekSeed = `${seed}:payout:${i}`
    const end = new Date(today)
    end.setDate(end.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)

    const gross = Math.round(grossPerWeek * (0.75 + seeded(weekSeed, 'g') * 0.7))
    const fee = Math.round(gross * HOST_FEE_RATE)
    const adjustSign = seeded(weekSeed, 'as') < 0.35 ? 1 : -1
    const adjustments = seeded(weekSeed, 'a') < 0.55 ? 0 : adjustSign * range(weekSeed, 'av', 15, 65)
    const paidOut = gross - fee + adjustments
    const rentals = range(weekSeed, 'r', 5, 12)

    return {
      id: `payout-${i}`,
      date: end,
      rangeLabel: formatDayRange(start, end),
      rentals,
      gross,
      fee,
      adjustments,
      paidOut,
      status: i === 0 ? 'scheduled' : 'paid',
    }
  })
}

function formatDayRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth()
  const month = end.toLocaleDateString('en-US', { month: 'short' })
  // Same month: "8–14 Aug". Spanning two: "28 Jul–3 Aug".
  if (sameMonth) return `${start.getDate()}–${end.getDate()} ${month}`
  const startLabel = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  return `${startLabel}–${end.getDate()} ${month}`
}

/* ------------------------------------------------------------------ history */

/** One completed rental per row, spread across `fleet`, newest first. */
export function historyRows(fleet, seed, count = 8) {
  if (fleet.length === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const rowSeed = `${seed}:hist:${i}`
    const car = fleet[range(rowSeed, 'car', 0, fleet.length - 1)]
    const days = range(rowSeed, 'days', 1, 5)
    const end = new Date()
    end.setDate(end.getDate() - range(rowSeed, 'end', i * 2, i * 2 + 3))
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    const km = days * range(rowSeed, 'km', 60, 210)
    const odoEnd = 60000 + range(rowSeed, 'odo', 5000, 120000)
    const odoStart = odoEnd - km
    const earned = Math.round(days * car.perDay * (1 - HOST_FEE_RATE))
    const late = seeded(rowSeed, 'late') < 0.12
    const rating = late ? null : (4.0 + seeded(rowSeed, 'rate') * 1.0).toFixed(1)

    return {
      id: `KM0-${(hashString(rowSeed) % 9000 + 1000)}`,
      car,
      renter: pick(RENTERS, rowSeed, 'renter'),
      start,
      end,
      odoStart,
      odoEnd,
      km,
      rating,
      late,
      earned,
    }
  }).sort((a, b) => b.end - a.end)
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

/* ------------------------------------------------------------------ drafts */

/**
 * `POST /cars` is restricted to staff (`IsAdminOrReadOnly`) — the backend has no route for a
 * member to list their own car yet. Rather than pretend the "Publish" button reaches a real
 * endpoint, a listing built in `/owner/cars/new` is kept here, client-side, and merged into the
 * fleet on every load. It behaves like a real car everywhere in the dashboard — it just is not
 * on the server, and a note on the listing flow says so.
 */
const DRAFT_KEY = 'km0.owner.draftCars'

export function readDraftCars() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function addDraftCar({ model, dailyPrice, limitKm = 250, deposit = 900 }) {
  const car = {
    id: `draft-${Date.now().toString(36)}`,
    model,
    daily_price: dailyPrice,
    deposit,
    limit_km: limitKm,
    features: [],
  }
  const list = [car, ...readDraftCars()]
  localStorage.setItem(DRAFT_KEY, JSON.stringify(list))
  return car
}
