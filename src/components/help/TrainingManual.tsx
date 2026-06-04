"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, Users, Briefcase } from "lucide-react";
import { BRAND_LOGO } from "@/lib/brand-assets";
import {
  EMPLOYEE_QUICK_TOPICS,
  MANUAL_AUDIENCE_INTRO,
  MANUAL_PATH,
  moduleQuickSteps,
  moduleShortTitle,
  modulesForRole,
  manualSearchBlob,
  type ManualModule,
  type ManualRole,
} from "@/lib/help/manual-content";

const ROLE_STORAGE_KEY = "kastros-manual-role";

function RolePicker({ onSelect }: { onSelect: (role: ManualRole) => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="text-center">
        <img src={BRAND_LOGO} alt="" className="mx-auto h-10 w-auto object-contain" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-kastros-forest sm:text-3xl">How do you use Kastros HR?</h1>
        <p className="mt-2 text-sm text-kastros-sage">Choose one — we&apos;ll show only the guides that apply to you.</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("employee")}
          className="rounded-2xl border-2 border-kastros-sand bg-white p-6 text-left shadow-sm transition hover:border-kastros-brandGreen hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kastros-cream text-kastros-forest">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-kastros-forest">I&apos;m an employee</p>
          <p className="mt-2 text-sm text-kastros-sage">
            Login, leave, expenses, policies, training — everyday tasks.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect("hr")}
          className="rounded-2xl border-2 border-kastros-sand bg-white p-6 text-left shadow-sm transition hover:border-kastros-brandGreen hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-forest"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kastros-forest/10 text-kastros-forest">
            <Briefcase className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-kastros-forest">I&apos;m HR or CEO</p>
          <p className="mt-2 text-sm text-kastros-sage">
            Onboarding, settings, approvals, recruiting, and admin.
          </p>
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-kastros-sage">
        You can switch role anytime at the top of the guide.
      </p>
    </div>
  );
}

function ModuleAccordion({
  mod,
  query,
  defaultOpen,
}: {
  mod: ManualModule;
  query: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const steps = moduleQuickSteps(mod);

  useEffect(() => {
    if (query.trim()) setOpen(true);
  }, [query]);

  return (
    <article id={mod.id} className="scroll-mt-24 rounded-xl border border-kastros-sand bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-kastros-forest sm:text-lg">{moduleShortTitle(mod)}</h2>
          <p className="mt-1 text-sm text-kastros-sage">{mod.summary}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-kastros-sage transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-kastros-sand/80 px-4 pb-4 sm:px-5">
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-kastros-ink">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {mod.sections.some((s) => s.paragraphs.length > 0) ? (
            <details className="mt-4 rounded-lg bg-kastros-cream/40 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-kastros-forest">More detail (optional)</summary>
              <div className="mt-2 space-y-3 text-sm text-kastros-ink">
                {mod.sections.map((sec) => (
                  <div key={sec.id}>
                    {sec.title ? <p className="font-medium text-kastros-forest">{sec.title}</p> : null}
                    {sec.paragraphs.map((p, i) => (
                      <p key={i} className="mt-1 text-kastros-sage">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function TrainingManual({ loginHref = "/login" }: { loginHref?: string }) {
  const [role, setRole] = useState<ManualRole | null>(null);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("role");
      if (fromUrl === "employee" || fromUrl === "hr") {
        setRole(fromUrl);
      } else {
        const saved = localStorage.getItem(ROLE_STORAGE_KEY);
        if (saved === "employee" || saved === "hr") setRole(saved);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function selectRole(r: ManualRole) {
    setRole(r);
    setQuery("");
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  }

  const roleModules = useMemo(() => (role ? modulesForRole(role) : []), [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roleModules;
    return roleModules.filter((m) => manualSearchBlob(m).includes(q));
  }, [roleModules, query]);

  const intro = role ? MANUAL_AUDIENCE_INTRO[role] : null;

  if (!hydrated) {
    return <div className="min-h-dvh bg-kastros-cream" />;
  }

  if (!role) {
    return (
      <div className="min-h-dvh bg-kastros-cream">
        <header className="border-b border-kastros-sand bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <img src={BRAND_LOGO} alt="" className="h-8 w-auto" />
            <Link href={loginHref} className="text-sm font-semibold text-kastros-forest underline">
              Sign in
            </Link>
          </div>
        </header>
        <RolePicker onSelect={selectRole} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-kastros-cream">
      <header className="sticky top-0 z-30 border-b border-kastros-sand bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <img src={BRAND_LOGO} alt="" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <Link href={loginHref} className="text-sm font-semibold text-kastros-forest hover:underline">
              Sign in
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-2xl gap-1 border-t border-kastros-sand/80 px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => selectRole("employee")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              role === "employee" ? "bg-kastros-forest text-white" : "text-kastros-sage hover:bg-kastros-cream"
            }`}
          >
            Employee
          </button>
          <button
            type="button"
            onClick={() => selectRole("hr")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              role === "hr" ? "bg-kastros-forest text-white" : "text-kastros-sage hover:bg-kastros-cream"
            }`}
          >
            HR / CEO
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {intro ? (
          <div className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
            <h1 className="font-display text-xl font-semibold text-kastros-forest">{intro.title}</h1>
            <p className="mt-1 text-sm text-kastros-brandGreen">{intro.subtitle}</p>
            <p className="mt-3 text-sm text-kastros-sage">{intro.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-kastros-sage">
              {role === "hr" ? "Recommended order (new system)" : "Start here"}
            </p>
            <ol className="mt-2 space-y-1.5 text-sm text-kastros-ink">
              {intro.startHere.map((step, i) => (
                <li key={step.moduleId} className="flex gap-2">
                  <span className="shrink-0 font-medium text-kastros-sage">{i + 1}.</span>
                  <a href={`#${step.moduleId}`} className="font-medium text-kastros-forest underline-offset-2 hover:underline">
                    {step.label}
                  </a>
                </li>
              ))}
            </ol>
            {role === "employee" ? (
              <p className="mt-4 text-xs text-kastros-sage">
                Quick topics: {EMPLOYEE_QUICK_TOPICS.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kastros-sage" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={role === "hr" ? "Search HR topics…" : "Search e.g. leave, expense, login…"}
            className="w-full rounded-xl border border-kastros-sand bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-kastros-brandBlue focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/20"
            aria-label="Search guide"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-kastros-sand bg-white/80 p-8 text-center text-sm">
            <p className="font-semibold text-kastros-forest">No matches</p>
            <button type="button" onClick={() => setQuery("")} className="mt-2 font-semibold text-kastros-forest underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-kastros-sage">
              {filtered.length} topic{filtered.length === 1 ? "" : "s"} — tap a card to open steps
            </p>
            {filtered.map((mod, i) => (
              <ModuleAccordion key={mod.id} mod={mod} query={query} defaultOpen={!query.trim() && i === 0} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-kastros-sage">
          Stuck in the app? Use the <strong className="text-kastros-forest">?</strong> button bottom-left (opens this page).
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href={loginHref} className="font-semibold text-kastros-forest underline">
            Go to Kastros HR login
          </Link>
        </p>
      </main>
    </div>
  );
}
