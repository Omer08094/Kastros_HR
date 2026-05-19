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
  return { uid: user.uid, tempPassword, resetLink };
}

/** Verify a Firebase session cookie and return decoded token. */
export async function verifySessionCookie(cookie: string) {
  const auth = getAdminAuth();
  return await auth.verifySessionCookie(cookie, true);
}
