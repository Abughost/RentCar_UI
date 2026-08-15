import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, CarArt, Icon, Plate, Steps } from '../../components/primitives'
import { addDraftCar } from '../../lib/owner'
import { money } from '../../lib/pricing'
import { useOwner } from './useOwnerFleet'

const STEP_LABELS = ['The car', 'Price & dates', 'Handover', 'Documents']

/**
 * Frames 10–11 (plus lightweight versions of 12–13 from the design's own index — handover and
 * documents get one screen each rather than a full panel, since neither collects anything the
 * rest of the dashboard reads back).
 *
 * There is no `POST /cars` route open to a member yet (`IsAdminOrReadOnly`), so "Publish"
 * cannot reach the real fleet table. Publishing here adds the car to a small local list that
 * every other owner page already reads — see `lib/owner.js` for why, and `useOwnerFleet`'s
 * `refreshDrafts` for how it lands in "My cars" immediately.
 */
export default function ListCar() {
  const navigate = useNavigate()
  const { refreshDrafts } = useOwner()
  const [step, setStep] = useState(0)

  const [plate, setPlate] = useState('')
  const [lookedUp, setLookedUp] = useState(false)
  const [odoPhotographed, setOdoPhotographed] = useState(false)
  const [photoCount, setPhotoCount] = useState(2)

  const [price, setPrice] = useState(54)
  const [approveEach, setApproveEach] = useState(false)
  const [minAge, setMinAge] = useState(true)
  const [noSmoking, setNoSmoking] = useState(true)

  const [handoverNote, setHandoverNote] = useState('')
  const [insuranceUploaded, setInsuranceUploaded] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedId, setPublishedId] = useState(null)

  const model = useMemo(() => {
    const clean = plate.replace(/\s+/g, '').toUpperCase()
    return clean ? `Listed car ${clean.slice(-4)}` : 'Your car'
  }, [plate])

  const youKeep = Math.round(price * 0.8 * 100) / 100

  function handleLookup(e) {
    e.preventDefault()
    if (!plate.trim()) return
    setLookedUp(true)
  }

  function handlePublish() {
    setPublishing(true)
    const car = addDraftCar({ model, dailyPrice: price })
    refreshDrafts()
    setPublishedId(car.id)
    setPublishing(false)
  }

  if (publishedId) {
    return (
      <div className="addwrap" style={{ gridTemplateColumns: '1fr', maxWidth: 560, margin: '0 auto' }}>
        <div className="empty">
          <Icon name="check" size="lg" style={{ color: 'var(--verified)' }} />
          <h2 className="dh3" style={{ margin: '14px 0 8px' }}>
            {model} is live
          </h2>
          <p className="small" style={{ marginBottom: 18 }}>
            It's on the fleet at {money(price, { cents: false })} a day — you keep {money(youKeep)} of
            that. It shows up in My cars now.
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

        {step === 0 && (
          <>
            <p className="eyebrow" style={{ margin: '20px 0 10px' }}>
              Earn from a car that's parked
            </p>
            <h1 className="dh2" style={{ marginBottom: 8 }}>
              Put your car on KM0
            </h1>
            <p className="lede" style={{ marginBottom: 26, maxWidth: '56ch' }}>
              A car parked most of the day can earn while you don't need it. You choose the days,
              the price and who drives it.
            </p>

            <div className="panel">
              <div className="panel__h">
                <span className="panel__n">1</span>
                <h2 className="dh3">Find your car by plate</h2>
              </div>
              <form onSubmit={handleLookup} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
                <label className="fld">
                  <span className="fld__lab">Registration plate</span>
                  <div className={`fld__box${lookedUp ? ' fld__box--focus' : ''}`} style={{ gap: 14 }}>
                    <input
                      value={plate}
                      onChange={(e) => {
                        setPlate(e.target.value)
                        setLookedUp(false)
                      }}
                      placeholder="12 B 640"
                      aria-label="Registration plate"
                    />
                    {lookedUp && (
                      <span className="tag tag--sage">
                        <Icon name="check" size="sm" />
                        Found
                      </span>
                    )}
                  </div>
                </label>
                <Button variant="pine" type="submit">
                  Look up
                </Button>
              </form>

              {lookedUp && (
                <div
                  style={{
                    background: 'rgba(127,191,162,.14)',
                    borderRadius: 'var(--r-s)',
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Icon name="check" style={{ color: 'var(--verified)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--verified)', fontWeight: 500 }}>
                    Plate matched. Fill in anything the lookup missed below.
                  </span>
                </div>
              )}

              <p className="small" style={{ marginTop: lookedUp ? 0 : 12 }}>
                No registry is connected in this build, so a plate always "matches" — enter the
                details by hand for anything it gets wrong.
              </p>
            </div>

            <div className="panel">
              <div className="panel__h">
                <span className="panel__n">2</span>
                <h2 className="dh3">Odometer reading</h2>
              </div>
              <p className="small" style={{ margin: '-12px 0 16px' }}>
                Checked against the reading at every handover, so a renter is never blamed for
                your kilometres — or you for theirs.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Button
                  variant={odoPhotographed ? 'signal' : 'outline'}
                  size="sm"
                  icon={odoPhotographed ? 'check' : undefined}
                  onClick={() => setOdoPhotographed((v) => !v)}
                >
                  {odoPhotographed ? 'Dashboard photographed' : 'Photograph the dashboard'}
                </Button>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel__h">
                <span className="panel__n">3</span>
                <h2 className="dh3">Photos</h2>
              </div>
              <p className="small" style={{ margin: '-12px 0 16px' }}>
                Six angles, taken in daylight. Listings with a clean boot shot get booked 40% more
                often.
              </p>
              <div className="photos">
                <button type="button" className="photo photo--filled photo--main" onClick={() => setPhotoCount((n) => Math.min(6, n + 1))}>
                  <span className="photo__tag">COVER</span>
                  <CarArt shape="sedan" style={{ maxWidth: '70%' }} />
                </button>
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`photo${i < photoCount - 1 ? ' photo--filled' : ''}`}
                    onClick={() => setPhotoCount((n) => Math.max(n, i + 2))}
                  >
                    <Icon name={i < photoCount - 1 ? 'check' : 'plus'} size="lg" />
                    {i >= photoCount - 1 && <span style={{ fontSize: 10.5 }}>Add photo</span>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="panel">
              <div className="panel__h">
                <span className="panel__n">1</span>
                <h2 className="dh3">Your daily price</h2>
              </div>
              <p className="small" style={{ margin: '-12px 0 20px' }}>
                Similar cars in this city rent between $47 and $61 a day.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
                <div className="num" style={{ fontSize: 32, fontWeight: 600 }}>
                  ${price}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-45)' }}> / day</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={95}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{ flex: 1 }}
                  aria-label="Daily price"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <span className="tag tag--sage">Renters pay ${price}</span>
                <span className="tag">KM0 fee 20%</span>
                <span className="tag tag--signal">You keep {money(youKeep)} a day</span>
              </div>
            </div>

            <div className="panel">
              <div className="panel__h">
                <span className="panel__n">2</span>
                <h2 className="dh3">Who may drive it</h2>
              </div>
              <div className="extras">
                <ExtraToggle
                  on={minAge}
                  onToggle={() => setMinAge((v) => !v)}
                  title="Licence held 3 years or more"
                  blurb="Cuts the damage rate by about half."
                />
                <ExtraToggle
                  on={noSmoking}
                  onToggle={() => setNoSmoking((v) => !v)}
                  title="No smoking, no pets"
                  blurb="Shown on the listing. Cleaning fee applies if broken."
                />
                <ExtraToggle
                  on={approveEach}
                  onToggle={() => setApproveEach((v) => !v)}
                  title="Approve every booking by hand"
                  blurb="Safer, but you lose the instant-book badge and roughly a fifth of requests."
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel__h">
              <span className="panel__n">3</span>
              <h2 className="dh3">Handover instructions</h2>
            </div>
            <p className="small" style={{ margin: '-12px 0 16px' }}>
              Shown to a renter an hour before pick-up. Where to find the car and how the key
              works.
            </p>
            <label className="fld">
              <span className="fld__lab">Instructions</span>
              <textarea
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                rows={5}
                placeholder="e.g. Parked in bay 12, basement level. Key is in the KM0 lockbox by the entrance, code sent with the booking."
                style={{
                  width: '100%',
                  border: '1.5px solid var(--bone-300)',
                  borderRadius: 'var(--r-s)',
                  padding: '12px 14px',
                  font: 'inherit',
                  fontSize: 14,
                  background: 'var(--bone-050)',
                  color: 'var(--ink)',
                  resize: 'vertical',
                }}
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel__h">
              <span className="panel__n">4</span>
              <h2 className="dh3">Insurance</h2>
            </div>
            <p className="small" style={{ margin: '-12px 0 16px' }}>
              Transit insurance covering hire — the listing hides itself automatically if this
              expires.
            </p>
            <Button
              variant={insuranceUploaded ? 'signal' : 'outline'}
              icon={insuranceUploaded ? 'check' : 'doc'}
              onClick={() => setInsuranceUploaded((v) => !v)}
            >
              {insuranceUploaded ? 'Certificate attached' : 'Upload insurance certificate'}
            </Button>
            {!insuranceUploaded && (
              <div style={{ marginTop: 14 }}>
                <Alert tone="ok">You can publish now and add this before your first booking.</Alert>
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
          {step < 3 ? (
            <Button variant="signal" onClick={() => setStep((s) => s + 1)} style={{ marginLeft: step === 0 ? 0 : undefined }}>
              Continue
            </Button>
          ) : (
            <Button variant="signal" onClick={handlePublish} disabled={publishing || !price}>
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
            <CarArt shape="sedan" />
            {plate && <Plate number={plate} className="car__plate" />}
          </div>
          <div className="car__body">
            <div className="car__cls">Listed by you</div>
            <div className="car__n">{model}</div>
            <p className="car__alt">Draft listing</p>
            <div className="car__foot">
              <div>
                <div className="car__price">
                  <span className="car__amt">${price}</span>
                  <span className="car__per">/ day</span>
                </div>
                <div className="car__tot num">you keep {money(youKeep)}</div>
              </div>
              <span className="tag tag--signal">Draft</span>
            </div>
          </div>
        </div>
        <div className="tips">
          <p className="eyebrow" style={{ margin: '0 0 14px' }}>
            Before you publish
          </p>
          <Tip ok={!!plate}>Plate entered</Tip>
          <Tip ok={odoPhotographed}>Odometer photographed</Tip>
          <Tip ok={photoCount >= 6}>{photoCount >= 6 ? 'All six photos added' : `${6 - photoCount + 1} more photo(s) needed`}</Tip>
          <Tip ok={insuranceUploaded} last>
            {insuranceUploaded ? 'Insurance certificate attached' : 'Insurance certificate, step 4'}
          </Tip>
        </div>
      </aside>
    </div>
  )
}

function ExtraToggle({ on, onToggle, title, blurb }) {
  return (
    <button type="button" className={`extra${on ? ' is-on' : ''}`} onClick={onToggle} style={{ width: '100%', textAlign: 'left' }}>
      <span className={`check__box${on ? ' check__box--on' : ''}`}>{on && <Icon name="check" size="sm" />}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{title}</div>
        <div className="small">{blurb}</div>
      </div>
    </button>
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
