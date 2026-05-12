"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Employee, PayrollEntry, PayrollSnapshot, PayrollAllowanceType } from "@/lib/store/types";
import {
  deletePayrollEntry,
  syncPayrollEntryMonthsToSnapshot,
  updatePayrollSnapshot,
  upsertPayrollEntry,
} from "@/lib/store/hr-actions";
import { buildSalarySlipHtml } from "@/lib/salary-slip-html";
import { printInnerHtmlInIframe } from "@/lib/print-in-iframe";

type ActionResult = { ok: true } | { error: string };

const ALLOWANCE_TYPES: PayrollAllowanceType[] = ["Fuel", "Transport", "SIM/Mobile", "Laptop", "Other"];

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

function slipEntryFor(employeeEmail: string, entries: PayrollEntry[], periodMonth: string) {
  const em = employeeEmail.toLowerCase();
  const forPeriod = entries.find((e) => e.employeeEmail.toLowerCase() === em && e.month === periodMonth);
  if (forPeriod) return forPeriod;
  return entries.find((e) => e.employeeEmail.toLowerCase() === em);
}

function buildSlipHtml(employee: Employee, entry: PayrollEntry, periodLabel: string): string {
  return buildSalarySlipHtml({
    companyName: "Kastros Trading",
    companyTagline: "Global commodity supply · integrity-first culture",
    employeeName: employee.name,
    employeeTitle: employee.title,
    department: employee.department,
    employeeEmail: employee.email,
    periodLabel,
    baseSalary: entry.baseSalary,
    hoursWorked: entry.hoursWorked,
    hourlyRate: entry.hourlyRate,
    allowances: entry.allowances,
    grossPay: entry.grossPay,
  });
}

