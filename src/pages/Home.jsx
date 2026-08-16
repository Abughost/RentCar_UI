import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cars as carsApi, news as newsApi, toList } from '../api/endpoints'
import { mediaUrl } from '../api/client'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import BrandCarousel from '../components/BrandCarousel'
import Marquee from '../components/Marquee'
import TabBar from '../components/TabBar'
import { CarArt, Gauge, Icon, Odometer } from '../components/primitives'
import { STATIONS, readyGauge } from '../lib/fleet'
import { dailyRate, money } from '../lib/pricing'
import { useBooking } from '../state/BookingContext'

/** Pixels per second for the body-shape band — positive, so it runs against the brand band. */
const SHAPE_PXS = 18

/** Frame 03. */
export default function Home() {
  const [categories, setCategories] = useState([])
  const [fleet, setFleet] = useState([])
  const [stories, setStories] = useState([])
  const navigate = useNavigate()
  const { update } = useBooking()

  useEffect(() => {
    const ac = new AbortController()

    // Categories and a page of cars together give the shelf its "from $x / day" figures.
    Promise.all([
      carsApi.categories({ signal: ac.signal }).catch(() => []),
      carsApi.list({ page_size: 40 }, { signal: ac.signal }).catch(() => null),
      newsApi.list({ signal: ac.signal }).catch(() => null),
    ]).then(([cats, carPage, newsPage]) => {
      if (ac.signal.aborted) return
      setCategories(toList(cats))
      setFleet(toList(carPage))
      setStories(toList(newsPage).slice(0, 3))
    })

    return () => ac.abort()
  }, [])

  /** Cheapest daily rate per category, so the shelf shows a real "from" price. */
  const priceByCategory = fleet.reduce((acc, car) => {
    const name = typeof car.category === 'string' ? car.category : car.category?.name
    const rate = dailyRate(car)
    if (!name || rate == null) return acc
    acc[name] = acc[name] == null ? rate : Math.min(acc[name], rate)
    return acc
  }, {})

  // The shelf used to be four cards across a grid. As a band it wants the whole list — a short
  // lap has to be repeated more times to cover the stage, which reads as an obvious loop.
  const shelf = categories

  return (
    <div className="page">
      <div className="hero">
        <Nav tone="dark" />
        <div className="hero__inner">
          <div>
            <Odometer value="000000" size="lg" unit="KM ON THE CLOCK" roll />
            <h1 className="hero__h1">
              Every trip
              <br />
              starts at <em>zero</em>.
            </h1>
            <p className="hero__p">
              Pick up from eleven stations across four cities. {fleet[0]?.limit_km || 250} km included
              every day, free cancellation until 24 hours before, and the price you see is the price
              you pay at the counter.
            </p>
          </div>
          <div>
            <CarArt shape="sedan" className="hero__car" />
          </div>
        </div>
        <div className="hero__road" />
      </div>

      <BrandCarousel />

      {/* ---- the fleet ---- */}
      <div className="sec">
        <div className="sec__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>
              The fleet
            </p>
            <h2 className="dh2">Pick a shape, not a brand</h2>
          </div>
          <Link to="/cars" className="sec__more">
            See all cars <Icon name="chev" size="sm" />
          </Link>
        </div>

        {/* Travels the opposite way to the brand band above it, so the two read as a pair
            rather than one long scroll. */}
        <Marquee speed={SHAPE_PXS} label="Body shapes">
          {shelf.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/cars?category=${encodeURIComponent(cat.name)}`}
              className="cat"
            >
              <CarArt
                shape={['hatch', 'sedan', 'suv', 'van'][i % 4]}
                className="cat__art"
              />
              <div>
                <div className="cat__n">{cat.name}</div>
                <div className="cat__p">
                  {priceByCategory[cat.name] != null
                    ? `from ${money(priceByCategory[cat.name], { cents: false })} / day`
                    : 'see prices'}
                </div>
              </div>
            </Link>
          ))}

          <Link to="/cars?fuel_type=electric" className="cat cat--electric">
            <Icon name="bolt" size="lg" style={{ color: 'var(--signal)' }} />
            <div>
              <div className="cat__n">Electric</div>
              <div className="cat__p">Charging included</div>
            </div>
          </Link>
        </Marquee>
      </div>

      {/* ---- the promise ---- */}
      <div className="sec sec--tight">
        <div className="value">
          <div className="value__c">
            <Icon name="route" size="lg" style={{ color: 'var(--signal)' }} />
            <div className="value__n">250 km every day, counted once</div>
            <p className="value__t">
              Allowance pools across the whole rental. Drive 600 km on Saturday and 20 on Sunday —
              four days still gives you 1,000.
            </p>
          </div>
          <div className="value__c">
            <Icon name="shield" size="lg" style={{ color: 'var(--signal)' }} />
            <div className="value__n">One price, agreed up front</div>
            <p className="value__t">
              Insurance, second driver and airport surcharge are shown before you reserve. The
              counter cannot add to it.
            </p>
          </div>
          <div className="value__c">
            <Icon name="key" size="lg" style={{ color: 'var(--signal)' }} />
            <div className="value__n">Skip the desk entirely</div>
            <p className="value__t">
              Once your licence is verified, the app opens the car. Your plate number appears an
              hour before pick-up.
            </p>
          </div>
        </div>
      </div>

      {/* ---- stations ---- */}
      <div className="sec sec--tight">
        <div className="sec__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>
              Stations
            </p>
            <h2 className="dh2">Eleven places to start</h2>
          </div>
        </div>
        <div className="stations">
          {STATIONS.slice(0, 4).map((station) => (
            <button
              key={station.id}
              type="button"
              className="station"
              onClick={() => {
                update({ station: station.name, dropStation: station.name })
                navigate('/cars')
              }}
            >
              <div className="station__c">{station.name}</div>
              <div className="station__a">
                {station.address} · {station.hours}
              </div>
              <Gauge filled={readyGauge(station.ready)} caption={`${station.ready} cars ready`} />
            </button>
          ))}
        </div>
      </div>

      {/* ---- news, straight from the CKEditor-authored articles ---- */}
      {stories.length > 0 && (
        <div className="sec sec--tight">
          <div className="sec__head">
            <div>
              <p className="eyebrow" style={{ margin: '0 0 10px' }}>
                From the road
              </p>
              <h2 className="dh2">What's new at KM0</h2>
            </div>
            <Link to="/news" className="sec__more">
              All stories <Icon name="chev" size="sm" />
            </Link>
          </div>
          <div className="news">
            {stories.map((story) => (
              <Link key={story.id} to={`/news/${story.id}`} className="news__c">
                {story.image ? (
                  <img className="news__img" src={mediaUrl(story.image)} alt="" loading="lazy" />
                ) : (
                  <div className="news__img" />
                )}
                <div className="news__body">
                  <p className="eyebrow">News</p>
                  <h3 className="news__t">{story.title}</h3>
                  <p
                    className="news__x"
                    // description is a CKEditor5Field, so it arrives as trusted HTML
                    // authored by staff in the Django admin.
                    dangerouslySetInnerHTML={{ __html: story.description }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Footer />
      <TabBar />
    </div>
  )
}
