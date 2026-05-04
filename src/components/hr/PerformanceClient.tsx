"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Goal } from "@/lib/store/types";
import { deleteGoal, upsertGoal } from "@/lib/store/hr-actions";
import type { Session } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function PerformanceClient({
  goals,
  session,
  teamEmails,
}: {
  goals: Goal[];
  session: Session;
  teamEmails: string[];
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

  const canAssignToOthers = session.role === "hr_admin" || session.role === "manager";

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Goals</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(upsertGoal(fd))}>
          {canAssignToOthers ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Owner email (optional — defaults to you)</span>
              <input name="ownerEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder={session.email} />
              {session.role === "manager" ? (
                <p className="mt-1 text-xs text-kastros-sage">Direct reports: {teamEmails.join(", ") || "—"}</p>
              ) : null}
            </label>
          ) : null}
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Title</span>
            <input name="title" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Cycle</span>
            <input name="cycle" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" defaultValue="H1 2026" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Progress %</span>
            <input name="progressPct" type="number" min={0} max={100} defaultValue={0} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Saving…" : "Add goal"}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          {goals.map((g) => (
            <div key={g.id} className="rounded-xl border border-kastros-sand bg-kastros-cream/40 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-semibold text-kastros-forest">{g.title}</p>
                  <p className="text-xs text-kastros-sage">
                    {g.ownerEmail} · {g.cycle}
                  </p>
                </div>
                <form className="flex flex-wrap items-center gap-2" action={(fd) => handle(upsertGoal(fd))}>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="ownerEmail" value={g.ownerEmail} />
                  <input type="hidden" name="title" value={g.title} />
                  <input type="hidden" name="cycle" value={g.cycle} />
                  <label className="text-xs text-kastros-sage">
                    Progress
                    <input name="progressPct" type="number" min={0} max={100} defaultValue={g.progressPct} className="ml-2 w-20 rounded-lg border border-kastros-sand px-2 py-1 text-xs" />
                  </label>
                  <button type="submit" disabled={pending} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50">
                    Update
                  </button>
                </form>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-kastros-sand">
                <div className="h-full rounded-full bg-gradient-to-r from-kastros-forest to-kastros-sage" style={{ width: `${g.progressPct}%` }} />
              </div>
              <div className="mt-3">
                <form action={(fd) => handle(deleteGoal(fd))}>
                  <input type="hidden" name="id" value={g.id} />
                  <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                    Delete goal
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
