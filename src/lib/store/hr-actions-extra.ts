"use server";

/**
 * Server actions for the newer HR modules: business units, departments,
 * job descriptions, loans, bonuses, overtime, expenses, attendance, gratuity,
 * final settlement, fund contributions (PF/Pension/Other), statutory (EOBI/ESSI),
 * budgets, transfers, letters, and the fund accounting / payroll JV ledger.
 *
 * Mirrors the patterns in `hr-actions.ts`:
 *   - role-gated with `getSession()` + `hasExecAccess`
 *   - mutates the store via `mutateStore()` (atomic, queued)
 *   - writes an audit row for every mutation
 *   - `revalidatePath` on success to refresh the page that triggered it
 */

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";
import { mutateStore, readStore } from "@/lib/store/persist";
import {
  deleteStoredFile,
  isAllowedLibraryDocumentFile,
  saveFormDataFile,
} from "@/lib/uploads";
import {
  BUSINESS_UNITS,
  CURRENCIES,
  currencyForBusinessUnit,
  type BusinessUnit,
  type BusinessUnitRecord,
  type CoiSubmission,
  type ConflictOfInterestDoc,
  type CurrencyCode,
  type DepartmentRecord,
  type EmployeeLetter,
  type HrStore,
  type JobDescription,
  type LetterType,
  type Employee,
  type EmployeeCompensation,
  type ExpenseClaim,
  type ExpenseStatus,
  type EmployeeLeaveAllocation,
  type EmployeeSalaryAllowanceLine,
  type LeaveCategory,
  type SalaryAllowanceCatalogItem,
  type SalaryAllowanceUnit,
  type SubDepartmentRecord,
  type TransferRecord,
  type TransferStatus,
} from "@/lib/store/types";
import { buildAllocationsFromDefaults } from "@/lib/leave-policy";

type ActionResult = { ok: true } | { error: string };

function ok(): ActionResult {
  return { ok: true };
}

function audit(store: HrStore, actor: string, action: string): HrStore {
  return {
    ...store,
    audit: [{ at: new Date().toISOString(), actor, action, ip: "app" }, ...store.audit].slice(0, 500),
  };
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(str(v));
  return Number.isFinite(n) ? n : fallback;
}

/** Parse salary fields that may include thousands separators (e.g. 100,000). */
function parseMoneyField(v: FormDataEntryValue | null): number | null {
  const s = str(v).replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pickCurrency(raw: string, fallback: BusinessUnit | null = null): CurrencyCode {
  if ((CURRENCIES as readonly string[]).includes(raw)) return raw as CurrencyCode;
  return currencyForBusinessUnit(fallback);
}

type ExecSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type RequireResult = { ok: true; session: ExecSession } | { ok: false; error: string };

async function requireExec(): Promise<RequireResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) {
    return { ok: false, error: "Only HR Admin or CEO can perform this action." };
  }
  return { ok: true, session };
}

/* ------------------------------------------------------------------ */
/* Organization setup — Business Units                                  */
/* ------------------------------------------------------------------ */

export async function upsertBusinessUnit(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const name = str(formData.get("name")) as BusinessUnit;
  if (!(BUSINESS_UNITS as readonly string[]).includes(name)) {
    return { error: "Business unit must be one of UAE, Karachi, or Multan." };
  }
  const notes = str(formData.get("notes")) || null;
  const cardReturnAddress = str(formData.get("cardReturnAddress")) || null;

  await mutateStore((store) => {
    if (!id && store.businessUnits.some((b) => b.name === name)) {
      return { next: store, result: { error: `${name} is already in the list.` } };
    }
    const idx = id ? store.businessUnits.findIndex((b) => b.id === id) : -1;
    const row: BusinessUnitRecord = {
      id: id || `bu-${randomUUID()}`,
      name,
      notes,
      cardReturnAddress,
    };
    const list = idx >= 0 ? store.businessUnits.map((b, i) => (i === idx ? row : b)) : [...store.businessUnits, row];
    return {
      next: audit({ ...store, businessUnits: list }, session.email, `${idx >= 0 ? "Updated" : "Created"} BU ${name}`),
      result: ok(),
    };
  });
  revalidatePath("/organization");
  return ok();
}

