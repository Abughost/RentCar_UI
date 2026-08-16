import { forwardRef, useEffect, useRef, useState } from 'react'

/* ---------------------------------------------------------------- icons */

export function Icon({ name, size, className = '', ...rest }) {
  const cls = ['ico', size === 'sm' && 'ico--sm', size === 'lg' && 'ico--lg', className]
    .filter(Boolean)
    .join(' ')
  return (
    <svg className={cls} aria-hidden="true" {...rest}>
      <use href={`#i-${name}`} />
    </svg>
  )
}

/** Body-type silhouette. The fleet is drawn, never photographed. */
export function CarArt({ shape = 'sedan', className = '', ...rest }) {
  return (
    <svg className={`carart ${className}`} viewBox="0 0 200 78" aria-hidden="true" {...rest}>
      <use href={`#c-${shape}`} />
    </svg>
  )
}

/* ---------------------------------------------------------------- odometer */

/**
 * Cells for the mount reveal, top to bottom — which is also the order they pass the window,
 * so the sequence has to *count down* and land on `digit`. Built backwards from the target:
 * the last cell is the digit, the one above it is one higher, and so on.
 */
function revealCells(digit, revolutions) {
  const total = revolutions * 10 + 1
  return Array.from({ length: total }, (_, i) => (digit + (total - 1 - i)) % 10)
}

/**
 * Cells for turning a single wheel from `from` to `to` — the short trip a real odometer wheel
 * makes when the number it's part of changes, as opposed to the long reveal spin above. Always
 * turns the way `up` says, wrapping through 0 rather than reversing, exactly like a mechanical
 * wheel: adding to the total turns every wheel forward (…8, 9, 0, 1…), even the ones that wrap.
 */
function turnCells(from, to, up) {
  const steps = up ? (to - from + 10) % 10 : (from - to + 10) % 10
  return Array.from({ length: steps + 1 }, (_, i) => (up ? (from + i) % 10 : (from - i + 10) % 10))
}

/** Longer than the reveal's own worst case (1.25s + 7 digits × 0.16s ≈ 2.4s) — see
 *  `revealHeldRef` below for what this guards against. */
const REVEAL_HOLD_MS = 2600

/**
 * The signature device: a mechanical odometer, used everywhere the product counts something.
 * The final digit always runs on the yellow trip-meter drum.
 *
 * `roll` does two different things depending on whether this is the instance's first paint:
 *
 *   - First paint: the full reveal — every wheel spins down through a couple of revolutions
 *     and lands on its digit, left to right. This is the "000000" winding back on the home
 *     hero, or a price appearing for the first time.
 *   - Every paint after that: only the wheels whose digit actually changed turn, and only as
 *     far as the short trip from what they showed to what they show now — the total moving
 *     from 1,000,000 to 1,500,000 turns just the one wheel that changed, 0 up through to 5,
 *     while the leading 1 sits still. That is what makes it read as a counter ticking rather
 *     than a slot machine spinning on every click.
 *
 * The comparison is against what THIS instance last painted, tracked in `prevRef` — so it
 * survives re-renders but resets on a genuine remount (a different `key`), which is how a
 * control that wants a fresh reveal (switching to a different car) asks for one.
 */
