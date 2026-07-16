"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { setEmployeeRole } from "@/lib/store/hr-actions";
import type { Employee } from "@/lib/store/types";
import type { EmployeeAuthRoleInfo } from "@/lib/firebase-auth-roles";
import { ROLE_LABELS } from "@/lib/roles";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee", description: "Can see own profile, leave, documents, and training." },
  { value: "hr_admin", label: "HR Admin", description: "Full HR operations — payroll, people, cases, recruiting, letters." },
  { value: "ceo", label: "CEO", description: "Same as HR Admin plus executive company overview." },
] as const;

const ROLE_BADGE: Record<string, string> = {
  employee: "bg-gray-100 text-gray-700 ring-gray-200",
  hr_admin: "bg-blue-50 text-blue-800 ring-blue-200",
  ceo: "bg-kastros-cream text-kastros-forest ring-kastros-sand",
  none: "bg-amber-50 text-amber-900 ring-amber-200",
  nologin: "bg-kastros-cream/80 text-kastros-sage ring-kastros-sand",
};

function roleBadgeClass(info: EmployeeAuthRoleInfo | undefined): string {
  if (!info?.hasAuthAccount) return ROLE_BADGE.nologin;
  if (!info.role) return ROLE_BADGE.none;
  return ROLE_BADGE[info.role] ?? ROLE_BADGE.employee;
}

function roleBadgeLabel(info: EmployeeAuthRoleInfo | undefined): string {
  if (!info?.hasAuthAccount) return "No login";
  if (!info.role) return "No role";
  return ROLE_LABELS[info.role];
}

export function RoleManagerClient({
  employees,
  authRoles,
}: {
  employees: Employee[];
  authRoles: EmployeeAuthRoleInfo[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("hr_admin");

  const roleByEmail = useMemo(() => {
    const map = new Map<string, EmployeeAuthRoleInfo>();
    for (const row of authRoles) {
      map.set(row.email.toLowerCase(), row);
    }
    return map;
  }, [authRoles]);

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const selectedAuth = selectedEmail ? roleByEmail.get(selectedEmail.toLowerCase()) : undefined;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const result = await setEmployeeRole(fd);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          const emp = employees.find((em) => em.email.toLowerCase() === selectedEmail.toLowerCase());
          const roleLabel = ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label ?? selectedRole;
          toast.success(
            `Role updated to "${roleLabel}" for ${emp?.name ?? selectedEmail}. They must sign out and sign back in for the change to take effect.`,
          );
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update role.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
              {sortedEmployees.map((emp) => {
                const auth = roleByEmail.get(emp.email.toLowerCase());
                return (
                  <option key={emp.email} value={emp.email}>
                    {emp.name} · {emp.email} · Current: {roleBadgeLabel(auth)}
                  </option>
                );
              })}
            </select>
          </label>

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

        {selectedEmail ? (
          <p className="text-sm text-kastros-sage">
            Current role for this person:{" "}
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${roleBadgeClass(selectedAuth)}`}>
              {roleBadgeLabel(selectedAuth)}
            </span>
          </p>
        ) : null}

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
        </div>
      </form>

      <div>
        <h3 className="font-display text-sm font-semibold text-kastros-forest">Current roles (roster)</h3>
        <p className="mt-1 text-xs text-kastros-sage">
          Live from Firebase Auth. &ldquo;No login&rdquo; means they have not signed in yet or were added without a Firebase account.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-kastros-sand">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-kastros-sand bg-kastros-cream/40 text-xs uppercase tracking-wide text-kastros-sage">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Current role</th>
                <th className="px-3 py-2.5 font-medium">Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kastros-sand">
              {sortedEmployees.map((emp) => {
                const auth = roleByEmail.get(emp.email.toLowerCase());
                const isSelected = selectedEmail.toLowerCase() === emp.email.toLowerCase();
                return (
                  <tr
                    key={emp.email}
                    className={`text-kastros-ink ${isSelected ? "bg-kastros-cream/50" : ""}`}
                  >
                    <td className="px-3 py-2.5 font-medium">{emp.name}</td>
                    <td className="px-3 py-2.5 text-xs text-kastros-sage">{emp.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${roleBadgeClass(auth)}`}>
                        {roleBadgeLabel(auth)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-kastros-sage">
                      {auth?.hasAuthAccount ? "Yes" : "No"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[0.7rem] leading-relaxed text-kastros-sage">
        This sets the Firebase Auth custom claim for the selected user. The change takes effect when they next sign in — their current
        session keeps the old role until they log out. You cannot change your own role.
      </p>
    </div>
  );
}
