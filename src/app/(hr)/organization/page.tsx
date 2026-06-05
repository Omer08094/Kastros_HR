import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { OrganizationClient } from "@/components/hr/OrganizationClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { hasExecAccess } from "@/lib/roles";

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasExecAccess(session.role)) redirect("/access-denied?from=/organization");
  const store = await readStore();

  return (
    <PageShell title="Organization setup" subtitle="Business units, departments, and job descriptions.">
      <OrganizationClient
        businessUnits={store.businessUnits}
        departments={store.departments}
        subDepartments={store.subDepartments}
        jobDescriptions={store.jobDescriptions}
        employees={store.employees}
      />
    </PageShell>
  );
}
