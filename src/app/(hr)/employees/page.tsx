import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getSession } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees } from "@/lib/store/policy";

const EmployeesClient = dynamic(
  () => import("@/components/hr/EmployeesClient").then((m) => m.EmployeesClient),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-10 max-w-md rounded-xl bg-kastros-sand/80" />
        <div className="h-28 rounded-2xl bg-white ring-1 ring-kastros-sand/80" />
        <div className="h-52 rounded-2xl bg-white ring-1 ring-kastros-sand/80" />
      </div>
    ),
  },
);

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const rows = visibleEmployees(store, session);
  const canManage = hasExecAccess(session.role);

  return (
    <PageShell
      title="People"
      subtitle={
        canManage
          ? "Full directory control (HR Admin & CEO)"
          : "Your profile — directory visibility is limited for employees"
      }
    >
      <EmployeesClient
        employees={rows}
        canManage={canManage}
        documents={store.documents}
        academics={store.academics}
        policyAcknowledgements={store.policyAcknowledgements}
        policies={store.policies}
      />
    </PageShell>
  );
}
