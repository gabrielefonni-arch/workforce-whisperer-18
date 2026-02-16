// Service Worker for Web Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: '⏰ Appuntamento', body: 'Hai un appuntamento in scadenza' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    console.error('Push parse error', e);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'appointment',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data || '/');
    })
  );
});
