// Controls whether the app allows pinch-zoom. Default is OFF (app-like feel);
// users can enable it in settings for accessibility. Persisted in localStorage
// and applied by rewriting the viewport meta tag.

const KEY = 'mealplan_allow_zoom'
const NO_ZOOM = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
const ALLOW_ZOOM = 'width=device-width, initial-scale=1.0, viewport-fit=cover'

export function isZoomAllowed() {
  try { return localStorage.getItem(KEY) === 'true' } catch { return false }
}

export function applyZoomPref() {
  const meta = document.getElementById('app-viewport') || document.querySelector('meta[name="viewport"]')
  if (!meta) return
  meta.setAttribute('content', isZoomAllowed() ? ALLOW_ZOOM : NO_ZOOM)
}

export function setZoomAllowed(allowed) {
  try { localStorage.setItem(KEY, allowed ? 'true' : 'false') } catch {}
  applyZoomPref()
}
