import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { cars as carsApi, toList } from '../../api/endpoints'
import { buildFleet, payoutRows, readDraftCars } from '../../lib/owner'
import { useAuth } from '../../state/AuthContext'

/**
 * Fetches the real fleet once, at the top of the owner section (`OwnerLayout`), and wraps it
 * in the derived hosting numbers from `lib/owner.js`. Every page below reads the same fleet
 * back out through `useOwner()` instead of re-fetching — one request per visit, not one per
 * page.
 *
 * There is no `mine=true` filter on `GET /cars` — `Car.author` never leaves the API — so
 * "my cars" is, honestly, the fleet `GET /cars` already returns. See the module doc in
 * `lib/owner.js` for the full reasoning.
 */
export function useOwnerFleet() {
  const { user } = useAuth()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Bumped after a new listing is published, so the effect below re-reads localStorage
  // without needing a fresh network round trip.
  const [draftTick, setDraftTick] = useState(0)

  useEffect(() => {
    if (!user) return undefined
    const ac = new AbortController()
    setLoading(true)

    carsApi
      .list({ page_size: 8 }, { signal: ac.signal })
      .then((data) => {
        // Drafts first — a car just listed should be the one the owner sees land.
        setFleet(buildFleet([...readDraftCars(), ...toList(data)]))
        setError(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [user, draftTick])

  const refreshDrafts = useCallback(() => setDraftTick((n) => n + 1), [])

  const payouts = payoutRows(user?.id || 'host', 5)
  const nextPayout = payouts[0]?.paidOut || 0

  return { fleet, loading, error, payouts, nextPayout, refreshDrafts }
}

/** Read the fleet `OwnerLayout` already fetched — call this from any page under `/owner`. */
export function useOwner() {
  return useOutletContext()
}
