import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Replace literal newlines if passed in as a single line string
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log(`[kastros-hr] Firebase Admin initialized for project: ${projectId}`);
    } else {
      console.warn(
        "[kastros-hr] Firebase Admin credentials missing. Data persistence to Firebase is disabled.",
      );
    }
  } catch (error) {
    console.error("[kastros-hr] Firebase Admin initialization error", error);
  }
}

const app = admin.apps.length ? admin.app() : null;

/**
 * Firestore “database” ID (multi-DB feature), NOT your collection name.
 * Almost all projects use the default DB only — call `getFirestore(app)` with no second arg.
 * The HR payload lives at collection `kastros-hr` → document `store` (see `store/persist.ts`).
 * Set `FIREBASE_FIRESTORE_DATABASE_ID` only if you created an extra named database in console.
 */
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
    // Firestore allows settings() only once per process; ignore if already applied.
  }
}
export const firestore = _firestore;
export const storage = app && process.env.FIREBASE_STORAGE_BUCKET ? getStorage(app) : null;
export { admin };
