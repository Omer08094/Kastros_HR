"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-kastros-cream px-3 py-1.5 text-xs font-semibold ring-1 ring-kastros-sand"
    >
      Print
    </button>
  );
}
