import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { cache } from "react";
import { firestore } from "@/lib/firebase-admin";
import type {
  AcademicRecord,
  BonusRecord,
  BusinessUnit,
  BusinessUnitRecord,
  CoiSubmission,
  ConflictOfInterestDoc,
  DepartmentRecord,
  DocumentRow,
  EducationEntry,
  Employee,
  EmployeeLetter,
  ExpenseClaim,
  Gender,
  Goal,
  HrCase,
  HrStore,
  JobApplication,
  JobDescription,
  JobPosting,
  EmployeeLeaveAllocation,
  LeaveCategory,
  LeaveRequest,
  MaritalStatus,
  OvertimeRecord,
  PayrollEntry,
  PerformanceReview,
  PolicyAcknowledgement,
  Salutation,
  StatutoryEntry,
  SubDepartmentRecord,
  TrainingRow,
  TransferRecord,
} from "@/lib/store/types";
import {
  BUSINESS_UNITS,
  currencyForBusinessUnit,
  CURRENCIES,
} from "@/lib/store/types";
import { payrollGrossPay, payrollNetPay } from "@/lib/store/payroll";
import { createInitialStore, DEFAULT_LEAVE_CATEGORIES } from "@/lib/store/seed";

const storePath = () => join(process.cwd(), "data", "kastros-hr-demo.json");

const STORE_FALLBACK = createInitialStore();

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function normalizeBusinessUnit(v: unknown): BusinessUnit | null {
  return typeof v === "string" && (BUSINESS_UNITS as readonly string[]).includes(v)
    ? (v as BusinessUnit)
    : null;
}

function normalizeCurrency(v: unknown, fallback: BusinessUnit | null = null): "AED" | "PKR" | "USD" {
  if (typeof v === "string" && (CURRENCIES as readonly string[]).includes(v)) {
    return v as "AED" | "PKR" | "USD";
  }
  return currencyForBusinessUnit(fallback);
}

function normalizeGender(v: unknown): Gender | null {
  if (typeof v !== "string") return null;
  return ["Male", "Female", "Other", "Prefer not to say"].includes(v) ? (v as Gender) : null;
}

function normalizeMarital(v: unknown): MaritalStatus | null {
  if (typeof v !== "string") return null;
  return ["Single", "Married", "Divorced", "Widowed"].includes(v) ? (v as MaritalStatus) : null;
}

function normalizeSalutation(v: unknown): Salutation | null {
  const opts = ["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Prof."];
  return typeof v === "string" && opts.includes(v) ? (v as Salutation) : null;
}

function normalizeEducation(v: unknown): EducationEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter((e) => isPlainObject(e) && typeof (e as { degree?: unknown }).degree === "string") as EducationEntry[];
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
    emp && ["Permanent", "Temporary", "Contractual", "Intern", "Trainee"].includes(emp) ? emp : null;
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

