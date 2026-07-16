"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export type ActionResult = { ok: true } | { error: string };

export function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function run(p: Promise<ActionResult>, successMsg?: string) {
    start(async () => {
      try {
        const r = await p;
        if ("error" in r) {
          toast.error(r.error);
        } else {
          toast.success(successMsg ?? "Saved successfully");
          router.refresh();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  return { pending, run };
}

export function PrimaryButton({
  pending,
  children,
  className = "",
}: {
  pending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-kastros-forest/90 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  pending,
  children,
  className = "",
}: {
  pending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-kastros-cream px-2.5 py-1 text-xs font-semibold ring-1 ring-kastros-sand transition hover:bg-kastros-cream/70 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-kastros-sand bg-kastros-cream/40 p-8 text-center">
      {icon ? <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-kastros-sand">{icon}</div> : null}
      <p className="text-sm font-semibold text-kastros-forest">{title}</p>
      {description ? <p className="mt-1 text-xs text-kastros-sage">{description}</p> : null}
    </div>
  );
}

export { formatCurrency } from "@/lib/salary-format";
