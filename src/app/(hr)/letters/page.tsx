import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { LettersClient } from "@/components/hr/LettersClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { hasExecAccess } from "@/lib/roles";

export default async function LettersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasExecAccess(session.role)) redirect("/access-denied?from=/letters");
  const store = await readStore();

  return (
    <PageShell
      title="Letters"
      subtitle="Generate and archive promotion, redesignation, trainee, and internship letters."
    >
      <LettersClient letters={store.letters} employees={store.employees} />
    </PageShell>
  );
}
