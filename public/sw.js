self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", event => {

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(
      data.title,
      {
        body: data.body,
        icon: "/logo.jpeg",
        badge: "/logo.jpeg",
        vibrate: [200, 100, 200],
        requireInteraction: true
      }
    )
  );

});

self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/")
  );

});