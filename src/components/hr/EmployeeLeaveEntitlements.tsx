"use client";

import { useState } from "react";
import type { Employee, HrStore } from "@/lib/store/types";
import type { LeaveBalanceRow } from "@/lib/leave-policy";
import { buildLeaveBalanceRows } from "@/lib/leave-policy";
import { resetEmployeeLeaveToDefaults, upsertEmployeeLeaveAllocation } from "@/lib/store/hr-actions-extra";
import { SelectField } from "@/components/Field";
import { Card } from "@/components/Card";
import { GhostButton, PrimaryButton, useAction } from "./ModuleHelpers";

export function EmployeeLeaveEntitlements({
  employees,
  storeSlice,
  year,
}: {
  employees: Employee[];
  storeSlice: Pick<HrStore, "leaveCategories" | "employeeLeaveAllocations" | "leaveRequests">;
  year: number;
}) {
  const { pending, run } = useAction();
  const [selectedEmail, setSelectedEmail] = useState(employees[0]?.email ?? "");

  const rows: LeaveBalanceRow[] = selectedEmail
    ? buildLeaveBalanceRows(storeSlice as HrStore, selectedEmail, year)
    : [];

  const activeEmployees = employees.filter((e) => e.status === "Active");

  return (
    <Card title="Employee leave balances" eyebrow="HR admin">
      <p className="mb-4 text-sm text-kastros-sage">
        Set how many days each person has per leave type for {year}. Values marked &quot;custom&quot; override the standard
        from Settings. Configure leave types and company defaults under{" "}
        <a href="/settings" className="font-medium text-kastros-forest underline">
          Settings → Leave policy
        </a>
        .
      </p>

      <SelectField
        key={selectedEmail}
        name="_picker"
        label="Employee"
        defaultValue={selectedEmail}
        onChange={setSelectedEmail}
        options={activeEmployees.map((e) => ({ value: e.email, label: `${e.name} · ${e.department}` }))}
      />

      {selectedEmail ? (
        <>
          <form
            className="mt-4"
            action={(fd) => {
              fd.set("employeeEmail", selectedEmail);
              fd.set("year", String(year));
              run(resetEmployeeLeaveToDefaults(fd), "Reset to standard days from Settings.");
            }}
          >
            <input type="hidden" name="employeeEmail" value={selectedEmail} />
            <input type="hidden" name="year" value={year} />
            <GhostButton pending={pending}>Reset this employee to standard days</GhostButton>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Leave type</th>
                  <th className="pb-3 pr-3 font-medium">Allocated</th>
                  <th className="pb-3 pr-3 font-medium">Used</th>
                  <th className="pb-3 pr-3 font-medium">Remaining</th>
                  <th className="pb-3 font-medium">Edit days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {rows.map((row) => (
                  <tr key={row.category.id}>
                    <td className="py-3 pr-3 font-medium text-kastros-ink">
                      {row.category.name}
                      {row.isOverride ? (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 ring-1 ring-amber-200">
                          custom
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-kastros-sage">(standard)</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">{row.allocated}</td>
                    <td className="py-3 pr-3 text-kastros-sage">{row.used}</td>
                    <td className="py-3 pr-3 font-medium text-kastros-forest">{row.remaining}</td>
                    <td className="py-3">
                      <form
                        className="flex items-center gap-2"
                        action={(fd) => {
                          fd.set("employeeEmail", selectedEmail);
                          fd.set("categoryId", row.category.id);
                          fd.set("year", String(year));
                          run(upsertEmployeeLeaveAllocation(fd), `${row.category.name} updated.`);
                        }}
                      >
                        <input type="hidden" name="employeeEmail" value={selectedEmail} />
                        <input type="hidden" name="categoryId" value={row.category.id} />
                        <input type="hidden" name="year" value={year} />
                        <input
                          name="allocatedDays"
                          type="number"
                          min={0}
                          defaultValue={row.allocated}
                          className="w-20 rounded-lg border border-kastros-sand px-2 py-1 text-sm"
                        />
                        <PrimaryButton pending={pending}>Save</PrimaryButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Card>
  );
}
