import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PayrollClient } from "@/components/hr/PayrollClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function PayrollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  return (
    <PageShell title="Payroll" subtitle="HR Admin · CEO · payslips & ledger · Payroll specialists read-only">
      <PayrollClient
        snapshot={store.payroll}
        entries={store.payrollEntries}
        employees={store.employees}
        canManage={session.role === "hr_admin" || session.role === "ceo"}
        canViewSlips={session.role === "hr_admin" || session.role === "ceo" || session.role === "payroll"}
      />
    </PageShell>
  );
}
