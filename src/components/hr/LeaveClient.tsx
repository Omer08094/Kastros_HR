"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeaveRequest } from "@/lib/store/types";
import { createLeaveRequest, decideLeaveRequest } from "@/lib/store/hr-actions";
import type { Session } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function LeaveClient({
  requests,
  session,
  canCreate,
  canDecide,
}: {
  requests: LeaveRequest[];
  session: Session;
  canCreate: boolean;
  canDecide: boolean;
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
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {canCreate ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Request time off</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(createLeaveRequest(fd))}>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Type</span>
              <input name="kind" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="Annual leave" />
            </label>
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
          Signed in as <span className="font-medium text-kastros-ink">{session.email}</span>. Flow: Pending HR {"->"} Pending CEO {"->"} Approved.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3 font-medium">Who</th>
                <th className="pb-3 pr-3 font-medium">Type</th>
                <th className="pb-3 pr-3 font-medium">Dates</th>
                <th className="pb-3 pr-3 font-medium">Status/step</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {requests.map((r) => (
                <tr key={r.id} className="text-kastros-ink">
                  <td className="py-3 pr-3 text-kastros-sage">{r.requesterEmail}</td>
                  <td className="py-3 pr-3 font-medium">{r.kind}</td>
                  <td className="py-3 pr-3 text-kastros-sage">
                    {r.start} → {r.end}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex rounded-full bg-kastros-cream px-2 py-0.5 text-xs ring-1 ring-kastros-sand">{r.status}</span>
                  </td>
                  <td className="py-3">
                    {canDecide && (r.status === "PendingHR" || r.status === "PendingCEO") ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={(fd) => handle(decideLeaveRequest(fd))}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="Approved" />
                          <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            Approve
                          </button>
                        </form>
                        <form action={(fd) => handle(decideLeaveRequest(fd))}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="Denied" />
                          <button type="submit" disabled={pending} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50">
                            Deny
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-kastros-sage">
                        HR: {r.hrDecisionByEmail ?? "—"} · CEO: {r.ceoDecisionByEmail ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
