import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cars as carsApi, toList } from '../../api/endpoints'
import { Alert, Button, CarArt, Icon, Plate, SelectField, Steps } from '../../components/primitives'
import { plateFor } from '../../lib/fleet'
import { money } from '../../lib/pricing'
import { useOwner } from './useOwnerFleet'

const STEP_LABELS = ['The car', 'Price', 'Photos & review']

const FUELS = [
  { value: 'gas', label: 'Petrol' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
]

const TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
]

const THIS_YEAR = new Date().getFullYear()

/**
 * Lists a real car — `POST /cars`, multipart so the photos ride along with it.
 *
 * There used to be no route here a member could reach (`IsAdminOrReadOnly`), so "Publish"
 * wrote the listing to `localStorage` instead: a plate "lookup" that always matched nothing,
 * a photo *count* rather than actual files, and a model name invented from the last four
 * characters of whatever was typed. None of that is real, so none of it survived this
 * rewrite — brand, category and colour now come from the same reference endpoints the
 * search filters use, and a photo has to actually be a file before it counts as one.
 */
export default function ListCar() {
  const navigate = useNavigate()
  const { refresh } = useOwner()
  const [step, setStep] = useState(0)

  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [colors, setColors] = useState([])
  const [refError, setRefError] = useState(null)

  const [model, setModel] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [year, setYear] = useState(THIS_YEAR)
  const [fuelType, setFuelType] = useState('gas')
  const [transmissionType, setTransmissionType] = useState('automatic')

  const [dailyPrice, setDailyPrice] = useState(100000)
  const [deposit, setDeposit] = useState(900)
  const [limitKm, setLimitKm] = useState(250)

  const [photos, setPhotos] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState(null)
  const [published, setPublished] = useState(null)

  useEffect(() => {
    Promise.all([carsApi.brands(), carsApi.categories(), carsApi.colors()])
      .then(([b, c, col]) => {
        setBrands(toList(b))
        setCategories(toList(c))
        setColors(toList(col))
      })
      .catch((err) => setRefError(err.message))
  }, [])

  // Free the object URLs a photo preview created for it once that photo is gone.
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  function addPhotos(files) {
    const next = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPhotos((list) => [...list, ...next])
  }

  function removePhoto(index) {
    setPhotos((list) => {
      URL.revokeObjectURL(list[index].url)
      return list.filter((_, i) => i !== index)
    })
  }

  const carReady = model.trim() && brand && category && color
  const priceReady = dailyPrice > 0
  const youKeep = Math.round(dailyPrice * 0.8)

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)

    const form = new FormData()
    form.set('model', model.trim())
    form.set('brand', brand)
    form.set('category', category)
    form.set('color', color)
    form.set('year', `${year}-01-01`)
    form.set('fuel_type', fuelType)
    form.set('transmission_type', transmissionType)
    form.set('deposit', deposit)
    form.set('limit_km', limitKm)
    form.set('daily_price', dailyPrice)
    photos.forEach((p) => form.append('images', p.file))

    try {
      const car = await carsApi.create(form)
      refresh()
      setPublished(car)
    } catch (err) {
      setPublishError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (published) {
    return (
      <div className="addwrap" style={{ gridTemplateColumns: '1fr', maxWidth: 560, margin: '0 auto' }}>
        <div className="empty">
          <Icon name="check" size="lg" style={{ color: 'var(--verified)' }} />
          <h2 className="dh3" style={{ margin: '14px 0 8px' }}>
            {published.model} is live
          </h2>
          <p className="small" style={{ marginBottom: 18 }}>
            It's on the fleet at {money(dailyPrice, { cents: false })} a day — you keep{' '}
            {money(youKeep, { cents: false })} of that. It shows up in My cars now.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to="/owner/cars" className="btn btn--pine">
              Open my cars
            </Link>
            <Link to="/owner" className="btn btn--outline">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="addwrap">
      <div>
        <Steps items={STEP_LABELS} current={step} />

        {refError && (
          <div style={{ margin: '20px 0' }}>
            <Alert>Couldn't load brands, body types or colours: {refError}</Alert>
          </div>
        )}

        {step === 0 && (
          <>
            <p className="eyebrow" style={{ margin: '20px 0 10px' }}>
              Earn from a car that's parked
            </p>
            <h1 className="dh2" style={{ marginBottom: 8 }}>
              Put your car on KM0
            </h1>
            <p className="lede" style={{ marginBottom: 26, maxWidth: '56ch' }}>
              A car parked most of the day can earn while you don't need it. Tell renters what
              it is — everything below is what shows up on the listing.
            </p>

            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel__h">
                <span className="panel__n">1</span>
                <h2 className="dh3">The basics</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label className="fld">
                  <span className="fld__lab">Model</span>
                  <div className="fld__box">
                    <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Cruze" />
                  </div>
                </label>
                <label className="fld">
                  <span className="fld__lab">Year</span>
                  <div className="fld__box">
                    <input
                      type="number"
                      min={1990}
                      max={THIS_YEAR + 1}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                    />
                  </div>
                </label>
                <SelectField label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">Choose a brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Body type" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Choose a body type</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Colour" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="">Choose a colour</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Gearbox" value={transmissionType} onChange={(e) => setTransmissionType(e.target.value)}>
                  {TRANSMISSIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  {FUELS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="panel">
              <div className="panel__h">
                <span className="panel__n">2</span>
                <h2 className="dh3">Your daily price</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="fld__box" style={{ maxWidth: 220 }}>
                  <input
                    type="number"
                    min={0}
                    value={dailyPrice}
                    onChange={(e) => setDailyPrice(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <span className="small">/ day</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <span className="tag tag--sage">Renters pay {money(dailyPrice, { cents: false })}</span>
                <span className="tag">KM0 fee 20%</span>
                <span className="tag tag--signal">You keep {money(youKeep, { cents: false })} a day</span>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel__h">
                <span className="panel__n">3</span>
                <h2 className="dh3">Deposit &amp; allowance</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label className="fld">
                  <span className="fld__lab">Damage deposit</span>
                  <div className="fld__box">
                    <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))} />
                  </div>
                </label>
                <label className="fld">
                  <span className="fld__lab">Kilometres included / day</span>
                  <div className="fld__box">
                    <input type="number" min={0} value={limitKm} onChange={(e) => setLimitKm(Math.max(0, Number(e.target.value)))} />
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel__h">
              <span className="panel__n">4</span>
              <h2 className="dh3">Photos</h2>
            </div>
            <p className="small" style={{ margin: '-12px 0 16px' }}>
              Real photos of this car. Optional, but a listing with none rarely gets booked.
            </p>
            <div className="photos">
              {photos.map((p, i) => (
                <button
                  key={p.url}
                  type="button"
                  className={`photo photo--filled${i === 0 ? ' photo--main' : ''}`}
                  onClick={() => removePhoto(i)}
                  title="Remove photo"
                >
                  {i === 0 && <span className="photo__tag">COVER</span>}
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
              <label className="photo" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    addPhotos(e.target.files)
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
                <Icon name="plus" size="lg" />
                <span style={{ fontSize: 10.5 }}>Add photos</span>
              </label>
            </div>

            {publishError && (
              <div style={{ marginTop: 16 }}>
                <Alert>{publishError}</Alert>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          {step > 0 && (
            <Button onClick={() => setStep((s) => s - 1)}>
              <Icon name="chev" size="sm" style={{ transform: 'rotate(180deg)' }} />
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              variant="signal"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 ? !carReady : !priceReady}
            >
              Continue
            </Button>
          ) : (
            <Button variant="signal" onClick={handlePublish} disabled={publishing || !carReady || !priceReady}>
              {publishing ? 'Publishing…' : 'Publish listing'}
            </Button>
          )}
        </div>
      </div>

      {/* live preview */}
      <aside style={{ position: 'sticky', top: 20 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>
          How renters will see it
        </p>
        <div className="car" style={{ marginBottom: 16 }}>
          <div className="car__art">
            {photos[0] ? (
              <img src={photos[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <CarArt shape="sedan" />
            )}
            <Plate number={plateFor(model || 'draft')} className="car__plate" />
          </div>
          <div className="car__body">
            <div className="car__cls">Listed by you</div>
            <div className="car__n">{model || 'Your car'}</div>
            <p className="car__alt">Draft listing</p>
            <div className="car__foot">
              <div>
                <div className="car__price">
                  <span className="car__amt">{money(dailyPrice, { cents: false })}</span>
                  <span className="car__per">/ day</span>
                </div>
                <div className="car__tot num">you keep {money(youKeep, { cents: false })}</div>
              </div>
              <span className="tag tag--signal">Draft</span>
            </div>
          </div>
        </div>
        <div className="tips">
          <p className="eyebrow" style={{ margin: '0 0 14px' }}>
            Before you publish
          </p>
          <Tip ok={!!carReady}>Model, brand, body type and colour set</Tip>
          <Tip ok={priceReady}>Daily price set</Tip>
          <Tip ok={photos.length > 0} last>
            {photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'} added` : 'No photos yet — optional'}
          </Tip>
        </div>
      </aside>
    </div>
  )
}

function Tip({ ok, last, children }) {
  return (
    <div className="tip" style={last ? { marginBottom: 0 } : undefined}>
      <Icon
        name={ok ? 'check' : 'plus'}
        size="sm"
        style={{ color: ok ? 'var(--verified)' : 'var(--ink-45)', flex: 'none', marginTop: 2 }}
      />
      <span>{children}</span>
    </div>
  )
}
