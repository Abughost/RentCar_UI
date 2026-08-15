import Footer from '../components/Footer'
import Nav from '../components/Nav'
import {
  Button,
  CarArt,
  Chip,
  Field,
  Gauge,
  Icon,
  Odometer,
  Plate,
  Tag,
} from '../components/primitives'

const PRIMARY = [
  { name: 'pine-900', hex: '#0A1D18', use: 'Hero panels, footer, night surfaces' },
  { name: 'pine-800', hex: '#102E27', use: 'Secondary buttons, plate band' },
  { name: 'pine-700', hex: '#194A3E', use: 'Focus rings, meters, active state' },
  { name: 'signal', hex: '#F4CB2E', use: 'Primary action only — one per view' },
  { name: 'bone-100', hex: '#E9EBE4', use: 'Page background' },
  { name: 'ink', hex: '#151915', use: 'Body copy, headings' },
]

const SECONDARY = [
  { name: 'bone-050', hex: '#F5F6F1' },
  { name: 'bone-200', hex: '#DBDED4' },
  { name: 'bone-300', hex: '#C5CABB' },
  { name: 'sage', hex: '#6FA98F', use: 'Available, confirmed' },
  { name: 'brick', hex: '#B14A33', use: 'Errors, expiry, low stock' },
  { name: 'ink-45', hex: '#7C847B', use: 'Captions, meta' },
]

