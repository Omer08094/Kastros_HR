"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { EmployeeIntakeDefaults } from "@/components/hr/employee-intake-fields";
import { EmployeeIntakeFields } from "@/components/hr/employee-intake-fields";
import { useToast } from "@/components/ui/ToastProvider";
import { addEmployee } from "@/lib/store/hr-actions";
import { SelectField } from "@/components/Field";
import type { PersistenceInfo } from "@/lib/store/persistence-info";

type ActionResult = { ok: true } | { error: string };

async function runAction(p: Promise<ActionResult>, onOk: () => void): Promise<string | null> {
  const r = await p;
  if ("error" in r) return r.error;
  onOk();
  return null;
}

export function AddTeamMemberForm({
  defaults,
  departments = [],
  subDepartments = [],
  employees = [],
  persistence,
}: {
  defaults?: EmployeeIntakeDefaults;
  departments?: string[];
  subDepartments?: { id: string; name: string; departmentId: string }[];
  employees?: { email: string; name: string }[];
  persistence?: PersistenceInfo;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  function scrollToForm() {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handle(p: Promise<ActionResult>) {
    start(async () => {
      try {
        const err = await runAction(p, () => {
          router.refresh();
          setFormKey((k) => k + 1);
          scrollToForm();
        });
        if (err) {
          toast.error(err);
          scrollToForm();
        } else {
          toast.success("Profile saved — employee added to the directory.", persistence?.saveHint);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong while saving.";
        toast.error(msg);
        scrollToForm();
      }
    });
  }

  return (
    <section ref={sectionRef} className="rounded-2xl border border-kastros-sand bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-kastros-forest">Add team member</h2>
      <p className="mt-1 text-sm text-kastros-sage">Includes family compliance, onboarding, contact, and probation details.</p>
      <form key={formKey} className="mt-4 grid gap-3 sm:grid-cols-2" action={(fd) => handle(addEmployee(fd))}>
        <EmployeeIntakeFields defaults={defaults} showSubtitle={false} departments={departments} subDepartments={subDepartments} employees={employees} />
        <SelectField
          name="appRole"
          label="App access role"
          span2
          defaultValue="employee"
          options={[
            { value: "employee", label: "Employee — self-service only" },
            { value: "hr_admin", label: "HR Admin — full HR operations (same as admin@kastros.co)" },
            { value: "ceo", label: "CEO — HR Admin plus executive dashboard" },
          ]}
        />
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
