"use client";

import { CreditCard, ExternalLink, Printer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Employee } from "@/lib/store/types";
import {
  CORPORATE_CARD_BACK_BG,
  CORPORATE_CARD_BACK_PDF,
  CORPORATE_CARD_FRONT_BG,
  CORPORATE_CARD_FRONT_PDF,
} from "@/lib/corporate-card";
import { printInnerHtmlInIframe } from "@/lib/print-in-iframe";

const PREVIEW_FRAME = "h-[189px] w-[300px] sm:h-[214px] sm:w-[340px]";
const PRINT_FRAME = "h-[53.98mm] w-[85.6mm]";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function shortCardRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function CorporateCardFront({
  employee,
  frameClass,
}: {
  employee: Employee;
  frameClass: string;
}) {
  const cardRef = shortCardRef(employee.id);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-kastros-forest via-kastros-pine to-kastros-forest text-white shadow-[0_12px_40px_-8px_rgba(20,52,47,0.5)] ring-1 ring-white/15 ${frameClass}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.38]"
        style={{ backgroundImage: `url(${CORPORATE_CARD_FRONT_BG})` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-2 left-2 w-1 rounded-full bg-gradient-to-b from-kastros-gold via-amber-200 to-kastros-gold opacity-95 shadow-[0_0_12px_rgba(201,162,39,0.35)]"
        aria-hidden
      />

      <div className="relative z-[1] flex h-full flex-row gap-3 p-4 sm:gap-4 sm:p-5 print:gap-[2mm] print:p-[3mm]">
        <div className="flex w-[34%] shrink-0 flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold uppercase tracking-tight ring-2 ring-kastros-gold/50 sm:h-[4.25rem] sm:w-[4.25rem] sm:text-xl print:h-[22mm] print:w-[22mm] print:text-[11pt]">
            {initials(employee.name)}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-kastros-gold/90 print:text-[7pt]">Kastros</p>
            <p className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl print:text-[13pt]">
              {employee.name}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-white/90 print:text-[9pt]">{employee.title}</p>
            <p className="mt-1 text-[10px] leading-snug text-white/70 print:text-[8pt]">
              {employee.department}
              <span className="text-white/40"> · </span>
              {employee.location}
            </p>
          </div>
          <div className="border-t border-white/15 pt-2 print:pt-1">
            <p className="truncate font-mono text-[9px] text-white/65 print:text-[7pt]">{employee.email}</p>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-kastros-gold/85 print:text-[6.5pt]">
              Card № {cardRef}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CorporateCardBack({ frameClass }: { frameClass: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-kastros-cream via-white to-kastros-sand/90 text-kastros-forest shadow-[0_12px_40px_-8px_rgba(20,52,47,0.2)] ring-1 ring-kastros-forest/10 ${frameClass}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.45]"
        style={{ backgroundImage: `url(${CORPORATE_CARD_BACK_BG})` }}
        aria-hidden
      />

      <div className="relative z-[1] flex h-full flex-col items-center justify-between px-4 py-5 text-center sm:px-6 sm:py-6 print:px-[3mm] print:py-[3mm]">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kastros-forest text-xl font-display font-semibold text-kastros-gold shadow-inner ring-2 ring-kastros-gold/25 sm:h-16 sm:w-16 sm:text-2xl print:h-[22mm] print:w-[22mm] print:text-[14pt]">
            K
          </div>
          <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.35em] text-kastros-forest print:text-[11pt]">
            Kastros
          </p>
          <p className="mt-1 max-w-[12rem] text-[10px] leading-snug text-kastros-sage print:max-w-none print:text-[8pt]">
            Cultivating global trade excellence
          </p>
        </div>

        <div className="w-full space-y-2">
          <div className="mx-auto flex h-7 w-[85%] items-end justify-center gap-px overflow-hidden rounded-md bg-kastros-ink/[0.06] px-1 pb-1 pt-2 print:h-[8mm]">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="shrink-0 rounded-[1px] bg-kastros-forest"
                style={{ width: i % 5 === 0 ? 3 : 2, height: `${40 + ((i * 7) % 55)}%`, opacity: 0.35 + (i % 4) * 0.12 }}
              />
            ))}
          </div>
          <p className="text-[8px] uppercase tracking-[0.2em] text-kastros-sage print:text-[6.5pt]">Official identification · Not transferable</p>
        </div>
      </div>
    </div>
  );
}

