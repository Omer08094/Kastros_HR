import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cache } from "react";
import type {
  AcademicRecord,
  DocumentRow,
  Employee,
  Goal,
  HrCase,
  HrStore,
  JobApplication,
  JobPosting,
  LeaveRequest,
  PayrollEntry,
  PerformanceReview,
  PolicyAcknowledgement,
  TrainingRow,
} from "@/lib/store/types";
import { payrollGrossPay } from "@/lib/store/payroll";
import { createInitialStore } from "@/lib/store/seed";

const storePath = () => join(process.cwd(), "data", "kastros-hr-demo.json");

/** Defaults for any top-level keys omitted from disk JSON (partial backups won't crash pages). */
const STORE_FALLBACK = createInitialStore();

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => {},
    () => {},
  );
  return next;
}

function normalizeJobApplication(raw: JobApplication): JobApplication {
  const reviewStatus = raw.reviewStatus === "approved" ? "approved" : "submitted";
  const emp = raw.employmentType;
  const employmentType =
    emp && ["Permanent", "Temporary", "Contractual", "Intern"].includes(emp) ? emp : null;
  const pm =
    typeof raw.intakeProbationMonths === "number" && Number.isFinite(raw.intakeProbationMonths)
      ? raw.intakeProbationMonths
      : null;
  const fl = raw.familyLinked === true ? true : raw.familyLinked === false ? false : null;

  return {
    ...raw,
    reviewStatus,
    linkedIn: raw.linkedIn ?? null,
    currentCompany: raw.currentCompany ?? null,
    yearsExperience: raw.yearsExperience ?? null,
    salaryExpectation: raw.salaryExpectation ?? null,
    noticePeriod: raw.noticePeriod ?? null,
    coverLetter: raw.coverLetter ?? null,
    cvStoredRef: raw.cvStoredRef ?? null,
    cvOriginalName: raw.cvOriginalName ?? null,
    fatherName: raw.fatherName ?? null,
    roleTitle: raw.roleTitle ?? null,
    intakeDepartment: raw.intakeDepartment ?? null,
    intakeLocation: raw.intakeLocation ?? null,
    employmentType,
    intakeJoiningDate: raw.intakeJoiningDate ?? null,
    intakeProbationMonths: pm,
    companyPhone: raw.companyPhone ?? null,
    emergencyContactName: raw.emergencyContactName ?? null,
    emergencyContactRelation: raw.emergencyContactRelation ?? null,
    emergencyContactPhone: raw.emergencyContactPhone ?? null,
    familyRelationName: raw.familyRelationName ?? null,
    familyRelationType: raw.familyRelationType ?? null,
    familyRelationFirm: raw.familyRelationFirm ?? null,
    familyLinked: fl,
    reportsToEmail: raw.reportsToEmail ?? null,
    eduTitle: raw.eduTitle ?? null,
    eduInstitute: raw.eduInstitute ?? null,
    eduYear: raw.eduYear ?? null,
    eduStoredRef: raw.eduStoredRef ?? null,
    eduAttachmentName: raw.eduAttachmentName ?? null,
    certTitle: raw.certTitle ?? null,
    certIssuer: raw.certIssuer ?? null,
    certYear: raw.certYear ?? null,
    certStoredRef: raw.certStoredRef ?? null,
    certAttachmentName: raw.certAttachmentName ?? null,
  };
}

