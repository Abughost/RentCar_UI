import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { cars as carsApi } from '../api/endpoints'
import BookingRail, { RateHead } from '../components/BookingRail'
import Footer from '../components/Footer'
import Lightbox from '../components/Lightbox'
import MiniCalendar from '../components/MiniCalendar'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Alert, Button, CarArt, EditableDigits, Icon, Plate, Spinner, Tag } from '../components/primitives'
import { addDays, formatWhen, toDate } from '../lib/dates'
import {
  bodyShape,
  carImages,
  carTitle,
  carYear,
  categoryName,
  fuelIcon,
  fuelLabel,
  plateFor,
  shapeLabel,
  transmissionLabel,
} from '../lib/fleet'
import { coverOptions, km, money, quote, rateTable, TIERS } from '../lib/pricing'
import { useAuth } from '../state/AuthContext'
import { useBooking } from '../state/BookingContext'

// TIERS tops out at 30 — beyond that the customer is choosing a return date, not nudging a
// number, so the length stops being bracket-priced and just keeps the last bracket's rate
// (tierForDays already falls back to it for anything past 30; see lib/pricing.js).
const MAX_RENTAL_DAYS = 365
const DAYS_PER_MONTH = 30

const FAQ = [
  {
    q: 'Fuel policy',
    a: 'The car leaves the station full. Return it full and you pay nothing extra. If you return it short, we refuel at the pump price plus a $19 service charge — the receipt is itemised in your trip.',
  },
  {
    q: 'Excess and deposit',
    a: 'The deposit shown on this page is the most you can be asked for after damage. Choose the $0 excess cover at checkout and there is nothing to claim back afterwards.',
  },
  {
    q: 'Cancelling or changing dates',
    a: 'Free to cancel until 24 hours before pick-up, from your trips page. Changing dates re-prices the rental at the bracket rate for the new length.',
  },
  {
    q: 'Who is allowed to drive',
    a: 'The person who booked, plus any second driver whose licence is on the account. Everyone must have held a licence for at least a year.',
  },
  {
    q: 'Tolls, fines and congestion charges',
    a: 'Passed on at cost with no admin fee, itemised against the trip once the authority bills us.',
  },
]

