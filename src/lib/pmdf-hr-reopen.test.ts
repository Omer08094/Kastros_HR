import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canHrReopenStage,
  formHasEmployeeGoalContent,
  formHasPerformanceGoalContent,
  isDevelopmentGoalsLocked,
  isEmployeeGoalsLocked,
  isEmployeeObjectivesHrReopened,
  isHrReopenActiveForUser,
  isPerformanceGoalsLocked,
  isStageLockedForRole,
} from "./pmdf-hr-reopen";
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
    businessObjectives: [
      {
        id: "bo-1",
        sortOrder: 1,
        objectiveSmart: "Grow revenue",
        action: "Weekly review",
        employeeComments: "",
        percentage: 100,
        selfScoreFy: null,
        finalScoreFy: null,
        managerCommentsHalfYear: "",
        managerCommentsFullYear: "",
      },
    ],
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

describe("formHasEmployeeGoalContent", () => {
  it("detects business objective content", () => {
    assert.equal(formHasPerformanceGoalContent(sampleForm()), true);
    assert.equal(formHasEmployeeGoalContent(sampleForm()), true);
    assert.equal(formHasEmployeeGoalContent(sampleForm({ businessObjectives: [] })), false);
  });
});

describe("isPerformanceGoalsLocked", () => {
  it("locks when employeePerformanceGoalsSubmittedAt is set", () => {
    assert.equal(
      isPerformanceGoalsLocked(sampleForm({ employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle()),
      true,
    );
  });

  it("does not lock development when only performance submitted", () => {
    assert.equal(
      isDevelopmentGoalsLocked(sampleForm({ employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle()),
      false,
    );
  });

  it("unlocks performance when HR reopened awaiting resubmit", () => {
    assert.equal(
      isPerformanceGoalsLocked(
        sampleForm({
          employeePerformanceGoalsSubmittedAt: null,
          hrReopenedStage: "objective_setting_employee",
        }),
        sampleCycle({ locked: true }),
      ),
      false,
    );
  });

  it("locks legacy forms when cycle is locked with goal content", () => {
    assert.equal(isPerformanceGoalsLocked(sampleForm(), sampleCycle({ locked: true })), true);
  });
});

describe("isEmployeeGoalsLocked", () => {
  it("is true when either section is locked", () => {
    assert.equal(
      isEmployeeGoalsLocked(sampleForm({ employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle()),
      true,
    );
    assert.equal(
      isEmployeeGoalsLocked(sampleForm(), sampleCycle({ locked: true })),
      true,
    );
  });
});

describe("isStageLockedForRole", () => {
  it("locks manager mid-year when cycle is locked", () => {
    assert.equal(
      isStageLockedForRole(sampleForm(), sampleCycle({ locked: true }), "mid_year_review_manager"),
      true,
    );
  });
});

describe("canHrReopenStage", () => {
  it("allows reopen when only performance submitted", () => {
    assert.equal(
      canHrReopenStage(sampleForm({ employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle(), "objective_setting_employee"),
      true,
    );
  });

  it("blocks when a reopen is already active", () => {
    assert.equal(
      canHrReopenStage(
        sampleForm({ hrReopenedStage: "mid_year_review_employee" }),
        sampleCycle({ locked: true }),
        "objective_setting_employee",
      ),
      false,
    );
  });
});

describe("isEmployeeObjectivesHrReopened", () => {
  it("is true when HR reopened and either section not resubmitted", () => {
    assert.equal(
      isEmployeeObjectivesHrReopened(
        sampleForm({
          hrReopenedStage: "objective_setting_employee",
          employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z",
        }),
      ),
      true,
    );
    assert.equal(
      isEmployeeObjectivesHrReopened(
        sampleForm({
          hrReopenedStage: "objective_setting_employee",
          employeePerformanceGoalsSubmittedAt: "2026-03-01T00:00:00.000Z",
          employeeDevelopmentGoalsSubmittedAt: "2026-03-02T00:00:00.000Z",
        }),
      ),
      false,
    );
  });
});

describe("isHrReopenActiveForUser", () => {
  it("grants employee access only for employee stages", () => {
    assert.equal(
      isHrReopenActiveForUser(sampleForm({ hrReopenedStage: "mid_year_review_employee" }), true, false),
      true,
    );
    assert.equal(
      isHrReopenActiveForUser(sampleForm({ hrReopenedStage: "mid_year_review_manager" }), true, false),
      false,
    );
  });
});
