import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { cache } from "react";
import { firestore } from "@/lib/firebase-admin";
import type {
  AcademicRecord,
  BonusRecord,
  BloodGroup,
  BusinessUnit,
  BusinessUnitRecord,
  CoiSubmission,
  ConflictOfInterestDoc,
  DepartmentRecord,
  DocumentRow,
  EducationEntry,
  Employee,
  EmployeeCompensation,
  EmployeeLetter,
  EmployeeSalaryAllowanceLine,
  SalaryAllowanceCatalogItem,
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
  PerformanceCycle,
  PerformanceReview,
  PmdfAssignment,
  PmdfBusinessObjective,
  PmdfDevelopmentObjective,
  PmdfForm,
  PolicyAcknowledgement,
  Salutation,
  StatutoryEntry,
  SubDepartmentRecord,
  TrainingRow,
  TransferRecord,
  CurrencyCode,
} from "@/lib/store/types";
import { BUSINESS_UNITS, BLOOD_GROUPS, CURRENCIES, currencyForBusinessUnit } from "@/lib/store/types";
import { payrollGrossPay, payrollNetPay } from "@/lib/store/payroll";
import { createInitialStore, DEFAULT_LEAVE_CATEGORIES, DEFAULT_SALARY_ALLOWANCE_TYPES } from "@/lib/store/seed";

const storePath = () => join(process.cwd(), "data", "kastros-hr-demo.json");

const STORE_FALLBACK = createInitialStore();

/** Last-resort when Firestore and disk are unavailable (e.g. Vercel without env). */
let volatileMemoryStore: HrStore | null = null;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBusinessObjectives(raw: unknown): PmdfBusinessObjective[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => isPlainObject(r))
    .map((r, idx) => ({
      id: typeof r.id === "string" ? r.id : `bo-${idx}`,
      sortOrder: numOrNull(r.sortOrder) ?? idx + 1,
      objectiveSmart: typeof r.objectiveSmart === "string" ? r.objectiveSmart : "",
      action: typeof r.action === "string" ? r.action : "",
      employeeComments: typeof r.employeeComments === "string" ? r.employeeComments : "",
      percentage: Math.max(0, numOrNull(r.percentage) ?? 0),
      selfScoreFy: numOrNull(r.selfScoreFy),
      finalScoreFy: numOrNull(r.finalScoreFy),
      managerCommentsHalfYear: typeof r.managerCommentsHalfYear === "string" ? r.managerCommentsHalfYear : "",
      managerCommentsFullYear: typeof r.managerCommentsFullYear === "string" ? r.managerCommentsFullYear : "",
    }));
}

function normalizeDevelopmentObjectives(raw: unknown): PmdfDevelopmentObjective[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => isPlainObject(r))
    .map((r, idx) => ({
      id: typeof r.id === "string" ? r.id : `do-${idx}`,
      sortOrder: numOrNull(r.sortOrder) ?? idx + 1,
      pillar: typeof r.pillar === "string" ? r.pillar : "",
      developmentArea: typeof r.developmentArea === "string" ? r.developmentArea : "",
      actionPlan: typeof r.actionPlan === "string" ? r.actionPlan : "",
      percentage: Math.max(0, numOrNull(r.percentage) ?? 0),
      selfScoreFy: numOrNull(r.selfScoreFy),
      finalScoreFy: numOrNull(r.finalScoreFy),
      managerCommentsHalfYear: typeof r.managerCommentsHalfYear === "string" ? r.managerCommentsHalfYear : "",
      managerCommentsFullYear: typeof r.managerCommentsFullYear === "string" ? r.managerCommentsFullYear : "",
    }));
}