export function Odometer({ value, size, unit, pad = 0, roll = false, className = '', ...rest }) {
  let chars = String(value ?? '')
  if (pad && chars.length < pad) chars = chars.padStart(pad, '0')
  const digits = chars.split('')

  const prevRef = useRef(null)
  const prevDigits = prevRef.current

  // A parent settling shortly after mount (data finishing a fetch, StrictMode's double
  // effect-invoke) re-renders this instance with the SAME value while the reveal is still
  // meant to be playing. Without this, that re-render would see `prevDigits` already equal
  // to the current value (the effect below had already written it) and cut straight to the
  // static digits — the reveal never gets a chance to be seen. Holding it "not yet painted"
  // for the reveal's own duration means every one of those re-renders still asks for the
  // exact same reveal cells for an unchanged target digit, which React reconciles into the
  // same DOM nodes without touching them — the CSS animation plays through undisturbed.
  const revealHeldRef = useRef(false)
  const firstPaint = prevDigits === null || revealHeldRef.current
  useEffect(() => {
    if (prevDigits !== null) return undefined
    revealHeldRef.current = true
    const t = setTimeout(() => {
      revealHeldRef.current = false
    }, REVEAL_HOLD_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever meant to arm once, at the render that first found prevDigits null
  }, [])

  // Read before the render that will replace it — .current still holds what was last on
  // screen. Direction is one call for the whole number, not per digit, so every wheel that
  // moves turns the same way, the way a real counter's would.
  const numeric = Number(chars.replace(/\D/g, ''))
  const prevNumeric = prevDigits ? Number(prevDigits.replace(/\D/g, '')) : numeric
  const increasing = numeric >= prevNumeric
  useEffect(() => {
    prevRef.current = chars
  })

  const cls = ['odo', size === 'sm' && 'odo--sm', size === 'lg' && 'odo--lg', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} {...rest}>
      {digits.map((d, i) => {
        const dCls = `odo__d${i === digits.length - 1 ? ' odo__d--trip' : ''}`
        const prevD = firstPaint ? null : prevDigits[i]
        const changed = prevD != null && prevD !== d
        // Separators, an unchanged wheel, or roll switched off outright — nothing to turn,
        // it just sits there.
        if (!roll || !/[0-9]/.test(d) || (!firstPaint && !changed)) {
          return (
            <span key={i} className={dCls}>
              {d}
            </span>
          )
        }

        const cells = firstPaint ? revealCells(Number(d), 2 + i) : turnCells(Number(prevD), Number(d), increasing)
        // The reveal staggers left to right over ~2s; a short turn is quick regardless of
        // position — a few extra wheels ticking over shouldn't make the row feel slower.
        const spinMs = firstPaint ? 1250 + i * 160 : Math.min(140 + (cells.length - 1) * 90, 900)

        return (
          <span key={i} className={`${dCls} odo__d--roll`}>
            <span className="odo__win">
              <span
                className="odo__strip"
                style={{ '--roll': cells.length - 1, '--spin': `${spinMs}ms` }}
              >
                {cells.map((n, k) => (
                  <span key={k}>{n}</span>
                ))}
              </span>
            </span>
          </span>
        )
      })}
      {unit && <span className="odo__unit">{unit}</span>}
    </div>
  )
}

/**
 * An `Odometer` that becomes a typeable number on click.
 *
 * Digits type in as a sliding window on the field's own `pad`-digit buffer — keep typing past
 * it and the oldest digit falls off the front, rather than the field silently refusing more
 * input. Nothing overflows into a neighbour: the buffer lives entirely in this component's own
 * state, so two of these placed side by side (a months field next to a days field) can never
 * bleed into one another. Enter or clicking away commits, clamped into `[min, max]`; Escape
 * cancels back to whatever was last committed.
 */
export function EditableDigits({ value, pad = 2, min = 1, max, unit, size, onCommit }) {
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function startEdit() {
    setBuffer(String(value))
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const n = parseInt(buffer, 10)
    if (Number.isNaN(n)) return
    onCommit(Math.max(min, Math.min(max, n)))
  }

  function handleChange(event) {
    // Keeping only the last `pad` digits is the "shift" — anything typed past the field's
    // width pushes the oldest digit out rather than getting rejected or spilling elsewhere.
    setBuffer(event.target.value.replace(/\D/g, '').slice(-pad))
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') event.currentTarget.blur()
    else if (event.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`odoEdit${size === 'sm' ? ' odoEdit--sm' : ''}`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={buffer}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        aria-label="Type an exact value"
      />
    )
  }

  return (
    <button
      type="button"
      className="odoEdit__trigger"
      onClick={startEdit}
      aria-label={`${value}${unit ? ` ${unit.toLowerCase()}` : ''}. Click to type a different value.`}
    >
      <Odometer value={String(value)} pad={pad} unit={unit} roll size={size} />
    </button>
  )
}

/* ---------------------------------------------------------------- plate */

export function Plate({ number, className = '', style }) {
  return (
    <span className={`plate ${className}`} style={style}>
      <span className="plate__band">
        KM
        <br />0
      </span>
      <span className="plate__no">{number}</span>
    </span>
  )
}

/* ---------------------------------------------------------------- gauge */

/**
 * Fuel-gauge availability meter. `filled` of `total` segments lit; a single lit
 * segment turns brick red, which is how the design says "last one".
 */
