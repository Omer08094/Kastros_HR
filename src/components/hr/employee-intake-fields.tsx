"use client";

import { useState, type ReactNode } from "react";

export type EmployeeIntakeDefaults = Partial<{
  name: string;
  fatherName: string;
  email: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  joiningDate: string;
  probationMonths: number;
  companyPhone: string;
  personalPhone: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  familyRelationName: string;
  familyRelationType: string;
  familyRelationFirm: string;
  familyLinked: "yes" | "no";
  reportsToEmail: string;
  eduTitle: string;
  eduInstitute: string;
  eduYear: string;
  certTitle: string;
  certIssuer: string;
  certYear: string;
}>;

/** Mirrors “Add team member” onboarding intake — shared by HR onboarding and the public apply portal. */
export function EmployeeIntakeFields({
  defaults,
  showSubtitle,
}: {
  defaults?: EmployeeIntakeDefaults;
  /** Hide subtitle when nested inside another form explanation */
  showSubtitle?: boolean;
}): ReactNode {
  const d = defaults ?? {};
  const [eduAttachmentName, setEduAttachmentName] = useState("");
  const [certAttachmentName, setCertAttachmentName] = useState("");

  return (
    <>
      {showSubtitle === false ? null : (
        <p className="sm:col-span-2 text-sm text-kastros-sage">
          Core HR fields (aligned with onboarding). Required items match what HR completes when adding someone to People.
        </p>
      )}
      <label className="text-sm">
        <span className="text-kastros-sage">Full name</span>
        <input
          name="name"
          required
          defaultValue={d.name}
          autoComplete="name"
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Father&apos;s name</span>
        <input
          name="fatherName"
          required
          defaultValue={d.fatherName}
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Work email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={d.email}
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Title</span>
        <input name="title" required defaultValue={d.title} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Department</span>
        <input name="department" required defaultValue={d.department} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Location</span>
        <input name="location" required defaultValue={d.location} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Employment type</span>
        <select
          name="employmentType"
          defaultValue={d.employmentType ?? "Permanent"}
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        >
          <option>Permanent</option>
          <option>Temporary</option>
          <option>Contractual</option>
          <option>Intern</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Joining date</span>
        <input name="joiningDate" type="date" required defaultValue={d.joiningDate} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Probation months</span>
        <input
          name="probationMonths"
          type="number"
          min={1}
          defaultValue={d.probationMonths ?? 3}
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Company phone</span>
        <input name="companyPhone" defaultValue={d.companyPhone} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Personal phone</span>
        <input
          name="personalPhone"
          required
          defaultValue={d.personalPhone}
          autoComplete="tel"
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Emergency contact name</span>
        <input name="emergencyContactName" defaultValue={d.emergencyContactName} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Emergency contact relation</span>
        <input name="emergencyContactRelation" defaultValue={d.emergencyContactRelation} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Emergency contact phone</span>
        <input name="emergencyContactPhone" defaultValue={d.emergencyContactPhone} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Family relation name</span>
        <input name="familyRelationName" defaultValue={d.familyRelationName} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Family relation type</span>
        <input name="familyRelationType" defaultValue={d.familyRelationType} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Family firm / employer</span>
        <input name="familyRelationFirm" defaultValue={d.familyRelationFirm} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Linked to traders/merchandisers?</span>
        <select name="familyLinked" defaultValue={d.familyLinked ?? "no"} className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="text-kastros-sage">Reports to (manager email, optional)</span>
        <input
          name="reportsToEmail"
          type="email"
          defaultValue={d.reportsToEmail}
          className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
          placeholder="marcus.manager@kastros.demo"
        />
      </label>

      <div className="mt-2 rounded-xl border border-kastros-sand/80 bg-kastros-cream/25 p-4 sm:col-span-2">
        <h3 className="font-display text-sm font-semibold text-kastros-forest">Education (optional)</h3>
        <p className="mt-1 text-xs text-kastros-sage">
          Degree record on People. Attach a file to save it under <span className="font-mono">data/uploads</span> when processed by HR.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Degree / qualification title</span>
            <input
              name="eduTitle"
              placeholder="e.g. BSc Economics"
              defaultValue={d.eduTitle}
              className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Institution</span>
            <input name="eduInstitute" placeholder="University or school" defaultValue={d.eduInstitute} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Year completed</span>
            <input name="eduYear" placeholder="2024" defaultValue={d.eduYear} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Educational document (scan / transcript)</span>
            <input
              type="file"
              name="eduDocument"
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-3 file:py-1.5"
              onChange={(ev) => setEduAttachmentName(ev.target.files?.[0]?.name ?? "")}
            />
            {eduAttachmentName ? <span className="mt-1 block text-xs text-kastros-forest">Selected: {eduAttachmentName}</span> : null}
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-kastros-sand/80 bg-kastros-cream/25 p-4 sm:col-span-2">
        <h3 className="font-display text-sm font-semibold text-kastros-forest">Certification (optional)</h3>
        <p className="mt-1 text-xs text-kastros-sage">Shows on People under education when HR creates the employee record.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Certification name</span>
            <input
              name="certTitle"
              placeholder="e.g. ISO 9001 Internal Auditor"
              defaultValue={d.certTitle}
              className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Issuing organization</span>
            <input name="certIssuer" placeholder="Optional" defaultValue={d.certIssuer} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-kastros-sage">Year</span>
            <input name="certYear" placeholder="Optional" defaultValue={d.certYear} className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-kastros-sage">Certificate file</span>
            <input
              type="file"
              name="certDocument"
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-3 file:py-1.5"
              onChange={(ev) => setCertAttachmentName(ev.target.files?.[0]?.name ?? "")}
            />
            {certAttachmentName ? <span className="mt-1 block text-xs text-kastros-forest">Selected: {certAttachmentName}</span> : null}
          </label>
        </div>
      </div>
    </>
  );
}
