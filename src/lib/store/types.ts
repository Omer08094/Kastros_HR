export type EmployeeStatus = "Active" | "On leave" | "Offboarding";
export type EmploymentType = "Permanent" | "Temporary" | "Contractual" | "Intern";

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

export type Employee = {
  id: string;
  name: string;
  fatherName: string;
  email: string;
  title: string;
  location: string;
  status: EmployeeStatus;
  department: string;
  employmentType: EmploymentType;
  joiningDate: string;
  probationMonths: number;
  probationCompletionDate: string;
  companyPhone: string;
  personalPhone: string;
  emergencyContacts: EmergencyContact[];
  familyRelations: FamilyRelation[];
  reportsToEmail: string | null;
};

export type LeaveStatus = "PendingHR" | "PendingCEO" | "Approved" | "Denied";

export type LeaveRequest = {
  id: string;
  requesterEmail: string;
  kind: string;
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
  /** Shown on the public application portal */
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
  /** Saved binary under data/uploads/{ref}; view via /api/hr-file/{ref} */
  cvStoredRef: string | null;
  cvOriginalName: string | null;
  submittedAt: string;
  /** Recruiting workflow — only approved candidates should use Onboard → prefilled form */
  reviewStatus: JobApplicationReviewStatus;
  /** Snapshot of applicant answers matching Add team member fields */
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
  /** Optional label when no file is uploaded (legacy / display only). */
  trainingMaterialPptx: string | null;
  /** Binary under data/uploads/{ref}; view via /api/hr-file/{ref} */
  trainingMaterialStoredRef: string | null;
  trainingMaterialOriginalName: string | null;
  /** Employees who attended (HR-marked session attendance). */
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
  /** Saved binary under data/uploads/{ref}; view via /api/hr-file/{ref} */
  storedRef: string | null;
};

export type DocumentRow = {
  id: string;
  name: string;
  owner: string;
  sensitivity: string;
  createdByEmail: string;
  /** Personnel / onboarding file for this employee when set; otherwise company-wide library entry. */
  employeeEmail: string | null;
  /** Same ref as paired academic row when file was uploaded at onboarding. */
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

export type PayrollAllowanceType = "Fuel" | "Transport" | "SIM/Mobile" | "Laptop" | "Other";

export type PayrollAllowance = {
  type: PayrollAllowanceType;
  amount: number;
};

export type PayrollEntry = {
  id: string;
  employeeEmail: string;
  month: string;
  baseSalary: number;
  allowances: PayrollAllowance[];
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
};

export type AuditRow = {
  at: string;
  actor: string;
  action: string;
  ip: string;
};

export type HrStore = {
  employees: Employee[];
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
};
