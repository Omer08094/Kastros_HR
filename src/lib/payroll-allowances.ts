import type { HrStore, PayrollEntry } from "@/lib/store/types";

export function payrollEntriesForEmployee(store: HrStore, email: string): PayrollEntry[] {
  const em = email.trim().toLowerCase();
  return [...store.payrollEntries]
    .filter((p) => p.employeeEmail.toLowerCase() === em)
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function sumAllowances(entry: PayrollEntry): number {
  return entry.allowances.reduce((s, a) => s + (Number.isFinite(a.amount) ? a.amount : 0), 0);
}
