import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { defaultDropOff, defaultPickUp, daysBetween } from '../lib/dates'
import { STATIONS } from '../lib/fleet'

/**
 * The search-and-booking draft that travels with the customer from the home page
 * to the voucher.
 *
 * The backend has no cart: a Rental row is written in one POST at the end. Until then the
 * choices live here and in sessionStorage, so a refresh mid-checkout does not lose them.
 */

const BookingContext = createContext(null)

const DRAFT_KEY = 'km0.booking'

function initialDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // Dates in the past are worse than no dates — fall through to the defaults.
      if (saved.pickUpAt && new Date(saved.pickUpAt) > new Date()) return saved
    }
  } catch {
    /* fall through to defaults */
  }

  return {
    station: STATIONS[0].name,
    dropStation: STATIONS[0].name,
    pickUpAt: defaultPickUp().toISOString(),
    dropOffAt: defaultDropOff().toISOString(),
    driverAge: '30+',
    mode: 'daily',
    cover: 'zero',
    extras: { second_driver: false, unlimited_km: false, child_seat: 0, roof_box: false },
    paymentMethod: 'card',
  }
}

export function BookingProvider({ children }) {
  const [draft, setDraft] = useState(initialDraft)

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* private mode — the draft just will not survive a reload */
    }
  }, [draft])

  const update = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  const setExtra = useCallback((id, value) => {
    setDraft((prev) => ({ ...prev, extras: { ...prev.extras, [id]: value } }))
  }, [])

  const reset = useCallback(() => {
    setDraft(initialDraft())
  }, [])

  const days = daysBetween(draft.pickUpAt, draft.dropOffAt)

  const value = useMemo(
    () => ({ draft, update, setExtra, reset, days }),
    [draft, update, setExtra, reset, days],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>')
  return ctx
}
