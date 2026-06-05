/**
 * Source-of-truth schema for the Kastros HR application.
 *
 * Multi-currency: each employee has a `businessUnit` that drives the default
 * currency for their payroll / allowances / loans / gratuity / etc.
 *  - UAE       -> AED
 *  - Karachi   -> PKR
 *  - Multan    -> PKR
 */

export type EmployeeStatus = "Active" | "On leave" | "Offboarding" | "Separated";
export type EmploymentType = "Permanent" | "Temporary" | "Contractual" | "Intern" | "Trainee";

export const BUSINESS_UNITS = ["UAE", "Karachi", "Multan"] as const;
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

export const CURRENCIES = ["AED", "PKR", "USD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export function currencyForBusinessUnit(bu: BusinessUnit | null | undefined): CurrencyCode {
  if (bu === "UAE") return "AED";
  if (bu === "Karachi" || bu === "Multan") return "PKR";
  return "USD";
}

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say";
export type MaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type FamilyRelation = {
  name: string;
  relation: string;
  firmOrEmployer: string;
  linkedToTraderOrMerchandiser: boolean;
};

export type EmergencyContact = {
  name: string;
  relation: string;
  phone: string;
};

/** One row in an employee's inline education history. */
export type EducationEntry = {
  degree: string;
  institution: string;
  year: string;
};

/** A licence / certification kept on the employee record (driving, professional, statutory). */
export type EmployeeLicence = {
  id: string;
  type: string;
  number: string;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
};

export type Salutation = "Mr." | "Mrs." | "Ms." | "Dr." | "Eng." | "Prof.";

export type Employee = {
  id: string;
  /** Sequential, human-readable Kastros employee ID e.g. KST-1001 (also shown on ID card). */
  employeeIdDisplay: string | null;

  /** Identity */
  salutation: Salutation | null;
  name: string;
  fatherName: string;
  email: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  nationality: string | null;
  secondNationality: string | null;
  maritalStatus: MaritalStatus | null;
  religion: string | null;
  bloodGroup: BloodGroup | null;
  cnic: string | null;
  cnicExpiry: string | null;
  address: string | null;

  /** Employment */
  title: string;
  /** Optional designation # — links to a job description in Organization setup. */
  designationNumber: string | null;
  /** Optional "Official number" (govt / regulator reference). */
  officialNumber: string | null;
  location: string;
  businessUnit: BusinessUnit | null;
  status: EmployeeStatus;
  department: string;
  subDepartment: string | null;
  employmentType: EmploymentType;
  joiningDate: string;
  /** 0 = no probation, 3 = 3 months, 6 = 6 months */
  probationMonths: number;
  probationCompletionDate: string;

  /** Working schedule */
  dutyHours: number | null;
  dutyDays: number | null;

  /** Contact */
  companyPhone: string;
  personalPhone: string;
  emergencyContacts: EmergencyContact[];
  familyRelations: FamilyRelation[];
  reportsToEmail: string | null;

  /** Vehicle / driving info — populated when a corporate vehicle is assigned. */
  hasCompanyVehicle: boolean;
  vehicleNumber: string | null;
  drivingLicenceNumber: string | null;
  drivingLicenceExpiry: string | null;

  /** Other licences / professional certifications. */
  licences: EmployeeLicence[];

  /** Inline education history (multiple degrees/certs on one record). */
  education: EducationEntry[];

  /** Per-employee statutory / benefit flags. */
  hasGratuity: boolean;
  hasEobi: boolean;
  hasProvidentFund: boolean;

  /** Firebase Auth UID (set by hr-actions when creating an employee). */
  firebaseUid?: string;

  /** Profile photo uploaded under /data/uploads/{ref}, served by /api/hr-file/{ref}. */
  photoStoredRef: string | null;

  /**
   * Appointment compensation — visible and editable only by HR Admin / CEO.
   * Gross + basic + allowance breakdown (fuel stored as liters).
   */
  compensation: EmployeeCompensation | null;
};

