"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Employee, TrainingRow } from "@/lib/store/types";
import { addTrainingRow, markTrainingAttendance, setTrainingStatus } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

function TrainingAssignForm({
  employees,
  pending,
  handle,
}: {
  employees: Employee[];
  pending: boolean;
  handle: (p: Promise<ActionResult>) => void;
}) {
  const [provider, setProvider] = useState<"Internal" | "External">("Internal");

  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addTrainingRow(fd))}>
      <label className="text-sm">
        <span className="text-kastros-sage">Assignee</span>
        <select name="assigneeEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
          {employees.map((e) => (
            <option key={e.email} value={e.email}>
              {e.name} ({e.email})
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-kastros-sage">Provider</span>
        <select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value === "External" ? "External" : "Internal")}
          className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
        >
          <option value="Internal">Internal</option>
          <option value="External">External</option>
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="text-kastros-sage">Course name</span>
        <input name="name" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
      </label>
      {provider === "External" ? (
        <label className="text-sm sm:col-span-2">
          <span className="text-kastros-sage">Provider name (Udemy / Coursera / etc.)</span>
          <input
            name="providerName"
            required
            placeholder="e.g. Coursera"
            className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <label className="text-sm sm:col-span-2">
        <span className="text-kastros-sage">Due date</span>
        <input name="due" type="date" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="text-kastros-sage">Training material (PDF or PowerPoint)</span>
        <input
          name="trainingMaterialFile"
          type="file"
          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-kastros-cream file:px-3 file:py-2 file:text-kastros-forest"
        />
        <span className="mt-1 block text-xs text-kastros-sage">Stored privately; opens in a new tab. Max ~12 MB.</span>
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="text-kastros-sage">Or material label only (no file)</span>
        <input
          name="trainingMaterialPptx"
          placeholder="e.g. Live session — no deck"
          className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Assign training
        </button>
      </div>
    </form>
  );
}

function TrainingSessionsCard({
  title,
  subtitle,
  rows,
  roster,
  canAssign,
  pending,
  handle,
  onAttendanceError,
}: {
  title: string;
  subtitle: string;
  rows: TrainingRow[];
  roster: Employee[];
  canAssign: boolean;
  pending: boolean;
  handle: (p: Promise<ActionResult>) => void;
  onAttendanceError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [attendancePending, startAttendance] = useTransition();
  const [attendanceForId, setAttendanceForId] = useState<string | null>(null);
  const byEmail = useMemo(() => Object.fromEntries(roster.map((e) => [e.email.toLowerCase(), e])), [roster]);

  return (
    <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-kastros-forest">{title}</h2>
      <p className="mt-1 text-sm text-kastros-sage">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-kastros-sage">No sessions in this category yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((t) => (
            <li key={t.id} className="rounded-xl border border-kastros-sand bg-kastros-cream/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <p className="font-medium text-kastros-forest">{t.name}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-kastros-sage ring-1 ring-kastros-sand">
                      {t.attendedEmails.length} attended
                    </span>
                    <span className="rounded-full bg-kastros-cream px-2 py-0.5 text-xs ring-1 ring-kastros-sand">{t.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-kastros-sage">
                    Assigned: {byEmail[t.assigneeEmail.toLowerCase()]?.name ?? t.assigneeEmail} · Due {t.due}
                    {t.provider === "External" ? (
                      <>
                        {" "}
                        · <span className="text-kastros-forest">{t.providerName}</span>
                      </>
                    ) : (
                      <> · Internal (Kastros HR)</>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-kastros-sage">
                    Material:{" "}
                    {t.trainingMaterialStoredRef ? (
                      <a
                        href={`/api/hr-file/${t.trainingMaterialStoredRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-kastros-forest underline decoration-kastros-mist underline-offset-2 hover:decoration-kastros-forest"
                      >
                        View {t.trainingMaterialOriginalName ?? "file"}
                      </a>
                    ) : t.trainingMaterialPptx ? (
                      <span className="text-kastros-ink">{t.trainingMaterialPptx}</span>
                    ) : (
                      "—"
                    )}
                  </p>
                  {t.attendedEmails.length > 0 ? (
                    <p className="mt-2 text-xs text-kastros-sage">
                      Attendees:{" "}
                      {t.attendedEmails
                        .map((em) => byEmail[em.toLowerCase()]?.name ?? em)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <form action={(fd) => handle(setTrainingStatus(fd))}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="status" value={t.status === "Done" ? "Required" : "Done"} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50"
                    >
                      {t.status === "Done" ? "Reopen" : "Mark done"}
                    </button>
                  </form>
                  {canAssign ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        onAttendanceError(null);
                        setAttendanceForId((cur) => (cur === t.id ? null : t.id));
                      }}
                      className="rounded-lg bg-kastros-forest px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {attendanceForId === t.id ? "Close attendance" : "Mark attendance"}
                    </button>
                  ) : null}
                </div>
              </div>

              {canAssign && attendanceForId === t.id ? (
                <form
                  className="mt-4 border-t border-kastros-sand pt-4"
                  action={(fd) => {
                    onAttendanceError(null);
                    startAttendance(async () => {
                      const err = await runAction(markTrainingAttendance(fd), () => {
                        setAttendanceForId(null);
                        router.refresh();
                      });
                      if (err) onAttendanceError(err);
                    });
                  }}
                >
                  <input type="hidden" name="id" value={t.id} />
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-kastros-sage">Who attended?</p>
                  <ul className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-white p-3 ring-1 ring-kastros-sand">
                    {roster.map((e) => {
                      const checked = t.attendedEmails.some((em) => em.toLowerCase() === e.email.toLowerCase());
                      return (
                        <li key={e.email}>
                          <label className="flex cursor-pointer items-center gap-3 text-sm text-kastros-ink">
                            <input type="checkbox" name="attended" value={e.email} defaultChecked={checked} className="rounded border-kastros-sand" />
                            <span className="font-medium">{e.name}</span>
                            <span className="text-xs text-kastros-sage">{e.email}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={pending || attendancePending}
                      className="rounded-lg bg-kastros-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save attendance
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold ring-1 ring-kastros-sand"
                      onClick={() => setAttendanceForId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TrainingClient({
  rows,
  employees,
  canAssign,
}: {
  rows: TrainingRow[];
  employees: Employee[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const roster = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name)), [employees]);
  const internalRows = useMemo(() => rows.filter((r) => r.provider === "Internal"), [rows]);
  const externalRows = useMemo(() => rows.filter((r) => r.provider === "External"), [rows]);

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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {attendanceError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{attendanceError}</div>
      ) : null}

      {canAssign ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Assign training</h2>
          <p className="mt-1 text-sm text-kastros-sage">Create an internal session or assign external provider-led learning.</p>
          <TrainingAssignForm employees={roster} pending={pending} handle={handle} />
        </section>
      ) : null}

      <TrainingSessionsCard
        title="Internal training"
        subtitle="Company-run sessions · mark who attended after each run."
        rows={internalRows}
        roster={roster}
        canAssign={canAssign}
        pending={pending}
        handle={handle}
        onAttendanceError={setAttendanceError}
      />

      <TrainingSessionsCard
        title="External training"
        subtitle="Third-party platforms and vendors (Udemy, Coursera, etc.)."
        rows={externalRows}
        roster={roster}
        canAssign={canAssign}
        pending={pending}
        handle={handle}
        onAttendanceError={setAttendanceError}
      />
    </div>
  );
}
