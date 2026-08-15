import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from '../../components/primitives'
import { money } from '../../lib/pricing'
import { fullName, initials, useAuth } from '../../state/AuthContext'
import { useOwnerFleet } from './useOwnerFleet'

/**
 * Frames 12–17. The two-column "hosting" shell — sidebar plus a bone-100 canvas — that every
 * owner page sits inside. Renting and hosting are the same account; this is a mode switch,
 * not a second sign-in, so `RequireAuth` in App.jsx is the only gate.
 */
const SIDEBAR = [
  { to: '/owner', end: true, icon: 'slider', label: 'Overview' },
  { to: '/owner/cars', icon: 'key', label: 'My cars', badge: 'fleet' },
  { to: '/owner/live', icon: 'pin', label: 'Live map' },
  { to: '/owner/calendar', icon: 'cal', label: 'Calendar' },
  { to: '/owner/history', icon: 'route', label: 'History' },
  { to: '/owner/earnings', icon: 'card', label: 'Earnings', badge: 'payout' },
  { to: '/owner/renters', icon: 'user', label: 'Renters' },
  { to: '/owner/documents', icon: 'doc', label: 'Documents' },
]

export default function OwnerLayout() {
  const { user } = useAuth()
  const owner = useOwnerFleet()
  const { fleet, nextPayout } = owner
  const location = useLocation()

  return (
    <div className="page">
      <div className="hostshell">
        <aside className="hside">
          <Link to="/" className="nav__logo" style={{ fontSize: 20 }}>
            KM<em>0</em>
          </Link>

          <div className="modesw">
            <Link to="/account" className="modesw__b">
              RENTING
            </Link>
            <span className="modesw__b is-on">HOSTING</span>
          </div>

          <div className="hside__nav">
            {SIDEBAR.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `side__l${isActive ? ' is-on' : ''}`}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
                {item.badge === 'fleet' && fleet.length > 0 && (
                  <span className="side__badge">{fleet.length}</span>
                )}
                {item.badge === 'payout' && nextPayout > 0 && (
                  <span className="side__badge">{money(nextPayout, { cents: false })}</span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="hside__foot" style={{ marginTop: 'auto', width: '100%' }}>
            <div className="divider--onDark" style={{ margin: '18px 0' }} />
            {nextPayout > 0 && (
              <div
                style={{
                  background: 'rgba(244,203,46,.12)',
                  borderRadius: 'var(--r-s)',
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--signal)', marginBottom: 5 }}>
                  Payout on Monday
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(233,235,228,.6)', lineHeight: 1.45 }}>
                  {money(nextPayout, { cents: true })} scheduled. Payouts run every Monday at 09:00.
                </div>
              </div>
            )}
            <div className="side__u" style={{ border: 0, padding: 0, margin: 0 }}>
              <span className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                {initials(user)}
              </span>
              <div>
                <div className="side__n">{fullName(user)}</div>
                <div className="side__t">
                  HOST · {fleet.length} CAR{fleet.length === 1 ? '' : 'S'} · 4.9★
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="hmain">
          <Outlet context={owner} key={location.pathname} />
        </main>
      </div>
    </div>
  )
}
