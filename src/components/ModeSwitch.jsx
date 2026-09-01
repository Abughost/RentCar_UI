import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function ModeSwitch({ onNavigate }) {
  const { pathname } = useLocation()
  const { isOwner, isClient } = useAuth()
  const isHosting = pathname.startsWith('/owner')

  if (isOwner) {
    return (
      <NavLink
        to="/owner"
        className={({ isActive }) => (isActive || isHosting ? 'is-on' : undefined)}
        onClick={onNavigate}
      >
        My cars
      </NavLink>
    )
  }

  if (isClient) {
    return (
      <NavLink
        to="/cars"
        className={({ isActive }) => (isActive ? 'is-on' : undefined)}
        onClick={onNavigate}
      >
        Find a car
      </NavLink>
    )
  }

  return (
    <div className="modesw" data-on={isHosting ? 'host' : 'rent'}>
      <span className="modesw__thumb" />
      <NavLink to="/account" className={`modesw__b${!isHosting ? ' is-on' : ''}`} onClick={onNavigate}>
        Renting
      </NavLink>
      <NavLink to="/owner" className={`modesw__b${isHosting ? ' is-on' : ''}`} onClick={onNavigate}>
        Hosting
      </NavLink>
    </div>
  )
}