function normalizeEmployee(raw: Record<string, unknown>): Employee {
  const base = raw as unknown as Partial<Employee>;
  const emergencyContacts = Array.isArray(raw.emergencyContacts)
    ? (raw.emergencyContacts as Employee["emergencyContacts"])
    : [];
  const familyRelations = Array.isArray(raw.familyRelations)
    ? (raw.familyRelations as Employee["familyRelations"])
    : [];
  const firebaseUid =
    typeof raw.firebaseUid === "string" && raw.firebaseUid.trim() ? raw.firebaseUid.trim() : undefined;
  const department =
    typeof raw.department === "string" && raw.department.trim()
      ? raw.department.trim()
      : typeof base.department === "string" && base.department.trim()
        ? base.department.trim()
        : "General";

  const etRaw = raw.employmentType;
  const employmentType =
    etRaw && ["Permanent", "Temporary", "Contractual", "Intern", "Trainee"].includes(String(etRaw))
      ? (etRaw as Employee["employmentType"])
      : "Permanent";

  const photoStoredRef =
    typeof raw.photoStoredRef === "string" && /^[0-9a-f-]{36}$/i.test(raw.photoStoredRef.trim())
      ? raw.photoStoredRef.trim().toLowerCase()
      : base.photoStoredRef ?? null;

  const licences = Array.isArray(raw.licences)
    ? (raw.licences as Employee["licences"]).filter((l) => l && typeof (l as { id?: unknown }).id === "string")
    : [];

  return {
    id: typeof raw.id === "string" ? raw.id : `emp-${Math.random().toString(36).slice(2)}`,
    employeeIdDisplay: strOrNull(raw.employeeIdDisplay) ?? null,
    salutation: normalizeSalutation(raw.salutation),
    name: typeof raw.name === "string" ? raw.name : "",
    fatherName: typeof raw.fatherName === "string" ? raw.fatherName : "",
    email: typeof raw.email === "string" ? raw.email : "",
    gender: normalizeGender(raw.gender),
    dateOfBirth: strOrNull(raw.dateOfBirth),
    nationality: strOrNull(raw.nationality),
    secondNationality: strOrNull(raw.secondNationality),
    maritalStatus: normalizeMarital(raw.maritalStatus),
    religion: strOrNull(raw.religion),
    cnic: strOrNull(raw.cnic),
    cnicExpiry: strOrNull(raw.cnicExpiry),
    address: strOrNull(raw.address),
    title: typeof raw.title === "string" ? raw.title : "",
    designationNumber: strOrNull(raw.designationNumber),
    officialNumber: strOrNull(raw.officialNumber),
    location: typeof raw.location === "string" ? raw.location : "",
    businessUnit: normalizeBusinessUnit(raw.businessUnit),
    status: ["Active", "On leave", "Offboarding", "Separated"].includes(String(raw.status))
      ? (raw.status as Employee["status"])
      : "Active",
    department,
    subDepartment: strOrNull(raw.subDepartment),
    employmentType,
    joiningDate: typeof raw.joiningDate === "string" ? raw.joiningDate : "",
    probationMonths: numOrNull(raw.probationMonths) ?? 3,
    probationCompletionDate: typeof raw.probationCompletionDate === "string" ? raw.probationCompletionDate : "",
    dutyHours: numOrNull(raw.dutyHours),
    dutyDays: numOrNull(raw.dutyDays),
    companyPhone: typeof raw.companyPhone === "string" ? raw.companyPhone : "",
    personalPhone: typeof raw.personalPhone === "string" ? raw.personalPhone : "",
    emergencyContacts,
    familyRelations,
    reportsToEmail:
      typeof raw.reportsToEmail === "string" || raw.reportsToEmail === null
        ? (raw.reportsToEmail as string | null)
        : base.reportsToEmail ?? null,
    hasCompanyVehicle: boolOr(raw.hasCompanyVehicle, false),
    vehicleNumber: strOrNull(raw.vehicleNumber),
    drivingLicenceNumber: strOrNull(raw.drivingLicenceNumber),
    drivingLicenceExpiry: strOrNull(raw.drivingLicenceExpiry),
    licences,
    education: normalizeEducation(raw.education),
    hasGratuity: boolOr(raw.hasGratuity, false),
    hasEobi: boolOr(raw.hasEobi, false),
    hasProvidentFund: boolOr(raw.hasProvidentFund, false),
    firebaseUid,
    photoStoredRef,
  };
}

function normalizePayrollEntry(raw: Record<string, unknown>): PayrollEntry {
  const bu = normalizeBusinessUnit(raw.businessUnit);
  const allowances = Array.isArray(raw.allowances)
    ? (raw.allowances as PayrollEntry["allowances"]).filter((a) => a && typeof a === "object")
    : [];
  const deductions = Array.isArray(raw.deductions)
    ? (raw.deductions as PayrollEntry["deductions"]).filter((d) => d && typeof d === "object")
    : [];
  const base = {
    id: String(raw.id ?? `pay-${Math.random().toString(36).slice(2)}`),
    employeeEmail: String(raw.employeeEmail ?? ""),
    month: String(raw.month ?? ""),
    baseSalary: numOrNull(raw.baseSalary) ?? 0,
    allowances,
    deductions,
    hoursWorked: numOrNull(raw.hoursWorked) ?? 0,
    hourlyRate: numOrNull(raw.hourlyRate) ?? 0,
    overtimeHours: numOrNull(raw.overtimeHours) ?? 0,
    overtimeRate: numOrNull(raw.overtimeRate) ?? 0,
    bonus: numOrNull(raw.bonus) ?? 0,
    currency: normalizeCurrency(raw.currency, bu),
    businessUnit: bu,
  };
  const grossPay = payrollGrossPay(base);
  const netPay = payrollNetPay({ grossPay, deductions });
  return { ...base, grossPay, netPay };
}

function normalizeArray<T>(value: unknown, predicate: (x: unknown) => boolean): T[] {
  return Array.isArray(value) ? (value.filter(predicate) as T[]) : [];
}

