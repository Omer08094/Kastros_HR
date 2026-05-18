"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type {
  AcademicRecord,
  DocumentRow,
  Employee,
  PolicyAcknowledgement,
  PolicyManual,
} from "@/lib/store/types";
import { deleteEmployee, deleteDocument, updateEmployee } from "@/lib/store/hr-actions";
import { AppointmentLetterDialog } from "@/components/hr/AppointmentLetterDialog";
import { CorporateCardDialog } from "@/components/hr/CorporateCardDialog";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

function policyTitle(policies: PolicyManual[], policyId: string) {
  return policies.find((p) => p.id === policyId)?.title ?? policyId;
}

/** Returns "expired", "soon" if within 90 days, or null. */
function cnicExpiryStatus(date: string | null | undefined): "expired" | "soon" | null {
  if (!date) return null;
  const ts = Date.parse(date.length <= 10 ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(ts)) return null;
  const diffDays = Math.floor((ts - Date.now()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 90) return "soon";
  return null;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-kastros-brandGreen">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Dl({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-[minmax(0,140px)_1fr] sm:gap-x-4">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-kastros-sage">{r.label}</dt>
          <dd className="text-kastros-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmployeesClient({
  employees,
  canManage,
  documents,
  academics,
  policyAcknowledgements,
  policies,
}: {
  employees: Employee[];
  canManage: boolean;
  documents: DocumentRow[];
  academics: AcademicRecord[];
  policyAcknowledgements: PolicyAcknowledgement[];
  policies: PolicyManual[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [letterFor, setLetterFor] = useState<Employee | null>(null);
  const [cardFor, setCardFor] = useState<Employee | null>(null);

  const filteredEmployees = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
    );
  }, [employees, appliedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedEmployees = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safePage, pageSize]);

  const rangeStart = filteredEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredEmployees.length);

  function applySearch() {
    setAppliedQuery(nameInput);
    setPage(1);
  }

  function clearSearch() {
    setNameInput("");
    setAppliedQuery("");
    setPage(1);
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    applySearch();
  }

  const byEmail = useMemo(() => {
    const em = (e: string) => e.toLowerCase();
    return (email: string) => ({
      documents: documents.filter((d) => d.employeeEmail && em(d.employeeEmail) === em(email)),
      academics: academics.filter((a) => em(a.employeeEmail) === em(email)),
      acknowledgements: policyAcknowledgements.filter((a) => em(a.employeeEmail) === em(email)),
    });
  }, [documents, academics, policyAcknowledgements]);

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

      <p className="text-sm text-kastros-sage">
        Each profile lists personnel documents below (click a row to open the file). Company-wide notices live under Documents · Company
        library. Register personnel files from Documents → Register a document (personnel file).
      </p>

      <div className="rounded-2xl border border-kastros-sand bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[min(100%,220px)] flex-1 text-sm">
            <span className="text-kastros-sage">Find by name</span>
            <input
              value={nameInput}
              onChange={(ev) => setNameInput(ev.target.value)}
              placeholder="e.g. Elena or rossi"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink placeholder:text-kastros-sage/70"
            />
            <span className="mt-1 block text-xs text-kastros-sage">Matches display name or work email (press Enter or Search).</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl border border-kastros-sand bg-white px-4 py-2.5 text-sm font-semibold text-kastros-forest hover:bg-kastros-cream/50"
            >
              Clear
            </button>
          </div>
          <label className="flex flex-col text-sm sm:ml-auto">
            <span className="text-kastros-sage">Per page</span>
            <select
              value={pageSize}
              onChange={(ev) => {
                setPageSize(Number(ev.target.value));
                setPage(1);
              }}
              className="mt-1 rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </form>
        <p className="mt-4 text-sm text-kastros-sage">
          {filteredEmployees.length === 0 ? (
            <>
              No people match this search.
              {employees.length > 0 ? (
                <>
                  {" "}
                  (<span className="tabular-nums">{employees.length}</span> in directory.)
                </>
              ) : null}
            </>
          ) : (
            <>
              Showing <span className="tabular-nums font-medium text-kastros-forest">{rangeStart}</span>–
              <span className="tabular-nums font-medium text-kastros-forest">{rangeEnd}</span> of{" "}
              <span className="tabular-nums font-medium text-kastros-forest">{filteredEmployees.length}</span>
              {appliedQuery.trim() ? (
                <>
                  {" "}
                  · matching &quot;{appliedQuery.trim()}&quot;
                  {filteredEmployees.length < employees.length ? (
                    <>
                      {" "}
                      (<span className="tabular-nums">{employees.length}</span> in full directory)
                    </>
                  ) : null}
                </>
              ) : (
                <> in directory</>
              )}
            </>
          )}
        </p>
      </div>

      <div className="space-y-8">
        {pagedEmployees.map((e) => {
          const emergencyContacts = e.emergencyContacts ?? [];
          const familyRelations = e.familyRelations ?? [];
          const { documents: personDocs, academics: personAcademics, acknowledgements: personAcks } = byEmail(e.email);
          return (
            <article
              key={e.id}
              className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm ring-1 ring-kastros-forest/[0.02]"
            >
              <header className="flex flex-col gap-2 border-b border-kastros-sand pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-kastros-forest">{e.name}</h2>
                  <p className="mt-0.5 text-sm text-kastros-sage">{e.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setLetterFor(e)}
                    className="rounded-xl border border-kastros-brandBlue/22 bg-kastros-cream/80 px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm ring-1 ring-kastros-brandGreen/20 hover:bg-kastros-cream"
                  >
                    Appointment letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardFor(e)}
                    className="rounded-xl border border-kastros-sand bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm hover:bg-kastros-cream/60"
                  >
                    Corporate card
                  </button>
                  <span className="inline-flex w-fit rounded-full bg-kastros-cream px-3 py-1 text-xs font-medium ring-1 ring-kastros-sand">
                    {e.status}
                  </span>
                </div>
              </header>

              {e.cnicExpiry && cnicExpiryStatus(e.cnicExpiry) ? (
                <div
                  className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
                    cnicExpiryStatus(e.cnicExpiry) === "expired"
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  CNIC {cnicExpiryStatus(e.cnicExpiry) === "expired" ? "expired" : "expires soon"} ({e.cnicExpiry}).
                </div>
              ) : null}
              {e.drivingLicenceExpiry && cnicExpiryStatus(e.drivingLicenceExpiry) ? (
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${
                    cnicExpiryStatus(e.drivingLicenceExpiry) === "expired"
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  Driving licence {cnicExpiryStatus(e.drivingLicenceExpiry) === "expired" ? "expired" : "expires soon"} ({e.drivingLicenceExpiry}).
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <DetailSection title="Identity">
                  <Dl
                    rows={[
                      { label: "Gender", value: e.gender ?? "—" },
                      { label: "Date of birth", value: e.dateOfBirth ?? "—" },
                      {
                        label: "Nationality",
                        value: e.secondNationality
                          ? `${e.nationality ?? "—"} / ${e.secondNationality}`
                          : e.nationality ?? "—",
                      },
                      { label: "Marital status", value: e.maritalStatus ?? "—" },
                      { label: "Religion", value: e.religion ?? "—" },
                      { label: "CNIC", value: e.cnic ?? "—" },
                      { label: "CNIC expiry", value: e.cnicExpiry ?? "—" },
                      { label: "Address", value: e.address ?? "—" },
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Working schedule & vehicle">
                  <Dl
                    rows={[
                      { label: "Business unit", value: e.businessUnit ?? "—" },
                      { label: "Designation #", value: e.designationNumber ?? "—" },
                      { label: "Official #", value: e.officialNumber ?? "—" },
                      { label: "Duty hours", value: e.dutyHours != null ? `${e.dutyHours} hrs/wk` : "—" },
                      { label: "Duty days", value: e.dutyDays != null ? `${e.dutyDays} days/wk` : "—" },
                      { label: "Company vehicle", value: e.hasCompanyVehicle ? "Yes" : "No" },
                      { label: "Vehicle #", value: e.vehicleNumber ?? "—" },
                      { label: "Driving licence #", value: e.drivingLicenceNumber ?? "—" },
                      { label: "Licence expiry", value: e.drivingLicenceExpiry ?? "—" },
                    ]}
                  />
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
                </DetailSection>

                <DetailSection title="Personal & contact">
                  <Dl
                    rows={[
                      { label: "Father's name", value: e.fatherName },
                      { label: "Company phone", value: e.companyPhone || "—" },
                      { label: "Personal phone", value: e.personalPhone || "—" },
                    ]}
                  />
                  <div className="mt-4 border-t border-kastros-sand/60 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Emergency contacts</p>
                    {emergencyContacts.length ? (
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
                    {familyRelations.length ? (
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
                </DetailSection>

                <DetailSection title="Employment">
                  <Dl
                    rows={[
                      { label: "Title", value: e.title },
                      { label: "Department", value: e.department },
                      { label: "Location", value: e.location },
                      { label: "Employment type", value: e.employmentType ?? "—" },
                      { label: "Employee ID (card)", value: e.employeeIdDisplay?.trim() || "—" },
                      { label: "CNIC", value: e.cnic?.trim() || "—" },
                      ...(e.photoStoredRef
                        ? [
                            {
                              label: "Profile photo",
                              value: (
                                <a
                                  href={`/api/hr-file/${e.photoStoredRef}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-kastros-forest underline underline-offset-2"
                                >
                                  View photo
                                </a>
                              ),
                            },
                          ]
                        : []),
                      { label: "Date of joining", value: e.joiningDate },
                      {
                        label: "Probation",
                        value: (
                          <>
                            {e.probationMonths} months · ends{" "}
                            <span className="font-medium text-kastros-forest">{e.probationCompletionDate}</span>
                          </>
                        ),
                      },
                      { label: "Reports to", value: e.reportsToEmail ?? "—" },
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Education & certifications">
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
                            <div className="mt-2">
                              <a
                                href={`/api/hr-file/${a.storedRef}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-kastros-forest underline underline-offset-2"
                              >
                                View uploaded file
                              </a>
                            </div>
                          ) : a.attachmentName ? (
                            <p className="mt-2 text-xs text-kastros-sage">Registered file name only — no copy on this server yet.</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-kastros-sage">No academic records in the demo store for this person.</p>
                  )}
                </DetailSection>

                <DetailSection title="Personnel documents">
                  {personDocs.length ? (
                    <ul className="space-y-3 text-sm">
                      {personDocs.map((d) => (
                        <li key={d.id} className="rounded-lg bg-white/60 ring-1 ring-kastros-sand/50">
                          {d.storedRef ? (
                            <a
                              href={`/api/hr-file/${d.storedRef}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg px-3 py-2 transition hover:bg-kastros-cream/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
                            >
                              <span className="font-medium text-kastros-forest">{d.name}</span>
                              <span className="ml-2 text-xs font-semibold text-kastros-brandGreen">Open attachment →</span>
                              <div className="mt-1 text-xs text-kastros-sage">
                                {d.sensitivity} · custodian: {d.owner} · registered by {d.createdByEmail}
                              </div>
                            </a>
                          ) : (
                            <div className="px-3 py-2">
                              <span className="font-medium text-kastros-forest">{d.name}</span>
                              <div className="mt-1 text-xs text-kastros-sage">
                                {d.sensitivity} · custodian: {d.owner}
                              </div>
                              <p className="mt-2 text-xs text-kastros-sage">No file uploaded — registry entry only.</p>
                            </div>
                          )}
                          {canManage ? (
                            <div className="border-t border-kastros-sand/60 px-3 py-2">
                              <form action={(fd) => handle(deleteDocument(fd))}>
                                <input type="hidden" name="id" value={d.id} />
                                <button
                                  type="submit"
                                  disabled={pending}
                                  className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                                >
                                  Remove document record
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-kastros-sage">
                      No personnel documents linked yet. Register with a personnel file attachment on Documents, or uploads from onboarding.
                    </p>
                  )}
                </DetailSection>

                <DetailSection title="Policy acknowledgements">
                  {personAcks.length ? (
                    <ul className="space-y-2 text-sm text-kastros-ink">
                      {personAcks.map((a) => (
                        <li key={a.id} className="rounded-lg bg-white/60 px-3 py-2 ring-1 ring-kastros-sand/50">
                          <span className="font-medium">{policyTitle(policies, a.policyId)}</span>
                          <span className="text-kastros-sage"> — </span>
                          {new Date(a.acknowledgedAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-kastros-sage">No policy acknowledgements recorded for this person yet.</p>
                  )}
                </DetailSection>
              </div>

              {canManage ? (
                <div className="mt-6 border-t border-kastros-sand pt-5">
                  <h3 className="text-sm font-semibold text-kastros-forest">HR · quick edit</h3>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                    <form
                      className="min-w-0 grow space-y-2 rounded-xl border border-kastros-sand bg-kastros-cream/25 p-4 sm:min-w-[320px]"
                      action={(fd) => handle(updateEmployee(fd))}
                    >
                      <input type="hidden" name="id" value={e.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs">
                          Title
                          <input name="title" defaultValue={e.title} className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-xs">
                          Department
                          <input name="department" defaultValue={e.department} className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-xs sm:col-span-2">
                          Location
                          <input name="location" defaultValue={e.location} className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-xs">
                          Employment type
                          <select
                            name="employmentType"
                            defaultValue={e.employmentType ?? "Permanent"}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          >
                            <option>Permanent</option>
                            <option>Temporary</option>
                            <option>Contractual</option>
                            <option>Intern</option>
                            <option>Trainee</option>
                          </select>
                        </label>
                        <label className="text-xs">
                          Business unit
                          <select
                            name="businessUnit"
                            defaultValue={e.businessUnit ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            <option value="UAE">UAE</option>
                            <option value="Karachi">Karachi</option>
                            <option value="Multan">Multan</option>
                          </select>
                        </label>
                        <label className="text-xs">
                          Designation #
                          <input
                            name="designationNumber"
                            defaultValue={e.designationNumber ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Official #
                          <input
                            name="officialNumber"
                            defaultValue={e.officialNumber ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Duty hours / wk
                          <input
                            type="number"
                            min={0}
                            name="dutyHours"
                            defaultValue={e.dutyHours ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Duty days / wk
                          <input
                            type="number"
                            min={0}
                            max={7}
                            name="dutyDays"
                            defaultValue={e.dutyDays ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Date of birth
                          <input
                            type="date"
                            name="dateOfBirth"
                            defaultValue={e.dateOfBirth ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Gender
                          <select
                            name="gender"
                            defaultValue={e.gender ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                            <option>Prefer not to say</option>
                          </select>
                        </label>
                        <label className="text-xs">
                          Nationality
                          <input
                            name="nationality"
                            defaultValue={e.nationality ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Second nationality
                          <input
                            name="secondNationality"
                            defaultValue={e.secondNationality ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Marital status
                          <select
                            name="maritalStatus"
                            defaultValue={e.maritalStatus ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            <option>Single</option>
                            <option>Married</option>
                            <option>Divorced</option>
                            <option>Widowed</option>
                          </select>
                        </label>
                        <label className="text-xs">
                          Religion
                          <input
                            name="religion"
                            defaultValue={e.religion ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          CNIC expiry
                          <input
                            type="date"
                            name="cnicExpiry"
                            defaultValue={e.cnicExpiry ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs sm:col-span-2">
                          Address
                          <textarea
                            name="address"
                            defaultValue={e.address ?? ""}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs sm:col-span-2 inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="hasCompanyVehicle"
                            value="1"
                            defaultChecked={e.hasCompanyVehicle}
                            className="rounded border-kastros-sand"
                          />
                          Company vehicle assigned
                        </label>
                        <label className="text-xs">
                          Vehicle #
                          <input
                            name="vehicleNumber"
                            defaultValue={e.vehicleNumber ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Driving licence #
                          <input
                            name="drivingLicenceNumber"
                            defaultValue={e.drivingLicenceNumber ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Driving licence expiry
                          <input
                            type="date"
                            name="drivingLicenceExpiry"
                            defaultValue={e.drivingLicenceExpiry ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          Status
                          <select name="status" defaultValue={e.status} className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm">
                            <option>Active</option>
                            <option>On leave</option>
                            <option>Offboarding</option>
                          </select>
                        </label>
                        <label className="text-xs">
                          Employee ID (for ID card)
                          <input
                            name="employeeIdDisplay"
                            defaultValue={e.employeeIdDisplay ?? ""}
                            placeholder="e.g. KST-1001"
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          CNIC / national ID
                          <input name="cnic" defaultValue={e.cnic ?? ""} className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-xs sm:col-span-2">
                          Manager email
                          <input
                            name="reportsToEmail"
                            defaultValue={e.reportsToEmail ?? ""}
                            className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                            placeholder="optional"
                          />
                        </label>
                        <label className="text-xs sm:col-span-2">
                          Profile photo (ID card)
                          <input
                            type="file"
                            name="profilePhoto"
                            accept="image/png,image/jpeg,image/webp"
                            className="mt-1 w-full text-xs file:mr-2 file:rounded-lg file:border file:border-kastros-sand file:bg-white file:px-2 file:py-1"
                          />
                        </label>
                        {e.photoStoredRef ? (
                          <label className="flex items-center gap-2 text-xs text-kastros-sage sm:col-span-2">
                            <input type="checkbox" name="clearProfilePhoto" value="1" className="rounded border-kastros-sand" />
                            Remove profile photo
                          </label>
                        ) : null}
                      </div>
                      <button type="submit" disabled={pending} className="rounded-lg bg-kastros-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        Save changes
                      </button>
                    </form>
                    <form action={(fd) => handle(deleteEmployee(fd))}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Remove employee
                      </button>
                    </form>
                  </div>

                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {filteredEmployees.length > 0 && totalPages > 1 ? (
        <nav
          className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-kastros-sand bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5"
          aria-label="People pagination"
        >
          <p className="text-sm text-kastros-sage">
            Page <span className="tabular-nums font-semibold text-kastros-forest">{safePage}</span> of{" "}
            <span className="tabular-nums font-semibold text-kastros-forest">{totalPages}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest disabled:cursor-not-allowed disabled:opacity-40 hover:bg-kastros-cream/50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest disabled:cursor-not-allowed disabled:opacity-40 hover:bg-kastros-cream/50"
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}

      {letterFor ? (
        <AppointmentLetterDialog
          open
          employee={letterFor}
          roster={employees}
          onClose={() => setLetterFor(null)}
        />
      ) : null}

      {cardFor ? <CorporateCardDialog open employee={cardFor} onClose={() => setCardFor(null)} /> : null}
    </div>
  );
}
