import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "@/lib/store/types";

function weightedScore(rows: Array<{ percentage: number; score: number | null }>): number {
  return rows.reduce((sum, row) => {
    if (row.score == null || !Number.isFinite(row.score)) return sum;
    return sum + (row.percentage / 100) * row.score;
  }, 0);
}

export function sumPercentages(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function calcBusinessSelfWeightage(rows: PmdfBusinessObjective[]): number {
  return weightedScore(rows.map((r) => ({ percentage: r.percentage, score: r.selfScoreFy })));
}

export function calcBusinessFinalWeightage(rows: PmdfBusinessObjective[]): number {
  return weightedScore(rows.map((r) => ({ percentage: r.percentage, score: r.finalScoreFy })));
}

export function calcDevelopmentSelfWeightage(rows: PmdfDevelopmentObjective[]): number {
  return weightedScore(rows.map((r) => ({ percentage: r.percentage, score: r.selfScoreFy })));
}

export function calcDevelopmentFinalWeightage(rows: PmdfDevelopmentObjective[]): number {
  return weightedScore(rows.map((r) => ({ percentage: r.percentage, score: r.finalScoreFy })));
}

export function calcPmdfScores(
  business: PmdfBusinessObjective[],
  development: PmdfDevelopmentObjective[],
) {
  const businessSelf = calcBusinessSelfWeightage(business);
  const businessFinal = calcBusinessFinalWeightage(business);
  const developmentSelf = calcDevelopmentSelfWeightage(development);
  const developmentFinal = calcDevelopmentFinalWeightage(development);
  const businessRating70 = businessFinal * 0.7;
  const developmentRating30 = developmentFinal * 0.3;
  const overallPmdpScore = businessRating70 + developmentRating30;
  return {
    businessTotalPercentage: sumPercentages(business.map((r) => r.percentage)),
    developmentTotalPercentage: sumPercentages(development.map((r) => r.percentage)),
    businessSelf,
    businessFinal,
    developmentSelf,
    developmentFinal,
    businessRating70,
    developmentRating30,
    overallPmdpScore,
  };
}
