/**
 * YourScore Service Worker
 * Provides offline functionality and caching
 *
 * iOS Safari specific notes:
 * - iOS aggressively terminates service workers after inactivity
 * - Caches may be evicted under storage pressure unless persistent storage is granted
 * - The SW must be able to serve content immediately upon reactivation
 */

const CACHE_NAME = 'yourscore-v7';

// Core assets that MUST be cached for offline functionality
// Listed in order of priority for iOS where cache space may be limited
const CORE_ASSETS = [
  './',           // Root URL (how iOS opens the PWA from home screen)
  './index.html', // Explicit path for navigation requests
  './manifest.json',
  './css/main.css',
  './css/themes.css',
  './css/components.css',
  './js/app.js',
  './js/i18n/i18n.js',
  './js/i18n/translations.js',
  './js/storage/db.js',
  './js/storage/migrations.js',
  './js/models/activity.js',
  './js/models/category.js',
  './js/models/completion.js',
  './js/models/score.js',
  './js/models/settings.js',
  './js/services/decay.js',
  './js/services/achievements.js',
  './js/services/export.js',
  './js/views/activities.js',
  './js/views/categories.js',
  './js/views/daily.js',
  './js/views/dashboard.js',
  './js/views/settings.js',
  './js/components/activity-card.js',
  './js/components/achievement-badge.js',
  './js/components/score-display.js',
  './js/components/toast.js',
  './js/utils/date.js',
  './js/utils/celebrations.js',
];

// Non-critical assets (icons) - cached separately so core app works even if these fail
const ICON_ASSETS = [
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
];

const ALL_ASSETS = [...CORE_ASSETS, ...ICON_ASSETS];

// Install event - cache static assets
// On iOS, we cache core assets first to ensure the app works even if icon caching fails
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Caching core assets...');

        // Cache core assets first - these are required for the app to work
        await cache.addAll(CORE_ASSETS);
        console.log('[SW] Core assets cached');

        // Then cache icons - failure here won't break the app
        try {
          await cache.addAll(ICON_ASSETS);
          console.log('[SW] Icon assets cached');
        } catch (e) {
          console.log('[SW] Some icons failed to cache (non-critical):', e);
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and immediately claim clients
// This is important on iOS where the SW may be terminated and restarted
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('yourscore-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );

      // Immediately claim all clients so the new SW takes over
      await self.clients.claim();
      console.log('[SW] Activated and claimed clients');

      // Verify cache integrity - if core assets are missing, try to re-cache
      // This helps recover from iOS cache eviction
      const cache = await caches.open(CACHE_NAME);
      const cachedRequests = await cache.keys();
      const cachedUrls = cachedRequests.map(r => r.url);

      const missingCore = CORE_ASSETS.filter(asset => {
        const fullUrl = new URL(asset, self.registration.scope).toString();
        return !cachedUrls.includes(fullUrl);
      });

      if (missingCore.length > 0) {
        console.log('[SW] Re-caching missing core assets:', missingCore);
        try {
          await cache.addAll(missingCore);
        } catch (e) {
          console.log('[SW] Failed to re-cache some assets:', e);
        }
      }
    })()
  );
});

// Fetch event - cache-first strategy for offline reliability (especially iOS)
// iOS can terminate service workers after inactivity, so we must:
// 1. Always try cache first for reliability
// 2. Handle cases where cache might be partially evicted
// 3. Provide graceful fallbacks
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {return;}

  const requestUrl = new URL(event.request.url);

  // Only handle same-origin requests
  if (requestUrl.origin !== self.location.origin) {return;}

  // Navigation requests (opening the app, page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // Build list of possible matches for navigation
      // iOS PWAs may request different URLs depending on how they're opened
      const urlsToTry = [
        event.request.url,
        new URL('./', self.registration.scope).toString(),
        new URL('./index.html', self.registration.scope).toString(),
      ];

      // Try cache first - critical for iOS offline reliability
      let cachedResponse = null;
      for (const url of urlsToTry) {
        cachedResponse = await cache.match(url);
        if (cachedResponse) {break;}
      }

      if (cachedResponse) {
        // Return cached version immediately, but update cache in background when online
        event.waitUntil((async () => {
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.ok) {
              // Update cache with fresh content
              await cache.put(event.request, networkResponse.clone());
              // Also update the index.html entry
              const indexUrl = new URL('./index.html', self.registration.scope).toString();
              await cache.put(indexUrl, networkResponse.clone());
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
          // Cache the response for future offline use
          await cache.put(event.request, response.clone());
          const indexUrl = new URL('./index.html', self.registration.scope).toString();
          await cache.put(indexUrl, response.clone());
        }
        return response;
      } catch (error) {
        // Nothing in cache and network failed - show offline message
        return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YourScore - Offline</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #FFF8F0; color: #333; }
    .container { text-align: center; padding: 20px; }
    h1 { color: #FF8F3D; }
    button { background: #FF8F3D; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>YourScore</h1>
    <p>You're offline and the app hasn't been cached yet.</p>
    <p>Please connect to the internet and reload.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    })());
    return;
  }

  // Static assets - cache-first with network fallback
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Try cache first
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      // Optionally update cache in background (stale-while-revalidate)
      event.waitUntil((async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            await cache.put(event.request, networkResponse);
          }
        } catch (e) {
          // Network unavailable, cached version is fine
        }
      })());
      return cachedResponse;
    }

    // Not in cache, try network
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        // Cache for future use
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      // For non-navigation requests, just return an error
      console.log('[SW] Fetch failed for:', event.request.url);
      return Response.error();
    }
  })());
});
