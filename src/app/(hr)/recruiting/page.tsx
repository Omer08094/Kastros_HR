import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { RecruitingClient } from "@/components/hr/RecruitingClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function RecruitingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const canMutate = session.role === "hr_admin" || session.role === "recruiter";

  return (
    <PageShell title="Recruiting" subtitle="Requisitions backed by the demo store">
      <RecruitingClient jobs={store.jobs} canMutate={canMutate} />
    </PageShell>
  );
}
