import { phaseLabel } from "@/lib/pmdf-reference";
import type { PerformanceCycle, PmdfForm, PmdfHrReopenStage } from "@/lib/store/types";

/** Stages HR may reopen per employee form (one at a time until relock). */
export const PMDF_HR_REOPEN_STAGES: readonly PmdfHrReopenStage[] = [
  "objective_setting_employee",
  "mid_year_review_employee",
  "mid_year_review_manager",
  "year_end_evaluation_employee",
  "year_end_evaluation_manager",
];

export type { PmdfHrReopenStage };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isWithinDateWindow(open: string | null, close: string | null, onDate = todayIso()): boolean {
  if (open && onDate < open) return false;
  if (close && onDate > close) return false;
  return true;
}

function windowOpen(
  cycle: PerformanceCycle | undefined,
  openKey: keyof PerformanceCycle,
  closeKey: keyof PerformanceCycle,
  onDate = todayIso(),
): boolean {
  if (!cycle) return false;
  const open = cycle[openKey] as string | null;
  const close = cycle[closeKey] as string | null;
  if (!open && !close) return false;
  return isWithinDateWindow(open, close, onDate);
}

export function isPmdfHrReopenStage(value: string): value is PmdfHrReopenStage {
  return (PMDF_HR_REOPEN_STAGES as readonly string[]).includes(value);
}

export function hrReopenStageLabel(stage: PmdfHrReopenStage): string {
  return phaseLabel(stage);
}

export function formHasPerformanceGoalContent(form: PmdfForm): boolean {
  return form.businessObjectives.some((r) => r.objectiveSmart.trim() || r.action.trim());
}

export function formHasDevelopmentGoalContent(form: PmdfForm): boolean {
  return form.developmentObjectives.some((r) => r.actionPlan.trim() || r.developmentArea.trim());
}

/** Form has meaningful employee-entered goal content in either section. */
export function formHasEmployeeGoalContent(form: PmdfForm): boolean {
  return formHasPerformanceGoalContent(form) || formHasDevelopmentGoalContent(form);
}

function legacySectionLocked(form: PmdfForm, cycle: PerformanceCycle | undefined, hasContent: boolean): boolean {
  if (!hasContent) return false;
  const effectivePhase = cycle?.currentPhase ?? form.phase;
  const pastObjectivePhase = effectivePhase !== "objective_setting_employee";
  const globallyLocked = !!(form.locked || cycle?.locked);
  return globallyLocked || pastObjectivePhase;
}

/** Performance goals locked — submit flag OR legacy locked/past-phase with BO content. */
export function isPerformanceGoalsLocked(form: PmdfForm, cycle: PerformanceCycle | undefined): boolean {
  if (form.hrReopenedStage === "objective_setting_employee" && !form.employeePerformanceGoalsSubmittedAt) {
    return false;
  }
  if (form.employeePerformanceGoalsSubmittedAt) return true;
  return legacySectionLocked(form, cycle, formHasPerformanceGoalContent(form));
}

/** Development goals locked — submit flag OR legacy locked/past-phase with DO content. */
export function isDevelopmentGoalsLocked(form: PmdfForm, cycle: PerformanceCycle | undefined): boolean {
  if (form.hrReopenedStage === "objective_setting_employee" && !form.employeeDevelopmentGoalsSubmittedAt) {
    return false;
  }
  if (form.employeeDevelopmentGoalsSubmittedAt) return true;
  return legacySectionLocked(form, cycle, formHasDevelopmentGoalContent(form));
}

/** Either performance or development goal section is locked. */
export function isEmployeeGoalsLocked(form: PmdfForm, cycle: PerformanceCycle | undefined): boolean {
  return isPerformanceGoalsLocked(form, cycle) || isDevelopmentGoalsLocked(form, cycle);
}

export function isStageHrReopened(form: PmdfForm, stage: PmdfHrReopenStage): boolean {
  return form.hrReopenedStage === stage;
}

export function isHrReopenActive(form: PmdfForm): boolean {
  return form.hrReopenedStage != null;
}

/** Employee is in HR-granted resubmission window for objectives (either section still open). */
export function isEmployeeObjectivesHrReopened(form: PmdfForm): boolean {
  return (
    form.hrReopenedStage === "objective_setting_employee" &&
    (!form.employeePerformanceGoalsSubmittedAt || !form.employeeDevelopmentGoalsSubmittedAt)
  );
}

