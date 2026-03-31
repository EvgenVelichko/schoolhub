/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB8mMfQJMbEUt8Vn1sM8XqKbcgMjl4KKCA",
  authDomain: "nexus-d86c2.firebaseapp.com",
  projectId: "nexus-d86c2",
  storageBucket: "nexus-d86c2.firebasestorage.app",
  messagingSenderId: "980279738328",
  appId: "1:980279738328:web:34bfb7978b401c1a807cad",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "School Hub";
  const body = payload.notification?.body || payload.data?.body || "";
  const icon = "/icon-192.png";
  const badge = "/icon-192.png";
  const link = payload.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag: payload.data?.tag || "default",
    data: { link },
    actions: [{ action: "open", title: "Відкрити" }],
    vibrate: [200, 100, 200],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(link);
    })
  );
});

// Periodic background sync for NZ grades — every 10 min
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "nz-background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

// Also trigger sync on regular sync event as fallback
self.addEventListener("sync", (event) => {
  if (event.tag === "nz-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

    const response = await fetch("/api/sync-cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Background sync failed:", response.status);
    }
  } catch (e) {
    if (e.name === "AbortError") {
      console.warn("Background sync timed out, will retry next cycle");
    } else {
      console.error("Background sync error:", e);
    }
  }
}

// Self-trigger: set up a timer to sync every 10 min even when no tabs are open
// This works because the service worker stays alive when installed
let syncTimer = null;

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  // Start background interval
  if (!syncTimer) {
    syncTimer = setInterval(() => {
      doBackgroundSync();
    }, 10 * 60 * 1000); // every 10 minutes
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});
