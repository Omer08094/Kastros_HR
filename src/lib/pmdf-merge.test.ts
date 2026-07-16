import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergePmdfFormFields, type PmdfFormFields } from "./pmdf-merge";
import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "./store/types";

function emptyFields(): PmdfFormFields {
  return {
    functionalArea: null,
    locationCategory: null,
    subDepartment: null,
    businessObjectives: [],
    developmentObjectives: [],
    employeeFeedbackMidYear: "",
    managerFeedbackMidYear: "",
    employeeFeedbackFy: "",
    managerFeedbackFy: "",
    employeeSignature: "",
    managerSignature: "",
  };
}

function sampleBusinessRow(overrides: Partial<PmdfBusinessObjective> = {}): PmdfBusinessObjective {
  return {
    id: "bo-1",
    sortOrder: 1,
    objectiveSmart: "Increase sales by 10%",
    action: "Weekly pipeline reviews",
    employeeComments: "On track",
    percentage: 50,
    selfScoreFy: 4,
    finalScoreFy: null,
    managerCommentsHalfYear: "",
    managerCommentsFullYear: "",
    ...overrides,
  };
}

function sampleDevRow(overrides: Partial<PmdfDevelopmentObjective> = {}): PmdfDevelopmentObjective {
  return {
    id: "do-1",
    sortOrder: 1,
    pillar: "Accountability",
    developmentArea: "",
    actionPlan: "Send weekly updates",
    percentage: 100,
    selfScoreFy: 3,
    finalScoreFy: null,
    managerCommentsHalfYear: "",
    managerCommentsFullYear: "",
    ...overrides,
  };
}

describe("mergePmdfFormFields", () => {
  it("preserves employee objective text when manager saves with empty client state", () => {
    const existing: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [sampleBusinessRow()],
      developmentObjectives: [sampleDevRow()],
      employeeFeedbackFy: "Strong year overall",
    };

    const incoming: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [
        sampleBusinessRow({
          objectiveSmart: "",
          action: "",
          employeeComments: "",
          percentage: 0,
          selfScoreFy: null,
          finalScoreFy: 5,
          managerCommentsFullYear: "Exceeded target",
        }),
      ],
      developmentObjectives: [
        sampleDevRow({
          pillar: "",
          actionPlan: "",
          percentage: 0,
          selfScoreFy: null,
          finalScoreFy: 4,
          managerCommentsFullYear: "Good progress",
        }),
      ],
      managerFeedbackFy: "Well done",
      managerSignature: "Manager Name",
    };

    const merged = mergePmdfFormFields(existing, incoming, "manager");

    assert.equal(merged.businessObjectives[0]?.objectiveSmart, "Increase sales by 10%");
    assert.equal(merged.businessObjectives[0]?.action, "Weekly pipeline reviews");
    assert.equal(merged.businessObjectives[0]?.employeeComments, "On track");
    assert.equal(merged.businessObjectives[0]?.selfScoreFy, 4);
    assert.equal(merged.businessObjectives[0]?.finalScoreFy, 5);
    assert.equal(merged.businessObjectives[0]?.managerCommentsFullYear, "Exceeded target");

    assert.equal(merged.developmentObjectives[0]?.pillar, "Accountability");
    assert.equal(merged.developmentObjectives[0]?.actionPlan, "Send weekly updates");
    assert.equal(merged.developmentObjectives[0]?.finalScoreFy, 4);

    assert.equal(merged.employeeFeedbackFy, "Strong year overall");
    assert.equal(merged.managerFeedbackFy, "Well done");
    assert.equal(merged.managerSignature, "Manager Name");
  });

  it("preserves manager fields when employee saves", () => {
    const existing: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [
        sampleBusinessRow({
          finalScoreFy: 5,
          managerCommentsFullYear: "Excellent delivery",
        }),
      ],
      managerFeedbackFy: "Great work",
      managerSignature: "Manager Name",
    };

    const incoming: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [
        sampleBusinessRow({
          objectiveSmart: "Updated objective",
          finalScoreFy: null,
          managerCommentsFullYear: "",
        }),
      ],
      employeeFeedbackFy: "My reflection",
      employeeSignature: "Employee Name",
    };

    const merged = mergePmdfFormFields(existing, incoming, "employee");

    assert.equal(merged.businessObjectives[0]?.objectiveSmart, "Updated objective");
    assert.equal(merged.businessObjectives[0]?.finalScoreFy, 5);
    assert.equal(merged.businessObjectives[0]?.managerCommentsFullYear, "Excellent delivery");
    assert.equal(merged.managerFeedbackFy, "Great work");
    assert.equal(merged.managerSignature, "Manager Name");
    assert.equal(merged.employeeFeedbackFy, "My reflection");
    assert.equal(merged.employeeSignature, "Employee Name");
  });

  it("replaces all fields for HR saves", () => {
    const existing: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [sampleBusinessRow()],
      managerFeedbackFy: "Old manager note",
    };

    const incoming: PmdfFormFields = {
      ...emptyFields(),
      businessObjectives: [sampleBusinessRow({ objectiveSmart: "HR edited objective" })],
      managerFeedbackFy: "HR replaced note",
    };

    const merged = mergePmdfFormFields(existing, incoming, "hr");

    assert.equal(merged.businessObjectives[0]?.objectiveSmart, "HR edited objective");
    assert.equal(merged.managerFeedbackFy, "HR replaced note");
  });
});
