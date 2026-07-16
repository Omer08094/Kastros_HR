import Link from "next/link";
import { BRAND_LOGO, BRAND_LOGO_WHITE } from "@/lib/brand-assets";
import { MANUAL_PATH } from "@/lib/help/manual-content";
import { listDemoAccountsForDisplay } from "@/lib/demo-accounts";
import { ROLE_LABELS } from "@/lib/roles";
import { LoginForm } from "./ui";

function showDemoCredentialTable(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.KASTROS_DEMO_USERS === "true" ||
    process.env.KASTROS_SHOW_DEMO_CREDS === "true"
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string }>;
}) {
  const showDemo = showDemoCredentialTable();
  const demoRows = listDemoAccountsForDisplay();
  const sp = await searchParams;
  const next = sp.next ?? sp.callbackUrl ?? "";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-kastros-brandBlue via-kastros-brandBlueDeep to-[#1a2552]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23006837' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <img src={BRAND_LOGO_WHITE} alt="" className="h-9 w-auto max-w-[min(52vw,200px)] object-contain object-left" />
          <div className="min-w-0 border-l border-white/20 pl-3">
            <p className="font-display text-lg font-semibold tracking-tight text-white">Kastros HR</p>
            <p className="text-xs text-emerald-100/90">Cultivating global trade excellence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={MANUAL_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            How-to manual
          </Link>
          <Link
            href="https://www.kastros.co"
            className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            kastros.co
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-16 pt-4 sm:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_520px] lg:items-start">
          <section className="hidden text-white lg:block">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">People operations</p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              A secure home for your team across markets.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80">
              Role-based navigation, signed sessions, and cloud persistence through Firebase so your team can run
              approvals, hiring, and HR operations from anywhere.
            </p>
            <ul className="mt-10 space-y-4 text-sm text-white/85">
              {["RBAC across HR modules", "Firebase Authentication", "Firestore-backed HR data", "Secure file storage"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kastros-brandGreen shadow-[0_0_0_3px_rgba(0,104,55,0.35)]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="w-full space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-kastros-brandBlue/10 sm:p-10">
              <div className="mb-8 flex justify-center lg:mb-6">
                <img src={BRAND_LOGO} alt="Kastros" className="h-11 w-auto max-w-[220px] object-contain" />
              </div>
              <div className="mb-8 lg:hidden">
                <h2 className="text-center font-display text-2xl font-semibold text-kastros-brandBlue">Sign in</h2>
                <p className="mt-2 text-center text-sm text-kastros-brandGreen">Use your Kastros HR credentials.</p>
              </div>
              <div className="mb-8 hidden lg:block">
                <h2 className="text-center font-display text-2xl font-semibold text-kastros-brandBlue">Welcome back</h2>
                <p className="mt-2 text-center text-sm text-kastros-brandGreen">Sign in with your work account.</p>
              </div>
              <LoginForm next={next} />
              <p className="mt-8 text-center text-xs leading-relaxed text-kastros-sage/90">
                Protected by HTTP-only session cookies. Accounts are managed in Firebase Authentication — not in environment
                variables. First-time setup: run <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">npm run bootstrap:fresh</code>{" "}
                (see <code className="rounded bg-kastros-cream px-1 py-0.5 text-[0.7rem] text-kastros-ink">docs/FIREBASE_AUTH.md</code>).
              </p>
            </div>

            {showDemo ? (
              <div className="rounded-3xl bg-white/95 p-6 shadow-card ring-1 ring-kastros-brandBlue/10 sm:p-8">
                <h3 className="font-display text-lg font-semibold text-kastros-brandBlue">Demo personas (RBAC)</h3>
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
                            {row.role === "employee" ? "Demo login; in production HR issues a portal email + password under People." : null}
                            {row.role === "hr_admin" ? "Full HR operations, recruiting, payroll, cases, and reset demo data in Settings." : null}
                            {row.role === "ceo" ? "Same access as HR Admin, with an executive company overview on the dashboard." : null}
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
