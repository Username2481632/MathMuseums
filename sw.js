// Service Worker for Math Museums PWA
// Update version numbers when deploying changes to force cache refresh
const CACHE_VERSION = '0.1.0';
const CACHE_NAME = `math-museums-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `math-museums-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `math-museums-dynamic-v${CACHE_VERSION}`;

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/styles.css',
  '/static/css/home.css',
  '/static/css/detail.css',
  '/static/css/onboarding.css',
  '/static/css/sync.css',
  '/static/css/display-settings.css',
  '/static/js/app.js',
  '/static/js/controllers/detail.js',
  '/static/js/controllers/home.js',
  '/static/js/controllers/onboarding.js',
  '/static/js/controllers/settings.js',
  '/static/js/utils/auth.js',
  '/static/js/utils/storage.js',
  '/static/js/utils/fileManager.js',
  '/static/js/utils/coordinates.js',
  '/static/js/utils/fontSizer.js',
  '/static/js/utils/preferences.js',
  '/static/js/utils/router.js',
  '/static/js/utils/desmos.js',
  '/static/js/utils/pwa.js',
  '/static/js/utils/share.js',
  '/static/js/utils/performance.js',
  '/static/js/models/concept.js',
  '/static/img/favicon.svg',
  '/static/img/export.svg',
  '/static/img/import.svg',
  '/static/img/settings.svg',
  '/static/img/icon-192.png',
  '/static/img/icon-512.png',
  '/static/img/icon-192-maskable.png',
  '/static/img/icon-512-maskable.png'
];

// External resources that should be cached
const EXTERNAL_ASSETS = [
  'https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache external assets
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.addAll(EXTERNAL_ASSETS);
      })
    ]).then(() => {
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName.startsWith('math-museums-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Ensure the service worker takes control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request).then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Determine which cache to use
        let cacheName = DYNAMIC_CACHE_NAME;
        if (STATIC_ASSETS.includes(url.pathname) || EXTERNAL_ASSETS.includes(request.url)) {
          cacheName = url.hostname === self.location.hostname ? STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;
        }

        // Cache the response
        caches.open(cacheName).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If network fails, try to serve fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // For other requests, try to serve a generic response
        if (request.destination === 'image') {
          // Return a placeholder for images
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="#999" font-family="Arial, sans-serif" font-size="14">Image unavailable</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

// Handle background sync for file operations
self.addEventListener('sync', event => {
  if (event.tag === 'background-save') {
    event.waitUntil(
      // Handle background save operations
      handleBackgroundSave()
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/static/img/icon-192.png',
    badge: '/static/img/favicon.svg',
    vibrate: [200, 100, 200],
    tag: 'math-museums-notification',
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/static/img/favicon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Math Museums', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function for background save operations
async function handleBackgroundSave() {
  try {
    // This would handle any pending save operations
    // Implementation would depend on your specific save requirements
  } catch (error) {
    console.error('Service Worker: Background save failed:', error);
  }
}

// Handle app installation prompt
self.addEventListener('beforeinstallprompt', event => {
  // This event is handled in the main app
});

// Update available notification
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