/** Frame 00 — the shelf every other screen is assembled from. */
export default function DesignSystem() {
  return (
    <div className="page">
      <Nav />

      <div className="fnd">
        <div className="fnd__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 12px' }}>
              Design system
            </p>
            <div className="fnd__brand">
              KM<em>0</em>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Odometer value="0001.0" size="sm" style={{ justifyContent: 'flex-end' }} />
            <p className="small" style={{ marginTop: 8 }}>
              Version 1.0 · live components
            </p>
          </div>
        </div>

        {/* ---- colour ---- */}
        <div className="fnd__sec">
          <div className="fnd__secTitle">
            <span className="eyebrow">Colour</span>
            <span className="fnd__rule" />
          </div>
          <div className="swatches">
            {PRIMARY.map((sw) => (
              <div key={sw.name}>
                <div className="sw__chip" style={{ background: sw.hex }} />
                <div className="sw__name">{sw.name}</div>
                <div className="sw__hex">{sw.hex}</div>
                <div className="sw__use">{sw.use}</div>
              </div>
            ))}
          </div>
          <div className="swatches" style={{ marginTop: 22 }}>
            {SECONDARY.map((sw) => (
              <div key={sw.name}>
                <div className="sw__chip sw__chip--sm" style={{ background: sw.hex }} />
                <div className="sw__name">{sw.name}</div>
                <div className="sw__hex">{sw.hex}</div>
                {sw.use && <div className="sw__use">{sw.use}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ---- type ---- */}
        <div className="fnd__sec">
          <div className="fnd__secTitle">
            <span className="eyebrow">Typography</span>
            <span className="fnd__rule" />
          </div>
          <div className="typeSpec">
            <div className="typeSpec__k">
              Display / XL
              <br />
              Archivo 800 · wdth 108
              <br />
              66/62 · −3%
            </div>
            <div className="dh1">Pick it up at zero</div>

            <div className="typeSpec__k">
              Display / L
              <br />
              Archivo 700 · wdth 110
              <br />
              38/40 · −2%
            </div>
            <div className="dh2">Cars ready in four cities</div>

            <div className="typeSpec__k">
              Display / M
              <br />
              Archivo 700
              <br />
              24/27
            </div>
            <div className="dh3">Your trip starts Friday</div>

            <div className="typeSpec__k">
              Body / L
              <br />
              Instrument Sans 400
              <br />
              17/26
            </div>
            <div className="lede">
              Book a car in under a minute. Free cancellation up to 24 hours before pick-up, 250 km
              included every day, and no fuel deposit at any KM0 station.
            </div>

            <div className="typeSpec__k">
              Data / numerals
              <br />
              Martian Mono 600
              <br />
              tabular
            </div>
            <div className="num" style={{ fontSize: 20, fontWeight: 600 }}>
              $41.00 &nbsp; 250 km &nbsp; 09:30 &nbsp; KM0-4471
            </div>

            <div className="typeSpec__k">
              Eyebrow
              <br />
              Martian Mono 600
              <br />
              10 · .14em caps
            </div>
            <div className="eyebrow">Pick-up station</div>
          </div>
        </div>

        {/* ---- components ---- */}
        <div className="fnd__sec">
          <div className="fnd__secTitle">
            <span className="eyebrow">Components</span>
            <span className="fnd__rule" />
          </div>
          <div className="shelf">
            <div className="shelf__cell">
              <div className="shelf__cap">Buttons</div>
              <div className="shelf__stack">
                <Button variant="signal">Search cars</Button>
                <Button variant="pine">Reserve now</Button>
                <Button variant="outline">Compare</Button>
                <Button variant="outline" size="sm">
                  Change dates
                </Button>
              </div>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Input · states</div>
              <div className="shelf__stack" style={{ width: '100%' }}>
                <Field
                  label="Pick-up station"
                  icon="pin"
                  defaultValue="Northgate Garage"
                  readOnly
                />
                <Field
                  label="Driving licence no."
                  defaultValue="DL-2214"
                  readOnly
                  error="Licence numbers are 9 characters. Check the front of the card."
                />
              </div>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Plate chip · gauge</div>
              <div className="shelf__stack">
                <Plate number="12 B 640" />
                <Plate number="77 E 019" />
                <Gauge filled={4} caption="4 of 6 left" />
                <Gauge filled={1} caption="Last one" />
              </div>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Odometer · tags</div>
              <div className="shelf__stack">
                <Odometer value="041.0" unit="USD / DAY" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  <Tag tone="sage" icon="check">
                    Free cancellation
                  </Tag>
                  <Tag tone="signal">Best rate</Tag>
                  <Tag tone="pine">Electric</Tag>
                  <Tag tone="brick">Licence expires soon</Tag>
                  <Tag>250 km / day</Tag>
                </div>
              </div>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Fleet illustration</div>
              <div className="shelf__fleet">
                <CarArt shape="sedan" />
                <CarArt shape="suv" />
                <CarArt shape="hatch" />
                <CarArt shape="van" />
              </div>
              <p className="small" style={{ marginTop: 10 }}>
                Drawn, never photographed — one silhouette per body type keeps a 900-car fleet
                visually consistent.
              </p>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Spec row</div>
              <div className="shelf__specs">
                <span>
                  <Icon name="seat" size="sm" />5 seats
                </span>
                <span>
                  <Icon name="gear" size="sm" />
                  Automatic
                </span>
                <span>
                  <Icon name="fuel" size="sm" />
                  Diesel
                </span>
                <span>
                  <Icon name="bag" size="sm" />2 large bags
                </span>
                <span>
                  <Icon name="door" size="sm" />4 doors
                </span>
                <span>
                  <Icon name="bolt" size="sm" />
                  410 km range
                </span>
              </div>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Radius &amp; spacing</div>
              <div className="shelf__radii">
                <i style={{ background: 'var(--pine-800)', borderRadius: 4 }} />
                <i style={{ background: 'var(--pine-700)', borderRadius: 8 }} />
                <i style={{ background: 'var(--pine-600)', borderRadius: 12 }} />
                <i style={{ background: 'var(--sage)', borderRadius: 18 }} />
              </div>
              <p className="small">
                4 / 8 / 12 / 18 px. Spacing steps on a 4px base: 4 8 12 16 24 32 48 64.
              </p>
            </div>

            <div className="shelf__cell">
              <div className="shelf__cap">Chips &amp; voice</div>
              <div className="chips" style={{ marginBottom: 14 }}>
                <Chip on>Automatic</Chip>
                <Chip>Manual</Chip>
                <Chip on>Saloon</Chip>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: '0 0 10px' }}>
                Plain verbs, sentence case, no apologies. A button names exactly what happens.
              </p>
              <p className="small" style={{ margin: '0 0 6px' }}>
                <strong style={{ color: 'var(--sage)' }}>Yes</strong> — "Reserve now, pay at the
                counter"
              </p>
              <p className="small" style={{ margin: 0 }}>
                <strong style={{ color: 'var(--brick)' }}>No</strong> — "Submit your request"
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
