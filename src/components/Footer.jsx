import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    head: 'Rent',
    links: [
      { label: 'Find a car', to: '/cars' },
      { label: 'Monthly rental', to: '/long-term' },
      { label: 'Delivery', to: '/cars?mode=delivery' },
      { label: 'One-way trips', to: '/stations' },
    ],
  },
  {
    head: 'Stations',
    links: [
      { label: 'Northgate', to: '/stations' },
      { label: 'Airport T2', to: '/stations' },
      { label: 'Harbour Yard', to: '/stations' },
      { label: 'All 11 stations', to: '/stations' },
    ],
  },
  {
    head: 'Support',
    links: [
      { label: 'Change a booking', to: '/account' },
      { label: 'Damage & claims', to: '/help' },
      { label: 'Fines and tolls', to: '/help' },
      { label: 'Contact', to: '/help' },
    ],
  },
  {
    head: 'Company',
    links: [
      { label: 'About', to: '/help' },
      { label: 'Fleet standards', to: '/help' },
      { label: 'News', to: '/news' },
      { label: 'Design system', to: '/design-system' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot__grid">
        <div>
          <span className="nav__logo" style={{ fontSize: 24 }}>
            KM<em>0</em>
          </span>
          <p className="foot__blurb">
            Car rental measured from zero. Founded 2019, 912 cars, four cities.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.head}>
            <p className="foot__h">{col.head}</p>
            <span className="foot__l">
              {col.links.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="foot__base">
        <span>© {new Date().getFullYear()} KM0 MOBILITY</span>
        <span>TERMS · PRIVACY · COOKIES · RENTAL AGREEMENT</span>
      </div>
    </footer>
  )
}
