import type {
  EmployeeLeaveAllocation,
  HrStore,
  LeaveCategory,
  LeaveRequest,
} from "@/lib/store/types";

function parseDay(isoDate: string | undefined | null): Date | null {
  if (isoDate == null || typeof isoDate !== "string") return null;
  const t = isoDate.trim();
  if (!t) return null;
  const d = t.length <= 10 ? new Date(`${t}T12:00:00Z`) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inclusiveCalendarDays(start: Date, end: Date): number {
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((b - a) / 86400000) + 1;
}

/** Days of a leave span that fall inside [year-01-01, year-12-31] (UTC). */
export function leaveDaysOverlappingYear(startStr: string, endStr: string, year: number): number {
  const s = parseDay(startStr);
  const e = parseDay(endStr);
  if (!s || !e) return 0;
  const ys = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
  const ye = new Date(Date.UTC(year, 11, 31, 12, 0, 0));
  const lo = s.getTime() > ys.getTime() ? s : ys;
  const hi = e.getTime() < ye.getTime() ? e : ye;
  if (lo.getTime() > hi.getTime()) return 0;
  return inclusiveCalendarDays(lo, hi);
}

export function activeLeaveCategories(store: HrStore): LeaveCategory[] {
  return [...store.leaveCategories]
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getLeaveCategory(store: HrStore, categoryId: string): LeaveCategory | undefined {
  return store.leaveCategories.find((c) => c.id === categoryId);
}

/** Whether a leave request belongs to a category (by id or legacy name match). */
export function requestMatchesCategory(request: LeaveRequest, category: LeaveCategory): boolean {
  if (request.categoryId) return request.categoryId === category.id;
  return request.kind.trim().toLowerCase() === category.name.trim().toLowerCase();
}

/** Effective allocated days: employee override, else category default. */
export function getAllocatedDays(
  store: HrStore,
  employeeEmail: string,
  categoryId: string,
  year: number,
): number {
  const em = employeeEmail.toLowerCase();
  const override = store.employeeLeaveAllocations.find(
    (a) => a.employeeEmail.toLowerCase() === em && a.categoryId === categoryId && a.year === year,
  );
  if (override) return override.allocatedDays;
  const cat = getLeaveCategory(store, categoryId);
  return cat?.defaultDaysPerYear ?? 0;
}

export function approvedLeaveDaysUsedInYear(
  requests: LeaveRequest[],
  employeeEmail: string,
  category: LeaveCategory,
  year: number,
): number {
  const em = employeeEmail.toLowerCase();
  let total = 0;
  for (const r of requests) {
    if (r.requesterEmail.toLowerCase() !== em) continue;
    if (r.status !== "Approved") continue;
    if (!requestMatchesCategory(r, category)) continue;
    total += leaveDaysOverlappingYear(r.start, r.end, year);
  }
  return total;
}

export type LeaveBalanceRow = {
  category: LeaveCategory;
  allocated: number;
  used: number;
  remaining: number;
  isOverride: boolean;
};

export function formatLeaveTypeOptionLabel(row: LeaveBalanceRow): string {
  return `${row.category.name} (${row.remaining} remaining of ${row.allocated})`;
}

export function buildLeaveBalanceRows(
  store: HrStore,
  employeeEmail: string,
  year: number,
): LeaveBalanceRow[] {
  const em = employeeEmail.toLowerCase();
  return activeLeaveCategories(store).map((category) => {
    const override = store.employeeLeaveAllocations.find(
      (a) => a.employeeEmail.toLowerCase() === em && a.categoryId === category.id && a.year === year,
    );
    const allocated = getAllocatedDays(store, employeeEmail, category.id, year);
    const used = approvedLeaveDaysUsedInYear(store.leaveRequests, employeeEmail, category, year);
    return {
      category,
      allocated,
      used,
      remaining: Math.max(0, allocated - used),
      isOverride: !!override,
    };
  });
}

/** @deprecated Use buildLeaveBalanceRows — kept for dashboard annual card. */
export function isAnnualLeaveKind(kind: string): boolean {
  return /\bannual\b/i.test(kind);
}

export function approvedAnnualLeaveDaysUsedInYear(
  requests: LeaveRequest[],
  employeeEmail: string,
  year: number,
): number {
  const em = employeeEmail.toLowerCase();
  let total = 0;
  for (const r of requests) {
    if (r.requesterEmail.toLowerCase() !== em) continue;
    if (r.status !== "Approved") continue;
    if (!isAnnualLeaveKind(r.kind)) continue;
    total += leaveDaysOverlappingYear(r.start, r.end, year);
  }
  return total;
}

export function buildAllocationsFromDefaults(
  store: HrStore,
  employeeEmails: string[],
  year: number,
): EmployeeLeaveAllocation[] {
  const cats = activeLeaveCategories(store);
  const rows: EmployeeLeaveAllocation[] = [];
  for (const email of employeeEmails) {
    for (const cat of cats) {
      rows.push({
        id: `lva-${email}-${cat.id}-${year}`.replace(/[^a-zA-Z0-9-]/g, "-"),
        employeeEmail: email,
        categoryId: cat.id,
        year,
        allocatedDays: cat.defaultDaysPerYear,
      });
    }
  }
  return rows;
}
