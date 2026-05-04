export const ROLE_IDS = ["employee", "manager", "recruiter", "hr_admin", "payroll", "security_admin"] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<RoleId, string> = {
  employee: "Employee",
  manager: "Manager",
  recruiter: "Recruiter",
  hr_admin: "HR admin",
  payroll: "Payroll",
  security_admin: "Security admin",
};