export async function deleteBusinessUnit(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, businessUnits: store.businessUnits.filter((b) => b.id !== id) }, session.email, `Deleted BU ${id}`),
    result: ok(),
  }));
  revalidatePath("/organization");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Organization setup — Departments                                     */
/* ------------------------------------------------------------------ */

export async function upsertDepartment(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!name) return { error: "Department name is required." };
  const businessUnitId = str(formData.get("businessUnitId")) || null;
  const headEmail = (str(formData.get("headEmail")) || "").toLowerCase() || null;
  const budget = str(formData.get("budget")) ? num(formData.get("budget")) : null;
  const budgetCurrency = str(formData.get("budgetCurrency")) ? pickCurrency(str(formData.get("budgetCurrency"))) : null;
  const notes = str(formData.get("notes")) || null;

  await mutateStore((store) => {
    const idx = id ? store.departments.findIndex((d) => d.id === id) : -1;
    const row: DepartmentRecord = {
      id: id || `dept-${randomUUID()}`,
      name,
      businessUnitId,
      headEmail,
      budget,
      budgetCurrency,
      notes,
    };
    const list = idx >= 0 ? store.departments.map((d, i) => (i === idx ? row : d)) : [...store.departments, row];
    return {
      next: audit({ ...store, departments: list }, session.email, `${idx >= 0 ? "Updated" : "Created"} department ${name}`),
      result: ok(),
    };
  });
  revalidatePath("/organization");
  return ok();
}

export async function deleteDepartment(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, departments: store.departments.filter((d) => d.id !== id) }, session.email, `Deleted department ${id}`),
    result: ok(),
  }));
  revalidatePath("/organization");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Organization setup — Job descriptions                                */
/* ------------------------------------------------------------------ */

export async function upsertJobDescription(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const designationNumber = str(formData.get("designationNumber"));
  const title = str(formData.get("title"));
  if (!designationNumber || !title) return { error: "Designation number and title are required." };
  const departmentId = str(formData.get("departmentId")) || null;
  const summary = str(formData.get("summary"));
  const responsibilities = str(formData.get("responsibilities"));
  const requirements = str(formData.get("requirements"));

  const upload = formData.get("attachment");
  let attachmentRef: string | null = null;
  let attachmentName: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    if (!isAllowedLibraryDocumentFile(upload)) {
      return { error: "Attachment must be PDF, DOC/DOCX, PPT/PPTX, PNG, JPG, or WebP." };
    }
    try {
      const saved = await saveFormDataFile(upload);
      if (saved) {
        attachmentRef = saved.ref;
        attachmentName = saved.originalName;
      }
    } catch (e: any) {
      return { error: e?.message || "Could not save the attachment." };
    }
  }

  await mutateStore((store) => {
    const idx = id ? store.jobDescriptions.findIndex((j) => j.id === id) : -1;
    const prev = idx >= 0 ? store.jobDescriptions[idx] : undefined;
    const row: JobDescription = {
      id: id || `jd-${randomUUID()}`,
      designationNumber,
      title,
      departmentId,
      summary,
      responsibilities,
      requirements,
      attachmentRef: attachmentRef ?? prev?.attachmentRef ?? null,
      attachmentName: attachmentName ?? prev?.attachmentName ?? null,
    };
    const list = idx >= 0 ? store.jobDescriptions.map((j, i) => (i === idx ? row : j)) : [...store.jobDescriptions, row];
    return {
      next: audit({ ...store, jobDescriptions: list }, session.email, `${idx >= 0 ? "Updated" : "Created"} job description ${designationNumber}`),
      result: ok(),
    };
  });
  revalidatePath("/organization");
  return ok();
}

