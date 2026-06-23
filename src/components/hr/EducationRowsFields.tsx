"use client";

import { useState } from "react";
import type { EducationEntry } from "@/lib/store/types";

const ROW_INP =
  "w-full rounded-lg border border-kastros-sand px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-kastros-forest";

type Row = { degree: string; institution: string; year: string };

function toRows(entries: EducationEntry[]): Row[] {
  if (entries.length === 0) return [{ degree: "", institution: "", year: "" }];
  return entries.map((e) => ({ degree: e.degree, institution: e.institution, year: e.year }));
}

export function EducationRowsFields({ entries }: { entries: EducationEntry[] }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(entries));

  function updateRow(i: number, field: keyof Row, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((r) => [...r, { degree: "", institution: "", year: "" }]);
  }

  function removeRow(i: number) {
    setRows((r) => (r.length <= 1 ? [{ degree: "", institution: "", year: "" }] : r.filter((_, idx) => idx !== i)));
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-white/60 p-3 ring-1 ring-kastros-sand/50">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-kastros-sage">Degree / qualification</label>
            <input
              name="eduDegree"
              value={row.degree}
              onChange={(e) => updateRow(i, "degree", e.target.value)}
              placeholder="e.g. BBA"
              className={ROW_INP}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-kastros-sage">Institution</label>
            <input
              name="eduInstitution"
              value={row.institution}
              onChange={(e) => updateRow(i, "institution", e.target.value)}
              placeholder="e.g. IBA Karachi"
              className={ROW_INP}
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs text-kastros-sage">Year</label>
            <input
              name="eduYear"
              value={row.year}
              onChange={(e) => updateRow(i, "year", e.target.value)}
              placeholder="2024"
              maxLength={4}
              className={ROW_INP}
            />
          </div>
          {rows.length > 1 ? (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="pb-1.5 text-xs font-semibold text-red-700 hover:underline"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="rounded-lg bg-kastros-cream px-3 py-1.5 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand hover:bg-kastros-sand/30"
      >
        + Add education row
      </button>
    </div>
  );
}
