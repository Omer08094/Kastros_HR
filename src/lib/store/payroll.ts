import type { PayrollEntry } from "@/lib/store/types";

/** Gross = appointment base + (hours × rate) + sum(allowances). */
export function payrollGrossPay(
  entry: Pick<PayrollEntry, "baseSalary" | "hoursWorked" | "hourlyRate" | "allowances">,
): number {
  const base = Number.isFinite(entry.baseSalary) ? entry.baseSalary : 0;
  const hrs = Number.isFinite(entry.hoursWorked) ? entry.hoursWorked : 0;
  const rate = Number.isFinite(entry.hourlyRate) ? entry.hourlyRate : 0;
  const allowanceSum = (entry.allowances ?? []).reduce(
    (s, a) => s + (Number.isFinite(a.amount) ? a.amount : 0),
    0,
  );
  return base + hrs * rate + allowanceSum;
}
