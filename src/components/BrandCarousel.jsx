import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl } from '../api/client'
import { cars as carsApi, toList } from '../api/endpoints'
import Marquee from './Marquee'
import { Icon } from './primitives'

/** Pixels per second. Negative carries the badges right to left. */
const BRAND_PXS = -18

/**
 * The band of brand badges that stands where the search panel used to.
 *
 * Picking one opens /cars with `?brand=` already set — the list filters on it server-side, and
 * every other filter is left for the customer.
 */
export default function BrandCarousel() {
  const [brands, setBrands] = useState([])
  // Brands whose logo file 404s. The API hands back a URL for every brand, so a missing file
  // only shows up when the image fails to load — at which point the badge falls back to the
  // initial rather than a broken-image glyph.
  const [noLogo, setNoLogo] = useState(() => new Set())

  useEffect(() => {
    const ac = new AbortController()
    carsApi
      .brands({ signal: ac.signal })
      .then((data) => setBrands(toList(data)))
      .catch(() => setBrands([]))
    return () => ac.abort()
  }, [])

  // Nothing to show yet, or the request failed — the band is a shortcut, not the only way to
  // the fleet, so it simply stays out of the way rather than explaining itself.
  if (!brands.length) return null

  return (
    <div className="sec brands">
      <div className="sec__head">
        <div>
          <p className="eyebrow" style={{ margin: '0 0 10px' }}>
            The badges
          </p>
          <h2 className="dh2">Or start from a brand</h2>
        </div>
        <Link to="/cars" className="sec__more">
          See all cars <Icon name="chev" size="sm" />
        </Link>
      </div>

      <Marquee speed={BRAND_PXS} label="Brands on the fleet">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={`/cars?brand=${encodeURIComponent(brand.name)}`}
            className="cat cat--badge"
          >
            {brand.logo && !noLogo.has(brand.id) ? (
              <img
                src={mediaUrl(brand.logo)}
                alt=""
                className="cat__logo"
                loading="lazy"
                draggable={false}
                onError={() => setNoLogo((s) => new Set(s).add(brand.id))}
              />
            ) : (
              <span className="cat__logo cat__logo--none" aria-hidden="true">
                {brand.name.slice(0, 1)}
              </span>
            )}
            <div className="cat__n">{brand.name}</div>
          </Link>
        ))}
      </Marquee>
    </div>
  )
}
