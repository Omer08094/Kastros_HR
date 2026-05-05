import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { DocumentsClient } from "@/components/hr/DocumentsClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const canAdd = session.role === "hr_admin" || session.role === "recruiter";
  const canDelete = session.role === "hr_admin";

  return (
    <PageShell title="Documents" subtitle="Scanned records + policy manual acknowledgements">
      <DocumentsClient
        documents={store.documents}
        policies={store.policies}
        acknowledgements={store.policyAcknowledgements}
        currentUserEmail={session.email}
        canAdd={canAdd}
        canDelete={canDelete}
      />
    </PageShell>
  );
}
