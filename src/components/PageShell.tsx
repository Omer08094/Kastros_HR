import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

export async function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title={title} subtitle={subtitle} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
