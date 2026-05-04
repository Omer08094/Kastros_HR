import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PerformanceClient } from "@/components/hr/PerformanceClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { visibleGoals } from "@/lib/store/policy";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const goals = visibleGoals(store, session);
  const teamEmails =
    session.role === "manager"
      ? store.employees
          .filter((e) => e.reportsToEmail?.toLowerCase() === session.email.toLowerCase())
          .map((e) => e.email)
      : [];

  return (
    <PageShell title="Performance" subtitle="Goals with owner-aware permissions">
      <PerformanceClient goals={goals} session={session} teamEmails={teamEmails} />
    </PageShell>
  );
}
