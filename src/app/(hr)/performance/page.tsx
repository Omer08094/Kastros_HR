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
  const reviews =
    session.role === "hr_admin"
      ? store.reviews
      : session.role === "manager"
        ? store.reviews.filter((r) => r.managerEmail.toLowerCase() === session.email.toLowerCase())
        : store.reviews.filter((r) => r.employeeEmail.toLowerCase() === session.email.toLowerCase());
  const teamEmails =
    session.role === "manager"
      ? store.employees
          .filter((e) => e.reportsToEmail?.toLowerCase() === session.email.toLowerCase())
          .map((e) => e.email)
      : [];

  return (
    <PageShell title="Performance" subtitle="Managers own grading; HR manages framework and calibration">
      <PerformanceClient goals={goals} reviews={reviews} session={session} teamEmails={teamEmails} />
    </PageShell>
  );
}
