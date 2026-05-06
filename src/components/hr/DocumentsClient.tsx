"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DocumentRow, PolicyAcknowledgement, PolicyManual } from "@/lib/store/types";
import { acknowledgePolicy, addDocument, deleteDocument } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function DocumentsClient({
  documents,
  policies,
  acknowledgements,
  currentUserEmail,
  canAdd,
  canDelete,
  linkableEmployees = [],
}: {
  documents: DocumentRow[];
  policies: PolicyManual[];
  acknowledgements: PolicyAcknowledgement[];
  currentUserEmail: string;
  canAdd: boolean;
  canDelete: boolean;
  linkableEmployees?: Array<{ email: string; name: string }>;
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
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Personnel file (optional)</span>
              <select
                name="employeeEmail"
                className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Company-wide only (not tied to one person)</option>
                {linkableEmployees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} · {e.email}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-kastros-sage">
                Link scans received at arrival to the right person; they also appear on People.
              </span>
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
                  {d.employeeEmail ? (
                    <>
                      On file for <span className="font-medium text-kastros-forest">{d.employeeEmail}</span>
                      <span className="text-kastros-sage"> · </span>
                    </>
                  ) : (
                    <>Company library · </>
                  )}
                  {d.owner} · {d.sensitivity} · registered by {d.createdByEmail}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                {d.storedRef ? (
                  <a
                    href={`/api/hr-file/${d.storedRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-kastros-forest underline"
                  >
                    View file
                  </a>
                ) : null}
                {canDelete ? (
                  <form action={(fd) => handle(deleteDocument(fd))}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                      Delete
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Policy manual acknowledgement</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {policies.map((p) => {
            const ack = acknowledgements.find(
              (a) => a.policyId === p.id && a.employeeEmail.toLowerCase() === currentUserEmail.toLowerCase(),
            );
            return (
              <li key={p.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-kastros-forest">
                    {p.title} ({p.version})
                  </p>
                  <p className="text-xs text-kastros-sage">Printable copy: {p.printableUrl}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ack ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200">
                      Acknowledged ({new Date(ack.acknowledgedAt).toLocaleDateString()})
                    </span>
                  ) : (
                    <form action={(fd) => handle(acknowledgePolicy(fd))}>
                      <input type="hidden" name="policyId" value={p.id} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