export async function deleteJobDescription(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => {
    const victim = store.jobDescriptions.find((j) => j.id === id);
    const list = store.jobDescriptions.filter((j) => j.id !== id);
    if (victim?.attachmentRef) {
      void deleteStoredFile(victim.attachmentRef);
    }
    return {
      next: audit({ ...store, jobDescriptions: list }, session.email, `Deleted job description ${id}`),
      result: ok(),
    };
  });
  revalidatePath("/organization");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Transfers / Postings                                                 */
/* ------------------------------------------------------------------ */

export async function requestTransfer(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const employeeEmail = str(formData.get("employeeEmail")).toLowerCase();
  const toBusinessUnit = str(formData.get("toBusinessUnit")) as BusinessUnit;
  const toDepartment = str(formData.get("toDepartment"));
  const effectiveDate = str(formData.get("effectiveDate"));
  const tillDate = str(formData.get("tillDate")) || null;
  const reason = str(formData.get("reason"));
  if (!employeeEmail || !(BUSINESS_UNITS as readonly string[]).includes(toBusinessUnit) || !toDepartment || !effectiveDate) {
    return { error: "Employee, target BU, target department and effective date are required." };
  }
  await mutateStore((store) => {
    const emp = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!emp) return { next: store, result: { error: "Employee must exist in the directory." } };
    const row: TransferRecord = {
      id: `tr-${randomUUID()}`,
      employeeEmail: emp.email,
      fromBusinessUnit: emp.businessUnit,
      toBusinessUnit,
      fromDepartment: emp.department,
      toDepartment,
      effectiveDate,
      tillDate,
      reason,
      status: "Pending",
      approvedByEmail: null,
      approvedOn: null,
    };
    return {
      next: audit({ ...store, transfers: [row, ...store.transfers] }, session.email, `Transfer requested ${emp.email} → ${toBusinessUnit}/${toDepartment}`),
      result: ok(),
    };
  });
  revalidatePath("/transfer-posting");
  return ok();
}

