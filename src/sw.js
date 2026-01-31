/**
 * YourScore Service Worker
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'yourscore-v4';

const ASSET_PATHS = [
  './',           // Root URL (how iOS opens the PWA)
  'index.html',   // Also cache by filename
  'manifest.json',
  'css/main.css',
  'css/themes.css',
  'css/components.css',
  'js/app.js',
  'js/i18n/i18n.js',
  'js/i18n/translations.js',
  'js/storage/db.js',
  'js/storage/migrations.js',
  'js/models/activity.js',
  'js/models/category.js',
  'js/models/completion.js',
  'js/models/score.js',
  'js/models/settings.js',
  'js/services/decay.js',
  'js/services/achievements.js',
  'js/services/export.js',
  'js/views/activities.js',
  'js/views/categories.js',
  'js/views/daily.js',
  'js/views/dashboard.js',
  'js/views/settings.js',
  'js/components/activity-card.js',
  'js/components/achievement-badge.js',
  'js/components/score-display.js',
  'js/components/toast.js',
  'js/utils/date.js',
  'js/utils/celebrations.js',
  'assets/icons/icon-72.png',
  'assets/icons/icon-96.png',
  'assets/icons/icon-128.png',
  'assets/icons/icon-144.png',
  'assets/icons/icon-152.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-384.png',
  'assets/icons/icon-512.png',
];

const STATIC_ASSETS = ASSET_PATHS.map((path) => new URL(path, self.registration.scope).toString());
const OFFLINE_URL = new URL('index.html', self.registration.scope).toString();

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for offline reliability (especially iOS)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {return;}

  // Navigation requests (opening the app, page loads)
  // Use CACHE-FIRST for reliability on iOS where SW can be killed after hours of inactivity
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // Try cache first - critical for iOS offline reliability
      const cachedResponse = await cache.match(event.request) || await cache.match(OFFLINE_URL);

      if (cachedResponse) {
        // Return cached version immediately, but update cache in background
        event.waitUntil((async () => {
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.ok) {
              await cache.put(event.request, networkResponse.clone());
              await cache.put(OFFLINE_URL, networkResponse);
            }
          } catch (e) {
            // Network failed, that's fine - we served from cache
          }
        })());
        return cachedResponse;
      }

      // No cache - must try network
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          cache.put(event.request, response.clone());
          cache.put(OFFLINE_URL, response.clone());
        }
        return response;
      } catch (error) {
        // Nothing in cache and network failed
        return new Response('<!DOCTYPE html><html><body><h1>Offline</h1><p>Please connect to the internet and reload.</p></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    })());
    return;
  }

  // Static assets - cache-first with network fallback
  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await fetch(event.request);
      if (!response || response.status !== 200) {
        return response;
      }

      const responseToCache = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, responseToCache);

      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
