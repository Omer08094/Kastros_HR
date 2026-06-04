import { firestore, isFirebaseAdminReady } from "@/lib/firebase-admin";

export type PersistenceBackend = "firestore" | "local" | "unconfigured";

export type PersistenceInfo = {
  backend: PersistenceBackend;
  /** Short label for UI badges */
  label: string;
  /** Shown in save confirmation toast */
  saveHint: string;
};

/** Where HR data is persisted for this deployment (server-only). */
export function getPersistenceInfo(): PersistenceInfo {
  if (firestore && isFirebaseAdminReady()) {
    return {
      backend: "firestore",
      label: "Firebase Firestore",
      saveHint: "Saved to your cloud database (Firebase Firestore).",
    };
  }

  if (process.env.VERCEL) {
    return {
      backend: "unconfigured",
      label: "Database not connected",
      saveHint: "Warning: Firebase is not configured on Vercel — changes may not persist. Add Firebase env vars and redeploy.",
    };
  }

  return {
    backend: "local",
    label: "Local demo file",
    saveHint: "Saved on this computer only (data/kastros-hr-demo.json). Not shared with production.",
  };
}
