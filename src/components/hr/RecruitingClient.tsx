"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/Card";
import type { JobApplication, JobPosting } from "@/lib/store/types";
import { approveJobApplication, createJob, deleteJob } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ApplicantsTable({ apps, canMutate }: { apps: JobApplication[]; canMutate: boolean }) {
  if (apps.length === 0) {
    return <p className="text-sm text-kastros-sage">No submissions yet for this role.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-kastros-sand/80 bg-white/80">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
            <th className="px-3 py-2.5 pr-3 font-medium">Name</th>
            <th className="px-3 py-2.5 pr-3 font-medium">Email</th>
            <th className="px-3 py-2.5 pr-3 font-medium">Phone</th>
            <th className="px-3 py-2.5 pr-3 font-medium">Submitted</th>
            <th className="px-3 py-2.5 pr-3 font-medium">CV</th>
            <th className="px-3 py-2.5 pr-3 font-medium">Status</th>
            {canMutate ? <th className="px-3 py-2.5 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-kastros-sand text-kastros-ink">
          {apps.map((a) => (
            <tr key={a.id}>
              <td className="max-w-[14rem] px-3 py-2.5 pr-3 align-top">
                <div className="font-medium">{a.fullName}</div>
                {a.currentCompany || a.yearsExperience || a.linkedIn ? (
                  <div className="mt-0.5 text-xs text-kastros-sage">
                    {[a.currentCompany, a.yearsExperience].filter(Boolean).join(" · ")}
                    {a.linkedIn ? (
                      <>
                        {a.currentCompany || a.yearsExperience ? " · " : null}
                        <a
                          href={a.linkedIn}
                          className="text-kastros-forest underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          LinkedIn
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {a.salaryExpectation || a.noticePeriod ? (
                  <div className="mt-0.5 text-xs text-kastros-sage">
                    {a.salaryExpectation ? `Expectation: ${a.salaryExpectation}` : null}
                    {a.salaryExpectation && a.noticePeriod ? " · " : null}
                    {a.noticePeriod ? `Notice: ${a.noticePeriod}` : null}
                  </div>
                ) : null}
                {a.coverLetter ? (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-snug text-kastros-sage">{a.coverLetter}</p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 pr-3 align-top text-kastros-sage">{a.email}</td>
              <td className="px-3 py-2.5 pr-3 align-top text-kastros-sage">{a.phone}</td>
              <td className="px-3 py-2.5 pr-3 align-top text-kastros-sage tabular-nums">{formatSubmitted(a.submittedAt)}</td>
              <td className="px-3 py-2.5 align-top">
                {a.cvStoredRef ? (
                  <a
                    href={`/api/hr-file/${a.cvStoredRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-kastros-forest underline-offset-2 hover:underline"
                  >
                    {a.cvOriginalName ?? "View CV"}
                  </a>
                ) : (
                  <span className="text-kastros-sage">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 pr-3 align-top">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    a.reviewStatus === "approved"
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                      : "bg-white text-kastros-sage ring-1 ring-kastros-sand"
                  }`}
                >
                  {a.reviewStatus === "approved" ? "Approved" : "Submitted"}
                </span>
              </td>
              {canMutate ? (
                <td className="px-3 py-2.5 align-top">
                  <div className="flex flex-col gap-2">
                    {a.reviewStatus !== "approved" ? (
                      <form
                        action={async (fd) => {
                          await approveJobApplication(fd);
                        }}
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                        >
                          Approve
                        </button>
                      </form>
                    ) : (
                      <Link
                        href={`/onboarding?applicationId=${encodeURIComponent(a.id)}`}
                        className="inline-flex justify-center rounded-lg border border-kastros-gold/40 bg-kastros-cream px-3 py-1.5 text-center text-xs font-semibold text-kastros-forest hover:bg-kastros-cream/80"
                      >
                        Onboard
                      </Link>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecruitingClient({
  jobs,
  applications,
  canMutate,
  applyOrigin,
}: {
  jobs: JobPosting[];
  applications: JobApplication[];
  canMutate: boolean;
  applyOrigin: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byJob = useMemo(() => {
    const m = new Map<string, JobApplication[]>();
    for (const j of jobs) m.set(j.id, []);
    for (const a of applications) {
      if (!m.has(a.jobId)) m.set(a.jobId, []);
      m.get(a.jobId)!.push(a);
    }
    for (const list of m.values()) {
      list.sort((x, y) => y.submittedAt.localeCompare(x.submittedAt));
    }
    return m;
  }, [jobs, applications]);

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
        <Card title="New requisition" eyebrow="Hiring">
          <p className="text-sm text-kastros-sage">
            Create the role, then share the public apply link from the pipeline or applications section below.
          </p>
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
              <span className="text-kastros-sage">Description (shown on public apply page)</span>
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                placeholder="What the role involves and what you are looking for…"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Saving…" : "Create job"}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Pipeline" eyebrow="Recruiting">
        {jobs.length === 0 ? (
          <p className="text-sm text-kastros-sage">No open requisitions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Role</th>
                  <th className="pb-3 pr-3 font-medium">Location</th>
                  <th className="pb-3 pr-3 font-medium">Stage</th>
                  <th className="pb-3 pr-3 font-medium">Applicants</th>
                  <th className="pb-3 pr-3 font-medium">Candidate portal</th>
                  {canMutate ? <th className="pb-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {jobs.map((j) => {
                  const applyPath = `/apply/${j.id}`;
                  return (
                    <tr key={j.id} className="text-kastros-ink">
                      <td className="py-3 pr-3 font-medium">{j.title}</td>
                      <td className="py-3 pr-3 text-kastros-sage">{j.location}</td>
                      <td className="py-3 pr-3 text-kastros-sage">{j.stage}</td>
                      <td className="py-3 pr-3 tabular-nums">{j.applicantCount}</td>
                      <td className="py-3 pr-3">
                        <Link
                          href={applyPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-kastros-forest underline-offset-2 hover:underline"
                        >
                          Open portal
                        </Link>
                        <span className="mt-1 block max-w-[14rem] break-all text-[11px] leading-snug text-kastros-sage">
                          {`${applyOrigin}${applyPath}`}
                        </span>
                      </td>
                      {canMutate ? (
                        <td className="py-3">
                          <form action={(fd) => handle(deleteJob(fd))}>
                            <input type="hidden" name="id" value={j.id} />
                            <button
                              type="submit"
                              disabled={pending}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Applications & CVs" eyebrow="Candidates">
        <p className="text-sm text-kastros-sage">Submitted profiles and résumés for each open role (newest first).</p>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-kastros-sage">No roles to show.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {jobs.map((j) => {
              const apps = byJob.get(j.id) ?? [];
              const applyPath = `/apply/${j.id}`;
              return (
                <div key={j.id} className="rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold text-kastros-forest">{j.title}</h3>
                      <p className="text-xs text-kastros-sage">
                        {j.location} · {j.applicantCount} submitted
                      </p>
                    </div>
                    <Link
                      href={applyPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 justify-center rounded-xl bg-kastros-forest px-4 py-2 text-center text-sm font-semibold text-white"
                    >
                      Open application portal
                    </Link>
                  </div>
                  <ApplicantsTable apps={apps} canMutate={canMutate} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
