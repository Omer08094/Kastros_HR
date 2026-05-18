"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

export type ActionResult = { ok: true } | { error: string };

export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(p: Promise<ActionResult>, successMsg?: string) {
    setError(null);
    setSuccess(null);
    start(async () => {
      const r = await p;
      if ("error" in r) {
        setError(r.error);
      } else {
        if (successMsg) setSuccess(successMsg);
        router.refresh();
      }
    });
  }

  return { pending, error, success, run, clearError: () => setError(null) };
}

export function StatusBanner({ error, success }: { error: string | null; success: string | null }) {
  if (!error && !success) return null;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
      {success}
    </div>
  );
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

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
