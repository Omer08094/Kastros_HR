"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { deleteEmployee } from "@/lib/store/hr-actions";
import { AppointmentLetterDialog } from "@/components/hr/AppointmentLetterDialog";
import { CorporateCardDialog } from "@/components/hr/CorporateCardDialog";
import { EmployeeProfileCard } from "@/components/hr/EmployeeProfileCard";
import { isProbationEndingSoon, probationDaysRemaining } from "@/lib/probation";
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
  const searchParams = useSearchParams();
  const { toasts, push, dismiss } = useToasts();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [letterFor, setLetterFor] = useState<Employee | null>(null);
  const [cardFor, setCardFor] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const probFilter = searchParams.get("probation") === "1";
  const idFromUrl = searchParams.get("id");

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    let list = sortedEmployees;
    if (probFilter) list = list.filter((e) => isProbationEndingSoon(e));
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  }, [sortedEmployees, appliedQuery, probFilter]);

  useEffect(() => {
    if (filteredEmployees.length === 0) {
      setSelectedId(null);
      return;
    }
    if (idFromUrl && filteredEmployees.some((e) => e.id === idFromUrl)) {
      setSelectedId(idFromUrl);
      return;
    }
    if (selectedId && filteredEmployees.some((e) => e.id === selectedId)) return;
    setSelectedId(filteredEmployees[0]!.id);
  }, [filteredEmployees, idFromUrl, selectedId]);

  const selected = useMemo(
    () => filteredEmployees.find((e) => e.id === selectedId) ?? null,
    [filteredEmployees, selectedId],
  );

  function updateUrl(nextId: string | null, probation = probFilter) {
    const params = new URLSearchParams();
    if (probation) params.set("probation", "1");
    if (nextId) params.set("id", nextId);
    const qs = params.toString();
    router.replace(qs ? `/employees?${qs}` : "/employees", { scroll: false });
  }

  function selectEmployee(id: string) {
    setSelectedId(id);
    setEditingId(null);
    updateUrl(id);
  }

  function clearProbationFilter() {
    const keepId = selectedId;
    router.replace(keepId ? `/employees?id=${keepId}` : "/employees", { scroll: false });
  }

  function applySearch() {
    setAppliedQuery(nameInput);
  }

  function clearSearch() {
    setNameInput("");
    setAppliedQuery("");
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

  const isEditing = canManage && selected && editingId === selected.id;
  const personDocs = selected ? byEmail(selected.email).documents : [];
  const personAcademics = selected ? byEmail(selected.email).academics : [];
  const personAcks = selected ? byEmail(selected.email).acknowledgements : [];

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

      {probFilter ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong>Probation ending soon</strong> — showing {filteredEmployees.length} employee
            {filteredEmployees.length === 1 ? "" : "s"} with probation completing within 10 days.
          </p>
          <button
            type="button"
            onClick={clearProbationFilter}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
          >
            Show all people
          </button>
        </div>
      ) : null}

      <p className="text-sm text-kastros-sage">
        Select a name from the list to view full profile details, documents, and policy acknowledgements.
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
        </form>
        <p className="mt-4 text-sm text-kastros-sage">
          {filteredEmployees.length === 0 ? (
            <>
              No people match{probFilter ? " this probation filter" : " this search"}.
              {employees.length > 0 ? (
                <>
                  {" "}
                  (<span className="tabular-nums">{employees.length}</span> in directory.)
                </>
              ) : null}
            </>
          ) : (
            <>
              <span className="tabular-nums font-medium text-kastros-forest">{filteredEmployees.length}</span> in list
              {appliedQuery.trim() ? (
                <>
                  {" "}
                  · matching &quot;{appliedQuery.trim()}&quot;
                </>
              ) : null}
              {probFilter ? " · probation filter active" : null}
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-start">
        <nav
          aria-label="People directory"
          className="max-h-[min(70vh,640px)] overflow-y-auto rounded-2xl border border-kastros-sand bg-white shadow-sm ring-1 ring-kastros-forest/[0.02]"
        >
          <ul className="divide-y divide-kastros-sand/80">
            {filteredEmployees.map((e) => {
              const active = e.id === selectedId;
              const onProbation = isProbationEndingSoon(e);
              const daysLeft = probationDaysRemaining(e.probationCompletionDate);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => selectEmployee(e.id)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition ${
                      active
                        ? "bg-kastros-forest/10 ring-2 ring-inset ring-kastros-forest/25"
                        : onProbation
                          ? "bg-amber-50/80 hover:bg-amber-50"
                          : "hover:bg-kastros-cream/50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-kastros-forest" : "text-kastros-ink"}`}>
                      {e.name}
                    </span>
                    <span className="truncate text-xs text-kastros-sage">{e.title}</span>
                    {onProbation && daysLeft !== null ? (
                      <span className="mt-0.5 text-[11px] font-medium text-amber-800">
                        Probation · {daysLeft === 0 ? "ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {!selected ? (
            <div className="rounded-2xl border border-kastros-sand bg-white p-8 text-center text-sm text-kastros-sage shadow-sm">
              {filteredEmployees.length === 0 ? "No employees to display." : "Select a person from the list."}
            </div>
          ) : (
            <article className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm ring-1 ring-kastros-forest/[0.02]">
              <header className="flex flex-col gap-2 border-b border-kastros-sand pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-kastros-forest">{selected.name}</h2>
                  <p className="mt-0.5 text-sm text-kastros-sage">{selected.email}</p>
                  {isProbationEndingSoon(selected) ? (
                    <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                      Probation ends {selected.probationCompletionDate}
                      {probationDaysRemaining(selected.probationCompletionDate) !== null
                        ? ` (${probationDaysRemaining(selected.probationCompletionDate)} days left)`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setEditingId((prev) => (prev === selected.id ? null : selected.id))}
                      className="rounded-xl border border-kastros-sand bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm hover:bg-kastros-cream/60"
                    >
                      {isEditing ? "Done editing" : "Edit profile"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setLetterFor(selected)}
                    className="rounded-xl border border-kastros-brandBlue/22 bg-kastros-cream/80 px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm ring-1 ring-kastros-brandGreen/20 hover:bg-kastros-cream"
                  >
                    Appointment letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardFor(selected)}
                    className="rounded-xl border border-kastros-sand bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest shadow-sm hover:bg-kastros-cream/60"
                  >
                    Corporate card
                  </button>
                  <span className="inline-flex w-fit rounded-full bg-kastros-cream px-3 py-1 text-xs font-medium ring-1 ring-kastros-sand">
                    {selected.status}
                  </span>
                </div>
              </header>

              {selected.cnicExpiry && cnicExpiryStatus(selected.cnicExpiry) ? (
                <div
                  className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
                    cnicExpiryStatus(selected.cnicExpiry) === "expired"
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  CNIC {cnicExpiryStatus(selected.cnicExpiry) === "expired" ? "expired" : "expires soon"} ({selected.cnicExpiry}).
                </div>
              ) : null}
              {selected.drivingLicenceExpiry && cnicExpiryStatus(selected.drivingLicenceExpiry) ? (
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${
                    cnicExpiryStatus(selected.drivingLicenceExpiry) === "expired"
                      ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  Driving licence{" "}
                  {cnicExpiryStatus(selected.drivingLicenceExpiry) === "expired" ? "expired" : "expires soon"} (
                  {selected.drivingLicenceExpiry}).
                </div>
              ) : null}

              <EmployeeProfileCard
                employee={selected}
                editing={!!isEditing}
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
                  <input type="hidden" name="id" value={selected.id} />
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
          )}
        </div>
      </div>

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
