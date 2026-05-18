import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PerformanceClient } from "@/components/hr/PerformanceClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const reviews =
    session.role === "hr_admin" || session.role === "ceo"
      ? store.reviews
      : store.reviews.filter((r) => r.employeeEmail.toLowerCase() === session.email.toLowerCase());

  return (
    <PageShell title="Performance" subtitle="Formal reviews recorded by HR Admin and CEO">
      <PerformanceClient reviews={reviews} session={session} />
    </PageShell>
  );
}
