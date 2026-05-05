// Firebase Cloud Messaging service worker
// This file must be in /public so it's served from the root path

importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// Initialize Firebase inside the service worker
// Replace these with your actual config values (these are intentionally public)
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__,
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__,
  projectId:         self.__FIREBASE_PROJECT_ID__,
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__,
  appId:             self.__FIREBASE_APP_ID__,
});

const messaging = firebase.messaging();

// Handle background messages (app is not in focus)
messaging.onBackgroundMessage((payload) => {
  const notifTitle = payload.notification?.title ?? 'musicmaker';
  const notifBody  = payload.notification?.body  ?? '';

  return self.registration.showNotification(notifTitle, {
    body: notifBody,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: payload.data ?? {},
    // vibration pattern (ms on, ms off, ...)
    vibrate: [200, 100, 200],
  });
});

// Open the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link ?? '/booking';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
