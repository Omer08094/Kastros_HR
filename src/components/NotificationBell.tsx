"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HrNotificationItem, HrNotificationKind } from "@/lib/hr-notifications";

const STORAGE_PREFIX = "kastros-hr-notification-seen:";

function readSeen(email: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + email);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(email: string, ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + email, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / privacy mode */
  }
}

const STRIPE: Record<HrNotificationKind, string> = {
  approval: "bg-kastros-gold",
  recruiting: "bg-violet-500",
  learning: "bg-sky-500",
  policy: "bg-amber-600",
  people: "bg-teal-600",
  payroll: "bg-emerald-600",
  compliance: "bg-rose-500",
  team: "bg-indigo-500",
};

export function NotificationBell({
  items,
  userEmail,
  loading = false,
}: {
  items: HrNotificationItem[];
  userEmail: string;
  loading?: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSeen(readSeen(userEmail));
    setHydrated(true);
  }, [userEmail]);

  const unseenCount = useMemo(() => items.filter((i) => !seen.has(i.id)).length, [items, seen]);

  const mergeSeenWhenOpen = (open: boolean) => {
    if (!open || items.length === 0) return;
    setSeen((prev) => {
      const next = new Set(prev);
      for (const i of items) next.add(i.id);
      writeSeen(userEmail, next);
      return next;
    });
  };

  const formatWhen = (at: string) => {
    const d = new Date(at);
    if (Number.isNaN(d.valueOf())) return "";
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) return `Today · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <details className="relative inline-block" onToggle={(e) => mergeSeenWhenOpen((e.target as HTMLDetailsElement).open)}>
      <summary
        className={`relative flex cursor-pointer list-none items-center justify-center rounded-xl border border-kastros-sand bg-white p-2.5 text-kastros-sage shadow-sm marker:hidden transition hover:border-kastros-mist hover:text-kastros-forest [&::-webkit-details-marker]:hidden ${loading ? "opacity-75" : ""}`}
      >
        <Bell className={`h-4 w-4 shrink-0 ${loading ? "animate-pulse" : ""}`} aria-hidden />
        <span className="sr-only">Notifications</span>
        {hydrated && unseenCount > 0 ? (
          <span
            aria-hidden
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-kastros-gold ring-2 ring-white"
          />
        ) : null}
      </summary>
      <div
        role="presentation"
        className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-kastros-sand bg-white text-sm shadow-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-kastros-sand px-4 py-3">
          <div>
            <div className="font-semibold text-kastros-forest">Notifications</div>
            <div className="text-xs text-kastros-sage">Role-aware alerts from live demo data</div>
          </div>
          {items.length > 0 && hydrated ? (
            <span className="tabular-nums text-xs font-medium text-kastros-sage">
              {items.length}
            </span>
          ) : null}
        </div>
        <ul className="max-h-[min(24rem,calc(100dvh-8rem))] overflow-y-auto p-2">
          {loading && items.length === 0 ? (
            <li className="rounded-lg px-3 py-10 text-center text-kastros-sage">Loading notifications…</li>
          ) : items.length === 0 ? (
            <li className="rounded-lg px-3 py-10 text-center text-kastros-sage">You&apos;re all caught up.</li>
          ) : (
            items.map((n) => (
              <li key={n.id} className={hydrated && !seen.has(n.id) ? "bg-kastros-cream/60" : ""}>
                <Link
                  href={n.href}
                  className="flex gap-2 rounded-lg px-2 py-2.5 text-left transition hover:bg-kastros-cream"
                  onClick={() => {
                    setSeen((prev) => {
                      const next = new Set(prev).add(n.id);
                      writeSeen(userEmail, next);
                      return next;
                    });
                  }}
                >
                  <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${STRIPE[n.kind]}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug text-kastros-ink">{n.title}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-kastros-sage">
                        {formatWhen(n.at)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-kastros-sage">{n.detail}</span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </details>
  );
}
