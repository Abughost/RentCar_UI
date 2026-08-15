import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { CarArt, Icon } from '../components/primitives'

/** Content pages the nav promises. Same chrome, same voice, no invented data. */
function Shell({ eyebrow, title, lede, children }) {
  return (
    <div className="page">
      <Nav />
      <div className="sec">
        <div className="sec__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>
              {eyebrow}
            </p>
            <h1 className="dh2">{title}</h1>
            {lede && (
              <p className="lede" style={{ marginTop: 12, maxWidth: '58ch' }}>
                {lede}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
      <Footer />
      <TabBar />
    </div>
  )
}

export function LongTerm() {
  return (
    <Shell
      eyebrow="Long term"
      title="Keep it for a month"
      lede="The rate drops at every bracket. A fifteen-day rental is priced from the 15–30 day column, not fifteen times the daily rate."
    >
      <div className="value">
        <div className="value__c">
          <Icon name="route" size="lg" style={{ color: 'var(--signal)' }} />
          <div className="value__n">Four price brackets</div>
          <p className="value__t">
            1–3, 3–7, 7–15 and 15–30 days. The bracket is chosen automatically from the dates you
            pick — you never have to ask for the better rate.
          </p>
        </div>
        <div className="value__c">
          <Icon name="shield" size="lg" style={{ color: 'var(--signal)' }} />
          <div className="value__n">One agreement</div>
          <p className="value__t">
            Cover, allowance and second driver carry across the whole period. No monthly re-signing
            at the counter.
          </p>
        </div>
        <div className="value__c">
          <Icon name="key" size="lg" style={{ color: 'var(--signal)' }} />
          <div className="value__n">Swap mid-term</div>
          <p className="value__t">
            Need a van for a weekend in the middle of a month on a saloon? Swap at any station and
            we re-price the days.
          </p>
        </div>
      </div>
      <div style={{ marginTop: 26 }}>
        <Link to="/cars" className="btn btn--signal btn--lg">
          See the fleet
        </Link>
      </div>
    </Shell>
  )
}

export function Business() {
  return (
    <Shell
      eyebrow="Business"
      title="Bill the trip to your employer"
      lede="Company accounts are provisioned by an administrator in the back office and carry the moderator or admin role."
    >
      <div className="empty" style={{ textAlign: 'left' }}>
        <h2 className="dh3" style={{ marginBottom: 10 }}>
          Already have a company account?
        </h2>
        <p className="small" style={{ marginBottom: 18, maxWidth: '60ch' }}>
          Sign in with the contact and password your administrator issued. Staff accounts skip the
          one-time-code flow entirely and land straight in the fleet.
        </p>
        <Link to="/signin" className="btn btn--pine">
          Sign in
        </Link>
      </div>
    </Shell>
  )
}

export function Help() {
  const FAQ = [
    {
      q: 'How do I change or cancel a booking?',
      a: 'Open Account → Trips and cancel from the trip card. It is free until 24 hours before pick-up.',
    },
    {
      q: 'What do I bring to the counter?',
      a: 'Nothing, once your licence is on file. The plate number and bay arrive by text an hour before pick-up.',
    },
    {
      q: 'Why do I need to add a licence before booking?',
      a: 'A rental is written against your profile, and the profile is what carries the licence and ID-card numbers. Without it the booking is refused.',
    },
    {
      q: 'How is the daily rate decided?',
      a: 'By how long you book for. Each car has four price brackets and the one matching your dates is applied automatically.',
    },
  ]

  return (
    <Shell eyebrow="Support" title="Help" lede="The questions the counter used to answer.">
      <div className="acc" style={{ maxWidth: '70ch' }}>
        {FAQ.map((item) => (
          <div key={item.q}>
            <div className="acc__r" style={{ cursor: 'default' }}>
              <span className="acc__t">{item.q}</span>
            </div>
            <div className="acc__body">{item.a}</div>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function NotFound() {
  return (
    <div className="page">
      <Nav />
      <div className="sec">
        <div className="empty">
          <CarArt shape="van" className="empty__art" />
          <h1 className="dh2" style={{ marginBottom: 10 }}>
            That road doesn't go anywhere
          </h1>
          <p className="small" style={{ marginBottom: 20 }}>
            The page you asked for isn't part of the product.
          </p>
          <Link to="/" className="btn btn--signal">
            Back to the start
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
