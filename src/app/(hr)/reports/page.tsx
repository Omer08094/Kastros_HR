import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

function bucket(title: string): "Trading" | "Operations" | "G&A" | "Technology" {
  const t = title.toLowerCase();
  if (t.includes("trade") || t.includes("risk") || t.includes("commodity") || t.includes("finance")) return "Trading";
  if (t.includes("logistics") || t.includes("operations") || t.includes("quality") || t.includes("payroll")) return "Operations";
  if (t.includes("security") || t.includes("people") || t.includes("talent") || t.includes("chief")) return "G&A";
  return "Technology";
}

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const counts = { Trading: 0, Operations: 0, "G&A": 0, Technology: 0 } as Record<string, number>;
  for (const e of store.employees) {
    counts[bucket(e.title)] += 1;
  }
  const total = store.employees.length || 1;
  const bars = (Object.keys(counts) as Array<keyof typeof counts>).map((label) => ({
    label,
    pct: Math.round((counts[label] / total) * 100),
  }));

  return (
    <PageShell title="Reports" subtitle="Headcount composition derived from job titles in the demo store">
      <Card eyebrow="Composition" title="Approximate function mix">
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
