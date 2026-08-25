// Glowzaa B2B Wholesale Commerce - Firebase Cloud Messaging (FCM) Service Worker
// Step 15: Background Push Notification Handler for Web/PWA

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase compat SDK inside Service Worker context
firebase.initializeApp({
  apiKey: "AIzaSyDGiPTbGfeT2pEaML-yX05jS4QFjlPtEXY",
  authDomain: "gen-lang-client-0254663574.firebaseapp.com",
  projectId: "gen-lang-client-0254663574",
  storageBucket: "gen-lang-client-0254663574.firebasestorage.app",
  messagingSenderId: "47279804583",
  appId: "1:47279804583:web:ec91702686ba5c179b8b82"
});

const messaging = firebase.messaging();

// Handle background messages when app is closed or in background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push message payload:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Glowzaa B2B Notice';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New operational update from Glowzaa HQ';
  const priority = payload.data?.priority || 'normal';
  const actionUrl = payload.data?.actionUrl || payload.data?.url || '/';

  const notificationOptions = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: priority === 'urgent' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: {
      actionUrl: actionUrl,
      notificationId: payload.data?.notificationId,
      relatedOrderId: payload.data?.relatedOrderId
    },
    tag: payload.data?.notificationId || `glowzaa-push-${Date.now()}`,
    renotify: true,
    requireInteraction: priority === 'urgent'
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle push notification click event in phone status panel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
