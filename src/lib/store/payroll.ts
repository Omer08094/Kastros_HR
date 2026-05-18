import type { PayrollEntry } from "@/lib/store/types";

type GrossInputs = Pick<
  PayrollEntry,
  "baseSalary" | "hoursWorked" | "hourlyRate" | "allowances" | "overtimeHours" | "overtimeRate" | "bonus"
>;

/**
 * Gross = appointment base + (hours × rate) + (overtimeHours × overtimeRate) + bonus + sum(allowances).
 * Net is computed by subtracting deductions; see `payrollNetPay`.
 */
export function payrollGrossPay(entry: Partial<GrossInputs>): number {
  const base = num(entry.baseSalary);
  const hrs = num(entry.hoursWorked);
  const rate = num(entry.hourlyRate);
  const otHrs = num(entry.overtimeHours);
  const otRate = num(entry.overtimeRate);
  const bonus = num(entry.bonus);
  const allowanceSum = (entry.allowances ?? []).reduce((s, a) => s + num(a.amount), 0);
  return base + hrs * rate + otHrs * otRate + bonus + allowanceSum;
}

export function payrollNetPay(entry: Pick<PayrollEntry, "grossPay" | "deductions">): number {
  const gross = num(entry.grossPay);
  const deductionSum = (entry.deductions ?? []).reduce((s, d) => s + num(d.amount), 0);
  return Math.max(0, gross - deductionSum);
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