/** Money amount or liters (for fuel) — configured on the allowance catalog. */
export type SalaryAllowanceUnit = "money" | "liters";

/** HR-configurable allowance labels (Settings → Salary allowances). */
export type SalaryAllowanceCatalogItem = {
  id: string;
  name: string;
  unit: SalaryAllowanceUnit;
  isActive: boolean;
  sortOrder: number;
};

/** One allowance line on an employee's compensation breakdown. */
export type EmployeeSalaryAllowanceLine = {
  typeId: string;
  amount: number;
};

export type EmployeeCompensation = {
  grossSalary: number;
  basicSalary: number;
  currency: CurrencyCode;
  allowances: EmployeeSalaryAllowanceLine[];
  updatedAt: string | null;
  updatedByEmail: string | null;
};

export type LeaveStatus = "PendingHR" | "PendingCEO" | "Approved" | "Denied";

/** HR-defined leave type (e.g. Sick leave, Annual leave) with company-wide default entitlement. */
export type LeaveCategory = {
  id: string;
  name: string;
  /** Standard days per calendar year — applied to all employees unless overridden. */
  defaultDaysPerYear: number;
  isActive: boolean;
  sortOrder: number;
};

/** Per-employee override for a leave category in a given calendar year. */
export type EmployeeLeaveAllocation = {
  id: string;
  employeeEmail: string;
  categoryId: string;
  year: number;
  allocatedDays: number;
};

export type LeaveRequest = {
  id: string;
  requesterEmail: string;
  /** Display label — kept in sync with category name when selected from dropdown. */
  kind: string;
  /** Links request to a leave category when submitted via the app UI. */
  categoryId: string | null;
  start: string;
  end: string;
  status: LeaveStatus;
  decidedByEmail: string | null;
  hrDecisionByEmail: string | null;
  ceoDecisionByEmail: string | null;
  note: string | null;
};

export type JobPosting = {
  id: string;
  title: string;
  location: string;
  stage: string;
  applicantCount: number;
  description: string | null;
};

export type JobApplicationReviewStatus = "submitted" | "approved";

export type JobApplication = {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedIn: string | null;
  currentCompany: string | null;
  yearsExperience: string | null;
  salaryExpectation: string | null;
  noticePeriod: string | null;
  coverLetter: string | null;
  cvStoredRef: string | null;
  cvOriginalName: string | null;
  submittedAt: string;
  reviewStatus: JobApplicationReviewStatus;
  fatherName: string | null;
  roleTitle: string | null;
  intakeDepartment: string | null;
  intakeLocation: string | null;
  employmentType: EmploymentType | null;
  intakeJoiningDate: string | null;
  intakeProbationMonths: number | null;
  companyPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  familyRelationName: string | null;
  familyRelationType: string | null;
  familyRelationFirm: string | null;
  familyLinked: boolean | null;
  reportsToEmail: string | null;
  /** Candidate-entered education rows from apply portal. */
  educationEntries: EducationEntry[];
  eduTitle: string | null;
  eduInstitute: string | null;
  eduYear: string | null;
  eduStoredRef: string | null;
  eduAttachmentName: string | null;
  certTitle: string | null;
  certIssuer: string | null;
  certYear: string | null;
  certStoredRef: string | null;
  certAttachmentName: string | null;
};

export type TrainingRow = {
  id: string;
  assigneeEmail: string;
  name: string;
  provider: "Internal" | "External";
  providerName: string;
  trainingMaterialPptx: string | null;
  trainingMaterialStoredRef: string | null;
  trainingMaterialOriginalName: string | null;
  attendedEmails: string[];
  due: string;
  status: "Required" | "Done";
};

export type AcademicRecord = {
  id: string;
  employeeEmail: string;
  type: "Degree" | "Certification";
  title: string;
  institute: string;
  year: string;
  attachmentName: string | null;
  storedRef: string | null;
};

export type DocumentRow = {
  id: string;
  name: string;
  owner: string;
  sensitivity: string;
  createdByEmail: string;
  employeeEmail: string | null;
  storedRef: string | null;
};

