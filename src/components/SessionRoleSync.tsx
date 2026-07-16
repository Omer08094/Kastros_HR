"use client";

import { useEffect, useRef } from "react";

/** Pick up Firebase role changes without requiring a manual sign-out. */
export function SessionRoleSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    fetch("/api/auth/sync-role", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { updated?: boolean } | null) => {
        if (data?.updated) {
          window.location.reload();
        }
      })
      .catch(() => {
        /* ignore — session sync is best-effort */
      });
  }, []);

  return null;
}
