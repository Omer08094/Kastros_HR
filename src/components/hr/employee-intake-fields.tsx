"use client";

import { useState, type ReactNode } from "react";
import { Field, FileField, SelectField, TextareaField } from "@/components/Field";
import { mergeDepartmentOptions } from "@/lib/executive-org";
import { BUSINESS_UNITS } from "@/lib/store/types";

export type EmployeeIntakeDefaults = Partial<{
  salutation: string;
  name: string;
  fatherName: string;
  email: string;
  title: string;
  designationNumber: string;
  officialNumber: string;
  department: string;
  subDepartment: string;
  location: string;
  businessUnit: string;
  employmentType: string;
  joiningDate: string;
  probationMonths: number;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  secondNationality: string;
  maritalStatus: string;
  religion: string;
  cnic: string;
  cnicExpiry: string;
  address: string;
  dutyHours: number;
  dutyDays: number;
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
  hasCompanyVehicle: boolean;
  vehicleNumber: string;
  drivingLicenceNumber: string;
  drivingLicenceExpiry: string;
  hasGratuity: boolean;
  hasEobi: boolean;
  hasProvidentFund: boolean;
}>;

/** Visual section heading used inside the intake form. */
function SectionTitle({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="sm:col-span-2 mt-4 first:mt-0">
      <h3 className="font-display text-sm font-semibold text-kastros-forest">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-kastros-sage">{hint}</p> : null}
      <div className="mt-2 h-px w-full bg-kastros-sand" />
    </div>
  );
}

type EducationRow = { degree: string; institution: string; year: string };

/**
 * Mirrors "Add team member" onboarding intake. Used by HR onboarding and by
 * the public apply portal. All fields use the shared `<Field>` component which
 * gives us per-keystroke validation (email/phone/CNIC/date/number/required).
 */
