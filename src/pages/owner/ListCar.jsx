import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { auth as authApi, cars as carsApi, toList } from '../../api/endpoints'
import { Alert, Button, CarArt, Checkbox, Field, Icon, Plate, SelectField, Steps } from '../../components/primitives'
import { plateFor } from '../../lib/fleet'
import { money, recommendedTierPrice, TIERS } from '../../lib/pricing'
import { useAuth } from '../../state/AuthContext'
import { useOwner } from './useOwnerFleet'

const BASE_STEPS = ['The car', 'Price', 'Photos & review']
const FULL_STEPS = ['Licence & ID', ...BASE_STEPS]

const COUNTRIES = [
  'Uzbekistan',
  'Netherlands',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Poland',
  'Turkiye',
  'United Kingdom',
]

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
  const { isRegistered, refreshUser, user } = useAuth()
  const needsLicence = !isRegistered
  const [step, setStep] = useState(needsLicence ? 0 : 0)
  const STEP_LABELS = needsLicence ? FULL_STEPS : BASE_STEPS
  const carStep = needsLicence ? 1 : 0
  const priceStep = needsLicence ? 2 : 1
  const photoStep = needsLicence ? 3 : 2
  const lastStep = STEP_LABELS.length - 1

  const [licenceStatus, setLicenceStatus] = useState(null) // null | 'verifying' | 'approved' | 'rejected'

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

  const [tierPrices, setTierPrices] = useState({
    one_to_three_day: '',
    three_to_seven_day: '',
    seven_to_thirty_day: '',
    over_thirty_day: '',
  })

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

  const canContinue = () => {
    if (needsLicence && step === 0) return false // licence step has its own submit
    if (step === carStep) return carReady
    if (step === priceStep) return priceReady
    return true
  }

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
    TIERS.forEach((tier) => {
      const typed = tierPrices[tier.key]
      form.set(tier.key, typed === '' ? recommendedTierPrice(dailyPrice, tier.key) : typed)
    })
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

        {needsLicence && step === 0 && (
          <LicenceSection
            user={user}
            countries={COUNTRIES}
            licenceStatus={licenceStatus}
            onSubmit={async (form) => {
              setLicenceStatus('verifying')
              try {
                await authApi.createProfile(form)
                await refreshUser()
                setLicenceStatus('approved')
                setTimeout(() => setStep(1), 2200)
              } catch (err) {
                setLicenceStatus('rejected')
                throw err
              }
            }}
          />
        )}

        {step === carStep && !(needsLicence && step === 0) && (
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

        {step === priceStep && (
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

              <div style={{ marginTop: 22 }}>
                <div className="fld__lab">Length discounts</div>
                <p className="small" style={{ margin: '2px 0 10px' }}>
                  Leave any of these blank to use the recommended price shown.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {TIERS.map((tier) => (
                    <Field
                      key={tier.key}
                      label={tier.label}
                      type="number"
                      min={0}
                      placeholder={`${money(recommendedTierPrice(dailyPrice, tier.key), { cents: false })}/day`}
                      value={tierPrices[tier.key]}
                      onChange={(e) => setTierPrices((t) => ({ ...t, [tier.key]: e.target.value }))}
                      trailing={<span className="small">/ day</span>}
                    />
                  ))}
                </div>
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

        {step === photoStep && (
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

        {!(needsLicence && step === 0) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
            {step > (needsLicence ? 1 : 0) && (
              <Button onClick={() => setStep((s) => s - 1)}>
                <Icon name="chev" size="sm" style={{ transform: 'rotate(180deg)' }} />
                Back
              </Button>
            )}
            {step < lastStep ? (
              <Button
                variant="signal"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue()}
              >
                Continue
              </Button>
            ) : (
              <Button variant="signal" onClick={handlePublish} disabled={publishing || !carReady || !priceReady}>
                {publishing ? 'Publishing…' : 'Publish listing'}
              </Button>
            )}
          </div>
        )}
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
          {needsLicence && (
            <Tip ok={licenceStatus === 'approved'}>
              {licenceStatus === 'approved' ? 'Licence verified' : 'Licence & ID verification'}
            </Tip>
          )}
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

function LicenceSection({ user, countries, licenceStatus, onSubmit }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    data_of_birth: '',
    driver_licence_number: '',
    driver_licence_date_of_issue: '',
    id_card_number: '',
    personal_number: '',
  })
  const [country, setCountry] = useState(countries[0])
  const [expires, setExpires] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [docs, setDocs] = useState({ front: null, back: null })
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        first_name: f.first_name || user.first_name || '',
        last_name: f.last_name || user.last_name || '',
      }))
    }
  }, [user])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      await onSubmit(form)
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        setFieldErrors(err.data)
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const errorFor = (key) => {
    const v = fieldErrors[key]
    if (!v) return null
    return Array.isArray(v) ? String(v[0]) : String(v)
  }

  if (licenceStatus === 'verifying' || licenceStatus === 'approved' || licenceStatus === 'rejected') {
    return <VerificationAnimation status={licenceStatus} />
  }

  return (
    <>
      <p className="eyebrow" style={{ margin: '20px 0 10px' }}>
        Before you list a car
      </p>
      <h1 className="dh2" style={{ marginBottom: 8 }}>
        Verify your licence & ID
      </h1>
      <p className="lede" style={{ marginBottom: 26, maxWidth: '56ch' }}>
        We need your driving licence and ID card on file before you can list a car. This is a
        one-time step — after this, every listing is instant.
      </p>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__h">
            <span className="panel__n"><Icon name="user" size="sm" /></span>
            <h2 className="dh3">Personal details</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field
              label="First name"
              name="first_name"
              autoComplete="given-name"
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              error={errorFor('first_name')}
              required
            />
            <Field
              label="Last name"
              name="last_name"
              autoComplete="family-name"
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              error={errorFor('last_name')}
              required
            />
            <Field
              label="Date of birth"
              name="data_of_birth"
              type="date"
              icon="cal"
              value={form.data_of_birth}
              onChange={(e) => set('data_of_birth', e.target.value)}
              error={errorFor('data_of_birth')}
              required
            />
            <Field
              label="Personal number"
              name="personal_number"
              maxLength={14}
              placeholder="12345678901234"
              value={form.personal_number}
              onChange={(e) => set('personal_number', e.target.value)}
              error={errorFor('personal_number')}
              required
            />
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__h">
            <span className="panel__n"><Icon name="card" size="sm" /></span>
            <h2 className="dh3">Driving licence</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <SelectField label="Country of issue" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
            <Field
              label="Licence number"
              name="driver_licence_number"
              maxLength={9}
              placeholder="AB1234567"
              hint="9 characters, from the front of the card."
              value={form.driver_licence_number}
              onChange={(e) => set('driver_licence_number', e.target.value.toUpperCase())}
              error={errorFor('driver_licence_number')}
              required
            />
            <Field
              label="Date of issue"
              name="driver_licence_date_of_issue"
              type="date"
              value={form.driver_licence_date_of_issue}
              onChange={(e) => set('driver_licence_date_of_issue', e.target.value)}
              error={errorFor('driver_licence_date_of_issue')}
              required
            />
            <Field
              label="Expires"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              hint={
                expires && new Date(expires) > new Date() ? 'Covers your trip.' : 'Must outlast the rental.'
              }
            />
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__h">
            <span className="panel__n"><Icon name="doc" size="sm" /></span>
            <h2 className="dh3">ID card</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field
              label="ID card number"
              name="id_card_number"
              maxLength={9}
              placeholder="AA1234567"
              value={form.id_card_number}
              onChange={(e) => set('id_card_number', e.target.value.toUpperCase())}
              error={errorFor('id_card_number')}
              required
            />
          </div>
          <LicenceUpload
            label="Front of the card"
            file={docs.front}
            onPick={(file) => setDocs((d) => ({ ...d, front: file }))}
          />
          <div style={{ height: 14 }} />
          <LicenceUpload
            label="Back of the card"
            file={docs.back}
            onPick={(file) => setDocs((d) => ({ ...d, back: file }))}
          />
          <p className="small" style={{ margin: '8px 0 0' }}>
            Photos stay on this device — only the numbers above are stored.
          </p>
        </div>

        <Checkbox
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="check"
        >
          I confirm the licence is mine and currently valid.
        </Checkbox>

        <button
          type="submit"
          className="btn btn--signal btn--block btn--lg"
          style={{ marginTop: 20 }}
          disabled={busy || !confirmed}
        >
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>
    </>
  )
}

