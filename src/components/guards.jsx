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

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  return children
}

export function RequireProfile({ children }) {
  const { isAuthenticated, isRegistered, isClient, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  if (!isClient) return <Navigate to="/owner" replace />
  if (!isRegistered) return <Navigate to="/register/licence" state={{ from: location }} replace />
  return children
}

export function RequireOwner({ children }) {
  const { isAuthenticated, isOwner, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  if (!isOwner) return <Navigate to="/account" replace />
  return children
}

export function RequireClient({ children }) {
  const { isAuthenticated, isClient, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Booting />
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />
  if (!isClient) return <Navigate to="/owner" replace />
  return children
}
