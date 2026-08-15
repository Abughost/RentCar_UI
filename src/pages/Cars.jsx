import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cars as carsApi, pageLinks, toList } from '../api/endpoints'
import CarCard, { CarCardSkeleton } from '../components/CarCard'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Alert, Button, CarArt, Checkbox, Chip, Icon } from '../components/primitives'
import { formatWhen } from '../lib/dates'
import { categoryName } from '../lib/fleet'
import { dailyRate, rateForDays } from '../lib/pricing'
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

/** Frame 04. */
export default function Cars() {
  const { draft, days, update } = useBooking()
  const [params, setParams] = useSearchParams()

  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [categories, setCategories] = useState([])
  const [railOpen, setRailOpen] = useState(false)

  // Server-side: only the filters CarPriceFilter can actually resolve against the Car model.
  const fuelParam = params.get('fuel_type') || ''

  // Client-side: everything the API cannot express — price bracket, category, gearbox.
  const [price, setPrice] = useState([0, PRICE_CEILING])
  const [selectedCats, setSelectedCats] = useState(() => {
    const c = params.get('category')
    return c ? [c] : []
  })
  const [gearbox, setGearbox] = useState([])
  const [freeCancellation, setFreeCancellation] = useState(false)
  const [sort, setSort] = useState('price-asc')

  useEffect(() => {
    carsApi
      .categories()
      .then((data) => setCategories(toList(data)))
      .catch(() => setCategories([]))
  }, [])

  const load = useCallback(
    (cursorUrl) => {
      const ac = new AbortController()
      setLoading(true)
      setError(null)

      const query = cursorUrl
        ? { cursorUrl }
        : { is_available: true, page_size: 12, ...(fuelParam ? { fuel_type: fuelParam } : {}) }

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
    [fuelParam],
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

  const results = useMemo(() => {
    let list = all.filter((car) => {
      const rate = rateForDays(car, days) ?? dailyRate(car)
      if (rate != null && (rate < price[0] || rate > price[1])) return false

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
  }, [all, price, selectedCats, gearbox, freeCancellation, sort, days])

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  function setFuel(value) {
    const next = new URLSearchParams(params)
    if (value) next.set('fuel_type', value)
    else next.delete('fuel_type')
    setParams(next, { replace: true })
  }

  function clearAll() {
    setPrice([0, PRICE_CEILING])
    setSelectedCats([])
    setGearbox([])
    setFreeCancellation(false)
    setFuel('')
  }

  const countFor = (predicate) => all.filter(predicate).length

  return (
    <div className="page">
      <Nav />

      {/* ---- the search you arrived with ---- */}
      <div className="srchbar">
        <div className="srchbar__cell">
          <div className="srchbar__k">Pick-up &amp; return</div>
          <div className="srchbar__v">{draft.station}</div>
        </div>
        <div className="srchbar__cell">
          <div className="srchbar__k">From</div>
          <div className="srchbar__v num" style={{ fontSize: 13 }}>
            {formatWhen(draft.pickUpAt)}
          </div>
        </div>
        <div className="srchbar__cell">
          <div className="srchbar__k">Until</div>
          <div className="srchbar__v num" style={{ fontSize: 13 }}>
            {formatWhen(draft.dropOffAt)}
          </div>
        </div>
        <div className="srchbar__cell">
          <div className="srchbar__k">Length</div>
          <div className="srchbar__v">
            {days} day{days === 1 ? '' : 's'}
          </div>
        </div>
        <div className="srchbar__act">
          <Link to="/" className="btn btn--onDark btn--sm">
            Change dates
          </Link>
          <Button variant="signal" size="sm" onClick={() => setCursor(null)}>
            Update search
          </Button>
        </div>
      </div>

      <div className="results">
        {/* ---------------------------------------------------- filter rail */}
        <aside className={`filters${railOpen ? ' is-open' : ''}`}>
          <div className="filters__head">
            <span className="filters__title">
              <Icon name="slider" size="sm" />
              Filters
            </span>
            <button type="button" className="filters__clear" onClick={clearAll}>
              Clear all
            </button>
          </div>

          <div className="fgrp">
            <p className="fgrp__t">
              Price per day
              <span className="fgrp__n num">
                ${price[0]} – ${price[1]}
              </span>
            </p>
            <div className="slider">
              <span
                className="slider__fill"
                style={{
                  left: `${(price[0] / PRICE_CEILING) * 100}%`,
                  right: `${100 - (price[1] / PRICE_CEILING) * 100}%`,
                }}
              />
              <input
                type="range"
                aria-label="Minimum price per day"
                min={0}
                max={PRICE_CEILING}
                step={5}
                value={price[0]}
                onChange={(e) => setPrice([Math.min(Number(e.target.value), price[1] - 5), price[1]])}
              />
              <input
                type="range"
                aria-label="Maximum price per day"
                min={0}
                max={PRICE_CEILING}
                step={5}
                value={price[1]}
                onChange={(e) => setPrice([price[0], Math.max(Number(e.target.value), price[0] + 5)])}
              />
            </div>
            <div className="slider__caps small">
              <span className="num">$0</span>
              <span className="num">${PRICE_CEILING}</span>
            </div>
          </div>

          <div className="fgrp">
            <p className="fgrp__t">Gearbox</p>
            <div className="chips">
              {['automatic', 'manual'].map((value) => (
                <Chip
                  key={value}
                  on={gearbox.includes(value)}
                  onClick={() => toggle(gearbox, setGearbox, value)}
                >
                  {value === 'automatic' ? 'Automatic' : 'Manual'}
                </Chip>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="fgrp">
              <p className="fgrp__t">Body</p>
              <div className="chips">
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    on={selectedCats.includes(cat.name)}
                    onClick={() => toggle(selectedCats, setSelectedCats, cat.name)}
                  >
                    {cat.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="fgrp">
            <p className="fgrp__t">Fuel</p>
            {FUELS.map((fuel) => (
              <Checkbox
                key={fuel.value}
                className="fopt"
                checked={fuelParam === fuel.value}
                onChange={() => setFuel(fuelParam === fuel.value ? '' : fuel.value)}
              >
                {fuel.label}
                <span className="fopt__n">{countFor((c) => c.fuel_type === fuel.value)}</span>
              </Checkbox>
            ))}
          </div>

          <div className="fgrp">
            <p className="fgrp__t">Must have</p>
            <Checkbox
              className="fopt"
              checked={freeCancellation}
              onChange={(e) => setFreeCancellation(e.target.checked)}
            >
              No deposit
              <span className="fopt__n">{countFor((c) => !c.deposit)}</span>
            </Checkbox>
          </div>
        </aside>

        {/* ---------------------------------------------------- results */}
        <div>
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
              <Button
                className="filters__toggle"
                size="sm"
                icon="slider"
                onClick={() => setRailOpen((v) => !v)}
              >
                Filters
              </Button>
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
      </div>

      <Footer />
      <TabBar />
    </div>
  )
}
