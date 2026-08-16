import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { rentals as rentalsApi, toList } from '../api/endpoints'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Icon } from '../components/primitives'
import { useAuth } from '../state/AuthContext'

export const SECTIONS = [
  { id: 'trips', label: 'Trips', icon: 'key' },
  { id: 'licence', label: 'Licence & ID', icon: 'doc' },
  { id: 'payment', label: 'Payment', icon: 'card' },
  { id: 'loyalty', label: 'Loyalty', icon: 'star' },
  { id: 'invoices', label: 'Invoices', icon: 'route' },
  { id: 'settings', label: 'Settings', icon: 'user' },
]

/**
 * The renting-side counterpart to OwnerLayout: Nav plus a persistent sidebar, so "Find a car"
 * and the account sections stay on screen across every renting-mode page instead of vanishing
 * the moment a customer leaves /account for the fleet.
 */
export default function RentingLayout() {
  const { user, isStaff, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const [tripCount, setTripCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const ac = new AbortController()
    rentalsApi
      .mine({ signal: ac.signal })
      .then((data) => setTripCount(toList(data).length))
      .catch(() => {})
    return () => ac.abort()
  }, [isAuthenticated])

  const activeSection = pathname === '/account' ? 'trips' : pathname.replace('/account/', '')

  return (
    <div className="page">
      <Nav />

      {/* Guests can still browse /cars — the account sidebar only makes sense once someone
          is actually signed into a renting/hosting mode to switch between. */}
      {isAuthenticated ? (
        <div className="acct">
          <aside className="side">
            <div className="side__nav">
              <Link to="/cars" className={`side__l${pathname === '/cars' ? ' is-on' : ''}`}>
                <Icon name="search" size="sm" />
                Find a car
              </Link>
              {SECTIONS.map((item) => (
                <Link
                  key={item.id}
                  to={`/account/${item.id}`}
                  className={`side__l${activeSection === item.id ? ' is-on' : ''}`}
                >
                  <Icon name={item.icon} size="sm" />
                  {item.label}
                  {item.id === 'trips' && tripCount > 0 && <span className="side__badge">{tripCount}</span>}
                </Link>
              ))}
            </div>

            {isStaff && (
              <>
                <div className="divider--onDark" style={{ margin: '18px 0' }} />
                <a className="side__l" href="/en/admin/" target="_blank" rel="noreferrer">
                  <Icon name="out" size="sm" />
                  Django admin
                </a>
              </>
            )}

            {!user?.is_registered && !isStaff && (
              <>
                <div className="divider--onDark" style={{ margin: '18px 0' }} />
                <div className="side__warn">
                  <div className="side__warnT">Licence not on file</div>
                  <div className="side__warnX">
                    Add it once and every pick-up becomes a plate number and a key.
                  </div>
                  <Link to="/register/licence" className="btn btn--signal btn--sm" style={{ marginTop: 10 }}>
                    Add licence
                  </Link>
                </div>
              </>
            )}
          </aside>

          <main className="main">
            <Outlet />
          </main>
        </div>
      ) : (
        <Outlet />
      )}

      <TabBar />
    </div>
  )
}
