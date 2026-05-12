import { mainNav } from "@/lib/nav";
import type { RoleId } from "@/lib/roles";

/** Top-level path (e.g. `/employees`) -> roles that may open that area. */
export const ROUTE_ACCESS: Record<string, RoleId[]> = {
  "/dashboard": ["employee", "manager", "recruiter", "hr_admin", "payroll", "security_admin", "ceo"],
  "/employees": ["manager", "recruiter", "hr_admin", "payroll", "ceo"],
  "/onboarding": ["manager", "recruiter", "hr_admin", "ceo"],
  "/org": ["manager", "recruiter", "hr_admin", "payroll", "ceo"],
  "/recruiting": ["recruiter", "hr_admin"],
  "/leave": ["employee", "manager", "hr_admin", "ceo"],
  "/performance": ["employee", "manager", "hr_admin"],
  "/training": ["employee", "manager", "hr_admin"],
  "/documents": ["employee", "manager", "hr_admin", "payroll", "recruiter", "ceo"],
  "/cases": ["hr_admin", "ceo"],
  "/benefits": ["employee", "manager", "hr_admin", "payroll", "ceo"],
  "/payroll": ["payroll", "hr_admin", "ceo"],
  "/reports": ["recruiter", "payroll", "hr_admin", "security_admin", "ceo"],
  "/security": ["security_admin", "hr_admin", "ceo"],
  "/settings": ["hr_admin", "security_admin", "ceo"],
};

export function topRoute(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "/";
}

export function roleMayAccessRoute(role: RoleId, pathname: string): boolean {
  if (pathname === "/access-denied") return true;
  const key = topRoute(pathname);
  const allowed = ROUTE_ACCESS[key];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function navHrefsForRole(role: RoleId): string[] {
  return mainNav.map((n) => n.href).filter((href) => (ROUTE_ACCESS[href] ?? []).includes(role));
}