export type PolicyManual = {
  id: string;
  title: string;
  version: string;
  printableUrl: string;
};

export type PolicyAcknowledgement = {
  id: string;
  policyId: string;
  employeeEmail: string;
  acknowledgedAt: string;
};

export type HrCase = {
  id: string;
  reference: string;
  topic: string;
  status: string;
  opened: string;
  openedByEmail: string;
  type: "Conflict of Interest" | "Code of Conduct" | "Other";
  restrictedTo: Array<"hr_admin" | "ceo">;
};

export type Goal = {
  id: string;
  ownerEmail: string;
  title: string;
  progressPct: number;
  cycle: string;
};

export type PerformanceReview = {
  id: string;
  employeeEmail: string;
  managerEmail: string;
  department: string;
  criteriaType: "Technical" | "Leadership" | "Operations";
  grade: "A" | "B" | "C" | "D";
  comments: string;
  cycle: string;
};

export type PayrollSnapshot = {
  month: string;
  employeesPaid: number;
  exceptions: number;
  note: string;
};

/**
 * Well-known allowance labels — HR can also enter a free-text label for any
 * allowance not in this list (stored as-is so it shows on payslips verbatim).
 */
export type PayrollAllowanceType =
  | "Fuel"
  | "Transport"
  | "SIM/Mobile"
  | "Laptop"
  | "House Rent"
  | "Medical"
  | "Utilities"
  | "Special"
  | "Other"
  | (string & {});

export type PayrollAllowance = {
  type: PayrollAllowanceType;
  amount: number;
};

export type PayrollDeductionType =
  | "Income Tax"
  | "EOBI"
  | "ESSI"
  | "Provident Fund"
  | "Pension"
  | "Loan"
  | "Other";

export type PayrollDeduction = {
  type: PayrollDeductionType;
  amount: number;
  note?: string | null;
};

export type PayrollEntry = {
  id: string;
  employeeEmail: string;
  month: string;
  baseSalary: number;
  allowances: PayrollAllowance[];
  deductions: PayrollDeduction[];
  hoursWorked: number;
  hourlyRate: number;
  overtimeHours: number;
  overtimeRate: number;
  bonus: number;
  grossPay: number;
  netPay: number;
  currency: CurrencyCode;
  businessUnit: BusinessUnit | null;
};

/* ------------------------------------------------------------------ */
/* Organization setup                                                  */
/* ------------------------------------------------------------------ */

export type BusinessUnitRecord = {
  id: string;
  name: BusinessUnit;
  notes: string | null;
  /** Shown on corporate ID card back — if lost, return to this office. */
  cardReturnAddress: string | null;
};

export type DepartmentRecord = {
  id: string;
  name: string;
  businessUnitId: string | null;
  headEmail: string | null;
  budget: number | null;
  budgetCurrency: CurrencyCode | null;
  notes: string | null;
};

export type SubDepartmentRecord = {
  id: string;
  name: string;
  departmentId: string;
  notes: string | null;
};

export type JobDescription = {
  id: string;
  designationNumber: string;
  title: string;
  departmentId: string | null;
  summary: string;
  responsibilities: string;
  requirements: string;
  attachmentRef: string | null;
  attachmentName: string | null;
};

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

export type LoanStatus = "Pending" | "Approved" | "Rejected" | "Active" | "Closed";

export type LoanRecord = {
  id: string;
  employeeEmail: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  installments: number;
  installmentAmount: number;
  status: LoanStatus;
  requestedOn: string;
  approvedByEmail: string | null;
  approvedOn: string | null;
  paidAmount: number;
  notes: string | null;
};

/* ------------------------------------------------------------------ */
/* Bonus                                                               */
/* ------------------------------------------------------------------ */

export type BonusType = "Performance" | "Festival" | "Spot" | "Annual" | "Referral" | "Other";

