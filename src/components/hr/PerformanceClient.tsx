"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Employee, PerformanceReview } from "@/lib/store/types";
import { addPerformanceReview } from "@/lib/store/hr-actions";
import type { Session } from "@/lib/auth";
import { buildDepartmentOptions } from "@/lib/hr-picker-options";

type ActionResult = { ok: true } | { error: string };

const INPUT =
  "mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30";

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function PerformanceClient({
  reviews,
  session,
  employees,
  departmentNames,
}: {
  reviews: PerformanceReview[];
  session: Session;
  employees: Employee[];
  departmentNames: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const departmentOptions = buildDepartmentOptions(departmentNames);

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
              <span className="text-kastros-sage">Employee</span>
              <select name="employeeEmail" required className={INPUT}>
                <option value="" disabled>
                  Select employee…
                </option>
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} · {e.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Reviewer / line manager</span>
              <select name="managerEmail" defaultValue={session.email} className={INPUT}>
                <option value="">— None —</option>
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} · {e.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Department</span>
              <select name="department" required className={INPUT}>
                <option value="" disabled>
                  Select department…
                </option>
                {departmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Criteria set</span>
              <select name="criteriaType" className={INPUT}>
                <option>Technical</option>
                <option>Leadership</option>
                <option>Operations</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Grade</span>
              <select name="grade" className={INPUT}>
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Manager comments</span>
              <textarea name="comments" rows={2} className={INPUT} />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Cycle</span>
              <input name="cycle" defaultValue="H1 2026" className={INPUT} />
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
