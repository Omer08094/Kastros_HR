"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { loadEmployeeAuthRoles } from "@/lib/firebase-auth-roles";
import { sendHrNotificationEmail } from "@/lib/hr-emails";
import { calcPmdfScores, sumPercentages } from "@/lib/pmdf-scoring";
import { defaultDevelopmentRows, phaseLabel, type PmdfPhaseId } from "@/lib/pmdf-reference";
import { hasExecAccess } from "@/lib/roles";
import { mutateStore, readStore } from "@/lib/store/persist";
import type {
  Employee,
  HrStore,
  PmdfBusinessObjective,
  PmdfDevelopmentObjective,
  PmdfForm,
  PmdfPhase,
} from "@/lib/store/types";

type ActionResult = { ok: true } | { error: string };

function ok(): ActionResult {
  return { ok: true };
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

function audit(store: HrStore, actor: string, action: string): HrStore {
  const row = { at: new Date().toISOString(), actor, action, ip: "app" };
  return { ...store, audit: [row, ...store.audit].slice(0, 500) };
}

function emptyBusinessRows(count = 4): PmdfBusinessObjective[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bo-${randomUUID()}`,
    sortOrder: i + 1,
    objectiveSmart: "",
    action: "",
    employeeComments: "",
    percentage: 0,
    selfScoreFy: null,
    finalScoreFy: null,
    managerCommentsHalfYear: "",
    managerCommentsFullYear: "",
  }));
}

function defaultDevelopmentObjectives(): PmdfDevelopmentObjective[] {
  return defaultDevelopmentRows().map((row, i) => ({
    id: `do-${randomUUID()}`,
    sortOrder: i + 1,
    pillar: row.pillar,
    developmentArea: row.developmentArea,
    actionPlan: "",
    percentage: 0,
    selfScoreFy: null,
    finalScoreFy: null,
    managerCommentsHalfYear: "",
    managerCommentsFullYear: "",
  }));
}

function buildFormFromEmployee(cycleId: string, employee: Employee, store: HrStore): PmdfForm {
  const manager = employee.reportsToEmail
    ? store.employees.find((e) => e.email.toLowerCase() === employee.reportsToEmail!.toLowerCase())
    : null;
  const now = new Date().toISOString();
  const cycle = store.performanceCycles.find((c) => c.id === cycleId);
  return {
    id: `pmdf-${randomUUID()}`,
    cycleId,
    employeeEmail: employee.email.toLowerCase(),
    employeeName: employee.name,
    employeeIdDisplay: employee.employeeIdDisplay,
    jobTitle: employee.title,
    department: employee.department,
    subDepartment: employee.subDepartment,
    lineManagerEmail: manager?.email.toLowerCase() ?? employee.reportsToEmail?.toLowerCase() ?? null,
    lineManagerName: manager?.name ?? null,
    location: employee.location,
    functionalArea: null,
    locationCategory: null,
    businessObjectives: emptyBusinessRows(),
    developmentObjectives: defaultDevelopmentObjectives(),
    employeeFeedbackMidYear: "",
    managerFeedbackMidYear: "",
    employeeFeedbackFy: "",
    managerFeedbackFy: "",
    employeeSignature: "",
    managerSignature: "",
    employeeSignedAt: null,
    managerSignedAt: null,
    phase: cycle?.currentPhase ?? "objective_setting_employee",
    locked: cycle?.locked ?? false,
    assignedAt: now,
    lastNotifiedAt: null,
    updatedAt: now,
  };
}

function resolveAssignmentEmails(store: HrStore, scope: string, department: string, employeeEmail: string): string[] {
  if (scope === "organisation") {
    return store.employees.filter((e) => e.status === "Active").map((e) => e.email.toLowerCase());
  }
  if (scope === "department") {
    const dept = department.trim().toLowerCase();
    return store.employees
      .filter((e) => e.status === "Active" && e.department.toLowerCase() === dept)
      .map((e) => e.email.toLowerCase());
  }
  const em = employeeEmail.trim().toLowerCase();
  return em ? [em] : [];
}

function clampPercentage(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function clampRating(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return Math.min(5, Math.max(1, rounded));
}

async function hrAdminEmails(store: HrStore): Promise<string[]> {
  const roles = await loadEmployeeAuthRoles(store.employees.map((e) => e.email.toLowerCase()));
  return [...new Set(roles.filter((r) => r.role === "hr_admin").map((r) => r.email.toLowerCase()))];
}

function parseBusinessObjectives(formData: FormData): PmdfBusinessObjective[] {
  const count = Number(formData.get("boCount") ?? "0");
  const rows: PmdfBusinessObjective[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: String(formData.get(`bo_id_${i}`) ?? `bo-${i}`),
      sortOrder: i + 1,
      objectiveSmart: String(formData.get(`bo_smart_${i}`) ?? "").trim(),
      action: String(formData.get(`bo_action_${i}`) ?? "").trim(),
      employeeComments: String(formData.get(`bo_comments_${i}`) ?? "").trim(),
      percentage: clampPercentage(formData.get(`bo_pct_${i}`)),
      selfScoreFy: clampRating(formData.get(`bo_self_${i}`)),
      finalScoreFy: clampRating(formData.get(`bo_final_${i}`)),
      managerCommentsHalfYear: String(formData.get(`bo_mgr_hy_${i}`) ?? "").trim(),
      managerCommentsFullYear: String(formData.get(`bo_mgr_fy_${i}`) ?? "").trim(),
    });
  }
  return rows;
}

function parseDevelopmentObjectives(formData: FormData): PmdfDevelopmentObjective[] {
  const count = Number(formData.get("doCount") ?? "0");
  const rows: PmdfDevelopmentObjective[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: String(formData.get(`do_id_${i}`) ?? `do-${i}`),
      sortOrder: i + 1,
      pillar: String(formData.get(`do_pillar_${i}`) ?? "").trim(),
      developmentArea: String(formData.get(`do_area_${i}`) ?? "").trim(),
      actionPlan: String(formData.get(`do_plan_${i}`) ?? "").trim(),
      percentage: clampPercentage(formData.get(`do_pct_${i}`)),
      selfScoreFy: clampRating(formData.get(`do_self_${i}`)),
      finalScoreFy: clampRating(formData.get(`do_final_${i}`)),
      managerCommentsHalfYear: String(formData.get(`do_mgr_hy_${i}`) ?? "").trim(),
      managerCommentsFullYear: String(formData.get(`do_mgr_fy_${i}`) ?? "").trim(),
    });
  }
  return rows;
}

export async function createPerformanceCycle(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can create performance cycles." };

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  if (!title || !startDate || !endDate) return { error: "Title and date range are required." };

  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        performanceCycles: [
          {
            id: `pc-${randomUUID()}`,
            title,
            startDate,
            endDate,
            currentPhase: "objective_setting_employee",
            objectiveSettingEmployeeDeadline: String(formData.get("objectiveSettingEmployeeDeadline") ?? "").trim() || null,
            objectiveSettingManagerDeadline: String(formData.get("objectiveSettingManagerDeadline") ?? "").trim() || null,
            midYearEmployeeDeadline: String(formData.get("midYearEmployeeDeadline") ?? "").trim() || null,
            midYearManagerDeadline: String(formData.get("midYearManagerDeadline") ?? "").trim() || null,
            yearEndEmployeeDeadline: String(formData.get("yearEndEmployeeDeadline") ?? "").trim() || null,
            yearEndManagerDeadline: String(formData.get("yearEndManagerDeadline") ?? "").trim() || null,
            locked: false,
            lockedAt: null,
            createdByEmail: session.email,
            createdAt: new Date().toISOString(),
          },
          ...store.performanceCycles,
        ],
      },
      session.email,
      `Created performance cycle ${title}`,
    ),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function assignPmdfForms(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can assign PMDF forms." };

  const cycleId = String(formData.get("cycleId") ?? "").trim();
  const scope = String(formData.get("scope") ?? "") as "organisation" | "department" | "employee";
  const department = String(formData.get("department") ?? "").trim();
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  if (!cycleId) return { error: "Select a performance cycle." };
  if (!["organisation", "department", "employee"].includes(scope)) return { error: "Invalid assignment scope." };
  if (scope === "department" && !department) return { error: "Select a department." };
  if (scope === "employee" && !employeeEmail) return { error: "Select an employee." };

  const snapshot = await readStore();
  if (!snapshot.performanceCycles.some((c) => c.id === cycleId)) return { error: "Cycle not found." };
  const emails = resolveAssignmentEmails(snapshot, scope, department, employeeEmail);
  if (emails.length === 0) return { error: "No active employees matched this assignment." };

  await mutateStore((store) => {
    const existing = new Set(store.pmdfForms.filter((f) => f.cycleId === cycleId).map((f) => f.employeeEmail.toLowerCase()));
    const newForms: PmdfForm[] = [];
    for (const email of emails) {
      if (existing.has(email)) continue;
      const emp = store.employees.find((e) => e.email.toLowerCase() === email);
      if (!emp) continue;
      newForms.push(buildFormFromEmployee(cycleId, emp, store));
    }
    return {
      next: audit(
        {
          ...store,
          pmdfAssignments: [
            {
              id: `pa-${randomUUID()}`,
              cycleId,
              scope,
              department: scope === "department" ? department : null,
              employeeEmail: scope === "employee" ? employeeEmail : null,
              assignedAt: new Date().toISOString(),
              assignedByEmail: session.email,
            },
            ...store.pmdfAssignments,
          ],
          pmdfForms: [...newForms, ...store.pmdfForms],
        },
        session.email,
        `Assigned PMDF (${scope}) to ${newForms.length} employee(s)`,
      ),
      result: ok(),
    };
  });

  revalidatePath("/performance");
  return ok();
}

export async function updatePerformanceCycle(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };

  const cycleId = String(formData.get("cycleId") ?? "").trim();
  const currentPhase = String(formData.get("currentPhase") ?? "") as PmdfPhase;
  const locked = String(formData.get("locked") ?? "") === "1";
  if (!cycleId) return { error: "Missing cycle." };

  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        performanceCycles: store.performanceCycles.map((c) =>
          c.id === cycleId
            ? {
                ...c,
                currentPhase: currentPhase || c.currentPhase,
                objectiveSettingEmployeeDeadline:
                  String(formData.get("objectiveSettingEmployeeDeadline") ?? "").trim() || c.objectiveSettingEmployeeDeadline,
                objectiveSettingManagerDeadline:
                  String(formData.get("objectiveSettingManagerDeadline") ?? "").trim() || c.objectiveSettingManagerDeadline,
                midYearEmployeeDeadline: String(formData.get("midYearEmployeeDeadline") ?? "").trim() || c.midYearEmployeeDeadline,
                midYearManagerDeadline: String(formData.get("midYearManagerDeadline") ?? "").trim() || c.midYearManagerDeadline,
                yearEndEmployeeDeadline: String(formData.get("yearEndEmployeeDeadline") ?? "").trim() || c.yearEndEmployeeDeadline,
                yearEndManagerDeadline: String(formData.get("yearEndManagerDeadline") ?? "").trim() || c.yearEndManagerDeadline,
                locked,
                lockedAt: locked ? new Date().toISOString() : null,
              }
            : c,
        ),
        pmdfForms: store.pmdfForms.map((f) =>
          f.cycleId === cycleId ? { ...f, locked, phase: currentPhase || f.phase, updatedAt: new Date().toISOString() } : f,
        ),
      },
      session.email,
      `Updated performance cycle ${cycleId}${locked ? " (locked)" : ""}`,
    ),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function notifyPmdfDeadline(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };

  const cycleId = String(formData.get("cycleId") ?? "").trim();
  if (!cycleId) return { error: "Select a cycle." };

  const store = await readStore();
  const cycle = store.performanceCycles.find((c) => c.id === cycleId);
  if (!cycle) return { error: "Cycle not found." };

  const forms = store.pmdfForms.filter((f) => f.cycleId === cycleId);
  const deadline =
    cycle.objectiveSettingEmployeeDeadline ??
    cycle.midYearEmployeeDeadline ??
    cycle.yearEndEmployeeDeadline ??
    cycle.endDate;
  const phase = phaseLabel(cycle.currentPhase as PmdfPhaseId);
  const url = `${appBaseUrl()}/performance`;
  const hrEmails = await hrAdminEmails(store);

  let sent = 0;
  for (const form of forms) {
    const to = [...new Set([form.employeeEmail, ...hrEmails])];
    const okSend = await sendHrNotificationEmail({
      to,
      subject: `Reminder: complete your PMDF — ${cycle.title}`,
      headline: `${cycle.title} — action required`,
      body: `Please complete your Performance Management & Development Form.<br/><br/><strong>Current phase:</strong> ${phase}<br/><strong>Deadline:</strong> ${deadline}<br/><br/>Sign in to Kastros HR to update your form.`,
      actionLabel: "Open performance form",
      actionUrl: url,
    });
    if (okSend) sent++;
  }

  if (sent > 0) {
    await mutateStore((s) => ({
      next: audit(
        {
          ...s,
          pmdfForms: s.pmdfForms.map((f) =>
            f.cycleId === cycleId ? { ...f, lastNotifiedAt: new Date().toISOString() } : f,
          ),
        },
        session.email,
        `Sent PMDF deadline reminders (${sent})`,
      ),
      result: ok(),
    }));
  }

  revalidatePath("/performance");
  return sent > 0 ? ok() : { error: "Could not send reminder emails. Check SMTP configuration." };
}

export async function savePmdfForm(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const formId = String(formData.get("formId") ?? "").trim();
  if (!formId) return { error: "Missing form." };

  const store = await readStore();
  const existing = store.pmdfForms.find((f) => f.id === formId);
  if (!existing) return { error: "Form not found." };

  const cycle = store.performanceCycles.find((c) => c.id === existing.cycleId);
  const isHr = hasExecAccess(session.role);
  const isOwner = existing.employeeEmail.toLowerCase() === session.email.toLowerCase();
  const isManager =
    !!existing.lineManagerEmail && existing.lineManagerEmail.toLowerCase() === session.email.toLowerCase();
  if (!isHr && !isOwner && !isManager) return { error: "You cannot edit this form." };
  if ((existing.locked || cycle?.locked) && !isHr) return { error: "This form is locked." };

  const businessObjectives = parseBusinessObjectives(formData);
  const developmentObjectives = parseDevelopmentObjectives(formData);
  const boTotal = sumPercentages(businessObjectives.map((r) => r.percentage));
  const doTotal = sumPercentages(developmentObjectives.map((r) => r.percentage));
  const boHasPct = businessObjectives.some((r) => r.percentage > 0);
  const doHasPct = developmentObjectives.some((r) => r.percentage > 0);
  if (boHasPct && Math.abs(boTotal - 100) > 0.01) {
    return { error: `Business objectives must total 100% (currently ${boTotal}%).` };
  }
  if (doHasPct && Math.abs(doTotal - 100) > 0.01) {
    return { error: `Development objectives must total 100% (currently ${doTotal}%).` };
  }

  calcPmdfScores(businessObjectives, developmentObjectives);

  await mutateStore((s) => ({
    next: audit(
      {
        ...s,
        pmdfForms: s.pmdfForms.map((f) =>
          f.id === formId
            ? {
                ...f,
                functionalArea: String(formData.get("functionalArea") ?? "").trim() || null,
                locationCategory: String(formData.get("locationCategory") ?? "").trim() || null,
                subDepartment: String(formData.get("subDepartment") ?? "").trim() || null,
                businessObjectives,
                developmentObjectives,
                employeeFeedbackMidYear: String(formData.get("employeeFeedbackMidYear") ?? "").trim(),
                managerFeedbackMidYear: String(formData.get("managerFeedbackMidYear") ?? "").trim(),
                employeeFeedbackFy: String(formData.get("employeeFeedbackFy") ?? "").trim(),
                managerFeedbackFy: String(formData.get("managerFeedbackFy") ?? "").trim(),
                employeeSignature: String(formData.get("employeeSignature") ?? "").trim(),
                managerSignature: String(formData.get("managerSignature") ?? "").trim(),
                employeeSignedAt: String(formData.get("employeeSignature") ?? "").trim()
                  ? new Date().toISOString()
                  : f.employeeSignedAt,
                managerSignedAt: String(formData.get("managerSignature") ?? "").trim()
                  ? new Date().toISOString()
                  : f.managerSignedAt,
                updatedAt: new Date().toISOString(),
              }
            : f,
        ),
      },
      session.email,
      `Saved PMDF ${formId}`,
    ),
    result: ok(),
  }));

  revalidatePath("/performance");
  revalidatePath(`/performance/print/${formId}`);
  return ok();
}
