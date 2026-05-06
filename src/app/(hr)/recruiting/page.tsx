import { headers } from "next/headers";
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

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <PageShell title="Recruiting" subtitle="Open roles, applicant portal links, and submitted CVs">
      <RecruitingClient jobs={store.jobs} applications={store.jobApplications} canMutate={canMutate} applyOrigin={origin} />
    </PageShell>
  );
}
