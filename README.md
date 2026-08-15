<div align="center">

# RentCar_UI — KM0

**The customer-facing front end for the [RentCar](../RentCar) Django REST API.**

Ten screens from the KM0 product design, built as a React SPA: browse the fleet, price a
rental against its length brackets, verify a licence once, and book a car.

React 18 · Vite 5 · React Router 6 · no UI framework, no CSS-in-JS

</div>

---

## What this is

`RentCar` is the backend — Django 5.2, DRF, PostgreSQL, Redis, JWT. This repository is a
separate front-end project that talks to it over HTTP and holds no server code of its own.

The design source is `km0-rental-design_1.html`: ten frames covering the whole product
surface, in both a light and a dark theme. Every frame is implemented as a route here, and
the design tokens — including the full dark ramp — are ported verbatim into
`src/styles/tokens.css` and `src/styles/theme.css`, so the built product and the design file
resolve to the same colours, type scale and radii.

## Screens

| # | Frame | Route | Backed by |
|---|---|---|---|
| 00 | Foundations | `/design-system` | — (live component shelf) |
| 01 | Sign in | `/signin` | `POST auth/login` |
| 02 | Create account | `/register`, `/register/verify`, `/register/licence` | `auth/send-code`, `auth/verify-code`, `auth/register` |
| 03 | Home | `/` | `cars`, `cars/category`, `news` |
| 04 | Find a car | `/cars` | `cars` (cursor-paginated) |
| 05 | Car detail & reserve | `/cars/:id` | `cars/:id` |
| 06 | Checkout | `/checkout/:carId` | `POST user/rentals` |
| 07 | Booking confirmed | `/booking/:id/confirmed` | `user/rentals/:id` |
| 08 | Account — trips | `/account`, `/account/:section` | `user/rentals`, `cars/:id` |
| 09 | Mobile | responsive, plus `/trip/:id` | `user/rentals/:id` |

Frame 09 is not a separate build. The three phone screens in the design are the mobile
layouts of Home, Find a car and the live trip, so they are reached by narrowing the window;
`/trip/:id` is the running-trip screen with its hold-to-unlock control.

Supporting routes the nav promises: `/stations`, `/news`, `/news/:id`, `/long-term`,
`/business`, `/help`.

## Running it

Both projects run side by side. **Backend first:**

```bash
cd ../RentCar && make run
```

That runs migrations, seeds the admin and starts Django on `:8000`. It needs PostgreSQL and
Redis reachable at the values in `RentCar/env/.env`.

**Then the front end:**

```bash
npm install && npm run dev
```

Open http://localhost:3000.

### Why a proxy, not CORS

The Django project has no `django-cors-headers` in `INSTALLED_APPS`, so a browser on
`:3000` would have every call to `:8000` refused. `vite.config.js` proxies instead, which
keeps the front end same-origin and leaves the backend untouched:

```js
'^/(en|uz)/api/': { target: 'http://127.0.0.1:8000', changeOrigin: true }
```

Point it elsewhere with `VITE_BACKEND_ORIGIN` in a `.env` file — see `.env.example`.

For a real deployment you would either serve `dist/` from the same origin as Django, or add
`django-cors-headers` to the backend and set `VITE_BACKEND_ORIGIN` to its public URL.

### The language prefix

`root/urls.py` wraps everything in `i18n_patterns`, so the API lives at `/en/api/v1/…`, not
`/api/v1/…`. `src/api/client.js` prepends the prefix; `setLang('uz')` switches it and sets
`Accept-Language` to match.

## Theming

Light and dark, plus **Auto** which follows the operating system and keeps following it if
the OS theme changes while the tab is open. The choice persists in `localStorage` and
syncs across tabs.

The switch is the design's `.themetog` pill, and it appears in the top-right of every
screen: in the nav, on the pine panel of the sign-in and sign-up screens, and in the
account sidebar.

**No flash.** An inline script in `index.html` stamps `data-theme` on `<html>` before the
first paint, so a dark-theme user never sees a white page while React boots.
`ThemeContext` reads the same `km0.theme` key and takes over on mount.

### How the tokens work

Three layers, in `src/styles/`:

1. `tokens.css` — the ramp. `:root` holds the light values; `:root[data-theme='dark']`
   swaps them. Everything downstream reads `var(--bone-100)` and never a hex code, so most
   components invert for free.
2. Semantic tokens that **do not** invert: `--on-pine`, `--on-signal`, `--verified`. Pine
   panels are dark in both themes, so the text sitting on them must not flip with the ramp.
3. `theme.css` — the handful of cases a token swap cannot express: gradients, inputs that
   need to read as recessed rather than raised, and the objects with no dark mode at all.

