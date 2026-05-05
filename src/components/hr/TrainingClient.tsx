"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AcademicRecord, Employee, TrainingRow } from "@/lib/store/types";
import { addAcademicRecord, addTrainingRow, markTrainingAttendance, setTrainingStatus } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };
async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function TrainingClient({
  rows,
  academics,
  employees,
  canAssign,
}: {
  rows: TrainingRow[];
  academics: AcademicRecord[];
  employees: Employee[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function handle(p: Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const err = await runAction(p, () => router.refresh());
      if (err) setError(err);
    });
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {canAssign ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Academic records (Degrees / Certifications)</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addAcademicRecord(fd))}>
            <label className="text-sm">
              <span className="text-kastros-sage">Employee</span>
              <select name="employeeEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>{e.name} ({e.email})</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Type</span>
              <select name="type" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                <option>Degree</option>
                <option>Certification</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Title</span>
              <input name="title" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Institute</span>
              <input name="institute" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Year</span>
              <input name="year" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Attachment filename (scan/CV)</span>
              <input name="attachmentName" placeholder="elena-degree.pdf" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add record</button>
            </div>
          </form>
        </section>
      ) : null}

      {canAssign ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Training assignment log</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addTrainingRow(fd))}>
            <label className="text-sm">
              <span className="text-kastros-sage">Assignee</span>
              <select name="assigneeEmail" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                {employees.map((e) => (
                  <option key={e.email} value={e.email}>{e.name} ({e.email})</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Provider</span>
              <select name="provider" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                <option>Internal</option>
                <option>External</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Course name</span>
              <input name="name" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Provider name (Udemy/Coursera/etc.)</span>
              <input name="providerName" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Due date</span>
              <input name="due" type="date" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Training PPTX filename</span>
              <input name="trainingMaterialPptx" placeholder="q2-safety.pptx" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Assign training</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Academic records</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {academics.map((a) => (
            <li key={a.id} className="py-3 text-sm">
              <span className="font-medium">{a.type}</span> - {a.title} ({a.institute}, {a.year || "N/A"}) · {a.employeeEmail}
              <span className="ml-2 text-xs text-kastros-sage">Attachment: {a.attachmentName ?? "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Training logs + attendance</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-kastros-forest">{t.name}</p>
                <p className="text-sm text-kastros-sage">
                  {t.assigneeEmail} · {t.provider} ({t.providerName}) · due {t.due}
                </p>
                <p className="text-xs text-kastros-sage">
                  PPTX: {t.trainingMaterialPptx ?? "—"} · Attendance: {t.attendanceMarked ? "Marked" : "Pending"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-kastros-cream px-2 py-1 text-xs ring-1 ring-kastros-sand">{t.status}</span>
                <form action={(fd) => handle(setTrainingStatus(fd))}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="status" value={t.status === "Done" ? "Required" : "Done"} />
                  <button type="submit" disabled={pending} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50">
                    {t.status === "Done" ? "Reopen" : "Mark done"}
                  </button>
                </form>
                {canAssign ? (
                  <form action={(fd) => handle(markTrainingAttendance(fd))}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" disabled={pending} className="rounded-lg bg-kastros-forest px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                      Mark attendance
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
