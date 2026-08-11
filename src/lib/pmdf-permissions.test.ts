import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPmdfFieldAccess } from "./pmdf-permissions";
import type { PerformanceCycle, PmdfForm } from "./store/types";

function sampleForm(overrides: Partial<PmdfForm> = {}): PmdfForm {
  return {
    id: "pf-1",
    cycleId: "pc-1",
    employeeEmail: "employee@kastros.co",
    employeeName: "Employee",
    employeeIdDisplay: null,
    jobTitle: "Analyst",
    department: "Ops",
    subDepartment: null,
    functionalArea: null,
    locationCategory: null,
    location: "Karachi",
    lineManagerEmail: "manager@kastros.co",
    lineManagerName: "Manager",
    phase: "objective_setting_employee",
    locked: false,
    businessObjectives: [],
    developmentObjectives: [],
    employeeFeedbackMidYear: "",
    managerFeedbackMidYear: "",
    employeeFeedbackFy: "",
    managerFeedbackFy: "",
    employeeSignature: "",
    managerSignature: "",
    employeeSignedAt: null,
    managerSignedAt: null,
    employeeObjectivesSubmittedAt: null,
    employeePerformanceGoalsSubmittedAt: null,
    employeeDevelopmentGoalsSubmittedAt: null,
    employeeObjectivesReopenedAt: null,
    hrReopenedStage: null,
    hrReopenedAt: null,
    hrReopenedByEmail: null,
    assignedAt: "2026-01-01T00:00:00.000Z",
    lastNotifiedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function sampleCycle(overrides: Partial<PerformanceCycle> = {}): PerformanceCycle {
  return {
    id: "pc-1",
    title: "FY26",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    currentPhase: "objective_setting_employee",
    objectiveSettingEmployeeDeadline: null,
    objectiveSettingManagerDeadline: null,
    objectiveSettingEmployeeOpen: null,
    objectiveSettingManagerOpen: null,
    midYearEmployeeDeadline: null,
    midYearManagerDeadline: null,
    midYearEmployeeOpen: null,
    midYearManagerOpen: null,
    yearEndEmployeeDeadline: null,
    yearEndManagerDeadline: null,
    yearEndEmployeeOpen: null,
    yearEndManagerOpen: null,
    locked: false,
    lockedAt: null,
    createdByEmail: "admin@kastros.co",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getPmdfFieldAccess", () => {
  it("gives employees both goal sections during objective setting", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle(),
      form: sampleForm(),
      role: "employee",
      isEmployee: true,
      isManager: false,
      performanceGoalsLocked: false,
      developmentGoalsLocked: false,
      effectivePhase: "objective_setting_employee",
    });
    assert.equal(access.canEditEmployeeObjectiveFields, true);
    assert.equal(access.canEditEmployeeDevelopmentFields, true);
  });

  it("keeps development editable when only performance is submitted", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle(),
      form: sampleForm({ employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }),
      role: "employee",
      isEmployee: true,
      isManager: false,
      performanceGoalsLocked: true,
      developmentGoalsLocked: false,
      effectivePhase: "objective_setting_employee",
    });
    assert.equal(access.canEditEmployeeObjectiveFields, false);
    assert.equal(access.canEditEmployeeDevelopmentFields, true);
  });

  it("keeps performance editable when only development is submitted", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle(),
      form: sampleForm({ employeeDevelopmentGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }),
      role: "employee",
      isEmployee: true,
      isManager: false,
      performanceGoalsLocked: false,
      developmentGoalsLocked: true,
      effectivePhase: "objective_setting_employee",
    });
    assert.equal(access.canEditEmployeeObjectiveFields, true);
    assert.equal(access.canEditEmployeeDevelopmentFields, false);
  });
});