export type BonusRecord = {
  id: string;
  employeeEmail: string;
  type: BonusType;
  amount: number;
  currency: CurrencyCode;
  month: string;
  reason: string;
  approvedByEmail: string | null;
  postedToPayroll: boolean;
};

/* ------------------------------------------------------------------ */
/* Overtime                                                            */
/* ------------------------------------------------------------------ */

export type OvertimeStatus = "Pending" | "Approved" | "Rejected";

export type OvertimeRecord = {
  id: string;
  employeeEmail: string;
  date: string;
  hours: number;
  ratePerHour: number;
  currency: CurrencyCode;
  reason: string;
  status: OvertimeStatus;
  approvedByEmail: string | null;
  postedToPayroll: boolean;
};

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export type ExpenseStatus = "Pending" | "Approved" | "Rejected" | "Paid";

export type ExpenseClaim = {
  id: string;
  employeeEmail: string;
  submittedOn: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  receiptRef: string | null;
  receiptOriginalName: string | null;
  status: ExpenseStatus;
  approvedByEmail: string | null;
  approvedOn: string | null;
  paidOn: string | null;
};

/* ------------------------------------------------------------------ */
/* Gratuity & Final settlement                                         */
/* ------------------------------------------------------------------ */

export type GratuityRecord = {
  id: string;
  employeeEmail: string;
  asOfDate: string;
  yearsOfService: number;
  basicSalary: number;
  gratuityAmount: number;
  currency: CurrencyCode;
  /** Formula: 'lastBasic × yearsOfService' (default). Different BU policies could override. */
  formula: string;
  paidOn: string | null;
  notes: string | null;
};

export type FinalSettlementRecord = {
  id: string;
  employeeEmail: string;
  separationDate: string;
  lastWorkingDate: string;
  reason: string;
  gratuityAmount: number;
  leaveEncashment: number;
  unpaidSalary: number;
  bonusDue: number;
  loanDeduction: number;
  otherDeductions: number;
  taxDeduction: number;
  netPayable: number;
  currency: CurrencyCode;
  status: "Draft" | "Approved" | "Paid";
  approvedByEmail: string | null;
  paidOn: string | null;
};

/* ------------------------------------------------------------------ */
/* Provident Fund & Pension                                            */
/* ------------------------------------------------------------------ */

export type FundContribution = {
  id: string;
  employeeEmail: string;
  month: string;
  /** Employee contribution. */
  employeeAmount: number;
  /** Employer / company match. */
  employerAmount: number;
  currency: CurrencyCode;
  fundKind: "Provident" | "Pension" | "OtherFund";
  fundLabel: string | null;
  notes: string | null;
};

/* ------------------------------------------------------------------ */
/* EOBI & ESSI (Pakistan statutory)                                    */
/* ------------------------------------------------------------------ */

export type StatutoryEntry = {
  id: string;
  employeeEmail: string;
  scheme: "EOBI" | "ESSI";
  month: string;
  employeeAmount: number;
  employerAmount: number;
  currency: CurrencyCode;
  challanRef: string | null;
};

/* ------------------------------------------------------------------ */
/* Budgeting                                                           */
/* ------------------------------------------------------------------ */

export type BudgetLine = {
  id: string;
  scope: "BusinessUnit" | "Department";
  scopeId: string;
  scopeLabel: string;
  period: string;
  category: string;
  budgetAmount: number;
  actualSpent: number;
  currency: CurrencyCode;
};

/* ------------------------------------------------------------------ */
/* Transfer / Posting                                                  */
/* ------------------------------------------------------------------ */

export type TransferStatus = "Pending" | "Approved" | "Rejected" | "Completed";

export type TransferRecord = {
  id: string;
  employeeEmail: string;
  fromBusinessUnit: BusinessUnit | null;
  toBusinessUnit: BusinessUnit;
  fromDepartment: string;
  toDepartment: string;
  effectiveDate: string;
  /** Optional end / reversion date (not required). */
  tillDate: string | null;
  reason: string;
  status: TransferStatus;
  approvedByEmail: string | null;
  approvedOn: string | null;
};

