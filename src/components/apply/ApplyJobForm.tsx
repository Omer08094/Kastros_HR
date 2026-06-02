"use client";

import { useState, useTransition } from "react";
import { submitJobApplication } from "@/lib/store/hr-actions";
import type { JobPosting } from "@/lib/store/types";

type EducationRow = { degree: string; institution: string; year: string };

export function ApplyJobForm({ job }: { job: JobPosting }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [eduRows, setEduRows] = useState<EducationRow[]>([{ degree: "", institution: "", year: "" }]);

  function addEduRow() {
    setEduRows((rows) => [...rows, { degree: "", institution: "", year: "" }]);
  }

  function removeEduRow(index: number) {
    setEduRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  function updateEduRow(index: number, key: keyof EducationRow, value: string) {
    setEduRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

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

        <h2 className="font-display text-lg font-semibold text-kastros-forest">Candidate profile</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Share your core contact details. Employment setup (department, business unit, manager, etc.) is completed by HR after approval.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Full name</span>
            <input name="name" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Email</span>
            <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Phone</span>
            <input name="personalPhone" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Education (optional)</span>
            <div className="mt-1 space-y-2">
              {eduRows.map((row, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1.1fr_1.1fr_0.6fr_auto]">
                  <input
                    name="eduDegree"
                    value={row.degree}
                    onChange={(e) => updateEduRow(i, "degree", e.target.value)}
                    placeholder="Degree / qualification"
                    className="rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                  />
                  <input
                    name="eduInstitution"
                    value={row.institution}
                    onChange={(e) => updateEduRow(i, "institution", e.target.value)}
                    placeholder="Institution"
                    className="rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                  />
                  <input
                    name="eduYear"
                    value={row.year}
                    onChange={(e) => updateEduRow(i, "year", e.target.value)}
                    placeholder="Year"
                    className="rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                  />
                  {eduRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeEduRow(i)}
                      className="rounded-xl border border-kastros-sand px-3 py-2 text-xs font-semibold text-kastros-sage hover:text-red-700"
                    >
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-kastros-sage">If you fill one education field, fill all three (degree, institution, year).</p>
            <button
              type="button"
              onClick={addEduRow}
              className="mt-2 rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand hover:bg-kastros-sand/30"
            >
              + Add education row
            </button>
          </label>
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
