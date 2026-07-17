import type { PerformanceCycle, PmdfForm } from "@/lib/store/types";
import type { RoleId } from "@/lib/roles";
import { hasExecAccess } from "@/lib/roles";

export type PmdfFieldAccess = {
  canEditEmployeeGoals: boolean;
  canEditPerformanceWeights: boolean;
  canEditDevelopmentWeights: boolean;
  canEditEmployeeMidYearFeedback: boolean;
  canEditEmployeeFinalFeedback: boolean;
  canEditEmployeeSignature: boolean;
  canEditManagerMidYear: boolean;
  canEditManagerFinal: boolean;
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
  const { cycle, form, role, isEmployee, isManager, employeeObjectivesLocked, effectivePhase } = args;
  const onDate = args.onDate ?? todayIso();
  const hr = hasExecAccess(role);
  const globallyLocked = !!(form.locked || cycle?.locked);

  if (hr) {
    return {
      canEditEmployeeGoals: true,
      canEditPerformanceWeights: true,
      canEditDevelopmentWeights: true,
      canEditEmployeeMidYearFeedback: true,
      canEditEmployeeFinalFeedback: true,
      canEditEmployeeSignature: true,
      canEditManagerMidYear: true,
      canEditManagerFinal: true,
      canEditSelfScores: true,
    };
  }

  if (globallyLocked) {
    return {
      canEditEmployeeGoals: false,
      canEditPerformanceWeights: false,
      canEditDevelopmentWeights: false,
      canEditEmployeeMidYearFeedback: false,
      canEditEmployeeFinalFeedback: false,
      canEditEmployeeSignature: false,
      canEditManagerMidYear: false,
      canEditManagerFinal: false,
      canEditSelfScores: false,
    };
  }

  const objectiveWindow =
    windowOpen(cycle, "objectiveSettingEmployeeOpen", "objectiveSettingEmployeeDeadline") ||
    effectivePhase === "objective_setting_employee" ||
    effectivePhase === "objective_setting_manager";

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
    canEditEmployeeGoals: canEditGoals,
    canEditPerformanceWeights: canEditGoals,
    canEditDevelopmentWeights: false,
    canEditEmployeeMidYearFeedback: isEmployee && midYearEmployeeWindow,
    canEditEmployeeFinalFeedback: isEmployee && finalEmployeeWindow,
    canEditEmployeeSignature: isEmployee && finalEmployeeWindow,
    canEditManagerMidYear: isManager && midYearManagerWindow,
    canEditManagerFinal: isManager && finalManagerWindow,
    canEditSelfScores: isEmployee && (midYearEmployeeWindow || finalEmployeeWindow),
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
  if (args.form.locked || args.cycle?.locked) return false;
  if (!args.isEmployee && !args.isManager) return false;

  const access = getPmdfFieldAccess(args);
  return (
    access.canEditEmployeeGoals ||
    access.canEditPerformanceWeights ||
    access.canEditEmployeeMidYearFeedback ||
    access.canEditEmployeeFinalFeedback ||
    access.canEditEmployeeSignature ||
    access.canEditManagerMidYear ||
    access.canEditManagerFinal ||
    access.canEditSelfScores
  );
}
