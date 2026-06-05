import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { RoleManagerClient } from "@/components/hr/RoleManagerClient";
import { getSession } from "@/lib/auth";
import { loadEmployeeAuthRoles } from "@/lib/firebase-auth-roles";
import { hasExecAccess } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";

export default async function UserRolesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasExecAccess(session.role)) redirect("/access-denied?from=/user-roles");

  const store = await readStore();
  const authRoles = await loadEmployeeAuthRoles(store.employees.map((e) => e.email));

  return (
    <PageShell
      title="User roles"
      subtitle="Assign Employee, HR Admin, or CEO access — changes apply after the user signs out and back in."
    >
      <Card eyebrow="HR Admin · Access control" title="Manage app roles">
        <p className="mb-4 text-sm text-kastros-sage">
          Each person must have signed in at least once so Firebase Auth knows their account. You cannot change your own role.
        </p>
        <RoleManagerClient employees={store.employees} authRoles={authRoles} />
      </Card>
    </PageShell>
  );
}
