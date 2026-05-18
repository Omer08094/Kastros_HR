import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { OrgChart } from "@/components/hr/OrgChart";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function OrgChartPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const store = await readStore();

  return (
    <PageShell title="Reporting channel" subtitle="Org chart derived from the “Reports to” field on each employee.">
      <Card title="Organization">
        <OrgChart employees={store.employees} />
      </Card>
    </PageShell>
  );
}
