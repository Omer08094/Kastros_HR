"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createInitialStore } from "@/lib/store/seed";
import { mutateStore, readStore } from "@/lib/store/persist";
import { canDecideLeave, isDirectReport, managerMayTouchTraining } from "@/lib/store/policy";
import type { HrStore, LeaveStatus } from "@/lib/store/types";

type ActionResult = { ok: true } | { error: string };

function audit(store: HrStore, actor: string, action: string): HrStore {
  const row = {
    at: new Date().toISOString(),
    actor,
    action,
    ip: "app",
  };
  return { ...store, audit: [row, ...store.audit].slice(0, 500) };
}

function ok(): ActionResult {
  return { ok: true };
}

export async function resetDemoData(): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR admins can reset demo data." };
  await mutateStore((_store) => ({
    next: audit(createInitialStore(), session.email, "Reset demo dataset"),
    result: undefined as void,
  }));
  revalidatePath("/", "layout");
  return ok();
}

export async function addEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const reportsTo = String(formData.get("reportsToEmail") ?? "").trim().toLowerCase() || null;

  if (!name || !email || !title || !location) return { error: "Fill required fields." };

  const result = await mutateStore<ActionResult>((store) => {
    if (store.employees.some((e) => e.email.toLowerCase() === email)) {
      return { next: store, result: { error: "Email already exists." } };
    }
    const next: HrStore = {
      ...store,
      employees: [
        ...store.employees,
        { id: `emp-${randomUUID()}`, name, email, title, location, status: "Active", reportsToEmail: reportsTo },
      ],
    };
    return { next: audit(next, session.email, `Created employee ${email}`), result: ok() };
  });
  if ("error" in result && result.error) return result;
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return ok();
}

export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const status = String(formData.get("status") ?? "") as "Active" | "On leave" | "Offboarding";
  const reportsToEmailRaw = String(formData.get("reportsToEmail") ?? "").trim();
  const reportsToEmail = reportsToEmailRaw ? reportsToEmailRaw.toLowerCase() : null;

  if (!id || !title || !location) return { error: "Missing fields." };
  if (!["Active", "On leave", "Offboarding"].includes(status)) return { error: "Invalid status." };

  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.employees.findIndex((e) => e.id === id);
    if (idx === -1) return { next: store, result: { error: "Not found." } };
    const copy = structuredClone(store.employees);
    copy[idx] = { ...copy[idx], title, location, status, reportsToEmail };
    const next = { ...store, employees: copy };
    return { next: audit(next, session.email, `Updated employee ${copy[idx].email}`), result: ok() };
  });
  if ("error" in result && result.error) return result;
  revalidatePath("/employees");
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
    const next: HrStore = {
      ...store,
      employees: store.employees.filter((e) => e.id !== id),
    };
    return { next: audit(next, session.email, `Deleted employee ${victim.email}`), result: ok() };
  });
  if ("error" in result && result.error) return result;
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return ok();
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  if (session.role !== "employee" && session.role !== "manager" && session.role !== "hr_admin") {
    return { error: "Your role cannot create leave requests here." };
  }

  const kind = String(formData.get("kind") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  const end = String(formData.get("end") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!kind || !start || !end) return { error: "Fill required fields." };

  await mutateStore((store) => {
    const next: HrStore = {
      ...store,
      leaveRequests: [
        {
          id: `lv-${randomUUID()}`,
          requesterEmail: session.email,
          kind,
          start,
          end,
          status: "Pending",
          decidedByEmail: null,
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
  const decision = String(formData.get("decision") ?? "") as LeaveStatus;
  if (!id || !["Approved", "Denied"].includes(decision)) return { error: "Invalid request." };

  const store = await readStore();
  const req = store.leaveRequests.find((r) => r.id === id);
  if (!req) return { error: "Not found." };
  if (!canDecideLeave(store, session, req.requesterEmail)) return { error: "Forbidden." };

  await mutateStore((s) => {
    const nextReq = s.leaveRequests.map((r) =>
      r.id === id
        ? { ...r, status: decision as LeaveStatus, decidedByEmail: session.email }
        : r,
    );
    const next = { ...s, leaveRequests: nextReq };
    return { next: audit(next, session.email, `${decision} leave ${id}`), result: ok() };
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return ok();
}

export async function createJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "hr_admin" && session.role !== "recruiter")) return { error: "Forbidden." };
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim() || "Applied";
  const applicantCount = Number(formData.get("applicantCount") ?? "0");
  if (!title || !location) return { error: "Fill required fields." };

  await mutateStore((store) => {
    const next: HrStore = {
      ...store,
      jobs: [
        {
          id: `job-${randomUUID()}`,
          title,
          location,
          stage,
          applicantCount: Number.isFinite(applicantCount) ? applicantCount : 0,
        },
        ...store.jobs,
      ],
    };
    return { next: audit(next, session.email, `Created job ${title}`), result: ok() };
  });
  revalidatePath("/recruiting");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "hr_admin" && session.role !== "recruiter")) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };

  await mutateStore((store) => ({
    next: audit(
      { ...store, jobs: store.jobs.filter((j) => j.id !== id) },
      session.email,
      `Deleted job ${id}`,
    ),
    result: ok(),
  }));
  revalidatePath("/recruiting");
  return ok();
}

export async function bumpApplicants(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "hr_admin" && session.role !== "recruiter")) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? "0");
  if (!id || !Number.isFinite(delta)) return { error: "Invalid." };

  await mutateStore((store) => {
    const jobs = store.jobs.map((j) =>
      j.id === id ? { ...j, applicantCount: Math.max(0, j.applicantCount + delta) } : j,
    );
    const next = { ...store, jobs };
    return { next: audit(next, session.email, `Adjusted applicants for ${id}`), result: ok() };
  });
  revalidatePath("/recruiting");
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
      {
        ...s,
        training: s.training.map((t) => (t.id === id ? { ...t, status } : t)),
      },
      session.email,
      `Training ${id} → ${status}`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function addTrainingRow(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR admins can assign training." };
  const assigneeEmail = String(formData.get("assigneeEmail") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const due = String(formData.get("due") ?? "").trim();
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
            due,
            status: "Required",
          },
          ...store.training,
        ],
      },
      session.email,
      `Assigned training "${name}" to ${assigneeEmail}`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function addDocument(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "hr_admin" && session.role !== "recruiter")) return { error: "Forbidden." };
  const name = String(formData.get("name") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const sensitivity = String(formData.get("sensitivity") ?? "").trim() || "Internal";
  if (!name || !owner) return { error: "Fill required fields." };

  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        documents: [
          {
            id: `doc-${randomUUID()}`,
            name,
            owner,
            sensitivity,
            createdByEmail: session.email,
          },
          ...store.documents,
        ],
      },
      session.email,
      `Uploaded document metadata: ${name}`,
    ),
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
    next: audit(
      { ...store, documents: store.documents.filter((d) => d.id !== id) },
      session.email,
      `Deleted document ${id}`,
    ),
    result: ok(),
  }));
  revalidatePath("/documents");
  return ok();
}