export async function decideTransfer(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const decision = str(formData.get("decision")) as TransferStatus;
  if (!id || !["Approved", "Rejected", "Completed"].includes(decision)) return { error: "Invalid decision." };
  const today = new Date().toISOString().slice(0, 10);
  await mutateStore((store) => {
    const idx = store.transfers.findIndex((t) => t.id === id);
    if (idx < 0) return { next: store, result: { error: "Transfer not found." } };
    const prev = store.transfers[idx];
    if (!prev) return { next: store, result: { error: "Transfer not found." } };
    const transferRow: TransferRecord = {
      ...prev,
      status: decision,
      approvedByEmail: session.email,
      approvedOn: today,
    };
    let employees = store.employees;
    if (decision === "Completed") {
      employees = store.employees.map((e) =>
        e.email.toLowerCase() === prev.employeeEmail.toLowerCase()
          ? { ...e, businessUnit: prev.toBusinessUnit, department: prev.toDepartment }
          : e,
      );
    }
    const transfers = store.transfers.map((t, i) => (i === idx ? transferRow : t));
    return {
      next: audit({ ...store, transfers, employees }, session.email, `Transfer ${id} → ${decision}`),
      result: ok(),
    };
  });
  revalidatePath("/transfer-posting");
  revalidatePath("/employees");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Letters                                                              */
/* ------------------------------------------------------------------ */

export async function issueLetter(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const employeeEmail = str(formData.get("employeeEmail")).toLowerCase();
  const type = str(formData.get("type")) as LetterType;
  if (!["Promotion", "Redesignation", "Trainee", "Internship", "Termination"].includes(type)) {
    return { error: "Invalid letter type." };
  }
  if (!employeeEmail) return { error: "Pick an employee." };
  const effectiveDateRaw = str(formData.get("effectiveDate"));
  /** Promotion → force first-of-month. Redesignation/Trainee/Internship → keep editable. */
  const effectiveDate = type === "Promotion" ? forceFirstOfMonth(effectiveDateRaw) : effectiveDateRaw;
  if (!effectiveDate) return { error: "Effective date is required." };

  const issuedDate = str(formData.get("issuedDate")) || new Date().toISOString().slice(0, 10);
  const oldTitle = str(formData.get("oldTitle")) || null;
  const newTitle = str(formData.get("newTitle")) || null;
  const oldDepartment = str(formData.get("oldDepartment")) || null;
  const newDepartment = str(formData.get("newDepartment")) || null;
  const oldSalary = str(formData.get("oldSalary")) ? num(formData.get("oldSalary")) : null;
  const newSalary = str(formData.get("newSalary")) ? num(formData.get("newSalary")) : null;
  const programTitle = str(formData.get("programTitle")) || null;
  const durationMonths = str(formData.get("durationMonths")) ? num(formData.get("durationMonths")) : null;
  const stipend = str(formData.get("stipend")) ? num(formData.get("stipend")) : null;
  const notes = str(formData.get("notes")) || null;
  const terminationReason = str(formData.get("terminationReason")) || null;
  const terminationLastWorkingDate = str(formData.get("terminationLastWorkingDate")) || null;
  const terminationSettlementNotes = str(formData.get("terminationSettlementNotes")) || null;

  await mutateStore((store) => {
    const emp = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!emp) return { next: store, result: { error: "Employee must exist in the directory." } };
    const currency = currencyForBusinessUnit(emp.businessUnit);
    const row: EmployeeLetter = {
      id: `letter-${randomUUID()}`,
      employeeEmail: emp.email,
      type,
      effectiveDate,
      issuedDate,
      oldTitle,
      newTitle,
      oldDepartment,
      newDepartment,
      oldSalary,
      newSalary,
      currency,
      programTitle,
      durationMonths,
      stipend,
      terminationReason,
      terminationLastWorkingDate,
      terminationSettlementNotes,
      notes,
      issuedByEmail: session.email,
    };

    /** If type is Promotion / Redesignation, apply the new title + department to the employee record. */
    let employees = store.employees;
    if ((type === "Promotion" || type === "Redesignation") && newTitle) {
      employees = store.employees.map((e) =>
        e.email.toLowerCase() === emp.email.toLowerCase()
          ? { ...e, title: newTitle, department: newDepartment ?? e.department }
          : e,
      );
    }

    return {
      next: audit(
        { ...store, letters: [row, ...store.letters], employees },
        session.email,
        `${type} letter for ${emp.email} effective ${effectiveDate}`,
      ),
      result: ok(),
    };
  });
  revalidatePath("/letters");
  revalidatePath("/employees");
  return ok();
}

export async function deleteLetter(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, letters: store.letters.filter((l) => l.id !== id) }, session.email, `Deleted letter ${id}`),
    result: ok(),
  }));
  revalidatePath("/letters");
  return ok();
}

function forceFirstOfMonth(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  return `${isoDate.slice(0, 7)}-01`;
}


/* ------------------------------------------------------------------ */
/* Sub-departments                                                      */
/* ------------------------------------------------------------------ */

export async function upsertSubDepartment(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const departmentId = str(formData.get("departmentId"));
  const notes = str(formData.get("notes")) || null;
  if (!name) return { error: "Sub-department name is required." };
  if (!departmentId) return { error: "Parent department is required." };
  await mutateStore((store) => {
    const idx = id ? store.subDepartments.findIndex((s) => s.id === id) : -1;
    const row: SubDepartmentRecord = { id: id || `subdept-${randomUUID()}`, name, departmentId, notes };
    const list = idx >= 0 ? store.subDepartments.map((s, i) => (i === idx ? row : s)) : [...store.subDepartments, row];
    return {
      next: audit({ ...store, subDepartments: list }, session.email, `${idx >= 0 ? "Updated" : "Created"} sub-department ${name}`),
      result: ok(),
    };
  });
  revalidatePath("/organization");
  return ok();
}

export async function deleteSubDepartment(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, subDepartments: store.subDepartments.filter((s) => s.id !== id) }, session.email, `Deleted sub-department ${id}`),
    result: ok(),
  }));
  revalidatePath("/organization");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Leave categories & entitlements                                      */
