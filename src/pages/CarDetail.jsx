import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { cars as carsApi } from '../api/endpoints'
import BookingRail, { RateHead } from '../components/BookingRail'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Alert, Button, CarArt, Icon, Plate, Spinner, Tag } from '../components/primitives'
import { formatWhen } from '../lib/dates'
import {
  bodyShape,
  carImages,
  carTitle,
  carYear,
  categoryName,
  fuelIcon,
  fuelLabel,
  plateFor,
  transmissionLabel,
} from '../lib/fleet'
import { coverOptions, km, money, quote, rateTable } from '../lib/pricing'
import { useAuth } from '../state/AuthContext'
import { useBooking } from '../state/BookingContext'

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
  const { draft, days } = useBooking()
  const { isAuthenticated, isRegistered } = useAuth()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [shot, setShot] = useState(0)
  const [open, setOpen] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setShot(0)

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

          <div className="hero-car">
            <Plate number={plate} className="hero-car__plate" />
            {images[shot] ? (
              <img className="hero-car__photo" src={images[shot]} alt={title} />
            ) : (
              <CarArt shape={shape} />
            )}
          </div>

          <div className="thumbs">
            {images.length > 0
              ? images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={`thumb${i === shot ? ' is-on' : ''}`}
                    onClick={() => setShot(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))
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
                highlighted bracket.
              </p>
              <div className="pricetiers">
                {tiers.map((tier) => (
                  <div key={tier.key} className={`pricetier${tier.active ? ' is-on' : ''}`}>
                    <div className="pricetier__k">{tier.label}</div>
                    <div className="pricetier__v">
                      {tier.amount ? money(tier.amount, { cents: false }) : '—'}
                    </div>
                  </div>
                ))}
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
        <BookingRail
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
    </div>
  )
}