function normalizeStore(parsed: unknown): HrStore {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<HrStore>;
  const fb = STORE_FALLBACK;

  const employees = Array.isArray(p.employees)
    ? p.employees.filter((e): e is Employee => isPlainObject(e) && typeof e.email === "string")
    : fb.employees;

  const jobApplications = (Array.isArray(p.jobApplications) ? p.jobApplications : [])
    .filter((a): a is JobApplication => isPlainObject(a))
    .map((a) => normalizeJobApplication(a));

  const jobs = (Array.isArray(p.jobs) ? p.jobs : [])
    .filter((j): j is JobPosting => isPlainObject(j) && typeof j.id === "string")
    .map((j) => {
      const countFromApps = jobApplications.filter((a) => a.jobId === j.id).length;
      return {
        ...j,
        description: j.description ?? null,
        applicantCount: countFromApps > 0 ? countFromApps : j.applicantCount ?? 0,
      };
    });

  const leaveRequests = Array.isArray(p.leaveRequests)
    ? p.leaveRequests.filter(
        (r): r is LeaveRequest => isPlainObject(r) && typeof r.requesterEmail === "string",
      )
    : fb.leaveRequests;

  const training = Array.isArray(p.training)
    ? p.training
        .filter((t): t is TrainingRow => isPlainObject(t) && typeof t.assigneeEmail === "string")
        .map((raw) => {
          const t = raw as TrainingRow & { attendanceMarked?: boolean };
          const legacyAttended =
            Array.isArray(t.attendedEmails) &&
            (t.attendedEmails as unknown[]).every((x): x is string => typeof x === "string")
              ? (t.attendedEmails as string[]).map((e) => e.toLowerCase())
              : [];
          const attendedEmails =
            legacyAttended.length > 0
              ? legacyAttended
              : t.attendanceMarked === true
                ? [t.assigneeEmail.toLowerCase()]
                : [];
          return {
            id: t.id,
            assigneeEmail: t.assigneeEmail,
            name: t.name,
            provider: t.provider,
            providerName: t.providerName,
            trainingMaterialPptx: t.trainingMaterialPptx ?? null,
            trainingMaterialStoredRef: t.trainingMaterialStoredRef ?? null,
            trainingMaterialOriginalName: t.trainingMaterialOriginalName ?? null,
            attendedEmails,
            due: t.due,
            status: t.status,
          };
        })
    : fb.training;

  const goals = Array.isArray(p.goals)
    ? p.goals.filter((g): g is Goal => isPlainObject(g) && typeof g.ownerEmail === "string")
    : fb.goals;

  const policyAcknowledgements = Array.isArray(p.policyAcknowledgements)
    ? p.policyAcknowledgements.filter(
        (a): a is PolicyAcknowledgement =>
          isPlainObject(a) && typeof a.employeeEmail === "string" && typeof a.policyId === "string",
      )
    : fb.policyAcknowledgements;

  const reviews = Array.isArray(p.reviews)
    ? p.reviews.filter(
        (r): r is PerformanceReview => isPlainObject(r) && typeof r.employeeEmail === "string",
      )
    : fb.reviews;

  const payrollEntries = Array.isArray(p.payrollEntries)
    ? p.payrollEntries
        .filter((e): e is PayrollEntry => isPlainObject(e) && typeof e.employeeEmail === "string")
        .map((e) => ({ ...e, grossPay: payrollGrossPay(e) }))
    : fb.payrollEntries;

  const cases = Array.isArray(p.cases)
    ? p.cases.filter((c): c is HrCase => isPlainObject(c) && typeof c.status === "string")
    : fb.cases;

  return {
    employees,
    leaveRequests,
    jobs,
    jobApplications,
    training,
    academics: (Array.isArray(p.academics) ? p.academics : [])
      .filter((a): a is AcademicRecord => isPlainObject(a) && typeof a.employeeEmail === "string")
      .map((a) => ({
        ...a,
        storedRef: a.storedRef ?? null,
      })),
    documents: (Array.isArray(p.documents) ? p.documents : [])
      .filter((d): d is DocumentRow => isPlainObject(d) && typeof d.id === "string")
      .map((d) => ({
        ...d,
        employeeEmail: d.employeeEmail ?? null,
        storedRef: d.storedRef ?? null,
      })),
    policies: Array.isArray(p.policies) ? p.policies : fb.policies,
    policyAcknowledgements,
    cases,
    goals,
    reviews,
    payroll:
      p.payroll && typeof p.payroll === "object" && !Array.isArray(p.payroll)
        ? { ...fb.payroll, ...(p.payroll as Record<string, unknown>) }
        : fb.payroll,
    payrollEntries,
    audit: Array.isArray(p.audit) ? p.audit : fb.audit,
  };
}

async function readStoreOnce(): Promise<HrStore> {
  const path = storePath();
  try {
    const raw = await readFile(path, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("[kastros-hr] Invalid JSON in data/kastros-hr-demo.json — fix or replace the file.", e);
      return STORE_FALLBACK;
    }
    try {
      return normalizeStore(parsed);
    } catch (e) {
      console.error("[kastros-hr] Failed to normalize store (check for unusual row shapes).", e);
      return STORE_FALLBACK;
    }
  } catch {
    const initial = createInitialStore();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

/** One disk read per request when metadata + page (or parallel RSC calls) both need the store. */
export const readStore = cache(readStoreOnce);

export async function writeStore(store: HrStore): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function mutateStore<T>(fn: (store: HrStore) => { next: HrStore; result: T }): Promise<T> {
  return enqueue(async () => {
    const current = await readStoreOnce();
    const { next, result } = fn(structuredClone(current));
    await writeStore(next);
    return result;
  });
}