/* ------------------------------------------------------------------ */

export async function upsertLeaveCategory(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const defaultDaysPerYear = Math.max(0, num(formData.get("defaultDaysPerYear")));
  const sortOrder = num(formData.get("sortOrder"), 0);
  if (!name) return { error: "Leave type name is required." };

  await mutateStore((store) => {
    const row: LeaveCategory = {
      id: id || `lv-cat-${randomUUID()}`,
      name,
      defaultDaysPerYear,
      isActive: true,
      sortOrder,
    };
    const idx = id ? store.leaveCategories.findIndex((c) => c.id === id) : -1;
    const list =
      idx >= 0 ? store.leaveCategories.map((c, i) => (i === idx ? { ...c, ...row, id: c.id } : c)) : [...store.leaveCategories, row];
    return {
      next: audit({ ...store, leaveCategories: list }, session.email, `${idx >= 0 ? "Updated" : "Added"} leave type: ${name}`),
      result: ok(),
    };
  });
  revalidatePath("/settings");
  revalidatePath("/leave");
  return ok();
}

export async function deleteLeaveCategory(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        leaveCategories: store.leaveCategories.map((c) => (c.id === id ? { ...c, isActive: false } : c)),
      },
      session.email,
      `Deactivated leave type ${id}`,
    ),
    result: ok(),
  }));
  revalidatePath("/settings");
  revalidatePath("/leave");
  return ok();
}

/** Apply each category's standard days to every active employee for the given year. */
export async function applyLeaveDefaultsToAllEmployees(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const year = num(formData.get("year"), new Date().getFullYear());
  if (year < 2000 || year > 2100) return { error: "Invalid year." };

  await mutateStore((store) => {
    const activeEmails = store.employees.filter((e) => e.status === "Active").map((e) => e.email);
    const newRows = buildAllocationsFromDefaults(store, activeEmails, year);
    const key = (a: EmployeeLeaveAllocation) => `${a.employeeEmail.toLowerCase()}:${a.categoryId}:${a.year}`;
    const map = new Map(store.employeeLeaveAllocations.map((a) => [key(a), a]));
    for (const row of newRows) {
      map.set(key(row), row);
    }
    return {
      next: audit(
        { ...store, employeeLeaveAllocations: [...map.values()] },
        session.email,
        `Applied leave defaults to ${activeEmails.length} employees for ${year}`,
      ),
      result: ok(),
    };
  });
  revalidatePath("/leave");
  revalidatePath("/settings");
  return ok();
}

export async function upsertEmployeeLeaveAllocation(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const employeeEmail = str(formData.get("employeeEmail")).toLowerCase();
  const categoryId = str(formData.get("categoryId"));
  const year = num(formData.get("year"), new Date().getFullYear());
  const allocatedDays = Math.max(0, num(formData.get("allocatedDays")));
  if (!employeeEmail || !categoryId) return { error: "Employee and leave type are required." };

  await mutateStore((store) => {
    const emp = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!emp) return { next: store, result: { error: "Employee not found." } };
    const cat = store.leaveCategories.find((c) => c.id === categoryId && c.isActive);
    if (!cat) return { next: store, result: { error: "Leave type not found." } };

    const id = `lva-${emp.email}-${categoryId}-${year}`.replace(/[^a-zA-Z0-9-]/g, "-");
    const row: EmployeeLeaveAllocation = {
      id,
      employeeEmail: emp.email,
      categoryId,
      year,
      allocatedDays,
    };
    const idx = store.employeeLeaveAllocations.findIndex(
      (a) =>
        a.employeeEmail.toLowerCase() === employeeEmail &&
        a.categoryId === categoryId &&
        a.year === year,
    );
    const list =
      idx >= 0
        ? store.employeeLeaveAllocations.map((a, i) => (i === idx ? { ...a, allocatedDays } : a))
        : [...store.employeeLeaveAllocations, row];
    return {
      next: audit({ ...store, employeeLeaveAllocations: list }, session.email, `Set ${cat.name} for ${emp.email} (${year}): ${allocatedDays} days`),
      result: ok(),
    };
  });
  revalidatePath("/leave");
  return ok();
}

