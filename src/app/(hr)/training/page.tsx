import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { TrainingClient } from "@/components/hr/TrainingClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { visibleTraining } from "@/lib/store/policy";

export default async function TrainingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const rows = visibleTraining(store, session);
  const canAssign = session.role === "hr_admin";

  return (
    <PageShell title="Learning" subtitle="Degrees, certifications, internal/external training, PPTX logs, and attendance">
      <TrainingClient rows={rows} academics={store.academics} employees={store.employees} canAssign={canAssign} />
    </PageShell>
  );
}
