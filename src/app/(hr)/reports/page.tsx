import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

const DEPARTMENT_KEYS = ["HR", "Execution & Operations", "Traders", "Finance"] as const;
type ReportDept = (typeof DEPARTMENT_KEYS)[number];

/** Maps stored `department` strings into the four report departments. */
function departmentBucket(department: string): ReportDept {
  const d = department.trim().toLowerCase();
  if (d === "hr" || d.startsWith("hr ") || d.includes("human resource")) return "HR";
  if (d.includes("finance") || d.includes("accounting") || d.includes("treasury")) return "Finance";
  if (d.includes("trader") || d.includes("trading") || d.includes("merchandis")) return "Traders";
  return "Execution & Operations";
}

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const counts = { HR: 0, "Execution & Operations": 0, Traders: 0, Finance: 0 } satisfies Record<ReportDept, number>;
  for (const e of store.employees) {
    counts[departmentBucket(e.department)] += 1;
  }
  const total = store.employees.length || 1;
  const bars = DEPARTMENT_KEYS.map((label) => ({
    label,
    pct: Math.round((counts[label] / total) * 100),
  }));

  return (
    <PageShell title="Reports" subtitle="Headcount by department (HR, Execution & Operations, Traders, Finance)">
      <Card eyebrow="Composition" title="Department mix">
        <div className="space-y-4">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-kastros-forest">{b.label}</span>
                <span className="tabular-nums text-kastros-sage">{b.pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-kastros-sand">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-kastros-forest to-kastros-sage"
                  style={{ width: `${b.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-kastros-sage">
          Replace this heuristic with warehouse-backed metrics and row-level security for production.
        </p>
      </Card>
    </PageShell>
  );
}
