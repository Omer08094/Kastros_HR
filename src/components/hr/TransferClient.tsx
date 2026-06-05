"use client";

import type { Employee, TransferRecord } from "@/lib/store/types";
import { buildDepartmentOptions } from "@/lib/hr-picker-options";
import { BUSINESS_UNITS } from "@/lib/store/types";
import { Field, SelectField, TextareaField } from "@/components/Field";
import { Card } from "@/components/Card";
import { decideTransfer, requestTransfer } from "@/lib/store/hr-actions-extra";
import { EmptyState, GhostButton, PrimaryButton, StatusBanner, useAction } from "./ModuleHelpers";

export function TransferClient({
  transfers,
  employees,
  departmentNames,
}: {
  transfers: TransferRecord[];
  employees: Employee[];
  departmentNames: string[];
}) {
  const departmentOptions = buildDepartmentOptions(departmentNames);
  const { pending, error, success, run } = useAction();
  return (
    <div className="space-y-6">
      <StatusBanner error={error} success={success} />

      <Card title="Request transfer" eyebrow="Mobility">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action={(fd) => run(requestTransfer(fd), "Transfer requested.")}>
          <SelectField
            name="employeeEmail"
            label="Employee"
            required
            options={employees.map((e) => ({ value: e.email, label: `${e.name} · ${e.email} (${e.businessUnit ?? "—"})` }))}
          />
          <SelectField name="toBusinessUnit" label="Target business unit" required options={BUSINESS_UNITS as readonly string[]} />
          <SelectField
            name="toDepartment"
            label="Target department"
            required
            options={departmentOptions}
          />
          <Field name="effectiveDate" label="Effective date" kind="date" required />
          <Field name="tillDate" label="Till date (optional)" kind="date" hint="Leave blank if permanent transfer." />
          <div className="sm:col-span-2 lg:col-span-4">
            <TextareaField name="reason" label="Reason" rows={2} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <PrimaryButton pending={pending}>Submit</PrimaryButton>
          </div>
        </form>
      </Card>

      <Card title="Transfers" eyebrow="Workflow">
        {transfers.length === 0 ? (
          <EmptyState title="No transfer requests yet" description="Approved transfers update the employee's business unit and department." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Effective</th>
                  <th className="pb-3 pr-3 font-medium">Employee</th>
                  <th className="pb-3 pr-3 font-medium">From</th>
                  <th className="pb-3 pr-3 font-medium">To</th>
                  <th className="pb-3 pr-3 font-medium">Status</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {transfers.map((t) => (
                  <tr key={t.id} className="text-kastros-ink">
                    <td className="py-2 pr-3 font-mono text-xs">
                    {t.effectiveDate}
                    {t.tillDate ? <span className="ml-1 text-kastros-sage">→ {t.tillDate}</span> : null}
                  </td>
                    <td className="py-2 pr-3 text-xs text-kastros-sage">{t.employeeEmail}</td>
                    <td className="py-2 pr-3 text-xs">
                      {t.fromBusinessUnit ?? "—"} · {t.fromDepartment}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {t.toBusinessUnit} · {t.toDepartment}
                    </td>
                    <td className="py-2 pr-3">{t.status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.status === "Pending" ? (
                          <>
                            <form action={(fd) => run(decideTransfer(fd))}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="decision" value="Approved" />
                              <GhostButton pending={pending}>Approve</GhostButton>
                            </form>
                            <form action={(fd) => run(decideTransfer(fd))}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="decision" value="Rejected" />
                              <GhostButton pending={pending}>Reject</GhostButton>
                            </form>
                          </>
                        ) : null}
                        {t.status === "Approved" ? (
                          <form action={(fd) => run(decideTransfer(fd))}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="decision" value="Completed" />
                            <GhostButton pending={pending}>Mark completed</GhostButton>
                          </form>
                        ) : null}
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
