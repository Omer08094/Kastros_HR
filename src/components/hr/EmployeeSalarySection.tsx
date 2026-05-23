"use client";

import { useMemo, useState } from "react";
import type { CurrencyCode, Employee, SalaryAllowanceCatalogItem } from "@/lib/store/types";
import { currencyForBusinessUnit, CURRENCIES } from "@/lib/store/types";
import { upsertEmployeeCompensation } from "@/lib/store/hr-actions-extra";
import {
  formatAmountWithCommas,
  formatCurrency,
  formatDateTime,
  formatSalaryDisplay,
  parseFormattedAmount,
} from "@/lib/salary-format";

type ActionResult = { ok: true } | { error: string };

type AllowanceRow = { key: string; typeId: string; amount: string };

function CommasInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs">
      {label}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, "");
          const parsed = parseFormattedAmount(raw);
          onChange(parsed != null ? formatAmountWithCommas(parsed) : raw.replace(/,/g, ""));
        }}
        className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm tabular-nums"
      />
    </label>
  );
}

export function EmployeeSalarySection({
  employee,
  allowanceTypes,
  onSaved,
  pending,
  onError,
}: {
  employee: Employee;
  allowanceTypes: SalaryAllowanceCatalogItem[];
  onSaved: () => void;
  pending: boolean;
  onError: (msg: string | null) => void;
}) {
  const catalog = useMemo(
    () => allowanceTypes.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [allowanceTypes],
  );
  const catalogById = useMemo(() => new Map(catalog.map((t) => [t.id, t])), [catalog]);

  const defaultCurrency: CurrencyCode =
    employee.compensation?.currency ?? currencyForBusinessUnit(employee.businessUnit);

  const [gross, setGross] = useState(() =>
    employee.compensation ? formatAmountWithCommas(employee.compensation.grossSalary) : "",
  );
  const [basic, setBasic] = useState(() =>
    employee.compensation ? formatAmountWithCommas(employee.compensation.basicSalary) : "",
  );
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [rows, setRows] = useState<AllowanceRow[]>(() => {
    const existing = employee.compensation?.allowances ?? [];
    if (existing.length) {
      return existing.map((a, i) => ({
        key: `row-${i}`,
        typeId: a.typeId,
        amount: formatAmountWithCommas(a.amount),
      }));
    }
    return [{ key: "row-0", typeId: "", amount: "" }];
  });

  const comp = employee.compensation;

  function addRow() {
    setRows((r) => [...r, { key: `row-${Date.now()}`, typeId: "", amount: "" }]);
  }

  function removeRow(key: string) {
    setRows((r) => (r.length <= 1 ? [{ key: "row-0", typeId: "", amount: "" }] : r.filter((x) => x.key !== key)));
  }

  async function handleSubmit(fd: FormData) {
    onError(null);
    const r: ActionResult = await upsertEmployeeCompensation(fd);
    if ("error" in r) {
      onError(r.error);
      return;
    }
    onSaved();
  }

  return (
    <div className="rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 p-4 lg:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-kastros-brandGreen">Salary (HR / CEO only)</h3>

      {comp ? (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[minmax(0,140px)_1fr] sm:gap-x-4">
          <div className="contents">
            <dt className="text-kastros-sage">Gross salary</dt>
            <dd className="font-medium text-kastros-forest tabular-nums">
              {formatCurrency(comp.grossSalary, comp.currency)}
            </dd>
          </div>
          <div className="contents">
            <dt className="text-kastros-sage">Basic salary</dt>
            <dd className="tabular-nums text-kastros-ink">{formatCurrency(comp.basicSalary, comp.currency)}</dd>
          </div>
          {comp.allowances.length ? (
            <div className="contents sm:col-span-2">
              <dt className="text-kastros-sage sm:col-span-1">Allowances</dt>
              <dd className="sm:col-span-1">
                <ul className="space-y-1">
                  {comp.allowances.map((a) => {
                    const cat = catalogById.get(a.typeId);
                    const label = cat?.name ?? a.typeId;
                    const isLiters = cat?.unit === "liters";
                    return (
                      <li key={a.typeId} className="flex justify-between gap-4 text-kastros-ink">
                        <span>{label}</span>
                        <span className="tabular-nums font-medium">
                          {isLiters ? `${formatSalaryDisplay(a.amount)} L` : formatCurrency(a.amount, comp.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
          ) : null}
          {comp.updatedAt ? (
            <div className="contents sm:col-span-2">
              <dt className="text-kastros-sage">Last updated</dt>
              <dd className="text-xs text-kastros-sage">
                {formatDateTime(comp.updatedAt)}
                {comp.updatedByEmail ? ` · ${comp.updatedByEmail}` : null}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-kastros-sage">No salary recorded yet. Use the form below to add compensation.</p>
      )}

      <form action={handleSubmit} className="mt-4 space-y-4 border-t border-kastros-sand/80 pt-4">
        <input type="hidden" name="employeeId" value={employee.id} />
        <input type="hidden" name="currency" value={currency} />

        <div className="grid gap-3 sm:grid-cols-2">
          <CommasInput
            label="Gross salary"
            value={gross}
            onChange={setGross}
            placeholder="e.g. 100,000"
          />
          <CommasInput label="Basic salary" value={basic} onChange={setBasic} placeholder="e.g. 70,000" />
          <label className="text-xs">
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="text-xs font-semibold text-kastros-forest">Allowance breakdown</p>
          <ul className="mt-2 space-y-2">
            {rows.map((row) => {
              const cat = row.typeId ? catalogById.get(row.typeId) : undefined;
              const isLiters = cat?.unit === "liters";
              const usedElsewhere = new Set(rows.filter((r) => r.key !== row.key && r.typeId).map((r) => r.typeId));
              return (
                <li key={row.key} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/60 p-2 ring-1 ring-kastros-sand/50">
                  <label className="min-w-[160px] grow text-xs">
                    Allowance
                    <select
                      name="allowanceTypeId"
                      value={row.typeId}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r) => (r.key === row.key ? { ...r, typeId: e.target.value } : r)),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm"
                    >
                      <option value="">— Select —</option>
                      {catalog.map((t) => (
                        <option key={t.id} value={t.id} disabled={usedElsewhere.has(t.id)}>
                          {t.name}
                          {t.unit === "liters" ? " (liters)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="w-28 text-xs">
                    {isLiters ? "Liters" : "Amount"}
                    <input
                      name="allowanceAmount"
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      placeholder={isLiters ? "e.g. 50" : "e.g. 5,000"}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.,]/g, "");
                        const parsed = parseFormattedAmount(raw);
                        const formatted = parsed != null ? formatAmountWithCommas(parsed) : raw.replace(/,/g, "");
                        setRows((rs) =>
                          rs.map((r) => (r.key === row.key ? { ...r, amount: formatted } : r)),
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-kastros-sand px-2 py-1.5 text-sm tabular-nums"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-kastros-sage hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-xs font-semibold text-kastros-forest underline underline-offset-2"
          >
            + Add allowance line
          </button>
        </div>

        <input type="hidden" name="grossSalary" value={gross} />
        <input type="hidden" name="basicSalary" value={basic} />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-kastros-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save salary
          </button>
          {comp ? (
            <button
              type="submit"
              name="clearCompensation"
              value="1"
              disabled={pending}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-50"
            >
              Clear salary
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
