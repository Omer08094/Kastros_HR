"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Employee, PayrollEntry, PayrollSnapshot } from "@/lib/store/types";
import { updatePayrollSnapshot, upsertPayrollEntry } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function PayrollClient({
  snapshot,
  entries,
  employees,
  canEdit,
}: {
  snapshot: PayrollSnapshot;
  entries: PayrollEntry[];
  employees: Employee[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function handle(p: Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const err = await runAction(p, () => router.refresh());
      if (err) setError(err);
    });
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {canEdit ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Generate payroll line</h2>
          <p className="mt-1 text-sm text-kastros-sage">Gross pay = (hours worked x hourly rate) + selected allowances.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(upsertPayrollEntry(fd))}>
            <label className="text-sm">
              <span className="text-kastros-sage">Employee</span>
              <select name="employeeEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Month</span>
              <input name="month" defaultValue={snapshot.month} required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Base salary (appointment letter)</span>
              <input name="baseSalary" type="number" min={0} required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Hours worked</span>
              <input name="hoursWorked" type="number" min={0} required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Hourly rate</span>
              <input name="hourlyRate" type="number" min={0} step="0.01" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="text-sm">
              <span className="text-kastros-sage">Allowance 1</span>
              <div className="mt-1 flex gap-2">
                <select name="allowanceType" className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                  <option>Fuel</option>
                  <option>Transport</option>
                  <option>SIM/Mobile</option>
                  <option>Laptop</option>
                  <option>Other</option>
                </select>
                <input name="allowanceAmount" type="number" min={0} defaultValue={0} className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-kastros-sage">Allowance 2</span>
              <div className="mt-1 flex gap-2">
                <select name="allowanceType" className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                  <option>Transport</option>
                  <option>Fuel</option>
                  <option>SIM/Mobile</option>
                  <option>Laptop</option>
                  <option>Other</option>
                </select>
                <input name="allowanceAmount" type="number" min={0} defaultValue={0} className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Allowance 3</span>
              <div className="mt-1 flex gap-2">
                <select name="allowanceType" className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                  <option>SIM/Mobile</option>
                  <option>Fuel</option>
                  <option>Transport</option>
                  <option>Laptop</option>
                  <option>Other</option>
                </select>
                <input name="allowanceAmount" type="number" min={0} defaultValue={0} className="w-1/2 rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Save payroll line
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Payroll entries</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3">Employee</th>
                <th className="pb-3 pr-3">Month</th>
                <th className="pb-3 pr-3">Base</th>
                <th className="pb-3 pr-3">Allowances</th>
                <th className="pb-3 pr-3">Hours x rate</th>
                <th className="pb-3">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-3 text-kastros-sage">{e.employeeEmail}</td>
                  <td className="py-3 pr-3">{e.month}</td>
                  <td className="py-3 pr-3">{e.baseSalary.toFixed(2)}</td>
                  <td className="py-3 pr-3 text-xs text-kastros-sage">
                    {e.allowances.length ? e.allowances.map((a) => `${a.type}:${a.amount}`).join(" | ") : "—"}
                  </td>
                  <td className="py-3 pr-3">{e.hoursWorked} x {e.hourlyRate}</td>
                  <td className="py-3 font-semibold text-kastros-forest">{e.grossPay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Snapshot</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(updatePayrollSnapshot(fd))}>
          <label className="text-sm">
            <span className="text-kastros-sage">Month label</span>
            <input name="month" defaultValue={snapshot.month} required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Employees paid</span>
            <input name="employeesPaid" type="number" min={0} defaultValue={snapshot.employeesPaid} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Exceptions</span>
            <input name="exceptions" type="number" min={0} defaultValue={snapshot.exceptions} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Notes</span>
            <textarea name="note" rows={2} defaultValue={snapshot.note} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pending || !canEdit} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              Save snapshot
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
