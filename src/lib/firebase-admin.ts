import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let _app: App | undefined;
let _db: Firestore | undefined;
let _messaging: Messaging | undefined;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount);
      _app = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id,
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is set but contains invalid JSON. " +
        "Please check the value in your .env.local file."
      );
    }
  } else {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
      "Firebase Admin SDK features (push notifications, server-side sync) will not work. " +
      "Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local to enable them."
    );
    throw new Error(
      "Firebase Admin SDK requires FIREBASE_SERVICE_ACCOUNT_KEY environment variable. " +
      "Download a service account key from Firebase Console > Project Settings > Service Accounts."
    );
  }

  return _app;
}

export function getAdminDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getAdminApp());
  }
  return _db;
}

export function getAdminMessaging(): Messaging {
  if (!_messaging) {
    _messaging = getMessaging(getAdminApp());
  }
  return _messaging;
}
