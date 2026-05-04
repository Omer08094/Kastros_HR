import { mainNav } from "@/lib/nav";
import type { RoleId } from "@/lib/roles";

/** Top-level path (e.g. `/employees`) -> roles that may open that area. */
export const ROUTE_ACCESS: Record<string, RoleId[]> = {
  "/dashboard": ["employee", "manager", "recruiter", "hr_admin", "payroll", "security_admin"],
  "/employees": ["manager", "recruiter", "hr_admin", "payroll"],
  "/onboarding": ["manager", "hr_admin"],
  "/org": ["manager", "recruiter", "hr_admin", "payroll"],
  "/recruiting": ["recruiter", "hr_admin"],
  "/leave": ["employee", "manager", "hr_admin"],
  "/performance": ["employee", "manager", "hr_admin"],
  "/training": ["employee", "manager", "hr_admin"],
  "/documents": ["employee", "manager", "hr_admin", "payroll", "recruiter"],
  "/cases": ["manager", "hr_admin"],
  "/benefits": ["employee", "manager", "hr_admin", "payroll"],
  "/payroll": ["payroll", "hr_admin"],
  "/reports": ["recruiter", "payroll", "hr_admin", "security_admin"],
  "/security": ["security_admin", "hr_admin"],
  "/settings": ["hr_admin", "security_admin"],
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
