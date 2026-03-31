import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let _app: App | undefined;
let _db: Firestore | undefined;
let _messaging: Messaging | undefined;

/** Returns true if the Admin SDK can be initialized (service account key is present). */
export function isAdminAvailable(): boolean {
  if (getApps().length > 0) return true;
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
}

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
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
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
