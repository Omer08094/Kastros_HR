export const ROLE_IDS = ["employee", "hr_admin", "ceo"] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export function parseAppRole(value: string | null | undefined): RoleId {
  const trimmed = String(value ?? "").trim();
  return isRoleId(trimmed) ? trimmed : "employee";
}

/** HR Admin and CEO share the same module access; only the CEO dashboard differs. */
export function hasExecAccess(role: RoleId): boolean {
  return role === "hr_admin" || role === "ceo";
}

export const ROLE_LABELS: Record<RoleId, string> = {
  employee: "Employee",
  hr_admin: "HR Admin",
  ceo: "CEO",
};
