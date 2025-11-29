// YFS Service Worker v3.0 - Push Notifications & Background Sync
const CACHE_NAME = 'yfs-v3';
const STATIC_CACHE = 'yfs-static-v3';
const DYNAMIC_CACHE = 'yfs-dynamic-v3';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except for CDNs we trust)
  if (url.origin !== self.location.origin) {
    // Allow WebRTC adapter
    if (url.hostname === 'webrtc.github.io') {
      event.respondWith(
        caches.match(request).then((cached) => {
          return cached || fetch(request).then((response) => {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          });
        })
      );
    }
    return;
  }

  // Network-first for HTML pages (to get latest content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request) || caches.match('/'))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  console.log('[SW] Notification clicked:', action);
  notification.close();

  // Open the app and focus it
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            // Send message to handle the action
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: action || 'default',
              data: notification.data
            });
            return;
          }
        }
        // No window found, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle push events for background notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Your Future Self is Calling',
      body: event.data.text()
    };
  }

  const options = {
    body: data.body || 'You have a reminder!',
    icon: '/icon-192.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'yfs-notification',
    data: data.data || {},
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'answer', title: 'Answer' },
      { action: 'snooze', title: 'Snooze' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'YFS Reminder', options)
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

// Background sync for offline reminder creation
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      // In a full implementation, this would sync with a backend
      Promise.resolve()
    );
  }
});

console.log('[SW] Service worker loaded');
