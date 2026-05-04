import Link from "next/link";
import { headers } from "next/headers";
import { PageShell } from "@/components/PageShell";
import { ROLE_LABELS } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";
import { navHrefsForRole } from "@/lib/route-access";

type Props = { searchParams: Promise<{ from?: string }> };

export default async function AccessDeniedPage({ searchParams }: Props) {
  const h = await headers();
  const roleRaw = h.get("x-kastros-role") ?? "";
  const role = isRoleId(roleRaw) ? roleRaw : null;
  const sp = await searchParams;
  const from = sp.from ?? "";

  return (
    <PageShell title="Access denied" subtitle="Your current role cannot open that area.">
      <div className="max-w-xl rounded-2xl border border-kastros-sand bg-white p-6 shadow-sm">
        <p className="text-sm text-kastros-sage">
          Kastros HR uses role-based navigation and server-side checks. Switch demo accounts on the login page to exercise
          a different persona.
        </p>
        {role ? (
          <p className="mt-4 text-sm text-kastros-ink">
            You are signed in as <span className="font-semibold">{ROLE_LABELS[role as RoleId]}</span>.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-kastros-pine"
          >
            Go to overview
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-kastros-sand bg-white px-4 py-2.5 text-sm font-semibold text-kastros-forest hover:bg-kastros-cream"
          >
            Switch account
          </Link>
        </div>
        {role ? (
          <div className="mt-8 border-t border-kastros-sand pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-kastros-sage">Your navigation</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs text-kastros-forest">
              {navHrefsForRole(role).map((href) => (
                <li key={href}>
                  <Link className="rounded-md bg-kastros-cream px-2 py-1 ring-1 ring-kastros-sand hover:underline" href={href}>
                    {href}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {from ? (
        <p className="mt-4 text-xs text-kastros-sage">
          Blocked path: <code className="rounded bg-kastros-cream px-1 py-0.5">{from}</code>
        </p>
      ) : null}
    </PageShell>
  );
}
