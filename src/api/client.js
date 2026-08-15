/**
 * Thin fetch wrapper around the RentCar DRF API.
 *
 * Two things about the backend shape the design of this file:
 *
 *  1. root/urls.py wraps the API in i18n_patterns, so every path carries a language
 *     prefix — /en/api/v1/cars, not /api/v1/cars.
 *  2. Access tokens last 6 hours and refresh tokens 30 days (SIMPLE_JWT), so a 401 on a
 *     normal call almost always means "access expired", and is worth one silent retry
 *     after refreshing rather than bouncing the user to sign-in.
 */

const ACCESS_KEY = 'km0.access'
const REFRESH_KEY = 'km0.refresh'
const LANG_KEY = 'km0.lang'

export const DEFAULT_LANG = 'en'

export function getLang() {
  return localStorage.getItem(LANG_KEY) || DEFAULT_LANG
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang)
}

/* ------------------------------------------------------------------ tokens */

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  /** The first message DRF gave us for `field`, if any. */
  fieldError(field) {
    const v = this.data?.[field]
    if (!v) return null
    return Array.isArray(v) ? String(v[0]) : String(v)
  }
}

/**
 * DRF returns errors in a handful of shapes: {detail}, {field: [msg]}, {message: {...}},
 * or a bare list. Flatten whatever came back into one sentence a person can read.
 */
function readError(data, status) {
  if (!data) return `Something went wrong (${status}).`
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)

  if (data.message) {
    const m = data.message
    if (typeof m === 'string') return m
    if (Array.isArray(m)) return String(m[0])
    if (typeof m === 'object') return readError(m, status)
  }

  const first = Object.entries(data)[0]
  if (!first) return `Something went wrong (${status}).`
  const [field, value] = first
  const text = Array.isArray(value) ? value[0] : value
  if (typeof text === 'object') return readError(text, status)
  // non_field_errors reads as noise in the UI; the message alone is clearer.
  return field === 'non_field_errors' || field === 'detail' ? String(text) : `${String(text)}`
}

/* ------------------------------------------------------------------ refresh */

let refreshInFlight = null

async function refreshAccess() {
  const refresh = tokens.refresh
  if (!refresh) return false

  // One refresh at a time: several parallel 401s must not each burn a rotation.
  if (!refreshInFlight) {
    refreshInFlight = fetch(`/${getLang()}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json()
        tokens.set({ access: data.access, refresh: data.refresh })
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

/* ------------------------------------------------------------------ request */

async function raw(path, { method = 'GET', body, auth = true, signal, isForm = false } = {}) {
  const headers = {}
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`
  headers['Accept-Language'] = getLang()

  return fetch(path, {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })
}

/**
 * DRF builds its pagination links with request.build_absolute_uri(), so next_page and
 * previous_page come back pointing at the backend's own origin. Following one of those
 * verbatim would leave the dev proxy and hit :8000 cross-origin, where the missing CORS
 * headers stop it dead. Reduce any absolute URL to a same-origin path.
 */
function sameOrigin(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

/**
 * @param {string} path  API path *without* the language prefix, e.g. "cars" or "auth/login".
 *                       An absolute URL (a pagination cursor) is accepted and made relative.
 */
export async function request(path, options = {}) {
  const url = path.startsWith('http')
    ? sameOrigin(path)
    : `/${getLang()}/api/v1/${path.replace(/^\/+/, '')}`

  let res
  try {
    res = await raw(url, options)
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Is the backend running on port 8000?', {
      status: 0,
    })
  }

  if (res.status === 401 && options.auth !== false && tokens.refresh && !options._retried) {
    const ok = await refreshAccess()
    if (ok) return request(path, { ...options, _retried: true })
    tokens.clear()
  }

  if (res.status === 204) return null

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) throw new ApiError(readError(data, res.status), { status: res.status, data })
  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

/* ------------------------------------------------------------------ media */

/**
 * settings.MEDIA_URL is 'media/' with no leading slash, so DRF's build_absolute_uri can
 * hang an upload off whatever path the request came in on
 * (…/en/api/v1/media/car/…). Reduce anything we get back to a root-relative /media/… URL
 * so the Vite proxy can serve it.
 */
export function mediaUrl(value) {
  if (!value) return null
  const idx = value.indexOf('/media/')
  if (idx !== -1) return value.slice(idx)
  if (value.startsWith('media/')) return `/${value}`
  if (value.startsWith('http')) return value
  return value.startsWith('/') ? value : `/media/${value}`
}