function VerificationAnimation({ status }) {
  const isApproved = status === 'approved'
  const isRejected = status === 'rejected'
  const isVerifying = status === 'verifying'

  return (
    <div className="licence-verify" role="status">
      <div className={`licence-verify__ring ${isVerifying ? 'licence-verify__ring--spin' : ''} ${isApproved ? 'licence-verify__ring--ok' : ''} ${isRejected ? 'licence-verify__ring--fail' : ''}`}>
        {isVerifying && (
          <svg viewBox="0 0 80 80" className="licence-verify__spinner">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bone-300)" strokeWidth="4" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--signal)" strokeWidth="4" strokeDasharray="70 144" strokeLinecap="round" className="licence-verify__arc" />
          </svg>
        )}
        {isApproved && (
          <div className="licence-verify__icon licence-verify__icon--ok">
            <Icon name="check" size="lg" />
          </div>
        )}
        {isRejected && (
          <div className="licence-verify__icon licence-verify__icon--fail">
            <Icon name="x" size="lg" />
          </div>
        )}
      </div>

      <h2 className="dh3" style={{ marginTop: 24, textAlign: 'center' }}>
        {isVerifying && 'Verifying your documents…'}
        {isApproved && 'Licence approved'}
        {isRejected && 'Verification failed'}
      </h2>
      <p className="small" style={{ textAlign: 'center', maxWidth: '40ch', margin: '8px auto 0' }}>
        {isVerifying && 'Checking your licence and ID card details. This only takes a moment.'}
        {isApproved && "You’re all set. Moving you to the next step now…"}
        {isRejected && 'Something went wrong. Please go back and check your details.'}
      </p>
    </div>
  )
}

function LicenceUpload({ label, file, onPick }) {
  const input = useRef(null)

  return (
    <div className="upload" style={file ? undefined : { borderColor: 'var(--pine-700)', background: 'rgba(25,74,62,.05)' }}>
      <span
        className="upload__ic"
        style={file ? undefined : { background: 'var(--bone-200)', color: 'var(--ink-45)' }}
      >
        <Icon name={file ? 'doc' : 'plus'} size="lg" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file
            ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
            : 'Drop a photo here, or take one with your phone camera.'}
        </div>
      </div>
      {file ? (
        <span className="tag tag--sage">
          <Icon name="check" size="sm" />
          Ready
        </span>
      ) : (
        <Button size="sm" onClick={() => input.current?.click()}>
          Choose file
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={label}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </div>
  )
}
