import { getAdminAuth } from "@/lib/firebase-admin";
import { isRoleId, type RoleId } from "@/lib/roles";

export type EmployeeAuthRoleInfo = {
  email: string;
  hasAuthAccount: boolean;
  role: RoleId | null;
};

function authErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: string }).code) : "";
}

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
