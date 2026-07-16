"use client";

import { ToastProvider } from "@/components/ui/ToastProvider";

export function AppToaster({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
