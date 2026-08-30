import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Time constant for easing a flick back into the idle speed. Bigger = longer coast. */
const SETTLE_MS = 620

/** Fastest a flick may leave the strip running, so a hard swipe cannot make it a blur. */
const MAX_PXS = 1400

/** How much of a wheel delta reaches the band, and how much momentum it leaves behind. */
const WHEEL_GAIN = 0.45
const WHEEL_THROW = 2.5

/** How far the pointer may travel before a press stops counting as a click. */
const DRAG_SLOP = 6

/**
 * A band of cards that travels on its own and takes a drag either way.
 *
 * `children` is laid out as one lap and then repeated until the laps overflow the stage, so the
 * offset can wrap at a single lap's width and the run never shows a seam. Only the track is
 * transformed — a frame is one style write however many cards are on it.
 *
 * `speed` is pixels per second: negative travels right to left, positive left to right. Letting
 * go hands the flick to the loop, which decays it back to `speed` on its own.
 *
 * When the children are few enough that one lap already fits the stage, none of that applies:
 * the band renders a single static row at the left and never animates or loops.
 */
export default function Marquee({ speed = -34, className = '', label, children }) {
  const [laps, setLaps] = useState(2)
  const [still, setStill] = useState(false)
  // True once a single lap is measured to fit the stage on its own — nothing to loop, so the
  // band sits still at the left instead of animating a row that never needed to scroll.
  const [fits, setFits] = useState(false)
  const paused = still || fits

  const stageRef = useRef(null)
  const trackRef = useRef(null)
  const lapRef = useRef(null)

  // Offset lives in refs, never state: the loop writes a transform 60 times a second and
  // re-rendering React that often would drop frames for nothing.
  const offset = useRef(0)
  const vel = useRef(speed)
  const span = useRef(0)
  const drag = useRef(null)
  const moved = useRef(0)
  // Set only for the click that a drag's own pointerup produces, and cleared on the next turn
  // of the event loop. Keeping the distance around instead let a finished drag go on eating
  // clicks long afterwards, so the band stopped opening anything once it had been dragged.
  const swallowNext = useRef(false)

  // Reduced motion keeps the same band but stops driving it — it stays a plain scrolling row.
  // Tracked live, because the preference can flip while the page is open.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setStill(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const paint = useCallback(() => {
    const track = trackRef.current
    if (track) track.style.transform = `translate3d(${offset.current}px, 0, 0)`
  }, [])

  /* ---------------------------------------------------------------- geometry */

  // A lap plus the gap that follows it is the distance the offset wraps at. Measured rather
  // than calculated, so the gap, the padding and any card that sizes itself all count.
  useLayoutEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    const lap = lapRef.current
    if (!stage || !track || !lap) return undefined

    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      const width = lap.getBoundingClientRect().width
      if (!width) return
      span.current = width + gap

      // A lap that already fits the stage has nothing to loop — one copy, sat still at the left,
      // rather than a row driven in a circle it never needed to travel.
      const stageWidth = stage.getBoundingClientRect().width
      const contentFits = width <= stageWidth
      setFits(contentFits)
      if (contentFits) {
        setLaps((n) => (n === 1 ? n : 1))
        return
      }

      // One lap short of the stage would leave a hole at the wrap; keep laying laps down until
      // they cover the stage with a whole one to spare.
      const need = Math.max(2, Math.ceil(stageWidth / span.current) + 1)
      setLaps((n) => (n === need ? n : need))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    ro.observe(lap)
    return () => ro.disconnect()
  }, [children])

  /* ---------------------------------------------------------------- wheel */

  // Trackpads and horizontal wheels scrub the band. Registered by hand rather than through
  // onWheel, because preventDefault needs a non-passive listener.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || paused) return undefined

    const onWheel = (event) => {
      // Only take the gesture when it is genuinely sideways — a plain vertical wheel has to go
      // on scrolling the page, or the band would trap the reader on its way down.
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const dx = sideways ? event.deltaX : event.shiftKey ? event.deltaY : 0
      if (!dx) return

      event.preventDefault()
      // Damped: a trackpad throws large deltas, and one-to-one made the band jump.
      offset.current -= dx * WHEEL_GAIN
      // A little momentum, which the loop then eases back into the idle speed.
      vel.current = Math.max(Math.min(-dx * WHEEL_THROW, MAX_PXS), -MAX_PXS)
      wrap()
      paint()
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [paused, paint])

  /* ---------------------------------------------------------------- the loop */

  useEffect(() => {
    if (paused) return undefined

    let raf = 0
    let last = performance.now()

    const tick = (now) => {
      const dt = Math.min(now - last, 64)
      last = now

      // While held, the pointer owns the offset outright — handleMove has already moved it.
      if (!drag.current) {
        // Exponential ease back to the idle speed, framerate-independent.
        vel.current += (speed - vel.current) * (1 - Math.exp(-dt / SETTLE_MS))
        offset.current += (vel.current * dt) / 1000
        wrap()
        paint()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, speed, paint])

  // Keep the offset inside one lap in both directions, so the seam never comes round.
  function wrap() {
    const s = span.current
    if (!s) return
    if (offset.current <= -s) offset.current += s
    else if (offset.current > 0) offset.current -= s
  }

  /* ---------------------------------------------------------------- dragging */

  function handleDown(event) {
    if (paused || event.button > 0) return
    // Capture keeps the drag alive when the pointer leaves the stage. It throws for a pointer
    // id the element never saw, which is not worth losing the whole gesture over.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      /* no capture — the drag still works while the pointer stays over the stage */
    }
    moved.current = 0
    drag.current = { id: event.pointerId, x: event.clientX, t: performance.now(), v: 0 }
  }

  function handleMove(event) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return

    const dx = event.clientX - d.x
    const now = performance.now()
    const dt = Math.max(now - d.t, 1)

    offset.current += dx
    // Kept so the release has a flick speed to coast on rather than stopping dead.
    d.v = (dx * 1000) / dt
    d.x = event.clientX
    d.t = now
    moved.current += Math.abs(dx)
    wrap()
    paint()
  }

  function endDrag(event) {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    vel.current = Math.max(Math.min(d.v, MAX_PXS), -MAX_PXS)
    drag.current = null

    // The click for this gesture is dispatched right after pointerup, before the timeout can
    // run — so it is eaten, and every click after it is treated as a real one.
    if (moved.current > DRAG_SLOP) {
      swallowNext.current = true
      setTimeout(() => {
        swallowNext.current = false
      }, 0)
    }
    moved.current = 0
  }

  // A drag that happens to finish on a card is not a click on it. Caught on the way down so
  // the cards themselves stay ordinary links.
  function swallowDragClick(event) {
    if (swallowNext.current) {
      swallowNext.current = false
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <div
      className={`mq${paused ? ' mq--still' : ''} ${className}`.trim()}
      ref={stageRef}
      role="group"
      aria-label={label}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={swallowDragClick}
      // The cards are links, and a browser drags a link by default — the native drag fires
      // pointercancel and kills the gesture the moment the pointer moves. Refusing dragstart
      // here is what makes a plain mouse drag work at all.
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="mq__track" ref={trackRef}>
        {Array.from({ length: laps }, (_, i) => (
          // Only the first lap is the real one; the repeats are scenery, so they are kept out
          // of the accessibility tree and out of the tab order.
          <div
            key={i}
            className="mq__lap"
            ref={i === 0 ? lapRef : undefined}
            aria-hidden={i === 0 ? undefined : 'true'}
            inert={i === 0 ? undefined : ''}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
