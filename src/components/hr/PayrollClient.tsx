"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PayrollSnapshot } from "@/lib/store/types";
import { updatePayrollSnapshot } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function PayrollClient({ snapshot, canEdit }: { snapshot: PayrollSnapshot; canEdit: boolean }) {
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

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Snapshot</h2>
        {canEdit ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(updatePayrollSnapshot(fd))}>
            <label className="text-sm">
              <span className="text-kastros-sage">Month label</span>
              <input name="month" defaultValue={snapshot.month} required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Employees paid</span>
              <input
                name="employeesPaid"
                type="number"
                min={0}
                defaultValue={snapshot.employeesPaid}
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Exceptions</span>
              <input name="exceptions" type="number" min={0} defaultValue={snapshot.exceptions} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Notes</span>
              <textarea name="note" rows={3} defaultValue={snapshot.note} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Save snapshot
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-kastros-sage">Month</dt>
              <dd className="mt-1 font-semibold text-kastros-forest">{snapshot.month}</dd>
            </div>
            <div>
              <dt className="text-kastros-sage">Employees paid</dt>
              <dd className="mt-1 font-semibold text-kastros-forest">{snapshot.employeesPaid}</dd>
            </div>
            <div>
              <dt className="text-kastros-sage">Exceptions</dt>
              <dd className="mt-1 font-semibold text-kastros-forest">{snapshot.exceptions}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-kastros-sage">Notes</dt>
              <dd className="mt-1 text-kastros-ink">{snapshot.note}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
