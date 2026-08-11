import type { PerformanceCycle, PmdfForm } from "@/lib/store/types";
import type { RoleId } from "@/lib/roles";
import { hasExecAccess } from "@/lib/roles";
import {
  hrReopenGrantsFinalEmployeeWindow,
  hrReopenGrantsFinalManagerWindow,
  hrReopenGrantsMidYearEmployeeWindow,
  hrReopenGrantsMidYearManagerWindow,
  hrReopenGrantsObjectiveWindow,
  isDevelopmentGoalsLocked,
  isEmployeeObjectivesHrReopened,
  isHrReopenActiveForUser,
  isPerformanceGoalsLocked,
} from "@/lib/pmdf-hr-reopen";

export type PmdfFieldAccess = {
  canEditEmployeeObjectiveFields: boolean;
  canEditPerformanceWeights: boolean;
  canEditEmployeeDevelopmentFields: boolean;
  canEditDevelopmentWeights: boolean;
  canEditEmployeeMidYearFeedback: boolean;
  canEditEmployeeFinalFeedback: boolean;
  canEditEmployeeSignature: boolean;
  canEditRowManagerHalfYearComments: boolean;
  canEditRowManagerFinalFields: boolean;
  canEditManagerFeedbackMidYear: boolean;
  canEditManagerFeedbackFinal: boolean;
  canEditManagerSignature: boolean;
  canEditSelfScores: boolean;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inclusive date window using YYYY-MM-DD strings. Null open = no start limit; null close = no end limit. */
export function isWithinDateWindow(open: string | null, close: string | null, onDate = todayIso()): boolean {
  if (open && onDate < open) return false;
  if (close && onDate > close) return false;
  return true;
}

function windowOpen(cycle: PerformanceCycle | undefined, openKey: keyof PerformanceCycle, closeKey: keyof PerformanceCycle): boolean {
  if (!cycle) return false;
  const open = cycle[openKey] as string | null;
  const close = cycle[closeKey] as string | null;
  if (!open && !close) return false;
  return isWithinDateWindow(open, close);
}

function allLocked(): PmdfFieldAccess {
  return {
    canEditEmployeeObjectiveFields: false,
    canEditPerformanceWeights: false,
    canEditEmployeeDevelopmentFields: false,
    canEditDevelopmentWeights: false,
    canEditEmployeeMidYearFeedback: false,
    canEditEmployeeFinalFeedback: false,
    canEditEmployeeSignature: false,
    canEditRowManagerHalfYearComments: false,
    canEditRowManagerFinalFields: false,
    canEditManagerFeedbackMidYear: false,
    canEditManagerFeedbackFinal: false,
    canEditManagerSignature: false,
    canEditSelfScores: false,
  };
}

function allOpen(): PmdfFieldAccess {
  return {
    canEditEmployeeObjectiveFields: true,
    canEditPerformanceWeights: true,
    canEditEmployeeDevelopmentFields: true,
    canEditDevelopmentWeights: true,
    canEditEmployeeMidYearFeedback: true,
    canEditEmployeeFinalFeedback: true,
    canEditEmployeeSignature: true,
    canEditRowManagerHalfYearComments: true,
    canEditRowManagerFinalFields: true,
    canEditManagerFeedbackMidYear: true,
    canEditManagerFeedbackFinal: true,
    canEditManagerSignature: true,
    canEditSelfScores: true,
  };
}

export function getPmdfFieldAccess(args: {
  cycle: PerformanceCycle | undefined;
  form: PmdfForm;
  role: RoleId;
  isEmployee: boolean;
  isManager: boolean;
  performanceGoalsLocked?: boolean;
  developmentGoalsLocked?: boolean;
  effectivePhase: PmdfForm["phase"];
  onDate?: string;
}): PmdfFieldAccess {
  const { cycle, form, role, isEmployee, isManager, effectivePhase } = args;
  const performanceGoalsLocked = args.performanceGoalsLocked ?? isPerformanceGoalsLocked(form, cycle);
  const developmentGoalsLocked = args.developmentGoalsLocked ?? isDevelopmentGoalsLocked(form, cycle);
  const hr = hasExecAccess(role);
  const globallyLocked = !!(form.locked || cycle?.locked);
  const managerOnForm = isManager && !isEmployee;
  const hrReopenForUser = isHrReopenActiveForUser(form, isEmployee, isManager);

  if (hr) return allOpen();

  if (hrReopenForUser && form.hrReopenedStage === "objective_setting_employee") {
    return {
      ...allLocked(),
      canEditEmployeeObjectiveFields: !form.employeePerformanceGoalsSubmittedAt,
      canEditPerformanceWeights: !form.employeePerformanceGoalsSubmittedAt,
      canEditEmployeeDevelopmentFields: !form.employeeDevelopmentGoalsSubmittedAt,
      canEditDevelopmentWeights: !form.employeeDevelopmentGoalsSubmittedAt,
    };
  }

  if (hrReopenForUser && form.hrReopenedStage === "mid_year_review_employee") {
    return {
      ...allLocked(),
      canEditEmployeeMidYearFeedback: true,
    };
  }

  if (hrReopenForUser && form.hrReopenedStage === "mid_year_review_manager") {
    return {
      ...allLocked(),
      canEditRowManagerHalfYearComments: true,
      canEditManagerFeedbackMidYear: true,
    };
  }

  if (hrReopenForUser && form.hrReopenedStage === "year_end_evaluation_employee") {
    return {
      ...allLocked(),
      canEditEmployeeFinalFeedback: true,
      canEditEmployeeSignature: true,
      canEditSelfScores: true,
    };
  }

  if (hrReopenForUser && form.hrReopenedStage === "year_end_evaluation_manager") {
    return {
      ...allLocked(),
      canEditRowManagerFinalFields: true,
      canEditManagerFeedbackFinal: true,
      canEditManagerSignature: true,
    };
  }

  if (globallyLocked) return allLocked();

  const objectiveWindow =
    hrReopenGrantsObjectiveWindow(form, isEmployee) ||
    windowOpen(cycle, "objectiveSettingEmployeeOpen", "objectiveSettingEmployeeDeadline") ||
    effectivePhase === "objective_setting_employee";

  const midYearManagerWindow =
    hrReopenGrantsMidYearManagerWindow(form, isManager, isEmployee) ||
    windowOpen(cycle, "midYearManagerOpen", "midYearManagerDeadline") ||
    effectivePhase === "mid_year_review_manager";

  const midYearEmployeeWindow =
    hrReopenGrantsMidYearEmployeeWindow(form, isEmployee) ||
    windowOpen(cycle, "midYearEmployeeOpen", "midYearEmployeeDeadline") ||
    effectivePhase === "mid_year_review_employee";

  const finalManagerWindow =
    hrReopenGrantsFinalManagerWindow(form, isManager, isEmployee) ||
    windowOpen(cycle, "yearEndManagerOpen", "yearEndManagerDeadline") ||
    effectivePhase === "year_end_evaluation_manager" ||
    effectivePhase === "finalization";

  const finalEmployeeWindow =
    hrReopenGrantsFinalEmployeeWindow(form, isEmployee) ||
    windowOpen(cycle, "yearEndEmployeeOpen", "yearEndEmployeeDeadline") ||
    effectivePhase === "year_end_evaluation_employee";

  const canEditPerformance = isEmployee && !performanceGoalsLocked && objectiveWindow;
  const canEditDevelopment = isEmployee && !developmentGoalsLocked && objectiveWindow;

  return {
    canEditEmployeeObjectiveFields: canEditPerformance,
    canEditPerformanceWeights: canEditPerformance,
    canEditEmployeeDevelopmentFields: canEditDevelopment,
    canEditDevelopmentWeights: canEditDevelopment,
    canEditEmployeeMidYearFeedback: isEmployee && midYearEmployeeWindow,
    canEditEmployeeFinalFeedback: isEmployee && finalEmployeeWindow,
    canEditEmployeeSignature: isEmployee && finalEmployeeWindow,
    canEditRowManagerHalfYearComments: managerOnForm && midYearManagerWindow && !finalManagerWindow,
    canEditRowManagerFinalFields: managerOnForm && finalManagerWindow,
    canEditManagerFeedbackMidYear: managerOnForm && midYearManagerWindow && !finalManagerWindow,
    canEditManagerFeedbackFinal: managerOnForm && finalManagerWindow,
    canEditManagerSignature: managerOnForm && finalManagerWindow,
    canEditSelfScores: isEmployee && finalEmployeeWindow,
  };
}

export function canEditPmdfForm(args: {
  cycle: PerformanceCycle | undefined;
  form: PmdfForm;
  role: RoleId;
  isEmployee: boolean;
  isManager: boolean;
  performanceGoalsLocked?: boolean;
  developmentGoalsLocked?: boolean;
  effectivePhase: PmdfForm["phase"];
}): boolean {
  if (hasExecAccess(args.role)) return true;
  if (isHrReopenActiveForUser(args.form, args.isEmployee, args.isManager)) return true;
  if (args.isEmployee && isEmployeeObjectivesHrReopened(args.form)) return true;
  if (args.form.locked || args.cycle?.locked) return false;
  if (!args.isEmployee && !args.isManager) return false;

  const access = getPmdfFieldAccess(args);
  return (
    access.canEditEmployeeObjectiveFields ||
    access.canEditPerformanceWeights ||
    access.canEditEmployeeDevelopmentFields ||
    access.canEditDevelopmentWeights ||
    access.canEditEmployeeMidYearFeedback ||
    access.canEditEmployeeFinalFeedback ||
    access.canEditEmployeeSignature ||
    access.canEditRowManagerHalfYearComments ||
    access.canEditRowManagerFinalFields ||
    access.canEditManagerFeedbackMidYear ||
    access.canEditManagerFeedbackFinal ||
    access.canEditManagerSignature ||
    access.canEditSelfScores
  );
}
