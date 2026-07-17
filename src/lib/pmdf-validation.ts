import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "@/lib/store/types";
import { sumPercentages } from "@/lib/pmdf-scoring";

export const PMDF_PERFORMANCE_WEIGHT_TOTAL = 100;
export const PMDF_DEVELOPMENT_OVERALL_SHARE = 0.2;
export const PMDF_PERFORMANCE_OVERALL_SHARE = 0.8;
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

export function isWeightTotalExact(total: number, target = PMDF_PERFORMANCE_WEIGHT_TOTAL): boolean {
  return Math.abs(total - target) <= PMDF_WEIGHT_TOLERANCE;
}

/** Split 100% evenly across active development traits (weights are not employee-editable). */
export function distributeDevelopmentWeights(rows: PmdfDevelopmentObjective[]): PmdfDevelopmentObjective[] {
  const activeIndices = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.actionPlan.trim() || r.percentage > 0);
  if (activeIndices.length === 0) {
    return rows.map((r) => ({ ...r, percentage: 0 }));
  }
  const base = Math.floor(PMDF_PERFORMANCE_WEIGHT_TOTAL / activeIndices.length);
  let remainder = PMDF_PERFORMANCE_WEIGHT_TOTAL - base * activeIndices.length;
  const activeSet = new Set(activeIndices.map(({ i }) => i));
  return rows.map((r, i) => {
    if (!activeSet.has(i)) return { ...r, percentage: 0 };
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder -= 1;
    return { ...r, percentage: base + extra };
  });
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

/** Strict validation for one-time employee objective submit. */
export function validateObjectiveSubmitWeights(fields: PmdfWeightFields): string | null {
  const distributed = {
    ...fields,
    developmentObjectives: distributeDevelopmentWeights(fields.developmentObjectives),
  };
  const { businessTotal } = calcWeightTotals(distributed);

  if (!isWeightTotalExact(businessTotal)) {
    return `Performance goals must total 100% (currently ${businessTotal}%).`;
  }

  const traitsError = validateDevelopmentTraits(distributed.developmentObjectives);
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

  const { businessTotal } = calcWeightTotals(fields);
  const boHasPct = fields.businessObjectives.some((r) => r.percentage > 0);

  if (options.strictTotals || boHasPct) {
    if (!isWeightTotalExact(businessTotal)) {
      return `Performance goals must total 100% (currently ${businessTotal}%).`;
    }
  }

  return null;
}

export function applyDevelopmentWeightPolicy(fields: PmdfWeightFields): PmdfWeightFields {
  return {
    ...fields,
    developmentObjectives: distributeDevelopmentWeights(fields.developmentObjectives),
  };
}
