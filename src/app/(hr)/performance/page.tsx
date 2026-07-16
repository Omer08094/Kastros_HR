import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PmdfClient } from "@/components/hr/PmdfClient";
import { getSession } from "@/lib/auth";
import { visiblePmdfForms } from "@/lib/pmdf-access";
import { readStore } from "@/lib/store/persist";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const forms = visiblePmdfForms(store, session);

  return (
    <PageShell
      title="Performance"
      subtitle="Performance Management & Development Form (PMDF) — objectives, development goals, ratings, and feedback"
    >
      <PmdfClient
        session={session}
        cycles={store.performanceCycles}
        forms={forms}
        employees={store.employees}
        departmentNames={store.departments.map((d) => d.name)}
      />
    </PageShell>
  );
}
