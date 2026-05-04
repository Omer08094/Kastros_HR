export type EmployeeStatus = "Active" | "On leave" | "Offboarding";

export type Employee = {
  id: string;
  name: string;
  email: string;
  title: string;
  location: string;
  status: EmployeeStatus;
  reportsToEmail: string | null;
};

export type LeaveStatus = "Pending" | "Approved" | "Denied";

export type LeaveRequest = {
  id: string;
  requesterEmail: string;
  kind: string;
  start: string;
  end: string;
  status: LeaveStatus;
  decidedByEmail: string | null;
  note: string | null;
};

export type JobPosting = {
  id: string;
  title: string;
  location: string;
  stage: string;
  applicantCount: number;
};

export type TrainingRow = {
  id: string;
  assigneeEmail: string;
  name: string;
  due: string;
  status: "Required" | "Done";
};

export type DocumentRow = {
  id: string;
  name: string;
  owner: string;
  sensitivity: string;
  createdByEmail: string;
};

export type HrCase = {
  id: string;
  reference: string;
  topic: string;
  status: string;
  opened: string;
  openedByEmail: string;
};

export type Goal = {
  id: string;
  ownerEmail: string;
  title: string;
  progressPct: number;
  cycle: string;
};

export type PayrollSnapshot = {
  month: string;
  employeesPaid: number;
  exceptions: number;
  note: string;
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
  training: TrainingRow[];
  documents: DocumentRow[];
  cases: HrCase[];
  goals: Goal[];
  payroll: PayrollSnapshot;
  audit: AuditRow[];
};
