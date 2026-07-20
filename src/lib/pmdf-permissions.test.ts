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
    createdAt: "2026-01-01T00:00:00.000Z",
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
  it("gives employees objective fields only during objective setting", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle(),
      form: sampleForm(),
      role: "employee",
      isEmployee: true,
      isManager: false,
      employeeObjectivesLocked: false,
      effectivePhase: "objective_setting_employee",
    });
    assert.equal(access.canEditEmployeeObjectiveFields, true);
    assert.equal(access.canEditRowManagerHalfYearComments, false);
    assert.equal(access.canEditRowManagerFinalFields, false);
    assert.equal(access.canEditSelfScores, false);
  });

  it("never gives manager row flags to the form owner even if they are their own line manager", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle({
        midYearManagerOpen: "2026-01-01",
        midYearManagerDeadline: "2026-12-31",
        yearEndManagerOpen: "2026-01-01",
        yearEndManagerDeadline: "2026-12-31",
      }),
      form: sampleForm(),
      role: "employee",
      isEmployee: true,
      isManager: true,
      employeeObjectivesLocked: true,
      effectivePhase: "mid_year_review_manager",
    });
    assert.equal(access.canEditRowManagerHalfYearComments, false);
    assert.equal(access.canEditRowManagerFinalFields, false);
  });

  it("allows manager half-year comments only when final window is closed", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle({
        midYearManagerOpen: "2026-01-01",
        midYearManagerDeadline: "2026-12-31",
      }),
      form: sampleForm(),
      role: "employee",
      isEmployee: false,
      isManager: true,
      employeeObjectivesLocked: true,
      effectivePhase: "mid_year_review_manager",
      onDate: "2026-06-01",
    });
    assert.equal(access.canEditRowManagerHalfYearComments, true);
    assert.equal(access.canEditRowManagerFinalFields, false);
  });

  it("locks half-year manager comments when final evaluation window is open", () => {
    const access = getPmdfFieldAccess({
      cycle: sampleCycle({
        yearEndManagerOpen: "2026-01-01",
        yearEndManagerDeadline: "2026-12-31",
      }),
      form: sampleForm(),
      role: "employee",
      isEmployee: false,
      isManager: true,
      employeeObjectivesLocked: true,
      effectivePhase: "year_end_evaluation_manager",
      onDate: "2026-11-01",
    });
    assert.equal(access.canEditRowManagerHalfYearComments, false);
    assert.equal(access.canEditRowManagerFinalFields, true);
    assert.equal(access.canEditSelfScores, false);
  });

  it("allows self scores only in year-end employee window", () => {
    const midYear = getPmdfFieldAccess({
      cycle: sampleCycle({
        midYearEmployeeOpen: "2026-01-01",
        midYearEmployeeDeadline: "2026-12-31",
      }),
      form: sampleForm(),
      role: "employee",
      isEmployee: true,
      isManager: false,
      employeeObjectivesLocked: true,
      effectivePhase: "mid_year_review_employee",
      onDate: "2026-06-01",
    });
    assert.equal(midYear.canEditSelfScores, false);

    const finalYear = getPmdfFieldAccess({
      cycle: sampleCycle({
        yearEndEmployeeOpen: "2026-01-01",
        yearEndEmployeeDeadline: "2026-12-31",
      }),
      form: sampleForm(),
      role: "employee",
      isEmployee: true,
      isManager: false,
      employeeObjectivesLocked: true,
      effectivePhase: "year_end_evaluation_employee",
      onDate: "2026-11-01",
    });
    assert.equal(finalYear.canEditSelfScores, true);
  });
});
