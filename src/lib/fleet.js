import { mediaUrl } from '../api/client'

/**
 * Bridges the backend's data model to the things the design shows.
 *
 * The design draws three pieces of information the API does not store: a body-type
 * silhouette, a licence plate on every car, and a named pick-up station. The first is
 * derived from the car's category, the second from its UUID (deterministic, so a car keeps
 * the same plate across renders and sessions), and the third is a fixed list of stations
 * written into the Rental's pick_up_location / drop_of_location CharFields.
 */

/* ------------------------------------------------------------------ shape */

const SHAPE_RULES = [
  { shape: 'van', match: /van|minibus|bus|transit|cargo|yuk/i },
  { shape: 'suv', match: /suv|crossover|jeep|off.?road|4x4/i },
  { shape: 'hatch', match: /hatch|small|compact|mini|city|econom/i },
  { shape: 'sedan', match: /sedan|saloon|estate|combi|business|executive|premium|lux/i },
]

/** Which silhouette to draw for a car, from its category (or model name as a fallback). */
export function bodyShape(car) {
  const hay = [car?.category?.name, car?.category, car?.type, car?.model, car?.brand]
    .filter((v) => typeof v === 'string')
    .join(' ')
  const hit = SHAPE_RULES.find((rule) => rule.match.test(hay))
  return hit ? hit.shape : 'sedan'
}

const SHAPE_LABEL = { van: 'Van', suv: 'SUV', hatch: 'Hatchback', sedan: 'Sedan' }

/** Display name for a `bodyShape()` result — CarDetailModelSerializer doesn't expose
 * `category`, so this is what the no-photo badge captions itself with. */
export function shapeLabel(shape) {
  return SHAPE_LABEL[shape] || 'Sedan'
}

/* ------------------------------------------------------------------ plate */

const LETTERS = 'ABCDEFGHKLMNPRSTVXZ'

/** FNV-1a — deterministic, so anything derived from an id stays put across renders. */
export function hashString(value) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * A stable plate for a car, e.g. "12 B 640". Cosmetic — the backend has no registration
 * field — but derived from the id so it never changes under the customer.
 */
export function plateFor(id) {
  if (!id) return '00 A 000'
  const h = hashString(String(id))
  const region = String((h % 89) + 10)
  const letter = LETTERS[Math.floor(h / 89) % LETTERS.length]
  const serial = String(Math.floor(h / 1789) % 1000).padStart(3, '0')
  return `${region} ${letter} ${serial}`
}

/** Booking reference in the design's KM0-#### form, derived from the rental id. */
export function bookingRef(id) {
  if (!id) return 'KM0-0000'
  return `KM0-${String((hashString(String(id)) % 9000) + 1000)}`
}

/* ------------------------------------------------------------------ stations */

/**
 * The eleven stations the product rents from. Written verbatim into the Rental location
 * fields, so whatever is picked here is what the booking record carries.
 */
export const STATIONS = [
  { id: 'northgate', name: 'Northgate Garage', address: 'Level −1, Northgate Centre', hours: 'open 24h', ready: 84 },
  { id: 'airport-t2', name: 'Airport · Terminal 2', address: 'Arrivals, bay 4', hours: '05:00 – 01:00', ready: 37 },
  { id: 'harbour', name: 'Harbour Yard', address: 'Pier Road 12', hours: '07:00 – 21:00', ready: 52 },
  { id: 'central', name: 'Central Station', address: 'East exit, platform 9', hours: 'open 24h', ready: 6 },
  { id: 'westfield', name: 'Westfield Depot', address: 'Mill Lane 4', hours: '07:00 – 20:00', ready: 41 },
  { id: 'old-town', name: 'Old Town', address: 'Market Square 2', hours: '08:00 – 19:00', ready: 23 },
]

export function stationByName(name) {
  return STATIONS.find((s) => s.name === name) || null
}

/** Six gauge segments from a "cars ready" count, so the meter reads at a glance. */
export function readyGauge(count, cap = 90) {
  if (!count) return 0
  return Math.max(1, Math.min(6, Math.round((count / cap) * 6)))
}

/* ------------------------------------------------------------------ display */

const FUEL_LABEL = { gas: 'Petrol', electric: 'Electric', hybrid: 'Hybrid' }
const FUEL_ICON = { gas: 'fuel', electric: 'bolt', hybrid: 'fuel' }
const TRANSMISSION_LABEL = { manual: 'Manual', automatic: 'Automatic' }

export function fuelLabel(value) {
  return FUEL_LABEL[value] || 'Petrol'
}

export function fuelIcon(value) {
  return FUEL_ICON[value] || 'fuel'
}

export function transmissionLabel(value) {
  return TRANSMISSION_LABEL[value] || 'Automatic'
}

/** Brand may arrive as a nested object (detail) or a flat string (serializer source). */
export function brandName(car) {
  const b = car?.brand
  if (!b) return null
  return typeof b === 'string' ? b : b.name || null
}

export function categoryName(car) {
  const c = car?.category
  if (!c) return null
  return typeof c === 'string' ? c : c.name || null
}

/** Full display name: "Škoda Octavia Combi" from brand + model, model alone if no brand. */
export function carTitle(car) {
  const brand = brandName(car)
  const model = car?.model || 'Car'
  return brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model
}

/** Registration year — the model stores it as a DateField. */
export function carYear(car) {
  if (!car?.year) return null
  const d = new Date(car.year)
  return Number.isNaN(d.getTime()) ? String(car.year).slice(0, 4) : d.getFullYear()
}

/** Gallery image URLs, normalised for the dev proxy. */
export function carImages(car) {
  const images = car?.images
  if (!Array.isArray(images)) return []
  return images.map((img) => mediaUrl(typeof img === 'string' ? img : img.image)).filter(Boolean)
}

/** The one photo a results-grid card shows. The list endpoint sends only `main_image` (a
 * single URL, not the full gallery `carImages` reads from the detail endpoint), so a card
 * falls back to the gallery's first shot for any payload that happens to carry the full array. */
export function carMainImage(car) {
  return mediaUrl(car?.main_image) || carImages(car)[0] || null
}