Two things deliberately stay put in the dark theme, because they are physical objects
rather than interface surfaces:

- **The licence plate** — stamped metal, still `#E9EBE4` on a dark page.
- **The odometer** — a machined drum, keeps its metal gradient and its yellow trip digit.

`color-scheme` is set on the root in both themes, so native date and time pickers,
scrollbars and the caret match rather than staying stubbornly white.

Pine-800 sits too close to the card surface once the page goes dark, so interactive fills —
`.btn--pine`, selected chips, ticked checkboxes, completed steps — move up to pine-600, and
meters move to sage. Signal yellow lifts from `#F4CB2E` to `#F5D047` so it holds its
meaning against a dark ground.

### Contrast

Measured on the rendered tokens. The dark theme is comfortably past WCAG AA throughout —
body text 15.6:1, captions 4.97:1. Two pairs in the **light** theme come from the original
palette and fall short for normal text: `--ink-45` captions on a card sit at 3.55:1, and
`--brick` error text on the page background at 4.48:1. Both are the design's own values, so
they are left as drawn — nudging `--ink-45` to about `#6C746B` would clear AA if you want it.

## How it is put together

```
src/
  api/
    client.js        fetch wrapper: JWT header, one silent refresh on 401, error flattening
    endpoints.js     one function per route in apps/urls.py — nothing else builds a URL
  lib/
    pricing.js       bracket selection, quote arithmetic, money formatting
    dates.js         day counting, formatting, live-trip progress
    fleet.js         backend model → what the design shows (silhouette, plate, station)
  state/
    AuthContext.jsx     who is signed in; the two-stage User / UserProfile distinction
    BookingContext.jsx  the search-and-booking draft, persisted in sessionStorage
    ThemeContext.jsx    light / dark / system, persisted and synced across tabs
  components/         Sprite, primitives, Nav, Footer, CarCard, BookingRail,
                      ThemeToggle, guards
  pages/              one file per frame
  styles/             tokens → primitives → layout → pages → theme
```

### Authentication

The backend is contact-first: no usernames, a one-time code cached in Redis, then JWT.
Registration is three calls:

1. `auth/send-code` — caches a code against the phone number or email. In development the
   code is **printed to the Django console**, not sent by SMS.
2. `auth/verify-code` — creates the `User` once the code matches. It returns no tokens, so
   the app immediately calls `auth/login` with the credentials it already holds.
3. `auth/register` — creates the `UserProfile` carrying licence and ID-card numbers. This
   is what flips `User.is_registered`.

`IsRegisteredUser` refuses a booking without a profile, so `RequireProfile` enforces step 3
before checkout rather than letting the POST fail.

Access tokens last 6 hours and refresh tokens 30 days. A 401 triggers one silent refresh
(de-duplicated, so parallel 401s do not burn several rotations) before the user is signed out.

### Pricing

`CarPrice` stores a headline `daily_price` plus four length brackets — 1–3, 3–7, 7–15 and
15–30 days. The rate actually charged depends on how long the car is kept, so
`rateForDays()` picks the bracket from the date range and every screen reads its figures
from the single `quote()` object. The rail, the checkout and the voucher therefore cannot
disagree.

## What the API does not store

The design shows a few things the current data model has no field for. They are computed in
the browser and are **not** persisted:

| Shown | Where it comes from |
|---|---|
| Licence plate on every car | Derived from the car's UUID — stable per car, cosmetic |
| Booking reference `KM0-####` | Derived from the rental's UUID |
| Cover choice, extras, tax | Priced in `lib/pricing.js`; `Rental` has no line-item table |
| Station list | `lib/fleet.js`; the chosen name is written into the rental's location fields |
| Licence photo uploads | Held in the browser only — the profile endpoint takes numbers, not images |
| Unlock the car | No endpoint exists; the control resolves locally and says so |

Everything else on screen is live data.

## Backend endpoints that need attention

Three filters in `apps/filters.py` reference fields that do not exist on `Car`, so the
front end deliberately does not send them:

- `min_price` / `max_price` filter on `price`, which is the *reverse* accessor to `CarPrice`
- `type` filters on `type__name`; the field on `Car` is `category`
- `brand_uuid` filters on `brand__brand_name`; `CarBrand`'s field is `name`

`CarModelViewSet.search_fields` has the same problem — it lists `brand_name`, so `?search=`
would fail too. Price, body and gearbox filtering is done client-side over the fetched page
until those are fixed; fixing them server-side is a small change and the UI will pick it up
by passing the params through.

## Building

```bash
npm run build && npm run preview
```

Output lands in `dist/`. It is a static bundle — any web server will do, as long as unknown
paths fall back to `index.html` for client-side routing.
