// Offline support: lessons and your last-loaded progress stay readable without signal.
// Saving still needs a connection; unsaved changes show "Changes not saved" with a Retry button.
const CACHE = 'academy-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
));

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) await cache.put(key, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(key);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/auth/')) return;
  if (url.pathname.startsWith('/_next/static/')) return event.respondWith(cacheFirst(request));
  if (request.mode === 'navigate') return event.respondWith(networkFirst(request, url.pathname));
  if (url.pathname === '/api/progress') return event.respondWith(networkFirst(request, url.pathname));
});
