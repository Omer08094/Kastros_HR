"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/ToastProvider";
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
  const toast = useToast();
  const [pending, start] = useTransition();

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
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              try {
                const err = await runAction(resetDemoData(), () => router.refresh());
                if (err) toast.error(err);
                else toast.success("Demo dataset reset to seed values.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
              }
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
