import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { OrgChart } from "@/components/hr/OrgChart";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function OrgChartPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const store = await readStore();

  return (
    <PageShell
      title="Organization chart"
      subtitle="Reporting hierarchy built from each employee’s Reports to field — top-down tree with direct reports nested below."
    >
      <OrgChart employees={store.employees} />
    </PageShell>
  );
}
