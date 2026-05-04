"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DocumentRow } from "@/lib/store/types";
import { addDocument, deleteDocument } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function DocumentsClient({
  documents,
  canAdd,
  canDelete,
}: {
  documents: DocumentRow[];
  canAdd: boolean;
  canDelete: boolean;
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
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {canAdd ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Register a document</h2>
          <p className="mt-1 text-sm text-kastros-sage">Metadata only in this demo (no binary upload).</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addDocument(fd))}>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Name</span>
              <input name="name" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Owner</span>
              <input name="owner" required className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="text-kastros-sage">Sensitivity</span>
              <select name="sensitivity" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" defaultValue="Internal">
                <option>Internal</option>
                <option>Confidential</option>
                <option>Restricted</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Saving…" : "Add document"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Library</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-kastros-forest">{d.name}</p>
                <p className="text-xs text-kastros-sage">
                  {d.owner} · {d.sensitivity} · created by {d.createdByEmail}
                </p>
              </div>
              {canDelete ? (
                <form action={(fd) => handle(deleteDocument(fd))}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
