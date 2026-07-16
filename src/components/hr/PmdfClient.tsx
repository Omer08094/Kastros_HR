"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Session } from "@/lib/auth";
import {
  BUSINESS_OBJECTIVE_RATINGS,
  BUSINESS_RATING_BANDS,
  DEVELOPMENT_OBJECTIVE_RATINGS,
  PMDF_FUNCTIONAL_AREAS,
  PMDF_LOCATION_CATEGORIES,
  PMDF_PHASES,
  PMDF_PILLARS,
  phaseLabel,
} from "@/lib/pmdf-reference";
import { calcPmdfScores } from "@/lib/pmdf-scoring";
import { isPmdfLineManagerFromEmployees } from "@/lib/pmdf-access";
import { hasExecAccess } from "@/lib/roles";
import { useToast } from "@/components/ui/ToastProvider";
import {
  assignPmdfForms,
  createPerformanceCycle,
  deletePerformanceCycle,
  notifyPmdfDeadline,
  savePmdfForm,
  updatePerformanceCycle,
} from "@/lib/store/pmdf-actions";
import type {
  Employee,
  PerformanceCycle,
  PmdfBusinessObjective,
  PmdfDevelopmentObjective,
  PmdfForm,
} from "@/lib/store/types";
import { buildDepartmentOptions } from "@/lib/hr-picker-options";

type ActionResult = { ok: true; message?: string } | { error: string };

const INPUT =
  "mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30";

const TEXTAREA = `${INPUT} min-h-[72px] resize-y`;

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function toIntOrNull(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return Math.min(5, Math.max(1, i));
}

function parsePctInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Weight % input — text field avoids browser number spinners and scroll-wheel decrements (20→19). */
function PercentageInput({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (pct: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const display = editing ? draft : value === 0 ? "" : String(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      disabled={disabled}
      className={className}
      onFocus={() => setDraft(value === 0 ? "" : String(value))}
      onBlur={() => {
        const next = parsePctInput(draft ?? "");
        onChange(next);
        setDraft(null);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setDraft(raw);
        onChange(parsePctInput(raw));
      }}
      onWheel={(e) => {
        e.currentTarget.blur();
      }}
    />
  );
}

const BUILT_IN_PILLARS = new Set<string>(PMDF_PILLARS);

function isBuiltInPillar(name: string): boolean {
  return BUILT_IN_PILLARS.has(name);
}

const MIN_DEVELOPMENT_TRAITS = 3;

function canEditForm(
  form: PmdfForm,
  cycle: PerformanceCycle | undefined,
  session: Session,
  employees: Employee[],
): boolean {
  if (hasExecAccess(session.role)) return true;
  if (form.locked || cycle?.locked) return false;
  const email = session.email.toLowerCase();
  return (
    form.employeeEmail.toLowerCase() === email ||
    isPmdfLineManagerFromEmployees(employees, email, form)
  );
}

function storeHasOtherForms(forms: PmdfForm[], cycleId: string): boolean {
  return forms.some((f) => f.cycleId !== cycleId);
}

function boStatus(row: PmdfBusinessObjective): "not_started" | "on_track" | "completed" {
  if (row.finalScoreFy != null) return "completed";
  if (row.objectiveSmart.trim() || row.action.trim()) return "on_track";
  return "not_started";
}

function PmdfHrPanel({
  cycles,
  forms,
  departmentNames,
  employees,
  onAction,
  pending,
}: {
  cycles: PerformanceCycle[];
  forms: PmdfForm[];
  departmentNames: string[];
  employees: Employee[];
  onAction: (p: Promise<ActionResult>, successMessage?: string) => void;
  pending: boolean;
}) {
  const [assignScope, setAssignScope] = useState<"organisation" | "department" | "employee">("organisation");
  const [assignEmployeeEmail, setAssignEmployeeEmail] = useState("");
  const departmentOptions = buildDepartmentOptions(departmentNames);
  const formsByCycle = useMemo(() => {
    const map = new Map<string, number>();
    for (const form of forms) {
      map.set(form.cycleId, (map.get(form.cycleId) ?? 0) + 1);
    }
    return map;
  }, [forms]);

  return (
    <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-kastros-forest">HR — Performance cycles</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Create cycles, distribute PMDF forms, set deadlines, send reminders, and lock forms when the period ends.
          Choose <strong className="text-kastros-ink">Specific employee</strong> above to email one person, or use{" "}
          <strong className="text-kastros-ink">Email all assigned</strong> for everyone in the cycle.
        </p>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" action={(fd) => onAction(createPerformanceCycle(fd), "Performance cycle created.")}>
        <h3 className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-kastros-ink">New cycle</h3>
        <label className="text-sm sm:col-span-2">
          <span className="text-kastros-sage">Title</span>
          <input name="title" required placeholder="PMDF 2024-2025" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Start date</span>
          <input name="startDate" type="date" required className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">End date</span>
          <input name="endDate" type="date" required className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Objective setting (employee) deadline</span>
          <input name="objectiveSettingEmployeeDeadline" type="date" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Objective setting (manager) deadline</span>
          <input name="objectiveSettingManagerDeadline" type="date" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Mid year (employee) deadline</span>
          <input name="midYearEmployeeDeadline" type="date" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Mid year (manager) deadline</span>
          <input name="midYearManagerDeadline" type="date" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Year end (employee) deadline</span>
          <input name="yearEndEmployeeDeadline" type="date" className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Year end (manager) deadline</span>
          <input name="yearEndManagerDeadline" type="date" className={INPUT} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="sm:col-span-2 lg:col-span-3 w-fit rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Create cycle
        </button>
      </form>

      {cycles.length > 0 ? (
        <div className="space-y-4 border-t border-kastros-sand pt-5">
          <h3 className="text-sm font-semibold text-kastros-ink">Manage existing cycle</h3>
          {cycles.map((cycle) => {
            const assignedCount = formsByCycle.get(cycle.id) ?? 0;
            const selectedEmployee = assignEmployeeEmail
              ? employees.find((e) => e.email.toLowerCase() === assignEmployeeEmail.toLowerCase())
              : null;
            const selectedHasFormInCycle =
              !!selectedEmployee &&
              forms.some(
                (f) =>
                  f.cycleId === cycle.id &&
                  f.employeeEmail.toLowerCase() === selectedEmployee.email.toLowerCase(),
              );

            function sendReminder(employeeEmail?: string) {
              const fd = new FormData();
              fd.set("cycleId", cycle.id);
              if (employeeEmail) fd.set("employeeEmail", employeeEmail);
              const count = employeeEmail ? 1 : assignedCount;
              const label = employeeEmail && selectedEmployee ? selectedEmployee.name : `${count} form(s)`;
              onAction(notifyPmdfDeadline(fd), `Deadline reminder sent to ${label}.`);
            }

            return (
            <div key={cycle.id} className="rounded-xl border border-kastros-sand bg-kastros-cream/20 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-kastros-forest">{cycle.title}</p>
                  <p className="text-xs text-kastros-sage">
                    {fmtDate(cycle.startDate)} – {fmtDate(cycle.endDate)} · Phase: {phaseLabel(cycle.currentPhase)}
                    {cycle.locked ? " · Locked" : ""}
                    {assignedCount > 0 ? ` · ${assignedCount} form(s) assigned` : " · No forms assigned yet"}
                  </p>
                </div>
                <form action={(fd) => onAction(deletePerformanceCycle(fd), "Performance cycle deleted.")}>
                  <input type="hidden" name="cycleId" value={cycle.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                  >
                    Delete cycle
                  </button>
                </form>
              </div>

              <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action={(fd) => onAction(updatePerformanceCycle(fd), "Performance cycle updated.")}>
                <input type="hidden" name="cycleId" value={cycle.id} />
                <label className="text-sm sm:col-span-2">
                  <span className="text-kastros-sage">Workflow phase</span>
                  <select name="currentPhase" defaultValue={cycle.currentPhase} className={INPUT}>
                    {PMDF_PHASES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm flex items-end gap-2 pb-2">
                  <input type="checkbox" name="locked" value="1" defaultChecked={cycle.locked} className="rounded" />
                  <span className="text-kastros-sage">Lock all forms in this cycle</span>
                </label>
                <div className="sm:col-span-2 lg:col-span-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm">
                    <span className="text-kastros-sage">Obj. setting employee deadline</span>
                    <input name="objectiveSettingEmployeeDeadline" type="date" defaultValue={cycle.objectiveSettingEmployeeDeadline ?? ""} className={INPUT} />
                  </label>
                  <label className="text-sm">
                    <span className="text-kastros-sage">Mid year employee deadline</span>
                    <input name="midYearEmployeeDeadline" type="date" defaultValue={cycle.midYearEmployeeDeadline ?? ""} className={INPUT} />
                  </label>
                  <label className="text-sm">
                    <span className="text-kastros-sage">Year end employee deadline</span>
                    <input name="yearEndEmployeeDeadline" type="date" defaultValue={cycle.yearEndEmployeeDeadline ?? ""} className={INPUT} />
                  </label>
                </div>
                <button type="submit" disabled={pending} className="w-fit rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Update cycle
                </button>
              </form>

              <form className="flex flex-wrap gap-2" action={(fd) => onAction(assignPmdfForms(fd), "PMDF forms distributed.")}>
                <input type="hidden" name="cycleId" value={cycle.id} />
                <input type="hidden" name="scope" value={assignScope} />
                <select
                  value={assignScope}
                  onChange={(e) => {
                    const next = e.target.value as typeof assignScope;
                    setAssignScope(next);
                    if (next !== "employee") setAssignEmployeeEmail("");
                  }}
                  className="rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm"
                >
                  <option value="organisation">Whole organisation</option>
                  <option value="department">Specific department</option>
                  <option value="employee">Specific employee</option>
                </select>
                {assignScope === "department" ? (
                  <select name="department" required className="rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm">
                    <option value="">Select department…</option>
                    {departmentOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {assignScope === "employee" ? (
                  <select
                    name="employeeEmail"
                    required
                    value={assignEmployeeEmail}
                    onChange={(e) => setAssignEmployeeEmail(e.target.value)}
                    className="rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm min-w-[200px]"
                  >
                    <option value="">Select employee…</option>
                    {employees.filter((e) => e.status === "Active").map((e) => (
                      <option key={e.email} value={e.email}>
                        {e.name} · {e.email}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="submit" disabled={pending} className="rounded-xl bg-kastros-brandGreen px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  Distribute forms
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending || assignedCount === 0}
                  title={
                    assignedCount === 0
                      ? "Distribute forms to this cycle before sending email reminders."
                      : `Send deadline reminder emails to all ${assignedCount} assigned form(s).`
                  }
                  onClick={() => sendReminder()}
                  className="rounded-xl border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Email all assigned ({assignedCount})
                </button>
                {assignScope === "employee" && assignEmployeeEmail ? (
                  <button
                    type="button"
                    disabled={pending || !selectedHasFormInCycle}
                    title={
                      selectedHasFormInCycle
                        ? `Send deadline reminder to ${selectedEmployee?.name ?? assignEmployeeEmail} only.`
                        : `${selectedEmployee?.name ?? assignEmployeeEmail} has no PMDF in this cycle yet — distribute first.`
                    }
                    onClick={() => sendReminder(assignEmployeeEmail)}
                    className="rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Email {selectedEmployee?.name ?? "selected"} only
                  </button>
                ) : null}
                {assignedCount === 0 && storeHasOtherForms(forms, cycle.id) ? (
                  <p className="text-xs text-amber-800">
                    Forms exist under another cycle — use that cycle&apos;s reminder button, or distribute to this cycle.
                  </p>
                ) : null}
              </div>
            </div>
          );
          })}
        </div>
      ) : null}
    </section>
  );
}

function RatingScaleReference() {
  return (
    <details className="rounded-xl border border-kastros-sand bg-kastros-cream/30 p-3 text-xs text-kastros-sage">
      <summary className="cursor-pointer font-semibold text-kastros-ink">Rating scales &amp; bands (reference)</summary>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-semibold text-kastros-forest">Business objectives</p>
          <ul className="mt-1 list-disc pl-4">
            {BUSINESS_OBJECTIVE_RATINGS.map((r) => (
              <li key={r.code}>
                {r.code} ({r.scale}) — {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-kastros-forest">Development objectives</p>
          <ul className="mt-1 list-disc pl-4">
            {DEVELOPMENT_OBJECTIVE_RATINGS.map((r) => (
              <li key={r.code}>
                {r.code} ({r.scale}) — {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="font-semibold text-kastros-forest">Overall performance bands</p>
          <ul className="mt-1 space-y-1">
            {BUSINESS_RATING_BANDS.map((b) => (
              <li key={b.label}>
                <strong>{b.label}</strong> ({b.from}–{b.till}) {b.note ? `— ${b.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

function PmdfFormEditor({
  form,
  cycle,
  session,
  employees,
  onAction,
  pending,
}: {
  form: PmdfForm;
  cycle: PerformanceCycle | undefined;
  session: Session;
  employees: Employee[];
  onAction: (p: Promise<ActionResult>, successMessage?: string) => void;
  pending: boolean;
}) {
  const editable = canEditForm(form, cycle, session, employees);
  const isEmployee = form.employeeEmail.toLowerCase() === session.email.toLowerCase();
  const isManager = isPmdfLineManagerFromEmployees(employees, session.email, form);
  const locked = form.locked || cycle?.locked;
  const effectivePhase = cycle?.currentPhase ?? form.phase;
  const employeeObjectivesLocked = isEmployee && !!form.employeeObjectivesSubmittedAt;
  const submittingObjectives =
    isEmployee &&
    effectivePhase === "objective_setting_employee" &&
    !form.employeeObjectivesSubmittedAt;
  const employeeGoalsComplete =
    isEmployee && employeeObjectivesLocked && effectivePhase === "objective_setting_employee";
  const canEmployeeEditGoals = isEmployee && !employeeObjectivesLocked;

  const [tab, setTab] = useState<"bo" | "do" | "feedback">("bo");
  const [businessObjectives, setBusinessObjectives] = useState(form.businessObjectives);
  const [developmentObjectives, setDevelopmentObjectives] = useState(form.developmentObjectives);
  const [employeeFeedbackMidYear, setEmployeeFeedbackMidYear] = useState(form.employeeFeedbackMidYear);
  const [managerFeedbackMidYear, setManagerFeedbackMidYear] = useState(form.managerFeedbackMidYear);
  const [employeeFeedbackFy, setEmployeeFeedbackFy] = useState(form.employeeFeedbackFy);
  const [managerFeedbackFy, setManagerFeedbackFy] = useState(form.managerFeedbackFy);
  const [employeeSignature, setEmployeeSignature] = useState(form.employeeSignature);
  const [managerSignature, setManagerSignature] = useState(form.managerSignature);
  const [subDepartment, setSubDepartment] = useState(form.subDepartment ?? "");
  const [functionalArea, setFunctionalArea] = useState(form.functionalArea ?? "");
  const [locationCategory, setLocationCategory] = useState(form.locationCategory ?? "");
  const [lastAddedTraitId, setLastAddedTraitId] = useState<string | null>(null);

  const scores = useMemo(
    () => calcPmdfScores(businessObjectives, developmentObjectives),
    [businessObjectives, developmentObjectives],
  );

  const boStats = useMemo(() => {
    const statuses = businessObjectives.map(boStatus);
    return {
      total: businessObjectives.length,
      notStarted: statuses.filter((s) => s === "not_started").length,
      onTrack: statuses.filter((s) => s === "on_track").length,
      completed: statuses.filter((s) => s === "completed").length,
    };
  }, [businessObjectives]);

  function addBusinessRow() {
    setBusinessObjectives((rows) => [
      ...rows,
      {
        id: `bo-new-${Date.now()}`,
        sortOrder: rows.length + 1,
        objectiveSmart: "",
        action: "",
        employeeComments: "",
        percentage: 0,
        selfScoreFy: null,
        finalScoreFy: null,
        managerCommentsHalfYear: "",
        managerCommentsFullYear: "",
      },
    ]);
  }

  function updateBo(idx: number, patch: Partial<PmdfBusinessObjective>) {
    setBusinessObjectives((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function updateDo(idx: number, patch: Partial<PmdfDevelopmentObjective>) {
    setDevelopmentObjectives((rows) => {
      const targetId = rows[idx]?.id;
      if (patch.pillar?.trim() && targetId) {
        setLastAddedTraitId((cur) => (cur === targetId ? null : cur));
      }
      return rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    });
  }

  function addDevelopmentRow() {
    const id = `do-new-${Date.now()}`;
    setDevelopmentObjectives((rows) => [
      {
        id,
        sortOrder: 1,
        pillar: "",
        developmentArea: "",
        actionPlan: "",
        percentage: 0,
        selfScoreFy: null,
        finalScoreFy: null,
        managerCommentsHalfYear: "",
        managerCommentsFullYear: "",
      },
      ...rows.map((r, i) => ({ ...r, sortOrder: i + 2 })),
    ]);
    setLastAddedTraitId(id);
  }

  function removeDevelopmentRow(idx: number) {
    setDevelopmentObjectives((rows) => {
      const row = rows[idx];
      if (!row || isBuiltInPillar(row.pillar)) return rows;
      if (row.id === lastAddedTraitId) setLastAddedTraitId(null);
      return rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
  }

  const activeDo = developmentObjectives.filter((r) => r.actionPlan.trim() || r.percentage > 0);
  const filledDo = activeDo.length;

  function buildFormData(confirmObjectivesSubmit: boolean): FormData {
    const fd = new FormData();
    fd.set("formId", form.id);
    if (confirmObjectivesSubmit) fd.set("confirmEmployeeObjectivesSubmit", "1");
    fd.set("boCount", String(businessObjectives.length));
    businessObjectives.forEach((r, i) => {
      fd.set(`bo_id_${i}`, r.id);
      fd.set(`bo_smart_${i}`, r.objectiveSmart);
      fd.set(`bo_action_${i}`, r.action);
      fd.set(`bo_comments_${i}`, r.employeeComments);
      fd.set(`bo_pct_${i}`, String(r.percentage));
      if (r.selfScoreFy != null) fd.set(`bo_self_${i}`, String(r.selfScoreFy));
      if (r.finalScoreFy != null) fd.set(`bo_final_${i}`, String(r.finalScoreFy));
      fd.set(`bo_mgr_hy_${i}`, r.managerCommentsHalfYear);
      fd.set(`bo_mgr_fy_${i}`, r.managerCommentsFullYear);
    });
    fd.set("doCount", String(developmentObjectives.length));
    developmentObjectives.forEach((r, i) => {
      fd.set(`do_id_${i}`, r.id);
      fd.set(`do_pillar_${i}`, r.pillar);
      fd.set(`do_area_${i}`, r.developmentArea);
      fd.set(`do_plan_${i}`, r.actionPlan);
      fd.set(`do_pct_${i}`, String(r.percentage));
      if (r.selfScoreFy != null) fd.set(`do_self_${i}`, String(r.selfScoreFy));
      if (r.finalScoreFy != null) fd.set(`do_final_${i}`, String(r.finalScoreFy));
      fd.set(`do_mgr_hy_${i}`, r.managerCommentsHalfYear);
      fd.set(`do_mgr_fy_${i}`, r.managerCommentsFullYear);
    });
    fd.set("employeeFeedbackMidYear", employeeFeedbackMidYear);
    fd.set("managerFeedbackMidYear", managerFeedbackMidYear);
    fd.set("employeeFeedbackFy", employeeFeedbackFy);
    fd.set("managerFeedbackFy", managerFeedbackFy);
    fd.set("employeeSignature", employeeSignature);
    fd.set("managerSignature", managerSignature);
    fd.set("subDepartment", subDepartment);
    fd.set("functionalArea", functionalArea);
    fd.set("locationCategory", locationCategory);
    return fd;
  }

  function handleSave() {
    if (submittingObjectives) {
      const ok = window.confirm(
        "You can only submit your performance and development goals once.\n\nAfter saving, you will not be able to edit these goals again.\n\nPlease review all objectives, weights, and development traits carefully before continuing.",
      );
      if (!ok) return;
      onAction(savePmdfForm(buildFormData(true)), "Performance and development goals submitted.");
      return;
    }
    onAction(savePmdfForm(buildFormData(false)), "PMDF form saved successfully.");
  }

  return (
    <section className="rounded-2xl border border-kastros-sand bg-white shadow-sm overflow-hidden">
      <div className="border-b border-kastros-sand bg-kastros-cream/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-kastros-forest">
              {cycle?.title ?? "Performance form"} — {form.employeeName}
            </h2>
            <p className="mt-1 text-sm text-kastros-sage">
              {cycle ? `${fmtDate(cycle.startDate)} – ${fmtDate(cycle.endDate)}` : ""} · State:{" "}
              <span className={locked ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                {locked ? "Locked" : "Open"}
              </span>
              {" · "}Phase: {phaseLabel(form.phase)}
            </p>
          </div>
          <Link
            href={`/performance/print/${form.id}`}
            target="_blank"
            className="rounded-xl bg-kastros-cream px-3 py-1.5 text-xs font-semibold ring-1 ring-kastros-sand"
          >
            Print / PDF
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            ["bo", "Performance Goals"],
            ["do", "Development Goals"],
            ["feedback", "Feedback & Scores"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as typeof tab)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                tab === id ? "bg-kastros-forest text-white" : "bg-white text-kastros-sage ring-1 ring-kastros-sand"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "bo" ? (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-kastros-sage">
            <span>
              <strong className="text-kastros-ink">{boStats.total}</strong> Objectives
            </span>
            <span>
              <strong className="text-kastros-ink">{boStats.notStarted}</strong> Not started
            </span>
            <span>
              <strong className="text-kastros-ink">{boStats.onTrack}</strong> On track
            </span>
            <span>
              <strong className="text-kastros-ink">{boStats.completed}</strong> Completed
            </span>
            <span>
              Weight total: <strong className={scores.businessTotalPercentage === 100 ? "text-emerald-700" : "text-amber-700"}>{scores.businessTotalPercentage}%</strong>
            </span>
          </div>
        ) : null}
      </div>

      {isManager && !isEmployee && !hasExecAccess(session.role) ? (
        <div className="mx-5 mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Employee sections are read-only. Your changes only update manager scores, comments, and feedback.
        </div>
      ) : null}

      {employeeObjectivesLocked ? (
        <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your performance and development goals were submitted on{" "}
          {fmtDate(form.employeeObjectivesSubmittedAt)} and can no longer be changed.
        </div>
      ) : submittingObjectives ? (
        <div className="mx-5 mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          You can only submit your performance and development goals once. Review every objective, weight, and
          development trait carefully before saving.
        </div>
      ) : null}

      <form
        className="p-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><span className="text-kastros-sage">Name</span><p className="font-medium">{form.employeeName}</p></div>
          <div><span className="text-kastros-sage">Emp ID</span><p className="font-medium">{form.employeeIdDisplay ?? "—"}</p></div>
          <div><span className="text-kastros-sage">Job Title</span><p className="font-medium">{form.jobTitle}</p></div>
          <div><span className="text-kastros-sage">Line Manager</span><p className="font-medium">{form.lineManagerName ?? "—"}</p></div>
          <div><span className="text-kastros-sage">Department</span><p className="font-medium">{form.department}</p></div>
          <label className="text-sm">
            <span className="text-kastros-sage">Sub Department</span>
            <input
              value={subDepartment}
              onChange={(e) => setSubDepartment(e.target.value)}
              disabled={!editable || (isEmployee && employeeObjectivesLocked)}
              className={INPUT}
            />
          </label>
          <div><span className="text-kastros-sage">Location</span><p className="font-medium">{form.location}</p></div>
          <label className="text-sm">
            <span className="text-kastros-sage">Functional Area</span>
            <select
              value={functionalArea}
              onChange={(e) => setFunctionalArea(e.target.value)}
              disabled={!editable || (isEmployee && employeeObjectivesLocked)}
              className={INPUT}
            >
              <option value="">— Select —</option>
              {PMDF_FUNCTIONAL_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Location Category</span>
            <select
              value={locationCategory}
              onChange={(e) => setLocationCategory(e.target.value)}
              disabled={!editable || (isEmployee && employeeObjectivesLocked)}
              className={INPUT}
            >
              <option value="">— Select —</option>
              {PMDF_LOCATION_CATEGORIES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        {tab === "bo" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-kastros-forest">Business Objectives (must total 100%)</h3>
              {editable && (canEmployeeEditGoals || hasExecAccess(session.role)) ? (
                <button type="button" onClick={addBusinessRow} className="text-xs font-semibold text-kastros-brandGreen">
                  + Add objective
                </button>
              ) : null}
            </div>
            {businessObjectives.map((row, idx) => (
              <article key={row.id} className="rounded-xl border border-kastros-sand p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Objective {idx + 1}</span>
                  <span className="text-xs font-semibold text-kastros-forest">{row.percentage}% weight</span>
                </div>
                <label className="block text-sm">
                  <span className="text-kastros-sage">SMART Objective</span>
                  <textarea
                    value={row.objectiveSmart}
                    onChange={(e) => updateBo(idx, { objectiveSmart: e.target.value })}
                    disabled={!editable || (!canEmployeeEditGoals && !hasExecAccess(session.role))}
                    className={TEXTAREA}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-kastros-sage">Action</span>
                  <textarea
                    value={row.action}
                    onChange={(e) => updateBo(idx, { action: e.target.value })}
                    disabled={!editable || (!canEmployeeEditGoals && !hasExecAccess(session.role))}
                    className={TEXTAREA}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-kastros-sage">Employee Comments</span>
                  <textarea
                    value={row.employeeComments}
                    onChange={(e) => updateBo(idx, { employeeComments: e.target.value })}
                    disabled={!editable || (!canEmployeeEditGoals && !hasExecAccess(session.role))}
                    className={TEXTAREA}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    <span className="text-kastros-sage">%age (weight)</span>
                    <PercentageInput
                      value={row.percentage}
                      onChange={(pct) => updateBo(idx, { percentage: pct })}
                      disabled={!editable || (isEmployee && employeeObjectivesLocked)}
                      className={INPUT}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-kastros-sage">Self Score FY (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={row.selfScoreFy ?? ""}
                      onChange={(e) => updateBo(idx, { selfScoreFy: toIntOrNull(e.target.value) })}
                      disabled={!editable || (!isEmployee && !hasExecAccess(session.role))}
                      className={INPUT}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-kastros-sage">Manager Score FY (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={row.finalScoreFy ?? ""}
                      onChange={(e) => updateBo(idx, { finalScoreFy: toIntOrNull(e.target.value) })}
                      disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                      className={INPUT}
                    />
                  </label>
                  <div className="text-sm">
                    <span className="text-kastros-sage">Progress</span>
                    <div className="mt-2 h-2 rounded-full bg-kastros-sand">
                      <div
                        className="h-2 rounded-full bg-kastros-brandGreen"
                        style={{ width: `${row.finalScoreFy != null ? (row.finalScoreFy / 5) * 100 : row.selfScoreFy != null ? (row.selfScoreFy / 5) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="text-kastros-sage">Manager Comments — Half Year</span>
                  <textarea
                    value={row.managerCommentsHalfYear}
                    onChange={(e) => updateBo(idx, { managerCommentsHalfYear: e.target.value })}
                    disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                    className={TEXTAREA}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-kastros-sage">Manager Comments — Full Year</span>
                  <textarea
                    value={row.managerCommentsFullYear}
                    onChange={(e) => updateBo(idx, { managerCommentsFullYear: e.target.value })}
                    disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                    className={TEXTAREA}
                  />
                </label>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "do" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-kastros-sand bg-kastros-cream/40 p-4 text-sm text-kastros-ink">
              <p className="font-semibold text-kastros-forest">What are these pillars?</p>
              <p className="mt-1 text-kastros-sage">
                Empathy, Accountability, Initiative, Collaboration, Integrity and other similar traits are behaviour
                areas. Choose at least three where you want to grow, assign a weight %, and write a concrete action plan
                for the year.
              </p>
              <p className="mt-2 text-xs text-kastros-sage">
                <strong className="text-kastros-ink">Example:</strong> Under <em>Accountability</em>, your action plan
                might be: &ldquo;I will send my manager a weekly progress update every Friday and flag any blockers within
                24 hours.&rdquo; You are not repeating the pillar name — you are describing what you will actually do
                differently.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-kastros-forest">
                Development Objectives (min. {MIN_DEVELOPMENT_TRAITS} required · must total 100%)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs font-semibold ${filledDo >= MIN_DEVELOPMENT_TRAITS ? "text-emerald-700" : "text-amber-700"}`}>
                  {filledDo} of {developmentObjectives.length} traits in use · weight total {scores.developmentTotalPercentage}%
                </span>
                {editable && (canEmployeeEditGoals || hasExecAccess(session.role)) ? (
                  <button
                    type="button"
                    onClick={addDevelopmentRow}
                    className="text-xs font-semibold text-kastros-brandGreen"
                  >
                    + Add trait
                  </button>
                ) : null}
              </div>
            </div>
            {lastAddedTraitId ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                New trait added — it appears at the top of the list below.
              </div>
            ) : null}
            {developmentObjectives.map((row, idx) => {
              const customTrait = !isBuiltInPillar(row.pillar);
              const justAdded = row.id === lastAddedTraitId;
              return (
                <details
                  key={row.id}
                  open
                  className={`rounded-xl border group ${
                    justAdded ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300" : "border-kastros-sand"
                  }`}
                >
                  <summary className="cursor-pointer px-4 py-3 font-semibold text-kastros-forest flex justify-between gap-2">
                    <span>
                      {justAdded && !row.pillar.trim()
                        ? "New trait added"
                        : row.pillar.trim() || "New trait"}
                    </span>
                    <span className="text-xs text-kastros-sage shrink-0">{row.percentage}%</span>
                  </summary>
                  <div className="border-t border-kastros-sand p-4 space-y-3">
                    {customTrait ? (
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="block text-sm flex-1 min-w-[200px]">
                          <span className="text-kastros-sage">Trait name</span>
                          <input
                            value={row.pillar}
                            onChange={(e) => updateDo(idx, { pillar: e.target.value })}
                            disabled={!editable || (!canEmployeeEditGoals && !hasExecAccess(session.role))}
                            placeholder="e.g. Adaptability, Communication"
                            className={INPUT}
                          />
                        </label>
                        {editable && (canEmployeeEditGoals || hasExecAccess(session.role)) ? (
                          <button
                            type="button"
                            onClick={() => removeDevelopmentRow(idx)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                          >
                            Remove trait
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="block text-sm">
                      <span className="text-kastros-sage">Action Plan</span>
                      <textarea
                        value={row.actionPlan}
                        onChange={(e) => updateDo(idx, { actionPlan: e.target.value })}
                        disabled={!editable || (!canEmployeeEditGoals && !hasExecAccess(session.role))}
                        className={TEXTAREA}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-sm">
                        <span className="text-kastros-sage">%age</span>
                        <PercentageInput
                          value={row.percentage}
                          onChange={(pct) => updateDo(idx, { percentage: pct })}
                          disabled={!editable || (isEmployee && employeeObjectivesLocked)}
                          className={INPUT}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-kastros-sage">Self Score FY</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step={1}
                          value={row.selfScoreFy ?? ""}
                          onChange={(e) => updateDo(idx, { selfScoreFy: toIntOrNull(e.target.value) })}
                          disabled={!editable || (!isEmployee && !hasExecAccess(session.role))}
                          className={INPUT}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-kastros-sage">Manager Score FY</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step={1}
                          value={row.finalScoreFy ?? ""}
                          onChange={(e) => updateDo(idx, { finalScoreFy: toIntOrNull(e.target.value) })}
                          disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                          className={INPUT}
                        />
                      </label>
                    </div>
                    <label className="block text-sm">
                      <span className="text-kastros-sage">Manager Comments — Half Year</span>
                      <textarea
                        value={row.managerCommentsHalfYear}
                        onChange={(e) => updateDo(idx, { managerCommentsHalfYear: e.target.value })}
                        disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                        className={TEXTAREA}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-kastros-sage">Manager Comments — Full Year</span>
                      <textarea
                        value={row.managerCommentsFullYear}
                        onChange={(e) => updateDo(idx, { managerCommentsFullYear: e.target.value })}
                        disabled={!editable || (!isManager && !hasExecAccess(session.role))}
                        className={TEXTAREA}
                      />
                    </label>
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}

        {tab === "feedback" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-xl bg-kastros-cream/40 p-4 text-sm">
              <div><span className="text-kastros-sage">Overall PMDP Score</span><p className="text-lg font-bold text-kastros-forest">{scores.overallPmdpScore.toFixed(2)}</p></div>
              <div><span className="text-kastros-sage">BO Final Rating (70%)</span><p className="font-semibold">{scores.businessRating70.toFixed(2)}</p></div>
              <div><span className="text-kastros-sage">DO Final Rating (30%)</span><p className="font-semibold">{scores.developmentRating30.toFixed(2)}</p></div>
              <div><span className="text-kastros-sage">BO Self / Final weightage</span><p>{scores.businessSelf.toFixed(2)} / {scores.businessFinal.toFixed(2)}</p></div>
              <div><span className="text-kastros-sage">DO Self / Final weightage</span><p>{scores.developmentSelf.toFixed(2)} / {scores.developmentFinal.toFixed(2)}</p></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-kastros-sage">Employee feedback — Mid Year</span>
                <textarea value={employeeFeedbackMidYear} onChange={(e) => setEmployeeFeedbackMidYear(e.target.value)} disabled={!editable || (!isEmployee && !hasExecAccess(session.role))} className={TEXTAREA} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Manager feedback — Mid Year</span>
                <textarea value={managerFeedbackMidYear} onChange={(e) => setManagerFeedbackMidYear(e.target.value)} disabled={!editable || (!isManager && !hasExecAccess(session.role))} className={TEXTAREA} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Employee feedback — Full Year</span>
                <textarea value={employeeFeedbackFy} onChange={(e) => setEmployeeFeedbackFy(e.target.value)} disabled={!editable || (!isEmployee && !hasExecAccess(session.role))} className={TEXTAREA} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Manager feedback — Full Year</span>
                <textarea value={managerFeedbackFy} onChange={(e) => setManagerFeedbackFy(e.target.value)} disabled={!editable || (!isManager && !hasExecAccess(session.role))} className={TEXTAREA} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-kastros-sage">Employee signature (type full name)</span>
                <input value={employeeSignature} onChange={(e) => setEmployeeSignature(e.target.value)} disabled={!editable || (!isEmployee && !hasExecAccess(session.role))} className={INPUT} />
                {form.employeeSignedAt ? <p className="mt-1 text-xs text-kastros-sage">Signed {fmtDate(form.employeeSignedAt)}</p> : null}
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Manager signature (type full name)</span>
                <input value={managerSignature} onChange={(e) => setManagerSignature(e.target.value)} disabled={!editable || (!isManager && !hasExecAccess(session.role))} className={INPUT} />
                {form.managerSignedAt ? <p className="mt-1 text-xs text-kastros-sage">Signed {fmtDate(form.managerSignedAt)}</p> : null}
              </label>
            </div>

            <RatingScaleReference />
          </div>
        ) : null}

        {editable && !employeeGoalsComplete ? (
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-kastros-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submittingObjectives ? "Submit goals" : "Save form"}
          </button>
        ) : employeeGoalsComplete ? (
          <p className="text-sm font-medium text-emerald-800">
            Your performance and development goals have been submitted. No further changes are needed at this stage.
          </p>
        ) : (
          <p className="text-sm text-kastros-sage">This form is read-only{locked ? " (locked)" : ""}.</p>
        )}
      </form>
    </section>
  );
}

export function PmdfClient({
  session,
  cycles,
  forms,
  employees,
  departmentNames,
}: {
  session: Session;
  cycles: PerformanceCycle[];
  forms: PmdfForm[];
  employees: Employee[];
  departmentNames: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(forms[0]?.id ?? null);

  const cycleMap = useMemo(() => new Map(cycles.map((c) => [c.id, c])), [cycles]);
  const selected = forms.find((f) => f.id === selectedId) ?? forms[0];

  function handle(p: Promise<ActionResult>, successMessage = "Saved successfully.") {
    start(async () => {
      try {
        const r = await p;
        if ("error" in r) {
          toast.error(r.error);
          return;
        }
        router.refresh();
        toast.success(r.message ?? successMessage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {hasExecAccess(session.role) ? (
        <PmdfHrPanel
          cycles={cycles}
          forms={forms}
          departmentNames={departmentNames}
          employees={employees}
          onAction={handle}
          pending={pending}
        />
      ) : null}

      {forms.length === 0 ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-8 text-center shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">No PMDF assigned yet</h2>
          <p className="mt-2 text-sm text-kastros-sage">
            {hasExecAccess(session.role)
              ? "Create a performance cycle and distribute forms to the organisation."
              : "HR will assign your Performance Management & Development Form when the review cycle opens."}
          </p>
        </section>
      ) : (
        <>
          {forms.length > 1 || hasExecAccess(session.role) ? (
            <div className="flex flex-wrap gap-2">
              {forms.map((f) => {
                const cycle = cycleMap.get(f.cycleId);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={`rounded-xl px-3 py-2 text-left text-sm ring-1 ${
                      (selected?.id ?? forms[0]?.id) === f.id
                        ? "bg-kastros-forest text-white ring-kastros-forest"
                        : "bg-white text-kastros-ink ring-kastros-sand"
                    }`}
                  >
                    <span className="font-semibold">{f.employeeName}</span>
                    <span className="block text-xs opacity-80">{cycle?.title ?? "Cycle"}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selected ? (
            <PmdfFormEditor
              key={selected.id + selected.updatedAt}
              form={selected}
              cycle={cycleMap.get(selected.cycleId)}
              session={session}
              employees={employees}
              onAction={handle}
              pending={pending}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
