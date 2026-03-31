import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";
import { FirebaseApp } from "firebase/app";
import { doc, updateDoc, arrayUnion, Firestore } from "firebase/firestore";

// Your Firebase Cloud Messaging VAPID key (generate in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)
const VAPID_KEY =
  "BOF-Ij_44-PsuXimyPVR8dMhusHajrgWpB8SYVZZXLHmOeYw_aU6RZwAQqO9o_wTJguvvEv80WPkMq7-gC1whlg";

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance(app: FirebaseApp) {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Request notification permission and save FCM token to user doc
 */
export async function requestNotificationPermission(
  app: FirebaseApp,
  db: Firestore,
  userId: string,
): Promise<string | null> {
  try {
    if (!("Notification" in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = await getMessagingInstance(app);
    if (!messaging) return null;

    // Register service worker for FCM
    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      // Save token to user's fcmTokens array (supports multiple devices)
      await updateDoc(doc(db, "users", userId), {
        fcmTokens: arrayUnion(token),
      });
    }

    return token;
  } catch (e) {
    console.error("Push notification setup failed:", e);
    return null;
  }
}

/**
 * Listen for foreground messages and show toast
 */
export function onForegroundMessage(
  app: FirebaseApp,
  callback: (payload: { title: string; body: string; link?: string }) => void,
) {
  getMessagingInstance(app).then((messaging) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      const title =
        payload.notification?.title || payload.data?.title || "Нове сповіщення";
      const body = payload.notification?.body || payload.data?.body || "";
      const link = payload.data?.link;
      callback({ title, body, link });
    });
  });
}

/**
 * Send push notification via FCM HTTP v1 (called from API routes)
 * This is a helper for server-side usage
 */
export async function sendPushToTokens(
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>,
): Promise<void> {
  if (!tokens.length) return;

  // This calls our API route which handles the actual FCM send
  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokens, notification, data }),
  });
}
