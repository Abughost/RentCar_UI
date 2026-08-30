/**
 * Rental pricing.
 *
 * apps/models/cars.py stores one CarPrice row per car with five figures: a headline
 * daily_price plus four length brackets. The rate a customer actually pays depends on how
 * long they keep the car, so the bracket is chosen from the day count and everything
 * downstream — the card, the rail, the ticket — reads from the same function.
 */

export const TIERS = [
  { key: 'one_to_three_day', label: '1–3 days', min: 1, max: 3 },
  { key: 'three_to_seven_day', label: '3–7 days', min: 3, max: 7 },
  { key: 'seven_to_thirty_day', label: '7–30 days', min: 7, max: 30 },
  { key: 'over_thirty_day', label: '30+ days', min: 30, max: Infinity },
]

// Flat percentage off `daily_price` a bracket defaults to when an owner leaves it blank —
// never compounded per day. Mirrors apps/pricing.py's RECOMMENDED_DISCOUNT.
const RECOMMENDED_DISCOUNT = {
  one_to_three_day: 0.005,
  three_to_seven_day: 0.01,
  seven_to_thirty_day: 0.03,
  over_thirty_day: 0.05,
}

export function recommendedTierPrice(dailyPrice, tierKey) {
  return Math.round(dailyPrice * (1 - RECOMMENDED_DISCOUNT[tierKey]))
}

/** Local tax, applied to the rental subtotal. Matches the 9% shown in the design. */
export const TAX_RATE = 0.09

/**
 * Extras are a front-end concept: the Rental model has no line-item table, so these are
 * priced and displayed here and summarised into the booking. Keep the ids stable — they
 * are persisted in the booking draft.
 */
export const EXTRAS = [
  {
    id: 'second_driver',
    name: 'Second driver',
    blurb: 'Add their licence before pick-up. Both of you can drive.',
    perDay: 6,
  },
  {
    id: 'unlimited_km',
    name: 'Unlimited kilometres',
    blurb: 'Replaces the daily allowance. Worth it above 1,300 km.',
    perDay: 9,
  },
  {
    id: 'child_seat',
    name: 'Child seat',
    blurb: 'Group 1 to 3, fitted for you at the station.',
    perDay: 5,
    countable: true,
    max: 3,
  },
  {
    id: 'roof_box',
    name: 'Roof box, 420 L',
    blurb: 'Fits skis up to 195 cm. Two left at Northgate.',
    perDay: 11,
  },
]

/**
 * Damage cover. The excess figure comes from the car's own `deposit` when the backend
 * carries one, so `COVERS` is a function rather than a constant.
 */
export function coverOptions(deposit = 900) {
  const excess = deposit > 0 ? deposit : 900
  return [
    {
      id: 'standard',
      eyebrow: 'Standard',
      title: `$${excess} excess`,
      blurb: `Included in the rate. You pay the first $${excess} of any damage.`,
      priceLabel: 'Included',
      perDay: 0,
    },
    {
      id: 'zero',
      eyebrow: 'Most chosen',
      signal: true,
      title: '$0 excess',
      blurb: 'Damage, glass, tyres and the underside. Nothing to claim back afterwards.',
      priceLabel: '+ $14 / day',
      perDay: 14,
    },
    {
      id: 'own',
      eyebrow: 'Own cover',
      title: 'Bring your own',
      blurb: `We hold $${excess} on your card until the car is returned and checked.`,
      priceLabel: '$0',
      perDay: 0,
    },
  ]
}

/* ------------------------------------------------------------------ rates */

function priceRow(car) {
  // CarDetailModelSerializer exposes the related rows as `prices`; the list serializer
  // flattens a single figure onto `daily_price`.
  const rows = car?.prices || car?.price
  if (Array.isArray(rows)) return rows[0] || null
  return rows || null
}

/** The headline figure shown when no dates have been chosen yet. */
export function dailyRate(car) {
  if (car?.daily_price != null) return Number(car.daily_price)
  const row = priceRow(car)
  return row?.daily_price != null ? Number(row.daily_price) : null
}

/** Which bracket a rental of `days` falls into. */
export function tierForDays(days) {
  if (!days || days < 1) return TIERS[0]
  return TIERS.find((t) => days >= t.min && days <= t.max) || TIERS[TIERS.length - 1]
}

/**
 * Per-day rate for a rental of `days`. Falls back to the headline daily price whenever the
 * bracket is missing or zero, which is what the seeded fixtures look like for some cars.
 */
export function rateForDays(car, days) {
  const base = dailyRate(car)
  const row = priceRow(car)
  if (!row || !days) return base

  const tier = tierForDays(days)
  const tiered = row[tier.key]
  return tiered != null && Number(tiered) > 0 ? Number(tiered) : base
}

/** Every bracket as {key, label, amount, active} — for the price table on the detail page. */
export function rateTable(car, days) {
  const row = priceRow(car)
  if (!row) return []
  const active = tierForDays(days)?.key
  return TIERS.map((t) => ({
    key: t.key,
    label: t.label,
    amount: row[t.key] != null ? Number(row[t.key]) : null,
    active: t.key === active,
  }))
}

/* ------------------------------------------------------------------ quote */

/**
 * The whole money story for one booking, in one object. Every screen that shows a figure
 * reads it from here, so the rail, the checkout and the voucher can never disagree.
 *
 * @param {object}   car
 * @param {number}   days
 * @param {object}   opts.cover     one of coverOptions()
 * @param {object}   opts.extras    { [extraId]: true | count }
 */
export function quote(car, days, { cover, extras = {} } = {}) {
  const rentalDays = Math.max(1, days || 1)
  const perDay = rateForDays(car, rentalDays) || 0
  const base = perDay * rentalDays

  const coverPerDay = cover?.perDay || 0
  const coverTotal = coverPerDay * rentalDays

  const extraLines = EXTRAS.map((extra) => {
    const raw = extras[extra.id]
    const count = extra.countable ? Number(raw) || 0 : raw ? 1 : 0
    return { ...extra, count, total: count * extra.perDay * rentalDays }
  }).filter((line) => line.count > 0)

  const extrasTotal = extraLines.reduce((sum, line) => sum + line.total, 0)
  const subtotal = base + coverTotal + extrasTotal
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  return {
    days: rentalDays,
    perDay,
    base,
    cover,
    coverTotal,
    extraLines,
    extrasTotal,
    subtotal,
    tax,
    total,
    /** Included allowance, pooled across the rental — 0 when unlimited was bought. */
    kmAllowance: extras.unlimited_km ? null : (car?.limit_km || 250) * rentalDays,
  }
}

/* ------------------------------------------------------------------ format */

export function money(amount, { cents = true } = {}) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `$${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`
}

export function km(value) {
  if (value == null) return 'Unlimited'
  return `${Number(value).toLocaleString('en-US')} km`
}
