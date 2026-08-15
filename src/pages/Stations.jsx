import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Nav from '../components/Nav'
import TabBar from '../components/TabBar'
import { Button, Gauge, Icon } from '../components/primitives'
import { STATIONS, readyGauge } from '../lib/fleet'
import { useBooking } from '../state/BookingContext'

/**
 * The station list. Picking one writes it into the booking draft, which is what ends up in
 * the Rental's pick_up_location / drop_of_location fields.
 */
export default function Stations() {
  const { draft, update } = useBooking()
  const navigate = useNavigate()

  function choose(station) {
    update({ station: station.name, dropStation: station.name })
    navigate('/cars')
  }

  return (
    <div className="page">
      <Nav />

      <div className="sec">
        <div className="sec__head">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>
              Stations
            </p>
            <h1 className="dh2">Eleven places to start</h1>
            <p className="small" style={{ marginTop: 8, maxWidth: '60ch' }}>
              Every station is staffed at the hours shown and holds cars for twenty minutes once
              you reserve. Currently picking up from{' '}
              <strong style={{ color: 'var(--ink)' }}>{draft.station}</strong>.
            </p>
          </div>
        </div>

        <div className="stations">
          {STATIONS.map((station) => (
            <div key={station.id} className="station" style={{ cursor: 'default' }}>
              <div className="station__c">{station.name}</div>
              <div className="station__a">
                {station.address} · {station.hours}
              </div>
              <Gauge filled={readyGauge(station.ready)} caption={`${station.ready} cars ready`} />
              <Button
                variant={draft.station === station.name ? 'pine' : 'outline'}
                size="sm"
                block
                style={{ marginTop: 14 }}
                onClick={() => choose(station)}
              >
                <Icon name="pin" size="sm" />
                {draft.station === station.name ? 'Selected — see cars' : 'Pick up here'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Footer />
      <TabBar />
    </div>
  )
}
