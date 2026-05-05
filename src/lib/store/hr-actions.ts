"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { mutateStore, readStore } from "@/lib/store/persist";
import { createInitialStore } from "@/lib/store/seed";
import { canDecideLeave, isDirectReport, managerMayTouchTraining } from "@/lib/store/policy";
import type { HrStore, LeaveStatus, PayrollAllowanceType } from "@/lib/store/types";

type ActionResult = { ok: true } | { error: string };

function ok(): ActionResult {
  return { ok: true };
}

function audit(store: HrStore, actor: string, action: string): HrStore {
  const row = { at: new Date().toISOString(), actor, action, ip: "app" };
  return { ...store, audit: [row, ...store.audit].slice(0, 500) };
}

function probationDate(joiningDate: string, months: number): string {
  const dt = new Date(joiningDate);
  dt.setMonth(dt.getMonth() + months);
  return dt.toISOString().slice(0, 10);
}

export async function resetDemoData(): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR admins can reset demo data." };
  await mutateStore(() => ({ next: audit(createInitialStore(), session.email, "Reset demo dataset"), result: undefined }));
  revalidatePath("/", "layout");
  return ok();
}

export async function addEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };
  const name = String(formData.get("name") ?? "").trim();
  const fatherName = String(formData.get("fatherName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || "General";
  const location = String(formData.get("location") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "Permanent");
  const joiningDate = String(formData.get("joiningDate") ?? "").trim();
  const probationMonths = Number(formData.get("probationMonths") ?? "3");
  const reportsToEmail = String(formData.get("reportsToEmail") ?? "").trim().toLowerCase() || null;
  const companyPhone = String(formData.get("companyPhone") ?? "").trim();
  const personalPhone = String(formData.get("personalPhone") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactRelation = String(formData.get("emergencyContactRelation") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();
  const familyRelationName = String(formData.get("familyRelationName") ?? "").trim();
  const familyRelationType = String(formData.get("familyRelationType") ?? "").trim();
  const familyRelationFirm = String(formData.get("familyRelationFirm") ?? "").trim();
  const familyLinked = String(formData.get("familyLinked") ?? "no") === "yes";

  if (!name || !fatherName || !email || !title || !location || !joiningDate) return { error: "Fill required fields." };
  const probationCompletionDate = probationDate(joiningDate, Number.isFinite(probationMonths) ? probationMonths : 3);

  const result = await mutateStore<ActionResult>((store) => {
    if (store.employees.some((e) => e.email.toLowerCase() === email)) return { next: store, result: { error: "Email already exists." } };
    const next: HrStore = {
      ...store,
      employees: [
        ...store.employees,
        {
          id: `emp-${randomUUID()}`,
          name,
          fatherName,
          email,
          title,
          location,
          status: "Active",
          department,
          employmentType: ["Permanent", "Temporary", "Contractual", "Intern"].includes(employmentType) ? (employmentType as "Permanent" | "Temporary" | "Contractual" | "Intern") : "Permanent",
          joiningDate,
          probationMonths: Number.isFinite(probationMonths) ? probationMonths : 3,
          probationCompletionDate,
          companyPhone,
          personalPhone,
          emergencyContacts: emergencyContactName
            ? [{ name: emergencyContactName, relation: emergencyContactRelation || "Next of kin", phone: emergencyContactPhone }]
            : [],
          familyRelations: familyRelationName
            ? [{ name: familyRelationName, relation: familyRelationType || "Relative", firmOrEmployer: familyRelationFirm || "N/A", linkedToTraderOrMerchandiser: familyLinked }]
            : [],
          reportsToEmail,
        },
      ],
    };
    return { next: audit(next, session.email, `Created employee ${email}`), result: ok() };
  });
  if ("error" in result) return result;
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return ok();
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || "General";
  const status = String(formData.get("status") ?? "") as "Active" | "On leave" | "Offboarding";
  const reportsToEmailRaw = String(formData.get("reportsToEmail") ?? "").trim();
  const reportsToEmail = reportsToEmailRaw ? reportsToEmailRaw.toLowerCase() : null;
  if (!id || !title || !location) return { error: "Missing fields." };
  if (!["Active", "On leave", "Offboarding"].includes(status)) return { error: "Invalid status." };

  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.employees.findIndex((e) => e.id === id);
    if (idx < 0) return { next: store, result: { error: "Not found." } };
    const copy = structuredClone(store.employees);
    copy[idx] = { ...copy[idx], title, location, department, status, reportsToEmail };
    return { next: audit({ ...store, employees: copy }, session.email, `Updated employee ${copy[idx].email}`), result: ok() };
  });
  if ("error" in result) return result;
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const result = await mutateStore<ActionResult>((store) => {
    const victim = store.employees.find((e) => e.id === id);
    if (!victim) return { next: store, result: { error: "Not found." } };
    return { next: audit({ ...store, employees: store.employees.filter((e) => e.id !== id) }, session.email, `Deleted employee ${victim.email}`), result: ok() };
  });
  if ("error" in result) return result;
  revalidatePath("/employees");
  return ok();
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  if (!["employee", "manager", "hr_admin", "ceo"].includes(session.role)) return { error: "Role not allowed." };
  const kind = String(formData.get("kind") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  const end = String(formData.get("end") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!kind || !start || !end) return { error: "Fill required fields." };
  if (kind.toLowerCase().includes("annual")) {
    const a = new Date(start);
    const b = new Date(end);
    const days = Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000)) + 1;
    if (days > 15) return { error: "Annual leave exceeds configured 12-15 day policy window." };
  }

  await mutateStore((store) => {
    const requester = store.employees.find((e) => e.email.toLowerCase() === session.email.toLowerCase());
    const isDirectCeoReport = !!requester?.reportsToEmail && requester.reportsToEmail.toLowerCase() === "ceo@kastros.demo";
    const status: LeaveStatus = isDirectCeoReport || session.role === "ceo" ? "PendingCEO" : "PendingHR";
    const next: HrStore = {
      ...store,
      leaveRequests: [
        {
          id: `lv-${randomUUID()}`,
          requesterEmail: session.email,
          kind,
          start,
          end,
          status,
          decidedByEmail: null,
          hrDecisionByEmail: null,
          ceoDecisionByEmail: null,
          note,
        },
        ...store.leaveRequests,
      ],
    };
    return { next: audit(next, session.email, `Requested leave (${kind})`), result: ok() };
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return ok();
}

export async function decideLeaveRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "") as "Approved" | "Denied";
  if (!id || !["Approved", "Denied"].includes(decision)) return { error: "Invalid request." };
  const store = await readStore();
  const req = store.leaveRequests.find((r) => r.id === id);
  if (!req) return { error: "Not found." };

  await mutateStore((s) => {
    const nextReq: HrStore["leaveRequests"] = s.leaveRequests.map((r) => {
      if (r.id !== id) return r;
      if (r.status === "PendingHR") {
        if (!["hr_admin", "manager"].includes(session.role) || !canDecideLeave(store, session, r.requesterEmail)) return r;
        if (decision === "Denied") return { ...r, status: "Denied" as LeaveStatus, decidedByEmail: session.email, hrDecisionByEmail: session.email };
        return { ...r, status: "PendingCEO", hrDecisionByEmail: session.email, decidedByEmail: session.email };
      }
      if (r.status === "PendingCEO") {
        if (session.role !== "ceo") return r;
        return { ...r, status: decision as LeaveStatus, ceoDecisionByEmail: session.email, decidedByEmail: session.email };
      }
      return r;
    });
    const changed = nextReq.find((r) => r.id === id);
    if (!changed || changed.status === req.status) return { next: s, result: { error: "You do not have permission for this step." } };
    return { next: audit({ ...s, leaveRequests: nextReq }, session.email, `${decision} leave ${id}`), result: ok() };
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return ok();
}

export async function addAcademicRecord(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "recruiter"].includes(session.role)) return { error: "Forbidden." };
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  const type = String(formData.get("type") ?? "Degree");
  const title = String(formData.get("title") ?? "").trim();
  const institute = String(formData.get("institute") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!employeeEmail || !title || !institute) return { error: "Missing fields." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        academics: [
          ...store.academics,
          {
            id: `ac-${randomUUID()}`,
            employeeEmail,
            type: type === "Certification" ? "Certification" : "Degree",
            title,
            institute,
            year,
            attachmentName,
          },
        ],
      },
      session.email,
      `Added ${type} record for ${employeeEmail}`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function addTrainingRow(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR can assign training." };
  const assigneeEmail = String(formData.get("assigneeEmail") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const provider = String(formData.get("provider") ?? "Internal") === "External" ? "External" : "Internal";
  const providerName = String(formData.get("providerName") ?? "").trim() || (provider === "Internal" ? "Kastros HR" : "External");
  const due = String(formData.get("due") ?? "").trim();
  const pptx = String(formData.get("trainingMaterialPptx") ?? "").trim() || null;
  if (!assigneeEmail || !name || !due) return { error: "Fill required fields." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        training: [
          {
            id: `tr-${randomUUID()}`,
            assigneeEmail,
            name,
            provider,
            providerName,
            trainingMaterialPptx: pptx,
            attendanceMarked: false,
            due,
            status: "Required",
          },
          ...store.training,
        ],
      },
      session.email,
      `Assigned training "${name}"`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function setTrainingStatus(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "Required" | "Done";
  if (!id || !["Required", "Done"].includes(status)) return { error: "Invalid." };
  const store = await readStore();
  const row = store.training.find((t) => t.id === id);
  if (!row) return { error: "Not found." };
  const self = row.assigneeEmail.toLowerCase() === session.email.toLowerCase();
  const hr = session.role === "hr_admin";
  const mgr = session.role === "manager" && managerMayTouchTraining(store, session, row.assigneeEmail);
  if (!hr && !self && !mgr) return { error: "Forbidden." };
  await mutateStore((s) => ({
    next: audit(
      { ...s, training: s.training.map((t) => (t.id === id ? { ...t, status, attendanceMarked: status === "Done" ? true : t.attendanceMarked } : t)) },
      session.email,
      `Training ${id} -> ${status}`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function markTrainingAttendance(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR can mark attendance." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  await mutateStore((s) => ({
    next: audit({ ...s, training: s.training.map((t) => (t.id === id ? { ...t, attendanceMarked: true } : t)) }, session.email, `Marked attendance ${id}`),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function createJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "recruiter"].includes(session.role)) return { error: "Forbidden." };
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim() || "Applied";
  const applicantCount = Number(formData.get("applicantCount") ?? "0");
  if (!title || !location) return { error: "Fill required fields." };
  await mutateStore((store) => ({
    next: audit({ ...store, jobs: [{ id: `job-${randomUUID()}`, title, location, stage, applicantCount: Number.isFinite(applicantCount) ? applicantCount : 0 }, ...store.jobs] }, session.email, `Created job ${title}`),
    result: ok(),
  }));
  revalidatePath("/recruiting");
  return ok();
}

export async function bumpApplicants(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "recruiter"].includes(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? "0");
  if (!id || !Number.isFinite(delta)) return { error: "Invalid." };
  await mutateStore((store) => ({
    next: audit({ ...store, jobs: store.jobs.map((j) => (j.id === id ? { ...j, applicantCount: Math.max(0, j.applicantCount + delta) } : j)) }, session.email, `Adjusted applicants for ${id}`),
    result: ok(),
  }));
  revalidatePath("/recruiting");
  return ok();
}

export async function deleteJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "recruiter"].includes(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, jobs: store.jobs.filter((j) => j.id !== id) }, session.email, `Deleted job ${id}`),
    result: ok(),
  }));
  revalidatePath("/recruiting");
  return ok();
}

