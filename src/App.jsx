import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Sprite from './components/Sprite'
import { RequireAuth, RequireClient, RequireOwner, RequireProfile } from './components/guards'
import Account from './pages/Account'
import CarDetail from './pages/CarDetail'
import Cars from './pages/Cars'
import Checkout from './pages/Checkout'
import Confirmed from './pages/Confirmed'
import DesignSystem from './pages/DesignSystem'
import Home from './pages/Home'
import { NewsDetail, NewsList } from './pages/News'
import CarLive from './pages/owner/CarLive'
import Earnings from './pages/owner/Earnings'
import History from './pages/owner/History'
import ListCar from './pages/owner/ListCar'
import MyCars from './pages/owner/MyCars'
import OwnerComingSoon from './pages/owner/OwnerComingSoon'
import OwnerLayout from './pages/owner/OwnerLayout'
import Overview from './pages/owner/Overview'
import Register from './pages/Register'
import RentingLayout from './pages/RentingLayout'
import SignIn from './pages/SignIn'
import { Business, Help, LongTerm, NotFound } from './pages/Static'
import Stations from './pages/Stations'
import TripLive from './pages/TripLive'

/** Every navigation starts at the top of the new page, as a page load would. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <Sprite />
      <ScrollToTop />

      <Routes>
        {/* 03 */}
        <Route path="/" element={<Home />} />

        {/* 01 · 02 */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/:step" element={<Register />} />

        {/* 04 · 08 — Find a car and the account sections share one sidebar shell, so the
            "renting" side of the mode switch never loses its own nav the way /owner used to. */}
        <Route element={<RentingLayout />}>
          <Route path="/cars" element={<Cars />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/account/:section"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
        </Route>

        {/* 05 */}
        <Route path="/cars/:id" element={<CarDetail />} />

        {/* 06 — needs a UserProfile, or the rental POST is refused */}
        <Route
          path="/checkout/:carId"
          element={
            <RequireProfile>
              <Checkout />
            </RequireProfile>
          }
        />

        {/* 07 */}
        <Route
          path="/booking/:id/confirmed"
          element={
            <RequireAuth>
              <Confirmed />
            </RequireAuth>
          }
        />

        {/* 09c */}
        <Route
          path="/trip/:id"
          element={
            <RequireAuth>
              <TripLive />
            </RequireAuth>
          }
        />

        {/* 10–17 — hosting: list a car, then run it */}
        <Route
          path="/owner"
          element={
            <RequireOwner>
              <OwnerLayout />
            </RequireOwner>
          }
        >
          <Route index element={<Overview />} />
          <Route path="cars" element={<MyCars />} />
          <Route path="cars/new" element={<ListCar />} />
          <Route path="cars/:id" element={<CarLive />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="history" element={<History />} />
          <Route path="live" element={<OwnerComingSoon />} />
          <Route path="calendar" element={<OwnerComingSoon />} />
          <Route path="renters" element={<OwnerComingSoon />} />
          <Route path="documents" element={<OwnerComingSoon />} />
        </Route>

        {/* 00 */}
        <Route path="/design-system" element={<DesignSystem />} />

        {/* supporting */}
        <Route path="/stations" element={<Stations />} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/long-term" element={<LongTerm />} />
        <Route path="/business" element={<Business />} />
        <Route path="/help" element={<Help />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
