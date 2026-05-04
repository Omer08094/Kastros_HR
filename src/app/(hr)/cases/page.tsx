import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CasesClient } from "@/components/hr/CasesClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function CasesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const canManage = session.role === "hr_admin";

  return (
    <PageShell title="HR cases" subtitle="Employee relations queue — HR admins can mutate; managers can review">
      <CasesClient cases={store.cases} canManage={canManage} />
    </PageShell>
  );
}