/** Frame 05. */
export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { draft, days, update } = useBooking()
  const { isAuthenticated, isRegistered } = useAuth()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [shot, setShot] = useState(0)
  const [open, setOpen] = useState(0)
  // Photo URLs that 404'd. The gallery still falls back to the shape silhouette per broken
  // slot rather than a broken-image glyph, the same pattern as the brand badges on the home
  // page — some fixtures simply have no file behind the URL yet.
  const [brokenPhotos, setBrokenPhotos] = useState(() => new Set())
  const [lightboxAt, setLightboxAt] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setShot(0)
    setBrokenPhotos(new Set())
    setLightboxAt(null)

    carsApi
      .detail(id, { signal: ac.signal })
      .then((data) => {
        setCar(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })

    return () => ac.abort()
  }, [id])

  const covers = useMemo(() => coverOptions(car?.deposit), [car])
  const standard = covers[0]
  const priced = useMemo(() => quote(car, days, { cover: standard, extras: {} }), [car, days, standard])
  const tiers = useMemo(() => rateTable(car, days), [car, days])
  const images = carImages(car)
  // Only the slots that actually loaded — a car whose fixtures have no real photo files
  // behind them ends up with none, and the gallery falls back to the silhouette rather than
  // a strip of broken-image glyphs.
  const validImages = images.filter((_, i) => !brokenPhotos.has(i))

  function markBroken(i) {
    setBrokenPhotos((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
  }

  /**
   * Moves drop-off so the rental is exactly `nextDays` long.
   *
   * `daysBetween` bills any started day, via `Math.ceil` on the raw millisecond gap — so it is
   * only exact when drop-off sits at the same time of day as pick-up. Carrying the customer's
   * previous return time over (say, 18:00 against a 09:30 pick-up) added a few extra hours
   * that tipped the ceiling up by a whole day, and since each click recomputed from the
   * already-inflated `days`, one click could move the count by two. Landing drop-off on
   * pick-up's own time of day keeps the gap an exact multiple of a day, so `clamped` in is
   * always `days` out.
   */
  function setExactDays(nextDays) {
    const clamped = Math.max(1, Math.min(MAX_RENTAL_DAYS, Math.round(nextDays)))
    const pickUp = toDate(draft.pickUpAt) || new Date()
    update({ dropOffAt: addDays(pickUp, clamped).toISOString() })
  }

  /**
   * Picks a day count inside a bracket that unambiguously resolves back to it —
   * `tierForDays` matches the first bracket whose range contains the count, so a boundary
   * value (3, 7, 15) would silently land in the bracket below the one that was clicked.
   * The midpoint always clears that.
   */
  function selectBracket(tierKey) {
    const def = TIERS.find((t) => t.key === tierKey)
    if (def) setExactDays((def.min + def.max) / 2)
  }

  /** The 30+ calendar hands over a date, not a day count — same time-of-day fix as
   *  `setExactDays`, just driven by a picked date instead of an offset from pick-up. */
  function setDropOffDate(date) {
    const pickUp = toDate(draft.pickUpAt) || new Date()
    const next = new Date(date)
    next.setHours(pickUp.getHours(), pickUp.getMinutes(), 0, 0)
    update({ dropOffAt: next.toISOString() })
    setCalendarOpen(false)
  }

  if (loading) {
    return (
      <div className="page">
        <Nav />
        <div className="sec">
          <Spinner label="Loading the car" />
        </div>
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="page">
        <Nav />
        <div className="sec">
          <Alert>{error || 'That car is no longer in the fleet.'}</Alert>
          <div style={{ marginTop: 18 }}>
            <Link to="/cars" className="btn btn--pine">
              Back to results
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const title = carTitle(car)
  const shape = bodyShape(car)
  const plate = plateFor(car.id)
  const category = categoryName(car)
  const similar = Array.isArray(car.similar_cars) ? car.similar_cars : []

  // Months : days, always — a rental under a month is "00 : 05", not a separate single-drum
  // layout, so the field it's kept in doesn't reflow every time a click crosses the boundary.
  const rentalMonths = Math.floor(days / DAYS_PER_MONTH)
  const rentalRestDays = days % DAYS_PER_MONTH
  const overAMonth = days > DAYS_PER_MONTH
  // The calendar only opens past the last priced bracket, so nothing earlier is selectable.
  const calendarFloor = addDays(toDate(draft.pickUpAt) || new Date(), DAYS_PER_MONTH + 1)

  function reserve() {
    if (!isAuthenticated) {
      navigate('/signin', { state: { from: { pathname: `/checkout/${car.id}` } } })
      return
    }
    if (!isRegistered) {
      navigate('/register/licence')
      return
    }
    navigate(`/checkout/${car.id}`)
  }

  return (
    <div className="page">
      <Nav />

      <div className="crumb">
        <Link to="/cars">Find a car</Link>
        <Icon name="chev" size="sm" />
        <span>{draft.station}</span>
        <Icon name="chev" size="sm" />
        <span className="crumb__now">{title}</span>
      </div>

      <div className="detail">
        <div>
          <div className="detail__head">
            <div>
              <p className="eyebrow" style={{ margin: '0 0 8px' }}>
                {[category, carYear(car) && `${carYear(car)} plate`].filter(Boolean).join(' · ')}
              </p>
              <h1 className="dh2">{title}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Tag tone="sage" icon="check">
                Free cancellation
              </Tag>
              <Tag icon="star">4.7 · 316 trips</Tag>
            </div>
          </div>

          {/* Keyed on the car, not the shot — switching photos of the same car should not
              replay the drive-in, but landing on a different car (e.g. from "similar cars")
              should, the same way the hero odometer re-rolls on a new price. */}
          <div
            className={`hero-car${images.length > 0 && !brokenPhotos.has(shot) ? '' : ' hero-car--empty'}`}
            key={car.id}
          >
            <Plate number={plate} className="hero-car__plate" />
            <div className="hero-car__emblem">
              {images.length > 0 && !brokenPhotos.has(shot) ? (
                <img
                  className="hero-car__photo"
                  src={images[shot]}
                  alt={title}
                  onError={() => markBroken(shot)}
                  onClick={() => setLightboxAt(validImages.indexOf(images[shot]))}
                />
              ) : (
                // No photo on file — a small badge (icon over its own category name), not a
                // stand-in hero image. It should read as "no photo yet", not as the photo.
                <div className="hero-car__badge">
                  <CarArt shape={shape} className="hero-car__badgeArt" />
                  <div className="hero-car__badgeName">{category || shapeLabel(shape)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="thumbs">
            {validImages.length > 0
              ? images.map(
                  (src, i) =>
                    !brokenPhotos.has(i) && (
                      <button
                        key={src}
                        type="button"
                        className={`thumb${i === shot ? ' is-on' : ''}`}
                        onClick={() => setShot(i)}
                        aria-label={`Photo ${i + 1}`}
                      >
                        <img src={src} alt="" loading="lazy" onError={() => markBroken(i)} />
                      </button>
                    ),
                )
              : ['SIDE', 'INTERIOR', 'BOOT', 'DASHBOARD', 'REAR SEATS'].map((label, i) => (
                  <span key={label} className={`thumb${i === 0 ? ' is-on' : ''}`}>
                    <span className="thumb__l">{label}</span>
                  </span>
                ))}
          </div>

          <div className="specgrid">
            <div className="specgrid__c">
              <div className="specgrid__k">Gearbox</div>
              <div className="specgrid__v">
                <Icon name="gear" />
                {transmissionLabel(car.transmission_type)}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Fuel</div>
              <div className="specgrid__v">
                <Icon name={fuelIcon(car.fuel_type)} />
                {fuelLabel(car.fuel_type)}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Included daily</div>
              <div className="specgrid__v num" style={{ fontSize: 14 }}>
                {car.limit_km ? `${car.limit_km} km` : '250 km'}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Deposit</div>
              <div className="specgrid__v num" style={{ fontSize: 14 }}>
                {car.deposit ? money(car.deposit, { cents: false }) : 'None'}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Registered</div>
              <div className="specgrid__v num" style={{ fontSize: 14 }}>
                {carYear(car) || '—'}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Brand</div>
              <div className="specgrid__v" style={{ fontSize: 14 }}>
                {typeof car.brand === 'string' ? car.brand : car.brand?.name || '—'}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Plate</div>
              <div className="specgrid__v num" style={{ fontSize: 14 }}>
                {plate}
              </div>
            </div>
            <div className="specgrid__c">
              <div className="specgrid__k">Availability</div>
              <div className="specgrid__v" style={{ fontSize: 14 }}>
                {car.is_available === false ? 'Booked' : 'Ready now'}
              </div>
            </div>
          </div>

          {/* ---- the tiered rate card, straight from CarPrice ---- */}
          {tiers.length > 0 && (
            <>
              <h2 className="dh3" style={{ marginBottom: 6 }}>
                The longer you keep it, the less it costs
              </h2>
              <p className="small">
                The rate is set by how long you book for. Your {days}-day rental sits in the
                highlighted bracket — pick another to re-price it, or type an exact length below.
              </p>
              <div className="pricetiers">
                {tiers.map((tier, i) => {
                  // tierForDays falls back to this same bracket for anything past 30 days —
                  // correct for pricing (it is genuinely the rate in effect), but the 30+ card
                  // below is what should carry the highlight once the rental is that long, or
                  // two brackets would light up for one rental.
                  const isLastTier = i === tiers.length - 1
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      className={`pricetier${tier.active && !(isLastTier && overAMonth) ? ' is-on' : ''}`}
                      onClick={() => selectBracket(tier.key)}
                      disabled={!tier.amount}
                    >
                      <div className="pricetier__k">{tier.label}</div>
                      <div className="pricetier__v">
                        {tier.amount ? money(tier.amount, { cents: false }) : '—'}
                      </div>
                    </button>
                  )
                })}

                {/* CarPrice has no rate past half_to_one_month, so this reads the same figure
                    the backend already falls back to for anything longer (see tierForDays in
                    lib/pricing.js) — the bracket doesn't invent a price, it just names the one
                    that already applies. Picking a length this long is a date, not a nudge, so
                    it opens the calendar instead of jumping to a midpoint. */}
                <div className="pricetier-wrap">
                  <button
                    type="button"
                    className={`pricetier${overAMonth ? ' is-on' : ''}`}
                    onClick={() => setCalendarOpen((v) => !v)}
                    disabled={!tiers[tiers.length - 1]?.amount}
                    aria-expanded={calendarOpen}
                  >
                    <div className="pricetier__k">30+ days</div>
                    <div className="pricetier__v">
                      {tiers[tiers.length - 1]?.amount
                        ? money(tiers[tiers.length - 1].amount, { cents: false })
                        : '—'}
                    </div>
                  </button>
                  {calendarOpen && (
                    <MiniCalendar
                      value={toDate(draft.dropOffAt)}
                      min={calendarFloor}
                      onSelect={setDropOffDate}
                      onClose={() => setCalendarOpen(false)}
                    />
                  )}
                </div>
              </div>

              {/* A bracket only narrows things to a range — this is where the exact length
                  gets picked, either with the +/- buttons either side or by clicking a figure
                  and typing one in directly. Past a month it splits into months and days, each
                  editable on its own — typing in one can never spill into the other, since each
                  EditableDigits keeps its own buffer. */}
              <div className="daystepper">
                <div className="daystepper__label">Exact rental length</div>
                <div className="daystepper__controls">
                  <button
                    type="button"
                    className="daystepper__btn"
                    onClick={() => setExactDays(days - 1)}
                    disabled={days <= 1}
                    aria-label="One day fewer"
                  >
                    −
                  </button>

                  {/* Months : days, always visible — 00 until the rental actually clears a
                      month. No `key` on either field: the same instances stay mounted through
                      every +/- click, bracket pick or typed edit, which is what lets the
                      Odometer inside do its "spin once, then just tick over" thing (see
                      primitives.jsx) instead of re-spinning on every change. */}
                  <div className="daystepper__combo">
                    <span className="daystepper__unit">Months</span>
                    <EditableDigits
                      value={rentalMonths}
                      pad={2}
                      min={0}
                      max={Math.floor(MAX_RENTAL_DAYS / DAYS_PER_MONTH)}
                      size="sm"
                      onCommit={(m) => setExactDays(m * DAYS_PER_MONTH + rentalRestDays)}
                    />
                    <span className="daystepper__colon">:</span>
                    <EditableDigits
                      value={rentalRestDays}
                      pad={2}
                      min={0}
                      max={DAYS_PER_MONTH - 1}
                      unit="days"
                      size="sm"
                      onCommit={(d) => setExactDays(rentalMonths * DAYS_PER_MONTH + d)}
                    />
                  </div>

                  <button
                    type="button"
                    className="daystepper__btn"
                    onClick={() => setExactDays(days + 1)}
                    disabled={days >= MAX_RENTAL_DAYS}
                    aria-label="One day more"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ---- features from the CarFeature through-table ---- */}
          <h2 className="dh3" style={{ margin: '34px 0 6px' }}>
            Included in the price
          </h2>
          <p className="small">No counter upsell. These are on every KM0 rental.</p>
          <div className="inc">
            {(car.features || []).map((feature) => (
              <span className="inc__i" key={feature.name}>
                {feature.icon ? (
                  <img
                    src={mediaUrl(feature.icon)}
                    alt=""
                    width={16}
                    height={16}
                    style={{ marginTop: 2, flex: 'none' }}
                  />
                ) : (
                  <Icon name="check" size="sm" />
                )}
                <span>
                  <b>{feature.name}</b>
                  {feature.description ? ` — ${feature.description}` : ''}
                </span>
              </span>
            ))}
            <span className="inc__i">
              <Icon name="check" size="sm" />
              <span>
                <b>{km(priced.kmAllowance)} across {days} day{days === 1 ? '' : 's'}</b> — pooled, not
                daily
              </span>
            </span>
            <span className="inc__i">
              <Icon name="check" size="sm" />
              <span>
                <b>Damage cover</b> with a {money(car.deposit || 900, { cents: false })} excess
              </span>
            </span>
            <span className="inc__i">
              <Icon name="check" size="sm" />
              <span>
                <b>Breakdown assistance</b>, 24 hours
              </span>
            </span>
            <span className="inc__i">
              <Icon name="check" size="sm" />
              <span>
                <b>Full tank at pick-up</b>, return it full
              </span>
            </span>
          </div>

          {/* ---- good to know ---- */}
          <h2 className="dh3" style={{ margin: '34px 0 14px' }}>
            Good to know
          </h2>
          <div className="acc">
            {FAQ.map((item, i) => (
              <div key={item.q}>
                <button
                  type="button"
                  className="acc__r"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  <span className="acc__t">{item.q}</span>
                  <Icon name={open === i ? 'chevD' : 'chev'} size="sm" style={{ color: 'var(--ink-45)' }} />
                </button>
                {open === i && <div className="acc__body">{item.a}</div>}
              </div>
            ))}
          </div>

          {/* ---- similar_cars, computed server-side from the category ---- */}
          {similar.length > 0 && (
            <>
              <h2 className="dh3" style={{ margin: '34px 0 14px' }}>
                Similar cars at this station
              </h2>
              <div className="cats">
                {similar.map((other) => (
                  <Link key={other.id} to={`/cars/${other.id}`} className="cat">
                    <CarArt shape={bodyShape(other)} className="cat__art" />
                    <div>
                      <div className="cat__n">{other.model}</div>
                      <div className="cat__p">
                        {other.daily_price != null
                          ? `${money(other.daily_price, { cents: false })} / day`
                          : 'see price'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---------------------------------------------------- booking rail */}
        {/* Keyed on the car: switching to a different one (e.g. from "similar cars") remounts
            the rail, which is what replays both odometers' reveal. Changing the day count on
            the SAME car does not touch this key, so +/- clicks and typed edits just tick the
            digits over instead of re-spinning them. */}
        <BookingRail
          key={car.id}
          head={
            <RateHead perDay={priced.perDay} note="Held for 20 minutes after you reserve." />
          }
          when={{
            pickUpAt: draft.pickUpAt,
            dropOffAt: draft.dropOffAt,
            station: draft.station,
            dropStation: draft.dropStation,
            action: (
              <Link to="/" className="btn btn--outline btn--sm btn--block" style={{ marginTop: 8 }}>
                Change dates or station
              </Link>
            ),
          }}
          quote={priced}
          footer={
            <>
              <Button variant="signal" size="lg" block onClick={reserve}>
                Reserve now
              </Button>
              <p className="small" style={{ textAlign: 'center', marginTop: 10 }}>
                No card needed. Cancel free until 24 hours before {formatWhen(draft.pickUpAt)}.
              </p>
            </>
          }
        />
      </div>

      <Footer />
      <TabBar />

      <Lightbox
        images={validImages}
        index={lightboxAt}
        onClose={() => setLightboxAt(null)}
        onNav={(delta) =>
          setLightboxAt((i) => (i + delta + validImages.length) % validImages.length)
        }
      />
    </div>
  )
}