export async function resetEmployeeLeaveToDefaults(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const employeeEmail = str(formData.get("employeeEmail")).toLowerCase();
  const year = num(formData.get("year"), new Date().getFullYear());
  if (!employeeEmail) return { error: "Employee is required." };

  await mutateStore((store) => {
    const emp = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!emp) return { next: store, result: { error: "Employee not found." } };
    const newRows = buildAllocationsFromDefaults(store, [emp.email], year);
    const key = (a: EmployeeLeaveAllocation) => `${a.employeeEmail.toLowerCase()}:${a.categoryId}:${a.year}`;
    const map = new Map(store.employeeLeaveAllocations.map((a) => [key(a), a]));
    for (const row of newRows) {
      map.set(key(row), row);
    }
    return {
      next: audit({ ...store, employeeLeaveAllocations: [...map.values()] }, session.email, `Reset leave entitlements to defaults for ${emp.email} (${year})`),
      result: ok(),
    };
  });
  revalidatePath("/leave");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Conflict of Interest documents                                       */
/* ------------------------------------------------------------------ */

export async function uploadCoiTemplate(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const file = formData.get("coiFile");
  const version = str(formData.get("version")) || null;
  if (!(file instanceof File) || file.size === 0) return { error: "Please select a file to upload." };
  let saved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  try {
    saved = await saveFormDataFile(file);
  } catch (e: any) {
    return { error: e?.message || "File upload failed." };
  }
  if (!saved) return { error: "File upload failed." };
  const row: ConflictOfInterestDoc = {
    id: `coi-${randomUUID()}`,
    uploadedByEmail: session.email,
    uploadedAt: new Date().toISOString(),
    storedRef: saved.ref,
    originalName: saved.originalName,
    version,
  };
  await mutateStore((store) => ({
    next: audit({ ...store, coiDocs: [row, ...store.coiDocs] }, session.email, `Uploaded CoI template ${saved!.originalName}`),
    result: ok(),
  }));
  revalidatePath("/documents");
  return ok();
}

export async function submitCoiDocument(formData: FormData): Promise<ActionResult> {
  const session = await (await import("@/lib/auth")).getSession();
  if (!session) return { error: "Not signed in." };
  const file = formData.get("signedCoiFile");
  if (!(file instanceof File) || file.size === 0) return { error: "Please select your signed CoI document." };
  let saved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  try {
    saved = await saveFormDataFile(file);
  } catch (e: any) {
    return { error: e?.message || "File upload failed." };
  }
  if (!saved) return { error: "File upload failed." };
  const row: CoiSubmission = {
    id: `coisub-${randomUUID()}`,
    employeeEmail: session.email,
    submittedAt: new Date().toISOString(),
    storedRef: saved.ref,
    originalName: saved.originalName,
  };
  await mutateStore((store) => ({
    next: audit({ ...store, coiSubmissions: [row, ...store.coiSubmissions] }, session.email, `CoI submission from ${session.email}`),
    result: ok(),
  }));
  revalidatePath("/documents");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Salary — allowance catalog (Settings)                                */
/* ------------------------------------------------------------------ */

export async function upsertSalaryAllowanceType(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  const unitRaw = str(formData.get("unit"));
  const unit: SalaryAllowanceUnit = unitRaw === "liters" ? "liters" : "money";
  const sortOrder = num(formData.get("sortOrder"), 0);
  if (!name) return { error: "Allowance name is required." };

  await mutateStore((store) => {
    const row: SalaryAllowanceCatalogItem = {
      id: id || `sal-allow-${randomUUID()}`,
      name,
      unit,
      isActive: true,
      sortOrder,
    };
    const idx = id ? store.salaryAllowanceTypes.findIndex((t) => t.id === id) : -1;
    const list =
      idx >= 0
        ? store.salaryAllowanceTypes.map((t, i) => (i === idx ? { ...t, ...row, id: t.id } : t))
        : [...store.salaryAllowanceTypes, row];
    return {
      next: audit({ ...store, salaryAllowanceTypes: list }, session.email, `${idx >= 0 ? "Updated" : "Added"} salary allowance: ${name}`),
      result: ok(),
    };
  });
  revalidatePath("/settings");
  revalidatePath("/employees");
  return ok();
}

export async function deleteSalaryAllowanceType(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        salaryAllowanceTypes: store.salaryAllowanceTypes.map((t) => (t.id === id ? { ...t, isActive: false } : t)),
      },
      session.email,
      `Deactivated salary allowance type ${id}`,
    ),
    result: ok(),
  }));
  revalidatePath("/settings");
  revalidatePath("/employees");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Salary — per employee (People)                                       */
