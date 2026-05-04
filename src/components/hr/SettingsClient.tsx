"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetDemoData } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function SettingsClient({ canReset }: { canReset: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!canReset) {
    return (
      <p className="text-sm text-kastros-sage">
        Settings mutations are limited to HR admins in this demo. Sign in as <span className="font-mono">amelia.hr@kastros.demo</span>{" "}
        or <span className="font-mono">demo@kastros.co</span>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {info}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setInfo(null);
            start(async () => {
              const err = await runAction(resetDemoData(), () => router.refresh());
              if (err) setError(err);
              else setInfo("Demo dataset reset to seed values.");
            });
          }}
          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Resetting…" : "Reset demo data"}
        </button>
        <p className="mt-2 text-xs text-kastros-sage">Clears local JSON under /data and restores the starter employees, jobs, and requests.</p>
      </div>
    </div>
  );
}
