"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { BRAND_FAVICON_SQUARE } from "@/lib/brand-assets";
import { NAV_GROUPS } from "@/lib/nav";

export const AppSidebar = memo(function AppSidebar({
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
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => allowed.has(n.href)),
  })).filter((g) => g.items.length > 0);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));
  }

  const sidebar = (
    <aside className="flex w-64 shrink-0 flex-col border-r border-kastros-sand bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-2 border-b border-kastros-sand px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-kastros-cream ring-1 ring-kastros-sand">
          <img src={BRAND_FAVICON_SQUARE} alt="" width={36} height={36} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-kastros-forest">Kastros HR</p>
          <p className="truncate text-[0.65rem] uppercase tracking-wider text-kastros-sage">{roleLabel}</p>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1 text-kastros-sage hover:bg-kastros-cream/70 lg:hidden"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="border-b border-kastros-sand px-4 py-3 text-xs text-kastros-sage">
        <p className="truncate font-medium text-kastros-forest">{userName}</p>
        <p className="truncate">{userEmail}</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Primary">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kastros-sage transition hover:text-kastros-forest"
              >
                <span>{group.label}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" aria-hidden />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                )}
              </button>
              {isCollapsed
                ? null
                : group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? "bg-kastros-cream text-kastros-forest ring-1 ring-kastros-brandGreen/30"
                            : "text-kastros-sage hover:bg-kastros-cream/70 hover:text-kastros-forest"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${active ? "text-kastros-brandGreen" : "text-kastros-sage group-hover:text-kastros-forest"}`}
                          aria-hidden
                        />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
            </div>
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

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-30 inline-flex items-center justify-center rounded-lg border border-kastros-sand bg-white p-2 shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-kastros-forest" aria-hidden />
      </button>

      {/* Desktop persistent */}
      <div className="hidden lg:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex">{sidebar}</div>
        </div>
      ) : null}
    </>
  );
});
