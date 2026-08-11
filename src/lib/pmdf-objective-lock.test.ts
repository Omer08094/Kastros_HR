import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canHrReopenEmployeeGoals,
  formHasEmployeeGoalContent,
  isEmployeeGoalsLocked,
  isEmployeeGoalsReopenedForResubmit,
} from "./pmdf-objective-lock";
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
    employeeObjectivesReopenedAt: null,
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
    assert.equal(formHasEmployeeGoalContent(sampleForm()), true);
    assert.equal(formHasEmployeeGoalContent(sampleForm({ businessObjectives: [] })), false);
  });
});

describe("isEmployeeGoalsLocked", () => {
  it("locks when employeeObjectivesSubmittedAt is set", () => {
    assert.equal(
      isEmployeeGoalsLocked(sampleForm({ employeeObjectivesSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle()),
      true,
    );
  });

  it("unlocks when HR reopened awaiting resubmit", () => {
    assert.equal(
      isEmployeeGoalsLocked(
        sampleForm({
          employeeObjectivesSubmittedAt: null,
          employeeObjectivesReopenedAt: "2026-03-02T00:00:00.000Z",
        }),
        sampleCycle({ locked: true }),
      ),
      false,
    );
  });

  it("locks legacy forms when cycle is locked with goal content", () => {
    assert.equal(
      isEmployeeGoalsLocked(sampleForm(), sampleCycle({ locked: true })),
      true,
    );
  });

  it("locks legacy forms when phase moved past objective setting", () => {
    assert.equal(
      isEmployeeGoalsLocked(sampleForm(), sampleCycle({ currentPhase: "mid_year_review_employee" })),
      true,
    );
  });

  it("does not lock empty drafting forms in objective phase", () => {
    assert.equal(
      isEmployeeGoalsLocked(sampleForm({ businessObjectives: [] }), sampleCycle()),
      false,
    );
  });
});

describe("canHrReopenEmployeeGoals", () => {
  it("allows reopen for submitted modern form", () => {
    assert.equal(
      canHrReopenEmployeeGoals(sampleForm({ employeeObjectivesSubmittedAt: "2026-03-01T00:00:00.000Z" }), sampleCycle()),
      true,
    );
  });

  it("allows reopen for legacy locked cycle with goals", () => {
    assert.equal(canHrReopenEmployeeGoals(sampleForm(), sampleCycle({ locked: true })), true);
  });

  it("blocks when already reopened awaiting employee", () => {
    assert.equal(
      canHrReopenEmployeeGoals(
        sampleForm({ employeeObjectivesReopenedAt: "2026-03-02T00:00:00.000Z" }),
        sampleCycle({ locked: true }),
      ),
      false,
    );
  });
});

describe("isEmployeeGoalsReopenedForResubmit", () => {
  it("is true only when reopened and not yet resubmitted", () => {
    assert.equal(
      isEmployeeGoalsReopenedForResubmit(
        sampleForm({ employeeObjectivesReopenedAt: "2026-03-02T00:00:00.000Z" }),
      ),
      true,
    );
    assert.equal(
      isEmployeeGoalsReopenedForResubmit(
        sampleForm({
          employeeObjectivesReopenedAt: "2026-03-02T00:00:00.000Z",
          employeeObjectivesSubmittedAt: "2026-03-03T00:00:00.000Z",
        }),
      ),
      false,
    );
  });
});
