import { expensesEnabled } from "@/lib/feature-flags";
import { mainNav } from "@/lib/nav";
import type { RoleId } from "@/lib/roles";

const ALL: RoleId[] = ["employee", "hr_admin", "ceo"];
const EXEC: RoleId[] = ["hr_admin", "ceo"];

/** Top-level path (e.g. `/employees`) -> roles that may open that area. */
export const ROUTE_ACCESS: Record<string, RoleId[]> = {
  /** Overview / self-service */
  "/dashboard": ALL,
  "/leave": ALL,
  "/expenses": ALL,

  /** People */
  "/employees": EXEC,
  "/onboarding": EXEC,
  "/recruiting": EXEC,
  "/transfer-posting": EXEC,
  "/org-chart": ALL,

  /** Time / performance / learning */
  "/performance": ALL,
  "/training": ALL,

  /** Letters & docs */
  "/letters": EXEC,
  "/documents": ALL,
  "/cases": EXEC,

  /** Setup */
  "/organization": EXEC,
  "/security": EXEC,
  "/settings": EXEC,
  "/user-roles": EXEC,
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
  return mainNav
    .map((n) => n.href)
    .filter((href) => {
      if (href === "/expenses" && !expensesEnabled()) return false;
      return (ROUTE_ACCESS[href] ?? []).includes(role);
    });
}
