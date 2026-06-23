"use client";

import { CreditCard, Printer, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { BusinessUnitRecord, Employee } from "@/lib/store/types";
import { BRAND_LOGO, BRAND_LOGO_WHITE } from "@/lib/brand-assets";
import { businessUnitLabel, resolveCardReturnAddress } from "@/lib/corporate-card";
import { printInnerHtmlInIframe } from "@/lib/print-in-iframe";

/** Portrait ID-1 (54 × 85.6 mm) — vertical badge */
const PREVIEW_FRAME = "h-[300px] w-[188px] sm:h-[340px] sm:w-[214px]";
const PRINT_FRAME = "h-[85.6mm] w-[54mm]";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function displayEmployeeId(employee: Employee): string {
  if (employee.employeeIdDisplay?.trim()) return employee.employeeIdDisplay.trim();
  return employee.id.replace(/^emp-/, "").slice(0, 8).toUpperCase();
}

function CardShell({
  frameClass,
  children,
}: {
  frameClass: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`box-border overflow-hidden rounded-xl shadow-[0_8px_28px_-6px_rgba(43,57,144,0.25)] ring-1 ring-[#2B3990]/15 ${frameClass}`}
    >
      {children}
    </div>
  );
}

function CorporateCardFront({
  employee,
  frameClass,
  origin,
  compact,
}: {
  employee: Employee;
  frameClass: string;
  origin: string;
  compact?: boolean;
}) {
  const logoSrc = `${origin}${BRAND_LOGO}`;
  const photoSrc = employee.photoStoredRef ? `${origin}/api/hr-file/${employee.photoStoredRef}` : null;

  return (
    <CardShell frameClass={frameClass}>
      <div className="flex h-full w-full flex-col bg-gradient-to-b from-white via-[#f4f7fb] to-[#e8eef6] px-3 pb-2.5 pt-2.5 text-[#2B3990] print:px-[2.5mm] print:pb-[2.5mm] print:pt-[2.5mm]">
        <div className="flex shrink-0 justify-center">
          <img
            src={logoSrc}
            alt=""
            className={`w-auto max-w-[90%] object-contain print:h-[8mm] ${compact ? "h-6" : "h-7"}`}
          />
        </div>

        <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
          <div
            className={`relative mx-auto overflow-hidden rounded-lg bg-[#dce3f0] ring-1 ring-[#2B3990]/20 ${
              compact ? "aspect-[3/4] w-[48%]" : "aspect-[3/4] w-[56%]"
            }`}
          >
            {photoSrc ? (
              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#e8ecf4] font-display text-lg font-semibold text-[#2B3990]/50 print:text-[11pt]">
                {initials(employee.name)}
              </div>
            )}
          </div>

          <p
            className={`text-center font-display font-bold leading-tight text-[#2B3990] print:text-[12pt] ${
              compact ? "mt-1.5 text-[14px]" : "mt-2.5 text-[16px]"
            }`}
          >
            {employee.name}
          </p>
          <p
            className={`text-center font-semibold leading-snug text-[#006837] print:text-[9.5pt] ${
              compact ? "mt-0.5 text-[11px]" : "mt-1 text-[12px]"
            }`}
          >
            {employee.title}
          </p>

          <div
            className={`mt-auto shrink-0 space-y-0.5 border-t border-[#2B3990]/15 pt-1.5 text-[#2B3990]/90 print:text-[8pt] ${
              compact ? "text-[9px] leading-tight" : "text-[10px] leading-snug"
            }`}
          >
            <p>
              <span className="font-semibold text-[#2B3990]">Employee ID</span>
              <br />
              <span className="font-mono tracking-tight">{displayEmployeeId(employee)}</span>
            </p>
            <p>
              <span className="font-semibold text-[#2B3990]">Blood group</span>
              <br />
              <span className="font-mono tracking-tight">{employee.bloodGroup?.trim() || "—"}</span>
            </p>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function CorporateCardBack({
  frameClass,
  origin,
  employee,
  businessUnits,
}: {
  frameClass: string;
  origin: string;
  employee: Employee;
  businessUnits: BusinessUnitRecord[];
}) {
  const logoSrc = `${origin}${BRAND_LOGO_WHITE}`;
  const returnAddress = resolveCardReturnAddress(employee, businessUnits);
  const buLabel = businessUnitLabel(employee.businessUnit);

  return (
    <CardShell frameClass={frameClass}>
      <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#2B3990] to-[#243d6b] px-3 py-3 text-white print:px-[2.5mm] print:py-[2.5mm]">
        <div className="flex w-full flex-col items-center text-center">
          <img src={logoSrc} alt="" className="h-7 w-auto object-contain opacity-95 print:h-[8mm]" />
          <p className="mt-2 text-[9px] font-medium tracking-wide text-white/90 print:text-[7pt]">kastros.co</p>
        </div>

        <div className="mt-auto w-full border-t border-white/15 pt-2.5 text-center">
          <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-white/80 print:text-[6pt]">
            If found, please return to
          </p>
          {returnAddress ? (
            <p className="mt-1.5 whitespace-pre-line text-[8px] leading-snug text-white/90 print:text-[6.5pt]">
              {returnAddress}
            </p>
          ) : (
            <p className="mt-1.5 text-[8px] leading-snug text-white/70 print:text-[6.5pt]">
              Kastros {buLabel} — set return address in Organization setup.
            </p>
          )}
          <p className="mt-2 text-[7px] uppercase tracking-[0.12em] text-white/55 print:text-[5.5pt]">
            Official ID · Not transferable
          </p>
        </div>
      </div>
    </CardShell>
  );
}

export function CorporateCardDialog({
  employee,
  businessUnits,
  open,
  onClose,
}: {
  employee: Employee;
  businessUnits: BusinessUnitRecord[];
  open: boolean;
  onClose: () => void;
}) {
  const [face, setFace] = useState<"front" | "back">("front");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const handlePrint = useCallback(() => {
    const root = document.getElementById("corporate-card-print-root");
    if (!root) return;
    printInnerHtmlInIframe(root.innerHTML, {
      title: "Corporate card",
      extraCss: `
        .corp-card-print-pair {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          gap: 18mm;
          page-break-inside: avoid;
        }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
        }
      `,
    });
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
        <div className="pointer-events-auto flex max-w-[min(100%,40rem)] flex-col gap-2 rounded-2xl border border-kastros-sand bg-white/95 px-3 py-2.5 shadow-card ring-1 ring-kastros-forest/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-kastros-brandBlue" aria-hidden />
            <div>
              <p className="font-display text-sm font-semibold text-kastros-forest">Corporate card</p>
              <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-kastros-sage sm:text-xs">
                Vertical layout · front and back print on <strong>one page</strong>. Set blood group and photo under People → Edit profile.
                Return address per sector under <strong>Organization setup</strong>.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print (1 page)
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

      <div className="relative z-[1] mx-auto mt-[6.5rem] flex min-h-0 w-full max-w-lg flex-1 flex-col px-3 pb-4 sm:mt-[6.75rem] sm:px-4 sm:pb-6">
        <div className="flex justify-center gap-1 rounded-xl border border-kastros-sand bg-white/90 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setFace("front")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              face === "front" ? "bg-kastros-forest text-white" : "text-kastros-sage hover:bg-kastros-cream/60"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setFace("back")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              face === "back" ? "bg-kastros-forest text-white" : "text-kastros-sage hover:bg-kastros-cream/60"
            }`}
          >
            Back
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain rounded-2xl border border-kastros-sand/80 bg-kastros-cream/40 p-6 shadow-inner">
          <div className="flex flex-col items-center gap-3">
            {face === "front" ? (
              <CorporateCardFront employee={employee} frameClass={PREVIEW_FRAME} origin={origin} compact />
            ) : (
              <CorporateCardBack
                frameClass={PREVIEW_FRAME}
                origin={origin}
                employee={employee}
                businessUnits={businessUnits}
              />
            )}
          </div>
        </div>
      </div>

      <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden>
        <div id="corporate-card-print-root">
          <div className="corp-card-print-pair">
            <CorporateCardFront employee={employee} frameClass={PRINT_FRAME} origin={origin || "http://localhost:3000"} />
            <CorporateCardBack
              frameClass={PRINT_FRAME}
              origin={origin || "http://localhost:3000"}
              employee={employee}
              businessUnits={businessUnits}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