/* ------------------------------------------------------------------ */
/* Letters (Promotion / Redesignation / Trainee / Internship)          */
/* ------------------------------------------------------------------ */

export type LetterType = "Promotion" | "Redesignation" | "Trainee" | "Internship" | "Termination";

export type EmployeeLetter = {
  id: string;
  employeeEmail: string;
  type: LetterType;
  /** For Promotion: locked to 1st-of-month. For Redesignation: editable date. */
  effectiveDate: string;
  /** Date the letter is being issued / printed. */
  issuedDate: string;

  /** Promotion / Redesignation specific */
  oldTitle: string | null;
  newTitle: string | null;
  oldDepartment: string | null;
  newDepartment: string | null;
  oldSalary: number | null;
  newSalary: number | null;
  currency: CurrencyCode | null;

  /** Trainee / Internship specific */
  programTitle: string | null;
  durationMonths: number | null;
  stipend: number | null;

  /** Termination specific */
  terminationReason: string | null;
  terminationLastWorkingDate: string | null;
  terminationSettlementNotes: string | null;

  /** Body / additional notes shown in the printable letter. */
  notes: string | null;
  issuedByEmail: string;
};

/* ------------------------------------------------------------------ */
/* Fund accounting / JV postings                                       */
/* ------------------------------------------------------------------ */

export type LedgerEntry = {
  id: string;
  postedAt: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  currency: CurrencyCode;
  account: string;
  source: "Payroll" | "Loan" | "PF" | "Pension" | "Expense" | "Manual" | "Gratuity";
};

/* ------------------------------------------------------------------ */
/* Conflict of Interest document                                        */
/* ------------------------------------------------------------------ */

/** Company-wide CoI template uploaded by HR; employees download, sign, and re-upload. */
export type ConflictOfInterestDoc = {
  id: string;
  uploadedByEmail: string;
  uploadedAt: string;
  storedRef: string;
  originalName: string;
  version: string | null;
};

/** A signed CoI submission from an individual employee. */
export type CoiSubmission = {
  id: string;
  employeeEmail: string;
  submittedAt: string;
  storedRef: string;
  originalName: string;
};

/* ------------------------------------------------------------------ */
/* Audit                                                                */
/* ------------------------------------------------------------------ */

export type AuditRow = {
  at: string;
  actor: string;
  action: string;
  ip: string;
};

/* ------------------------------------------------------------------ */
/* Root store                                                          */
/* ------------------------------------------------------------------ */

export type HrStore = {
  employees: Employee[];
  /** Configurable salary allowance types (HR → Settings). */
  salaryAllowanceTypes: SalaryAllowanceCatalogItem[];
  /** Configurable leave types and standard entitlements (HR → Settings). */
  leaveCategories: LeaveCategory[];
  /** Per-employee leave day overrides (HR → Leave). */
  employeeLeaveAllocations: EmployeeLeaveAllocation[];
  leaveRequests: LeaveRequest[];
  jobs: JobPosting[];
  jobApplications: JobApplication[];
  training: TrainingRow[];
  academics: AcademicRecord[];
  documents: DocumentRow[];
  policies: PolicyManual[];
  policyAcknowledgements: PolicyAcknowledgement[];
  cases: HrCase[];
  goals: Goal[];
  reviews: PerformanceReview[];
  payroll: PayrollSnapshot;
  payrollEntries: PayrollEntry[];
  audit: AuditRow[];

  businessUnits: BusinessUnitRecord[];
  departments: DepartmentRecord[];
  subDepartments: SubDepartmentRecord[];
  jobDescriptions: JobDescription[];
  bonuses: BonusRecord[];
  overtime: OvertimeRecord[];
  expenses: ExpenseClaim[];
  statutory: StatutoryEntry[];
  transfers: TransferRecord[];
  letters: EmployeeLetter[];

  /** Conflict of Interest documents */
  coiDocs: ConflictOfInterestDoc[];
  coiSubmissions: CoiSubmission[];
};
