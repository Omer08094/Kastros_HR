import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { TransferClient } from "@/components/hr/TransferClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { hasExecAccess } from "@/lib/roles";

export default async function TransferPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasExecAccess(session.role)) redirect("/access-denied?from=/transfer-posting");
  const store = await readStore();

  return (
    <PageShell title="Transfer / Posting" subtitle="Move employees across business units and departments.">
      <TransferClient transfers={store.transfers} employees={store.employees} />
    </PageShell>
  );
}
