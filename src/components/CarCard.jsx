import { Link } from 'react-router-dom'
import { money, rateForDays } from '../lib/pricing'
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
import { Button, CarArt, Gauge, Icon, Plate, Tag } from './primitives'

/**
 * One car in the results grid.
 *
 * `wide` renders the design's featured row — the first result, which the design gives a
 * "best value" badge and a horizontal layout.
 */
export default function CarCard({ car, days, wide = false, featured = false }) {
  const perDay = rateForDays(car, days)
  const total = perDay != null && days ? perDay * days : null
  const images = carImages(car)
  const shape = bodyShape(car)
  const plate = plateFor(car.id)
  const category = categoryName(car)
  const year = carYear(car)

  const specs = [
    { icon: 'seat', label: '5 seats' },
    { icon: 'gear', label: transmissionLabel(car.transmission_type) },
    { icon: fuelIcon(car.fuel_type), label: fuelLabel(car.fuel_type) },
    {
      icon: car.limit_km ? 'route' : 'bag',
      label: car.limit_km ? `${car.limit_km} km / day` : '2 large bags',
    },
  ]

  return (
    <div className={`car${wide ? ' car--wide' : ''}`}>
      <div className="car__art">
        {featured && (
          <Tag tone="signal" className="car__badge">
            Best value for {days} day{days === 1 ? '' : 's'}
          </Tag>
        )}
        {!featured && car.fuel_type === 'electric' && (
          <Tag tone="pine" icon="bolt" className="car__badge">
            Electric
          </Tag>
        )}
        {images[0] ? (
          <img className="car__photo" src={images[0]} alt="" loading="lazy" />
        ) : (
          <CarArt shape={shape} />
        )}
        <Plate number={plate} className="car__plate" />
      </div>

      <div className="car__body">
        <div className="car__head">
          <div>
            <div className="car__cls">{category || 'Fleet'}</div>
            <div className="car__n">{carTitle(car)}</div>
            <p className="car__alt">{year ? `${year} plate` : 'or similar'}</p>
          </div>
          {wide && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag tone="sage" icon="check">
                Free cancellation
              </Tag>
              {car.deposit > 0 && <Tag>{money(car.deposit, { cents: false })} excess</Tag>}
            </div>
          )}
        </div>

        <div className={`car__specs${wide ? ' car__specs--4' : ''}`}>
          {specs.map((spec) => (
            <span key={spec.label}>
              <Icon name={spec.icon} size="sm" />
              {spec.label}
            </span>
          ))}
        </div>

        <div className="car__foot">
          {wide ? (
            <Gauge filled={3} caption="3 left at this price" />
          ) : (
            <div>
              <div className="car__price">
                <span className="car__amt">{perDay != null ? money(perDay, { cents: false }) : '—'}</span>
                <span className="car__per">/ day</span>
              </div>
              <div className="car__tot num">{total != null ? `${money(total, { cents: false })} total` : ' '}</div>
            </div>
          )}

          {wide ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="car__price" style={{ justifyContent: 'flex-end' }}>
                  <span className="car__amt">{perDay != null ? money(perDay, { cents: false }) : '—'}</span>
                  <span className="car__per">/ day</span>
                </div>
                <div className="car__tot num">
                  {total != null ? `${money(total, { cents: false })} total · pay at pick-up` : ' '}
                </div>
              </div>
              <Link to={`/cars/${car.id}`} className="btn btn--signal">
                View this car
              </Link>
            </div>
          ) : (
            <Link to={`/cars/${car.id}`} className="btn btn--outline btn--sm">
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function CarCardSkeleton({ wide = false }) {
  return (
    <div className={`car${wide ? ' car--wide' : ''}`} aria-hidden="true">
      <div className="car__art">
        <div className="skel" style={{ height: 78 }} />
      </div>
      <div className="car__body">
        <div className="skel" style={{ height: 10, width: 90, marginBottom: 10 }} />
        <div className="skel" style={{ height: 20, width: '70%', marginBottom: 14 }} />
        <div className="skel" style={{ height: 44, marginBottom: 16 }} />
        <div className="car__foot">
          <div className="skel" style={{ height: 28, width: 90 }} />
          <div className="skel" style={{ height: 32, width: 70 }} />
        </div>
      </div>
    </div>
  )
}
