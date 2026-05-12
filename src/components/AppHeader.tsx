import { ChevronDown } from "lucide-react";
import { headers } from "next/headers";
import { signOut } from "@/app/(hr)/actions";
import { HeaderNotifications } from "@/components/HeaderNotifications";
import { ROLE_LABELS } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";

export async function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const h = await headers();
  const user = h.get("x-kastros-user") ?? "Team member";
  const name = h.get("x-kastros-name") ?? user;
  const roleRaw = h.get("x-kastros-role") ?? "";
  const role = isRoleId(roleRaw) ? roleRaw : null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-kastros-sand bg-kastros-cream/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight text-kastros-forest">{title}</h1>
        {subtitle ? <p className="truncate text-sm text-kastros-sage">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {role ? (
          <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-kastros-forest ring-1 ring-kastros-sand sm:inline">
            {ROLE_LABELS[role as RoleId]}
          </span>
        ) : null}
        <HeaderNotifications userEmail={user} role={role} />
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-kastros-sand bg-white py-1.5 pl-3 pr-2 text-sm shadow-sm marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="hidden max-w-[10rem] truncate text-kastros-ink sm:inline">{name}</span>
            <span className="sm:hidden text-kastros-ink">Account</span>
            <ChevronDown className="h-4 w-4 text-kastros-sage" aria-hidden />
          </summary>
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-kastros-sand bg-white py-1 text-sm shadow-card">
            <div className="border-b border-kastros-sand px-3 py-2 text-xs text-kastros-sage">Signed in as</div>
            <div className="truncate px-3 py-2 text-kastros-ink">{name}</div>
            <div className="truncate px-3 pb-2 text-xs text-kastros-sage">{user}</div>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full px-3 py-2 text-left text-kastros-forest transition hover:bg-kastros-cream"
              >
                Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
