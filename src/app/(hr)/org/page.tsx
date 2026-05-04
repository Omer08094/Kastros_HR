import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

export default async function OrgPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PageShell title="Organization" subtitle={`Structure reference · ${ROLE_LABELS[session.role]}`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card eyebrow="Structure" title="Trading & markets">
          <ul className="space-y-3 text-sm text-kastros-ink">
            <li className="rounded-xl border border-kastros-sand bg-kastros-cream/50 px-4 py-3">Chief Trading Officer</li>
            <li className="ml-4 rounded-xl border border-kastros-sand bg-white px-4 py-3">Regional desks (APAC · EU · Americas)</li>
            <li className="ml-8 rounded-xl border border-kastros-sand bg-white px-4 py-3">Analyst pods · Risk · Execution</li>
          </ul>
        </Card>
        <Card eyebrow="Structure" title="Operations & quality">
          <ul className="space-y-3 text-sm text-kastros-ink">
            <li className="rounded-xl border border-kastros-sand bg-kastros-cream/50 px-4 py-3">COO office</li>
            <li className="ml-4 rounded-xl border border-kastros-sand bg-white px-4 py-3">Logistics & fulfillment</li>
            <li className="ml-4 rounded-xl border border-kastros-sand bg-white px-4 py-3">QA, labs, and certifications</li>
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
