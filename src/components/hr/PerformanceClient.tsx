"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PerformanceReview } from "@/lib/store/types";
import { addPerformanceReview } from "@/lib/store/hr-actions";
import type { Session } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function PerformanceClient({
  reviews,
  session,
}: {
  reviews: PerformanceReview[];
  session: Session;
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

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Performance reviews</h2>
        {session.role === "hr_admin" || session.role === "ceo" ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addPerformanceReview(fd))}>
            <label className="text-sm">
              <span className="text-kastros-sage">Employee email</span>
              <input name="employeeEmail" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Reviewer / line manager email</span>
              <input name="managerEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder={session.email} />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Department</span>
              <input name="department" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Criteria set</span>
              <select name="criteriaType" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                <option>Technical</option>
                <option>Leadership</option>
                <option>Operations</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Grade</span>
              <select name="grade" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Manager comments</span>
              <textarea name="comments" rows={2} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Cycle</span>
              <input name="cycle" defaultValue="H1 2026" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Add review
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3">Employee</th>
                <th className="pb-3 pr-3">Reviewer</th>
                <th className="pb-3 pr-3">Department</th>
                <th className="pb-3 pr-3">Criteria</th>
                <th className="pb-3 pr-3">Grade</th>
                <th className="pb-3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 pr-3 text-kastros-sage">{r.employeeEmail}</td>
                  <td className="py-3 pr-3 text-kastros-sage">{r.managerEmail}</td>
                  <td className="py-3 pr-3">{r.department}</td>
                  <td className="py-3 pr-3">{r.criteriaType}</td>
                  <td className="py-3 pr-3 font-semibold text-kastros-forest">{r.grade}</td>
                  <td className="py-3 text-kastros-sage">{r.comments || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
