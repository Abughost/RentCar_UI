import { Icon } from '../../components/primitives'
import { STATUS_LABEL } from '../../lib/owner'

/**
 * The drawn city backdrop from frame 12/14 — a schematic street grid, not a real map, since
 * the backend has no GPS or geocoding. `fleet` pins are positioned from each car's stable
 * `pin` percentage (derived from its id in `lib/owner.js`), so they hold still on reload.
 */
export default function CityMap({ fleet }) {
  return (
    <div className="map" style={{ marginBottom: 8 }}>
      <CityMapBackdrop />

      {fleet.map((c) => (
        <div className="map__pin" style={{ left: `${c.pin.left}%`, top: `${c.pin.top}%` }} key={c.id}>
          <span
            className={`map__dot${c.status === 'on_rent' ? ' map__dot--live' : c.status === 'paused' ? ' map__dot--off' : ''}`}
          >
            <Icon name={c.status === 'paused' ? 'fuel' : 'key'} size="sm" />
          </span>
          <span className="map__lab">
            {c.plate} · {c.status === 'on_rent' ? `MOVING · ${c.speed} KM/H` : STATUS_LABEL[c.status].toUpperCase()}
          </span>
        </div>
      ))}

      <div className="map__legend">
        <span className="map__lg">
          <span className="map__sw" style={{ background: 'var(--signal)' }} />
          On rent
        </span>
        <span className="map__lg">
          <span className="map__sw" style={{ background: 'var(--pine-800)' }} />
          Free to book
        </span>
        <span className="map__lg">
          <span className="map__sw" style={{ background: 'var(--bone-300)' }} />
          Paused
        </span>
      </div>
      <div className="map__ctl">
        <span className="map__cb">
          <Icon name="plus" size="sm" />
        </span>
        <span className="map__cb">
          <Icon name="slider" size="sm" style={{ transform: 'rotate(90deg)' }} />
        </span>
      </div>
    </div>
  )
}

/** The static street/water backdrop — identical on every owner map, so it is drawn once. */
export function CityMapBackdrop() {
  return (
    <svg className="map__svg" viewBox="0 0 1180 400" preserveAspectRatio="none" aria-label="City map">
      <rect className="map__block" x="60" y="40" width="180" height="110" rx="4" />
      <rect className="map__block" x="300" y="40" width="240" height="80" rx="4" />
      <rect className="map__block" x="620" y="60" width="150" height="130" rx="4" />
      <rect className="map__block" x="850" y="30" width="230" height="100" rx="4" />
      <rect className="map__park" x="300" y="180" width="200" height="160" rx="8" />
      <rect className="map__block" x="80" y="230" width="150" height="120" rx="4" />
      <rect className="map__block" x="600" y="250" width="180" height="110" rx="4" />
      <rect className="map__block" x="880" y="200" width="200" height="150" rx="4" />
      <path
        className="map__water"
        d="M0 150 C160 130 240 200 400 175 C560 150 700 220 900 195 C1030 178 1120 205 1180 190 L1180 232 C1120 247 1030 220 900 237 C700 262 560 192 400 217 C240 242 160 172 0 192 Z"
      />
      <g className="map__road" strokeWidth="9">
        <path d="M0 165 H1180" />
        <path d="M270 0 V400" />
        <path d="M820 0 V400" />
      </g>
      <g className="map__road" strokeWidth="5" opacity=".8">
        <path d="M0 210 H1180" />
        <path d="M0 370 H1180" />
        <path d="M560 0 V400" />
        <path d="M1060 0 V400" />
        <path d="M60 0 V400" />
        <path d="M0 30 H1180" />
      </g>
      <g className="map__road" strokeWidth="3" opacity=".55">
        <path d="M0 100 H1180" />
        <path d="M0 300 H1180" />
        <path d="M160 0 V400" />
        <path d="M420 0 V400" />
        <path d="M700 0 V400" />
        <path d="M940 0 V400" />
      </g>
    </svg>
  )
}
