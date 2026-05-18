import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { LeavePolicySettings } from "@/components/hr/LeavePolicySettings";
import { SettingsClient } from "@/components/hr/SettingsClient";
import { readStore } from "@/lib/store/persist";
import { getSession } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canReset = hasExecAccess(session.role);
  const store = await readStore();

  return (
    <PageShell title="Settings" subtitle="Company profile and dangerous operations (demo)">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card eyebrow="Company" title="Kastros profile">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Legal name</dt>
              <dd className="text-right font-medium text-kastros-forest">Kastros</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Default locale</dt>
              <dd className="text-right font-medium text-kastros-forest">English (UK)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-kastros-sage">Data residency</dt>
              <dd className="text-right font-medium text-kastros-forest">Local JSON (demo)</dd>
            </div>
          </dl>
        </Card>
        <Card eyebrow="Secrets" title="Environment configuration">
          <ul className="space-y-2 text-sm text-kastros-sage">
            <li>
              <code className="rounded bg-kastros-cream px-1.5 py-0.5 text-xs text-kastros-ink">KASTROS_SESSION_SECRET</code> — 32+
              chars for JWT signing.
            </li>
            <li>
              <code className="rounded bg-kastros-cream px-1.5 py-0.5 text-xs text-kastros-ink">KASTROS_HR_EMAIL</code> /{" "}
              <code className="rounded bg-kastros-cream px-1.5 py-0.5 text-xs text-kastros-ink">KASTROS_HR_PASSWORD</code> /{" "}
              <code className="rounded bg-kastros-cream px-1.5 py-0.5 text-xs text-kastros-ink">KASTROS_HR_ROLE</code> — optional
              production bootstrap user.
            </li>
            <li>
              <code className="rounded bg-kastros-cream px-1.5 py-0.5 text-xs text-kastros-ink">KASTROS_DEMO_USERS=true</code> — allow
              bundled demo accounts when a bootstrap user is configured.
            </li>
          </ul>
        </Card>
      </div>

      {canReset ? (
        <Card className="mt-5" eyebrow="HR admin" title="Leave policy">
          <LeavePolicySettings categories={store.leaveCategories} />
        </Card>
      ) : null}

      <Card className="mt-5" eyebrow="Danger zone" title="Demo dataset">
        <SettingsClient canReset={canReset} />
      </Card>
    </PageShell>
  );
}