/* ------------------------------------------------------------------ */

export async function upsertEmployeeCompensation(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const employeeId = str(formData.get("employeeId"));
  if (!employeeId) return { error: "Missing employee." };

  const clear = str(formData.get("clearCompensation")) === "1";
  const grossSalary = parseMoneyField(formData.get("grossSalary"));
  const basicSalary = parseMoneyField(formData.get("basicSalary"));

  const typeIds = formData.getAll("allowanceTypeId").map((v) => str(v)).filter(Boolean);
  const amounts = formData.getAll("allowanceAmount").map((v) => parseMoneyField(v));

  await mutateStore((store) => {
    const idx = store.employees.findIndex((e) => e.id === employeeId);
    if (idx < 0) return { next: store, result: { error: "Employee not found." } };
    const emp = store.employees[idx] as Employee;

    if (clear) {
      const employees = store.employees.map((e, i) =>
        i === idx ? { ...e, compensation: null } : e,
      );
      return {
        next: audit({ ...store, employees }, session.email, `Cleared salary for ${emp.email}`),
        result: ok(),
      };
    }

    if (grossSalary == null && basicSalary == null && typeIds.length === 0) {
      return { next: store, result: { error: "Enter gross salary, basic salary, or at least one allowance." } };
    }

    const catalog = store.salaryAllowanceTypes.filter((t) => t.isActive);
    const seen = new Set<string>();
    const allowances: EmployeeSalaryAllowanceLine[] = [];
    for (let i = 0; i < typeIds.length; i++) {
      const typeId = typeIds[i];
      if (!typeId || seen.has(typeId)) continue;
      const cat = catalog.find((t) => t.id === typeId);
      if (!cat) continue;
      const amount = amounts[i];
      if (amount == null || amount <= 0) continue;
      seen.add(typeId);
      allowances.push({ typeId, amount });
    }

    const currency = pickCurrency(str(formData.get("currency")), emp.businessUnit);
    const compensation: EmployeeCompensation = {
      grossSalary: grossSalary ?? 0,
      basicSalary: basicSalary ?? 0,
      currency,
      allowances,
      updatedAt: new Date().toISOString(),
      updatedByEmail: session.email,
    };

    const employees = store.employees.map((e, i) => (i === idx ? { ...e, compensation } : e));
    return {
      next: audit({ ...store, employees }, session.email, `Updated salary for ${emp.email}`),
      result: ok(),
    };
  });
  revalidatePath("/employees");
  return ok();
}

/* ------------------------------------------------------------------ */
/* Expense claims (submit → approve → reimburse)                          */
/* ------------------------------------------------------------------ */

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Lodging",
  "Supplies",
  "Client entertainment",
  "Software",
  "Other",
] as const;

