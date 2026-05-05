import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees, visibleLeaveRequests } from "@/lib/store/policy";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const people = visibleEmployees(store, session);
  const leave = visibleLeaveRequests(store, session);
  const pendingLeave = leave.filter((l) => l.status === "PendingHR" || l.status === "PendingCEO").length;
  const openJobs = store.jobs.length;
  const openCases = store.cases.filter((c) => c.status !== "Resolved" && c.status !== "Closed").length;
  const today = new Date();
  const probationAlerts = people.filter((e) => {
    const end = new Date(e.probationCompletionDate);
    const days = Math.ceil((end.getTime() - today.getTime()) / (24 * 3600 * 1000));
    return days >= 0 && days <= 10;
  });

  return (
    <PageShell
      title="Overview"
      subtitle={`Signed in as ${ROLE_LABELS[session.role]} · ${session.email}`}
    >
      {probationAlerts.length ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Probation alert:</strong> {probationAlerts.length} employee(s) are within 10 days of probation completion. HR should trigger confirmation actions.
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-4">
        <Card eyebrow="People" title="Visible headcount">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{people.length}</p>
          <p className="mt-2 text-sm text-kastros-sage">Filtered to what your role may see in Directory.</p>
        </Card>
        <Card eyebrow="Leave" title="Pending approvals (visible)">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{pendingLeave}</p>
          <p className="mt-2 text-sm text-kastros-sage">Managers/HR: approve from Time off.</p>
        </Card>
        <Card eyebrow="Recruiting" title="Open requisitions">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{openJobs}</p>
          <p className="mt-2 text-sm text-kastros-sage">Recruiters maintain the pipeline.</p>
        </Card>
        <Card eyebrow="Cases" title="Active matters">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{openCases}</p>
          <p className="mt-2 text-sm text-kastros-sage">HR admins update statuses.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" eyebrow="Next steps" title="Try a realistic flow">
          <ol className="list-decimal space-y-3 pl-5 text-sm text-kastros-ink">
            <li>
              Sign in as <span className="font-mono text-xs">elena.employee@kastros.demo</span> and submit a leave request.
            </li>
            <li>
              Switch to <span className="font-mono text-xs">marcus.manager@kastros.demo</span> and approve/deny that request.
            </li>
            <li>
              Use <span className="font-mono text-xs">amelia.hr@kastros.demo</span> to edit employees, documents, and reset the demo
              dataset from Settings.
            </li>
          </ol>
        </Card>
        <Card eyebrow="Data" title="Persistence">
          <p className="text-sm leading-relaxed text-kastros-sage">
            Mutations append to <span className="font-mono text-xs">data/kastros-hr-demo.json</span>. Delete that file to force a
            fresh seed on next read.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
