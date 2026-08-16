import { useEffect } from 'react'
import { Icon } from './primitives'

/**
 * Full-screen photo viewer. `index` is a position in `images`, or `null` when closed — there
 * is no internal open/closed state, the caller owns it, so opening at a specific photo from a
 * gallery is just setting the index.
 */
export default function Lightbox({ images, index, onClose, onNav }) {
  const open = index != null && images[index] != null

  // Locks the page underneath so the arrow keys and scroll wheel land on the viewer, not the
  // page behind it, for as long as the lightbox is open.
  useEffect(() => {
    if (!open) return undefined

    function onKey(event) {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') onNav(1)
      else if (event.key === 'ArrowLeft') onNav(-1)
    }

    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, onNav])

  if (!open) return null

  const many = images.length > 1

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
        <Icon name="x" />
      </button>

      {many && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          onClick={(e) => {
            e.stopPropagation()
            onNav(-1)
          }}
          aria-label="Previous photo"
        >
          <Icon name="chev" style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}

      {/* Stops the backdrop's onClose from firing when the click actually landed on the
          photo itself. */}
      <img src={images[index]} alt="" className="lightbox__img" onClick={(e) => e.stopPropagation()} />

      {many && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          onClick={(e) => {
            e.stopPropagation()
            onNav(1)
          }}
          aria-label="Next photo"
        >
          <Icon name="chev" />
        </button>
      )}

      {many && (
        <div className="lightbox__count small">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
