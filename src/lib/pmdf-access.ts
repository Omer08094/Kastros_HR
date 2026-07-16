import type { Session } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";
import { isDirectReport } from "@/lib/store/policy";
import type { Employee, HrStore, PmdfForm } from "@/lib/store/types";

export type PmdfLineManager = {
  email: string | null;
  name: string | null;
};

/** Resolve line manager from the live People roster, falling back to the form snapshot. */
export function resolvePmdfLineManager(store: HrStore, form: PmdfForm): PmdfLineManager {
  const emp = store.employees.find((e) => e.email.toLowerCase() === form.employeeEmail.toLowerCase());
  if (emp?.reportsToEmail) {
    const mgr = store.employees.find((e) => e.email.toLowerCase() === emp.reportsToEmail!.toLowerCase());
    if (mgr) {
      return { email: mgr.email.toLowerCase(), name: mgr.name };
    }
    return { email: emp.reportsToEmail.toLowerCase(), name: form.lineManagerName };
  }
  return { email: form.lineManagerEmail, name: form.lineManagerName };
}

export function resolvePmdfLineManagerFromEmployees(employees: Employee[], form: PmdfForm): PmdfLineManager {
  const emp = employees.find((e) => e.email.toLowerCase() === form.employeeEmail.toLowerCase());
  if (emp?.reportsToEmail) {
    const mgr = employees.find((e) => e.email.toLowerCase() === emp.reportsToEmail!.toLowerCase());
    if (mgr) {
      return { email: mgr.email.toLowerCase(), name: mgr.name };
    }
    return { email: emp.reportsToEmail.toLowerCase(), name: form.lineManagerName };
  }
  return { email: form.lineManagerEmail, name: form.lineManagerName };
}

export function isPmdfLineManager(store: HrStore, managerEmail: string, form: PmdfForm): boolean {
  const email = managerEmail.toLowerCase();
  if (form.lineManagerEmail?.toLowerCase() === email) return true;
  return isDirectReport(store, email, form.employeeEmail);
}

export function isPmdfLineManagerFromEmployees(
  employees: Employee[],
  managerEmail: string,
  form: PmdfForm,
): boolean {
  const email = managerEmail.toLowerCase();
  if (form.lineManagerEmail?.toLowerCase() === email) return true;
  const emp = employees.find((e) => e.email.toLowerCase() === form.employeeEmail.toLowerCase());
  return !!emp?.reportsToEmail && emp.reportsToEmail.toLowerCase() === email;
}

export function visiblePmdfForms(store: HrStore, session: Session): PmdfForm[] {
  if (hasExecAccess(session.role)) return store.pmdfForms;
  const email = session.email.toLowerCase();
  return store.pmdfForms.filter(
    (f) => f.employeeEmail.toLowerCase() === email || isPmdfLineManager(store, email, f),
  );
}

export function canAccessPmdfForm(store: HrStore, session: Session, form: PmdfForm): boolean {
  if (hasExecAccess(session.role)) return true;
  const email = session.email.toLowerCase();
  if (form.employeeEmail.toLowerCase() === email) return true;
  return isPmdfLineManager(store, email, form);
}

/** Sync line manager fields on all open PMDF forms for an employee after roster changes. */
export function syncPmdfFormsLineManager(
  pmdfForms: PmdfForm[],
  employees: Employee[],
  employeeEmail: string,
): PmdfForm[] {
  const emailLower = employeeEmail.toLowerCase();
  const emp = employees.find((e) => e.email.toLowerCase() === emailLower);
  if (!emp) return pmdfForms;

  const mgr = emp.reportsToEmail
    ? employees.find((e) => e.email.toLowerCase() === emp.reportsToEmail!.toLowerCase())
    : null;
  const lineManagerEmail = mgr?.email.toLowerCase() ?? emp.reportsToEmail?.toLowerCase() ?? null;
  const lineManagerName = mgr?.name ?? null;

  return pmdfForms.map((f) =>
    f.employeeEmail.toLowerCase() === emailLower
      ? { ...f, lineManagerEmail, lineManagerName, updatedAt: new Date().toISOString() }
      : f,
  );
}
