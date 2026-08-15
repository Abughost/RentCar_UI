import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { tokens } from '../api/client'
import { auth as authApi } from '../api/endpoints'

/**
 * Who is signed in, and what they are allowed to do.
 *
 * The backend models identity in two stages: a lightweight `User` created by the OTP flow,
 * which is enough to browse, and a `UserProfile` carrying licence and ID-card data, which
 * `IsRegisteredUser` insists on before any booking. `user.is_registered` is the flag that
 * tells the two apart, so it drives every routing decision in the app.
 */

const AuthContext = createContext(null)

const USER_KEY = 'km0.user'

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Seed from cache so a reload does not flash the signed-out UI before /auth/user/status
  // comes back.
  const [user, setUser] = useState(readCachedUser)
  const [loading, setLoading] = useState(true)

  const persist = useCallback((next) => {
    setUser(next)
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
    else localStorage.removeItem(USER_KEY)
  }, [])

  // Confirm the cached user against the server once on boot. A refresh token that has
  // expired shows up here as is_authenticated:false.
  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!tokens.access && !tokens.refresh) {
        if (!cancelled) {
          persist(null)
          setLoading(false)
        }
        return
      }
      try {
        const data = await authApi.status()
        if (cancelled) return
        if (data?.is_authenticated) persist(data.user)
        else {
          tokens.clear()
          persist(null)
        }
      } catch {
        // A network blip should not sign anyone out; keep the cached user and let the next
        // authenticated call decide.
        if (!cancelled && !tokens.refresh) persist(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [persist])

  const signIn = useCallback(
    async ({ contact, password }) => {
      const data = await authApi.login({ contact, password })
      tokens.set({ access: data.access, refresh: data.refresh })
      persist(data.user)
      return data.user
    },
    [persist],
  )

  /**
   * Adopt the session /auth/verify-code just handed back. That endpoint answers with the same
   * {access, refresh, user} shape as login, so a customer who typed the right code is signed
   * in without being asked for the password they set two screens ago.
   */
  const adoptSession = useCallback(
    (data) => {
      tokens.set({ access: data.access, refresh: data.refresh })
      persist(data.user)
      return data.user
    },
    [persist],
  )

  const signOut = useCallback(() => {
    tokens.clear()
    persist(null)
  }, [persist])

  /**
   * Called after the licence step. The profile POST flips User.is_registered server-side,
   * so refresh the user rather than guessing.
   */
  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.status()
      if (data?.is_authenticated) {
        persist(data.user)
        return data.user
      }
    } catch {
      /* leave the cached user in place */
    }
    return null
  }, [persist])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      adoptSession,
      refreshUser,
      setUser: persist,
      isAuthenticated: !!user,
      /** Staff skip the OTP flow entirely, so they count as registered. */
      isRegistered: !!user && (user.is_registered || user.is_staff || user.role === 'admin' || user.role === 'moderator'),
      isStaff: !!user && (user.is_staff || user.role === 'admin' || user.role === 'moderator'),
    }),
    [user, loading, signIn, signOut, adoptSession, refreshUser, persist],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Two-letter monogram for the avatar chip. */
export function initials(user) {
  if (!user) return '··'
  const a = (user.first_name || '').trim()
  const b = (user.last_name || '').trim()
  if (a || b) return `${a[0] || ''}${b[0] || ''}`.toUpperCase() || '··'
  // Sign-up collects a username, not a name — the licence step is what fills first/last in.
  return (user.username || user.contact || '?').slice(0, 2).toUpperCase()
}

export function fullName(user) {
  if (!user) return 'Guest'
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.username || user.contact || 'Guest'
}
