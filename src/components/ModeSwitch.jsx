import { NavLink, useLocation } from 'react-router-dom'

/**
 * Renting/hosting mode switch. Lives in the shared Nav so it's visible on every
 * authenticated page — including the owner shell, which used to bury its own copy
 * in the sidebar and lose the top bar entirely.
 */
export default function ModeSwitch({ onNavigate }) {
  const { pathname } = useLocation()
  const isHosting = pathname.startsWith('/owner')

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
