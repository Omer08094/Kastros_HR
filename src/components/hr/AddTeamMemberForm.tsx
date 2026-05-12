"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EmployeeIntakeDefaults } from "@/components/hr/employee-intake-fields";
import { EmployeeIntakeFields } from "@/components/hr/employee-intake-fields";
import { addEmployee } from "@/lib/store/hr-actions";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function AddTeamMemberForm({ defaults }: { defaults?: EmployeeIntakeDefaults }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(p: Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const err = await runAction(p, () => router.refresh());
      if (err) setError(err);
    });
  }

  return (
    <section className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-kastros-forest">Add team member</h2>
      <p className="mt-1 text-sm text-kastros-sage">Includes family compliance, onboarding, contact, and probation details.</p>
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addEmployee(fd))}>
        <EmployeeIntakeFields defaults={defaults} showSubtitle={false} />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create employee"}
          </button>
        </div>
      </form>
    </section>
  );
}
