/**
 * Action3 Service Worker - Web Push Notifications
 * Handles push notification display and click handling.
 */

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

// Push event - display the notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Action3',
    body: '你有新的提醒',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'action3-notification',
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
        data: payload.data || {},
      };
    }
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: data.data?.requireInteraction || false,
    actions: data.data?.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options),
  );
});

// Notification click - focus or open the app
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || event.notification.data?.urlToOpen || '/action3/home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window first
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Send message to client about notification click
          if (client.postMessage) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              notification: {
                tag: event.notification.tag,
                data: event.notification.data,
                action: event.action || 'default',
              },
            });
          }
          return;
        }
      }
      // No existing window, open new one
      return self.clients.openWindow(urlToOpen);
    }).catch((err) => {
      // If matchAll fails (e.g., permissions), just open a new window
      console.log('[SW] matchAll failed, opening new window:', err);
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

// Message event - for controlling the SW from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_SUBSCRIPTION') {
    event.waitUntil(
      self.registration.pushManager.getSubscription().then((sub) => {
        const client = event.source;
        client.postMessage({
          type: 'SUBSCRIPTION_STATUS',
          subscribed: !!sub,
          subscription: sub,
        });
      }),
    );
  }
});

