"use client";

import { useState } from "react";
import type { SalaryAllowanceCatalogItem } from "@/lib/store/types";
import { deleteSalaryAllowanceType, upsertSalaryAllowanceType } from "@/lib/store/hr-actions-extra";
import { Field } from "@/components/Field";
import { PrimaryButton, StatusBanner, useAction } from "./ModuleHelpers";

export function SalaryAllowanceTypesSettings({ types }: { types: SalaryAllowanceCatalogItem[] }) {
  const { pending, error, success, run } = useAction();
  const [editId, setEditId] = useState<string | null>(null);

  const editing = editId ? types.find((t) => t.id === editId) : null;
  const active = types.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <StatusBanner error={error} success={success} />

      <p className="text-sm text-kastros-sage">
        Define allowance labels used when setting each employee&apos;s salary on{" "}
        <a href="/employees" className="font-medium text-kastros-forest underline">
          People
        </a>
        . Choose <strong className="text-kastros-ink">Liters</strong> for fuel; all other types use a monetary amount.
      </p>

      <form
        key={editId ?? "new"}
        className="grid gap-3 rounded-xl border border-kastros-sand bg-kastros-cream/30 p-4 sm:grid-cols-2 lg:grid-cols-4"
        action={(fd) => {
          if (editId) fd.set("id", editId);
          run(upsertSalaryAllowanceType(fd), editId ? "Allowance updated." : "Allowance added.");
          setEditId(null);
        }}
      >
        <Field name="name" label="Allowance name" required defaultValue={editing?.name ?? ""} placeholder="Cell phone allowance" />
        <label className="text-sm">
          <span className="text-kastros-sage">Unit</span>
          <select
            name="unit"
            defaultValue={editing?.unit ?? "money"}
            className="mt-1 w-full rounded-xl border border-kastros-sand px-3 py-2 text-sm"
          >
            <option value="money">Money amount</option>
            <option value="liters">Liters (fuel)</option>
          </select>
        </label>
        <Field name="sortOrder" label="Sort order" kind="number" defaultValue={editing ? String(editing.sortOrder) : "0"} />
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <PrimaryButton pending={pending}>{editId ? "Update allowance" : "Add allowance type"}</PrimaryButton>
          {editId ? (
            <button
              type="button"
              onClick={() => setEditId(null)}
              className="rounded-xl border border-kastros-sand px-4 py-2.5 text-sm font-medium text-kastros-forest"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
              <th className="pb-3 pr-3 font-medium">Allowance</th>
              <th className="pb-3 pr-3 font-medium">Unit</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kastros-sand">
            {active.map((t) => (
              <tr key={t.id}>
                <td className="py-3 pr-3 font-medium text-kastros-ink">{t.name}</td>
                <td className="py-3 pr-3 text-kastros-sage">{t.unit === "liters" ? "Liters" : "Money"}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditId(t.id)}
                      className="rounded-lg bg-kastros-cream px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand"
                    >
                      Edit
                    </button>
                    <form action={(fd) => run(deleteSalaryAllowanceType(fd), "Allowance removed.")}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
