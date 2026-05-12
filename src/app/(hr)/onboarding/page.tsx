import { redirect } from "next/navigation";
import type { EmployeeIntakeDefaults } from "@/components/hr/employee-intake-fields";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { AddTeamMemberForm } from "@/components/hr/AddTeamMemberForm";
import { mapJobApplicationToOnboardingDefaults } from "@/lib/job-application-onboarding";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";

const steps = [
  { title: "Offer accepted", owner: "Recruiting", state: "Done" as const },
  { title: "Contract & policy acknowledgements", owner: "People", state: "In progress" as const },
  { title: "Systems access (email, SSO groups)", owner: "IT", state: "Queued" as const },
  { title: "Desk orientation & markets intro", owner: "Manager", state: "Scheduled" as const },
];

type PageProps = { searchParams: Promise<{ applicationId?: string }> };

export default async function OnboardingPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const store = await readStore();
  const canAddTeamMember = session.role === "hr_admin" || session.role === "recruiter";
  const upcomingProbation = store.employees.filter((e) => {
    const end = new Date(e.probationCompletionDate);
    const days = Math.ceil((end.getTime() - Date.now()) / (24 * 3600 * 1000));
    return days >= 0 && days <= 10;
  });

  let applicationDraft: EmployeeIntakeDefaults | undefined;
  let draftBanner: "ok" | "missing" | null = null;
  if (canAddTeamMember && sp.applicationId) {
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
    <PageShell title="Onboarding" subtitle={`Playbook visibility for ${ROLE_LABELS[session.role]}`}>
      <Card eyebrow="Playbook" title="New hire · sample checklist">
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col gap-2 rounded-xl border border-kastros-sand bg-kastros-cream/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-kastros-forest ring-1 ring-kastros-sand">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-kastros-forest">{s.title}</p>
                  <p className="text-sm text-kastros-sage">Owner: {s.owner}</p>
                </div>
              </div>
              <span
                className={`self-start rounded-full px-2.5 py-1 text-xs font-medium sm:self-center ${
                  s.state === "Done"
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : s.state === "In progress"
                      ? "bg-amber-50 text-amber-900 ring-1 ring-amber-100"
                      : "bg-white text-kastros-forest ring-1 ring-kastros-sand"
                }`}
              >
                {s.state}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {canAddTeamMember ? (
        <div className="mt-5 space-y-4">
          {draftBanner === "ok" && applicationDraft?.email ? (
            <div className="rounded-xl border border-kastros-gold/35 bg-kastros-cream/90 px-4 py-3 text-sm text-kastros-forest ring-1 ring-kastros-gold/20">
              Prefilled from an <strong>approved</strong> application ({applicationDraft.email}). Review the fields and click{" "}
              <strong>Create employee</strong> — education files from the portal are not copied; re-attach if needed.
            </div>
          ) : null}
          {draftBanner === "missing" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Could not load application <code className="rounded bg-white px-1 text-xs">{sp.applicationId}</code>. Approve the candidate in{" "}
              <strong>Recruiting</strong> first, then use <strong>Onboard</strong>.
            </div>
          ) : null}
          <AddTeamMemberForm defaults={applicationDraft} />
        </div>
      ) : null}

      <Card className="mt-5 scroll-mt-24" eyebrow="Probation tracker" title="Employees nearing completion (10-day window)" id="probation">
        <ul className="space-y-2 text-sm text-kastros-ink">
          {upcomingProbation.length ? (
            upcomingProbation.map((e) => (
              <li key={e.id} className="rounded-lg bg-kastros-cream px-3 py-2 ring-1 ring-kastros-sand">
                {e.name} ({e.email}) - probation ends on {e.probationCompletionDate}
              </li>
            ))
          ) : (
            <li className="text-kastros-sage">No probation completions due in the next 10 days.</li>
          )}
        </ul>
      </Card>
      <p className="mt-4 text-sm text-kastros-sage">
        Managers and HR admins can pair this view with People and Documents in the demo. Task automation can be added on top of
        the persisted store when you wire a workflow engine.
      </p>
    </PageShell>
  );
}
