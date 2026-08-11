import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  developmentGoalsSubmitValid,
  distributeDevelopmentWeights,
  objectiveSubmitWeightsValid,
  performanceGoalsSubmitValid,
  validateDevelopmentGoalsSubmit,
  validateObjectiveSubmitWeights,
  validatePerformanceGoalsSubmit,
  validatePmdfWeightTotals,
} from "./pmdf-validation";
import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "./store/types";

function sampleBusinessRow(overrides: Partial<PmdfBusinessObjective> = {}): PmdfBusinessObjective {
  return {
    id: "bo-1",
    sortOrder: 1,
    objectiveSmart: "Increase sales",
    action: "Weekly reviews",
    employeeComments: "",
    percentage: 100,
    selfScoreFy: null,
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
    actionPlan: "Weekly updates",
    percentage: 34,
    selfScoreFy: null,
    finalScoreFy: null,
    managerCommentsHalfYear: "",
    managerCommentsFullYear: "",
    ...overrides,
  };
}

describe("validatePerformanceGoalsSubmit", () => {
  it("accepts performance goals totalling 100%", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 100 })],
      developmentObjectives: [],
    };
    assert.equal(validatePerformanceGoalsSubmit(fields), null);
    assert.equal(performanceGoalsSubmitValid(fields), true);
  });

  it("rejects performance goals that do not total 100%", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 85 })],
      developmentObjectives: [],
    };
    assert.match(validatePerformanceGoalsSubmit(fields) ?? "", /Performance goals must total 100%/);
  });
});

describe("validateDevelopmentGoalsSubmit", () => {
  it("accepts at least three development traits", () => {
    const fields = {
      businessObjectives: [],
      developmentObjectives: [
        sampleDevRow({ id: "do-1", percentage: 34 }),
        sampleDevRow({ id: "do-2", pillar: "Initiative", percentage: 33 }),
        sampleDevRow({ id: "do-3", pillar: "Collaboration", percentage: 33 }),
      ],
    };
    assert.equal(validateDevelopmentGoalsSubmit(fields), null);
    assert.equal(developmentGoalsSubmitValid(fields), true);
  });

  it("rejects fewer than three traits", () => {
    const fields = {
      businessObjectives: [],
      developmentObjectives: [sampleDevRow({ id: "do-1", percentage: 100 })],
    };
    assert.match(validateDevelopmentGoalsSubmit(fields) ?? "", /At least 3 development traits/);
  });
});

describe("validateObjectiveSubmitWeights", () => {
  it("accepts valid performance 100% split with at least three development traits", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 100 })],
      developmentObjectives: [
        sampleDevRow({ id: "do-1", pillar: "Accountability", percentage: 34 }),
        sampleDevRow({ id: "do-2", pillar: "Initiative", percentage: 33 }),
        sampleDevRow({ id: "do-3", pillar: "Collaboration", percentage: 33 }),
      ],
    };

    assert.equal(validateObjectiveSubmitWeights(fields), null);
    assert.equal(objectiveSubmitWeightsValid(fields), true);
  });

  it("auto-distributes development weights and does not require employee-entered dev totals", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 100 })],
      developmentObjectives: [
        sampleDevRow({ id: "do-1", percentage: 30 }),
        sampleDevRow({ id: "do-2", pillar: "Initiative", percentage: 30 }),
        sampleDevRow({ id: "do-3", pillar: "Collaboration", percentage: 30 }),
      ],
    };

    assert.equal(validateObjectiveSubmitWeights(fields), null);
    const distributed = distributeDevelopmentWeights(fields.developmentObjectives);
    assert.equal(
      distributed.reduce((sum, row) => sum + row.percentage, 0),
      100,
    );
  });

  it("rejects performance goals that do not total 100%", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 85 })],
      developmentObjectives: [
        sampleDevRow({ id: "do-1", percentage: 34 }),
        sampleDevRow({ id: "do-2", pillar: "Initiative", percentage: 33 }),
        sampleDevRow({ id: "do-3", pillar: "Collaboration", percentage: 33 }),
      ],
    };

    const err = validateObjectiveSubmitWeights(fields);
    assert.match(err ?? "", /Performance goals must total 100%/);
    assert.equal(objectiveSubmitWeightsValid(fields), false);
  });

  it("rejects when all weights are 0%", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 0 })],
      developmentObjectives: [
        sampleDevRow({ id: "do-1", percentage: 0, actionPlan: "" }),
        sampleDevRow({ id: "do-2", pillar: "Initiative", percentage: 0, actionPlan: "" }),
        sampleDevRow({ id: "do-3", pillar: "Collaboration", percentage: 0, actionPlan: "" }),
      ],
    };

    const err = validateObjectiveSubmitWeights(fields);
    assert.match(err ?? "", /Performance goals must total 100%/);
  });
});

describe("validatePmdfWeightTotals", () => {
  it("uses strict totals when requested", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 0 })],
      developmentObjectives: [sampleDevRow({ percentage: 0, actionPlan: "" })],
    };

    assert.equal(
      validatePmdfWeightTotals(fields, { skipWeightValidation: false, strictTotals: true }),
      "Performance goals must total 100% (currently 0%).",
    );
  });

  it("allows zero totals in non-strict mode when no weights entered", () => {
    const fields = {
      businessObjectives: [sampleBusinessRow({ percentage: 0 })],
      developmentObjectives: [sampleDevRow({ percentage: 0, actionPlan: "" })],
    };

    assert.equal(
      validatePmdfWeightTotals(fields, { skipWeightValidation: false, strictTotals: false }),
      null,
    );
  });
});