/** Whether the current viewer may edit under an active HR reopen exception. */
export function isHrReopenActiveForUser(form: PmdfForm, isEmployee: boolean, isManager: boolean): boolean {
  const stage = form.hrReopenedStage;
  if (!stage) return false;
  const managerOnForm = isManager && !isEmployee;
  switch (stage) {
    case "objective_setting_employee":
    case "mid_year_review_employee":
    case "year_end_evaluation_employee":
      return isEmployee;
    case "mid_year_review_manager":
    case "year_end_evaluation_manager":
      return managerOnForm;
    default:
      return false;
  }
}

/** Would the target role be blocked from this stage's fields under normal rules? */
export function isStageLockedForRole(
  form: PmdfForm,
  cycle: PerformanceCycle | undefined,
  stage: PmdfHrReopenStage,
  onDate = todayIso(),
): boolean {
  if (form.hrReopenedStage) return false;

  const effectivePhase = cycle?.currentPhase ?? form.phase;
  const globallyLocked = !!(form.locked || cycle?.locked);

  switch (stage) {
    case "objective_setting_employee":
      return isEmployeeGoalsLocked(form, cycle);
    case "mid_year_review_employee":
      if (globallyLocked) return true;
      return !(
        windowOpen(cycle, "midYearEmployeeOpen", "midYearEmployeeDeadline", onDate) ||
        effectivePhase === "mid_year_review_employee"
      );
    case "mid_year_review_manager":
      if (globallyLocked) return true;
      return !(
        windowOpen(cycle, "midYearManagerOpen", "midYearManagerDeadline", onDate) ||
        effectivePhase === "mid_year_review_manager"
      );
    case "year_end_evaluation_employee":
      if (globallyLocked) return true;
      return !(
        windowOpen(cycle, "yearEndEmployeeOpen", "yearEndEmployeeDeadline", onDate) ||
        effectivePhase === "year_end_evaluation_employee"
      );
    case "year_end_evaluation_manager":
      if (globallyLocked) return true;
      return !(
        windowOpen(cycle, "yearEndManagerOpen", "yearEndManagerDeadline", onDate) ||
        effectivePhase === "year_end_evaluation_manager" ||
        effectivePhase === "finalization"
      );
    default:
      return true;
  }
}

/** HR may reopen when no reopen is active and the stage is locked for its target role. */
export function canHrReopenStage(
  form: PmdfForm,
  cycle: PerformanceCycle | undefined,
  stage: PmdfHrReopenStage,
): boolean {
  if (form.hrReopenedStage) return false;
  return isStageLockedForRole(form, cycle, stage);
}

export function hrReopenGrantsObjectiveWindow(form: PmdfForm, isEmployee: boolean): boolean {
  return isEmployee && form.hrReopenedStage === "objective_setting_employee";
}

export function hrReopenGrantsMidYearEmployeeWindow(form: PmdfForm, isEmployee: boolean): boolean {
  return isEmployee && form.hrReopenedStage === "mid_year_review_employee";
}

export function hrReopenGrantsMidYearManagerWindow(form: PmdfForm, isManager: boolean, isEmployee: boolean): boolean {
  return isManager && !isEmployee && form.hrReopenedStage === "mid_year_review_manager";
}

export function hrReopenGrantsFinalEmployeeWindow(form: PmdfForm, isEmployee: boolean): boolean {
  return isEmployee && form.hrReopenedStage === "year_end_evaluation_employee";
}

export function hrReopenGrantsFinalManagerWindow(
  form: PmdfForm,
  isManager: boolean,
  isEmployee: boolean,
): boolean {
  return isManager && !isEmployee && form.hrReopenedStage === "year_end_evaluation_manager";
}

export function isValidHrReopenStage(stage: string): stage is PmdfHrReopenStage {
  return isPmdfHrReopenStage(stage);
}

export function bothEmployeeGoalSectionsSubmitted(form: PmdfForm): boolean {
  return !!(form.employeePerformanceGoalsSubmittedAt && form.employeeDevelopmentGoalsSubmittedAt);
}