export function CorporateCardDialog({
  employee,
  open,
  onClose,
}: {
  employee: Employee;
  open: boolean;
  onClose: () => void;
}) {
  const [face, setFace] = useState<"front" | "back">("front");

  const handlePrint = useCallback(() => {
    const root = document.getElementById("corporate-card-print-root");
    if (!root) return;
    printInnerHtmlInIframe(root.innerHTML, {
      title: "Corporate card",
      extraCss: `
        .corporate-card-print-sheet {
          page-break-after: always;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 8mm 0 0;
        }
        .corporate-card-print-sheet:last-of-type {
          page-break-after: auto;
          padding-bottom: 8mm;
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
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-kastros-gold" aria-hidden />
            <div>
              <p className="font-display text-sm font-semibold text-kastros-forest">Corporate card preview</p>
              <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-kastros-sage sm:text-xs">
                Front pulls live fields for <span className="font-medium text-kastros-forest">{employee.name}</span>. Back is the same layout for all employees.
                Add PDF masters under <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.65rem]">public/corporate-card/</code> — optional PNG backs (
                <code className="text-[0.65rem]">front-bg.png</code>, <code className="text-[0.65rem]">back-bg.png</code>) align artwork when printing.
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
              Print both sides
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
              face === "front"
                ? "bg-kastros-forest text-white"
                : "text-kastros-sage hover:bg-kastros-cream/60"
            }`}
          >
            Front · personalized
          </button>
          <button
            type="button"
            onClick={() => setFace("back")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              face === "back"
                ? "bg-kastros-forest text-white"
                : "text-kastros-sage hover:bg-kastros-cream/60"
            }`}
          >
            Back · company
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain rounded-2xl border border-kastros-sand/80 bg-kastros-cream/40 p-6 shadow-inner">
          <div className="flex flex-col items-center gap-3">
            {face === "front" ? (
              <CorporateCardFront employee={employee} frameClass={PREVIEW_FRAME} />
            ) : (
              <CorporateCardBack frameClass={PREVIEW_FRAME} />
            )}
            <p className="max-w-sm text-center text-[11px] text-kastros-sage">
              Approx. CR80 / ID-1 proportions (85.6 × 54 mm). Print produces two pages — duplex if your printer supports it.
            </p>
          </div>

          <div className="mt-8 w-full max-w-sm rounded-xl border border-kastros-sand bg-white/90 px-4 py-3 text-left shadow-sm">
            <p className="text-xs font-semibold text-kastros-forest">Template PDFs (reference artwork)</p>
            <p className="mt-1 text-[11px] leading-snug text-kastros-sage">
              Place sample exports here so HR can open the official shells alongside this preview:
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={CORPORATE_CARD_FRONT_PDF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-kastros-forest underline-offset-2 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Front · front.pdf
              </a>
              <a
                href={CORPORATE_CARD_BACK_PDF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-kastros-forest underline-offset-2 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Back · back.pdf
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Off-screen DOM used only for iframe print (exact mm sizing). */}
      <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden>
        <div id="corporate-card-print-root">
          <div className="corporate-card-print-sheet">
            <CorporateCardFront employee={employee} frameClass={PRINT_FRAME} />
          </div>
          <div className="corporate-card-print-sheet">
            <CorporateCardBack frameClass={PRINT_FRAME} />
          </div>
        </div>
      </div>
    </div>
  );
}
