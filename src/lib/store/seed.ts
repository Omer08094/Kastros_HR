import type { BusinessUnitRecord, HrStore, LeaveCategory } from "@/lib/store/types";

/** Default leave types — HR can rename, add, or change standard days in Settings. */
export const DEFAULT_LEAVE_CATEGORIES: LeaveCategory[] = [
  { id: "lv-cat-annual", name: "Annual leave", defaultDaysPerYear: 25, isActive: true, sortOrder: 1 },
  { id: "lv-cat-sick", name: "Sick leave", defaultDaysPerYear: 10, isActive: true, sortOrder: 2 },
  { id: "lv-cat-casual", name: "Casual leave", defaultDaysPerYear: 5, isActive: true, sortOrder: 3 },
  { id: "lv-cat-unpaid", name: "Unpaid leave", defaultDaysPerYear: 0, isActive: true, sortOrder: 4 },
];

/** Default business units shipped with every fresh install. */
const DEFAULT_BUSINESS_UNITS: BusinessUnitRecord[] = [
  { id: "bu-uae", name: "UAE", notes: null },
  { id: "bu-karachi", name: "Karachi", notes: null },
  { id: "bu-multan", name: "Multan", notes: null },
];

/** Default published policy manuals. */
const DEFAULT_POLICIES = [
  { id: "pol-1", title: "HR Manual", version: "v2026.1", printableUrl: "/policies/hr-manual-v2026.1.pdf" },
  { id: "pol-2", title: "Code of Conduct", version: "v2026.2", printableUrl: "/policies/code-of-conduct-v2026.2.pdf" },
];

/**
 * Fresh installs start with a structurally complete but data-empty store.
 * - No demo employees / leave requests / payroll lines etc.
 * - Default Business Units are seeded (UAE/Karachi/Multan).
 * - HR Manual + Code of Conduct policy stubs are seeded for acknowledgement flow.
 */
export function createInitialStore(): HrStore {
  return {
    employees: [],
    leaveCategories: DEFAULT_LEAVE_CATEGORIES,
    employeeLeaveAllocations: [],
    leaveRequests: [],
    jobs: [],
    jobApplications: [],
    training: [],
    academics: [],
    documents: [],
    policies: DEFAULT_POLICIES,
    policyAcknowledgements: [],
    cases: [],
    goals: [],
    reviews: [],
    payroll: {
      month: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" }),
      employeesPaid: 0,
      exceptions: 0,
      note: "Gross = base + (hours × rate) + overtime + allowances + bonus. Net = Gross − deductions.",
    },
    payrollEntries: [],
    audit: [],
    businessUnits: DEFAULT_BUSINESS_UNITS,
    departments: [],
    subDepartments: [],
    jobDescriptions: [],
    bonuses: [],
    overtime: [],
    expenses: [],
    statutory: [],
    transfers: [],
    letters: [],
    coiDocs: [],
    coiSubmissions: [],
  };
}
