import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

const steps = [
  { title: "Offer accepted", owner: "Recruiting", state: "Done" as const },
  { title: "Contract & policy acknowledgements", owner: "People", state: "In progress" as const },
  { title: "Systems access (email, SSO groups)", owner: "IT", state: "Queued" as const },
  { title: "Desk orientation & markets intro", owner: "Manager", state: "Scheduled" as const },
];

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
      <p className="mt-4 text-sm text-kastros-sage">
        Managers and HR admins can pair this view with People and Documents in the demo. Task automation can be added on top of
        the persisted store when you wire a workflow engine.
      </p>
    </PageShell>
  );
}
