import type { PmdfBusinessObjective, PmdfDevelopmentObjective } from "@/lib/store/types";
import type { PmdfFormFields, PmdfSaveRole } from "@/lib/pmdf-merge";
import type { PmdfFieldAccess } from "@/lib/pmdf-permissions";

function findBo(existing: PmdfBusinessObjective[], row: PmdfBusinessObjective, index: number): PmdfBusinessObjective {
  return existing.find((r) => r.id === row.id) ?? existing[index] ?? row;
}

function findDo(existing: PmdfDevelopmentObjective[], row: PmdfDevelopmentObjective, index: number): PmdfDevelopmentObjective {
  return existing.find((r) => r.id === row.id) ?? existing[index] ?? row;
}

/** Revert fields the saver was not allowed to change (mirrors UI permissions). HR skips. */
export function applyPmdfFieldAccess(
  existing: PmdfFormFields,
  merged: PmdfFormFields,
  access: PmdfFieldAccess,
  saveRole: PmdfSaveRole,
): PmdfFormFields {
  if (saveRole === "hr") return merged;

  let result: PmdfFormFields = { ...merged };

  if (!access.canEditEmployeeObjectiveFields) {
    result = {
      ...result,
      functionalArea: existing.functionalArea,
      locationCategory: existing.locationCategory,
      subDepartment: existing.subDepartment,
      businessObjectives: merged.businessObjectives.map((row, i) => {
        const prev = findBo(existing.businessObjectives, row, i);
        return {
          ...row,
          objectiveSmart: prev.objectiveSmart,
          action: prev.action,
          employeeComments: prev.employeeComments,
        };
      }),
    };
  }

  if (!access.canEditEmployeeDevelopmentFields) {
    result = {
      ...result,
      developmentObjectives: merged.developmentObjectives.map((row, i) => {
        const prev = findDo(existing.developmentObjectives, row, i);
        return {
          ...row,
          pillar: prev.pillar,
          developmentArea: prev.developmentArea,
          actionPlan: prev.actionPlan,
        };
      }),
    };
  }

  if (!access.canEditPerformanceWeights) {
    result = {
      ...result,
      businessObjectives: result.businessObjectives.map((row, i) => {
        const prev = findBo(existing.businessObjectives, row, i);
        return { ...row, percentage: prev.percentage };
      }),
    };
  }

  if (!access.canEditDevelopmentWeights) {
    result = {
      ...result,
      developmentObjectives: result.developmentObjectives.map((row, i) => {
        const prev = findDo(existing.developmentObjectives, row, i);
        return { ...row, percentage: prev.percentage };
      }),
    };
  }

  if (!access.canEditSelfScores) {
    result = {
      ...result,
      businessObjectives: result.businessObjectives.map((row, i) => {
        const prev = findBo(existing.businessObjectives, row, i);
        return { ...row, selfScoreFy: prev.selfScoreFy };
      }),
      developmentObjectives: result.developmentObjectives.map((row, i) => {
        const prev = findDo(existing.developmentObjectives, row, i);
        return { ...row, selfScoreFy: prev.selfScoreFy };
      }),
    };
  }

  if (!access.canEditRowManagerHalfYearComments) {
    result = {
      ...result,
      businessObjectives: result.businessObjectives.map((row, i) => {
        const prev = findBo(existing.businessObjectives, row, i);
        return { ...row, managerCommentsHalfYear: prev.managerCommentsHalfYear };
      }),
      developmentObjectives: result.developmentObjectives.map((row, i) => {
        const prev = findDo(existing.developmentObjectives, row, i);
        return { ...row, managerCommentsHalfYear: prev.managerCommentsHalfYear };
      }),
    };
  }

  if (!access.canEditRowManagerFinalFields) {
    result = {
      ...result,
      businessObjectives: result.businessObjectives.map((row, i) => {
        const prev = findBo(existing.businessObjectives, row, i);
        return {
          ...row,
          finalScoreFy: prev.finalScoreFy,
          managerCommentsFullYear: prev.managerCommentsFullYear,
        };
      }),
      developmentObjectives: result.developmentObjectives.map((row, i) => {
        const prev = findDo(existing.developmentObjectives, row, i);
        return {
          ...row,
          finalScoreFy: prev.finalScoreFy,
          managerCommentsFullYear: prev.managerCommentsFullYear,
        };
      }),
    };
  }

  if (!access.canEditEmployeeMidYearFeedback) {
    result = { ...result, employeeFeedbackMidYear: existing.employeeFeedbackMidYear };
  }
  if (!access.canEditEmployeeFinalFeedback) {
    result = { ...result, employeeFeedbackFy: existing.employeeFeedbackFy };
  }
  if (!access.canEditEmployeeSignature) {
    result = { ...result, employeeSignature: existing.employeeSignature };
  }
  if (!access.canEditManagerFeedbackMidYear) {
    result = { ...result, managerFeedbackMidYear: existing.managerFeedbackMidYear };
  }
  if (!access.canEditManagerFeedbackFinal) {
    result = { ...result, managerFeedbackFy: existing.managerFeedbackFy };
  }
  if (!access.canEditManagerSignature) {
    result = { ...result, managerSignature: existing.managerSignature };
  }

  return result;
}
