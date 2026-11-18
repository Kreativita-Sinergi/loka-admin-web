const CACHE_PREFIX = 'loka-admin-offline-'
// Bump the version when offline.html changes.
const CACHE_NAME = CACHE_PREFIX + 'v1'
const OFFLINE_PAGE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(new Request(OFFLINE_PAGE, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode !== 'navigate' || request.method !== 'GET' ||
      new URL(request.url).origin !== self.location.origin) return

  // Only the public connection screen belongs in Cache Storage.
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.match(OFFLINE_PAGE)) ?? Response.error()
  }))
})
