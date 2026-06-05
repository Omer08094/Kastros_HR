import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { EmployeeOverview } from "@/components/hr/EmployeeOverview";
import { getSession } from "@/lib/auth";
import { hasExecAccess, ROLE_LABELS } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees, visibleLeaveRequests } from "@/lib/store/policy";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();

  if (session.role === "employee") {
    return (
      <PageShell title="Overview" subtitle="Your personal hub">
        <EmployeeOverview session={session} store={store} />
      </PageShell>
    );
  }

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

  const isCeo = session.role === "ceo";
  const activeCompany = store.employees.filter((e) => e.status === "Active").length;
  const onLeaveCompany = store.employees.filter((e) => e.status === "On leave").length;
  const deptCount = new Set(store.employees.map((e) => e.department)).size;
  const pendingApps = store.jobApplications.filter((a) => a.reviewStatus === "submitted").length;
  const trainingOpen = store.training.filter((t) => t.status === "Required").length;
  const companyPendingLeave = store.leaveRequests.filter((l) => l.status === "PendingHR" || l.status === "PendingCEO").length;

  return (
    <PageShell
      title="Overview"
      subtitle={`Signed in as ${ROLE_LABELS[session.role]} · ${session.email}`}
    >
      {probationAlerts.length ? (
        <Link
          href="/employees"
          className="mb-5 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <strong>Probation alert:</strong> {probationAlerts.length} employee(s) are within 10 days of probation completion. HR should
          trigger confirmation actions — <span className="font-semibold underline underline-offset-2">open People</span>.
        </Link>
      ) : null}

      {isCeo ? (
        <div className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kastros-brandGreen">Executive view</p>
          <h2 className="font-display text-xl font-semibold text-kastros-forest">Company pulse</h2>
          <p className="text-sm text-kastros-sage">Whole-roster snapshot — same modules as HR Admin, with a broader dashboard lens.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card eyebrow="Roster" title="Active employees">
              <p className="font-display text-3xl font-semibold text-kastros-forest">{activeCompany}</p>
              <p className="mt-2 text-sm text-kastros-sage">{onLeaveCompany} on leave · {deptCount} departments</p>
            </Card>
            <Card eyebrow="Leave" title="Approval pipeline (company)">
              <p className="font-display text-3xl font-semibold text-kastros-forest">{companyPendingLeave}</p>
              <p className="mt-2 text-sm text-kastros-sage">Requests in HR review or executive sign-off</p>
            </Card>
            <Card eyebrow="Talent" title="Open jobs · new CVs">
              <p className="font-display text-3xl font-semibold text-kastros-forest">{openJobs}</p>
              <p className="mt-2 text-sm text-kastros-sage">{pendingApps} application{pendingApps === 1 ? "" : "s"} awaiting review</p>
            </Card>
            <Card eyebrow="Learning" title="Assigned training (open)">
              <p className="font-display text-3xl font-semibold text-kastros-forest">{trainingOpen}</p>
              <p className="mt-2 text-sm text-kastros-sage">Rows still marked required</p>
            </Card>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-4">
        <Link
          href="/employees"
          className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <Card className="h-full border-transparent transition-shadow group-hover:border-kastros-brandGreen/30 group-hover:shadow-card" eyebrow="People" title="Visible headcount">
            <p className="font-display text-3xl font-semibold text-kastros-forest">{people.length}</p>
            <p className="mt-2 text-sm text-kastros-sage">
              {hasExecAccess(session.role) ? "Full directory access." : "Your profile in the roster."}
            </p>
          </Card>
        </Link>
        <Link
          href="/leave"
          className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <Card className="h-full border-transparent transition-shadow group-hover:border-kastros-brandGreen/30 group-hover:shadow-card" eyebrow="Leave" title="Pending approvals (visible)">
            <p className="font-display text-3xl font-semibold text-kastros-forest">{pendingLeave}</p>
            <p className="mt-2 text-sm text-kastros-sage">
              {hasExecAccess(session.role) ? "HR Admin or CEO: clear from Time off." : "Track your own requests."}
            </p>
          </Card>
        </Link>
        <Link
          href="/recruiting"
          className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <Card className="h-full border-transparent transition-shadow group-hover:border-kastros-brandGreen/30 group-hover:shadow-card" eyebrow="Recruiting" title="Open requisitions">
            <p className="font-display text-3xl font-semibold text-kastros-forest">{openJobs}</p>
            <p className="mt-2 text-sm text-kastros-sage">{hasExecAccess(session.role) ? "Manage roles under Recruiting." : "Exec-only module."}</p>
          </Card>
        </Link>
        <Link
          href="/cases"
          className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <Card className="h-full border-transparent transition-shadow group-hover:border-kastros-brandGreen/30 group-hover:shadow-card" eyebrow="Cases" title="Active matters">
            <p className="font-display text-3xl font-semibold text-kastros-forest">{openCases}</p>
            <p className="mt-2 text-sm text-kastros-sage">{hasExecAccess(session.role) ? "Restricted HR cases." : "Exec-only module."}</p>
          </Card>
        </Link>
      </div>

      {hasExecAccess(session.role) ? (
        <Link
          href="/user-roles"
          className="group mt-6 block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <Card
            className="border-transparent transition-shadow group-hover:border-kastros-brandGreen/30 group-hover:shadow-card"
            eyebrow="Access control"
            title="User roles"
          >
            <p className="text-sm text-kastros-sage">
              Assign Employee, HR Admin, or CEO access. Open <strong className="text-kastros-forest">Setup → User roles</strong> in the
              sidebar — changes apply after sign-out and sign-in.
            </p>
          </Card>
        </Link>
      ) : null}

      <Card className="mt-6" eyebrow="Organization overview" title="Our Story">
        <div className="space-y-4 text-sm leading-relaxed text-kastros-sage">
          <p>
            Founded with an unwavering commitment to excellence, Kastros has emerged as a transformative force in global agricultural
            commodities trading. Our journey began with a simple yet powerful vision: to create meaningful connections between producers
            and markets while upholding the highest standards of quality and sustainability.
          </p>
          <p>
            Over the years, we have built an extensive network spanning multiple continents, establishing ourselves as trusted partners
            to farmers, processors, and distributors worldwide. Our success is rooted in deep market expertise, operational excellence, and
            an unyielding dedication to our clients&apos; success.
          </p>
          <p>
            Today, we stand at the forefront of agricultural innovation, leveraging cutting-edge technology and sustainable practices to
            meet the evolving needs of a dynamic global marketplace. Our commitment extends beyond transactions—we&apos;re invested in
            building lasting relationships and creating shared value across the entire supply chain.
          </p>
        </div>
      </Card>
    </PageShell>
  );
}
