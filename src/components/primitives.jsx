import { forwardRef } from 'react'

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
 * Cells for one rolling drum, top to bottom — which is also the order they pass the
 * window, so the sequence has to *count down* and land on `digit`. Built backwards from
 * the target: the last cell is the digit, the one above it is one higher, and so on.
 */
function drumCells(digit, revolutions) {
  const total = revolutions * 10 + 1
  return Array.from({ length: total }, (_, i) => (digit + (total - 1 - i)) % 10)
}

/**
 * The signature device: a mechanical odometer, used everywhere the product counts
 * something. The final digit always runs on the yellow trip-meter drum.
 *
 * With `roll`, each drum spins down to its digit once on mount — the hero uses it to wind
 * the clock back to zero as the car pulls up. Drums to the right turn further and settle
 * later, so the row locks in left to right the way a real counter does. The rest state is
 * the finished number, so `prefers-reduced-motion` (which kills the animation outright in
 * tokens.css) simply shows the value with no roll.
 */
export function Odometer({ value, size, unit, pad = 0, roll = false, className = '', ...rest }) {
  let chars = String(value ?? '')
  if (pad && chars.length < pad) chars = chars.padStart(pad, '0')
  const digits = chars.split('')

  const cls = ['odo', size === 'sm' && 'odo--sm', size === 'lg' && 'odo--lg', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} {...rest}>
      {digits.map((d, i) => {
        const dCls = `odo__d${i === digits.length - 1 ? ' odo__d--trip' : ''}`
        // Separators and the like have no drum to turn — they just sit there.
        if (!roll || !/[0-9]/.test(d)) {
          return (
            <span key={i} className={dCls}>
              {d}
            </span>
          )
        }
        const revolutions = 2 + i
        return (
          <span key={i} className={`${dCls} odo__d--roll`}>
            <span className="odo__win">
              <span
                className="odo__strip"
                style={{ '--roll': revolutions * 10, '--spin': `${1.25 + i * 0.16}s` }}
              >
                {drumCells(Number(d), revolutions).map((n, k) => (
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
