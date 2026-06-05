import type { BusinessUnit, BusinessUnitRecord, Employee } from "@/lib/store/types";

/** Return address for corporate card back, based on employee business unit. */
export function resolveCardReturnAddress(
  employee: Pick<Employee, "businessUnit">,
  businessUnits: BusinessUnitRecord[],
): string | null {
  const bu = employee.businessUnit;
  if (!bu) return null;
  const row = businessUnits.find((b) => b.name === bu);
  const addr = row?.cardReturnAddress?.trim();
  return addr || null;
}

export function businessUnitLabel(bu: BusinessUnit | null | undefined): string {
  if (bu === "UAE") return "UAE";
  if (bu === "Karachi") return "Karachi";
  if (bu === "Multan") return "Multan";
  return "Office";
}