export function PayrollClient({
  snapshot,
  entries,
  employees,
  canManage,
  canViewSlips,
}: {
  snapshot: PayrollSnapshot;
  entries: PayrollEntry[];
  employees: Employee[];
  canManage: boolean;
  canViewSlips: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allowanceRows, setAllowanceRows] = useState(1);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  function handle(p: Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const err = await runAction(p, () => router.refresh());
      if (err) setError(err);
    });
  }

  const slipPeriod = snapshot.month;

  const sortedEntries = useMemo(() => {
    const name = (email: string) => employees.find((e) => e.email.toLowerCase() === email.toLowerCase())?.name ?? email;
    return [...entries].sort((a, b) => name(a.employeeEmail).localeCompare(name(b.employeeEmail)));
  }, [entries, employees]);

  const slipRows = useMemo(() => {
    return employees.map((emp) => ({
      employee: emp,
      entry: slipEntryFor(emp.email, entries, slipPeriod),
    }));
  }, [employees, entries, slipPeriod]);

  function openPreview(html: string) {
    setPreviewHtml(html);
  }

  function printSlip(html: string) {
    printInnerHtmlInIframe(html, { title: "Salary slip", delayMs: 400 });
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {previewHtml ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-kastros-forest/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label="Salary slip preview"
          onClick={(e) => e.target === e.currentTarget && setPreviewHtml(null)}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-kastros-sand bg-white p-6 shadow-card">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => printSlip(previewHtml)}
              >
                Print
              </button>
              <button type="button" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-kastros-sage hover:bg-kastros-cream" onClick={() => setPreviewHtml(null)}>
                Close
              </button>
            </div>
            <div className="salary-slip-preview max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      ) : null}

      {!canManage && (
        <p className="rounded-xl border border-kastros-sand bg-kastros-cream/40 px-4 py-3 text-sm text-kastros-sage">
          You have read-only payroll access. <strong>HR Admin</strong> and <strong>CEO</strong> can add or delete payroll lines and change the shared pay period.
        </p>
      )}

      {canManage ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-kastros-forest">Pay period</h2>
              <p className="mt-1 max-w-xl text-sm text-kastros-sage">
                This month label is what salary slips show and what new payroll lines default to. When you change it and save, every existing line&apos;s month is updated to match
                (amounts stay the same).
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => handle(syncPayrollEntryMonthsToSnapshot())}
              className="shrink-0 rounded-xl border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest disabled:opacity-50"
              title="Re-run without changing other fields below"
            >
              Re-align lines to current period
            </button>
          </div>
          <form className="mt-4 space-y-4" action={(fd) => handle(updatePayrollSnapshot(fd))}>
            <label className="block text-sm">
              <span className="text-kastros-sage">Month label (shown on slips &amp; ledger)</span>
              <input name="month" defaultValue={snapshot.month} required className="mt-1 w-full max-w-md rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <details className="rounded-xl bg-kastros-cream/30 p-4 ring-1 ring-kastros-sand/60">
              <summary className="cursor-pointer text-sm font-semibold text-kastros-forest">Optional run summary · for reminders on the homepage</summary>
              <p className="mt-2 text-xs text-kastros-sage">These fields ride along with Save pay period; they only drive optional FYI notifications — not slips or payroll math.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-kastros-sage">Employees paid</span>
                  <input name="employeesPaid" type="number" min={0} defaultValue={snapshot.employeesPaid} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="text-kastros-sage">Exceptions</span>
                  <input name="exceptions" type="number" min={0} defaultValue={snapshot.exceptions} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-kastros-sage">Notes</span>
                <textarea name="note" rows={2} defaultValue={snapshot.note} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
              </label>
            </details>
            <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              Save pay period
            </button>
          </form>
        </section>
      ) : null}

      {canManage ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-display text-lg font-semibold text-kastros-forest">Add payroll line</h2>
            <p className="mt-1 text-sm text-kastros-sage">
              Gross pay (stored) = appointment base + (hours × rate) + sum of allowances. New rows default their month to the shared pay period above. Saving again for the same
              employee and month replaces that line.
            </p>
          </div>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            action={(fd) => handle(upsertPayrollEntry(fd))}
          >
            <label className="text-sm">
              <span className="text-kastros-sage">Employee</span>
              <select
                name="employeeEmail"
                defaultValue={employees[0]?.email}
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              >
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Pay period (month label)</span>
              <input
                name="month"
                required
                defaultValue={snapshot.month}
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Base salary (appointment letter)</span>
              <input
                name="baseSalary"
                type="number"
                min={0}
                required
                defaultValue=""
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Hours worked</span>
              <input
                name="hoursWorked"
                type="number"
                min={0}
                required
                defaultValue=""
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm sm:col-span-2 md:sm:col-span-1">
              <span className="text-kastros-sage">Hourly rate</span>
              <input
                name="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue=""
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              />
            </label>

            <div className="sm:col-span-2 rounded-xl bg-kastros-cream/30 p-4 ring-1 ring-kastros-sand/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-kastros-forest">Allowances</span>
                <button
                  type="button"
                  className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                  onClick={() => setAllowanceRows((n) => n + 1)}
                >
                  + Add allowance
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {Array.from({ length: allowanceRows }).map((_, i) => {
                  return (
                    <div key={i} className="flex flex-wrap gap-2 sm:items-center">
                      <select
                        name="allowanceType"
                        defaultValue={ALLOWANCE_TYPES[i % ALLOWANCE_TYPES.length]}
                        className="min-w-[140px] grow rounded-xl border border-kastros-sand px-3 py-2 text-sm sm:max-w-[200px]"
                      >
                        {ALLOWANCE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        name="allowanceAmount"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Amount"
                        defaultValue=""
                        className="w-28 rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                      />
                      {allowanceRows > 1 ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700 hover:underline"
                          onClick={() => setAllowanceRows((n) => Math.max(1, n - 1))}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })}
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

      {canViewSlips ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Salary slips</h2>
          <p className="mt-1 text-sm text-kastros-sage">
            Period on slips matches <strong>{slipPeriod}</strong> above. Rows use each employee&apos;s payroll line for that period if present; otherwise their most recent saved
            line (values unchanged until you add an updated payroll line).
          </p>
          <ul className="mt-4 divide-y divide-kastros-sand">
            {slipRows.map(({ employee, entry }) => (
              <li key={employee.email} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-kastros-forest">{employee.name}</p>
                  <p className="text-xs text-kastros-sage">{employee.email}</p>
                  {!entry ? <p className="mt-1 text-xs text-amber-800">No payroll line yet — add one above.</p> : null}
                  {entry && entry.month !== slipPeriod ? (
                    <p className="mt-1 text-xs text-kastros-sage">Using stored line ({entry.month}) · save a new pay period or re-align lines to align the period column.</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                        onClick={() => openPreview(buildSlipHtml(employee, entry, slipPeriod))}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                        onClick={() => printSlip(buildSlipHtml(employee, entry, slipPeriod))}
                      >
                        Print
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Payroll entry ledger</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3">Employee</th>
                <th className="pb-3 pr-3">Month</th>
                <th className="pb-3 pr-3">Base</th>
                <th className="pb-3 pr-3">Allowances</th>
                <th className="pb-3 pr-3">Hours × rate</th>
                <th className="pb-3 pr-3">Gross</th>
                {canManage ? <th className="pb-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {sortedEntries.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-3 font-medium text-kastros-ink">{employees.find((x) => x.email.toLowerCase() === e.employeeEmail.toLowerCase())?.name ?? e.employeeEmail}</td>
                  <td className="py-3 pr-3">{e.month}</td>
                  <td className="py-3 pr-3">{e.baseSalary.toFixed(2)}</td>
                  <td className="py-3 pr-3 text-xs text-kastros-sage">
                    {e.allowances.length ? e.allowances.map((a) => `${a.type}: ${a.amount}`).join(" · ") : "—"}
                  </td>
                  <td className="py-3 pr-3">{e.hoursWorked} × {e.hourlyRate}</td>
                  <td className="py-3 pr-3 font-semibold text-kastros-forest">{e.grossPay.toFixed(2)}</td>
                  {canManage ? (
                    <td className="py-3">
                      <form action={(fd) => handle(deletePayrollEntry(fd))} className="inline">
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                          Delete
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedEntries.length === 0 ? <p className="mt-4 text-sm text-kastros-sage">No payroll entries yet.</p> : null}
      </section>
    </div>
  );
}
