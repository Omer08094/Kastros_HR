import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { LeaveClient } from "@/components/hr/LeaveClient";
import { getSession } from "@/lib/auth";
import { buildLeaveBalanceRows } from "@/lib/leave-policy";
import { readStore } from "@/lib/store/persist";
import { visibleLeaveRequests } from "@/lib/store/policy";
import { hasExecAccess } from "@/lib/roles";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const requests = visibleLeaveRequests(store, session);
  const canCreate = session.role === "employee" || session.role === "hr_admin" || session.role === "ceo";
  const canManageEntitlements = hasExecAccess(session.role);
  const year = new Date().getFullYear();
  const balanceRows = buildLeaveBalanceRows(store, session.email, year);

  return (
    <PageShell
      title="Time off"
      subtitle="View balances, request leave, and (HR) manage per-employee entitlements. Configure leave types under Settings."
    >
      <LeaveClient
        requests={requests}
        session={session}
        canCreate={canCreate}
        canManageEntitlements={canManageEntitlements}
        categories={store.leaveCategories}
        balanceRows={balanceRows}
        year={year}
        employees={store.employees}
        storeSlice={{
          leaveCategories: store.leaveCategories,
          employeeLeaveAllocations: store.employeeLeaveAllocations,
          leaveRequests: store.leaveRequests,
        }}
      />
    </PageShell>
  );
}
