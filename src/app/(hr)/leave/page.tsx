import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { LeaveClient } from "@/components/hr/LeaveClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { visibleLeaveRequests } from "@/lib/store/policy";

export default async function LeavePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const requests = visibleLeaveRequests(store, session);
  const canCreate = session.role === "employee" || session.role === "manager" || session.role === "hr_admin";
  const canDecide = session.role === "manager" || session.role === "hr_admin";

  return (
    <PageShell
      title="Time off"
      subtitle="Request, review, and track balances — scoped to your role"
    >
      <LeaveClient requests={requests} session={session} canCreate={canCreate} canDecide={canDecide} />
    </PageShell>
  );
}
