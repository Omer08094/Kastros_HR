import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { DocumentsClient } from "@/components/hr/DocumentsClient";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const canAdd = session.role === "hr_admin" || session.role === "ceo";
  const canDelete = session.role === "hr_admin" || session.role === "ceo";

  return (
    <PageShell title="Documents" subtitle="Company notices, shared library, policy acknowledgements, and Conflict of Interest">
      <DocumentsClient
        documents={store.documents}
        policies={store.policies}
        acknowledgements={store.policyAcknowledgements}
        currentUserEmail={session.email}
        canAdd={canAdd}
        canDelete={canDelete}
        linkableEmployees={store.employees.map((e) => ({ email: e.email, name: e.name })).sort((a, b) => a.name.localeCompare(b.name))}
        coiDocs={store.coiDocs}
        coiSubmissions={store.coiSubmissions}
      />
    </PageShell>
  );
}
