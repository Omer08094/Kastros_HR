import { Suspense } from "react";
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
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            <div className="h-28 rounded-2xl bg-white ring-1 ring-kastros-sand/80" />
            <div className="h-52 rounded-2xl bg-white ring-1 ring-kastros-sand/80" />
          </div>
        }
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
      </Suspense>
    </PageShell>
  );
}
