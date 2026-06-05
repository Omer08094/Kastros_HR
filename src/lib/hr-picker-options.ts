import { mergeDepartmentOptions } from "@/lib/executive-org";

export type RosterEntry = { email: string; name: string };
export type SelectOption = { value: string; label: string };

export function buildDepartmentOptions(configuredNames: string[], currentValue?: string | null): SelectOption[] {
  const names = mergeDepartmentOptions(configuredNames);
  const current = currentValue?.trim();
  const all = current && !names.includes(current) ? [current, ...names] : names;
  return all.map((name) => ({ value: name, label: name }));
}

export function buildEmployeeEmailOptions(
  roster: RosterEntry[],
  opts?: {
    excludeEmail?: string | null;
    includeEmpty?: boolean;
    emptyLabel?: string;
    currentValue?: string | null;
  },
): SelectOption[] {
  const exclude = opts?.excludeEmail?.toLowerCase();
  const seen = new Set<string>();
  const options: SelectOption[] = [];
  if (opts?.includeEmpty) {
    options.push({ value: "", label: opts.emptyLabel ?? "— None —" });
  }
  const current = opts?.currentValue?.trim().toLowerCase();
  if (current && !roster.some((r) => r.email.toLowerCase() === current)) {
    options.push({ value: current, label: current });
    seen.add(current);
  }
  for (const r of roster) {
    const key = r.email.toLowerCase();
    if (seen.has(key) || (exclude && key === exclude)) continue;
    seen.add(key);
    options.push({ value: r.email, label: `${r.name} (${r.email})` });
  }
  return options;
}

export function buildReportsToOptions(
  roster: RosterEntry[],
  excludeEmail: string,
  currentValue?: string | null,
): SelectOption[] {
  return buildEmployeeEmailOptions(roster, {
    excludeEmail,
    includeEmpty: true,
    emptyLabel: "— None (CEO / top leadership) —",
    currentValue,
  });
}

/** For use with optional `SelectField` (which adds its own blank option). */
export function buildHeadEmailOptions(roster: RosterEntry[], currentValue?: string | null): SelectOption[] {
  return buildEmployeeEmailOptions(roster, { currentValue });
}

export function filterSubDepartmentsForDepartment(
  subDepartments: { id: string; name: string; departmentId: string }[],
  departmentRecords: { id: string; name: string }[],
  departmentName: string,
): { id: string; name: string; departmentId: string }[] {
  const deptId = departmentRecords.find((d) => d.name === departmentName)?.id;
  if (!deptId) return subDepartments;
  return subDepartments.filter((s) => s.departmentId === deptId);
}

export function buildSubDepartmentOptions(
  subDepartments: { id: string; name: string }[],
  currentValue?: string | null,
): SelectOption[] {
  const current = currentValue?.trim();
  const names = [...new Set(subDepartments.map((s) => s.name))];
  const all = current && !names.includes(current) ? [current, ...names] : names;
  return [{ value: "", label: "— None —" }, ...all.map((name) => ({ value: name, label: name }))];
}
