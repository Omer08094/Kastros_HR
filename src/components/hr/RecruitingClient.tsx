"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { JobPosting } from "@/lib/store/types";
import { bumpApplicants, createJob, deleteJob } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function RecruitingClient({ jobs, canMutate }: { jobs: JobPosting[]; canMutate: boolean }) {
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

      {canMutate ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">New requisition</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(createJob(fd))}>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Title</span>
              <input name="title" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Location</span>
              <input name="location" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Stage</span>
              <input name="stage" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="Applied" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Applicants (starting count)</span>
              <input name="applicantCount" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Saving…" : "Create job"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Pipeline</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3 font-medium">Role</th>
                <th className="pb-3 pr-3 font-medium">Location</th>
                <th className="pb-3 pr-3 font-medium">Stage</th>
                <th className="pb-3 pr-3 font-medium">Applicants</th>
                {canMutate ? <th className="pb-3 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {jobs.map((j) => (
                <tr key={j.id} className="text-kastros-ink">
                  <td className="py-3 pr-3 font-medium">{j.title}</td>
                  <td className="py-3 pr-3 text-kastros-sage">{j.location}</td>
                  <td className="py-3 pr-3 text-kastros-sage">{j.stage}</td>
                  <td className="py-3 pr-3 tabular-nums">{j.applicantCount}</td>
                  {canMutate ? (
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={(fd) => handle(bumpApplicants(fd))}>
                          <input type="hidden" name="id" value={j.id} />
                          <input type="hidden" name="delta" value="1" />
                          <button type="submit" disabled={pending} className="rounded-lg bg-kastros-cream px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50">
                            +1 applicant
                          </button>
                        </form>
                        <form action={(fd) => handle(deleteJob(fd))}>
                          <input type="hidden" name="id" value={j.id} />
                          <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
