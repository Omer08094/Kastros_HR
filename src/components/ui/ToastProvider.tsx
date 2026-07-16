"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";

type ToastApi = {
  success: (message: string, detail?: string) => string;
  error: (message: string, detail?: string) => string;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({
  children,
  autoDismissMs = 6000,
}: {
  children: ReactNode;
  autoDismissMs?: number;
}) {
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

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, detail) => push(message, "success", detail),
      error: (message, detail) => push(message, "error", detail),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
