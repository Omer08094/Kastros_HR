"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type ToastItem = {
  id: string;
  message: string;
  detail?: string;
  variant: "success" | "error";
};

export function useToasts(autoDismissMs = 6000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: "success" | "error", detail?: string) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((list) => [...list, { id, message, detail, variant }]);
      if (autoDismissMs > 0) {
        window.setTimeout(() => dismiss(id), autoDismissMs);
      }
      return id;
    },
    [autoDismissMs, dismiss],
  );

  return { toasts, push, dismiss };
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isSuccess = toast.variant === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border px-4 py-3 shadow-lg ring-1 backdrop-blur-sm ${
        isSuccess
          ? "border-emerald-200/90 bg-white/95 text-kastros-ink ring-emerald-100"
          : "border-red-200/90 bg-white/95 text-kastros-ink ring-red-100"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-kastros-brandGreen" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-kastros-forest">{toast.message}</p>
        {toast.detail ? <p className="mt-1 text-xs leading-relaxed text-kastros-sage">{toast.detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-kastros-sage hover:bg-kastros-cream hover:text-kastros-ink"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:right-6 sm:top-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
