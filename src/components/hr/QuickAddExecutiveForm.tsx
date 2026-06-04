"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field, SelectField } from "@/components/Field";
import { ToastStack, useToasts } from "@/components/ui/ToastStack";
import { addExecutiveMinimal } from "@/lib/store/hr-actions";
import { BUSINESS_UNITS } from "@/lib/store/types";
import type { PersistenceInfo } from "@/lib/store/persistence-info";

type ActionResult = { ok: true } | { error: string };

export function QuickAddExecutiveForm({
  employees,
  persistence,
}: {
  employees: { email: string; name: string }[];
  persistence: PersistenceInfo;
}) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      try {
        const r: ActionResult = await addExecutiveMinimal(formData);
        if ("error" in r) {
          setError(r.error);
          push(r.error, "error");
          return;
        }
        push("Executive added", "success", persistence.saveHint);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not add executive.";
        setError(msg);
        push(msg, "error");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-kastros-brandBlue/20 bg-gradient-to-br from-white to-kastros-cream/40 p-5 shadow-sm ring-1 ring-kastros-brandGreen/10">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <h2 className="font-display text-lg font-semibold text-kastros-forest">Quick add — C-level executive</h2>
      <p className="mt-1 max-w-2xl text-sm text-kastros-sage">
        Minimal roster entry for CEO, CFO, COO, and similar roles. Skips CNIC, joining date, emergency contacts, education, and other
        full onboarding fields — add those later in <strong className="text-kastros-ink">People → Edit profile</strong> if needed.
      </p>
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" action={handleSubmit}>
        <SelectField
          name="salutation"
          label="Salutation"
          defaultValue="Mr."
          options={["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Prof."]}
        />
        <Field name="name" label="Full name" required placeholder="e.g. Ahmed Khan" autoComplete="name" />
        <Field name="email" kind="email" label="Work email" required placeholder="ceo@kastros.co" autoComplete="email" />
        <Field name="title" label="Title" required placeholder="e.g. Chief Executive Officer" />
        <Field name="location" label="Location" required defaultValue="Dubai" placeholder="Dubai" />
        <SelectField
          name="businessUnit"
          label="Business unit"
          defaultValue="UAE"
          options={BUSINESS_UNITS.map((bu) => ({ value: bu, label: bu }))}
        />
        {employees.length > 0 ? (
          <SelectField
            name="reportsToEmail"
            label="Reports to"
            span2
            hint="Leave as None for the top of the org chart (e.g. Group CEO)."
            options={[
              { value: "", label: "— None (top leadership) —" },
              ...employees.map((e) => ({ value: e.email, label: `${e.name} (${e.email})` })),
            ]}
          />
        ) : (
          <input type="hidden" name="reportsToEmail" value="" />
        )}
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-kastros-sage">
          <input type="checkbox" name="createLogin" value="1" defaultChecked className="mt-1 rounded border-kastros-sand" />
          <span>
            Create Firebase login and send password-reset email (recommended). Uncheck only if this person should not sign in yet.
          </span>
        </label>
        <input type="hidden" name="department" value="Executive Office" />
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 border-t border-kastros-sand/80 pt-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add executive"}
          </button>
          <p className="text-xs text-kastros-sage">
            Department is set to <strong className="text-kastros-ink">Executive Office</strong>. For CEO / HR Admin app access, use{" "}
            <strong className="text-kastros-ink">Overview → Manage user roles</strong> after they sign in.
          </p>
        </div>
      </form>
    </section>
  );
}
