import type { Session } from "@/lib/auth";
import { hasExecAccess, type RoleId } from "@/lib/roles";
import type { Employee, HrStore, LeaveRequest } from "@/lib/store/types";

export function isDirectReport(store: HrStore, managerEmail: string, employeeEmail: string): boolean {
  const e = store.employees.find((x) => x.email.toLowerCase() === employeeEmail.toLowerCase());
  return !!e && !!e.reportsToEmail && e.reportsToEmail.toLowerCase() === managerEmail.toLowerCase();
}

function isDirectReportInEmployees(employees: Employee[], managerEmail: string, employeeEmail: string): boolean {
  const e = employees.find((x) => x.email.toLowerCase() === employeeEmail.toLowerCase());
  return !!e && !!e.reportsToEmail && e.reportsToEmail.toLowerCase() === managerEmail.toLowerCase();
}

export function visibleEmployees(store: HrStore, session: Session): Employee[] {
  if (hasExecAccess(session.role)) return store.employees;
  return store.employees.filter((e) => e.email.toLowerCase() === session.email.toLowerCase());
}

export function visibleLeaveRequests(store: HrStore, session: Session) {
  if (hasExecAccess(session.role)) return store.leaveRequests;
  const me = session.email.toLowerCase();
  return store.leaveRequests.filter((r) => {
    const requester = r.requesterEmail.toLowerCase();
    if (requester === me) return true;
    if (r.status !== "PendingManager") return false;
    return isDirectReport(store, me, requester);
  });
}

function isSelfLeaveRequest(session: Session, requesterEmail: string): boolean {
  return requesterEmail.toLowerCase() === session.email.toLowerCase();
}

/** Step 1 — line manager approves or denies; cannot approve own leave. */
export function canApproveLeaveManagerStep(employees: Employee[], session: Session, request: LeaveRequest): boolean {
  if (request.status !== "PendingManager") return false;
  if (isSelfLeaveRequest(session, request.requesterEmail)) return false;
  return isDirectReportInEmployees(employees, session.email, request.requesterEmail);
}

/** Step 2 — HR Admin/CEO clears operational checks; cannot approve own leave. */
export function canApproveLeaveHrStep(session: Session, request: LeaveRequest): boolean {
  if (request.status !== "PendingHR") return false;
  if (session.role !== "hr_admin" && session.role !== "ceo") return false;
  return !isSelfLeaveRequest(session, request.requesterEmail);
}

export function canDecideLeaveStep(employees: Employee[], session: Session, request: LeaveRequest): boolean {
  return canApproveLeaveManagerStep(employees, session, request) || canApproveLeaveHrStep(session, request);
}

export function visibleGoals(store: HrStore, session: Session) {
  if (hasExecAccess(session.role)) return store.goals;
  return store.goals.filter((g) => g.ownerEmail.toLowerCase() === session.email.toLowerCase());
}

export function visibleTraining(store: HrStore, session: Session) {
  if (hasExecAccess(session.role)) return store.training;
  return store.training.filter((t) => t.assigneeEmail.toLowerCase() === session.email.toLowerCase());
}

export function canMutateTrainingRow(session: Session, assigneeEmail: string): boolean {
  if (hasExecAccess(session.role)) return true;
  return assigneeEmail.toLowerCase() === session.email.toLowerCase();
}

export function roleBadge(role: RoleId): string {
  return ROLE_LABELS_INTERNAL[role];
}

const ROLE_LABELS_INTERNAL: Record<RoleId, string> = {
  employee: "Employee",
  hr_admin: "HR Admin",
  ceo: "CEO",
};
