import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { cars as carsApi, host as hostApi, toList } from '../../api/endpoints'
import { buildFleet, payoutRows } from '../../lib/owner'
import { useAuth } from '../../state/AuthContext'

/**
 * Fetches the host's own cars and the real bookings made on them, once, at the top of the
 * owner section (`OwnerLayout`). Every page below reads the same fleet back out through
 * `useOwner()` instead of re-fetching.
 *
 * `?mine=true` on `GET /cars` is what makes "my cars" actually mean that — it filters to
 * `Car.author === request.user` server-side and, unlike the public listing, includes paused
 * cars the host still needs to see and manage.
 */
export function useOwnerFleet() {
  const { user } = useAuth()
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Bumped after a car is listed or edited, so the effect below re-fetches without every
  // caller needing to know the fetch even happened.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!user) return undefined
    const ac = new AbortController()
    setLoading(true)

    Promise.all([
      carsApi.list({ mine: true, page_size: 50 }, { signal: ac.signal }),
      hostApi.rentals({}, { signal: ac.signal }),
    ])
      .then(([carsData, rentalsData]) => {
        setFleet(buildFleet(toList(carsData), toList(rentalsData)))
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
  }, [user, refreshTick])

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), [])

  const rentalsList = fleet.flatMap((c) => c.rentals)
  const payouts = payoutRows(rentalsList, 5)
  const nextPayout = payouts[0]?.paidOut || 0

  return { fleet, rentals: rentalsList, loading, error, payouts, nextPayout, refresh }
}

/** Read the fleet `OwnerLayout` already fetched — call this from any page under `/owner`. */
export function useOwner() {
  return useOutletContext()
}
