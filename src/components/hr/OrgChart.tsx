"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Users, AlertTriangle, Network } from "lucide-react";
import { OrgChartViewport } from "@/components/hr/OrgChartViewport";
import { formatEmployeeDepartment } from "@/lib/executive-org";
import { buildOrgTree, type OrgTreeNode } from "@/lib/org-tree";
import type { Employee } from "@/lib/store/types";

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

export function OrgChart({ employees }: { employees: Employee[] }) {
  const { roots, stats } = useMemo(() => buildOrgTree(employees), [employees]);

  if (stats.total === 0) {
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
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-kastros-sand/80 bg-kastros-cream/30 px-4 py-3 text-sm text-kastros-sage">
        <span className="inline-flex items-center gap-1.5 font-medium text-kastros-forest">
          <Users className="h-4 w-4" aria-hidden />
          {stats.total} in tree
        </span>
        <span className="text-kastros-sand">·</span>
        <span>
          {stats.rootCount} top-level role{stats.rootCount === 1 ? "" : "s"}
        </span>
        {stats.missingManagerCount > 0 ? (
          <>
            <span className="text-kastros-sand">·</span>
            <span className="inline-flex items-center gap-1 text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {stats.missingManagerCount} with manager not in roster
            </span>
          </>
        ) : null}
      </div>

      {stats.rootCount > 1 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-950">
          Multiple top-level roles are shown side by side. Set <strong>Reports to</strong> on each profile so everyone rolls up under one
          leader (e.g. Group CEO).
        </div>
      ) : null}

      <OrgChartViewport>
        {roots.map((root) => (
          <ul key={root.id}>
            <TreeBranch node={root} />
          </ul>
        ))}
      </OrgChartViewport>
    </div>
  );
}
