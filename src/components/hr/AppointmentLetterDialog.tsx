"use client";

import { Printer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Employee } from "@/lib/store/types";

import { BRAND_LOGO } from "@/lib/brand-assets";
import { formatCurrency } from "@/lib/salary-format";
import { printInnerHtmlInIframe } from "@/lib/print-in-iframe";

function employmentTypeLabel(t: Employee["employmentType"] | null | undefined): string {
  const v = t && ["Permanent", "Temporary", "Contractual", "Intern"].includes(t) ? t : "Permanent";
  return v.toLowerCase();
}

function printAppointmentLetterInIframe() {
  const source = document.getElementById("appointment-letter-print-root");
  if (!source) return;
  printInnerHtmlInIframe(source.innerHTML, { title: "Appointment letter" });
}

function formatLongDate(isoOrDisplay: string | null | undefined): string {
  const raw = typeof isoOrDisplay === "string" ? isoOrDisplay.trim() : "";
  if (!raw) return "—";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }
  return raw;
}

function resolveReportsToLabel(reportsToEmail: string | null, roster: Employee[]): string {
  if (!reportsToEmail?.trim()) return "—";
  const normalized = reportsToEmail.trim().toLowerCase();
  const found = roster.find((x) => x.email.toLowerCase() === normalized);
  return found ? `${found.name}` : reportsToEmail.trim();
}

function AppointmentLetterBody({
  employee,
  roster,
  issuedOn,
  logoSrc,
  salary,
  salaryCurrency,
}: {
  employee: Employee;
  roster: Employee[];
  issuedOn: string;
  logoSrc: string;
  salary?: number | null;
  salaryCurrency?: string | null;
}) {
  const reportsTo = resolveReportsToLabel(employee.reportsToEmail, roster);

  /** Wordmark leaf green (Kastros logo) */
  const brandGreen = "#006837";

  return (
    <div
      className="relative w-full max-w-[min(100%,34rem)] bg-white shadow-inner print:max-w-[210mm]"
      style={{ color: brandGreen }}
    >
      <div className="relative z-[1] px-6 pb-8 pt-6 print:px-[14mm] print:pb-[16mm] print:pt-[14mm] sm:px-8 sm:pt-8">
        <header className="border-b border-[#006837]/20 pb-4 font-display print:border-[#006837]/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {logoSrc ? (
              <img src={logoSrc} alt="Kastros" className="h-10 w-auto max-w-[200px] object-contain object-left print:h-[12mm]" />
            ) : (
              <span className="font-display text-lg font-semibold text-[#2B3990]">Kastros</span>
            )}
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006837]">Appointment letter</p>
              <p className="mt-1 text-sm text-[#006837]/85">{issuedOn}</p>
            </div>
          </div>
        </header>

        <div className="mt-6 space-y-4 text-sm leading-relaxed print:mt-8 print:space-y-5 print:font-display print:text-[15px] [&_strong]:font-semibold [&_strong]:text-[#005530]">
          <p>Dear {employee.name},</p>

          <p>
            Further to your discussions with us, we are pleased to confirm your appointment as{" "}
            <strong>{employee.title}</strong> within <strong>{employee.department}</strong>, based at{" "}
            <strong>{employee.location}</strong>.
          </p>

          <p>
            Your employment is offered on an <strong>{employmentTypeLabel(employee.employmentType)}</strong> basis, with a
            commencement date of <strong>{formatLongDate(employee.joiningDate)}</strong>.{" "}
            {(employee.probationMonths ?? 0) > 0 ? (
              <>
                The probationary period is <strong>{employee.probationMonths}</strong> month
                {employee.probationMonths === 1 ? "" : "s"}, anticipated to conclude on{" "}
                <strong>{formatLongDate(employee.probationCompletionDate)}</strong>.
              </>
            ) : (
              <>Probation does not apply per your personnel record.</>
            )}
          </p>

          <p>
            You will report to <strong>{reportsTo}</strong>. Work contact details on file:{" "}
            <strong>{employee.companyPhone?.trim() ? employee.companyPhone : "as communicated separately"}</strong>.
          </p>

          {salary != null && salary > 0 ? (
            <p>
              Your gross monthly salary is{" "}
              <strong>
                {formatCurrency(salary, salaryCurrency ?? "USD")}
              </strong>{" "}
              per month, subject to applicable deductions as per company policy and law.
            </p>
          ) : null}

          <p>
            This letter is issued as a general confirmation for internal records. Compensation, benefits, confidentiality,
            and conduct expectations remain governed by Kastros policies, your contract where applicable, and applicable
            law. Please acknowledge receipt by coordinating with Human Resources.
          </p>

          <p className="pt-4">We look forward to your contributions.</p>

          <p className="pt-2">Yours sincerely,</p>

          <div className="pt-10">
            <div className="h-px w-48 bg-[#006837]/45 print:bg-[#006837]" />
            <p className="mt-3 text-sm font-semibold text-[#006837]">Authorized signatory</p>
            <p className="text-sm text-[#006837]/80">Human Resources · Kastros</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppointmentLetterDialog({
  employee,
  roster,
  open,
  onClose,
  salary,
  salaryCurrency,
}: {
  employee: Employee;
  roster: Employee[];
  open: boolean;
  onClose: () => void;
  salary?: number | null;
  salaryCurrency?: string | null;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const logoSrc = origin ? `${origin}${BRAND_LOGO}` : "";

  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = useCallback(() => {
    printAppointmentLetterInIframe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex min-h-0 flex-col print:hidden">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-[2] flex justify-center px-3 sm:top-4 sm:px-4">
        <div className="pointer-events-auto flex max-w-[min(100%,36rem)] flex-col gap-2 rounded-2xl border border-kastros-sand bg-white/95 px-3 py-2.5 shadow-card ring-1 ring-kastros-forest/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div>
            <p className="font-display text-sm font-semibold text-kastros-forest">Appointment letter preview</p>
            <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-kastros-sage sm:text-xs">
              Letterhead uses the Kastros logo from <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.65rem]">public/brand/kastros-logo.png</code>.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-kastros-sand bg-white px-4 py-2.5 text-sm font-semibold text-kastros-forest hover:bg-kastros-cream/50"
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative z-[1] mx-auto mt-[5.25rem] flex min-h-0 w-full max-w-[calc(34rem+2rem)] flex-1 flex-col px-3 pb-4 sm:mt-[5.5rem] sm:max-w-[calc(34rem+3rem)] sm:px-4 sm:pb-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-letter-title"
      >
        <h2 id="appointment-letter-title" className="sr-only">
          Appointment letter for {employee.name}
        </h2>

        <div className="flex min-h-0 flex-1 justify-center overflow-y-auto overscroll-contain rounded-2xl border border-kastros-sand/80 bg-kastros-cream/40 p-3 shadow-inner sm:p-4">
          <div id="appointment-letter-print-root">
            <AppointmentLetterBody employee={employee} roster={roster} issuedOn={issuedOn} logoSrc={logoSrc} salary={salary} salaryCurrency={salaryCurrency} />
          </div>
        </div>
      </div>
    </div>
  );
}
