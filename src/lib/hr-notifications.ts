import { roleMayAccessRoute } from "@/lib/route-access";
import { leaveRequestPath } from "@/lib/leave-links";
import type { RoleId } from "@/lib/roles";
import type { Employee, HrStore, JobApplication } from "@/lib/store/types";

export type HrNotificationKind =
  | "approval"
  | "recruiting"
  | "learning"
  | "policy"
  | "people"
  | "payroll"
  | "compliance"
  | "team";

export type HrNotificationItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  /** ISO8601 for sorting */
  at: string;
  kind: HrNotificationKind;
};

function iso(d: Date): string {
  return d.toISOString();
}

function parseDay(s: string | undefined | null): Date | null {
  if (!s) return null;
  const t = Date.parse(s.length <= 10 ? `${s}T12:00:00Z` : s);
  return Number.isNaN(t) ? null : new Date(t);
}

function daysFromToday(day: Date, today: Date): number {
  const a = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((a - b) / 86400000);
}

function employeeByEmail(store: HrStore, email: string): Employee | undefined {
  return store.employees.find((e) => e.email === email);
}

function approvedReadyToHireApps(apps: JobApplication[]): JobApplication[] {
  return apps.filter((a) => a.reviewStatus === "approved");
}

export function deriveHrNotifications(
  store: HrStore,
  ctx: { email: string; role: RoleId },
): HrNotificationItem[] {
  const { email, role } = ctx;
  const items: HrNotificationItem[] = [];
  const now = new Date();
  const today = new Date(now.toISOString().slice(0, 10) + "T12:00:00Z");

  const push = (
    partial: Omit<HrNotificationItem, "href"> & { href: string },
    allowRoles?: RoleId[],
  ) => {
    if (!roleMayAccessRoute(role, partial.href)) return;
    if (allowRoles && !allowRoles.includes(role)) return;
    items.push(partial as HrNotificationItem);
  };

  /** Approvals inbox — parity with dashboards in tools like BambooHR / Workday (pending approvals). */
  for (const r of store.leaveRequests) {
    if (r.status === "PendingManager") {
      const requester = store.employees.find((e) => e.email.toLowerCase() === r.requesterEmail.toLowerCase());
      const managerEmail = requester?.reportsToEmail?.toLowerCase() ?? "";
      if (managerEmail && managerEmail === email.toLowerCase()) {
        push({
          id: `leave-mgr:${r.id}`,
          title: "Leave pending your manager approval",
          detail: `${r.kind} (${r.start}→${r.end}) · requested by ${findName(store, r.requesterEmail)}`,
          href: leaveRequestPath(r.id),
          at: iso(now),
          kind: "approval",
        });
      }
    }
    if (r.status === "PendingHR") {
      push({
        id: `leave-hr:${r.id}`,
        title: "Leave pending HR approval",
        detail: `${r.kind} (${r.start}→${r.end}) · requested by ${findName(store, r.requesterEmail)}`,
        href: leaveRequestPath(r.id),
        at: iso(now),
        kind: "approval",
      }, ["hr_admin"]);
    }
    if (r.requesterEmail === email && (r.status === "PendingManager" || r.status === "PendingHR")) {
      push({
        id: `leave-self:${r.id}`,
        title: "Your leave is awaiting approval",
        detail: `${r.kind} (${r.start}→${r.end})`,
        href: leaveRequestPath(r.id),
        at: iso(now),
        kind: "approval",
      });
    }

  }

  /** Candidate pipeline alerts — applicant tracking systems surface new submissions prominently. */
  const submittedApps = store.jobApplications.filter((a) => a.reviewStatus === "submitted");
  for (const a of submittedApps.slice(0, 5)) {
    const job = store.jobs.find((j) => j.id === a.jobId);
    push({
      id: `recruit-new:${a.id}`,
      title: `New applicant: ${a.fullName}`,
      detail: `${job?.title ?? "Role"} · applied ${humanDate(a.submittedAt)}`,
      href: "/recruiting",
      at: a.submittedAt.endsWith("Z") ? a.submittedAt : iso(parseDay(a.submittedAt) ?? now),
      kind: "recruiting",
    }, ["hr_admin", "ceo"]);
  }

  /** Ready-for-hire / onboarding handoff — common “next step” nudge in SMB HR suites. */
  const onboard = approvedReadyToHireApps(store.jobApplications);
  for (const a of onboard.slice(0, 3)) {
    const job = store.jobs.find((j) => j.id === a.jobId);
    push({
      id: `onboard-ready:${a.id}`,
      title: `Ready to onboard: ${a.fullName}`,
      detail: `${job?.title ?? "Role"} marked approved`,
      href: "/onboarding",
      at: a.submittedAt,
      kind: "people",
    }, ["hr_admin", "ceo"]);
  }

  /** Probation milestones — alert HR at 5 days, 2 days, and on the day. */
  for (const e of store.employees) {
    if (e.status !== "Active") continue;
    const end = parseDay(e.probationCompletionDate);
    if (!end) continue;
    const days = daysFromToday(end, today);
    if (days === 0 || days === 2 || days === 5) {
      const label =
        days === 0
          ? `Probation ends TODAY`
          : `Probation ends in ${days} days`;
      push({
        id: `probation-${days}d:${e.id}`,
        title: `${label}: ${e.name}`,
        detail: `${e.title} · ${e.department} · ends ${e.probationCompletionDate}`,
        href: "/employees",
        at: iso(end),
        kind: "people",
      }, ["hr_admin", "ceo"]);
    }
  }

  /** Date-of-birth birthday alerts (annual, to HR). */
  for (const e of store.employees) {
    if (!e.dateOfBirth || e.status === "Separated") continue;
    const dob = parseDay(e.dateOfBirth);
    if (!dob) continue;
    // Build this year's birthday date
    const birthdayThisYear = new Date(Date.UTC(today.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
    const daysUntil = daysFromToday(birthdayThisYear, today);
    if (daysUntil === 0 || daysUntil === 7) {
      push({
        id: `dob:${e.id}:${today.getUTCFullYear()}`,
        title: daysUntil === 0 ? `🎂 Birthday today: ${e.name}` : `Upcoming birthday in ${daysUntil} days: ${e.name}`,
        detail: `${e.title} · ${e.department}`,
        href: "/employees",
        at: iso(birthdayThisYear),
        kind: "people",
      }, ["hr_admin", "ceo"]);
    }
  }

  /** 1-year employment anniversary alerts (to HR). */
  for (const e of store.employees) {
    if (!e.joiningDate || e.status === "Separated") continue;
    const join = parseDay(e.joiningDate);
    if (!join) continue;
    // Anniversary must be ≥ 1 full year
    const yearsServed = today.getUTCFullYear() - join.getUTCFullYear();
    if (yearsServed < 1) continue;
    const anniversaryThisYear = new Date(Date.UTC(today.getUTCFullYear(), join.getUTCMonth(), join.getUTCDate()));
    const daysUntil = daysFromToday(anniversaryThisYear, today);
    if (daysUntil === 0 || daysUntil === 3 || daysUntil === 7) {
      push({
        id: `anniv:${e.id}:${today.getUTCFullYear()}`,
        title: daysUntil === 0
          ? `🏆 ${yearsServed}-year anniversary today: ${e.name}`
          : `Anniversary in ${daysUntil} days: ${e.name} (${yearsServed} yr${yearsServed === 1 ? "" : "s"})`,
        detail: `${e.title} · joined ${e.joiningDate}`,
        href: "/employees",
        at: iso(anniversaryThisYear),
        kind: "people",
      }, ["hr_admin", "ceo"]);
    }
  }

  /** Start-date window — onboarding teams track upcoming joins in most HR portals. */
  for (const e of store.employees) {
    const join = parseDay(e.joiningDate);
    if (!join) continue;
    const until = daysFromToday(join, today);
    if (until < 0 || until > 14) continue;

    push(
      {
        id: `join:${e.id}`,
        title:
          until === 0 ? `Starts today: ${e.name}` : `Starts in ${until} day${until === 1 ? "" : "s"}: ${e.name}`,
        detail: `${e.title} · ${e.location}`,
        href: "/onboarding",
        at: iso(join),
        kind: "people",
      },
      ["hr_admin", "ceo"],
    );
  }

  /** Training LMS-style due dates — overdue / due-soon surfaced on dashboards (ZenHR, etc.). */
  for (const t of store.training) {
    if (t.assigneeEmail !== email || t.status !== "Required") continue;
    const due = parseDay(t.due);
    if (!due) continue;
    const d = daysFromToday(due, today);
    if (d >= -14 && d <= 21) {
      push({
        id: `train:${t.id}`,
        title: d < 0 ? `Training overdue: ${t.name}` : `Training due soon: ${t.name}`,
        detail: `${t.provider === "External" ? t.providerName : "Internal"} · due ${t.due}`,
        href: "/training",
        at: iso(due),
        kind: "learning",
      });
    }
  }

  /** Policy acknowledgements — policy portals surface unsigned attestments until acknowledged. */
  if (employeeByEmail(store, email)) {
    const ackSet = new Set(
      store.policyAcknowledgements.filter((a) => a.employeeEmail === email).map((a) => a.policyId),
    );
    const missingPolicies = store.policies.filter((p) => !ackSet.has(p.id));
    if (missingPolicies.length > 0) {
      push({
        id: `pol-missing:${missingPolicies.map((m) => m.id).sort().join(":")}`,
        title: `${missingPolicies.length} policy update${missingPolicies.length !== 1 ? "s" : ""} need acknowledgement`,
        detail:
          missingPolicies.map((p) => p.title).join(" · ") || "Acknowledge updated manuals under documents",
        href: "/documents",
        at: iso(now),
        kind: "policy",
      });
    }
  }

  /** HR cases — restricted workflows stay in “requires action” trays. */
  for (const c of store.cases) {
    if (c.restrictedTo && c.restrictedTo.length > 0) {
      const allowed = new Set<string>(c.restrictedTo);
      if (!allowed.has(role)) continue;
    }
    if (/(closed|resolved)/i.test(c.status)) continue;
    push({
      id: `case:${c.id}`,
      title: `Case requires attention (${c.reference})`,
      detail: `${c.topic} · ${c.status}`,
      href: "/cases",
      at: iso(parseDay(c.opened) ?? now),
      kind: "compliance",
    });
  }

  /** Cross-role snapshot — soft FYI akin to homepage widgets on many HR dashboards. */
  push(
    {
      id: `pulse:${today.toISOString().slice(0, 10)}`,
      title: `Headcount live snapshot`,
      detail: `${store.employees.filter((e) => e.status === "Active").length} active profiles in roster`,
      href: "/dashboard",
      at: iso(now),
      kind: "people",
    },
    ["employee", "hr_admin", "ceo"],
  );

  const sorted = [...items].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  /** Stable dedupe by id */
  const seen = new Set<string>();
  return sorted.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

function findName(store: HrStore, email: string): string {
  return store.employees.find((e) => e.email === email)?.name ?? email;
}

function humanDate(isoStr: string): string {
  const d = new Date(isoStr);
  return Number.isNaN(d.valueOf())
    ? isoStr
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
