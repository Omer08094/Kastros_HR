"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TrainingRow } from "@/lib/store/types";
import { addTrainingRow, setTrainingStatus } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function TrainingClient({
  rows,
  canAssign,
}: {
  rows: TrainingRow[];
  canAssign: boolean;
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

      {canAssign ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Assign training</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addTrainingRow(fd))}>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Assignee email</span>
              <input name="assigneeEmail" type="email" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Course name</span>
              <input name="name" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Due label</span>
              <input name="due" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="Due in 14 days" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Assign
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Assignments</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-kastros-forest">{t.name}</p>
                <p className="text-sm text-kastros-sage">
                  {t.assigneeEmail} · {t.due}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-kastros-cream px-2 py-1 text-xs ring-1 ring-kastros-sand">{t.status}</span>
                {t.status === "Required" ? (
                  <form action={(fd) => handle(setTrainingStatus(fd))}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="status" value="Done" />
                    <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                      Mark done
                    </button>
                  </form>
                ) : (
                  <form action={(fd) => handle(setTrainingStatus(fd))}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="status" value="Required" />
                    <button type="submit" disabled={pending} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50">
                      Reopen
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
