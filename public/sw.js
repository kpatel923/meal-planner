// MealPlan service worker — installability + light offline.
//
// IMPORTANT: this worker intentionally does NOT call skipWaiting() or
// clients.claim() on install. Taking control of a page that is mid-load causes
// in-flight requests (the JS bundle) to be orphaned, which shows up as the app
// hanging on a blank/loading screen until you refresh. By letting a new worker
// wait and activate on the NEXT launch instead, cold starts are reliable.

const CACHE = 'mealplan-v3'
// Only cache the app shell that has STABLE urls. Vite's JS/CSS use hashed
// filenames, so we never hard-list them — they're cached at runtime instead.
const APP_SHELL = ['/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  // Pre-cache the shell, but do NOT skipWaiting — let the page finish loading
  // under whatever worker is already in control.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(APP_SHELL.map((u) => cache.add(u)))
    )
  )
})

self.addEventListener('activate', (event) => {
  // Clean up old caches. Claim clients only here (on activate, which for a new
  // worker happens on a later launch — never mid-load of the current page).
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch cross-origin or API/auth/data calls — straight to network.
  if (url.origin !== self.location.origin) return
  if (url.hostname.includes('supabase') ||
      url.pathname.startsWith('/rest/') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.includes('/functions/')) return

  // Navigations: network-first, fall back to cached shell only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Hashed build assets (JS/CSS) and other same-origin GETs: network-first so
  // a fresh deploy is always used when online, falling back to cache offline.
  // This avoids ever serving a stale/half-cached bundle on cold start.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
