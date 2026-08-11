import type { PerformanceCycle, PmdfForm } from "@/lib/store/types";

/** Form has meaningful employee-entered goal content. */
export function formHasEmployeeGoalContent(form: PmdfForm): boolean {
  const bo = form.businessObjectives.some((r) => r.objectiveSmart.trim() || r.action.trim());
  const dev = form.developmentObjectives.some((r) => r.actionPlan.trim() || r.developmentArea.trim());
  return bo || dev;
}

/** Employee goal section is locked — modern submit flag OR legacy locked/past-phase with content. */
export function isEmployeeGoalsLocked(form: PmdfForm, cycle: PerformanceCycle | undefined): boolean {
  if (form.employeeObjectivesReopenedAt && !form.employeeObjectivesSubmittedAt) {
    return false;
  }
  if (form.employeeObjectivesSubmittedAt) return true;

  if (!formHasEmployeeGoalContent(form)) return false;

  const effectivePhase = cycle?.currentPhase ?? form.phase;
  const pastObjectivePhase = effectivePhase !== "objective_setting_employee";
  const globallyLocked = !!(form.locked || cycle?.locked);

  return globallyLocked || pastObjectivePhase;
}

/** HR may offer reopen when employee goals are locked and not already awaiting resubmit. */
export function canHrReopenEmployeeGoals(form: PmdfForm, cycle: PerformanceCycle | undefined): boolean {
  if (form.employeeObjectivesReopenedAt && !form.employeeObjectivesSubmittedAt) return false;
  return isEmployeeGoalsLocked(form, cycle);
}

/** Employee is in HR-granted resubmission window for goals. */
export function isEmployeeGoalsReopenedForResubmit(form: PmdfForm): boolean {
  return !!form.employeeObjectivesReopenedAt && !form.employeeObjectivesSubmittedAt;
}
