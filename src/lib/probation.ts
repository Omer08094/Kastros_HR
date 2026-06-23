import type { Employee } from "@/lib/store/types";

export function probationDaysRemaining(probationCompletionDate: string | null | undefined): number | null {
  if (!probationCompletionDate?.trim()) return null;
  const ts = Date.parse(
    probationCompletionDate.length <= 10 ? `${probationCompletionDate}T12:00:00Z` : probationCompletionDate,
  );
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

/** Active probation ending within `withinDays` (inclusive). */
export function isProbationEndingSoon(employee: Employee, withinDays = 10): boolean {
  if ((employee.probationMonths ?? 0) <= 0) return false;
  const days = probationDaysRemaining(employee.probationCompletionDate);
  return days !== null && days >= 0 && days <= withinDays;
}
