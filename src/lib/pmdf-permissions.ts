import type { PerformanceCycle, PmdfForm } from "@/lib/store/types";
import type { RoleId } from "@/lib/roles";
import { hasExecAccess } from "@/lib/roles";
import { isEmployeeGoalsLocked, isEmployeeGoalsReopenedForResubmit } from "@/lib/pmdf-objective-lock";

export type PmdfFieldAccess = {
  canEditEmployeeObjectiveFields: boolean;
  canEditPerformanceWeights: boolean;
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
  employeeObjectivesLocked: boolean;
  effectivePhase: PmdfForm["phase"];
  onDate?: string;
}): PmdfFieldAccess {
  const { cycle, form, role, isEmployee, isManager, effectivePhase } = args;
  const employeeObjectivesLocked =
    args.employeeObjectivesLocked ?? isEmployeeGoalsLocked(form, cycle);
  const hr = hasExecAccess(role);
  const globallyLocked = !!(form.locked || cycle?.locked);
  const managerOnForm = isManager && !isEmployee;
  const reopenedForResubmit = isEmployee && isEmployeeGoalsReopenedForResubmit(form);

  if (hr) return allOpen();

  if (reopenedForResubmit) {
    return {
      ...allLocked(),
      canEditEmployeeObjectiveFields: true,
      canEditPerformanceWeights: true,
    };
  }

  if (globallyLocked) return allLocked();

  const objectiveWindow =
    windowOpen(cycle, "objectiveSettingEmployeeOpen", "objectiveSettingEmployeeDeadline") ||
    effectivePhase === "objective_setting_employee";

  const midYearManagerWindow =
    windowOpen(cycle, "midYearManagerOpen", "midYearManagerDeadline") ||
    effectivePhase === "mid_year_review_manager";

  const midYearEmployeeWindow =
    windowOpen(cycle, "midYearEmployeeOpen", "midYearEmployeeDeadline") ||
    effectivePhase === "mid_year_review_employee";

  const finalManagerWindow =
    windowOpen(cycle, "yearEndManagerOpen", "yearEndManagerDeadline") ||
    effectivePhase === "year_end_evaluation_manager" ||
    effectivePhase === "finalization";

  const finalEmployeeWindow =
    windowOpen(cycle, "yearEndEmployeeOpen", "yearEndEmployeeDeadline") ||
    effectivePhase === "year_end_evaluation_employee";

  const canEditGoals = isEmployee && !employeeObjectivesLocked && objectiveWindow;

  return {
    canEditEmployeeObjectiveFields: canEditGoals,
    canEditPerformanceWeights: canEditGoals,
    canEditDevelopmentWeights: false,
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
  employeeObjectivesLocked: boolean;
  effectivePhase: PmdfForm["phase"];
}): boolean {
  if (hasExecAccess(args.role)) return true;
  if (args.isEmployee && isEmployeeGoalsReopenedForResubmit(args.form)) return true;
  if (args.form.locked || args.cycle?.locked) return false;
  if (!args.isEmployee && !args.isManager) return false;

  const access = getPmdfFieldAccess(args);
  return (
    access.canEditEmployeeObjectiveFields ||
    access.canEditPerformanceWeights ||
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
