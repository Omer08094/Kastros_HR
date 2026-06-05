"use client";

import type { ReactNode } from "react";
import type {
  AcademicRecord,
  DocumentRow,
  Employee,
  PolicyAcknowledgement,
  PolicyManual,
  SalaryAllowanceCatalogItem,
} from "@/lib/store/types";
import { BLOOD_GROUPS } from "@/lib/store/types";
import {
  addAcademicRecord,
  addDocument,
  deleteAcademicRecord,
  deleteDocument,
  recordPolicyAcknowledgementForEmployee,
  resendEmployeePasswordReset,
  updateEmployee,
} from "@/lib/store/hr-actions";
import { EmployeeSalarySection } from "@/components/hr/EmployeeSalarySection";
import { formatEmployeeDepartment } from "@/lib/executive-org";

const INP = "w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm";

function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2 text-sm sm:grid-cols-[minmax(0,140px)_1fr] sm:gap-x-4">{children}</dl>;
}

function Row({
  label,
  editing,
  view,
  edit,
}: {
  label: string;
  editing: boolean;
  view: ReactNode;
  edit?: ReactNode;
}) {
  return (
    <div className="contents">
      <dt className="text-kastros-sage">{label}</dt>
      <dd className="min-w-0 text-kastros-ink">{editing && edit != null ? edit : view}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-kastros-brandGreen">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const FILE_INP =
  "mt-1 block w-full text-xs file:mr-2 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-2 file:py-1";

function ProfileLinkedRecordsSection({
  employee: e,
  editing,
  canManage,
  documents: personDocs,
  academics: personAcademics,
  acknowledgements: personAcks,
  policies,
  policyTitle,
  pending,
  onAction,
  onSaved,
}: {
  employee: Employee;
  editing: boolean;
  canManage: boolean;
  documents: DocumentRow[];
  academics: AcademicRecord[];
  acknowledgements: PolicyAcknowledgement[];
  policies: PolicyManual[];
  policyTitle: (id: string) => string;
  pending: boolean;
  onAction: (p: Promise<ActionResult>, onSuccess?: () => void, successMessage?: string) => void;
  onSaved: () => void;
}) {
  const manageLinked = editing && canManage;
  const ackedIds = new Set(personAcks.map((a) => a.policyId));
  const pendingPolicies = policies.filter((p) => !ackedIds.has(p.id));

  return (
    <>
      <Section title="Education & certifications">
        {personAcademics.length ? (
          <ul className="space-y-3 text-sm">
            {personAcademics.map((a) => (
              <li key={a.id} className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-kastros-sand/50">
                <span className="font-medium text-kastros-forest">{a.title}</span>{" "}
                <span className="text-kastros-sage">({a.type})</span>
                <div className="mt-1 text-xs text-kastros-sage">
                  {a.institute} · {a.year}
                  {a.attachmentName ? ` · ${a.attachmentName}` : ""}
                </div>
                {a.storedRef ? (
                  <a
                    href={`/api/hr-file/${a.storedRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-kastros-forest underline"
                  >
                    View file
                  </a>
                ) : null}
                {manageLinked ? (
                  <form className="mt-2" action={(fd) => onAction(deleteAcademicRecord(fd), onSaved, "Education record removed")}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                      Remove record
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-kastros-sage">No academic records on file.</p>
        )}
        {e.education.length > 0 ? (
          <div className="mt-4 border-t border-kastros-sand/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">On employee record</p>
            <ul className="mt-2 space-y-1 text-sm">
              {e.education.map((ed, i) => (
                <li key={i}>
                  {ed.degree} · {ed.institution} · {ed.year}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {manageLinked ? (
          <form
            className="mt-4 space-y-2 border-t border-kastros-sand/60 pt-4"
            action={(fd) => onAction(addAcademicRecord(fd), onSaved, "Education record added")}
          >
            <input type="hidden" name="employeeEmail" value={e.email} />
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Add degree or certification</p>
            <select name="type" defaultValue="Degree" className={INP}>
              <option value="Degree">Degree</option>
              <option value="Certification">Certification</option>
            </select>
            <input name="title" required placeholder="Title (e.g. BSc Computer Science)" className={INP} />
            <input name="institute" required placeholder="Institution / issuer" className={INP} />
            <input name="year" placeholder="Year" className={INP} />
            <input name="attachmentName" placeholder="File label (optional)" className={INP} />
            <label className="block text-xs text-kastros-sage">
              Certificate / transcript (optional)
              <input
                name="attachmentFile"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf"
                className={FILE_INP}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-kastros-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Add record
            </button>
          </form>
        ) : null}
      </Section>

      <Section title="Personnel documents">
        {personDocs.length ? (
          <ul className="space-y-3 text-sm">
            {personDocs.map((d) => (
              <li key={d.id} className="rounded-lg bg-white/60 ring-1 ring-kastros-sand/50">
                {d.storedRef ? (
                  <a
                    href={`/api/hr-file/${d.storedRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg px-3 py-2 hover:bg-kastros-cream/60"
                  >
                    <span className="font-medium text-kastros-forest">{d.name}</span>
                  </a>
                ) : (
                  <div className="px-3 py-2">
                    <span className="font-medium text-kastros-forest">{d.name}</span>
                  </div>
                )}
                {canManage && (manageLinked || !editing) ? (
                  <div className="border-t border-kastros-sand/60 px-3 py-2">
                    <form action={(fd) => onAction(deleteDocument(fd), onSaved, "Document removed")}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                        Remove
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-kastros-sage">No personnel documents linked.</p>
        )}
        {manageLinked ? (
          <form className="mt-4 space-y-2 border-t border-kastros-sand/60 pt-4" action={(fd) => onAction(addDocument(fd), onSaved, "Document added")}>
            <input type="hidden" name="employeeEmail" value={e.email} />
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Add personnel document</p>
            <input name="name" required placeholder="Document name" className={INP} />
            <input name="owner" required defaultValue="People Ops" placeholder="Owner" className={INP} />
            <select name="sensitivity" defaultValue="Internal" className={INP}>
              <option>Internal</option>
              <option>Confidential</option>
              <option>Restricted</option>
            </select>
            <label className="block text-xs text-kastros-sage">
              File (optional)
              <input
                name="documentFile"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf"
                className={FILE_INP}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-kastros-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Add document
            </button>
          </form>
        ) : null}
      </Section>

      <Section title="Policy acknowledgements">
        {personAcks.length ? (
          <ul className="space-y-2 text-sm text-kastros-ink">
            {personAcks.map((a) => (
              <li key={a.id} className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-kastros-sand/50">
                <span className="font-medium">{policyTitle(a.policyId)}</span>
                <span className="text-kastros-sage"> — {new Date(a.acknowledgedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-kastros-sage">No policy acknowledgements yet.</p>
        )}
        {manageLinked ? (
          <div className="mt-4 space-y-3 border-t border-kastros-sand/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Record acknowledgement (HR)</p>
            {pendingPolicies.length === 0 ? (
              <p className="text-sm text-kastros-sage">All policies are acknowledged for this employee.</p>
            ) : (
              <ul className="space-y-2">
                {pendingPolicies.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2 ring-1 ring-kastros-sand/50">
                    <span className="text-sm font-medium text-kastros-forest">
                      {p.title} <span className="font-normal text-kastros-sage">({p.version})</span>
                    </span>
                    <form action={(fd) => onAction(recordPolicyAcknowledgementForEmployee(fd), onSaved, "Policy acknowledgement saved")}>
                      <input type="hidden" name="policyId" value={p.id} />
                      <input type="hidden" name="employeeEmail" value={e.email} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Record ack
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Section>
    </>
  );
}

type ActionResult = { ok: true } | { error: string };

export function EmployeeProfileCard({
  employee: e,
  editing,
  canManage,
  allowanceTypes,
  documents: personDocs,
  academics: personAcademics,
  acknowledgements: personAcks,
  policies,
  pending,
  policyTitle,
  onError,
  onSaved,
  onCancel,
  onAction,
  onNotifySuccess,
}: {
  employee: Employee;
  editing: boolean;
  canManage: boolean;
  allowanceTypes: SalaryAllowanceCatalogItem[];
  documents: DocumentRow[];
  academics: AcademicRecord[];
  acknowledgements: PolicyAcknowledgement[];
  policies: PolicyManual[];
  pending: boolean;
  policyTitle: (id: string) => string;
  onError: (msg: string | null) => void;
  onSaved: () => void;
  onCancel: () => void;
  onAction: (p: Promise<ActionResult>, onSuccess?: () => void, successMessage?: string) => void;
  onNotifySuccess?: (message: string) => void;
}) {
  const emergencyContacts = e.emergencyContacts ?? [];
  const familyRelations = e.familyRelations ?? [];
  const ec0 = emergencyContacts[0];
  const fr0 = familyRelations[0];

  const body = (
    <>
      <Section title="Identity">
        <FieldGrid>
          <Row
            label="Salutation"
            editing={editing}
            view={e.salutation ?? "—"}
            edit={
              <select name="salutation" defaultValue={e.salutation ?? ""} className={INP}>
                <option value="">—</option>
                <option>Mr.</option>
                <option>Mrs.</option>
                <option>Ms.</option>
                <option>Dr.</option>
                <option>Eng.</option>
                <option>Prof.</option>
              </select>
            }
          />
          <Row
            label="Full name"
            editing={editing}
            view={e.name}
            edit={<input name="name" required defaultValue={e.name} className={INP} />}
          />
          <Row
            label="Work email"
            editing={editing}
            view={e.email}
            edit={<input name="email" type="email" required defaultValue={e.email} className={INP} />}
          />
          <Row
            label="Gender"
            editing={editing}
            view={e.gender ?? "—"}
            edit={
              <select name="gender" defaultValue={e.gender ?? ""} className={INP}>
                <option value="">—</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            }
          />
          <Row
            label="Date of birth"
            editing={editing}
            view={e.dateOfBirth ?? "—"}
            edit={<input type="date" name="dateOfBirth" defaultValue={e.dateOfBirth ?? ""} className={INP} />}
          />
          <Row
            label="Nationality"
            editing={editing}
            view={e.nationality ?? "—"}
            edit={<input name="nationality" defaultValue={e.nationality ?? ""} className={INP} />}
          />
          <Row
            label="Second nationality"
            editing={editing}
            view={e.secondNationality ?? "—"}
            edit={<input name="secondNationality" defaultValue={e.secondNationality ?? ""} className={INP} />}
          />
          <Row
            label="Marital status"
            editing={editing}
            view={e.maritalStatus ?? "—"}
            edit={
              <select name="maritalStatus" defaultValue={e.maritalStatus ?? ""} className={INP}>
                <option value="">—</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            }
          />
          <Row
            label="Religion"
            editing={editing}
            view={e.religion ?? "—"}
            edit={<input name="religion" defaultValue={e.religion ?? ""} className={INP} />}
          />
          <Row
            label="Blood group"
            editing={editing}
            view={e.bloodGroup ?? "—"}
            edit={
              <select name="bloodGroup" defaultValue={e.bloodGroup ?? ""} className={INP}>
                <option value="">—</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            }
          />
          <Row
            label="CNIC"
            editing={editing}
            view={e.cnic ?? "—"}
            edit={<input name="cnic" defaultValue={e.cnic ?? ""} className={INP} />}
          />
          <Row
            label="CNIC expiry"
            editing={editing}
            view={e.cnicExpiry ?? "—"}
            edit={<input type="date" name="cnicExpiry" defaultValue={e.cnicExpiry ?? ""} className={INP} />}
          />
          <Row
            label="Address"
            editing={editing}
            view={e.address ?? "—"}
            edit={<textarea name="address" defaultValue={e.address ?? ""} rows={2} className={INP} />}
          />
        </FieldGrid>
      </Section>

      <Section title="Working schedule & vehicle">
        <FieldGrid>
          <Row
            label="Business unit"
            editing={editing}
            view={e.businessUnit ?? "—"}
            edit={
              <select name="businessUnit" defaultValue={e.businessUnit ?? ""} className={INP}>
                <option value="">—</option>
                <option value="UAE">UAE</option>
                <option value="Karachi">Karachi</option>
                <option value="Multan">Multan</option>
              </select>
            }
          />
          <Row
            label="Designation #"
            editing={editing}
            view={e.designationNumber ?? "—"}
            edit={<input name="designationNumber" defaultValue={e.designationNumber ?? ""} className={INP} />}
          />
          <Row
            label="Official #"
            editing={editing}
            view={e.officialNumber ?? "—"}
            edit={<input name="officialNumber" defaultValue={e.officialNumber ?? ""} className={INP} />}
          />
          <Row
            label="Duty hours"
            editing={editing}
            view={e.dutyHours != null ? `${e.dutyHours} hrs/wk` : "—"}
            edit={
              <input type="number" min={0} name="dutyHours" defaultValue={e.dutyHours ?? ""} className={INP} placeholder="hrs/wk" />
            }
          />
          <Row
            label="Duty days"
            editing={editing}
            view={e.dutyDays != null ? `${e.dutyDays} days/wk` : "—"}
            edit={
              <input type="number" min={0} max={7} name="dutyDays" defaultValue={e.dutyDays ?? ""} className={INP} placeholder="days/wk" />
            }
          />
          <Row
            label="Company vehicle"
            editing={editing}
            view={e.hasCompanyVehicle ? "Yes" : "No"}
            edit={
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="hasCompanyVehicle" value="1" defaultChecked={e.hasCompanyVehicle} className="rounded border-kastros-sand" />
                Assigned
              </label>
            }
          />
          <Row
            label="Vehicle #"
            editing={editing}
            view={e.vehicleNumber ?? "—"}
            edit={<input name="vehicleNumber" defaultValue={e.vehicleNumber ?? ""} className={INP} />}
          />
          <Row
            label="Driving licence #"
            editing={editing}
            view={e.drivingLicenceNumber ?? "—"}
            edit={<input name="drivingLicenceNumber" defaultValue={e.drivingLicenceNumber ?? ""} className={INP} />}
          />
          <Row
            label="Licence expiry"
            editing={editing}
            view={e.drivingLicenceExpiry ?? "—"}
            edit={<input type="date" name="drivingLicenceExpiry" defaultValue={e.drivingLicenceExpiry ?? ""} className={INP} />}
          />
        </FieldGrid>
        {e.licences.length > 0 ? (
          <div className="mt-4 border-t border-kastros-sand/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Other licences</p>
            <ul className="mt-2 space-y-1 text-xs text-kastros-ink">
              {e.licences.map((l) => (
                <li key={l.id} className="rounded-lg bg-white/60 px-2 py-1.5 ring-1 ring-kastros-sand/50">
                  <span className="font-medium">{l.type}</span> · {l.number} · expires {l.expiresOn ?? "—"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title="Personal & contact">
        <FieldGrid>
          <Row
            label="Father's name"
            editing={editing}
            view={e.fatherName}
            edit={<input name="fatherName" required defaultValue={e.fatherName} className={INP} />}
          />
          <Row
            label="Company phone"
            editing={editing}
            view={e.companyPhone || "—"}
            edit={<input name="companyPhone" defaultValue={e.companyPhone ?? ""} className={INP} />}
          />
          <Row
            label="Personal phone"
            editing={editing}
            view={e.personalPhone || "—"}
            edit={<input name="personalPhone" defaultValue={e.personalPhone ?? ""} className={INP} />}
          />
        </FieldGrid>
        <div className="mt-4 border-t border-kastros-sand/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Emergency contact</p>
          {editing ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input name="emergencyContactName" placeholder="Name" defaultValue={ec0?.name ?? ""} className={INP} />
              <input name="emergencyContactRelation" placeholder="Relation" defaultValue={ec0?.relation ?? ""} className={INP} />
              <input name="emergencyContactPhone" placeholder="Phone" defaultValue={ec0?.phone ?? ""} className={INP} />
            </div>
          ) : emergencyContacts.length ? (
            <ul className="mt-2 space-y-2 text-sm text-kastros-ink">
              {emergencyContacts.map((c, i) => (
                <li key={`${c.phone}-${i}`} className="rounded-lg bg-white/60 px-2 py-1.5 ring-1 ring-kastros-sand/50">
                  {c.name} ({c.relation}) — {c.phone}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-kastros-sage">None on file.</p>
          )}
        </div>
        <div className="mt-4 border-t border-kastros-sand/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Family / COI declarations</p>
          {editing ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="familyRelationName" placeholder="Name" defaultValue={fr0?.name ?? ""} className={INP} />
              <input name="familyRelationType" placeholder="Relation" defaultValue={fr0?.relation ?? ""} className={INP} />
              <input name="familyRelationFirm" placeholder="Firm / employer" defaultValue={fr0?.firmOrEmployer ?? ""} className={INP} />
              <select name="familyLinked" defaultValue={fr0?.linkedToTraderOrMerchandiser ? "yes" : "no"} className={INP}>
                <option value="no">Not linked to traders</option>
                <option value="yes">Linked to traders / merchandisers</option>
              </select>
            </div>
          ) : familyRelations.length ? (
            <ul className="mt-2 space-y-2 text-sm text-kastros-ink">
              {familyRelations.map((f, i) => (
                <li key={`${f.name}-${i}`} className="rounded-lg bg-white/60 px-2 py-1.5 ring-1 ring-kastros-sand/50">
                  <span className="font-medium">{f.name}</span> · {f.relation} · {f.firmOrEmployer}
                  {f.linkedToTraderOrMerchandiser ? (
                    <span className="ml-2 text-amber-800">(linked to traders / merchandisers)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-kastros-sage">None declared.</p>
          )}
        </div>
      </Section>

      <Section title="Employment">
        <FieldGrid>
          <Row label="Title" editing={editing} view={e.title} edit={<input name="title" required defaultValue={e.title} className={INP} />} />
          <Row
            label="Department"
            editing={editing}
            view={formatEmployeeDepartment(e)}
            edit={
              <input
                name="department"
                defaultValue={e.department}
                className={INP}
                placeholder="Executive Office for CEO"
              />
            }
          />
          <Row
            label="Sub-department"
            editing={editing}
            view={e.subDepartment ?? "—"}
            edit={<input name="subDepartment" defaultValue={e.subDepartment ?? ""} className={INP} />}
          />
          <Row
            label="Location"
            editing={editing}
            view={e.location}
            edit={<input name="location" required defaultValue={e.location} className={INP} />}
          />
          <Row
            label="Employment type"
            editing={editing}
            view={e.employmentType ?? "—"}
            edit={
              <select name="employmentType" defaultValue={e.employmentType ?? "Permanent"} className={INP}>
                <option>Permanent</option>
                <option>Temporary</option>
                <option>Contractual</option>
                <option>Intern</option>
                <option>Trainee</option>
              </select>
            }
          />
          <Row
            label="Status"
            editing={editing}
            view={e.status}
            edit={
              <select name="status" defaultValue={e.status} className={INP}>
                <option>Active</option>
                <option>On leave</option>
                <option>Offboarding</option>
                <option>Separated</option>
              </select>
            }
          />
          <Row
            label="Employee ID (card)"
            editing={editing}
            view={e.employeeIdDisplay?.trim() || "—"}
            edit={<input name="employeeIdDisplay" defaultValue={e.employeeIdDisplay ?? ""} placeholder="KST-1001" className={INP} />}
          />
          <Row
            label="Date of joining"
            editing={editing}
            view={e.joiningDate}
            edit={<input type="date" name="joiningDate" required defaultValue={e.joiningDate ?? ""} className={INP} />}
          />
          <Row
            label="Probation"
            editing={editing}
            view={
              <>
                {e.probationMonths} months · ends{" "}
                <span className="font-medium text-kastros-forest">{e.probationCompletionDate}</span>
              </>
            }
            edit={
              <select name="probationMonths" defaultValue={String(e.probationMonths ?? 3)} className={INP}>
                <option value="0">No probation</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
              </select>
            }
          />
          <Row
            label="Reports to"
            editing={editing}
            view={e.reportsToEmail ?? "—"}
            edit={
              <input
                name="reportsToEmail"
                type="email"
                defaultValue={e.reportsToEmail ?? ""}
                className={INP}
                placeholder="Leave blank for CEO"
              />
            }
          />
          <Row
            label="Profile photo"
            editing={editing}
            view={
              e.photoStoredRef ? (
                <a href={`/api/hr-file/${e.photoStoredRef}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-kastros-forest underline">
                  View photo
                </a>
              ) : (
                "—"
              )
            }
            edit={
              <div className="space-y-2">
                <input type="file" name="profilePhoto" accept="image/png,image/jpeg,image/webp" className="w-full text-xs file:mr-2 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-2 file:py-1" />
                {e.photoStoredRef ? (
                  <label className="flex items-center gap-2 text-xs text-kastros-sage">
                    <input type="checkbox" name="clearProfilePhoto" value="1" className="rounded border-kastros-sand" />
                    Remove current photo
                  </label>
                ) : null}
              </div>
            }
          />
        </FieldGrid>
        {canManage && !editing ? (
          <div className="mt-4 border-t border-kastros-sand/60 pt-4">
            <form
              action={(fd) =>
                onAction(
                resendEmployeePasswordReset(fd),
                undefined,
                `Password reset email sent to ${e.email}`,
              )
              }
            >
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-kastros-sand bg-white px-3 py-2 text-xs font-semibold text-kastros-forest hover:bg-kastros-cream/60 disabled:opacity-50"
              >
                Resend password reset email
              </button>
            </form>
          </div>
        ) : null}
        {editing ? (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-kastros-sand/60 pt-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="hasGratuity" value="1" defaultChecked={e.hasGratuity} className="rounded border-kastros-sand" />
              Gratuity
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="hasEobi" value="1" defaultChecked={e.hasEobi} className="rounded border-kastros-sand" />
              EOBI
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="hasProvidentFund" value="1" defaultChecked={e.hasProvidentFund} className="rounded border-kastros-sand" />
              Provident Fund
            </label>
          </div>
        ) : null}
      </Section>
    </>
  );

  const linkedRecords = (
    <ProfileLinkedRecordsSection
      employee={e}
      editing={editing}
      canManage={canManage}
      documents={personDocs}
      academics={personAcademics}
      acknowledgements={personAcks}
      policies={policies}
      policyTitle={policyTitle}
      pending={pending}
      onAction={onAction}
      onSaved={onSaved}
    />
  );

  const profileGrid = (
    <div className="grid gap-4 lg:grid-cols-2">
      {body}
      {linkedRecords}
    </div>
  );

  const salaryBlock =
    canManage && (editing || e.compensation) ? (
      <div className={editing ? "mt-4" : ""}>
        <EmployeeSalarySection
          employee={e}
          allowanceTypes={allowanceTypes}
          pending={pending}
          onError={onError}
          onSaved={() => {
            onNotifySuccess?.("Salary saved");
            onSaved();
          }}
          readOnly={!editing}
        />
      </div>
    ) : null;

  if (editing) {
    return (
      <div className="mt-5">
        <form action={(fd) => onAction(updateEmployee(fd), () => { onCancel(); onSaved(); }, "Profile saved")}>
          <input type="hidden" name="id" value={e.id} />
          <div className="grid gap-4 lg:grid-cols-2">{body}</div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-kastros-sand pt-4">
            <button type="submit" disabled={pending} className="rounded-lg bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Saving…" : "Save profile"}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest">
              Cancel
            </button>
          </div>
        </form>
        {canManage && editing ? (
          <form
            className="mt-3"
            action={(fd) =>
              onAction(
                resendEmployeePasswordReset(fd),
                undefined,
                `Password reset email sent to ${e.email}`,
              )
            }
          >
            <input type="hidden" name="id" value={e.id} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-kastros-sand bg-white px-3 py-2 text-xs font-semibold text-kastros-forest hover:bg-kastros-cream/60 disabled:opacity-50"
            >
              Resend password reset email
            </button>
          </form>
        ) : null}
        {canManage ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {linkedRecords}
          </div>
        ) : null}
        {salaryBlock}
      </div>
    );
  }

  return (
    <div className="mt-5">
      {profileGrid}
      {salaryBlock}
    </div>
  );
}
