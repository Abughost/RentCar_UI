import { api } from './client'

/**
 * One function per route in apps/urls.py. Nothing else in the app builds a URL.
 */

/* ---------------------------------------------------------------- auth */

export const auth = {
  /**
   * Step 1 of sign-up. Parks the three account fields in Redis behind a one-time code —
   * no row is written until the code is confirmed. Answers 429 with {retry_after} while a
   * previous code is still inside its resend window, or during a lockout.
   */
  sendCode: ({ username, email, password }) =>
    api.post('auth/send-code', { username, email, password }, { auth: false }),

  /**
   * Step 2. Creates the User once the code matches and hands back {access, refresh, user},
   * so the customer is signed in without retyping the password.
   *
   * A wrong code answers 400 with {message, attempts_left}; the last allowed attempt returns
   * {message, retry_after, attempts_left: 0}. The serializer field is an IntegerField, so the
   * six digits go over as a number.
   */
  verifyCode: ({ email, code }) =>
    api.post(
      'auth/verify-code',
      { email, code: Number(String(code).replace(/\D/g, '')) },
      { auth: false },
    ),

  /**
   * Username, e-mail or phone plus a password, for a JWT pair. Returns {access, refresh, user}.
   * The backend resolves the identifier against User.contact first, then User.username.
   */
  login: ({ contact, password }) => api.post('auth/login', { contact, password }, { auth: false }),

  /** Returns {is_authenticated, user}. Safe to call anonymously. */
  status: () => api.get('auth/user/status'),

  /**
   * Step 3. Creates the UserProfile carrying licence and ID-card data. The backend flips
   * User.is_registered on save, and no booking is allowed until it exists.
   */
  createProfile: (profile) => api.post('auth/register', profile),
}

/* ---------------------------------------------------------------- cars */

export const cars = {
  /**
   * Cursor-paginated. Responses come back as {next_page, previous_page, data}.
   * `cursor` is the full next_page/previous_page URL returned by a previous call.
   */
  list: (params = {}, options) => {
    if (params.cursorUrl) return api.get(params.cursorUrl, options)
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    const q = qs.toString()
    return api.get(`cars${q ? `?${q}` : ''}`, options)
  },

  detail: (id, options) => api.get(`cars/${id}`, options),

  brands: (options) => api.get('cars/brand', options),

  categories: (options) => api.get('cars/category', options),
}

/* ---------------------------------------------------------------- rentals */

export const rentals = {
  /** The signed-in customer's own bookings. */
  mine: (options) => api.get('user/rentals', options),

  /**
   * Rental.user is a UserProfile, resolved server-side from request.user — so the payload
   * carries no user field. A missing profile comes back as a 400, not a silent 201.
   */
  create: (booking) => api.post('user/rentals', booking),

  detail: (id, options) => api.get(`user/rentals/${id}`, options),

  cancel: (id) => api.del(`user/rentals/${id}`),

  history: (options) => api.get('rentals/history', options),
}

/* ---------------------------------------------------------------- news */

export const news = {
  list: (options) => api.get('news', options),
  detail: (id, options) => api.get(`news/${id}`, options),
}

/* ---------------------------------------------------------------- helpers */

/**
 * Unwrap whatever the endpoint returned into a plain array. CarModelViewSet paginates
 * through CustomCursorPagination ({next_page, previous_page, data}); the plain
 * ListAPIViews for brands and categories return a bare list; DRF's own PageNumber shape
 * ({count, results}) is handled too, in case the default pagination class kicks in.
 */
export function toList(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.results)) return payload.results
  return []
}

export function pageLinks(payload) {
  if (!payload || Array.isArray(payload)) return { next: null, previous: null }
  return { next: payload.next_page ?? payload.next ?? null, previous: payload.previous_page ?? payload.previous ?? null }
}
