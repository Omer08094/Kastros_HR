import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

const plans = [
  { name: "Health & medical", detail: "Global network · family coverage optional" },
  { name: "Life & disability", detail: "Core coverage employer-paid" },
  { name: "Retirement", detail: "Regional schemes with matching where eligible" },
];

export default async function BenefitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PageShell title="Benefits" subtitle={`Plans overview · ${ROLE_LABELS[session.role]}`}>
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name} eyebrow="Plan" title={p.name}>
            <p className="text-sm text-kastros-sage">{p.detail}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
