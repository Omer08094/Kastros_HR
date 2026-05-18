import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

/** True when browser Firebase Auth can be initialized (both env vars set). */
export const isFirebaseWebConfigured = Boolean(apiKey && projectId);

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

/**
 * Lazily initializes the web app + Auth. Only call when `isFirebaseWebConfigured` is true.
 * Avoids importing invalid config during SSR and prevents `/login` from hard-crashing when env is unset.
 */
export function getFirebaseAuth(): Auth {
  if (!apiKey || !projectId) {
    throw new Error(
      "Firebase web is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local, then restart `next dev`.",
    );
  }
  if (!cachedAuth) {
    const authDomain =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`;
    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || undefined,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
    };
    cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    cachedAuth = getAuth(cachedApp);
  }
  return cachedAuth;
}
