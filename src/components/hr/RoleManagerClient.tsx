"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEmployeeRole } from "@/lib/store/hr-actions";
import type { Employee } from "@/lib/store/types";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee", description: "Can see own profile, leave, documents, and training." },
  { value: "hr_admin", label: "HR Admin", description: "Full HR operations — payroll, people, cases, recruiting, letters." },
  { value: "ceo", label: "CEO", description: "Same as HR Admin plus executive company overview." },
] as const;

const ROLE_BADGE: Record<string, string> = {
  employee: "bg-gray-100 text-gray-700 ring-gray-200",
  hr_admin: "bg-blue-50 text-blue-800 ring-blue-200",
  ceo: "bg-kastros-cream text-kastros-forest ring-kastros-sand",
};

export function RoleManagerClient({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("hr_admin");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await setEmployeeRole(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        const emp = employees.find((em) => em.email.toLowerCase() === selectedEmail.toLowerCase());
        setSuccess(
          `Role updated to "${selectedRole}" for ${emp?.name ?? selectedEmail}. They must sign out and sign back in for the change to take effect.`,
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Employee picker */}
          <label className="text-sm">
            <span className="text-kastros-sage">Employee *</span>
            <select
              name="email"
              required
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30"
            >
              <option value="" disabled>
                Select an employee…
              </option>
              {employees.map((emp) => (
                <option key={emp.email} value={emp.email}>
                  {emp.name} · {emp.email}
                </option>
              ))}
            </select>
          </label>

          {/* Role picker */}
          <label className="text-sm">
            <span className="text-kastros-sage">New role *</span>
            <select
              name="role"
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-kastros-sand bg-kastros-cream/40 px-3 py-2 text-sm text-kastros-ink focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Description of chosen role */}
        <p className="text-xs text-kastros-sage">
          {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.description}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !selectedEmail}
            className="rounded-xl bg-kastros-forest px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-kastros-forest/90 disabled:opacity-50"
          >
            {pending ? "Updating…" : "Apply role change"}
          </button>
          {selectedEmail && selectedRole ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${ROLE_BADGE[selectedRole] ?? ROLE_BADGE.employee}`}>
              {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}
            </span>
          ) : null}
        </div>
      </form>

      <p className="text-[0.7rem] leading-relaxed text-kastros-sage">
        This sets the Firebase Auth custom claim for the selected user. The change takes effect when they next sign in — their current
        session keeps the old role until they log out. You cannot change your own role.
      </p>
    </div>
  );
}
