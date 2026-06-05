import type { EducationEntry } from "@/lib/store/types";

const EDUCATION_ROW_ERROR =
  "Education: enter degree, institution, and year for each row, or leave that row empty.";

/** Parse multi-row education fields (`eduDegree[]`, `eduInstitution[]`, `eduYear[]`). */
export function parseEducationFormRows(formData: FormData): { ok: true; entries: EducationEntry[] } | { ok: false; error: string } {
  const eduDegrees = formData.getAll("eduDegree").map((v) => String(v).trim());
  const eduInstitutions = formData.getAll("eduInstitution").map((v) => String(v).trim());
  const eduYears = formData.getAll("eduYear").map((v) => String(v).trim());
  const rowCount = Math.max(eduDegrees.length, eduInstitutions.length, eduYears.length);

  for (let i = 0; i < rowCount; i++) {
    const degree = eduDegrees[i] ?? "";
    const institution = eduInstitutions[i] ?? "";
    const year = eduYears[i] ?? "";
    const any = !!(degree || institution || year);
    const complete = !!(degree && institution && year);
    if (any && !complete) {
      return { ok: false, error: EDUCATION_ROW_ERROR };
    }
  }

  const entries = eduDegrees
    .map((degree, i) => ({
      degree,
      institution: eduInstitutions[i] ?? "",
      year: eduYears[i] ?? "",
    }))
    .filter((e) => e.degree && e.institution && e.year);

  return { ok: true, entries };
}

/** Legacy single-block fields — only when no multi-row education inputs were used. */
export function parseLegacyEducationFields(formData: FormData): {
  eduTitle: string;
  eduInstitute: string;
  eduYear: string;
} {
  const hasMultiRow = formData
    .getAll("eduDegree")
    .concat(formData.getAll("eduInstitution"), formData.getAll("eduYear"))
    .some((v) => String(v).trim());

  if (hasMultiRow) {
    return { eduTitle: "", eduInstitute: "", eduYear: "" };
  }

  return {
    eduTitle: String(formData.get("eduTitle") ?? "").trim(),
    eduInstitute: String(formData.get("eduInstitute") ?? "").trim(),
    eduYear: String(formData.get("eduYear") ?? "").trim(),
  };
}

export function firstEducationEntry(
  entries: EducationEntry[],
  legacy: { eduTitle: string; eduInstitute: string; eduYear: string },
): { title: string; institute: string; year: string } | null {
  if (entries.length > 0) {
    const first = entries[0]!;
    return { title: first.degree, institute: first.institution, year: first.year };
  }
  if (legacy.eduTitle && legacy.eduInstitute && legacy.eduYear) {
    return { title: legacy.eduTitle, institute: legacy.eduInstitute, year: legacy.eduYear };
  }
  return null;
}
