"use client";

import { useMemo, useState } from "react";
import type { Employee, EmployeeLetter, LetterType } from "@/lib/store/types";
import { Card } from "@/components/Card";
import { currencyForBusinessUnit } from "@/lib/store/types";
import { deleteLetter, issueLetter } from "@/lib/store/hr-actions-extra";
import { buildDepartmentOptions } from "@/lib/hr-picker-options";
import { EmptyState, GhostButton, PrimaryButton, StatusBanner, formatCurrency, useAction } from "./ModuleHelpers";

const LETTER_TYPES: { value: LetterType; label: string; description: string }[] = [
  { value: "Promotion", label: "Promotion", description: "Effective date locked to 1st of the chosen month." },
  { value: "Redesignation", label: "Redesignation / predesignation", description: "Editable effective date; captures full role change." },
  { value: "Trainee", label: "Trainee", description: "For internal trainees, with stipend + program duration." },
  { value: "Internship", label: "Internship", description: "External interns / interns with program details." },
  { value: "Termination", label: "Termination", description: "Formal termination letter — downloadable and printable." },
];

const INPUT =
  "mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30";

export function LettersClient({
  letters,
  employees,
  departmentNames,
}: {
  letters: EmployeeLetter[];
  employees: Employee[];
  departmentNames: string[];
}) {
  const departmentOptions = buildDepartmentOptions(departmentNames);
  const { pending, error, success, run } = useAction();
  const [type, setType] = useState<LetterType>("Promotion");
  const [employeeEmail, setEmployeeEmail] = useState<string>(employees[0]?.email ?? "");

  const employee = useMemo(
    () => employees.find((e) => e.email.toLowerCase() === employeeEmail.toLowerCase()),
    [employees, employeeEmail],
  );
  const currency = currencyForBusinessUnit(employee?.businessUnit ?? null);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 7) + "-01";
  const isLetterAboutRole = type === "Promotion" || type === "Redesignation";
  const isTermination = type === "Termination";
  const isTraineeOrInternship = type === "Trainee" || type === "Internship";

  return (
    <div className="space-y-6">
      <StatusBanner error={error} success={success} />

      <Card title="Issue letter" eyebrow="Generate">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          action={(fd) => run(issueLetter(fd), "Letter issued and saved.")}
        >
          <label className="text-sm">
            <span className="text-kastros-sage">Letter type *</span>
            <select
              name="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value as LetterType)}
              className={INPUT}
            >
              {LETTER_TYPES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-kastros-sage">
              {LETTER_TYPES.find((l) => l.value === type)?.description}
            </span>
          </label>

          <label className="text-sm">
            <span className="text-kastros-sage">Employee *</span>
            <select
              name="employeeEmail"
              required
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              className={INPUT}
            >
              <option value="" disabled>
                Select…
              </option>
              {employees.map((e) => (
                <option key={e.email} value={e.email}>
                  {e.name} · {e.email}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="text-kastros-sage">Effective date *</span>
            <input
              name="effectiveDate"
              type="date"
              required
              defaultValue={type === "Promotion" ? firstOfMonth : today}
              key={`eff-${type}`}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-kastros-sage">
              {type === "Promotion" ? "Promotion letters are forced to the 1st of the chosen month." : "Editable."}
            </span>
          </label>

          <label className="text-sm">
            <span className="text-kastros-sage">Issued date</span>
            <input name="issuedDate" type="date" defaultValue={today} className={INPUT} />
          </label>

          {isLetterAboutRole ? (
            <>
              <label className="text-sm">
                <span className="text-kastros-sage">Current title</span>
                <input name="oldTitle" defaultValue={employee?.title ?? ""} key={`ot-${employeeEmail}`} className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">New title *</span>
                <input name="newTitle" required className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Current department</span>
                <input name="oldDepartment" defaultValue={employee?.department ?? ""} key={`od-${employeeEmail}`} className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">New department</span>
                <select name="newDepartment" className={INPUT}>
                  <option value="">— Same as current —</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Current salary ({currency})</span>
                <input name="oldSalary" type="number" min={0} step="0.01" className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">New salary ({currency})</span>
                <input name="newSalary" type="number" min={0} step="0.01" className={INPUT} />
              </label>
            </>
          ) : isTermination ? (
            <>
              <label className="text-sm">
                <span className="text-kastros-sage">Reason for termination *</span>
                <input name="terminationReason" required placeholder="e.g. Misconduct, Redundancy, Resignation acceptance" className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Last working date *</span>
                <input name="terminationLastWorkingDate" type="date" required className={INPUT} />
              </label>
              <label className="text-sm sm:col-span-2 lg:col-span-2">
                <span className="text-kastros-sage">Settlement / handover notes</span>
                <textarea name="terminationSettlementNotes" rows={2} placeholder="e.g. Return company assets, final salary in next cycle" className={INPUT} />
              </label>
            </>
          ) : isTraineeOrInternship ? (
            <>
              <label className="text-sm">
                <span className="text-kastros-sage">Program title *</span>
                <input name="programTitle" required className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Duration (months) *</span>
                <input name="durationMonths" type="number" min={1} required className={INPUT} />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Monthly stipend ({currency})</span>
                <input name="stipend" type="number" min={0} step="0.01" className={INPUT} />
              </label>
            </>
          ) : null}

          <label className="text-sm sm:col-span-2 lg:col-span-4">
            <span className="text-kastros-sage">Notes / body</span>
            <textarea name="notes" rows={3} className={INPUT} />
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <PrimaryButton pending={pending}>Issue letter</PrimaryButton>
          </div>
        </form>
      </Card>

      <Card title="Issued letters" eyebrow="Archive">
        {letters.length === 0 ? (
          <EmptyState
            title="No letters issued yet"
            description="Promotion, redesignation, trainee, and internship letters appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Issued</th>
                  <th className="pb-3 pr-3 font-medium">Type</th>
                  <th className="pb-3 pr-3 font-medium">Employee</th>
                  <th className="pb-3 pr-3 font-medium">Effective</th>
                  <th className="pb-3 pr-3 font-medium">Details</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {letters.map((l) => (
                  <tr key={l.id} className="text-kastros-ink align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{l.issuedDate}</td>
                    <td className="py-2 pr-3">{l.type}</td>
                    <td className="py-2 pr-3 text-xs text-kastros-sage">{l.employeeEmail}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{l.effectiveDate}</td>
                    <td className="py-2 pr-3 text-xs text-kastros-sage">
                      {l.type === "Promotion" || l.type === "Redesignation"
                        ? `${l.oldTitle ?? "?"} → ${l.newTitle ?? "?"}${
                            l.newSalary != null && l.currency ? ` · ${formatCurrency(l.newSalary, l.currency)}` : ""
                          }`
                        : l.type === "Termination"
                          ? `${l.terminationReason ?? "Reason not set"} · LWD: ${l.terminationLastWorkingDate ?? "—"}`
                          : `${l.programTitle ?? "Program"} · ${l.durationMonths ?? "?"} mo${
                              l.stipend != null && l.currency ? ` · ${formatCurrency(l.stipend, l.currency)}` : ""
                            }`}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          className="rounded-lg bg-kastros-cream px-2.5 py-1 text-xs font-semibold ring-1 ring-kastros-sand"
                          href={`/letters/${l.id}`}
                        >
                          View
                        </a>
                        <form action={(fd) => run(deleteLetter(fd))}>
                          <input type="hidden" name="id" value={l.id} />
                          <GhostButton pending={pending}>Delete</GhostButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
