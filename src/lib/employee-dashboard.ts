import { approvedAnnualLeaveDaysUsedInYear, buildLeaveBalanceRows } from "@/lib/leave-policy";
import type { Employee, HrStore, LeaveRequest } from "@/lib/store/types";

function parseDay(isoDate: string | undefined | null): Date | null {
  if (isoDate == null || typeof isoDate !== "string") return null;
  const t = isoDate.trim();
  if (!t) return null;
  const d = t.length <= 10 ? new Date(`${t}T12:00:00Z`) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type EmployeeDashboardModel = {
  employee: Employee;
  managerLabel: string | null;
  year: number;
  annualEntitlement: number;
  annualUsedApproved: number;
  annualRemaining: number;
  pendingLeaveCount: number;
  upcomingApprovedLeave: LeaveRequest | null;
  trainingRequired: number;
  trainingDone: number;
  goalsCount: number;
  avgGoalProgress: number;
  policiesMissingCount: number;
  probationDaysRemaining: number | null;
  onProbation: boolean;
};

export function buildEmployeeDashboard(store: HrStore, email: string): EmployeeDashboardModel | null {
  const employee = store.employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
  if (!employee) return null;

  const year = new Date().getUTCFullYear();
  const myLeave = store.leaveRequests.filter((r) => r.requesterEmail.toLowerCase() === email.toLowerCase());
  const pendingLeaveCount = myLeave.filter((r) => r.status === "PendingHR" || r.status === "PendingCEO").length;
  const leaveBalances = buildLeaveBalanceRows(store, email, year);
  const annualRow =
    leaveBalances.find((b) => /\bannual\b/i.test(b.category.name)) ?? leaveBalances[0];
  const annualEntitlement = annualRow?.allocated ?? 0;
  const annualUsedApproved = annualRow
    ? annualRow.used
    : approvedAnnualLeaveDaysUsedInYear(store.leaveRequests, email, year);
  const annualRemaining = annualRow?.remaining ?? Math.max(0, annualEntitlement - annualUsedApproved);

  const approved = myLeave.filter((r) => r.status === "Approved");
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const upcomingApprovedLeave =
    approved
      .map((r) => {
        const endD = parseDay(r.end);
        const startD = parseDay(r.start);
        return endD && startD ? { r, endMs: endD.getTime(), startMs: startD.getTime() } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter(({ endMs }) => endMs >= todayUtc)
      .sort((a, b) => a.startMs - b.startMs)[0]?.r ?? null;

  const myTraining = store.training.filter((t) => t.assigneeEmail.toLowerCase() === email.toLowerCase());
  const trainingRequired = myTraining.filter((t) => t.status === "Required").length;
  const trainingDone = myTraining.filter((t) => t.status === "Done").length;

  const myGoals = store.goals.filter((g) => g.ownerEmail.toLowerCase() === email.toLowerCase());
  const goalsCount = myGoals.length;
  const avgGoalProgress =
    goalsCount > 0 ? Math.round(myGoals.reduce((s, g) => s + g.progressPct, 0) / goalsCount) : 0;

  const acked = new Set(
    store.policyAcknowledgements.filter((a) => a.employeeEmail.toLowerCase() === email.toLowerCase()).map((a) => a.policyId),
  );
  const policiesMissingCount = store.policies.filter((p) => !acked.has(p.id)).length;

  let managerLabel: string | null = null;
  if (employee.reportsToEmail) {
    const mgr = store.employees.find((e) => e.email.toLowerCase() === employee.reportsToEmail!.toLowerCase());
    managerLabel = mgr ? `${mgr.name} (${mgr.title})` : employee.reportsToEmail;
  }

  const probEnd = parseDay(employee.probationCompletionDate);
  const probEndUtc = probEnd
    ? Date.UTC(probEnd.getUTCFullYear(), probEnd.getUTCMonth(), probEnd.getUTCDate())
    : null;
  const probationDaysRemaining =
    probEndUtc !== null && probEndUtc >= todayUtc ? Math.ceil((probEndUtc - todayUtc) / 86400000) : null;
  const onProbation = probationDaysRemaining !== null && probationDaysRemaining >= 0;

  return {
    employee,
    managerLabel,
    year,
    annualEntitlement,
    annualUsedApproved,
    annualRemaining,
    pendingLeaveCount,
    upcomingApprovedLeave,
    trainingRequired,
    trainingDone,
    goalsCount,
    avgGoalProgress,
    policiesMissingCount,
    probationDaysRemaining,
    onProbation,
  };
}
