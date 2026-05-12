"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NotificationBell } from "@/components/NotificationBell";
import type { HrNotificationItem } from "@/lib/hr-notifications";
import type { RoleId } from "@/lib/roles";
export function HeaderNotifications({ userEmail, role }: { userEmail: string; role: RoleId | null }) {
  const pathname = usePathname();
  const [items, setItems] = useState<HrNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/hr-notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: HrNotificationItem[] }) => {
        if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  if (!role) return null;
  return <NotificationBell items={items} userEmail={userEmail} loading={loading} />;
}
