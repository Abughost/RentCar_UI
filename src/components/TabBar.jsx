import { NavLink } from 'react-router-dom'
import { Icon } from './primitives'

const TABS = [
  { to: '/cars', label: 'SEARCH', icon: 'search' },
  { to: '/account', label: 'TRIPS', icon: 'key' },
  { to: '/stations', label: 'STATIONS', icon: 'pin' },
  { to: '/account/settings', label: 'ACCOUNT', icon: 'user' },
]

/** Frame 09's bottom bar. CSS keeps it off screens wider than 760px. */
export default function TabBar({ dark = false }) {
  return (
    <nav className={`tabbar${dark ? ' tabbar--dark' : ''}`} aria-label="Main">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tabbar__t${isActive ? ' is-on' : ''}`}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
