import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const audit = store.audit;

  return (
    <PageShell title="Security" subtitle="Live audit trail from demo mutations + platform posture">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card eyebrow="Posture" title="Platform controls">
          <ul className="space-y-3 text-sm text-kastros-ink">
            <li className="flex gap-2">
              <span className="text-kastros-brandGreen" aria-hidden>
                ●
              </span>
              HTTP-only, SameSite=Strict session cookie (signed JWT)
            </li>
            <li className="flex gap-2">
              <span className="text-kastros-brandGreen" aria-hidden>
                ●
              </span>
              RBAC enforced in middleware + server actions
            </li>
            <li className="flex gap-2">
              <span className="text-kastros-brandGreen" aria-hidden>
                ●
              </span>
              Security headers (HSTS, CSP, XFO DENY, nosniff)
            </li>
            <li className="flex gap-2">
              <span className="text-kastros-mist" aria-hidden>
                ●
              </span>
              Add MFA / SSO at your gateway for production
            </li>
          </ul>
        </Card>
        <Card className="lg:col-span-2" eyebrow="Audit trail" title="Recent events">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-4 font-medium">Timestamp (UTC)</th>
                  <th className="pb-3 pr-4 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {audit.map((row) => (
                  <tr key={row.at + row.action + row.actor} className="text-kastros-ink">
                    <td className="py-3 pr-4 font-mono text-xs text-kastros-sage">{row.at}</td>
                    <td className="py-3 pr-4 text-sm">{row.actor}</td>
                    <td className="py-3 text-sm">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
