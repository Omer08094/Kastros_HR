"use client";

import { useMemo, useState } from "react";
import type { CurrencyCode, Employee, ExpenseClaim } from "@/lib/store/types";
import { CURRENCIES, currencyForBusinessUnit } from "@/lib/store/types";
import { Field, FileField, SelectField, TextareaField } from "@/components/Field";
import {
  decideExpense,
  deleteExpense,
  markExpensePaid,
  submitExpense,
} from "@/lib/store/hr-actions-extra";
import {
  EmptyState,
  GhostButton,
  PrimaryButton,
  formatCurrency,
  useAction,
} from "./ModuleHelpers";

const CATEGORIES = [
  "Travel",
  "Meals",
  "Lodging",
  "Supplies",
  "Client entertainment",
  "Software",
  "Other",
];

function statusClass(status: ExpenseClaim["status"]): string {
  switch (status) {
    case "Pending":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "Approved":
      return "bg-sky-50 text-sky-900 ring-sky-200";
    case "Rejected":
      return "bg-red-50 text-red-800 ring-red-200";
    case "Paid":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

function employeeName(employees: Employee[], email: string): string {
  return employees.find((e) => e.email.toLowerCase() === email.toLowerCase())?.name ?? email;
}

export function ExpensesClient({
  expenses,
  employees,
  selfEmail,
  canManage,
}: {
  expenses: ExpenseClaim[];
  employees: Employee[];
  selfEmail: string;
  canManage: boolean;
}) {
  const { pending, run } = useAction();

  const self = employees.find((e) => e.email.toLowerCase() === selfEmail.toLowerCase());
  const defaultCurrency = currencyForBusinessUnit(self?.businessUnit ?? null);
  const [claimCurrency, setClaimCurrency] = useState<CurrencyCode>(defaultCurrency);
  const currencyHint = self?.businessUnit
    ? `Default for ${self.businessUnit} (${defaultCurrency}). Change if you paid in another currency.`
    : "Choose the currency you paid in. Set your business unit on People for an automatic default.";

  const visible = useMemo(() => {
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.submittedOn).getTime() - new Date(a.submittedOn).getTime(),
    );
    if (canManage) return sorted;
    return sorted.filter((e) => e.employeeEmail.toLowerCase() === selfEmail.toLowerCase());
  }, [expenses, canManage, selfEmail]);

  const pendingCount = visible.filter((e) => e.status === "Pending").length;
  const approvedAwaitingPay = visible.filter((e) => e.status === "Approved").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Submit a claim</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Attach a receipt when you have one. HR reviews pending claims; after approval, finance marks them paid when
          reimbursed.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          action={(fd) => run(submitExpense(fd), "Expense claim submitted.")}
        >
          <SelectField name="category" label="Category" required options={CATEGORIES} />
          <SelectField
            name="currency"
            label="Currency"
            required
            options={CURRENCIES}
            defaultValue={defaultCurrency}
            onChange={(v) => setClaimCurrency(v as CurrencyCode)}
            hint={currencyHint}
          />
          <Field
            name="amount"
            label="Amount"
            kind="currency"
            required
            currency={claimCurrency}
            placeholder="0"
            validation={{ min: 0.01 }}
          />
          <TextareaField
            name="description"
            label="Description"
            required
            span2
            placeholder="What was this expense for? Include dates or project if relevant."
            rows={3}
          />
          <FileField
            name="receiptFile"
            label="Receipt (optional)"
            span2
            hint="PDF, Word, PowerPoint, or image — max ~12 MB."
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf"
          />
          <div className="sm:col-span-2">
            <PrimaryButton pending={pending}>Submit claim</PrimaryButton>
          </div>
        </form>
      </section>

      {canManage ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-900 ring-1 ring-amber-200">
            {pendingCount} pending review
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-900 ring-1 ring-sky-200">
            {approvedAwaitingPay} approved · awaiting payment
          </span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">
          {canManage ? "All expense claims" : "My claims"}
        </h2>
        {visible.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No claims yet"
              description="Submit your first expense using the form above."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-kastros-sand">
            {visible.map((claim) => {
              const isOwner = claim.employeeEmail.toLowerCase() === selfEmail.toLowerCase();
              return (
                <li key={claim.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-kastros-forest">
                        {claim.category} · {formatCurrency(claim.amount, claim.currency)}
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusClass(claim.status)}`}>
                        {claim.status}
                      </span>
                    </div>
                    {canManage ? (
                      <p className="mt-1 text-xs text-kastros-sage">
                        {employeeName(employees, claim.employeeEmail)} · {claim.employeeEmail}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-kastros-ink">{claim.description}</p>
                    <p className="mt-1 text-xs text-kastros-sage">
                      Submitted {new Date(claim.submittedOn).toLocaleString()}
                      {claim.approvedOn
                        ? ` · ${claim.status === "Rejected" ? "Decided" : "Approved"} ${new Date(claim.approvedOn).toLocaleString()}`
                        : ""}
                      {claim.paidOn ? ` · Paid ${new Date(claim.paidOn).toLocaleString()}` : ""}
                    </p>
                    {claim.receiptRef ? (
                      <a
                        href={`/api/hr-file/${claim.receiptRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-kastros-forest underline"
                      >
                        View receipt{claim.receiptOriginalName ? ` (${claim.receiptOriginalName})` : ""}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canManage && claim.status === "Pending" ? (
                      <>
                        <form action={(fd) => run(decideExpense(fd), "Claim approved.")}>
                          <input type="hidden" name="id" value={claim.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <PrimaryButton pending={pending} className="!px-3 !py-1.5 !text-xs">
                            Approve
                          </PrimaryButton>
                        </form>
                        <form action={(fd) => run(decideExpense(fd), "Claim rejected.")}>
                          <input type="hidden" name="id" value={claim.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <GhostButton pending={pending}>Reject</GhostButton>
                        </form>
                      </>
                    ) : null}
                    {canManage && claim.status === "Approved" ? (
                      <form action={(fd) => run(markExpensePaid(fd), "Marked as paid (reimbursed).")}>
                        <input type="hidden" name="id" value={claim.id} />
                        <PrimaryButton pending={pending} className="!px-3 !py-1.5 !text-xs">
                          Mark reimbursed
                        </PrimaryButton>
                      </form>
                    ) : null}
                    {(canManage || (isOwner && claim.status === "Pending")) && claim.status !== "Paid" ? (
                      <form action={(fd) => run(deleteExpense(fd))}>
                        <input type="hidden" name="id" value={claim.id} />
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                        >
                          {isOwner && !canManage ? "Withdraw" : "Delete"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