function normalizePmdfForms(raw: unknown): PmdfForm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => isPlainObject(r) && typeof r.employeeEmail === "string")
    .map((r) => ({
      id: typeof r.id === "string" ? r.id : `pmdf-${Math.random().toString(36).slice(2, 10)}`,
      cycleId: typeof r.cycleId === "string" ? r.cycleId : "",
      employeeEmail: String(r.employeeEmail).toLowerCase(),
      employeeName: typeof r.employeeName === "string" ? r.employeeName : "",
      employeeIdDisplay: typeof r.employeeIdDisplay === "string" ? r.employeeIdDisplay : null,
      jobTitle: typeof r.jobTitle === "string" ? r.jobTitle : "",
      department: typeof r.department === "string" ? r.department : "",
      subDepartment: typeof r.subDepartment === "string" ? r.subDepartment : null,
      lineManagerEmail: typeof r.lineManagerEmail === "string" ? r.lineManagerEmail.toLowerCase() : null,
      lineManagerName: typeof r.lineManagerName === "string" ? r.lineManagerName : null,
      location: typeof r.location === "string" ? r.location : "",
      functionalArea: typeof r.functionalArea === "string" ? r.functionalArea : null,
      locationCategory: typeof r.locationCategory === "string" ? r.locationCategory : null,
      businessObjectives: normalizeBusinessObjectives(r.businessObjectives),
      developmentObjectives: normalizeDevelopmentObjectives(r.developmentObjectives),
      employeeFeedbackMidYear: typeof r.employeeFeedbackMidYear === "string" ? r.employeeFeedbackMidYear : "",
      managerFeedbackMidYear: typeof r.managerFeedbackMidYear === "string" ? r.managerFeedbackMidYear : "",
      employeeFeedbackFy: typeof r.employeeFeedbackFy === "string" ? r.employeeFeedbackFy : "",
      managerFeedbackFy: typeof r.managerFeedbackFy === "string" ? r.managerFeedbackFy : "",
      employeeSignature: typeof r.employeeSignature === "string" ? r.employeeSignature : "",
      managerSignature: typeof r.managerSignature === "string" ? r.managerSignature : "",
      employeeSignedAt: typeof r.employeeSignedAt === "string" ? r.employeeSignedAt : null,
      managerSignedAt: typeof r.managerSignedAt === "string" ? r.managerSignedAt : null,
      employeeObjectivesSubmittedAt:
        typeof r.employeeObjectivesSubmittedAt === "string" ? r.employeeObjectivesSubmittedAt : null,
      phase: (typeof r.phase === "string" ? r.phase : "objective_setting_employee") as PmdfForm["phase"],
      locked: r.locked === true,
      assignedAt: typeof r.assignedAt === "string" ? r.assignedAt : new Date().toISOString(),
      lastNotifiedAt: typeof r.lastNotifiedAt === "string" ? r.lastNotifiedAt : null,
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
    }));
}

function normalizePerformanceCycles(raw: unknown): PerformanceCycle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => isPlainObject(r) && typeof r.id === "string")
    .map((r) => ({
      id: String(r.id),
      title: typeof r.title === "string" ? r.title : "Performance cycle",
      startDate: typeof r.startDate === "string" ? r.startDate : "",
      endDate: typeof r.endDate === "string" ? r.endDate : "",
      currentPhase: (typeof r.currentPhase === "string"
        ? r.currentPhase
        : "objective_setting_employee") as PerformanceCycle["currentPhase"],
      objectiveSettingEmployeeDeadline:
        typeof r.objectiveSettingEmployeeDeadline === "string" ? r.objectiveSettingEmployeeDeadline : null,
      objectiveSettingManagerDeadline:
        typeof r.objectiveSettingManagerDeadline === "string" ? r.objectiveSettingManagerDeadline : null,
      objectiveSettingEmployeeOpen:
        typeof r.objectiveSettingEmployeeOpen === "string" ? r.objectiveSettingEmployeeOpen : null,
      objectiveSettingManagerOpen:
        typeof r.objectiveSettingManagerOpen === "string" ? r.objectiveSettingManagerOpen : null,
      midYearEmployeeDeadline: typeof r.midYearEmployeeDeadline === "string" ? r.midYearEmployeeDeadline : null,
      midYearManagerDeadline: typeof r.midYearManagerDeadline === "string" ? r.midYearManagerDeadline : null,
      midYearEmployeeOpen: typeof r.midYearEmployeeOpen === "string" ? r.midYearEmployeeOpen : null,
      midYearManagerOpen: typeof r.midYearManagerOpen === "string" ? r.midYearManagerOpen : null,
      yearEndEmployeeDeadline: typeof r.yearEndEmployeeDeadline === "string" ? r.yearEndEmployeeDeadline : null,
      yearEndManagerDeadline: typeof r.yearEndManagerDeadline === "string" ? r.yearEndManagerDeadline : null,
      yearEndEmployeeOpen: typeof r.yearEndEmployeeOpen === "string" ? r.yearEndEmployeeOpen : null,
      yearEndManagerOpen: typeof r.yearEndManagerOpen === "string" ? r.yearEndManagerOpen : null,
      locked: r.locked === true,
      lockedAt: typeof r.lockedAt === "string" ? r.lockedAt : null,
      createdByEmail: typeof r.createdByEmail === "string" ? r.createdByEmail : "",
      createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    }));
}

