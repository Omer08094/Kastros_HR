import type { Employee } from "@/lib/store/types";

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
