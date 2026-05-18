import Link from "next/link";
import { Card } from "@/components/Card";
import { ROLE_LABELS } from "@/lib/roles";
import { buildEmployeeDashboard } from "@/lib/employee-dashboard";
import type { HrStore } from "@/lib/store/types";
import type { Session } from "@/lib/auth";

export function EmployeeOverview({ session, store }: { session: Session; store: HrStore }) {
  const d = buildEmployeeDashboard(store, session.email);
  if (!d) {
    return (
      <Card eyebrow="Profile" title="Directory">
        <p className="text-sm text-kastros-sage">
          We could not match your login to an employee record. Contact HR Admin if this is unexpected.
        </p>
      </Card>
    );
  }

  const { employee: e } = d;
  const roleLabel = ROLE_LABELS[session.role];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-kastros-forest">Welcome back, {e.name.split(" ")[0]}</h2>
        <p className="mt-1 text-sm text-kastros-sage">
          Signed in as <span className="font-medium text-kastros-ink">{roleLabel}</span> · {session.email}
        </p>
      </div>

      {d.onProbation && d.probationDaysRemaining !== null && d.probationDaysRemaining <= 30 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Probation:</strong>{" "}
          {d.probationDaysRemaining === 0
            ? "Your probation period ends today — confirm next steps with your manager or HR."
            : `${d.probationDaysRemaining} day${d.probationDaysRemaining === 1 ? "" : "s"} until probation completes (${e.probationCompletionDate}).`}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card eyebrow="Your role" title="How you show up at Kastros">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Job title</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.title}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Department</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.department}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Location</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.location}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Employment</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.employmentType}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Status</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.status}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-kastros-sand pb-3">
              <dt className="text-kastros-sage">Joined</dt>
              <dd className="text-right font-medium text-kastros-forest">{e.joiningDate}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-kastros-sage">Reports to</dt>
              <dd className="max-w-[60%] text-right font-medium text-kastros-forest">{d.managerLabel ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-kastros-sage">
            Policy manuals and acknowledgements live under{" "}
            <Link href="/documents" className="font-semibold text-kastros-forest underline-offset-2 hover:underline">Documents</Link>.
          </p>
        </Card>

        <Card eyebrow="Annual leave" title={`${d.year} balance (estimated)`}>
          <p className="font-display text-4xl font-semibold text-kastros-forest">{d.annualRemaining}</p>
          <p className="mt-1 text-sm text-kastros-sage">days remaining of {d.annualEntitlement} entitlement</p>
          <p className="mt-4 text-sm text-kastros-ink">
            <span className="font-semibold text-kastros-forest">{d.annualUsedApproved}</span> days already approved this calendar year
            (annual leave only). Pending requests are not deducted here.
          </p>
          {d.pendingLeaveCount > 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              You have <strong>{d.pendingLeaveCount}</strong> request{d.pendingLeaveCount === 1 ? "" : "s"} awaiting approval.
            </p>
          ) : (
            <p className="mt-2 text-sm text-kastros-sage">No leave waiting on approval.</p>
          )}
          {d.upcomingApprovedLeave ? (
            <p className="mt-3 text-sm text-kastros-ink">
              Next approved time off: <span className="font-medium">{d.upcomingApprovedLeave.kind}</span>{" "}
              {d.upcomingApprovedLeave.start} → {d.upcomingApprovedLeave.end}
            </p>
          ) : null}
          <div className="mt-5">
            <Link
              href="/leave"
              className="inline-flex rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Request or view time off
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card eyebrow="Learning" title="Training">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{d.trainingRequired}</p>
          <p className="mt-2 text-sm text-kastros-sage">required module{d.trainingRequired === 1 ? "" : "s"} open</p>
          <p className="mt-1 text-xs text-kastros-sage">{d.trainingDone} marked complete</p>
          <Link href="/training" className="mt-4 inline-block text-sm font-semibold text-kastros-forest underline-offset-2 hover:underline">
            Open learning
          </Link>
        </Card>
        <Card eyebrow="Goals" title="Performance cycle">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{d.goalsCount}</p>
          <p className="mt-2 text-sm text-kastros-sage">active goal{d.goalsCount === 1 ? "" : "s"}</p>
          {d.goalsCount > 0 ? (
            <p className="mt-1 text-xs text-kastros-sage">Average progress {d.avgGoalProgress}%</p>
          ) : null}
          <Link href="/performance" className="mt-4 inline-block text-sm font-semibold text-kastros-forest underline-offset-2 hover:underline">
            View performance
          </Link>
        </Card>
        <Card eyebrow="Policies" title="Acknowledgements">
          <p className="font-display text-3xl font-semibold text-kastros-forest">{d.policiesMissingCount}</p>
          <p className="mt-2 text-sm text-kastros-sage">policy update{d.policiesMissingCount === 1 ? "" : "s"} to acknowledge</p>
          <Link href="/documents" className="mt-4 inline-block text-sm font-semibold text-kastros-forest underline-offset-2 hover:underline">
            Go to documents
          </Link>
        </Card>
      </div>
    </div>
  );
}
