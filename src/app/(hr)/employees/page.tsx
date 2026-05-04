import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { EmployeesClient } from "@/components/hr/EmployeesClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees } from "@/lib/store/policy";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const rows = visibleEmployees(store, session);
  const canManage = session.role === "hr_admin";

  return (
    <PageShell
      title="People"
      subtitle={
        canManage
          ? "Full directory control (HR admin)"
          : session.role === "manager"
            ? "Your team and your own profile"
            : "Directory visibility for your role"
      }
    >
      <EmployeesClient employees={rows} canManage={canManage} />
    </PageShell>
  );
}
