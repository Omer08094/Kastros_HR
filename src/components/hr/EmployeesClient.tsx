"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import type {
  AcademicRecord,
  BusinessUnitRecord,
  DepartmentRecord,
  DocumentRow,
  Employee,
  PolicyAcknowledgement,
  PolicyManual,
  SubDepartmentRecord,
} from "@/lib/store/types";
import { ToastStack, useToasts } from "@/components/ui/ToastStack";
import { deleteEmployee, deleteDocument, updateEmployee } from "@/lib/store/hr-actions";
import { AppointmentLetterDialog } from "@/components/hr/AppointmentLetterDialog";
import { CorporateCardDialog } from "@/components/hr/CorporateCardDialog";
import { EmployeeProfileCard } from "@/components/hr/EmployeeProfileCard";
import type { PersistenceInfo } from "@/lib/store/persistence-info";
import type { SalaryAllowanceCatalogItem } from "@/lib/store/types";
import { Cloud, HardDrive, AlertTriangle } from "lucide-react";

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

function PersistenceBadge({ info }: { info: PersistenceInfo }) {
  if (info.backend === "firestore") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
        <Cloud className="h-3.5 w-3.5" aria-hidden />
        Data: {info.label}
      </span>
    );
  }
  if (info.backend === "local") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-amber-200">
        <HardDrive className="h-3.5 w-3.5" aria-hidden />
        Data: {info.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-900 ring-1 ring-red-200">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      {info.label}
    </span>
  );
}

export function EmployeesClient({
  employees,
  canManage,
  allowanceTypes,
  documents,
  academics,
  policyAcknowledgements,
  policies,
  persistence,
  businessUnits,
  departmentNames,
  departmentRecords,
  subDepartments,
  managerRoster,
}: {
  employees: Employee[];
  canManage: boolean;
  allowanceTypes: SalaryAllowanceCatalogItem[];
  documents: DocumentRow[];
  academics: AcademicRecord[];
  policyAcknowledgements: PolicyAcknowledgement[];
  policies: PolicyManual[];
  persistence: PersistenceInfo;
  businessUnits: BusinessUnitRecord[];
  departmentNames: string[];
  departmentRecords: DepartmentRecord[];
  subDepartments: SubDepartmentRecord[];
  managerRoster: { email: string; name: string }[];
}) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [letterFor, setLetterFor] = useState<Employee | null>(null);
  const [cardFor, setCardFor] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  function handle(p: Promise<ActionResult>, onSuccess?: () => void, successMessage = "Saved") {
    setError(null);
    start(async () => {
      try {
        const err = await runAction(p, () => {
          router.refresh();
          onSuccess?.();
        });
        if (err) {
          setError(err);
          push(err, "error");
        } else {
          push(successMessage, "success", persistence.saveHint);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong while saving.";
        setError(msg);
        push(msg, "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <PersistenceBadge info={persistence} />
          <p className="text-xs text-kastros-sage">{persistence.saveHint}</p>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <p className="text-sm text-kastros-sage">
        Each profile lists education, personnel documents, and policy acknowledgements below. While editing a profile, HR can add records in
        those sections. Company-wide notices live under Documents · Company library.
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
          const { documents: personDocs, academics: personAcademics, acknowledgements: personAcks } = byEmail(e.email);
          const isEditing = canManage && editingId === e.id;
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
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setEditingId((prev) => (prev === e.id ? null : e.id))}
                      className="rounded-xl border border-kastros-sand bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm hover:bg-kastros-cream/60"
                    >
                      {isEditing ? "Done editing" : "Edit profile"}
                    </button>
                  ) : null}
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

              <EmployeeProfileCard
                employee={e}
                editing={isEditing}
                canManage={canManage}
                allowanceTypes={allowanceTypes}
                documents={personDocs}
                academics={personAcademics}
                acknowledgements={personAcks}
                policies={policies}
                pending={pending}
                policyTitle={(id) => policyTitle(policies, id)}
                departmentNames={departmentNames}
                departmentRecords={departmentRecords}
                subDepartments={subDepartments}
                managerRoster={managerRoster}
                onError={setError}
                onSaved={() => router.refresh()}
                onCancel={() => setEditingId(null)}
                onAction={handle}
                onNotifySuccess={(msg) => push(msg, "success", persistence.saveHint)}
              />

              {isEditing ? (
                <form className="mt-4" action={(fd) => handle(deleteEmployee(fd))}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Remove employee
                  </button>
                </form>
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
          salary={letterFor.compensation?.grossSalary ?? null}
          salaryCurrency={letterFor.compensation?.currency ?? null}
          onClose={() => setLetterFor(null)}
        />
      ) : null}

      {cardFor ? (
        <CorporateCardDialog open employee={cardFor} businessUnits={businessUnits} onClose={() => setCardFor(null)} />
      ) : null}
    </div>
  );
}
