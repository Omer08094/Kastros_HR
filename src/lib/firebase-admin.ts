import * as admin from "firebase-admin";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/** Normalize PEM from .env.local or Vercel (quotes, literal \\n, or real newlines). */
export function normalizeFirebasePrivateKey(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  return key;
}

function tryInitializeAdmin(): admin.app.App | null {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[kastros-hr] Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
    return null;
  }

  try {
    return admin.initializeApp({
      projectId,
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.trim(),
    });
  } catch (error) {
    console.error("[kastros-hr] Firebase Admin initialization error", error);
    return null;
  }
}

const app = tryInitializeAdmin();

if (app) {
  console.log(`[kastros-hr] Firebase Admin initialized for project: ${app.options.projectId}`);
}

const firestoreDbId = process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim();
const _firestore = app
  ? firestoreDbId && firestoreDbId !== "(default)"
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app)
  : null;

if (_firestore) {
  try {
    _firestore.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Firestore allows settings() only once per process.
  }
}

export const firestore = _firestore;
export const storage =
  app && process.env.FIREBASE_STORAGE_BUCKET?.trim() ? getStorage(app) : null;

export function isFirebaseAdminReady(): boolean {
  return admin.apps.length > 0;
}

/** Use this instead of bare `getAuth()` so login and HR actions always use the initialized app. */
export function getAdminAuth(): Auth {
  const active = admin.apps.length ? admin.app() : tryInitializeAdmin();
  if (!active) {
    throw new Error(
      "Firebase Admin is not configured on the server. In Vercel, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (PEM with \\n line breaks). Then redeploy.",
    );
  }
  return getAuth(active);
}

export { admin };