export async function addDocument(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "recruiter"].includes(session.role)) return { error: "Forbidden." };
  const name = String(formData.get("name") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const sensitivity = String(formData.get("sensitivity") ?? "").trim() || "Internal";
  if (!name || !owner) return { error: "Fill required fields." };
  await mutateStore((store) => ({
    next: audit({ ...store, documents: [{ id: `doc-${randomUUID()}`, name, owner, sensitivity, createdByEmail: session.email }, ...store.documents] }, session.email, `Uploaded document metadata: ${name}`),
    result: ok(),
  }));
  revalidatePath("/documents");
  return ok();
}

export async function deleteDocument(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR admins can delete documents." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  await mutateStore((store) => ({
    next: audit({ ...store, documents: store.documents.filter((d) => d.id !== id) }, session.email, `Deleted document ${id}`),
    result: ok(),
  }));
  revalidatePath("/documents");
  return ok();
}

export async function acknowledgePolicy(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return { error: "Missing policy." };
  await mutateStore((store) => {
    const exists = store.policyAcknowledgements.some((a) => a.policyId === policyId && a.employeeEmail.toLowerCase() === session.email.toLowerCase());
    if (exists) return { next: store, result: ok() };
    return {
      next: audit(
        {
          ...store,
          policyAcknowledgements: [
            { id: `ack-${randomUUID()}`, policyId, employeeEmail: session.email, acknowledgedAt: new Date().toISOString() },
            ...store.policyAcknowledgements,
          ],
        },
        session.email,
        `Acknowledged policy ${policyId}`,
      ),
      result: ok(),
    };
  });
  revalidatePath("/documents");
  return ok();
}

