import { redirect } from "next/navigation";
import type { EmployeeIntakeDefaults } from "@/components/hr/employee-intake-fields";
import { PageShell } from "@/components/PageShell";
import { AddTeamMemberForm } from "@/components/hr/AddTeamMemberForm";
import { QuickAddExecutiveForm } from "@/components/hr/QuickAddExecutiveForm";
import { mapJobApplicationToOnboardingDefaults } from "@/lib/job-application-onboarding";
import { getSession } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";
import { getPersistenceInfo } from "@/lib/store/persistence-info";
import { readStore } from "@/lib/store/persist";

type PageProps = { searchParams: Promise<{ applicationId?: string }> };

export default async function OnboardingPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const store = await readStore();
  const canQuickAddExec = hasExecAccess(session.role);
  const persistence = getPersistenceInfo();

  let applicationDraft: EmployeeIntakeDefaults | undefined;
  let draftBanner: "ok" | "missing" | null = null;
  if (sp.applicationId) {
    const app = store.jobApplications.find((x) => x.id === sp.applicationId);
    const job = app ? store.jobs.find((j) => j.id === app.jobId) : undefined;
    if (app && job && app.reviewStatus === "approved") {
      applicationDraft = mapJobApplicationToOnboardingDefaults(app, job);
      draftBanner = "ok";
    } else {
      draftBanner = "missing";
    }
  }

  return (
    <PageShell title="Onboarding" subtitle="Add a new employee to the directory">
      {draftBanner === "ok" && applicationDraft?.email ? (
        <div className="mb-5 rounded-xl border border-kastros-brandBlue/20 bg-kastros-cream/90 px-4 py-3 text-sm text-kastros-forest ring-1 ring-kastros-brandGreen/20">
          Prefilled from an <strong>approved</strong> application ({applicationDraft.email}). Review the fields and click{" "}
          <strong>Create employee</strong> — education files from the portal are not copied; re-attach if needed.
        </div>
      ) : null}
      {draftBanner === "missing" ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Could not load application <code className="rounded bg-white px-1 text-xs">{sp.applicationId}</code>. Approve the candidate in{" "}
          <strong>Recruiting</strong> first, then use <strong>Onboard</strong>.
        </div>
      ) : null}
      {canQuickAddExec ? (
        <div className="mb-6">
          <QuickAddExecutiveForm
            employees={store.employees.map((e) => ({ email: e.email, name: e.name }))}
            persistence={persistence}
          />
        </div>
      ) : null}
      <AddTeamMemberForm
        defaults={applicationDraft}
        departments={store.departments.map((d) => d.name)}
        subDepartments={store.subDepartments}
        employees={store.employees.map((e) => ({ email: e.email, name: e.name }))}
        persistence={persistence}
      />
    </PageShell>
  );
}
