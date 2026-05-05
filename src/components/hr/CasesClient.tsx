"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HrCase } from "@/lib/store/types";
import { createCase, updateCaseStatus } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function CasesClient({ cases, canManage }: { cases: HrCase[]; canManage: boolean }) {
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
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Open a case</h2>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" action={(fd) => handle(createCase(fd))}>
            <label className="flex-1 text-sm">
              <span className="text-kastros-sage">Topic</span>
              <input name="topic" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Type</span>
              <select name="type" className="mt-1 rounded-xl border border-kastros-sand px-3 py-2 text-sm">
                <option>Conflict of Interest</option>
                <option>Code of Conduct</option>
                <option>Other</option>
              </select>
            </label>
            <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              Create
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Matters</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                <th className="pb-3 pr-3 font-medium">Ref</th>
                <th className="pb-3 pr-3 font-medium">Topic</th>
                <th className="pb-3 pr-3 font-medium">Opened</th>
                <th className="pb-3 pr-3 font-medium">By</th>
                <th className="pb-3 pr-3 font-medium">Type</th>
                <th className="pb-3 pr-3 font-medium">Status</th>
                {canManage ? <th className="pb-3 font-medium">Update</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {cases.map((c) => (
                <tr key={c.id} className="text-kastros-ink">
                  <td className="py-3 pr-3 font-mono text-xs">{c.reference}</td>
                  <td className="py-3 pr-3">{c.topic}</td>
                  <td className="py-3 pr-3 text-kastros-sage">{c.opened}</td>
                  <td className="py-3 pr-3 text-xs text-kastros-sage">{c.openedByEmail}</td>
                  <td className="py-3 pr-3">{c.type}</td>
                  <td className="py-3 pr-3">{c.status}</td>
                  {canManage ? (
                    <td className="py-3">
                      <form className="flex flex-wrap items-center gap-2" action={(fd) => handle(updateCaseStatus(fd))}>
                        <input type="hidden" name="id" value={c.id} />
                        <select name="status" defaultValue={c.status} className="rounded-lg border border-kastros-sand px-2 py-1 text-xs">
                          <option>Open</option>
                          <option>Under review</option>
                          <option>Resolved</option>
                          <option>Closed</option>
                        </select>
                        <button type="submit" disabled={pending} className="rounded-lg bg-kastros-cream px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand disabled:opacity-50">
                          Save
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