function normalizeStore(parsed: unknown): HrStore {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<HrStore>;
  const fb = STORE_FALLBACK;

  const employees = Array.isArray(p.employees)
    ? p.employees
        .filter((e) => isPlainObject(e) && typeof (e as { email?: unknown }).email === "string")
        .map((e) => normalizeEmployee(e as Record<string, unknown>))
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
    ? p.leaveRequests
        .filter((r): r is LeaveRequest => isPlainObject(r) && typeof r.requesterEmail === "string")
        .map((r) => ({
          ...r,
          categoryId: typeof r.categoryId === "string" ? r.categoryId : null,
        }))
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
        .map((e) => normalizePayrollEntry(e as Record<string, unknown>))
    : fb.payrollEntries;

  const cases = Array.isArray(p.cases)
    ? p.cases.filter((c): c is HrCase => isPlainObject(c) && typeof c.status === "string")
    : fb.cases;

  const isObjWithId = (v: unknown) => isPlainObject(v) && typeof (v as { id?: unknown }).id === "string";

  const businessUnits =
    Array.isArray(p.businessUnits) && p.businessUnits.length > 0
      ? (p.businessUnits.filter(isObjWithId) as BusinessUnitRecord[]).map((b) => ({
          id: b.id,
          name: (BUSINESS_UNITS as readonly string[]).includes(b.name) ? b.name : "Karachi",
          notes: b.notes ?? null,
        }))
      : fb.businessUnits;

  const leaveCategories =
    Array.isArray(p.leaveCategories) && p.leaveCategories.length > 0
      ? normalizeArray<LeaveCategory>(p.leaveCategories, isObjWithId).map((c) => ({
          ...c,
          name: typeof c.name === "string" ? c.name.trim() : "Leave",
          defaultDaysPerYear: Math.max(0, numOrNull(c.defaultDaysPerYear) ?? 0),
          isActive: c.isActive !== false,
          sortOrder: numOrNull(c.sortOrder) ?? 0,
        }))
      : DEFAULT_LEAVE_CATEGORIES;

  const employeeLeaveAllocations = normalizeArray<EmployeeLeaveAllocation>(
    p.employeeLeaveAllocations,
    isObjWithId,
  ).map((a) => ({
    ...a,
    year: numOrNull(a.year) ?? new Date().getFullYear(),
    allocatedDays: Math.max(0, numOrNull(a.allocatedDays) ?? 0),
  }));

  return {
    employees,
    leaveCategories,
    employeeLeaveAllocations,
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
    policies: Array.isArray(p.policies) && p.policies.length > 0 ? p.policies : fb.policies,
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
    businessUnits,
    departments: normalizeArray<DepartmentRecord>(p.departments, isObjWithId),
    subDepartments: normalizeArray<SubDepartmentRecord>(p.subDepartments, isObjWithId),
    jobDescriptions: normalizeArray<JobDescription>(p.jobDescriptions, isObjWithId).map((j) => ({
      id: j.id,
      designationNumber: typeof j.designationNumber === "string" ? j.designationNumber : "",
      title: typeof j.title === "string" ? j.title : "",
      departmentId: j.departmentId ?? null,
      summary: typeof j.summary === "string" ? j.summary : "",
      responsibilities: typeof j.responsibilities === "string" ? j.responsibilities : "",
      requirements: typeof j.requirements === "string" ? j.requirements : "",
      attachmentRef: j.attachmentRef ?? null,
      attachmentName: j.attachmentName ?? null,
    })),
    bonuses: normalizeArray<BonusRecord>(p.bonuses, isObjWithId),
    overtime: normalizeArray<OvertimeRecord>(p.overtime, isObjWithId),
    expenses: normalizeArray<ExpenseClaim>(p.expenses, isObjWithId),
    statutory: normalizeArray<StatutoryEntry>(p.statutory, isObjWithId),
    transfers: normalizeArray<TransferRecord>(p.transfers, isObjWithId).map((t) => ({
      ...t,
      tillDate: t.tillDate ?? null,
    })),
    letters: normalizeArray<EmployeeLetter>(p.letters, isObjWithId).map((l) => ({
      ...l,
      terminationReason: (l as EmployeeLetter).terminationReason ?? null,
      terminationLastWorkingDate: (l as EmployeeLetter).terminationLastWorkingDate ?? null,
      terminationSettlementNotes: (l as EmployeeLetter).terminationSettlementNotes ?? null,
    })),
    coiDocs: normalizeArray<ConflictOfInterestDoc>(p.coiDocs, isObjWithId),
    coiSubmissions: normalizeArray<CoiSubmission>(p.coiSubmissions, isObjWithId),
  };
}

async function readStoreOnce(): Promise<HrStore> {
  if (firestore) {
    try {
      const docSnap = await firestore.collection("kastros-hr").doc("store").get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && data.store) {
          try {
            return normalizeStore(data.store);
          } catch (e) {
            console.error("[kastros-hr] Failed to normalize store from Firestore.", e);
            return STORE_FALLBACK;
          }
        }
      } else {
        // First boot — write an empty store to Firestore and return it.
        const initial = createInitialStore();
        await firestore.collection("kastros-hr").doc("store").set({ store: cloneStoreForFirestore(initial) });
        return initial;
      }
    } catch (e) {
      console.error("[kastros-hr] Firestore read failed, falling back to local file.", e);
    }
  }

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

/** Firestore rejects `undefined` in any field; JSON serialization drops undefined keys (legacy rows, optional fields). */
function cloneStoreForFirestore(store: HrStore): HrStore {
  return JSON.parse(JSON.stringify(store)) as HrStore;
}

export async function writeStore(store: HrStore): Promise<void> {
  if (firestore) {
    try {
      await firestore.collection("kastros-hr").doc("store").set({ store: cloneStoreForFirestore(store) });
      return;
    } catch (e) {
      console.error("[kastros-hr] Firestore write failed, falling back to local file.", e);
    }
  }

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
