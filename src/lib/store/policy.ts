import type { Session } from "@/lib/auth";
import type { RoleId } from "@/lib/roles";
import type { Employee, HrStore } from "@/lib/store/types";

export function isDirectReport(store: HrStore, managerEmail: string, employeeEmail: string): boolean {
  const e = store.employees.find((x) => x.email.toLowerCase() === employeeEmail.toLowerCase());
  return !!e && !!e.reportsToEmail && e.reportsToEmail.toLowerCase() === managerEmail.toLowerCase();
}

export function visibleEmployees(store: HrStore, session: Session): Employee[] {
  if (session.role === "hr_admin" || session.role === "recruiter" || session.role === "payroll" || session.role === "ceo") {
    return store.employees;
  }
  if (session.role === "manager") {
    const self = store.employees.filter((e) => e.email.toLowerCase() === session.email.toLowerCase());
    const team = store.employees.filter((e) => e.reportsToEmail?.toLowerCase() === session.email.toLowerCase());
    return [...self, ...team].sort((a, b) => a.name.localeCompare(b.name));
  }
  return store.employees.filter((e) => e.email.toLowerCase() === session.email.toLowerCase());
}

export function visibleLeaveRequests(store: HrStore, session: Session) {
  if (session.role === "hr_admin" || session.role === "ceo") return store.leaveRequests;
  if (session.role === "manager") {
    return store.leaveRequests.filter(
      (r) =>
        r.requesterEmail.toLowerCase() === session.email.toLowerCase() ||
        isDirectReport(store, session.email, r.requesterEmail),
    );
  }
  return store.leaveRequests.filter((r) => r.requesterEmail.toLowerCase() === session.email.toLowerCase());
}

export function canDecideLeave(store: HrStore, session: Session, requesterEmail: string): boolean {
  if (session.role === "hr_admin") return true;
  if (session.role === "ceo") return true;
  if (session.role === "manager") return isDirectReport(store, session.email, requesterEmail);
  return false;
}

export function visibleGoals(store: HrStore, session: Session) {
  if (session.role === "hr_admin" || session.role === "ceo") return store.goals;
  if (session.role === "manager") {
    const emails = new Set(visibleEmployees(store, session).map((e) => e.email.toLowerCase()));
    return store.goals.filter((g) => emails.has(g.ownerEmail.toLowerCase()));
  }
  return store.goals.filter((g) => g.ownerEmail.toLowerCase() === session.email.toLowerCase());
}

export function visibleTraining(store: HrStore, session: Session) {
  if (session.role === "hr_admin" || session.role === "ceo") return store.training;
  if (session.role === "manager") {
    const emails = new Set(visibleEmployees(store, session).map((e) => e.email.toLowerCase()));
    return store.training.filter((t) => emails.has(t.assigneeEmail.toLowerCase()));
  }
  return store.training.filter((t) => t.assigneeEmail.toLowerCase() === session.email.toLowerCase());
}

export function canMutateTrainingRow(session: Session, assigneeEmail: string): boolean {
  if (session.role === "hr_admin") return true;
  if (session.role === "manager" && assigneeEmail.toLowerCase() !== session.email.toLowerCase()) {
    return true; // manager updating team row - caller must verify team in action
  }
  return assigneeEmail.toLowerCase() === session.email.toLowerCase();
}

export function managerMayTouchTraining(store: HrStore, session: Session, assigneeEmail: string): boolean {
  if (session.role !== "manager") return false;
  if (assigneeEmail.toLowerCase() === session.email.toLowerCase()) return true;
  return isDirectReport(store, session.email, assigneeEmail);
}

export function roleBadge(role: RoleId): string {
  const map: Record<RoleId, string> = {
    employee: "Employee",
    manager: "Manager",
    recruiter: "Recruiter",
    hr_admin: "HR admin",
    payroll: "Payroll",
    security_admin: "Security",
    ceo: "CEO",
  };
  return map[role];
}