function normalizePmdfAssignments(raw: unknown): PmdfAssignment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => isPlainObject(r) && typeof r.id === "string")
    .map((r) => ({
      id: String(r.id),
      cycleId: typeof r.cycleId === "string" ? r.cycleId : "",
      scope: (r.scope === "organisation" || r.scope === "department" || r.scope === "employee"
        ? r.scope
        : "employee") as PmdfAssignment["scope"],
      department: typeof r.department === "string" ? r.department : null,
      employeeEmail: typeof r.employeeEmail === "string" ? r.employeeEmail.toLowerCase() : null,
      assignedAt: typeof r.assignedAt === "string" ? r.assignedAt : new Date().toISOString(),
      assignedByEmail: typeof r.assignedByEmail === "string" ? r.assignedByEmail : "",
    }));
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

  const educationEntries =
    Array.isArray(raw.educationEntries) && raw.educationEntries.length > 0
      ? raw.educationEntries
          .map((e) => ({
            degree: String(e?.degree ?? "").trim(),
            institution: String(e?.institution ?? "").trim(),
            year: String(e?.year ?? "").trim(),
          }))
          .filter((e) => e.degree && e.institution && e.year)
      : raw.eduTitle && raw.eduInstitute && raw.eduYear
        ? [{ degree: raw.eduTitle, institution: raw.eduInstitute, year: raw.eduYear }]
        : [];

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
    educationEntries,
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

function normalizeSalaryAllowanceCatalog(raw: unknown): SalaryAllowanceCatalogItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SALARY_ALLOWANCE_TYPES;
  return raw
    .filter((x): x is Record<string, unknown> => isPlainObject(x) && typeof x.id === "string")
    .map((x) => ({
      id: x.id as string,
      name: typeof x.name === "string" && x.name.trim() ? x.name.trim() : "Allowance",
      unit: x.unit === "liters" ? "liters" : "money",
      isActive: x.isActive !== false,
      sortOrder: numOrNull(x.sortOrder) ?? 0,
    }));
}

function normalizeCompensation(raw: unknown, businessUnit: BusinessUnit | null): EmployeeCompensation | null {
  if (!isPlainObject(raw)) return null;
  const gross = numOrNull(raw.grossSalary);
  const basic = numOrNull(raw.basicSalary);
  if (gross == null && basic == null && !Array.isArray(raw.allowances)) return null;
  const bu = normalizeBusinessUnit(raw.businessUnit) ?? businessUnit;
  const currencyRaw = raw.currency;
  const currency =
    typeof currencyRaw === "string" && (CURRENCIES as readonly string[]).includes(currencyRaw)
      ? (currencyRaw as CurrencyCode)
      : currencyForBusinessUnit(bu);
  const allowances: EmployeeSalaryAllowanceLine[] = Array.isArray(raw.allowances)
    ? (raw.allowances as unknown[])
        .filter((a): a is Record<string, unknown> => isPlainObject(a) && typeof a.typeId === "string")
        .map((a) => ({
          typeId: a.typeId as string,
          amount: Math.max(0, numOrNull(a.amount) ?? 0),
        }))
        .filter((a) => a.amount > 0)
    : [];
  return {
    grossSalary: Math.max(0, gross ?? 0),
    basicSalary: Math.max(0, basic ?? 0),
    currency,
    allowances,
    updatedAt: strOrNull(raw.updatedAt),
    updatedByEmail: strOrNull(raw.updatedByEmail),
  };
}

