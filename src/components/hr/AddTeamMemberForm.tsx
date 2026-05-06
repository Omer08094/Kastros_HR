"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addEmployee } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function AddTeamMemberForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eduAttachmentName, setEduAttachmentName] = useState("");
  const [certAttachmentName, setCertAttachmentName] = useState("");

  function handle(p: Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const err = await runAction(p, () => {
        setEduAttachmentName("");
        setCertAttachmentName("");
        router.refresh();
      });
      if (err) setError(err);
    });
  }

  return (
    <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-kastros-forest">Add team member</h2>
      <p className="mt-1 text-sm text-kastros-sage">Includes family compliance, onboarding, contact, and probation details.</p>
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addEmployee(fd))}>
        <label className="text-sm">
          <span className="text-kastros-sage">Full name</span>
          <input
            name="name"
            required
            className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Father&apos;s name</span>
          <input name="fatherName" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Work email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Title</span>
          <input name="title" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Department</span>
          <input name="department" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Location</span>
          <input name="location" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Employment type</span>
          <select name="employmentType" defaultValue="Permanent" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm">
            <option>Permanent</option>
            <option>Temporary</option>
            <option>Contractual</option>
            <option>Intern</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Joining date</span>
          <input name="joiningDate" type="date" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Probation months</span>
          <input name="probationMonths" type="number" min={1} defaultValue={3} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Company phone</span>
          <input name="companyPhone" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Personal phone</span>
          <input name="personalPhone" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Emergency contact name</span>
          <input name="emergencyContactName" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Emergency contact relation</span>
          <input name="emergencyContactRelation" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Emergency contact phone</span>
          <input name="emergencyContactPhone" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Family relation name</span>
          <input name="familyRelationName" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Family relation type</span>
          <input name="familyRelationType" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Family firm / employer</span>
          <input name="familyRelationFirm" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-kastros-sage">Linked to traders/merchandisers?</span>
          <select name="familyLinked" defaultValue="no" className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-kastros-sage">Reports to (manager email, optional)</span>
          <input
            name="reportsToEmail"
            type="email"
            className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
            placeholder="marcus.manager@kastros.demo"
          />
        </label>

        <div className="sm:col-span-2 mt-2 rounded-xl border border-kastros-sand/80 bg-kastros-cream/25 p-4">
          <h3 className="font-display text-sm font-semibold text-kastros-forest">Education (optional)</h3>
          <p className="mt-1 text-xs text-kastros-sage">
            Degree record on People. Attach a file to save it under <span className="font-mono">data/uploads</span> and open it from the
            person&apos;s profile (within the upload size limit).
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Degree / qualification title</span>
              <input
                name="eduTitle"
                placeholder="e.g. BSc Economics"
                className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Institution</span>
              <input name="eduInstitute" placeholder="University or school" className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Year completed</span>
              <input name="eduYear" placeholder="2024" className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Educational document (scan / transcript)</span>
              <input
                type="file"
                name="eduDocument"
                className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-3 file:py-1.5"
                onChange={(ev) => setEduAttachmentName(ev.target.files?.[0]?.name ?? "")}
              />
              {eduAttachmentName ? (
                <span className="mt-1 block text-xs text-kastros-forest">Selected: {eduAttachmentName}</span>
              ) : null}
            </label>
          </div>
        </div>

        <div className="sm:col-span-2 rounded-xl border border-kastros-sand/80 bg-kastros-cream/25 p-4">
          <h3 className="font-display text-sm font-semibold text-kastros-forest">Certification (optional)</h3>
          <p className="mt-1 text-xs text-kastros-sage">
            Shows on People under education. Optional certificate file is stored like degree uploads when provided.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Certification name</span>
              <input
                name="certTitle"
                placeholder="e.g. ISO 9001 Internal Auditor"
                className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Issuing organization</span>
              <input name="certIssuer" placeholder="Optional" className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Year</span>
              <input name="certYear" placeholder="Optional" className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Certificate file</span>
              <input
                type="file"
                name="certDocument"
                className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-3 file:py-1.5"
                onChange={(ev) => setCertAttachmentName(ev.target.files?.[0]?.name ?? "")}
              />
              {certAttachmentName ? (
                <span className="mt-1 block text-xs text-kastros-forest">Selected: {certAttachmentName}</span>
              ) : null}
            </label>
          </div>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create employee"}
          </button>
        </div>
      </form>
    </section>
  );
}
