import { getAdminAuth } from "@/lib/firebase-admin";
import type { UserRecord } from "firebase-admin/auth";
import crypto from "crypto";

function authErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
}

/**
 * Ensures a Firebase Auth user exists for this email, then sets the `role` custom claim.
 * - New users: random temp password + createUser.
 * - Existing Auth user (same email): reuse uid, refresh display name, same reset link flow.
 * Handles rare race where create hits `auth/email-already-exists` between check and create.
 */
export async function createEmployeeAuth(email: string, displayName: string, role: string) {
  const auth = getAdminAuth();
  const label = displayName.trim() || email;
  let user: UserRecord;
  let tempPassword: string | undefined;

  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { displayName: label });
  } catch (e: unknown) {
    if (authErrorCode(e) !== "auth/user-not-found") throw e;
    const pw = crypto.randomBytes(12).toString("base64");
    try {
      user = await auth.createUser({
        email,
        password: pw,
        displayName: label,
      });
      tempPassword = pw;
    } catch (e2: unknown) {
      if (authErrorCode(e2) === "auth/email-already-exists") {
        user = await auth.getUserByEmail(email);
        await auth.updateUser(user.uid, { displayName: label });
      } else {
        throw e2;
      }
    }
  }

  await auth.setCustomUserClaims(user.uid, { role });
  const resetLink = await auth.generatePasswordResetLink(email);
  const resetEmailSent = await sendFirebasePasswordResetEmail(email);
  return { uid: user.uid, tempPassword, resetLink, resetEmailSent };
}

/**
 * Sends Firebase-hosted password-reset email (uses Auth email template).
 * Returns false only when delivery trigger call failed.
 */
export async function sendFirebasePasswordResetEmail(email: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return false;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[kastros-hr] password reset email trigger failed", res.status, txt);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[kastros-hr] password reset email trigger error", e);
    return false;
  }
}

/** Keep Firebase Auth login identity in sync with HR profile email/name changes. */
export async function syncEmployeeAuthIdentity(currentEmail: string, nextEmail: string, displayName: string): Promise<void> {
  const auth = getAdminAuth();
  const now = currentEmail.trim().toLowerCase();
  const next = nextEmail.trim().toLowerCase();
  const label = displayName.trim() || next;
  const user = await auth.getUserByEmail(now);
  if (now === next) {
    await auth.updateUser(user.uid, { displayName: label });
    return;
  }
  await auth.updateUser(user.uid, { email: next, displayName: label });
}

/** Verify a Firebase session cookie and return decoded token. */
export async function verifySessionCookie(cookie: string) {
  const auth = getAdminAuth();
  return await auth.verifySessionCookie(cookie, true);
}