function normalizeBloodGroup(v: unknown): BloodGroup | null {
  return typeof v === "string" && (BLOOD_GROUPS as readonly string[]).includes(v) ? (v as BloodGroup) : null;
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
  const normalizeStoredRef = (v: unknown, fallback: string | null | undefined) =>
    typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v.trim()) ? v.trim().toLowerCase() : (fallback ?? null);
  const cnicFrontStoredRef = normalizeStoredRef(raw.cnicFrontStoredRef, base.cnicFrontStoredRef);
  const cnicBackStoredRef = normalizeStoredRef(raw.cnicBackStoredRef, base.cnicBackStoredRef);

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
    bloodGroup: normalizeBloodGroup(raw.bloodGroup),
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
    cnicFrontStoredRef,
    cnicBackStoredRef,
    compensation: normalizeCompensation(raw.compensation, normalizeBusinessUnit(raw.businessUnit)),
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
    ? (p.leaveRequests as unknown[])
        .filter((r): r is Record<string, unknown> => isPlainObject(r) && typeof (r as { requesterEmail?: unknown }).requesterEmail === "string")
        .map((r) => {
          const statusRaw = typeof r.status === "string" ? r.status : "PendingHR";
          const status: LeaveRequest["status"] =
            statusRaw === "PendingCEO"
              ? "PendingHR"
              : statusRaw === "PendingManager" || statusRaw === "PendingHR" || statusRaw === "Approved" || statusRaw === "Denied"
                ? statusRaw
                : "PendingHR";
          return {
            id: typeof r.id === "string" ? r.id : `lv-legacy-${Math.random().toString(36).slice(2, 10)}`,
            requesterEmail: String(r.requesterEmail),
            kind: typeof r.kind === "string" ? r.kind : "Leave",
            categoryId: typeof r.categoryId === "string" ? r.categoryId : null,
            start: typeof r.start === "string" ? r.start : "",
            end: typeof r.end === "string" ? r.end : "",
            status,
            decidedByEmail: typeof r.decidedByEmail === "string" ? r.decidedByEmail : null,
            managerDecisionByEmail: typeof r.managerDecisionByEmail === "string" ? r.managerDecisionByEmail : null,
            hrDecisionByEmail: typeof r.hrDecisionByEmail === "string" ? r.hrDecisionByEmail : null,
            ceoDecisionByEmail: typeof r.ceoDecisionByEmail === "string" ? r.ceoDecisionByEmail : null,
            note: typeof r.note === "string" ? r.note : null,
          };
        })
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
          cardReturnAddress:
            typeof b.cardReturnAddress === "string" && b.cardReturnAddress.trim()
              ? b.cardReturnAddress.trim()
              : null,
        }))
      : fb.businessUnits;

  const salaryAllowanceTypes = normalizeSalaryAllowanceCatalog(p.salaryAllowanceTypes);

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
    salaryAllowanceTypes,
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
    performanceCycles: normalizePerformanceCycles(p.performanceCycles),
    pmdfAssignments: normalizePmdfAssignments(p.pmdfAssignments),
    pmdfForms: normalizePmdfForms(p.pmdfForms),
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
    notificationEmailsSent:
      p.notificationEmailsSent && typeof p.notificationEmailsSent === "object" && !Array.isArray(p.notificationEmailsSent)
        ? (Object.fromEntries(
            Object.entries(p.notificationEmailsSent as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
          ) as Record<string, string>)
        : (fb.notificationEmailsSent ?? {}),
  };
}

async function readStoreOnce(): Promise<HrStore> {
  if (volatileMemoryStore) {
    return structuredClone(volatileMemoryStore);
  }

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
  } catch (readErr) {
    console.error("[kastros-hr] Local store file missing or unreadable.", readErr);
    const initial = createInitialStore();
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    } catch (writeErr) {
      console.error(
        "[kastros-hr] Cannot write local store (common on Vercel — use Firestore). Using in-memory fallback.",
        writeErr,
      );
      return initial;
    }
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
      volatileMemoryStore = null;
      return;
    } catch (e) {
      console.error("[kastros-hr] Firestore write failed, falling back to local file.", e);
    }
  }

  const path = storePath();
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(store, null, 2), "utf8");
    volatileMemoryStore = null;
    return;
  } catch (e) {
    console.error("[kastros-hr] Local store write failed.", e);
  }

  volatileMemoryStore = structuredClone(store);
  if (!firestore) {
    throw new Error(
      "Could not save HR data. On Vercel, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Environment Variables, then redeploy.",
    );
  }
  throw new Error(
    "Could not save to Firestore or local disk. Check Vercel logs, Firebase credentials, and Firestore rules. Your change was not saved.",
  );
}

export async function mutateStore<T>(fn: (store: HrStore) => { next: HrStore; result: T }): Promise<T> {
  return enqueue(async () => {
    const current = await readStoreOnce();
    const { next, result } = fn(structuredClone(current));
    await writeStore(next);
    return result;
  });
}
