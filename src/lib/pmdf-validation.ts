import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "@/lib/store/types";
import { sumPercentages } from "@/lib/pmdf-scoring";

export const PMDF_WEIGHT_TOTAL = 100;
export const PMDF_WEIGHT_TOLERANCE = 0.01;
export const MIN_DEVELOPMENT_TRAITS = 3;

export type PmdfWeightFields = {
  businessObjectives: PmdfBusinessObjective[];
  developmentObjectives: PmdfDevelopmentObjective[];
};

export function calcWeightTotals(fields: PmdfWeightFields): {
  businessTotal: number;
  developmentTotal: number;
} {
  return {
    businessTotal: sumPercentages(fields.businessObjectives.map((r) => r.percentage)),
    developmentTotal: sumPercentages(fields.developmentObjectives.map((r) => r.percentage)),
  };
}

export function isWeightTotalExact(total: number): boolean {
  return Math.abs(total - PMDF_WEIGHT_TOTAL) <= PMDF_WEIGHT_TOLERANCE;
}

export function validateDevelopmentTraits(developmentObjectives: PmdfDevelopmentObjective[]): string | null {
  const active = developmentObjectives.filter((r) => r.actionPlan.trim() || r.percentage > 0);
  if (active.length === 0) return null;
  if (active.length < MIN_DEVELOPMENT_TRAITS) {
    return `At least ${MIN_DEVELOPMENT_TRAITS} development traits are required (currently ${active.length}).`;
  }
  for (const row of active) {
    if (!row.pillar.trim()) return "Each development trait needs a name.";
  }
  return null;
}

/** Strict validation for one-time employee objective submit — both sections must total 100%. */
export function validateObjectiveSubmitWeights(fields: PmdfWeightFields): string | null {
  const { businessTotal, developmentTotal } = calcWeightTotals(fields);

  if (!isWeightTotalExact(businessTotal)) {
    return `Performance goals must total 100% (currently ${businessTotal}%).`;
  }
  if (!isWeightTotalExact(developmentTotal)) {
    return `Development goals must total 100% (currently ${developmentTotal}%).`;
  }

  const traitsError = validateDevelopmentTraits(fields.developmentObjectives);
  if (traitsError) return traitsError;

  return null;
}

export function objectiveSubmitWeightsValid(fields: PmdfWeightFields): boolean {
  return validateObjectiveSubmitWeights(fields) === null;
}

export function validatePmdfWeightTotals(
  fields: PmdfWeightFields,
  options: { skipWeightValidation: boolean; strictTotals: boolean },
): string | null {
  if (options.skipWeightValidation) return null;

  const { businessTotal, developmentTotal } = calcWeightTotals(fields);
  const boHasPct = fields.businessObjectives.some((r) => r.percentage > 0);
  const doHasPct = fields.developmentObjectives.some((r) => r.percentage > 0);

  if (options.strictTotals) {
    if (!isWeightTotalExact(businessTotal)) {
      return `Performance goals must total 100% (currently ${businessTotal}%).`;
    }
    if (!isWeightTotalExact(developmentTotal)) {
      return `Development goals must total 100% (currently ${developmentTotal}%).`;
    }
    return null;
  }

  if (boHasPct && !isWeightTotalExact(businessTotal)) {
    return `Business objectives must total 100% (currently ${businessTotal}%).`;
  }
  if (doHasPct && !isWeightTotalExact(developmentTotal)) {
    return `Development objectives must total 100% (currently ${developmentTotal}%).`;
  }

  return null;
}
