import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cars as carsApi, pageLinks, toList } from '../api/endpoints'
import CarCard, { CarCardSkeleton } from '../components/CarCard'
import Footer from '../components/Footer'
import { Alert, Button, CarArt, Checkbox, Chip, Icon } from '../components/primitives'
import { formatRange, joinLocal, splitLocal } from '../lib/dates'
import { categoryName, STATIONS } from '../lib/fleet'
import { dailyRate, money, rateForDays } from '../lib/pricing'
import { useBooking } from '../state/BookingContext'

const FUELS = [
  { value: 'gas', label: 'Petrol' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
]

const SORTS = [
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'Name, A to Z' },
]

const PRICE_CEILING = 400

/** One of the filter bar's dropdown pills — Date & location, Gearbox, Price, Body, Fuel share
 * this shell. `openId`/`setOpenId` live on Cars so opening one pill closes the others. */
function FilterPill({ id, label, active, openId, setOpenId, width, children }) {
  const open = openId === id
  return (
    <div className="filterbar__group">
      <button
        type="button"
        className={`filterbar__pill${active ? ' is-active' : ''}${open ? ' is-open' : ''}`}
        onClick={() => setOpenId(open ? null : id)}
      >
        <span>{label}</span>
        <Icon name="chevD" size="sm" />
      </button>
      {open && (
        <div className="filterbar__panel" style={width ? { width } : undefined}>
          {children}
        </div>
      )}
    </div>
  )
}

