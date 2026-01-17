/**
 * YourScore Service Worker
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'yourscore-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/themes.css',
  '/css/components.css',
  '/js/app.js',
  '/js/storage/db.js',
  '/js/storage/migrations.js',
  '/js/models/activity.js',
  '/js/models/category.js',
  '/js/models/completion.js',
  '/js/models/score.js',
  '/js/models/settings.js',
  '/js/services/decay.js',
  '/js/services/achievements.js',
  '/js/services/export.js',
  '/js/views/activities.js',
  '/js/views/categories.js',
  '/js/views/daily.js',
  '/js/views/dashboard.js',
  '/js/views/settings.js',
  '/js/components/activity-card.js',
  '/js/components/achievement-badge.js',
  '/js/components/score-display.js',
  '/js/components/toast.js',
  '/js/utils/date.js',
  '/js/utils/celebrations.js',
  '/assets/icons/icon-72.png',
  '/assets/icons/icon-96.png',
  '/assets/icons/icon-128.png',
  '/assets/icons/icon-144.png',
  '/assets/icons/icon-152.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-384.png',
  '/assets/icons/icon-512.png',
];

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

// Fetch event - cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {return;}

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});
