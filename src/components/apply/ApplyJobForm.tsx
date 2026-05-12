"use client";

import { useState, useTransition } from "react";
import { EmployeeIntakeFields } from "@/components/hr/employee-intake-fields";
import { submitJobApplication } from "@/lib/store/hr-actions";
import type { JobPosting } from "@/lib/store/types";

export function ApplyJobForm({ job }: { job: JobPosting }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("jobId", job.id);
    setError(null);
    start(async () => {
      const r = await submitJobApplication(formData);
      if ("error" in r) setError(r.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-kastros-sand bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-kastros-forest">Application received</h1>
        <p className="mt-3 text-sm text-kastros-sage">
          Thank you for applying for <span className="font-medium text-kastros-ink">{job.title}</span>. Our team will review your profile and
          be in touch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-kastros-sand bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-kastros-forest">{job.title}</h1>
        <p className="mt-1 text-sm text-kastros-sage">{job.location}</p>
        {job.description ? <p className="mt-4 text-sm leading-relaxed text-kastros-ink">{job.description}</p> : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <form action={handleSubmit} className="rounded-2xl border border-kastros-sand bg-white p-6 shadow-sm">
        <input type="hidden" name="jobId" value={job.id} />

        <h2 className="font-display text-lg font-semibold text-kastros-forest">Your HR profile</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Same details your HR team captures when adding someone in onboarding — complete every required field.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <EmployeeIntakeFields showSubtitle={false} />
        </div>

        <div className="mt-8 border-t border-kastros-sand pt-6">
          <h3 className="font-display text-base font-semibold text-kastros-forest">Recruiting profile</h3>
          <p className="mt-1 text-sm text-kastros-sage">Additional context for the hiring panel.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">LinkedIn (optional)</span>
              <input name="linkedIn" type="url" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="https://…" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Current employer (optional)</span>
              <input name="currentCompany" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Years of experience (optional)</span>
              <input name="yearsExperience" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" placeholder="e.g. 5 years" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Salary expectations (optional)</span>
              <input name="salaryExpectation" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Notice period (optional)</span>
              <input name="noticePeriod" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Cover letter (optional)</span>
              <textarea name="coverLetter" rows={4} className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
          </div>
        </div>

        <div className="mt-8 border-t border-kastros-sand pt-6">
          <h3 className="font-display text-base font-semibold text-kastros-forest">CV / résumé</h3>
          <p className="mt-1 text-sm text-kastros-sage">PDF or Word (max 5MB).</p>
          <label className="mt-3 block text-sm sm:col-span-2">
            <span className="text-kastros-sage">Upload</span>
            <input
              name="cv"
              type="file"
              required
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-kastros-cream file:px-3 file:py-2 file:text-sm file:font-semibold file:text-kastros-forest"
            />
          </label>
        </div>

        <div className="mt-8">
          <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>
    </div>
  );
}
