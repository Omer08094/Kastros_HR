"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/nav";

export function AppSidebar({
  allowedHrefs,
  userEmail,
  userName,
  roleLabel,
}: {
  allowedHrefs: string[];
  userEmail: string;
  userName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const allowed = new Set(allowedHrefs);
  const items = mainNav.filter((n) => allowed.has(n.href));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-kastros-sand bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-2 border-b border-kastros-sand px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kastros-forest text-sm font-semibold text-kastros-gold">
          K
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-kastros-forest">Kastros HR</p>
          <p className="truncate text-[0.65rem] uppercase tracking-wider text-kastros-sage">{roleLabel}</p>
        </div>
      </div>
      <div className="border-b border-kastros-sand px-4 py-3 text-xs text-kastros-sage">
        <p className="truncate font-medium text-kastros-forest">{userName}</p>
        <p className="truncate">{userEmail}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Primary">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-kastros-cream text-kastros-forest ring-1 ring-kastros-gold/25"
                  : "text-kastros-sage hover:bg-kastros-cream/70 hover:text-kastros-forest"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-kastros-gold" : "text-kastros-sage group-hover:text-kastros-forest"}`}
                aria-hidden
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-kastros-sand p-4 text-[0.65rem] leading-relaxed text-kastros-sage">
        Values: empathy, accountability, initiative, collaboration, integrity — as on{" "}
        <a className="text-kastros-forest underline-offset-2 hover:underline" href="https://www.kastros.co" target="_blank" rel="noreferrer">
          kastros.co
        </a>
        .
      </div>
    </aside>
  );
}
