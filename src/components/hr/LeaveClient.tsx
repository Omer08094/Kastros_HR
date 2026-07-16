"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import type { Employee, HrStore, LeaveCategory, LeaveRequest } from "@/lib/store/types";
import type { LeaveBalanceRow } from "@/lib/leave-policy";
import { createLeaveRequest, decideLeaveRequest } from "@/lib/store/hr-actions";
import { SelectField } from "@/components/Field";
import type { Session } from "@/lib/auth";
import { canDecideLeaveStep } from "@/lib/store/policy";
import { hasExecAccess } from "@/lib/roles";
import { EmployeeLeaveEntitlements } from "./EmployeeLeaveEntitlements";

function NotesModal({ note, onClose }: { note: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-kastros-sand bg-white p-6 shadow-card">
        <h3 className="font-display font-semibold text-kastros-forest">Leave notes</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm text-kastros-ink">{note || "No notes provided."}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-lg bg-kastros-forest px-4 py-2 text-sm font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

function LeaveBalancesCard({ rows, year }: { rows: LeaveBalanceRow[]; year: number }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-kastros-sage">
        No leave types configured yet. HR can add them under Settings → Leave policy.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[400px] text-left text-sm">
        <thead>
          <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
            <th className="pb-3 pr-3 font-medium">Type</th>
            <th className="pb-3 pr-3 font-medium">Allocated</th>
            <th className="pb-3 pr-3 font-medium">Used</th>
            <th className="pb-3 font-medium">Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-kastros-sand">
          {rows.map((row) => (
            <tr key={row.category.id}>
              <td className="py-3 pr-3 font-medium text-kastros-ink">{row.category.name}</td>
              <td className="py-3 pr-3">{row.allocated}</td>
              <td className="py-3 pr-3 text-kastros-sage">{row.used}</td>
              <td className="py-3 font-semibold text-kastros-forest">{row.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-kastros-sage">Balances for calendar year {year} (approved leave only).</p>
    </div>
  );
}

export function LeaveClient({
  requests,
  session,
  canCreate,
  canManageEntitlements,
  categories,
  balanceRows,
  year,
  employees,
  storeSlice,
}: {
  requests: LeaveRequest[];
  session: Session;
  canCreate: boolean;
  canManageEntitlements: boolean;
  categories: LeaveCategory[];
  balanceRows: LeaveBalanceRow[];
  year: number;
  employees: Employee[];
  storeSlice: Pick<HrStore, "leaveCategories" | "employeeLeaveAllocations" | "leaveRequests">;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const requestFromUrl = searchParams.get("request");
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const activeCategories = categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const linkedRequest = useMemo(
    () => (requestFromUrl ? requests.find((r) => r.id === requestFromUrl) ?? null : null),
    [requestFromUrl, requests],
  );

  const linkedRequestMissing = !!requestFromUrl && !linkedRequest;

  useEffect(() => {
    if (!requestFromUrl || !linkedRequest) return;
    const row = rowRefs.current.get(requestFromUrl);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [requestFromUrl, linkedRequest, requests]);

  const showHrAwaitingManagerBanner =
    !!linkedRequest &&
    linkedRequest.status === "PendingManager" &&
    hasExecAccess(session.role) &&
    !canDecideLeaveStep(employees, session, linkedRequest);

  const actionableRequests = useMemo(() => {
    const pending = requests.filter((r) => canDecideLeaveStep(employees, session, r));
    if (!requestFromUrl) return pending;
    const linkedIdx = pending.findIndex((r) => r.id === requestFromUrl);
    if (linkedIdx <= 0) return pending;
    return [pending[linkedIdx], ...pending.slice(0, linkedIdx), ...pending.slice(linkedIdx + 1)];
  }, [requests, employees, session, requestFromUrl]);

  function handle(p: Promise<ActionResult>, successMessage = "Saved successfully.") {
    start(async () => {
      try {
        const err = await runAction(p, () => router.refresh());
        if (err) toast.error(err);
        else toast.success(successMessage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {viewingNote !== null ? <NotesModal note={viewingNote} onClose={() => setViewingNote(null)} /> : null}

      {actionableRequests.length > 0 ? (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Pending your approval</h2>
          <p className="mt-1 text-sm text-kastros-sage">
            {actionableRequests.length === 1
              ? "One leave request needs your decision."
              : `${actionableRequests.length} leave requests need your decision.`}
          </p>
          <div className="mt-4 space-y-4">
            {actionableRequests.map((r) => {
              const fromEmail = requestFromUrl === r.id && canDecideLeaveStep(employees, session, r);
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${fromEmail ? "border-amber-400 ring-2 ring-amber-200" : "border-kastros-sand"}`}
                >
                  {fromEmail ? (
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-800">
                      You opened this from email
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-kastros-ink">{r.requesterEmail}</p>
                      <p className="mt-1 text-sm text-kastros-sage">
                        <span className="font-medium text-kastros-ink">{r.kind}</span> · {r.start} → {r.end}
                      </p>
                      {r.note ? (
                        <p className="mt-2 line-clamp-2 text-sm text-kastros-sage">{r.note}</p>
                      ) : null}
                      <span className="mt-2 inline-flex rounded-full bg-kastros-cream px-2 py-0.5 text-xs ring-1 ring-kastros-sand">
                        {r.status}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3">
                      <form action={(fd) => handle(decideLeaveRequest(fd), "Leave request approved.")}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="Approved" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={(fd) => handle(decideLeaveRequest(fd), "Leave request denied.")}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="Denied" />
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-red-700 ring-2 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">My leave balances</h2>
        <LeaveBalancesCard rows={balanceRows} year={year} />
      </section>

      {canManageEntitlements ? (
        <EmployeeLeaveEntitlements employees={employees} storeSlice={storeSlice} year={year} />
      ) : null}

      {canCreate ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Request time off</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(createLeaveRequest(fd), "Leave request submitted.")}>
            {activeCategories.length > 0 ? (
              <SelectField
                name="categoryId"
                label="Leave type"
                required
                span2
                options={activeCategories.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.defaultDaysPerYear} days standard)`,
                }))}
              />
            ) : (
              <label className="text-sm sm:col-span-2">
                <span className="text-kastros-sage">Type</span>
                <input name="kind" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="Annual leave" />
              </label>
            )}
            <label className="text-sm">
              <span className="text-kastros-sage">Start</span>
              <input name="start" type="date" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">End</span>
              <input name="end" type="date" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Note (optional)</span>
              <textarea name="note" rows={2} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Requests you can see</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Signed in as <span className="font-medium text-kastros-ink">{session.email}</span>. Flow:{" "}
          <strong className="text-kastros-ink">Line manager</strong> approves first, then <strong className="text-kastros-ink">HR</strong>{" "}
          gives final sign-off.
        </p>

        {linkedRequestMissing ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Leave request not found or you don&apos;t have access to view it.
          </div>
        ) : null}

        {showHrAwaitingManagerBanner ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            This request is awaiting line manager approval. HR final approval comes after the manager approves.
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3 font-medium">Who</th>
                <th className="pb-3 pr-3 font-medium">Type</th>
                <th className="pb-3 pr-3 font-medium">Dates</th>
                <th className="pb-3 pr-3 font-medium">Status</th>
                <th className="pb-3 pr-3 font-medium">Notes</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {requests.map((r) => {
                const highlighted = requestFromUrl === r.id;
                return (
                <tr
                  key={r.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(r.id, el);
                    else rowRefs.current.delete(r.id);
                  }}
                  className={`text-kastros-ink ${highlighted ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""}`}
                >
                  <td className="py-3 pr-3 text-kastros-sage">{r.requesterEmail}</td>
                  <td className="py-3 pr-3 font-medium">{r.kind}</td>
                  <td className="py-3 pr-3 text-kastros-sage">
                    {r.start} → {r.end}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex rounded-full bg-kastros-cream px-2 py-0.5 text-xs ring-1 ring-kastros-sand">{r.status}</span>
                  </td>
                  <td className="py-3 pr-3">
                    {r.note ? (
                      <button
                        type="button"
                        onClick={() => setViewingNote(r.note ?? "")}
                        className="rounded-lg bg-kastros-cream px-2 py-0.5 text-xs font-medium text-kastros-forest ring-1 ring-kastros-sand hover:bg-kastros-sand/30"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-kastros-sage">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {canDecideLeaveStep(employees, session, r) ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={(fd) => handle(decideLeaveRequest(fd), "Leave request approved.")}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="Approved" />
                          <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            Approve
                          </button>
                        </form>
                        <form action={(fd) => handle(decideLeaveRequest(fd), "Leave request denied.")}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="Denied" />
                          <button type="submit" disabled={pending} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50">
                            Deny
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-kastros-sage">
                        Manager: {r.managerDecisionByEmail ?? "—"} · HR: {r.hrDecisionByEmail ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
