import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { FloatingHelpButton } from "@/components/help/FloatingHelpButton";
import { getSession } from "@/lib/auth";
import { navHrefsForRole } from "@/lib/route-access";
import { ROLE_LABELS } from "@/lib/roles";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedHrefs = navHrefsForRole(session.role);

  return (
    <div className="flex min-h-dvh bg-kastros-cream">
      <AppSidebar
        allowedHrefs={allowedHrefs}
        userEmail={session.email}
        userName={session.name}
        roleLabel={ROLE_LABELS[session.role]}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <FloatingHelpButton />
    </div>
  );
}
