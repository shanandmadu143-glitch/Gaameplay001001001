/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBnGTuZKekAWA4vBUgfzZZ2CeO8wyR1HaI",
  authDomain: "bin-card-42614.firebaseapp.com",
  databaseURL: "https://bin-card-42614-default-rtdb.firebaseio.com",
  projectId: "bin-card-42614",
  storageBucket: "bin-card-42614.firebasestorage.app",
  messagingSenderId: "1063550230753",
  appId: "1:1063550230753:web:1ad8306405e709ac5b17a0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'ශ්‍රී ලංකීය දාම් - Game Invite';
  const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || 'ඔබට නව Multiplayer ආරාධනාවක් ලැබී ඇත!';
  const targetUrl = (payload.data && payload.data.url) || './mulitiplay.html';

  self.registration.showNotification(title, {
    body,
    vibrate: [200, 100, 200],
    tag: 'sinhala-draughts-invite',
    renotify: true,
    data: { url: targetUrl }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './mulitiplay.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('navigate' in client) {
          return client.navigate(targetUrl).then((c) => c.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

