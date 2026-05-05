import Link from "next/link";
import { ROLE_LABELS } from "@/lib/roles";
import { listDemoAccountsForDisplay } from "@/lib/demo-accounts";
import { LoginForm } from "./ui";

function showDemoCredentialTable(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.KASTROS_DEMO_USERS === "true" ||
    process.env.KASTROS_SHOW_DEMO_CREDS === "true"
  );
}

export default function LoginPage() {
  const showDemo = showDemoCredentialTable();
  const demoRows = listDemoAccountsForDisplay();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-kastros-forest">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A227' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kastros-gold/15 ring-1 ring-kastros-gold/30">
            <span className="font-display text-lg font-semibold tracking-tight text-kastros-gold">K</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">Kastros HR</p>
            <p className="text-xs text-white/60">Cultivating global trade excellence</p>
          </div>
        </div>
        <Link
          href="https://www.kastros.co"
          className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          kastros.co
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-4 sm:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_520px] lg:items-start">
          <section className="hidden text-white lg:block">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-kastros-gold">People operations</p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              A secure home for your team across markets.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
              Role-based navigation, signed sessions, and a persisted demo dataset so you can rehearse approvals, hiring,
              payroll snapshots, and audit trails the way each persona would experience them.
            </p>
            <ul className="mt-10 space-y-4 text-sm text-white/80">
              {["RBAC across HR modules", "Signed JWT sessions", "Security headers", "Mutable demo store in /data"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-kastros-gold" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="w-full space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-kastros-forest/5 sm:p-10">
              <div className="mb-8 lg:hidden">
                <h2 className="font-display text-2xl font-semibold text-kastros-forest">Sign in</h2>
                <p className="mt-2 text-sm text-kastros-sage">Use your Kastros HR credentials.</p>
              </div>
              <div className="mb-8 hidden lg:block">
                <h2 className="font-display text-2xl font-semibold text-kastros-forest">Welcome back</h2>
                <p className="mt-2 text-sm text-kastros-sage">Sign in with your work account.</p>
              </div>
              <LoginForm />
              <p className="mt-8 text-center text-xs leading-relaxed text-kastros-sage/90">
                Protected by HTTP-only session cookies and strict transport in production. Configure{" "}
                <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">KASTROS_SESSION_SECRET</code>{" "}
                (32+ chars) and optional <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">KASTROS_HR_EMAIL</code> /{" "}
                <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">KASTROS_HR_PASSWORD</code> /{" "}
                <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">KASTROS_HR_ROLE</code>.
              </p>
            </div>

            {showDemo ? (
              <div className="rounded-3xl bg-white/95 p-6 shadow-card ring-1 ring-kastros-forest/5 sm:p-8">
                <h3 className="font-display text-lg font-semibold text-kastros-forest">Demo personas (RBAC)</h3>
                <p className="mt-2 text-sm text-kastros-sage">
                  Each account has a different navigation map and server permissions. Data writes go to{" "}
                  <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem]">data/kastros-hr-demo.json</code>.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-kastros-sand text-[0.65rem] uppercase tracking-wide text-kastros-sage">
                        <th className="pb-2 pr-2 font-medium">Role</th>
                        <th className="pb-2 pr-2 font-medium">Email</th>
                        <th className="pb-2 pr-2 font-medium">Password</th>
                        <th className="pb-2 font-medium">What to test</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kastros-sand">
                      {demoRows.map((row) => (
                        <tr key={row.email} className="align-top text-kastros-ink">
                          <td className="py-3 pr-2 font-semibold">{ROLE_LABELS[row.role]}</td>
                          <td className="py-3 pr-2 font-mono text-[0.7rem] text-kastros-sage sm:text-xs">{row.email}</td>
                          <td className="py-3 pr-2 font-mono text-[0.7rem] text-kastros-sage sm:text-xs">{row.password}</td>
                          <td className="py-3 text-xs text-kastros-sage">
                            {row.role === "employee" ? "Self-service leave, training, goals, documents." : null}
                            {row.role === "manager" ? "Team directory, approve Elena’s leave, team goals, cases (read)." : null}
                            {row.role === "recruiter" ? "Jobs pipeline, applicant counters, talent reporting." : null}
                            {row.role === "hr_admin" ? "Full HR control + reset demo dataset in Settings." : null}
                            {row.role === "payroll" ? "Payroll snapshot edits, workforce reads, reports." : null}
                            {row.role === "security_admin" ? "Security posture + audit feed + settings (no data reset)." : null}
                            {row.role === "ceo" ? "Final leave approvals, restricted HR cases, exec-level oversight." : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="rounded-3xl bg-white/10 p-4 text-xs text-white/70 ring-1 ring-white/10">
                Demo credential table is hidden in production unless <span className="font-mono">KASTROS_DEMO_USERS=true</span> or{" "}
                <span className="font-mono">KASTROS_SHOW_DEMO_CREDS=true</span>.
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-6 text-center text-xs text-white/50 sm:px-10">
        © {new Date().getFullYear()} Kastros. Internal HR system — do not distribute.
      </footer>
    </div>
  );
}
