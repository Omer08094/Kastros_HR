import { getAdminAuth } from "@/lib/firebase-admin";
import { isRoleId, type RoleId } from "@/lib/roles";

export type EmployeeAuthRoleInfo = {
  email: string;
  hasAuthAccount: boolean;
  role: RoleId | null;
};

export async function loadEmployeeAuthRoles(emails: string[]): Promise<EmployeeAuthRoleInfo[]> {
  let auth;
  try {
    auth = getAdminAuth();
  } catch {
    return emails.map((email) => ({
      email: email.toLowerCase(),
      hasAuthAccount: false,
      role: null,
    }));
  }

  return Promise.all(
    emails.map(async (email) => {
      const normalized = email.toLowerCase();
      try {
        const user = await auth.getUserByEmail(normalized);
        const claim = user.customClaims?.role;
        const role = typeof claim === "string" && isRoleId(claim) ? claim : null;
        return { email: normalized, hasAuthAccount: true, role };
      } catch (e: unknown) {
        if (authErrorCode(e) === "auth/user-not-found") {
          return { email: normalized, hasAuthAccount: false, role: null };
        }
        return { email: normalized, hasAuthAccount: false, role: null };
      }
    }),
  );
}

function authErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
}

/** Authoritative app role from Firebase Auth custom claims (null if no account or invalid claim). */
export async function getFirebaseRoleForEmail(email: string): Promise<RoleId | null> {
  let auth;
  try {
    auth = getAdminAuth();
  } catch {
    return null;
  }

  try {
    const user = await auth.getUserByEmail(email.trim().toLowerCase());
    const claim = user.customClaims?.role;
    return typeof claim === "string" && isRoleId(claim) ? claim : null;
  } catch (e: unknown) {
    if (authErrorCode(e) === "auth/user-not-found") return null;
    return null;
  }
}
