import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PayrollClient } from "@/components/hr/PayrollClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function PayrollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const canEdit = session.role === "hr_admin" || session.role === "payroll";

  return (
    <PageShell title="Payroll" subtitle="Base salary + multi-allowance + hours x rate payroll formula">
      <PayrollClient snapshot={store.payroll} entries={store.payrollEntries} employees={store.employees} canEdit={canEdit} />
    </PageShell>
  );
}
