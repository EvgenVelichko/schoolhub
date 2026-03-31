const requiredEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const firebaseConfigFromFallback = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyB8mMfQJMbEUt8Vn1sM8XqKbcgMjl4KKCA",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "nexus-d86c2.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "nexus-d86c2",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "nexus-d86c2.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "980279738328",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:980279738328:web:34bfb7978b401c1a807cad",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-20QGTRWKF1",
} as const;

function readFirebaseEnv(
  name: keyof typeof firebaseConfigFromFallback,
): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }
  return firebaseConfigFromFallback[name];
}

const missingEnvVars = requiredEnvVars.filter((envName) => {
  const value = readFirebaseEnv(envName);
  return !value || value.trim().length === 0;
});

if (missingEnvVars.length > 0) {
  throw new Error(
    [
      "Missing required Firebase environment variables:",
      ...missingEnvVars.map((envName) => `- ${envName}`),
      "",
      "Create a .env.local file in the project root and copy values from your Firebase project settings.",
      "You can start from .env.example.",
    ].join("\n"),
  );
}

export const firebaseConfig = {
  apiKey: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readFirebaseEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ),
  appId: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: readFirebaseEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
};