/** Frame 04. */
export default function Cars() {
  const { draft, days, update } = useBooking()
  const [params, setParams] = useSearchParams()

  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])

  // Which filter-bar dropdown is open, if any — null closes everything.
  const [openMenu, setOpenMenu] = useState(null)
  const barRef = useRef(null)

  // Server-side: the filters CarPriceFilter can actually resolve against the Car model. Brand
  // has to be one of them — the list is cursor-paginated, so filtering a single page in the
  // browser would report "0 cars" for any brand that happens to sit on a later page.
  const fuelParam = params.get('fuel_type') || ''
  const brandParam = params.get('brand') || ''

  // Client-side: everything the API cannot express — price bracket, category, gearbox.
  const [price, setPrice] = useState(null)
  const [selectedCats, setSelectedCats] = useState(() => {
    const c = params.get('category')
    return c ? [c] : []
  })
  const [gearbox, setGearbox] = useState([])
  const [freeCancellation, setFreeCancellation] = useState(false)
  const [sort, setSort] = useState('price-asc')

  // The car/brand search box — a free-text mirror of brandParam, plus the typed text driving
  // the autocomplete list while it doesn't (yet) match a real brand.
  const [carQuery, setCarQuery] = useState(() => params.get('brand') || '')

  useEffect(() => {
    carsApi
      .categories()
      .then((data) => setCategories(toList(data)))
      .catch(() => setCategories([]))
    carsApi
      .brands()
      .then((data) => setBrands(toList(data)))
      .catch(() => setBrands([]))
  }, [])

  // Close whichever dropdown is open on an outside click or Escape.
  useEffect(() => {
    if (!openMenu) return undefined
    function onDown(e) {
      if (barRef.current && !barRef.current.contains(e.target)) setOpenMenu(null)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const load = useCallback(
    (cursorUrl) => {
      const ac = new AbortController()
      setLoading(true)
      setError(null)

      const query = cursorUrl
        ? { cursorUrl }
        : {
            is_available: true,
            page_size: 12,
            ...(fuelParam ? { fuel_type: fuelParam } : {}),
            ...(brandParam ? { brand: brandParam } : {}),
          }

      carsApi
        .list(query, { signal: ac.signal })
        .then((data) => {
          setPayload(data)
          setLoading(false)
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setError(err.message)
          setLoading(false)
        })

      return () => ac.abort()
    },
    [fuelParam, brandParam],
  )

  useEffect(() => {
    setCursor(null)
    return load(null)
  }, [load])

  useEffect(() => {
    if (cursor) return load(cursor)
    return undefined
  }, [cursor, load])

  const all = useMemo(() => toList(payload), [payload])
  const links = pageLinks(payload)

  /* --------------------------------------------------- client-side refine */

  // The ceiling used to be a fixed 400, which assumed the seeded rates were in dollars. They
  // are whole-unit sums in the local currency — a Qashqai is 260,000 — so every car fell
  // outside the bracket and the grid reported "0 cars" whatever else was selected. Deriving it
  // from what actually loaded keeps the slider honest at any scale.
  const priceCeiling = useMemo(() => {
    const rates = all.map((car) => rateForDays(car, days) ?? dailyRate(car)).filter((r) => r != null)
    if (!rates.length) return PRICE_CEILING
    const max = Math.max(...rates)
    const magnitude = 10 ** Math.max(0, String(Math.round(max)).length - 2)
    return Math.max(PRICE_CEILING, Math.ceil(max / magnitude) * magnitude)
  }, [all, days])

  // `null` means "the whole range", so the slider follows the data until it is actually moved.
  const bracket = price ?? [0, priceCeiling]
  const priceStep = Math.max(1, Math.round(priceCeiling / 80))

  const results = useMemo(() => {
    let list = all.filter((car) => {
      const rate = rateForDays(car, days) ?? dailyRate(car)
      if (rate != null && (rate < bracket[0] || rate > bracket[1])) return false

      if (selectedCats.length) {
        const cat = categoryName(car)
        if (!cat || !selectedCats.includes(cat)) return false
      }

      if (gearbox.length && !gearbox.includes(car.transmission_type)) return false
      if (freeCancellation && car.deposit > 0) return false

      return true
    })

    list = [...list].sort((a, b) => {
      if (sort === 'name') return String(a.model).localeCompare(String(b.model))
      const ra = rateForDays(a, days) ?? 0
      const rb = rateForDays(b, days) ?? 0
      return sort === 'price-desc' ? rb - ra : ra - rb
    })

    return list
  }, [all, bracket, selectedCats, gearbox, freeCancellation, sort, days])

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  /** Both live in the URL, because both are resolved by the API rather than in the browser. */
  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function clearAll() {
    setPrice(null)
    setSelectedCats([])
    setGearbox([])
    setFreeCancellation(false)
    setCarQuery('')
    // One write: two setParams calls in a row would both build off the same stale params and
    // the second would undo the first.
    const next = new URLSearchParams(params)
    next.delete('fuel_type')
    next.delete('brand')
    setParams(next, { replace: true })
  }

  const countFor = (predicate) => all.filter(predicate).length

  /* --------------------------------------------------- date & location */

  const pick = splitLocal(draft.pickUpAt)
  const drop = splitLocal(draft.dropOffAt)

  function setPickUp(date, time) {
    const iso = joinLocal(date, time)
    if (!iso) return
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

  /* --------------------------------------------------- car / brand search */

  const suggestions = useMemo(() => {
    const q = carQuery.trim().toLowerCase()
    if (!q) return []
    return brands.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8)
  }, [carQuery, brands])

  function pickBrand(name) {
    setCarQuery(name)
    setParam('brand', name)
    setOpenMenu(null)
  }

  function clearBrand() {
    setCarQuery('')
    setParam('brand', '')
  }

  /* --------------------------------------------------- pill labels */

  const gearboxLabel =
    gearbox.length === 0
      ? 'Gearbox'
      : gearbox.length === 1
        ? gearbox[0] === 'automatic'
          ? 'Automatic'
          : 'Manual'
        : `Gearbox (${gearbox.length})`

  const priceLabel = price ? `${money(bracket[0], { cents: false })}–${money(bracket[1], { cents: false })}` : 'Price'

  const bodyLabel =
    selectedCats.length === 0
      ? 'Body'
      : selectedCats.length === 1
        ? selectedCats[0]
        : `Body (${selectedCats.length})`

  const fuelLabel = fuelParam ? FUELS.find((f) => f.value === fuelParam)?.label || 'Fuel' : 'Fuel'

  return (
    <>
      {/* ---- the filter bar: date & location, car search, and every filter that used to
          live in a separate rail now lives here as dropdown pills. ---- */}
      <div className="filterbar" ref={barRef}>
        <FilterPill id="date" label={`${draft.station} · ${formatRange(draft.pickUpAt, draft.dropOffAt)}`} openId={openMenu} setOpenId={setOpenMenu} width={340}>
          <div className="fgrp">
            <p className="fgrp__t">Pick-up &amp; return</p>
            <label className="fld__box">
              <Icon name="pin" size="sm" style={{ color: 'var(--pine-700)' }} />
              <select value={draft.station} onChange={(e) => update({ station: e.target.value, dropStation: e.target.value })}>
                {STATIONS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="fgrp">
            <p className="fgrp__t">From</p>
            <label className="fld__box" style={{ marginBottom: 8 }}>
              <Icon name="cal" size="sm" style={{ color: 'var(--pine-700)' }} />
              <input type="date" className="num" value={pick.date} onChange={(e) => setPickUp(e.target.value, pick.time)} />
              <input type="time" className="num" value={pick.time} onChange={(e) => setPickUp(pick.date, e.target.value)} />
            </label>
          </div>
          <div className="fgrp">
            <p className="fgrp__t">Until</p>
            <label className="fld__box">
              <Icon name="cal" size="sm" style={{ color: 'var(--pine-700)' }} />
              <input type="date" className="num" min={pick.date} value={drop.date} onChange={(e) => setDropOff(e.target.value, drop.time)} />
              <input type="time" className="num" value={drop.time} onChange={(e) => setDropOff(drop.date, e.target.value)} />
            </label>
          </div>
        </FilterPill>

        <div className="filterbar__group">
          <label className="filterbar__search">
            <input
              type="text"
              placeholder="Car or brand"
              value={carQuery}
              onFocus={() => setOpenMenu('search')}
              onChange={(e) => {
                setCarQuery(e.target.value)
                setOpenMenu('search')
                if (!e.target.value) clearBrand()
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const exact = brands.find((b) => b.name.toLowerCase() === carQuery.trim().toLowerCase())
                if (exact) pickBrand(exact.name)
              }}
            />
            {carQuery && (
              <button type="button" className="filterbar__clearField" aria-label="Clear search" onClick={clearBrand}>
                <Icon name="x" size="sm" />
              </button>
            )}
          </label>
          {openMenu === 'search' && suggestions.length > 0 && (
            <div className="filterbar__panel filterbar__suggestions">
              {suggestions.map((b) => (
                <button key={b.id} type="button" onClick={() => pickBrand(b.name)}>
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <FilterPill id="gearbox" label={gearboxLabel} active={gearbox.length > 0} openId={openMenu} setOpenId={setOpenMenu}>
          <div className="chips">
            {['automatic', 'manual'].map((value) => (
              <Chip key={value} on={gearbox.includes(value)} onClick={() => toggle(gearbox, setGearbox, value)}>
                {value === 'automatic' ? 'Automatic' : 'Manual'}
              </Chip>
            ))}
          </div>
        </FilterPill>

        <FilterPill id="price" label={priceLabel} active={!!price} openId={openMenu} setOpenId={setOpenMenu} width={280}>
          <div className="slider">
            <span
              className="slider__fill"
              style={{
                left: `${(bracket[0] / priceCeiling) * 100}%`,
                right: `${100 - (bracket[1] / priceCeiling) * 100}%`,
              }}
            />
            <input
              type="range"
              aria-label="Minimum price per day"
              min={0}
              max={priceCeiling}
              step={priceStep}
              value={bracket[0]}
              onChange={(e) => setPrice([Math.min(Number(e.target.value), bracket[1] - priceStep), bracket[1]])}
            />
            <input
              type="range"
              aria-label="Maximum price per day"
              min={0}
              max={priceCeiling}
              step={priceStep}
              value={bracket[1]}
              onChange={(e) => setPrice([bracket[0], Math.max(Number(e.target.value), bracket[0] + priceStep)])}
            />
          </div>
          <div className="slider__caps small">
            <span className="num">{money(0, { cents: false })}</span>
            <span className="num">{money(priceCeiling, { cents: false })}</span>
          </div>
        </FilterPill>

        {categories.length > 0 && (
          <FilterPill id="body" label={bodyLabel} active={selectedCats.length > 0} openId={openMenu} setOpenId={setOpenMenu}>
            <div className="chips">
              {categories.map((cat) => (
                <Chip key={cat.id} on={selectedCats.includes(cat.name)} onClick={() => toggle(selectedCats, setSelectedCats, cat.name)}>
                  {cat.name}
                </Chip>
              ))}
            </div>
          </FilterPill>
        )}

        <FilterPill id="fuel" label={fuelLabel} active={!!fuelParam} openId={openMenu} setOpenId={setOpenMenu}>
          {FUELS.map((fuel) => (
            <Checkbox
              key={fuel.value}
              className="fopt"
              checked={fuelParam === fuel.value}
              onChange={() => setParam('fuel_type', fuelParam === fuel.value ? '' : fuel.value)}
            >
              {fuel.label}
              <span className="fopt__n">{countFor((c) => c.fuel_type === fuel.value)}</span>
            </Checkbox>
          ))}
        </FilterPill>

        <Chip on={freeCancellation} onClick={() => setFreeCancellation((v) => !v)}>
          No deposit
        </Chip>

        <button type="button" className="filterbar__clear" onClick={clearAll}>
          Clear all
        </button>

        <Button
          className="filterbar__update"
          variant="signal"
          icon="search"
          aria-label="Update search"
          onClick={() => setCursor(null)}
        />
      </div>

      <div className="results">
        <div className="rhead">
          <div>
            <h1 className="dh3">
              {loading ? 'Finding cars' : `${results.length} car${results.length === 1 ? '' : 's'}`}{' '}
              {!loading && `ready at ${draft.station}`}
            </h1>
            <p className="small" style={{ marginTop: 5 }}>
              Held for 20 minutes once you reserve. Prices cover {days} day
              {days === 1 ? '' : 's'} at the bracket rate.
            </p>
          </div>
          <div className="sortbar">
            <span className="small">Sort</span>
            <label className="fld__box">
              <span className="sr-only">Sort results</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Icon name="chevD" size="sm" style={{ color: 'var(--ink-45)' }} />
            </label>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 18 }}>
            <Alert>{error}</Alert>
          </div>
        )}

        {loading ? (
          <div className="cars">
            <CarCardSkeleton wide />
            <CarCardSkeleton />
            <CarCardSkeleton />
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            <CarArt shape="hatch" className="empty__art" />
            <h2 className="dh3" style={{ marginBottom: 8 }}>
              No cars match these filters
            </h2>
            <p className="small" style={{ marginBottom: 18 }}>
              Widen the price range, or clear the body and fuel choices.
            </p>
            <Button variant="pine" onClick={clearAll}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="cars">
            {results.map((car, i) => (
              <CarCard key={car.id} car={car} days={days} wide={i === 0} featured={i === 0} />
            ))}
          </div>
        )}

        <div className="promo">
          <Icon name="route" size="lg" style={{ color: 'var(--signal)', flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <div className="promo__t">Driving more than the daily allowance?</div>
            <p className="promo__x">
              Add unlimited kilometres to any car for $9 a day. You can switch it on later from
              your trip.
            </p>
          </div>
          <Button
            variant="onDark"
            size="sm"
            onClick={() => update((d) => ({ extras: { ...d.extras, unlimited_km: true } }))}
          >
            Add to search
          </Button>
        </div>

        {(links.previous || links.next) && (
          <div className="pager">
            <Button size="sm" disabled={!links.previous} onClick={() => setCursor(links.previous)}>
              Previous
            </Button>
            <span className="num small">showing {results.length}</span>
            <Button size="sm" disabled={!links.next} onClick={() => setCursor(links.next)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
