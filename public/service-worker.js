// Service Worker for handling notifications
const CACHE_NAME = 'air-notifications-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico',
        // Add other assets you want to cache
      ]);
    })
  );
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  
  // Close the notification
  notification.close();
  
  // Handle the action
  if (action === 'answer') {
    // Focus the app window and handle the call
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
  // 'decline' action just closes the notification
});

// Handle push events for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const { title, body, icon, tag, data: notificationData } = data;
  
  const options = {
    body,
    icon: icon || '/favicon.ico', // Default icon
    tag: tag || 'push-notification',
    data: notificationData || {},
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    Promise.resolve().then(() => {
      // Here you would typically send the new subscription to your server
      console.log('Push subscription changed');
    })
  );
});