export function Gauge({ filled, total = 6, caption }) {
  const lit = Math.max(0, Math.min(total, filled))
  const low = lit <= 1
  return (
    <div className="gauge">
      <span className="gauge__cap">E</span>
      <span className="gauge__track">
        {Array.from({ length: total }, (_, i) => (
          <i
            key={i}
            className={`gauge__seg${i < lit ? (low ? ' gauge__seg--low' : ' gauge__seg--on') : ''}`}
          />
        ))}
      </span>
      <span className="gauge__cap">F</span>
      {caption && (
        <span className="small" style={{ marginLeft: 4 }}>
          {caption}
        </span>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- tag */

export function Tag({ tone, icon, children, className = '', ...rest }) {
  return (
    <span className={`tag${tone ? ` tag--${tone}` : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------- button */

export function Button({ variant = 'outline', size, block, icon, children, className = '', ...rest }) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    size === 'lg' && 'btn--lg',
    block && 'btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 'sm' : undefined} />}
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- field */

/**
 * One labelled input. `error` swaps the box to the brick state and, because the
 * message is rendered as the hint, screen readers get it via aria-describedby.
 */
export const Field = forwardRef(function Field(
  { label, hint, error, icon, trailing, id, className = '', boxClassName = '', ...input },
  ref,
) {
  const fieldId = id || `fld-${input.name || label}`
  const hintId = `${fieldId}-hint`
  const message = error || hint

  return (
    <label className={`fld ${className}`} htmlFor={fieldId}>
      {label && <span className="fld__lab">{label}</span>}
      <div className={`fld__box${error ? ' fld__box--err' : ''} ${boxClassName}`}>
        {icon && <Icon name={icon} size="sm" style={{ color: 'var(--ink-45)' }} />}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={message ? hintId : undefined}
          {...input}
        />
        {trailing}
      </div>
      {message && (
        <span id={hintId} className={`fld__hint${error ? ' fld__hint--err' : ''}`}>
          {message}
        </span>
      )}
    </label>
  )
})

export function SelectField({ label, hint, error, icon, id, children, className = '', ...select }) {
  const fieldId = id || `sel-${select.name || label}`
  const hintId = `${fieldId}-hint`
  const message = error || hint

  return (
    <label className={`fld ${className}`} htmlFor={fieldId}>
      {label && <span className="fld__lab">{label}</span>}
      <div className={`fld__box${error ? ' fld__box--err' : ''}`}>
        {icon && <Icon name={icon} size="sm" style={{ color: 'var(--ink-45)' }} />}
        <select
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={message ? hintId : undefined}
          {...select}
        >
          {children}
        </select>
        <Icon name="chevD" size="sm" style={{ color: 'var(--ink-45)' }} />
      </div>
      {message && (
        <span id={hintId} className={`fld__hint${error ? ' fld__hint--err' : ''}`}>
          {message}
        </span>
      )}
    </label>
  )
}

/* ---------------------------------------------------------------- checkbox */

export function Checkbox({ checked, onChange, children, className = '', ...rest }) {
  return (
    <label className={`check ${className}`}>
      <input type="checkbox" checked={!!checked} onChange={onChange} {...rest} />
      <span className={`check__box${checked ? ' check__box--on' : ''}`}>
        {checked && <Icon name="check" size="sm" />}
      </span>
      {children}
    </label>
  )
}

/** Read-only tick, for rows whose state is driven by the row itself. */
export function CheckMark({ on }) {
  return (
    <span className={`check__box${on ? ' check__box--on' : ''}`}>
      {on && <Icon name="check" size="sm" />}
    </span>
  )
}

/* ---------------------------------------------------------------- chip */

export function Chip({ on, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={!!on}
      className={`chip${on ? ' is-on' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- steps */

export function Steps({ items, current }) {
  return (
    <div className="steps">
      {items.map((label, i) => (
        <span key={label} style={{ display: 'contents' }}>
          {i > 0 && <span className="steps__bar" />}
          <span className="steps__i">
            <span
              className={`steps__n${i < current ? ' steps__n--done' : ''}${
                i === current ? ' steps__n--now' : ''
              }`}
            >
              {i < current ? <Icon name="check" size="sm" /> : i + 1}
            </span>
            <span className={`steps__t${i === current ? ' steps__t--now' : ''}`}>{label}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- feedback */

export function Alert({ tone = 'err', onDark, children }) {
  if (!children) return null
  return (
    <div className={`alert alert--${tone}${onDark ? ' alert--onDark' : ''}`} role="alert">
      <Icon name={tone === 'ok' ? 'check' : 'shield'} size="sm" style={{ marginTop: 2 }} />
      <span>{children}</span>
    </div>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <p className="small" role="status">
      {label}…
    </p>
  )
}
