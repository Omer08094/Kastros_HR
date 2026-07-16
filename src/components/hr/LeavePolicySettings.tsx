"use client";

import { useState } from "react";
import type { LeaveCategory } from "@/lib/store/types";
import {
  applyLeaveDefaultsToAllEmployees,
  deleteLeaveCategory,
  upsertLeaveCategory,
} from "@/lib/store/hr-actions-extra";
import { Field } from "@/components/Field";
import { PrimaryButton, useAction } from "./ModuleHelpers";

export function LeavePolicySettings({ categories }: { categories: LeaveCategory[] }) {
  const { pending, run } = useAction();
  const [editId, setEditId] = useState<string | null>(null);
  const year = new Date().getFullYear();

  const editing = editId ? categories.find((c) => c.id === editId) : null;
  const active = categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <p className="text-sm text-kastros-sage">
        Define leave types and <strong className="text-kastros-ink">standard days per year</strong>. Use &quot;Apply to all
        employees&quot; to copy these defaults to everyone&apos;s balance for {year}. You can still override individual
        employees on the <a href="/leave" className="font-medium text-kastros-forest underline">Leave</a> page.
      </p>

      <form
        key={editId ?? "new"}
        className="grid gap-3 rounded-xl border border-kastros-sand bg-kastros-cream/30 p-4 sm:grid-cols-2 lg:grid-cols-4"
        action={(fd) => {
          if (editId) fd.set("id", editId);
          run(upsertLeaveCategory(fd), editId ? "Leave type updated." : "Leave type added.");
          setEditId(null);
        }}
      >
        <Field name="name" label="Leave type name" required defaultValue={editing?.name ?? ""} placeholder="Sick leave" />
        <Field
          name="defaultDaysPerYear"
          label="Standard days / year"
          kind="number"
          required
          defaultValue={editing ? String(editing.defaultDaysPerYear) : "10"}
          min={0}
        />
        <Field name="sortOrder" label="Sort order" kind="number" defaultValue={editing ? String(editing.sortOrder) : "0"} />
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <PrimaryButton pending={pending}>{editId ? "Update type" : "Add leave type"}</PrimaryButton>
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
              <th className="pb-3 pr-3 font-medium">Leave type</th>
              <th className="pb-3 pr-3 font-medium">Standard days</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kastros-sand">
            {active.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-3 font-medium text-kastros-ink">{c.name}</td>
                <td className="py-3 pr-3 text-kastros-sage">{c.defaultDaysPerYear}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditId(c.id)}
                      className="rounded-lg bg-kastros-cream px-2 py-1 text-xs font-semibold ring-1 ring-kastros-sand"
                    >
                      Edit
                    </button>
                    <form action={(fd) => run(deleteLeaveCategory(fd), "Leave type removed.")}>
                      <input type="hidden" name="id" value={c.id} />
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

      <form
        action={(fd) => {
          fd.set("year", String(year));
          run(applyLeaveDefaultsToAllEmployees(fd), `Standard leave days applied to all active employees for ${year}.`);
        }}
      >
        <input type="hidden" name="year" value={year} />
        <PrimaryButton pending={pending}>Apply standard days to all active employees ({year})</PrimaryButton>
        <p className="mt-2 text-xs text-kastros-sage">
          Overwrites each employee&apos;s entitlement for {year} with the standard days shown above. Individual overrides
          can be set again on the Leave page.
        </p>
      </form>
    </div>
  );
}
