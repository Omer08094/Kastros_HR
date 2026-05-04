"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Employee } from "@/lib/store/types";
import { addEmployee, deleteEmployee, updateEmployee } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function EmployeesClient({ employees, canManage }: { employees: Employee[]; canManage: boolean }) {
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
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {canManage ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Add team member</h2>
          <p className="mt-1 text-sm text-kastros-sage">Creates a new profile in the demo store (persisted under /data).</p>
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
              <span className="text-kastros-sage">Location</span>
              <input name="location" required className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm" />
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
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Directory</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3 font-medium">Name</th>
                <th className="pb-3 pr-3 font-medium">Email</th>
                {!canManage ? <th className="pb-3 pr-3 font-medium">Title</th> : null}
                {!canManage ? <th className="pb-3 pr-3 font-medium">Location</th> : null}
                {!canManage ? <th className="pb-3 pr-3 font-medium">Status</th> : null}
                {!canManage ? <th className="pb-3 font-medium">Reports to</th> : null}
                {canManage ? <th className="pb-3 pr-3 font-medium">Edit</th> : null}
                {canManage ? <th className="pb-3 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {employees.map((e) =>
                canManage ? (
                  <tr key={e.id} className="align-top text-kastros-ink">
                    <td className="py-3 pr-3 font-medium">{e.name}</td>
                    <td className="py-3 pr-3 text-kastros-sage">{e.email}</td>
                    <td className="py-3 pr-3" colSpan={2}>
                      <form className="space-y-2" action={(fd) => handle(updateEmployee(fd))}>
                        <input type="hidden" name="id" value={e.id} />
                        <input name="title" defaultValue={e.title} className="w-full rounded-lg border border-kastros-sand px-2 py-1 text-xs" />
                        <input name="location" defaultValue={e.location} className="w-full rounded-lg border border-kastros-sand px-2 py-1 text-xs" />
                        <select name="status" defaultValue={e.status} className="w-full rounded-lg border border-kastros-sand px-2 py-1 text-xs">
                          <option>Active</option>
                          <option>On leave</option>
                          <option>Offboarding</option>
                        </select>
                        <input
                          name="reportsToEmail"
                          defaultValue={e.reportsToEmail ?? ""}
                          className="w-full rounded-lg border border-kastros-sand px-2 py-1 text-xs"
                          placeholder="Manager email"
                        />
                        <button type="submit" disabled={pending} className="rounded-lg bg-kastros-forest px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="py-3">
                      <form action={(fd) => handle(deleteEmployee(fd))}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="text-kastros-ink">
                    <td className="py-3 pr-3 font-medium">{e.name}</td>
                    <td className="py-3 pr-3 text-kastros-sage">{e.email}</td>
                    <td className="py-3 pr-3 text-kastros-sage">{e.title}</td>
                    <td className="py-3 pr-3 text-kastros-sage">{e.location}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex rounded-full bg-kastros-cream px-2 py-0.5 text-xs ring-1 ring-kastros-sand">{e.status}</span>
                    </td>
                    <td className="py-3 text-xs text-kastros-sage">{e.reportsToEmail ?? "—"}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
