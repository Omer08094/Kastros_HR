"use client";

import type { Employee } from "@/lib/store/types";

type Node = Employee & { children: Node[] };

function buildTree(employees: Employee[]): Node[] {
  const map = new Map<string, Node>();
  for (const e of employees) {
    map.set(e.email.toLowerCase(), { ...e, children: [] });
  }
  const roots: Node[] = [];
  for (const node of map.values()) {
    const parentEmail = node.reportsToEmail?.toLowerCase();
    if (parentEmail && map.has(parentEmail) && parentEmail !== node.email.toLowerCase()) {
      map.get(parentEmail)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  /** Sort: title alphabetically then name. */
  function sortRec(nodes: Node[]) {
    nodes.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
    for (const n of nodes) sortRec(n.children);
  }
  sortRec(roots);
  return roots;
}

function NodeCard({ node }: { node: Node }) {
  return (
    <li className="space-y-2">
      <div className="inline-block rounded-2xl border border-kastros-sand bg-white p-3 shadow-sm">
        <p className="text-sm font-semibold text-kastros-forest">{node.name}</p>
        <p className="text-xs text-kastros-sage">{node.title}</p>
        <p className="text-[0.6rem] uppercase tracking-wide text-kastros-sage">
          {node.businessUnit ?? "—"} · {node.department}
        </p>
      </div>
      {node.children.length > 0 ? (
        <ul className="ml-6 space-y-2 border-l border-dashed border-kastros-sand pl-4">
          {node.children.map((c) => (
            <NodeCard key={c.email} node={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function OrgChart({ employees }: { employees: Employee[] }) {
  const tree = buildTree(employees);
  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-kastros-sand bg-kastros-cream/40 p-8 text-center">
        <p className="text-sm font-semibold text-kastros-forest">No employees yet</p>
        <p className="mt-1 text-xs text-kastros-sage">Add employees in onboarding to populate the reporting channel.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {tree.map((n) => (
        <NodeCard key={n.email} node={n} />
      ))}
    </ul>
  );
}