export async function createCase(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "hr_admin") return { error: "Only HR admins can open cases." };
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return { error: "Enter a topic." };

  const refNum = Math.floor(1000 + Math.random() * 9000);
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        cases: [
          {
            id: `case-${randomUUID()}`,
            reference: `CASE-${refNum}`,
            topic,
            status: "Open",
            opened: new Date().toISOString().slice(0, 10),
            openedByEmail: session.email,
          },
          ...store.cases,
        ],
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
  if (!session || session.role !== "hr_admin") return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !status) return { error: "Invalid." };

  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        cases: store.cases.map((c) => (c.id === id ? { ...c, status } : c)),
      },
      session.email,
      `Case ${id} → ${status}`,
    ),
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

  if (id) {
    const existing = store.goals.find((g) => g.id === id);
    if (!existing) return { error: "Goal not found." };
    const canEdit =
      session.role === "hr_admin" ||
      existing.ownerEmail.toLowerCase() === session.email.toLowerCase() ||
      (session.role === "manager" && isDirectReport(store, session.email, existing.ownerEmail));
    if (!canEdit) return { error: "Forbidden." };

    let ownerEmail = existing.ownerEmail;
    if (session.role === "hr_admin" && ownerEmailRaw) ownerEmail = ownerEmailRaw;

    await mutateStore((s) => {
      const goals = s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              title,
              cycle,
              progressPct: Number.isFinite(progressPct) ? progressPct : g.progressPct,
              ownerEmail,
            }
          : g,
      );
      return { next: audit({ ...s, goals }, session.email, `Updated goal ${id}`), result: ok() };
    });
    revalidatePath("/performance");
    revalidatePath("/dashboard");
    return ok();
  }

  let ownerEmail = session.email.toLowerCase();
  if (ownerEmailRaw) {
    if (session.role === "hr_admin") {
      ownerEmail = ownerEmailRaw;
    } else if (session.role === "manager" && isDirectReport(store, session.email, ownerEmailRaw)) {
      ownerEmail = ownerEmailRaw;
    } else if (ownerEmailRaw !== session.email.toLowerCase()) {
      return { error: "You can only set goals for yourself or your direct reports." };
    } else {
      ownerEmail = ownerEmailRaw;
    }
  }

  await mutateStore((s) => {
    const goals = [
      {
        id: `g-${randomUUID()}`,
        ownerEmail,
        title,
        progressPct: Number.isFinite(progressPct) ? progressPct : 0,
        cycle,
      },
      ...s.goals,
    ];
    return { next: audit({ ...s, goals }, session.email, `Created goal for ${ownerEmail}`), result: ok() };
  });
  revalidatePath("/performance");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };

  const store = await readStore();
  const g = store.goals.find((x) => x.id === id);
  if (!g) return { error: "Not found." };
  const owner = g.ownerEmail.toLowerCase() === session.email.toLowerCase();
  const hr = session.role === "hr_admin";
  const mgr = session.role === "manager" && isDirectReport(store, session.email, g.ownerEmail);
  if (!owner && !hr && !mgr) return { error: "Forbidden." };

  await mutateStore((s) => ({
    next: audit({ ...s, goals: s.goals.filter((x) => x.id !== id) }, session.email, `Deleted goal ${id}`),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function updatePayrollSnapshot(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "hr_admin" && session.role !== "payroll")) return { error: "Forbidden." };
  const month = String(formData.get("month") ?? "").trim();
  const employeesPaid = Number(formData.get("employeesPaid") ?? "0");
  const exceptions = Number(formData.get("exceptions") ?? "0");
  const note = String(formData.get("note") ?? "").trim();
  if (!month) return { error: "Month required." };

  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        payroll: {
          month,
          employeesPaid: Number.isFinite(employeesPaid) ? employeesPaid : store.payroll.employeesPaid,
          exceptions: Number.isFinite(exceptions) ? exceptions : store.payroll.exceptions,
          note: note || store.payroll.note,
        },
      },
      session.email,
      "Updated payroll snapshot",
    ),
    result: ok(),
  }));
  revalidatePath("/payroll");
  return ok();
}
