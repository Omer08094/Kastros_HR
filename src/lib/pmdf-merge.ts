import type {
  PmdfBusinessObjective,
  PmdfDevelopmentObjective,
} from "@/lib/store/types";

export type PmdfSaveRole = "employee" | "manager" | "hr";

export type PmdfFormFields = {
  functionalArea: string | null;
  locationCategory: string | null;
  subDepartment: string | null;
  businessObjectives: PmdfBusinessObjective[];
  developmentObjectives: PmdfDevelopmentObjective[];
  employeeFeedbackMidYear: string;
  managerFeedbackMidYear: string;
  employeeFeedbackFy: string;
  managerFeedbackFy: string;
  employeeSignature: string;
  managerSignature: string;
};

function findExistingRow<T extends { id: string }>(existing: T[], incoming: T, index: number): T {
  return existing.find((r) => r.id === incoming.id) ?? existing[index] ?? incoming;
}

function mergeBusinessObjectives(
  existing: PmdfBusinessObjective[],
  incoming: PmdfBusinessObjective[],
  role: PmdfSaveRole,
): PmdfBusinessObjective[] {
  if (role === "hr") return incoming;

  return incoming.map((row, i) => {
    const prev = findExistingRow(existing, row, i);
    if (role === "employee") {
      return {
        ...row,
        finalScoreFy: prev.finalScoreFy,
        managerCommentsHalfYear: prev.managerCommentsHalfYear,
        managerCommentsFullYear: prev.managerCommentsFullYear,
      };
    }
    return {
      ...prev,
      finalScoreFy: row.finalScoreFy,
      managerCommentsHalfYear: row.managerCommentsHalfYear,
      managerCommentsFullYear: row.managerCommentsFullYear,
      percentage: row.percentage,
    };
  });
}

function mergeDevelopmentObjectives(
  existing: PmdfDevelopmentObjective[],
  incoming: PmdfDevelopmentObjective[],
  role: PmdfSaveRole,
): PmdfDevelopmentObjective[] {
  if (role === "hr") return incoming;

  return incoming.map((row, i) => {
    const prev = findExistingRow(existing, row, i);
    if (role === "employee") {
      return {
        ...row,
        finalScoreFy: prev.finalScoreFy,
        managerCommentsHalfYear: prev.managerCommentsHalfYear,
        managerCommentsFullYear: prev.managerCommentsFullYear,
      };
    }
    return {
      ...prev,
      finalScoreFy: row.finalScoreFy,
      managerCommentsHalfYear: row.managerCommentsHalfYear,
      managerCommentsFullYear: row.managerCommentsFullYear,
      percentage: row.percentage,
    };
  });
}

/** Merge client-submitted PMDF fields with the stored record based on who is saving. */
export function mergePmdfFormFields(
  existing: PmdfFormFields,
  incoming: PmdfFormFields,
  role: PmdfSaveRole,
): PmdfFormFields {
  if (role === "hr") return incoming;

  const businessObjectives = mergeBusinessObjectives(existing.businessObjectives, incoming.businessObjectives, role);
  const developmentObjectives = mergeDevelopmentObjectives(
    existing.developmentObjectives,
    incoming.developmentObjectives,
    role,
  );

  if (role === "employee") {
    return {
      functionalArea: incoming.functionalArea,
      locationCategory: incoming.locationCategory,
      subDepartment: incoming.subDepartment,
      businessObjectives,
      developmentObjectives,
      employeeFeedbackMidYear: incoming.employeeFeedbackMidYear,
      managerFeedbackMidYear: existing.managerFeedbackMidYear,
      employeeFeedbackFy: incoming.employeeFeedbackFy,
      managerFeedbackFy: existing.managerFeedbackFy,
      employeeSignature: incoming.employeeSignature,
      managerSignature: existing.managerSignature,
    };
  }

  return {
    functionalArea: existing.functionalArea,
    locationCategory: existing.locationCategory,
    subDepartment: existing.subDepartment,
    businessObjectives,
    developmentObjectives,
    employeeFeedbackMidYear: existing.employeeFeedbackMidYear,
    managerFeedbackMidYear: incoming.managerFeedbackMidYear,
    employeeFeedbackFy: existing.employeeFeedbackFy,
    managerFeedbackFy: incoming.managerFeedbackFy,
    employeeSignature: existing.employeeSignature,
    managerSignature: incoming.managerSignature,
  };
}

/** After employee submits performance goals once, preserve performance goal fields on subsequent saves. */
export function applyEmployeePerformanceLock(existing: PmdfFormFields, merged: PmdfFormFields): PmdfFormFields {
  return {
    ...merged,
    functionalArea: existing.functionalArea,
    locationCategory: existing.locationCategory,
    subDepartment: existing.subDepartment,
    businessObjectives: merged.businessObjectives.map((row, i) => {
      const prev = findExistingRow(existing.businessObjectives, row, i);
      return {
        ...row,
        objectiveSmart: prev.objectiveSmart,
        action: prev.action,
        employeeComments: prev.employeeComments,
        percentage: prev.percentage,
      };
    }),
  };
}

/** After employee submits development goals once, preserve development goal fields on subsequent saves. */
export function applyEmployeeDevelopmentLock(existing: PmdfFormFields, merged: PmdfFormFields): PmdfFormFields {
  return {
    ...merged,
    developmentObjectives: merged.developmentObjectives.map((row, i) => {
      const prev = findExistingRow(existing.developmentObjectives, row, i);
      return {
        ...row,
        pillar: prev.pillar,
        developmentArea: prev.developmentArea,
        actionPlan: prev.actionPlan,
        percentage: prev.percentage,
      };
    }),
  };
}

/** @deprecated Use applyEmployeePerformanceLock and applyEmployeeDevelopmentLock separately. */
export function applyEmployeeObjectiveLock(existing: PmdfFormFields, merged: PmdfFormFields): PmdfFormFields {
  return applyEmployeeDevelopmentLock(existing, applyEmployeePerformanceLock(existing, merged));
}
