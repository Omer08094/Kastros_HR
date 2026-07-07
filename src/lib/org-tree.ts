import type { Employee } from "@/lib/store/types";
import { formatEmployeeDepartment } from "@/lib/executive-org";

export type OrgTreeNode = Employee & {
  children: OrgTreeNode[];
  /** Manager email is set but not found in the roster. */
  managerMissing: boolean;
};

export type OrgTreeStats = {
  total: number;
  rootCount: number;
  missingManagerCount: number;
};

export type OrgTreeResult = {
  roots: OrgTreeNode[];
  stats: OrgTreeStats;
};

function compareSiblings(a: OrgTreeNode, b: OrgTreeNode): number {
  const rank = (n: OrgTreeNode) => {
    const t = n.title.toLowerCase();
    if (/\bceo\b|chief executive/.test(t)) return 0;
    if (/\bchief\b|\bc[efo]o\b/.test(t)) return 1;
    if (/director|head of|vp |vice president/.test(t)) return 2;
    if (/manager|lead/.test(t)) return 3;
    return 4;
  };
  const dr = rank(a) - rank(b);
  if (dr !== 0) return dr;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function sortTree(nodes: OrgTreeNode[]) {
  nodes.sort(compareSiblings);
  for (const n of nodes) sortTree(n.children);
}

/** Build a reporting hierarchy from each employee's `reportsToEmail`. */
export function buildOrgTree(employees: Employee[]): OrgTreeResult {
  const roster = employees.filter((e) => e.status !== "Separated");
  const map = new Map<string, OrgTreeNode>();
  for (const e of roster) {
    map.set(e.email.toLowerCase(), { ...e, children: [], managerMissing: false });
  }

  const parentOf = new Map<string, string>();
  let missingManagerCount = 0;

  for (const e of roster) {
    const childKey = e.email.toLowerCase();
    const parentKey = e.reportsToEmail?.toLowerCase().trim();
    if (!parentKey || parentKey === childKey) continue;
    if (!map.has(parentKey)) {
      missingManagerCount += 1;
      map.get(childKey)!.managerMissing = true;
      continue;
    }
    parentOf.set(childKey, parentKey);
  }

  // Drop parent links that would create a cycle.
  for (const [childKey, parentKey] of [...parentOf.entries()]) {
    const seen = new Set<string>([childKey]);
    let cur: string | undefined = parentKey;
    let cycle = false;
    while (cur) {
      if (seen.has(cur)) {
        cycle = true;
        break;
      }
      seen.add(cur);
      cur = parentOf.get(cur);
    }
    if (cycle) parentOf.delete(childKey);
  }

  const roots: OrgTreeNode[] = [];

  for (const node of map.values()) {
    const parentKey = parentOf.get(node.email.toLowerCase());
    if (parentKey) map.get(parentKey)!.children.push(node);
  }

  for (const node of map.values()) {
    if (!parentOf.has(node.email.toLowerCase())) roots.push(node);
  }

  sortTree(roots);

  return {
    roots,
    stats: {
      total: roster.length,
      rootCount: roots.length,
      missingManagerCount,
    },
  };
}

function departmentKey(employee: { department: string; reportsToEmail: string | null }): string {
  return formatEmployeeDepartment(employee).toLowerCase();
}

/**
 * Employees in the viewer's department: same functional department label, plus anyone who
 * reports to the viewer (direct/indirect) when that person is also in that department.
 */
export function filterEmployeesForDepartmentView(employees: Employee[], viewerEmail: string): {
  filtered: Employee[];
  departmentLabel: string | null;
} {
  const roster = employees.filter((e) => e.status !== "Separated");
  const viewer = roster.find((e) => e.email.toLowerCase() === viewerEmail.trim().toLowerCase());
  if (!viewer) {
    return { filtered: [], departmentLabel: null };
  }

  const viewerDept = departmentKey(viewer);
  const departmentLabel = formatEmployeeDepartment(viewer);

  const inDept = roster.filter((e) => departmentKey(e) === viewerDept);

  return { filtered: inDept, departmentLabel };
}

/** Org tree limited to the viewer's department (peers + reporting lines within that department). */
export function buildDepartmentOrgTree(employees: Employee[], viewerEmail: string): OrgTreeResult & {
  departmentLabel: string | null;
} {
  const { filtered, departmentLabel } = filterEmployeesForDepartmentView(employees, viewerEmail);
  const result = buildOrgTree(filtered);
  return { ...result, departmentLabel };
}
