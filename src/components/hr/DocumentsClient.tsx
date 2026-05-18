"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { CoiSubmission, ConflictOfInterestDoc, DocumentRow, PolicyAcknowledgement, PolicyManual } from "@/lib/store/types";
import { acknowledgePolicy, addDocument, deleteDocument } from "@/lib/store/hr-actions";
import { submitCoiDocument, uploadCoiTemplate } from "@/lib/store/hr-actions-extra";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

/** Print an authenticated same-origin file (e.g. PDF) via a hidden iframe (browser-dependent for Office types). */
function printHrFileUrl(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
  });
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 2500);
    }
  };
  document.body.appendChild(iframe);
}

/** Same-origin paths only: library files, policy PDFs under /public, etc. */
function safeInlineAssetUrl(url: string): string | null {
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.includes("..")) return null;
  return u;
}

export function DocumentsClient({
  documents,
  policies,
  acknowledgements,
  currentUserEmail,
  canAdd,
  canDelete,
  linkableEmployees = [],
  coiDocs = [],
  coiSubmissions = [],
}: {
  documents: DocumentRow[];
  policies: PolicyManual[];
  acknowledgements: PolicyAcknowledgement[];
  currentUserEmail: string;
  canAdd: boolean;
  canDelete: boolean;
  linkableEmployees?: Array<{ email: string; name: string }>;
  coiDocs?: ConflictOfInterestDoc[];
  coiSubmissions?: CoiSubmission[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const companyLibrary = useMemo(() => documents.filter((d) => !d.employeeEmail), [documents]);

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

      {previewSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-kastros-forest/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
          onClick={(e) => e.target === e.currentTarget && setPreviewSrc(null)}
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-kastros-sand bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kastros-sand bg-kastros-cream/50 px-4 py-3">
              <span className="text-sm font-semibold text-kastros-forest">Preview</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                  onClick={() => printHrFileUrl(previewSrc)}
                >
                  Print
                </button>
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-kastros-sage hover:bg-kastros-cream"
                  onClick={() => setPreviewSrc(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <iframe title="Document file" className="min-h-[70vh] w-full flex-1 bg-white" src={previewSrc} />
          </div>
        </div>
      ) : null}

      {canAdd ? (
        <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-kastros-forest">Register a document</h2>
          <p className="mt-1 text-sm text-kastros-sage">
            Upload notices and templates. <strong>Company-wide</strong> entries appear in the library below.{" "}
            <strong>Personnel file</strong> links only appear under that person on People (not in the company library).
          </p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addDocument(fd))}>
            <label className="text-sm sm:col-span-2">
              <span className="text-kastros-sage">Attach file (optional)</span>
              <input
                name="documentFile"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-kastros-cream file:px-3 file:py-2 file:text-kastros-forest"
              />
              <span className="mt-1 block text-xs text-kastros-sage">PDF, Word, PowerPoint, or image — max ~12 MB.</span>
            </label>
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
                <option value="">Company-wide notice (library only)</option>
                {linkableEmployees.map((e) => (
                  <option key={e.email} value={e.email}>
                    {e.name} · {e.email}
                  </option>
                ))}
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
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Company library</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Company-wide notices and templates only. Personnel onboarding files live on <strong>People</strong>.
        </p>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {companyLibrary.length === 0 ? (
            <li className="py-8 text-center text-sm text-kastros-sage">No company-wide documents registered yet.</li>
          ) : (
            companyLibrary.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-kastros-forest">{d.name}</p>
                  <p className="text-xs text-kastros-sage">
                    Notice / template · {d.owner} · {d.sensitivity} · registered by {d.createdByEmail}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {d.storedRef ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewSrc(`/api/hr-file/${d.storedRef}`)}
                        className="rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => printHrFileUrl(`/api/hr-file/${d.storedRef}`)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                      >
                        Print
                      </button>
                      <a
                        href={`/api/hr-file/${d.storedRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-kastros-forest underline"
                      >
                        Open
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-kastros-sage">No file on record</span>
                  )}
                  {canDelete ? (
                    <form className="inline" action={(fd) => handle(deleteDocument(fd))}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" disabled={pending} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Policy manual acknowledgement</h2>
        <ul className="mt-4 divide-y divide-kastros-sand">
          {policies.map((p) => {
            const ack = acknowledgements.find(
              (a) => a.policyId === p.id && a.employeeEmail.toLowerCase() === currentUserEmail.toLowerCase(),
            );
            const policyAsset = safeInlineAssetUrl(p.printableUrl);
            return (
              <li key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-kastros-forest">
                    {p.title} ({p.version})
                  </p>
                  <p className="text-xs text-kastros-sage">Printable copy: {p.printableUrl}</p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    {policyAsset ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewSrc(policyAsset)}
                          className="rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => printHrFileUrl(policyAsset)}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand"
                        >
                          Print
                        </button>
                        <a
                          href={policyAsset}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-kastros-forest px-3 py-1.5 text-center text-xs font-semibold text-white"
                        >
                          Open
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-kastros-sage">Set a site-relative path (e.g. /policies/manual.pdf) for preview.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
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
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Conflict of Interest ---- */}
      <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-kastros-forest">Conflict of Interest declaration</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          HR uploads the CoI template here. Every employee downloads it, signs it offline, then uploads their signed copy below.
        </p>

        {canAdd ? (
          <div className="mt-4 rounded-xl bg-kastros-cream/40 p-4 ring-1 ring-kastros-sand/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">HR — upload template</p>
            <form className="mt-3 grid gap-3 sm:grid-cols-3" action={(fd) => handle(uploadCoiTemplate(fd))}>
              <label className="text-sm sm:col-span-2">
                <span className="text-kastros-sage">Template file (PDF / Word)</span>
                <input
                  name="coiFile"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-kastros-forest"
                />
              </label>
              <label className="text-sm">
                <span className="text-kastros-sage">Version label</span>
                <input name="version" placeholder="e.g. 2026-v1" className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm" />
              </label>
              <div className="sm:col-span-3">
                <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {pending ? "Uploading…" : "Upload template"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {coiDocs.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Available templates</p>
            {coiDocs.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-kastros-sand bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-kastros-forest">{doc.originalName}</p>
                  <p className="text-xs text-kastros-sage">
                    {doc.version ? `v${doc.version} · ` : ""}Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} by {doc.uploadedByEmail}
                  </p>
                </div>
                <a
                  href={`/api/hr-file/${doc.storedRef}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="rounded-lg bg-kastros-forest px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Download template
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-kastros-sage">No CoI template uploaded yet. HR will add one above.</p>
        )}

        {coiDocs.length > 0 ? (
          <div className="mt-5 rounded-xl bg-kastros-cream/40 p-4 ring-1 ring-kastros-sand/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Submit your signed CoI</p>
            {(() => {
              const mySub = coiSubmissions.find((s) => s.employeeEmail.toLowerCase() === currentUserEmail.toLowerCase());
              return mySub ? (
                <p className="mt-2 text-sm text-emerald-700">
                  ✓ Signed CoI submitted on {new Date(mySub.submittedAt).toLocaleDateString()} ({mySub.originalName}).{" "}
                  <a href={`/api/hr-file/${mySub.storedRef}`} target="_blank" rel="noopener noreferrer" className="underline">
                    View
                  </a>
                </p>
              ) : (
                <form className="mt-3 grid gap-3 sm:grid-cols-2" action={(fd) => handle(submitCoiDocument(fd))}>
                  <label className="text-sm sm:col-span-2">
                    <span className="text-kastros-sage">Your signed document (PDF / scan)</span>
                    <input
                      name="signedCoiFile"
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-kastros-forest"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={pending} className="rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {pending ? "Submitting…" : "Submit signed CoI"}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        ) : null}

        {canAdd && coiSubmissions.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kastros-sage">Employee submissions</p>
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-2 pr-3 font-medium">Employee</th>
                  <th className="pb-2 pr-3 font-medium">Submitted</th>
                  <th className="pb-2 font-medium">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {coiSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-2 pr-3 text-xs text-kastros-sage">{sub.employeeEmail}</td>
                    <td className="py-2 pr-3 text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <a href={`/api/hr-file/${sub.storedRef}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-kastros-forest underline">
                        {sub.originalName}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