export async function createCase(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "ceo"].includes(session.role)) return { error: "Only HR and CEO can open cases." };
  const topic = String(formData.get("topic") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "Other");
  const type = typeRaw === "Conflict of Interest" || typeRaw === "Code of Conduct" ? typeRaw : "Other";
  if (!topic) return { error: "Enter a topic." };
  const refNum = Math.floor(1000 + Math.random() * 9000);
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        cases: [{ id: `case-${randomUUID()}`, reference: `CASE-${refNum}`, topic, status: "Open", opened: new Date().toISOString().slice(0, 10), openedByEmail: session.email, type, restrictedTo: ["hr_admin", "ceo"] }, ...store.cases],
      },
      session.email,
      `Opened case ${topic}`,
    ),
    result: ok(),
  }));
  revalidatePath("/cases");
  return ok();
}

export async function updateCaseStatus(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "ceo"].includes(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !status) return { error: "Invalid." };
  await mutateStore((store) => ({
    next: audit({ ...store, cases: store.cases.map((c) => (c.id === id ? { ...c, status } : c)) }, session.email, `Case ${id} -> ${status}`),
    result: ok(),
  }));
  revalidatePath("/cases");
  return ok();
}

export async function upsertGoal(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "").trim() || "H1 2026";
  const progressPct = Math.min(100, Math.max(0, Number(formData.get("progressPct") ?? "0")));
  const ownerEmailRaw = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  if (!title) return { error: "Title required." };
  const store = await readStore();
  let ownerEmail = ownerEmailRaw || session.email.toLowerCase();
  if (session.role === "manager" && ownerEmail !== session.email.toLowerCase() && !isDirectReport(store, session.email, ownerEmail)) {
    return { error: "Managers can only manage their direct reports." };
  }
  if (!["manager", "hr_admin"].includes(session.role) && ownerEmail !== session.email.toLowerCase()) return { error: "Forbidden." };
  if (id) {
    await mutateStore((s) => ({
      next: audit({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, title, cycle, progressPct, ownerEmail } : g)) }, session.email, `Updated goal ${id}`),
      result: ok(),
    }));
  } else {
    await mutateStore((s) => ({
      next: audit({ ...s, goals: [{ id: `g-${randomUUID()}`, ownerEmail, title, progressPct, cycle }, ...s.goals] }, session.email, `Created goal for ${ownerEmail}`),
      result: ok(),
    }));
  }
  revalidatePath("/performance");
  return ok();
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  await mutateStore((s) => ({
    next: audit({ ...s, goals: s.goals.filter((x) => x.id !== id) }, session.email, `Deleted goal ${id}`),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function addPerformanceReview(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["manager", "hr_admin"].includes(session.role)) return { error: "Only manager/HR can add review records." };
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  const department = String(formData.get("department") ?? "").trim();
  const criteriaType = String(formData.get("criteriaType") ?? "Technical");
  const grade = String(formData.get("grade") ?? "C");
  const comments = String(formData.get("comments") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "H1 2026").trim();
  if (!employeeEmail || !department) return { error: "Missing fields." };
  const store = await readStore();
  if (session.role === "manager" && !isDirectReport(store, session.email, employeeEmail)) return { error: "Managers can review direct reports only." };
  await mutateStore((s) => ({
    next: audit(
      {
        ...s,
        reviews: [
          {
            id: `rev-${randomUUID()}`,
            employeeEmail,
            managerEmail: session.role === "manager" ? session.email : String(formData.get("managerEmail") ?? "").trim().toLowerCase() || session.email,
            department,
            criteriaType: criteriaType === "Leadership" || criteriaType === "Operations" ? criteriaType : "Technical",
            grade: grade === "A" || grade === "B" || grade === "C" || grade === "D" ? grade : "C",
            comments,
            cycle,
          },
          ...s.reviews,
        ],
      },
      session.email,
      `Added performance review for ${employeeEmail}`,
    ),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function upsertPayrollEntry(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "payroll"].includes(session.role)) return { error: "Forbidden." };
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  const month = String(formData.get("month") ?? "").trim();
  const baseSalary = Number(formData.get("baseSalary") ?? "0");
  const hoursWorked = Number(formData.get("hoursWorked") ?? "0");
  const hourlyRate = Number(formData.get("hourlyRate") ?? "0");
  const allowanceTypes = formData.getAll("allowanceType").map((v) => String(v));
  const allowanceAmounts = formData.getAll("allowanceAmount").map((v) => Number(v));
  if (!employeeEmail || !month) return { error: "Missing employee/month." };
  if (!Number.isFinite(baseSalary) || !Number.isFinite(hoursWorked) || !Number.isFinite(hourlyRate)) return { error: "Invalid numeric fields." };
  const allowances = allowanceTypes
    .map((type, i) => ({ type, amount: allowanceAmounts[i] ?? 0 }))
    .filter((x) => Number.isFinite(x.amount) && x.amount > 0)
    .map((x) => ({ type: (["Fuel", "Transport", "SIM/Mobile", "Laptop", "Other"].includes(x.type) ? x.type : "Other") as PayrollAllowanceType, amount: x.amount }));
  const grossPay = hoursWorked * hourlyRate + allowances.reduce((s, a) => s + a.amount, 0);

  await mutateStore((s) => {
    const existing = s.payrollEntries.find((p) => p.employeeEmail === employeeEmail && p.month === month);
    const nextEntries = existing
      ? s.payrollEntries.map((p) => (p.id === existing.id ? { ...p, baseSalary, hoursWorked, hourlyRate, allowances, grossPay } : p))
      : [{ id: `pay-${randomUUID()}`, employeeEmail, month, baseSalary, allowances, hoursWorked, hourlyRate, grossPay }, ...s.payrollEntries];
    return { next: audit({ ...s, payrollEntries: nextEntries }, session.email, `Upsert payroll entry ${employeeEmail} ${month}`), result: ok() };
  });
  revalidatePath("/payroll");
  return ok();
}

export async function updatePayrollSnapshot(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "payroll"].includes(session.role)) return { error: "Forbidden." };
  const month = String(formData.get("month") ?? "").trim();
  const employeesPaid = Number(formData.get("employeesPaid") ?? "0");
  const exceptions = Number(formData.get("exceptions") ?? "0");
  const note = String(formData.get("note") ?? "").trim();
  if (!month) return { error: "Month required." };
  await mutateStore((store) => ({
    next: audit(
      { ...store, payroll: { month, employeesPaid: Number.isFinite(employeesPaid) ? employeesPaid : store.payroll.employeesPaid, exceptions: Number.isFinite(exceptions) ? exceptions : store.payroll.exceptions, note: note || store.payroll.note } },
      session.email,
      "Updated payroll snapshot",
    ),
    result: ok(),
  }));
  revalidatePath("/payroll");
  return ok();
}
