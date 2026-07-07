"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Network, Users, AlertTriangle } from "lucide-react";
import { OrgChartViewport } from "@/components/hr/OrgChartViewport";
import { formatEmployeeDepartment } from "@/lib/executive-org";
import { buildDepartmentOrgTree, buildOrgTree, type OrgTreeNode } from "@/lib/org-tree";
import type { Employee } from "@/lib/store/types";

export type OrgChartMode = "company" | "department";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function statusTone(status: Employee["status"]): string {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "On leave":
      return "bg-sky-50 text-sky-900 ring-sky-200";
    case "Offboarding":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    default:
      return "bg-kastros-cream text-kastros-sage ring-kastros-sand";
  }
}

function EmployeeNodeCard({ node }: { node: OrgTreeNode }) {
  const photoSrc = node.photoStoredRef ? `/api/hr-file/${node.photoStoredRef}` : null;
  const directReports = node.children.length;

  return (
    <Link
      href={`/employees?id=${encodeURIComponent(node.id)}`}
      className="group relative z-[1] block w-[10.5rem] rounded-2xl border border-kastros-sand bg-white p-2.5 text-center shadow-sm ring-1 ring-kastros-forest/[0.04] transition hover:border-kastros-brandGreen/35 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest sm:w-[11rem]"
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-kastros-cream ring-2 ring-white">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-sm font-semibold text-kastros-forest/70">{initials(node.name)}</span>
        )}
      </div>
      <p className="mt-1.5 font-display text-[13px] font-semibold leading-snug text-kastros-forest group-hover:text-kastros-brandBlue">
        {node.name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-kastros-sage">{node.title}</p>
      <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-wide text-kastros-sage">
        {node.businessUnit ?? "—"} · {formatEmployeeDepartment(node)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
        <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold ring-1 ${statusTone(node.status)}`}>
          {node.status}
        </span>
        {directReports > 0 ? (
          <span className="rounded-full bg-kastros-cream px-1.5 py-0.5 text-[0.55rem] font-semibold text-kastros-forest ring-1 ring-kastros-sand">
            {directReports} report{directReports === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {node.managerMissing ? (
        <p className="mt-1.5 text-[0.6rem] font-medium text-amber-800">Manager not in roster</p>
      ) : null}
    </Link>
  );
}

function TreeBranch({ node }: { node: OrgTreeNode }) {
  return (
    <li>
      <EmployeeNodeCard node={node} />
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeBranch key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function OrgChart({
  employees,
  viewerEmail,
}: {
  employees: Employee[];
  viewerEmail: string;
}) {
  const [mode, setMode] = useState<OrgChartMode>("company");

  const companyTree = useMemo(() => buildOrgTree(employees), [employees]);
  const departmentTree = useMemo(
    () => buildDepartmentOrgTree(employees, viewerEmail),
    [employees, viewerEmail],
  );

  const active = mode === "company" ? companyTree : departmentTree;
  const { roots, stats } = active;
  const departmentLabel = mode === "department" ? departmentTree.departmentLabel : null;

  if (companyTree.stats.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-kastros-sand bg-kastros-cream/40 p-8 text-center">
        <Network className="mx-auto h-8 w-8 text-kastros-sage/60" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-kastros-forest">No employees yet</p>
        <p className="mt-1 text-xs text-kastros-sage">
          Add people in onboarding and set each employee&apos;s <strong>Reports to</strong> field to build the hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-xl border border-kastros-sand bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Organization chart view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "company"}
            onClick={() => setMode("company")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              mode === "company"
                ? "bg-kastros-forest text-white shadow-sm"
                : "text-kastros-sage hover:bg-kastros-cream/80 hover:text-kastros-forest"
            }`}
          >
            <Network className="h-3.5 w-3.5" aria-hidden />
            Company chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "department"}
            onClick={() => setMode("department")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              mode === "department"
                ? "bg-kastros-forest text-white shadow-sm"
                : "text-kastros-sage hover:bg-kastros-cream/80 hover:text-kastros-forest"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            My department
          </button>
        </div>
        <p className="text-xs text-kastros-sage">
          {mode === "company"
            ? "Full reporting hierarchy across the organization."
            : departmentLabel
              ? `People in ${departmentLabel} and reporting lines within your department.`
              : "Your department — peers and team members who report to you."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 px-4 py-3 text-sm text-kastros-sage">
        <span className="inline-flex items-center gap-1.5 font-medium text-kastros-forest">
          <Users className="h-4 w-4" aria-hidden />
          {stats.total} in {mode === "department" ? "department" : "tree"}
        </span>
        {mode === "department" && departmentLabel ? (
          <>
            <span className="text-kastros-sand">·</span>
            <span className="font-medium text-kastros-forest">{departmentLabel}</span>
          </>
        ) : null}
        <span className="text-kastros-sand">·</span>
        <span>
          {stats.rootCount} top-level role{stats.rootCount === 1 ? "" : "s"}
        </span>
        {stats.missingManagerCount > 0 ? (
          <>
            <span className="text-kastros-sand">·</span>
            <span className="inline-flex items-center gap-1 text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {stats.missingManagerCount} with manager outside this view
            </span>
          </>
        ) : null}
      </div>

      {mode === "department" && stats.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-kastros-sand bg-kastros-cream/40 p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-kastros-sage/60" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-kastros-forest">No colleagues in your department yet</p>
          <p className="mt-1 text-xs text-kastros-sage">
            Assign a department on employee profiles, or switch to <strong>Company chart</strong> for the full hierarchy.
          </p>
        </div>
      ) : (
        <>
          {stats.rootCount > 1 && mode === "company" ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-950">
              Multiple top-level roles are shown side by side. Set <strong>Reports to</strong> on each profile so everyone rolls up
              under one leader (e.g. Group CEO).
            </div>
          ) : null}

          {stats.rootCount > 1 && mode === "department" ? (
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-2.5 text-xs text-sky-950">
              Several people in this department report to managers outside the department — they appear as separate roots here.
            </div>
          ) : null}

          <OrgChartViewport resetKey={mode} exportFilename={mode === "department" ? "kastros-department-chart.png" : undefined}>
            {roots.map((root) => (
              <ul key={root.id}>
                <TreeBranch node={root} />
              </ul>
            ))}
          </OrgChartViewport>
        </>
      )}
    </div>
  );
}
