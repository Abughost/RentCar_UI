import { Link, useLocation } from 'react-router-dom'

/**
 * The sidebar has eight items because the design does; four of them — live map, calendar,
 * renters, documents — have no page behind them yet. Rather than a dead link, each says what
 * it will hold and points at the thing that does work today. Same honesty as
 * `Account.jsx`'s `OtherSection`.
 */
const COPY = {
  '/owner/live': {
    title: 'Live map',
    body: 'A full-screen version of the map on Overview, following one car at a time. Open a car from My cars to see its live route today.',
    action: { to: '/owner/cars', label: 'Go to My cars' },
  },
  '/owner/calendar': {
    title: 'Calendar',
    body: 'A month grid across every car, for blocking dates and spotting gaps at a glance. Per-car availability is set from the listing flow today.',
    action: { to: '/owner/cars/new', label: 'List a car' },
  },
  '/owner/renters': {
    title: 'Renters',
    body: "The people who've booked your cars — their rating, how many trips, and a message thread. History has who rented what and when.",
    action: { to: '/owner/history', label: 'Go to History' },
  },
  '/owner/documents': {
    title: 'Documents',
    body: 'Insurance certificates and registration papers, per car. Upload one from a paused listing in My cars.',
    action: { to: '/owner/cars', label: 'Go to My cars' },
  },
}

export default function OwnerComingSoon() {
  const { pathname } = useLocation()
  const copy = COPY[pathname] || COPY['/owner/live']

  return (
    <div className="empty" style={{ textAlign: 'left' }}>
      <h2 className="dh3" style={{ marginBottom: 10 }}>
        {copy.title}
      </h2>
      <p className="small" style={{ marginBottom: 18, maxWidth: '60ch' }}>
        {copy.body}
      </p>
      <Link to={copy.action.to} className="btn btn--pine">
        {copy.action.label}
      </Link>
    </div>
  )
}
