/** How we label group / CEO-level roles when no functional department applies. */
export const EXECUTIVE_DEPARTMENT = "Executive Office";

/** Always available in department pickers even before Organization setup. */
export const SUGGESTED_LEADERSHIP_DEPARTMENTS = [EXECUTIVE_DEPARTMENT, "Corporate"] as const;

export function mergeDepartmentOptions(configured: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...SUGGESTED_LEADERSHIP_DEPARTMENTS, ...configured]) {
    const t = name.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Display label on roster, org chart, and overview. */
export function formatEmployeeDepartment(employee: {
  department: string;
  reportsToEmail: string | null;
}): string {
  const d = employee.department?.trim();
  if (d && d !== "General") return d;
  if (!employee.reportsToEmail?.trim()) return EXECUTIVE_DEPARTMENT;
  return d || "—";
}
