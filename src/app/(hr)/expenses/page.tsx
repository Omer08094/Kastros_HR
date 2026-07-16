import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ExpensesClient } from "@/components/hr/ExpensesClient";
import { getSession } from "@/lib/auth";
import { expensesEnabled } from "@/lib/feature-flags";
import { hasExecAccess } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!expensesEnabled()) redirect("/dashboard");

  const store = await readStore();

  return (
    <PageShell
      title="Expense claims"
      subtitle="Submit business expenses with receipts. HR approves claims; mark paid once reimbursed."
    >
      <ExpensesClient
        expenses={store.expenses}
        employees={store.employees}
        selfEmail={session.email}
        canManage={hasExecAccess(session.role)}
      />
    </PageShell>
  );
}