export function EmployeeIntakeFields({
  defaults,
  showSubtitle,
  departments = [],
  subDepartments = [],
  employees = [],
}: {
  defaults?: EmployeeIntakeDefaults;
  showSubtitle?: boolean;
  departments?: string[];
  subDepartments?: { id: string; name: string; departmentId: string }[];
  employees?: { email: string; name: string }[];
}): ReactNode {
  const d = defaults ?? {};
  const [hasVehicle, setHasVehicle] = useState<boolean>(d.hasCompanyVehicle ?? false);
  const [selectedDept, setSelectedDept] = useState<string>(d.department ?? "");
  const [eduRows, setEduRows] = useState<EducationRow[]>([{ degree: "", institution: "", year: "" }]);

  const filteredSubDepts = subDepartments.filter((s) => {
    if (!selectedDept) return true;
    return s.name.toLowerCase().includes(selectedDept.toLowerCase()) || true;
  });

  function addEduRow() {
    setEduRows((r) => [...r, { degree: "", institution: "", year: "" }]);
  }

  function removeEduRow(i: number) {
    setEduRows((r) => r.filter((_, idx) => idx !== i));
  }

  function updateEduRow(i: number, field: keyof EducationRow, value: string) {
    setEduRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  const deptNames = mergeDepartmentOptions(departments);
  const deptOptions = deptNames.length > 0 ? deptNames.map((n) => ({ value: n, label: n })) : undefined;

  return (
    <>
      {showSubtitle === false ? null : (
        <p className="sm:col-span-2 text-sm text-kastros-sage">
          Core HR fields. Required items are marked with{" "}
          <span className="font-semibold text-red-600">*</span>. Each field validates as you type.
        </p>
      )}

      <SectionTitle title="Identity" hint="Personal details for ID card, contracts, and statutory records." />

      {/* Salutation + Name on one row */}
      <div className="flex gap-2 items-end">
        <SelectField
          name="salutation"
          label="Salutation"
          defaultValue={d.salutation}
          options={["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Prof."]}
        />
      </div>
      <Field name="name" label="Full name" required defaultValue={d.name} autoComplete="name" />
      <Field name="fatherName" label="Father's name" required defaultValue={d.fatherName} />
      <Field name="email" kind="email" label="Work email" required defaultValue={d.email} autoComplete="email" />
      <Field
        name="personalPhone"
        kind="tel"
        label="Personal phone *"
        required
        defaultValue={d.personalPhone}
        autoComplete="tel"
        hint="Numbers, spaces, +, - and parentheses are fine."
      />
      <Field name="dateOfBirth" kind="date" label="Date of birth *" required defaultValue={d.dateOfBirth} />
      <SelectField
        name="gender"
        label="Gender"
        defaultValue={d.gender}
        options={["Male", "Female", "Other", "Prefer not to say"]}
      />
      <Field
        name="nationality"
        label="Nationality *"
        required
        defaultValue={d.nationality}
        hint="e.g. Pakistani. Add a second nationality below if applicable."
      />
      <Field
        name="secondNationality"
        label="Second nationality (if dual)"
        defaultValue={d.secondNationality}
        hint="Leave blank if not dual citizen."
      />
      <SelectField
        name="maritalStatus"
        label="Marital status"
        defaultValue={d.maritalStatus}
        options={["Single", "Married", "Divorced", "Widowed"]}
      />
      <Field name="religion" label="Religion *" required defaultValue={d.religion} />
      <Field
        name="cnic"
        kind="cnic"
        label="CNIC / national ID"
        required
        defaultValue={d.cnic}
        placeholder="12345-1234567-1"
        hint="Pakistan format auto-formats as you type."
      />
      <Field
        name="cnicExpiry"
        kind="date"
        label="CNIC expiry *"
        required
        defaultValue={d.cnicExpiry}
        hint="Used for renewal reminders."
      />
      <TextareaField
        name="address"
        label="Address *"
        required
        defaultValue={d.address}
        rows={2}
        span2
        hint="Full residential address (used on letters & ID card)."
      />

      <SectionTitle
        title="Employment"
        hint="Where this employee will sit in the company and how their contract is structured."
      />

      <Field name="title" label="Designation / title" required defaultValue={d.title} />
      <Field
        name="designationNumber"
        label="Designation number"
        defaultValue={d.designationNumber}
        hint="Optional code linking to the Job Spec / JD."
      />
      <Field
        name="officialNumber"
        label="Official number"
        defaultValue={d.officialNumber}
        hint="Regulatory / govt reference if any."
      />

      {/* Department — dropdown if departments exist, else free-text */}
      {deptOptions ? (
        <SelectField
          name="department"
          label="Department *"
          required
          defaultValue={d.department}
          options={deptOptions}
          onChange={(v) => setSelectedDept(v)}
          hint="CEO / group leadership: choose Executive Office. Sub-department can stay blank."
        />
      ) : (
        <Field
          name="department"
          label="Department *"
          required
          defaultValue={d.department}
          hint="CEO / group leadership: type Executive Office. Sub-department optional. Add more departments in Organization setup."
          onChange={(v) => setSelectedDept(v)}
        />
      )}

      {/* Sub-department */}
      {filteredSubDepts.length > 0 ? (
        <SelectField
          name="subDepartment"
          label="Sub-department"
          defaultValue={d.subDepartment}
          options={[{ value: "", label: "— None —" }, ...filteredSubDepts.map((s) => ({ value: s.name, label: s.name }))]}
        />
      ) : (
        <Field name="subDepartment" label="Sub-department (optional)" defaultValue={d.subDepartment} hint="e.g. Cotton Trading, Soybean" />
      )}

      <SelectField
        name="businessUnit"
        label="Business Unit *"
        required
        defaultValue={d.businessUnit}
        options={BUSINESS_UNITS.map((b) => b)}
        hint="Drives the employee's payroll currency (UAE → AED, Karachi/Multan → PKR)."
      />
      <Field name="location" label="Location / city" required defaultValue={d.location} />
      <SelectField
        name="employmentType"
        label="Employment type"
        required
        defaultValue={d.employmentType ?? "Permanent"}
        options={["Permanent", "Temporary", "Contractual", "Intern", "Trainee"]}
      />
      <Field name="joiningDate" kind="date" label="Date of joining" required defaultValue={d.joiningDate} />
      <SelectField
        name="probationMonths"
        label="Probation period"
        defaultValue={String(d.probationMonths ?? 3)}
        options={[
          { value: "0", label: "No probation" },
          { value: "3", label: "3 months" },
          { value: "6", label: "6 months" },
        ]}
      />
      <Field
        name="dutyHours"
        kind="number"
        label="Duty hours / week"
        min={0}
        max={80}
        defaultValue={String(d.dutyHours ?? "")}
        placeholder="e.g. 45"
      />
      <Field
        name="dutyDays"
        kind="number"
        label="Duty days / week"
        min={1}
        max={7}
        defaultValue={String(d.dutyDays ?? "")}
        placeholder="e.g. 5"
      />
      <Field
        name="employeeIdDisplay"
        label="Employee ID (for ID card)"
        placeholder="e.g. KST-1001"
        hint="Leave blank to auto-generate."
      />
      <Field name="companyPhone" kind="tel" label="Official / company phone" defaultValue={d.companyPhone} />

      {/* Reports to — dropdown if employees list provided */}
      {employees.length > 0 ? (
        <SelectField
          name="reportsToEmail"
          label="Reports to (manager)"
          defaultValue={d.reportsToEmail}
          span2
          hint="Leave as None for CEO or anyone at the top of the org chart."
          options={[
            { value: "", label: "— None (CEO / top leadership) —" },
            ...employees.map((e) => ({ value: e.email, label: `${e.name} (${e.email})` })),
          ]}
        />
      ) : (
        <Field
          name="reportsToEmail"
          kind="email"
          label="Reports to (manager email)"
          defaultValue={d.reportsToEmail}
          span2
          placeholder="Leave blank for CEO"
          hint="Optional. Leave empty for CEO or group leadership."
        />
      )}

      <SectionTitle title="Benefits & statutory flags" hint="Select which schemes apply to this employee." />
      <div className="sm:col-span-2 flex flex-wrap gap-5">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="hasGratuity"
            value="1"
            defaultChecked={d.hasGratuity ?? false}
            className="rounded border-kastros-sand text-kastros-brandGreen focus:ring-kastros-brandGreen"
          />
          <span>Gratuity eligible</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="hasEobi"
            value="1"
            defaultChecked={d.hasEobi ?? false}
            className="rounded border-kastros-sand text-kastros-brandGreen focus:ring-kastros-brandGreen"
          />
          <span>EOBI enrolled</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="hasProvidentFund"
            value="1"
            defaultChecked={d.hasProvidentFund ?? false}
            className="rounded border-kastros-sand text-kastros-brandGreen focus:ring-kastros-brandGreen"
          />
          <span>Provident Fund enrolled</span>
        </label>
      </div>

      <SectionTitle
        title="Vehicle & licences"
        hint="Driving licence + vehicle number are required only if a company car is assigned."
      />
      <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="hasCompanyVehicle"
          value="1"
          checked={hasVehicle}
          onChange={(e) => setHasVehicle(e.target.checked)}
          className="rounded border-kastros-sand text-kastros-brandGreen focus:ring-kastros-brandGreen"
        />
        <span className="text-kastros-ink">Company vehicle assigned</span>
      </label>
      {hasVehicle ? (
        <>
          <Field
            name="vehicleNumber"
            label="Vehicle number"
            defaultValue={d.vehicleNumber}
            placeholder="e.g. DXB-A-12345"
            required
          />
          <Field
            name="drivingLicenceNumber"
            label="Driving licence number"
            defaultValue={d.drivingLicenceNumber}
            required
          />
          <Field
            name="drivingLicenceExpiry"
            kind="date"
            label="Driving licence expiry"
            defaultValue={d.drivingLicenceExpiry}
            span2
          />
        </>
      ) : null}

      <SectionTitle title="Profile photo (ID card) *" />
      <FileField
        name="profilePhoto"
        label="Upload a PNG / JPG / WebP photo *"
        accept="image/png,image/jpeg,image/webp"
        span2
      />

      <SectionTitle title="Emergency contact *" hint="Required: at least one emergency contact." />
      <Field name="emergencyContactName" label="Name *" required defaultValue={d.emergencyContactName} />
      <Field
        name="emergencyContactRelation"
        label="Relation *"
        required
        defaultValue={d.emergencyContactRelation}
        placeholder="e.g. Spouse, Parent"
      />
      <Field
        name="emergencyContactPhone"
        kind="tel"
        label="Phone *"
        required
        defaultValue={d.emergencyContactPhone}
      />

      <SectionTitle title="Family declarations" hint="Conflict-of-interest disclosure." />
      <Field name="familyRelationName" label="Family relation name" defaultValue={d.familyRelationName} />
      <Field name="familyRelationType" label="Family relation type" defaultValue={d.familyRelationType} />
      <Field name="familyRelationFirm" label="Family firm / employer" defaultValue={d.familyRelationFirm} />
      <SelectField
        name="familyLinked"
        label="Linked to traders / merchandisers?"
        defaultValue={d.familyLinked ?? "no"}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
      />

      <SectionTitle title="Education" hint="Add one row per degree or qualification. Degree, institution, and year on one line." />
      {eduRows.map((row, i) => (
        <div key={i} className="sm:col-span-2 flex flex-wrap items-end gap-2 rounded-xl bg-kastros-cream/40 p-3 ring-1 ring-kastros-sand/60">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-kastros-sage mb-1">Degree / qualification</label>
            <input
              name="eduDegree"
              value={row.degree}
              onChange={(e) => updateEduRow(i, "degree", e.target.value)}
              placeholder="e.g. BBA, MBA, B.Sc"
              className="w-full rounded-lg border border-kastros-sand px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-kastros-forest"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-kastros-sage mb-1">Institution</label>
            <input
              name="eduInstitution"
              value={row.institution}
              onChange={(e) => updateEduRow(i, "institution", e.target.value)}
              placeholder="e.g. IBA Karachi"
              className="w-full rounded-lg border border-kastros-sand px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-kastros-forest"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-kastros-sage mb-1">Year</label>
            <input
              name="eduYear"
              value={row.year}
              onChange={(e) => updateEduRow(i, "year", e.target.value)}
              placeholder="2024"
              maxLength={4}
              className="w-full rounded-lg border border-kastros-sand px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-kastros-forest"
            />
          </div>
          {eduRows.length > 1 ? (
            <button
              type="button"
              onClick={() => removeEduRow(i)}
              className="text-xs font-semibold text-red-700 hover:underline self-end pb-1.5"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={addEduRow}
          className="rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand hover:bg-kastros-sand/30"
        >
          + Add education row
        </button>
      </div>
    </>
  );
}
