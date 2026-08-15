import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import Nav from './Nav'
import { Spinner } from './primitives'

function Booting() {
  return (
    <div className="page">
      <Nav />
      <div className="sec">
        <Spinner label="Checking your session" />
      </div>
    </div>
  )
}

/** Signed in, or bounced to sign-in with somewhere to come back to. */
export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  return children
}

/**
 * Signed in *and* carrying a UserProfile. The backend's IsRegisteredUser rejects a booking
 * without one, so the licence step is enforced here rather than letting the POST 400.
 */
export function RequireProfile({ children }) {
  const { isAuthenticated, isRegistered, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  if (!isRegistered) return <Navigate to="/register/licence" state={{ from: location }} replace />
  return children
}