export async function submitExpense(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const category = str(formData.get("category"));
  const amount = parseMoneyField(formData.get("amount"));
  const description = str(formData.get("description"));
  if (!category || amount == null || amount <= 0 || !description) {
    return { error: "Category, amount, and description are required." };
  }
  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    return { error: "Invalid expense category." };
  }

  const receiptFile = formData.get("receiptFile");
  let receiptRef: string | null = null;
  let receiptOriginalName: string | null = null;
  if (receiptFile instanceof File && receiptFile.size > 0) {
    if (!isAllowedLibraryDocumentFile(receiptFile)) {
      return { error: "Receipt must be PDF, Word, PowerPoint, or an image (PNG, JPG, WebP)." };
    }
    try {
      const saved = await saveFormDataFile(receiptFile);
      if (saved) {
        receiptRef = saved.ref;
        receiptOriginalName = saved.originalName;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save receipt.";
      return { error: msg };
    }
  }

  const result = await mutateStore<ActionResult>((store) => {
    const employee = store.employees.find((e) => e.email.toLowerCase() === session.email.toLowerCase());
    if (!employee) return { next: store, result: { error: "Your employee profile was not found." } };
    const currency = pickCurrency(str(formData.get("currency")), employee.businessUnit);
    const row: ExpenseClaim = {
      id: `exp-${randomUUID()}`,
      employeeEmail: employee.email,
      submittedOn: new Date().toISOString(),
      category,
      amount,
      currency,
      description,
      receiptRef,
      receiptOriginalName,
      status: "Pending",
      approvedByEmail: null,
      approvedOn: null,
      paidOn: null,
    };
    return {
      next: audit({ ...store, expenses: [row, ...store.expenses] }, session.email, `Submitted expense claim ${row.id}`),
      result: ok(),
    };
  });
  if ("error" in result) {
    await deleteStoredFile(receiptRef);
    return result;
  }
  revalidatePath("/expenses");
  return ok();
}

export async function decideExpense(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  const decision = str(formData.get("decision"));
  if (!id || !["approve", "reject"].includes(decision)) return { error: "Invalid request." };

  const nextStatus: ExpenseStatus = decision === "approve" ? "Approved" : "Rejected";
  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.expenses.findIndex((e) => e.id === id);
    if (idx < 0) return { next: store, result: { error: "Claim not found." } };
    const claim = store.expenses[idx]!;
    if (claim.status !== "Pending") return { next: store, result: { error: "Only pending claims can be approved or rejected." } };
    const expenses = store.expenses.map((e, i) =>
      i === idx
        ? {
            ...e,
            status: nextStatus,
            approvedByEmail: session.email,
            approvedOn: new Date().toISOString(),
          }
        : e,
    );
    return {
      next: audit({ ...store, expenses }, session.email, `${nextStatus} expense ${id}`),
      result: ok(),
    };
  });
  revalidatePath("/expenses");
  return result;
}

export async function markExpensePaid(formData: FormData): Promise<ActionResult> {
  const auth = await requireExec();
  if (!auth.ok) return { error: auth.error };
  const { session } = auth;
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing claim id." };

  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.expenses.findIndex((e) => e.id === id);
    if (idx < 0) return { next: store, result: { error: "Claim not found." } };
    const claim = store.expenses[idx]!;
    if (claim.status !== "Approved") return { next: store, result: { error: "Only approved claims can be marked paid." } };
    const expenses = store.expenses.map((e, i) =>
      i === idx ? { ...e, status: "Paid" as ExpenseStatus, paidOn: new Date().toISOString() } : e,
    );
    return {
      next: audit({ ...store, expenses }, session.email, `Marked expense ${id} as paid`),
      result: ok(),
    };
  });
  revalidatePath("/expenses");
  return result;
}

export async function deleteExpense(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing id." };

  const snapshot = await readStore();
  const claim = snapshot.expenses.find((e) => e.id === id);
  if (!claim) return { error: "Claim not found." };

  const isOwner = claim.employeeEmail.toLowerCase() === session.email.toLowerCase();
  const isExec = hasExecAccess(session.role);
  if (!isExec && (!isOwner || claim.status !== "Pending")) {
    return { error: "You can only withdraw your own pending claims." };
  }

  const ref = claim.receiptRef;
  await mutateStore((store) => ({
    next: audit({ ...store, expenses: store.expenses.filter((e) => e.id !== id) }, session.email, `Deleted expense ${id}`),
    result: ok(),
  }));
  await deleteStoredFile(ref);
  revalidatePath("/expenses");
  return ok();
}
