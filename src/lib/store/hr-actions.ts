"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { mutateStore, readStore } from "@/lib/store/persist";
import { createInitialStore } from "@/lib/store/seed";
import { createEmployeeAuth, sendFirebasePasswordResetEmail, syncEmployeeAuthIdentity } from "@/lib/firebase-auth";
import { hasExecAccess } from "@/lib/roles";
import {
  approvedLeaveDaysUsedInYear,
  buildAllocationsFromDefaults,
  getAllocatedDays,
  leaveDaysOverlappingYear,
  requestMatchesCategory,
} from "@/lib/leave-policy";
import { canDecideLeave } from "@/lib/store/policy";
import {
  BUSINESS_UNITS,
  currencyForBusinessUnit,
  type BusinessUnit,
  type CurrencyCode,
  type Employee,
  type EmploymentType,
  type Gender,
  type HrStore,
  type JobApplication,
  type LeaveStatus,
  type MaritalStatus,
} from "@/lib/store/types";
import {
  deleteStoredFile,
  deleteStoredFiles,
  emptyUploadsDir,
  isAllowedLibraryDocumentFile,
  isAllowedTrainingMaterialFile,
  saveFormDataFile,
} from "@/lib/uploads";

type ActionResult = { ok: true } | { error: string };

function ok(): ActionResult {
  return { ok: true };
}

function optionalTrimmedField(formData: FormData, key: string): string | null {
  const s = String(formData.get(key) ?? "").trim();
  return s || null;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function optionalBusinessUnit(formData: FormData, key: string): BusinessUnit | null {
  const v = String(formData.get(key) ?? "").trim();
  return (BUSINESS_UNITS as readonly string[]).includes(v) ? (v as BusinessUnit) : null;
}

function optionalGender(formData: FormData, key: string): Gender | null {
  const v = String(formData.get(key) ?? "").trim();
  return (["Male", "Female", "Other", "Prefer not to say"] as const).includes(v as Gender)
    ? (v as Gender)
    : null;
}

function optionalMaritalStatus(formData: FormData, key: string): MaritalStatus | null {
  const v = String(formData.get(key) ?? "").trim();
  return (["Single", "Married", "Divorced", "Widowed"] as const).includes(v as MaritalStatus)
    ? (v as MaritalStatus)
    : null;
}

function nextEmployeeIdDisplay(store: HrStore, override: string | null): string {
  if (override) return override;
  // Existing prefix-style IDs (KST-####) → bump highest #### by 1, default starting at 1001.
  let highest = 1000;
  for (const e of store.employees) {
    const m = /^KST-(\d{3,})$/i.exec(e.employeeIdDisplay ?? "");
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > highest) highest = n;
    }
  }
  return `KST-${highest + 1}`;
}

function audit(store: HrStore, actor: string, action: string): HrStore {
  const row = { at: new Date().toISOString(), actor, action, ip: "app" };
  return { ...store, audit: [row, ...store.audit].slice(0, 500) };
}

function probationDate(joiningDate: string, months: number): string {
  const dt = new Date(joiningDate);
  dt.setMonth(dt.getMonth() + months);
  return dt.toISOString().slice(0, 10);
}

export async function resetDemoData(): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can reset demo data." };
  await emptyUploadsDir();
  await mutateStore(() => ({ next: audit(createInitialStore(), session.email, "Reset demo dataset"), result: undefined }));
  revalidatePath("/", "layout");
  return ok();
}

/**
 * CEO-only: update a Firebase Auth user's `role` custom claim.
 * The target user must sign out and sign back in for the new role to take effect.
 */
export async function setEmployeeRole(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ceo") return { error: "Only the CEO can change user roles." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

  if (!email) return { error: "Email is required." };
  if (!["employee", "hr_admin", "ceo"].includes(role)) return { error: "Role must be employee, hr_admin, or ceo." };
  if (email === session.email.toLowerCase()) return { error: "You cannot change your own role." };

  try {
    const { getAdminAuth } = await import("@/lib/firebase-admin");
    const auth = getAdminAuth();
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
  } catch (e: any) {
    const code: string = e?.code ?? "";
    if (code === "auth/user-not-found") {
      return { error: `No Firebase Auth account found for ${email}. The employee must log in at least once first.` };
    }
    return { error: e?.message ?? "Failed to update Firebase role." };
  }

  await mutateStore((store) => ({
    next: audit(store, session.email, `Set Firebase role → ${role} for ${email}`),
    result: undefined,
  }));

  revalidatePath("/dashboard");
  return ok();
}

export async function addEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const name = String(formData.get("name") ?? "").trim();
  const fatherName = String(formData.get("fatherName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || "General";
  const location = String(formData.get("location") ?? "").trim();
  const businessUnit = optionalBusinessUnit(formData, "businessUnit");
  const employmentType = String(formData.get("employmentType") ?? "Permanent");
  const joiningDate = String(formData.get("joiningDate") ?? "").trim();
  const probationMonths = Number(formData.get("probationMonths") ?? "3");
  const reportsToEmail = String(formData.get("reportsToEmail") ?? "").trim().toLowerCase() || null;
  const companyPhone = String(formData.get("companyPhone") ?? "").trim();
  const personalPhone = String(formData.get("personalPhone") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactRelation = String(formData.get("emergencyContactRelation") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();
  const familyRelationName = String(formData.get("familyRelationName") ?? "").trim();
  const familyRelationType = String(formData.get("familyRelationType") ?? "").trim();
  const familyRelationFirm = String(formData.get("familyRelationFirm") ?? "").trim();
  const familyLinked = String(formData.get("familyLinked") ?? "no") === "yes";

  /** New identity / employment fields */
  const dateOfBirth = optionalTrimmedField(formData, "dateOfBirth");
  const gender = optionalGender(formData, "gender");
  const nationality = optionalTrimmedField(formData, "nationality");
  const secondNationality = optionalTrimmedField(formData, "secondNationality");
  const maritalStatus = optionalMaritalStatus(formData, "maritalStatus");
  const religion = optionalTrimmedField(formData, "religion");
  const cnicExpiry = optionalTrimmedField(formData, "cnicExpiry");
  const address = optionalTrimmedField(formData, "address");
  const designationNumber = optionalTrimmedField(formData, "designationNumber");
  const officialNumber = optionalTrimmedField(formData, "officialNumber");
  const dutyHours = optionalNumber(formData, "dutyHours");
  const dutyDays = optionalNumber(formData, "dutyDays");
  const hasCompanyVehicle = String(formData.get("hasCompanyVehicle") ?? "") === "1";
  const vehicleNumber = hasCompanyVehicle ? optionalTrimmedField(formData, "vehicleNumber") : null;
  const drivingLicenceNumber = hasCompanyVehicle
    ? optionalTrimmedField(formData, "drivingLicenceNumber")
    : null;
  const drivingLicenceExpiry = hasCompanyVehicle
    ? optionalTrimmedField(formData, "drivingLicenceExpiry")
    : null;

  const eduTitle = String(formData.get("eduTitle") ?? "").trim();
  const eduInstitute = String(formData.get("eduInstitute") ?? "").trim();
  const eduYear = String(formData.get("eduYear") ?? "").trim();
  const certTitle = String(formData.get("certTitle") ?? "").trim();
  const certIssuer = String(formData.get("certIssuer") ?? "").trim();
  const certYear = String(formData.get("certYear") ?? "").trim();
  const eduFile = formData.get("eduDocument");
  const certFile = formData.get("certDocument");
  const profilePhotoFile = formData.get("profilePhoto");
  const employeeIdDisplayOverride = optionalTrimmedField(formData, "employeeIdDisplay");
  const cnic = optionalTrimmedField(formData, "cnic");
  const eduFallbackName = optionalTrimmedField(formData, "eduAttachmentName");
  const certFallbackName = optionalTrimmedField(formData, "certAttachmentName");

  const eduAny = !!(
    eduTitle ||
    eduInstitute ||
    eduYear ||
    eduFallbackName ||
    (eduFile instanceof File && eduFile.size > 0)
  );
  const eduComplete = !!(eduTitle && eduInstitute && eduYear);
  if (eduAny && !eduComplete) {
    return { error: "Education: enter degree title, institution, and year together, or leave education fields empty." };
  }

  if (!name || !fatherName || !email || !title || !location || !joiningDate) return { error: "Fill required fields." };
  const probationCompletionDate = probationDate(joiningDate, Number.isFinite(probationMonths) ? probationMonths : 3);

  let eduSaved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  let certSaved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  let photoSaved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  try {
    if (eduFile instanceof File && eduFile.size > 0) {
      eduSaved = await saveFormDataFile(eduFile);
    }
    if (certFile instanceof File && certFile.size > 0) {
      certSaved = await saveFormDataFile(certFile);
    }
    if (profilePhotoFile instanceof File && profilePhotoFile.size > 0) {
      if (!isAllowedLibraryDocumentFile(profilePhotoFile)) {
        await deleteStoredFiles([eduSaved?.ref, certSaved?.ref]);
        return { error: "Profile photo: use PNG, JPG, or WebP." };
      }
      photoSaved = await saveFormDataFile(profilePhotoFile);
    }
  } catch (e: any) {
    await deleteStoredFiles([eduSaved?.ref, certSaved?.ref, photoSaved?.ref]);
    return { error: e?.message || "Could not save uploaded files." };
  }

  const eduAttachmentName = eduSaved?.originalName ?? eduFallbackName;
  const certAttachmentName = certSaved?.originalName ?? certFallbackName;

  // Create Firebase Auth user for the new employee
  let authResult;
  try {
    authResult = await createEmployeeAuth(email, name, "employee");
  } catch (e: any) {
    return { error: `Failed to create Firebase Auth user: ${e?.message || e}` };
  }
  const firebaseUid = authResult.uid;

  const salutationRaw = String(formData.get("salutation") ?? "").trim();
  const salutationOpts = ["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Prof."];
  const salutation = salutationOpts.includes(salutationRaw) ? (salutationRaw as Employee["salutation"]) : null;
  const subDepartment = optionalTrimmedField(formData, "subDepartment");

  // Multi-education rows: eduDegree[], eduInstitution[], eduYear[]
  const eduDegrees = formData.getAll("eduDegree").map((v) => String(v).trim()).filter(Boolean);
  const eduInstitutions = formData.getAll("eduInstitution").map((v) => String(v).trim());
  const eduYears = formData.getAll("eduYear").map((v) => String(v).trim());
  const educationEntries: Employee["education"] = eduDegrees.map((deg, i) => ({
    degree: deg,
    institution: eduInstitutions[i] ?? "",
    year: eduYears[i] ?? "",
  }));

  const hasGratuity = String(formData.get("hasGratuity") ?? "") === "1";
  const hasEobi = String(formData.get("hasEobi") ?? "") === "1";
  const hasProvidentFund = String(formData.get("hasProvidentFund") ?? "") === "1";

  const result = await mutateStore<ActionResult>((store) => {
    if (store.employees.some((e) => e.email.toLowerCase() === email)) return { next: store, result: { error: "Email already exists." } };
    const newAcademics: HrStore["academics"] = [];
    const newDocs: HrStore["documents"] = [];
    const auditExtras: string[] = [];
    if (!authResult.resetEmailSent) {
      auditExtras.push("password reset email not auto-sent");
    }

    if (eduComplete) {
      newAcademics.push({
        id: `ac-${randomUUID()}`,
        employeeEmail: email,
        type: "Degree",
        title: eduTitle,
        institute: eduInstitute,
        year: eduYear,
        attachmentName: eduAttachmentName,
        storedRef: eduSaved?.ref ?? null,
      });
      auditExtras.push("education record");
      if (eduAttachmentName) {
        newDocs.push({
          id: `doc-${randomUUID()}`,
          name: `Education · ${eduTitle} — ${eduAttachmentName}`,
          owner: "People Ops",
          sensitivity: "Internal",
          createdByEmail: session.email,
          employeeEmail: email,
          storedRef: eduSaved?.ref ?? null,
        });
        auditExtras.push("education document");
      }
    }

    if (certTitle) {
      newAcademics.push({
        id: `ac-${randomUUID()}`,
        employeeEmail: email,
        type: "Certification",
        title: certTitle,
        institute: certIssuer || "—",
        year: certYear || new Date().getFullYear().toString(),
        attachmentName: certAttachmentName,
        storedRef: certSaved?.ref ?? null,
      });
      auditExtras.push("certification");
      if (certAttachmentName) {
        newDocs.push({
          id: `doc-${randomUUID()}`,
          name: `Certification · ${certTitle} — ${certAttachmentName}`,
          owner: "People Ops",
          sensitivity: "Internal",
          createdByEmail: session.email,
          employeeEmail: email,
          storedRef: certSaved?.ref ?? null,
        });
        auditExtras.push("certification document");
      }
    }

    const newEmployee: Employee = {
      id: `emp-${randomUUID()}`,
      employeeIdDisplay: nextEmployeeIdDisplay(store, employeeIdDisplayOverride),
      salutation,
      name,
      fatherName,
      email,
      gender,
      dateOfBirth,
      nationality,
      secondNationality,
      maritalStatus,
      religion,
      cnic,
      cnicExpiry,
      address,
      title,
      designationNumber,
      officialNumber,
      location,
      businessUnit,
      status: "Active",
      department,
      subDepartment,
      employmentType: ["Permanent", "Temporary", "Contractual", "Intern", "Trainee"].includes(employmentType)
        ? (employmentType as EmploymentType)
        : "Permanent",
      joiningDate,
      probationMonths: Number.isFinite(probationMonths) ? probationMonths : 3,
      probationCompletionDate,
      dutyHours,
      dutyDays,
      companyPhone,
      personalPhone,
      emergencyContacts: emergencyContactName
        ? [{ name: emergencyContactName, relation: emergencyContactRelation || "Next of kin", phone: emergencyContactPhone }]
        : [],
      familyRelations: familyRelationName
        ? [
            {
              name: familyRelationName,
              relation: familyRelationType || "Relative",
              firmOrEmployer: familyRelationFirm || "N/A",
              linkedToTraderOrMerchandiser: familyLinked,
            },
          ]
        : [],
      reportsToEmail,
      hasCompanyVehicle,
      vehicleNumber,
      drivingLicenceNumber,
      drivingLicenceExpiry,
      licences: [],
      education: educationEntries,
      hasGratuity,
      hasEobi,
      hasProvidentFund,
      firebaseUid,
      photoStoredRef: photoSaved?.ref ?? null,
      compensation: null,
    };

    const year = new Date().getFullYear();
    const seedAllocations = buildAllocationsFromDefaults(store, [email], year);
    const allocKey = (a: { employeeEmail: string; categoryId: string; year: number }) =>
      `${a.employeeEmail.toLowerCase()}:${a.categoryId}:${a.year}`;
    const allocMap = new Map(store.employeeLeaveAllocations.map((a) => [allocKey(a), a]));
    for (const row of seedAllocations) {
      allocMap.set(allocKey(row), row);
    }

    const next: HrStore = {
      ...store,
      employees: [...store.employees, newEmployee],
      employeeLeaveAllocations: [...allocMap.values()],
      academics: [...newAcademics, ...store.academics],
      documents: [...newDocs, ...store.documents],
    };
    const note = auditExtras.length ? ` (${auditExtras.join(", ")})` : "";
    return { next: audit(next, session.email, `Created employee ${email}${note}`), result: ok() };
  });
  if ("error" in result) {
    await deleteStoredFiles([eduSaved?.ref, certSaved?.ref, photoSaved?.ref]);
    return result;
  }
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/documents");
  return ok();
}



export async function updateEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const fatherName = String(formData.get("fatherName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || "General";
  const status = String(formData.get("status") ?? "") as "Active" | "On leave" | "Offboarding" | "Separated";
  const reportsToEmailRaw = String(formData.get("reportsToEmail") ?? "").trim();
  const reportsToEmail = reportsToEmailRaw ? reportsToEmailRaw.toLowerCase() : null;
  const employmentTypeRaw = String(formData.get("employmentType") ?? "Permanent");
  const employmentType: EmploymentType = ["Permanent", "Temporary", "Contractual", "Intern", "Trainee"].includes(employmentTypeRaw)
    ? (employmentTypeRaw as EmploymentType)
    : "Permanent";
  const joiningDate = String(formData.get("joiningDate") ?? "").trim();
  const probationMonthsRaw = Number(formData.get("probationMonths") ?? "3");
  const probationMonths = Number.isFinite(probationMonthsRaw) ? Math.max(0, probationMonthsRaw) : 3;
  const businessUnit = optionalBusinessUnit(formData, "businessUnit");
  const employeeIdDisplay = optionalTrimmedField(formData, "employeeIdDisplay");
  const cnic = optionalTrimmedField(formData, "cnic");
  const cnicExpiry = optionalTrimmedField(formData, "cnicExpiry");
  const dateOfBirth = optionalTrimmedField(formData, "dateOfBirth");
  const gender = optionalGender(formData, "gender");
  const nationality = optionalTrimmedField(formData, "nationality");
  const secondNationality = optionalTrimmedField(formData, "secondNationality");
  const maritalStatus = optionalMaritalStatus(formData, "maritalStatus");
  const religion = optionalTrimmedField(formData, "religion");
  const address = optionalTrimmedField(formData, "address");
  const designationNumber = optionalTrimmedField(formData, "designationNumber");
  const officialNumber = optionalTrimmedField(formData, "officialNumber");
  const dutyHours = optionalNumber(formData, "dutyHours");
  const dutyDays = optionalNumber(formData, "dutyDays");
  const hasCompanyVehicle = String(formData.get("hasCompanyVehicle") ?? "") === "1";
  const vehicleNumber = hasCompanyVehicle ? optionalTrimmedField(formData, "vehicleNumber") : null;
  const drivingLicenceNumber = hasCompanyVehicle ? optionalTrimmedField(formData, "drivingLicenceNumber") : null;
  const drivingLicenceExpiry = hasCompanyVehicle ? optionalTrimmedField(formData, "drivingLicenceExpiry") : null;
  const clearPhoto = String(formData.get("clearProfilePhoto") ?? "") === "1";
  const photoFile = formData.get("profilePhoto");
  const salutationRaw2 = String(formData.get("salutation") ?? "").trim();
  const salutationOpts2 = ["Mr.", "Mrs.", "Ms.", "Dr.", "Eng.", "Prof."];
  const salutation2 = salutationOpts2.includes(salutationRaw2) ? (salutationRaw2 as Employee["salutation"]) : null;
  const subDepartment2 = optionalTrimmedField(formData, "subDepartment");
  const hasGratuity2 = String(formData.get("hasGratuity") ?? "") === "1";
  const hasEobi2 = String(formData.get("hasEobi") ?? "") === "1";
  const hasProvidentFund2 = String(formData.get("hasProvidentFund") ?? "") === "1";
  const companyPhone = String(formData.get("companyPhone") ?? "").trim();
  const personalPhone = String(formData.get("personalPhone") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactRelation = String(formData.get("emergencyContactRelation") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();
  const familyRelationName = String(formData.get("familyRelationName") ?? "").trim();
  const familyRelationType = String(formData.get("familyRelationType") ?? "").trim();
  const familyRelationFirm = String(formData.get("familyRelationFirm") ?? "").trim();
  const familyLinked = String(formData.get("familyLinked") ?? "no") === "yes";

  if (!id || !name || !fatherName || !email || !title || !location || !joiningDate) return { error: "Missing fields." };
  if (!["Active", "On leave", "Offboarding", "Separated"].includes(status)) return { error: "Invalid status." };

  const snapshot = await readStore();
  const current = snapshot.employees.find((e) => e.id === id);
  if (!current) return { error: "Not found." };
  if (snapshot.employees.some((e) => e.id !== id && e.email.toLowerCase() === email)) {
    return { error: "Email already exists." };
  }
  const prevEmail = current.email.toLowerCase();
  try {
    await syncEmployeeAuthIdentity(current.email, email, name);
  } catch (e: any) {
    const code = typeof e?.code === "string" ? e.code : "";
    if (code === "auth/email-already-exists") return { error: "This email is already used by another Firebase Auth account." };
    if (code === "auth/user-not-found") return { error: "Employee Auth account not found; ask admin to re-create account access." };
    return { error: e?.message || "Could not update Firebase login identity." };
  }

  let nextPhotoRef = current.photoStoredRef;
  let uploadedRef: string | null = null;
  try {
    if (photoFile instanceof File && photoFile.size > 0) {
      if (!isAllowedLibraryDocumentFile(photoFile)) return { error: "Profile photo: use PNG, JPG, or WebP." };
      const saved = await saveFormDataFile(photoFile);
      if (saved) {
        uploadedRef = saved.ref;
        nextPhotoRef = saved.ref;
      }
    }
    if (clearPhoto) {
      nextPhotoRef = null;
    }
  } catch (e: any) {
    await deleteStoredFile(uploadedRef);
    return { error: e?.message || "Could not save profile photo." };
  }

  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.employees.findIndex((e) => e.id === id);
    if (idx < 0) return { next: store, result: { error: "Not found." } };
    const prev = store.employees[idx];
    if (!prev) return { next: store, result: { error: "Not found." } };
    const replacingEmail = prev.email.toLowerCase();
    const emergencyContacts: Employee["emergencyContacts"] = emergencyContactName
      ? [{ name: emergencyContactName, relation: emergencyContactRelation || "Next of kin", phone: emergencyContactPhone }]
      : [];
    const familyRelations: Employee["familyRelations"] = familyRelationName
      ? [
          {
            name: familyRelationName,
            relation: familyRelationType || "Relative",
            firmOrEmployer: familyRelationFirm || "N/A",
            linkedToTraderOrMerchandiser: familyLinked,
          },
        ]
      : [];
    const copy = structuredClone(store.employees);
    copy[idx] = {
      ...prev,
      salutation: salutation2,
      name,
      fatherName,
      email,
      title,
      location,
      department,
      subDepartment: subDepartment2,
      status,
      reportsToEmail,
      employmentType,
      joiningDate,
      probationMonths,
      probationCompletionDate: probationDate(joiningDate, probationMonths),
      businessUnit,
      employeeIdDisplay,
      cnic,
      cnicExpiry,
      dateOfBirth,
      gender,
      nationality,
      secondNationality,
      maritalStatus,
      religion,
      address,
      designationNumber,
      officialNumber,
      dutyHours,
      dutyDays,
      companyPhone,
      personalPhone,
      emergencyContacts,
      familyRelations,
      hasCompanyVehicle,
      vehicleNumber,
      drivingLicenceNumber,
      drivingLicenceExpiry,
      hasGratuity: hasGratuity2,
      hasEobi: hasEobi2,
      hasProvidentFund: hasProvidentFund2,
      photoStoredRef: nextPhotoRef,
    };
    const nextEmail = email.toLowerCase();
    const mapEmail = (v: string | null | undefined): string | null =>
      !v ? null : v.toLowerCase() === replacingEmail ? email : v;
    const next: HrStore = {
      ...store,
      employees: copy,
      documents: store.documents.map((d) => ({ ...d, employeeEmail: mapEmail(d.employeeEmail) })),
      academics: store.academics.map((a) => ({
        ...a,
        employeeEmail: a.employeeEmail.toLowerCase() === replacingEmail ? email : a.employeeEmail,
      })),
      policyAcknowledgements: store.policyAcknowledgements.map((a) => ({
        ...a,
        employeeEmail: a.employeeEmail.toLowerCase() === replacingEmail ? email : a.employeeEmail,
      })),
      training: store.training.map((t) => ({
        ...t,
        assigneeEmail: t.assigneeEmail.toLowerCase() === replacingEmail ? email : t.assigneeEmail,
        attendedEmails: (t.attendedEmails ?? []).map((ae) => (ae.toLowerCase() === replacingEmail ? email : ae)),
      })),
      goals: store.goals.map((g) => ({
        ...g,
        ownerEmail: g.ownerEmail.toLowerCase() === replacingEmail ? email : g.ownerEmail,
      })),
      reviews: store.reviews.map((r) => ({
        ...r,
        employeeEmail: r.employeeEmail.toLowerCase() === replacingEmail ? email : r.employeeEmail,
      })),
      payrollEntries: store.payrollEntries.map((p) => ({
        ...p,
        employeeEmail: p.employeeEmail.toLowerCase() === replacingEmail ? email : p.employeeEmail,
      })),
      leaveRequests: store.leaveRequests.map((r) => ({
        ...r,
        requesterEmail: r.requesterEmail.toLowerCase() === replacingEmail ? email : r.requesterEmail,
      })),
      transfers: store.transfers.map((t) => ({
        ...t,
        employeeEmail: t.employeeEmail.toLowerCase() === replacingEmail ? email : t.employeeEmail,
      })),
      letters: store.letters.map((l) => ({
        ...l,
        employeeEmail: l.employeeEmail.toLowerCase() === replacingEmail ? email : l.employeeEmail,
      })),
      employeeLeaveAllocations: store.employeeLeaveAllocations.map((a) => ({
        ...a,
        employeeEmail: a.employeeEmail.toLowerCase() === replacingEmail ? email : a.employeeEmail,
      })),
      coiSubmissions: store.coiSubmissions.map((c) => ({
        ...c,
        employeeEmail: c.employeeEmail.toLowerCase() === replacingEmail ? email : c.employeeEmail,
      })),
    };
    return { next: audit(next, session.email, `Updated employee ${copy[idx].email}`), result: ok() };
  });
  if ("error" in result) {
    await deleteStoredFile(uploadedRef);
    return result;
  }
  if (current.photoStoredRef && current.photoStoredRef !== nextPhotoRef) {
    await deleteStoredFile(current.photoStoredRef);
  }
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return ok();
}

export async function resendEmployeePasswordReset(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing employee." };

  const snapshot = await readStore();
  const emp = snapshot.employees.find((e) => e.id === id);
  if (!emp) return { error: "Employee not found." };

  const sent = await sendFirebasePasswordResetEmail(emp.email);
  if (!sent) {
    return { error: "Could not trigger password reset email. Verify Firebase API key/configuration." };
  }

  await mutateStore((store) => ({
    next: audit(store, session.email, `Sent password reset email to ${emp.email}`),
    result: ok(),
  }));
  revalidatePath("/employees");
  return ok();
}

export async function deleteEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const snapshot = await readStore();
  const victim = snapshot.employees.find((e) => e.id === id);
  if (!victim) return { error: "Not found." };
  const emailLower = victim.email.toLowerCase();
  const refSet = new Set<string>();
  if (victim.photoStoredRef) refSet.add(victim.photoStoredRef);
  for (const d of snapshot.documents) {
    if ((d.employeeEmail?.toLowerCase() ?? "") === emailLower && d.storedRef) refSet.add(d.storedRef);
  }
  for (const a of snapshot.academics) {
    if (a.employeeEmail.toLowerCase() === emailLower && a.storedRef) refSet.add(a.storedRef);
  }
  for (const t of snapshot.training) {
    if (t.assigneeEmail.toLowerCase() === emailLower && t.trainingMaterialStoredRef) {
      refSet.add(t.trainingMaterialStoredRef);
    }
  }

  const result = await mutateStore<ActionResult>((store) => {
    const v2 = store.employees.find((e) => e.id === id);
    if (!v2) return { next: store, result: { error: "Not found." } };
    const em = v2.email.toLowerCase();
    const next: HrStore = {
      ...store,
      employees: store.employees.filter((e) => e.id !== id),
      documents: store.documents.filter((d) => (d.employeeEmail?.toLowerCase() ?? "") !== em),
      academics: store.academics.filter((a) => a.employeeEmail.toLowerCase() !== em),
      policyAcknowledgements: store.policyAcknowledgements.filter((a) => a.employeeEmail.toLowerCase() !== em),
      training: store.training.filter((t) => t.assigneeEmail.toLowerCase() !== em),
      goals: store.goals.filter((g) => g.ownerEmail.toLowerCase() !== em),
      reviews: store.reviews.filter((r) => r.employeeEmail.toLowerCase() !== em),
      payrollEntries: store.payrollEntries.filter((p) => p.employeeEmail.toLowerCase() !== em),
      leaveRequests: store.leaveRequests.filter((r) => r.requesterEmail.toLowerCase() !== em),
    };
    return { next: audit(next, session.email, `Deleted employee ${v2.email}`), result: ok() };
  });
  if ("error" in result) return result;
  await deleteStoredFiles([...refSet]);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/training");
  return ok();
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  if (!["employee", "hr_admin", "ceo"].includes(session.role)) return { error: "Role not allowed." };
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const kindRaw = String(formData.get("kind") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  const end = String(formData.get("end") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if ((!categoryId && !kindRaw) || !start || !end) return { error: "Fill required fields." };

  const store = await readStore();
  const category = categoryId ? store.leaveCategories.find((c) => c.id === categoryId && c.isActive) : null;
  const kind = category?.name ?? kindRaw;
  if (!kind) return { error: "Select a leave type." };

  const year = new Date(start).getFullYear();
  const requestedDays = leaveDaysOverlappingYear(start, end, year);

  if (category && requestedDays > 0) {
    const allocated = getAllocatedDays(store, session.email, category.id, year);
    const used = approvedLeaveDaysUsedInYear(store.leaveRequests, session.email, category, year);
    let pending = 0;
    for (const r of store.leaveRequests) {
      if (r.requesterEmail.toLowerCase() !== session.email.toLowerCase()) continue;
      if (r.status !== "PendingHR" && r.status !== "PendingCEO") continue;
      if (!requestMatchesCategory(r, category)) continue;
      pending += leaveDaysOverlappingYear(r.start, r.end, year);
    }
    if (used + pending + requestedDays > allocated) {
      return {
        error: `Insufficient ${category.name} balance. Allocated: ${allocated}, used: ${used}, pending: ${pending}, requested: ${requestedDays}.`,
      };
    }
  }

  await mutateStore((s) => {
    const requester = s.employees.find((e) => e.email.toLowerCase() === session.email.toLowerCase());
    const isDirectCeoReport = !!requester?.reportsToEmail && requester.reportsToEmail.toLowerCase() === "ceo@kastros.demo";
    const status: LeaveStatus = isDirectCeoReport || session.role === "ceo" ? "PendingCEO" : "PendingHR";
    const next: HrStore = {
      ...s,
      leaveRequests: [
        {
          id: `lv-${randomUUID()}`,
          requesterEmail: session.email,
          kind,
          categoryId: category?.id ?? null,
          start,
          end,
          status,
          decidedByEmail: null,
          hrDecisionByEmail: null,
          ceoDecisionByEmail: null,
          note,
        },
        ...s.leaveRequests,
      ],
    };
    return { next: audit(next, session.email, `Requested leave (${kind})`), result: ok() };
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return ok();
}

export async function decideLeaveRequest(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "") as "Approved" | "Denied";
  if (!id || !["Approved", "Denied"].includes(decision)) return { error: "Invalid request." };
  const store = await readStore();
  const req = store.leaveRequests.find((r) => r.id === id);
  if (!req) return { error: "Not found." };

  await mutateStore((s) => {
    const nextReq: HrStore["leaveRequests"] = s.leaveRequests.map((r) => {
      if (r.id !== id) return r;
      if (r.status === "PendingHR") {
        if (!hasExecAccess(session.role) || !canDecideLeave(store, session, r.requesterEmail)) return r;
        if (decision === "Denied") return { ...r, status: "Denied" as LeaveStatus, decidedByEmail: session.email, hrDecisionByEmail: session.email };
        return { ...r, status: "PendingCEO", hrDecisionByEmail: session.email, decidedByEmail: session.email };
      }
      if (r.status === "PendingCEO") {
        if (!hasExecAccess(session.role)) return r;
        return { ...r, status: decision as LeaveStatus, ceoDecisionByEmail: session.email, decidedByEmail: session.email };
      }
      return r;
    });
    const changed = nextReq.find((r) => r.id === id);
    if (!changed || changed.status === req.status) return { next: s, result: { error: "You do not have permission for this step." } };
    return { next: audit({ ...s, leaveRequests: nextReq }, session.email, `${decision} leave ${id}`), result: ok() };
  });
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return ok();
}

export async function addAcademicRecord(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  const type = String(formData.get("type") ?? "Degree");
  const title = String(formData.get("title") ?? "").trim();
  const institute = String(formData.get("institute") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  let attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!employeeEmail || !title || !institute) return { error: "Missing fields." };
  const recordType = type === "Certification" ? "Certification" : "Degree";

  const attachmentFile = formData.get("attachmentFile");
  let storedRef: string | null = null;
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    if (!isAllowedLibraryDocumentFile(attachmentFile)) {
      return { error: "File type not allowed. Use PDF, Word, PowerPoint, or an image (PNG, JPG, WebP)." };
    }
    try {
      const saved = await saveFormDataFile(attachmentFile);
      if (saved) {
        storedRef = saved.ref;
        attachmentName = attachmentName || saved.originalName;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save uploaded file.";
      return { error: msg };
    }
  }

  const result = await mutateStore<ActionResult>((store) => {
    const employee = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!employee) return { next: store, result: { error: "Employee not found." } };
    const newDocs: HrStore["documents"] = [];
    if (storedRef && attachmentName) {
      newDocs.push({
        id: `doc-${randomUUID()}`,
        name: `${recordType} · ${title} — ${attachmentName}`,
        owner: "People Ops",
        sensitivity: "Internal",
        createdByEmail: session.email,
        employeeEmail: employee.email,
        storedRef,
      });
    }
    return {
      next: audit(
        {
          ...store,
          academics: [
            ...store.academics,
            {
              id: `ac-${randomUUID()}`,
              employeeEmail: employee.email,
              type: recordType,
              title,
              institute,
              year,
              attachmentName,
              storedRef,
            },
          ],
          documents: [...newDocs, ...store.documents],
        },
        session.email,
        `Added ${recordType} record for ${employeeEmail}`,
      ),
      result: ok(),
    };
  });
  if ("error" in result) {
    await deleteStoredFile(storedRef);
    return result;
  }
  revalidatePath("/employees");
  revalidatePath("/documents");
  revalidatePath("/training");
  return ok();
}

export async function deleteAcademicRecord(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const snapshot = await readStore();
  const row = snapshot.academics.find((a) => a.id === id);
  if (!row) return { error: "Not found." };
  const ref = row.storedRef;
  await mutateStore((store) => ({
    next: audit({ ...store, academics: store.academics.filter((a) => a.id !== id) }, session.email, `Removed academic record ${id}`),
    result: ok(),
  }));
  await deleteStoredFile(ref);
  revalidatePath("/employees");
  revalidatePath("/documents");
  return ok();
}

export async function addTrainingRow(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can assign training." };
  const assigneeEmail = String(formData.get("assigneeEmail") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const provider = String(formData.get("provider") ?? "Internal") === "External" ? "External" : "Internal";
  const providerName =
    provider === "Internal"
      ? "Kastros HR"
      : (() => {
          const pn = String(formData.get("providerName") ?? "").trim();
          return pn || "";
        })();
  if (provider === "External" && !providerName) return { error: "Enter the external provider name (e.g. Udemy, Coursera)." };
  const due = String(formData.get("due") ?? "").trim();
  const materialFile = formData.get("trainingMaterialFile");
  let trainingMaterialStoredRef: string | null = null;
  let trainingMaterialOriginalName: string | null = null;
  let trainingMaterialPptx = String(formData.get("trainingMaterialPptx") ?? "").trim() || null;

  if (materialFile instanceof File && materialFile.size > 0) {
    if (!isAllowedTrainingMaterialFile(materialFile)) {
      return { error: "Training material must be a .pdf, .pptx, or .ppt file." };
    }
    try {
      const saved = await saveFormDataFile(materialFile);
      if (saved) {
        trainingMaterialStoredRef = saved.ref;
        trainingMaterialOriginalName = saved.originalName;
        trainingMaterialPptx = null;
      }
    } catch (e: any) {
      return { error: e?.message || "Could not save uploaded file." };
    }
  }

  if (!assigneeEmail || !name || !due) return { error: "Fill required fields." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        training: [
          {
            id: `tr-${randomUUID()}`,
            assigneeEmail,
            name,
            provider,
            providerName,
            trainingMaterialPptx,
            trainingMaterialStoredRef,
            trainingMaterialOriginalName,
            attendedEmails: [],
            due,
            status: "Required",
          },
          ...store.training,
        ],
      },
      session.email,
      `Assigned training "${name}"`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function setTrainingStatus(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "Required" | "Done";
  if (!id || !["Required", "Done"].includes(status)) return { error: "Invalid." };
  const store = await readStore();
  const row = store.training.find((t) => t.id === id);
  if (!row) return { error: "Not found." };
  const self = row.assigneeEmail.toLowerCase() === session.email.toLowerCase();
  const exec = hasExecAccess(session.role);
  if (!exec && !self) return { error: "Forbidden." };
  await mutateStore((s) => ({
    next: audit(
      { ...s, training: s.training.map((t) => (t.id === id ? { ...t, status } : t)) },
      session.email,
      `Training ${id} -> ${status}`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function markTrainingAttendance(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can mark attendance." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const attendedRaw = formData.getAll("attended").map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  const store = await readStore();
  const row = store.training.find((t) => t.id === id);
  if (!row) return { error: "Not found." };
  const allowed = new Set(store.employees.map((e) => e.email.toLowerCase()));
  const attendedEmails = [...new Set(attendedRaw)].filter((e) => allowed.has(e));
  await mutateStore((s) => ({
    next: audit(
      {
        ...s,
        training: s.training.map((t) =>
          t.id === id ? { ...t, attendedEmails } : t,
        ),
      },
      session.email,
      `Training attendance ${id}: ${attendedEmails.length} people`,
    ),
    result: ok(),
  }));
  revalidatePath("/training");
  return ok();
}

export async function createJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim() || "Applied";
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title || !location) return { error: "Fill required fields." };
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        jobs: [{ id: `job-${randomUUID()}`, title, location, stage, applicantCount: 0, description }, ...store.jobs],
      },
      session.email,
      `Created job ${title}`,
    ),
    result: ok(),
  }));
  revalidatePath("/recruiting");
  return ok();
}

export async function deleteJob(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const storeBefore = await readStore();
  const refs = storeBefore.jobApplications.filter((a) => a.jobId === id).map((a) => a.cvStoredRef);
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        jobs: store.jobs.filter((j) => j.id !== id),
        jobApplications: store.jobApplications.filter((a) => a.jobId !== id),
      },
      session.email,
      `Deleted job ${id}`,
    ),
    result: ok(),
  }));
  await deleteStoredFiles(refs);
  revalidatePath("/recruiting");
  return ok();
}

const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function approveJobApplication(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing application." };

  const result = await mutateStore<ActionResult>((store) => {
    const idx = store.jobApplications.findIndex((a) => a.id === id);
    if (idx < 0) return { next: store, result: { error: "Application not found." } };
    const app = store.jobApplications[idx];
    if (!app) return { next: store, result: { error: "Application not found." } };
    if (app.reviewStatus === "approved") return { next: store, result: { error: "Already approved." } };
    const nextApps = [...store.jobApplications];
    nextApps[idx] = { ...app, reviewStatus: "approved" };
    return {
      next: audit({ ...store, jobApplications: nextApps }, session.email, `Approved candidate ${app.fullName} (${id})`),
      result: ok(),
    };
  });

  revalidatePath("/recruiting");
  revalidatePath("/onboarding");
  return result;
}

export async function submitJobApplication(formData: FormData): Promise<ActionResult> {
  const jobId = String(formData.get("jobId") ?? "").trim();
  const fullName = String(formData.get("name") ?? formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fatherName = String(formData.get("fatherName") ?? "").trim();
  const roleTitle = String(formData.get("title") ?? "").trim();
  const intakeDepartment = String(formData.get("department") ?? "").trim();
  const intakeLocation = String(formData.get("location") ?? "").trim();
  const employmentTypeRaw = String(formData.get("employmentType") ?? "Permanent");
  const intakeJoiningDate = String(formData.get("joiningDate") ?? "").trim();
  const intakeProbationMonths = Number(formData.get("probationMonths") ?? "3");
  const companyPhone = String(formData.get("companyPhone") ?? "").trim();
  const phone = String(formData.get("personalPhone") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactRelation = String(formData.get("emergencyContactRelation") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();
  const familyRelationName = String(formData.get("familyRelationName") ?? "").trim();
  const familyRelationType = String(formData.get("familyRelationType") ?? "").trim();
  const familyRelationFirm = String(formData.get("familyRelationFirm") ?? "").trim();
  const familyLinked = String(formData.get("familyLinked") ?? "no") === "yes";
  const reportsToEmail = String(formData.get("reportsToEmail") ?? "").trim().toLowerCase() || null;

  const eduTitle = String(formData.get("eduTitle") ?? "").trim();
  const eduInstitute = String(formData.get("eduInstitute") ?? "").trim();
  const eduYear = String(formData.get("eduYear") ?? "").trim();
  const certTitle = String(formData.get("certTitle") ?? "").trim();
  const certIssuer = String(formData.get("certIssuer") ?? "").trim();
  const certYear = String(formData.get("certYear") ?? "").trim();
  const eduFile = formData.get("eduDocument");
  const certFile = formData.get("certDocument");

  const linkedIn = optionalTrimmedField(formData, "linkedIn");
  const currentCompany = optionalTrimmedField(formData, "currentCompany");
  const yearsExperience = optionalTrimmedField(formData, "yearsExperience");
  const salaryExpectation = optionalTrimmedField(formData, "salaryExpectation");
  const noticePeriod = optionalTrimmedField(formData, "noticePeriod");
  const coverLetter = optionalTrimmedField(formData, "coverLetter");

  if (!jobId || !fullName || !email || !phone) return { error: "Please complete all required fields." };

  const employmentType: EmploymentType | null = ["Permanent", "Temporary", "Contractual", "Intern"].includes(employmentTypeRaw)
    ? (employmentTypeRaw as EmploymentType)
    : null;
  if (!employmentType) return { error: "Invalid employment type." };

  const eduDegrees = formData.getAll("eduDegree").map((v) => String(v).trim());
  const eduInstitutions = formData.getAll("eduInstitution").map((v) => String(v).trim());
  const eduYears = formData.getAll("eduYear").map((v) => String(v).trim());
  for (let i = 0; i < Math.max(eduDegrees.length, eduInstitutions.length, eduYears.length); i++) {
    const deg = eduDegrees[i] ?? "";
    const inst = eduInstitutions[i] ?? "";
    const year = eduYears[i] ?? "";
    const any = !!(deg || inst || year);
    const complete = !!(deg && inst && year);
    if (any && !complete) {
      return { error: "Education: enter degree title, institution, and year together, or leave education fields empty." };
    }
  }
  const educationEntries = eduDegrees
    .map((degree, i) => ({
      degree,
      institution: eduInstitutions[i] ?? "",
      year: eduYears[i] ?? "",
    }))
    .filter((e) => e.degree && e.institution && e.year);
  const firstEduIdx = eduDegrees.findIndex((deg, i) => !!(deg && (eduInstitutions[i] ?? "") && (eduYears[i] ?? "")));
  const normalizedEduTitle = firstEduIdx >= 0 ? eduDegrees[firstEduIdx]! : eduTitle;
  const normalizedEduInstitute = firstEduIdx >= 0 ? eduInstitutions[firstEduIdx]! : eduInstitute;
  const normalizedEduYear = firstEduIdx >= 0 ? eduYears[firstEduIdx]! : eduYear;
  const eduAny = !!(
    normalizedEduTitle ||
    normalizedEduInstitute ||
    normalizedEduYear ||
    (eduFile instanceof File && eduFile.size > 0)
  );
  const eduComplete = !!(normalizedEduTitle && normalizedEduInstitute && normalizedEduYear);
  if (eduAny && !eduComplete) {
    return { error: "Education: enter degree title, institution, and year together, or leave education fields empty." };
  }

  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: "Please upload your CV (PDF or Word)." };
  if (file.size > CV_MAX_BYTES) return { error: "CV must be 5MB or smaller." };
  if (file.type && !CV_TYPES.has(file.type)) return { error: "CV must be a PDF or Word document." };

  const saved = await saveFormDataFile(file);
  if (!saved) return { error: "Could not upload file." };

  let eduSaved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  let certSaved: Awaited<ReturnType<typeof saveFormDataFile>> = null;
  try {
    if (eduFile instanceof File && eduFile.size > 0) {
      eduSaved = await saveFormDataFile(eduFile);
    }
    if (certFile instanceof File && certFile.size > 0) {
      certSaved = await saveFormDataFile(certFile);
    }
  } catch (e: any) {
    await deleteStoredFiles([saved?.ref, eduSaved?.ref, certSaved?.ref]);
    return { error: e?.message || "Could not save uploaded files." };
  }

  const eduAttachmentName = eduSaved?.originalName ?? null;
  const certAttachmentName = certSaved?.originalName ?? null;

  const result = await mutateStore<ActionResult>((store) => {
    const job = store.jobs.find((j) => j.id === jobId);
    if (!job) {
      void deleteStoredFile(saved.ref);
      void deleteStoredFiles([eduSaved?.ref, certSaved?.ref]);
      return { next: store, result: { error: "This role is no longer available." } };
    }

    const row: JobApplication = {
      id: `ja-${randomUUID()}`,
      jobId,
      fullName,
      email,
      phone,
      linkedIn,
      currentCompany,
      yearsExperience,
      salaryExpectation,
      noticePeriod,
      coverLetter,
      cvStoredRef: saved.ref,
      cvOriginalName: saved.originalName,
      submittedAt: new Date().toISOString(),
      reviewStatus: "submitted",
      fatherName: fatherName || null,
      roleTitle: roleTitle || null,
      intakeDepartment: intakeDepartment || null,
      intakeLocation: intakeLocation || null,
      employmentType,
      intakeJoiningDate: intakeJoiningDate || null,
      intakeProbationMonths: Number.isFinite(intakeProbationMonths) ? intakeProbationMonths : 3,
      companyPhone: companyPhone || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactRelation: emergencyContactRelation || null,
      emergencyContactPhone: emergencyContactPhone || null,
      familyRelationName: familyRelationName || null,
      familyRelationType: familyRelationType || null,
      familyRelationFirm: familyRelationFirm || null,
      familyLinked,
      reportsToEmail,
      educationEntries,
      eduTitle: normalizedEduTitle || null,
      eduInstitute: normalizedEduInstitute || null,
      eduYear: normalizedEduYear || null,
      eduStoredRef: eduSaved?.ref ?? null,
      eduAttachmentName,
      certTitle: certTitle || null,
      certIssuer: certIssuer || null,
      certYear: certYear || null,
      certStoredRef: certSaved?.ref ?? null,
      certAttachmentName,
    };

    return {
      next: audit(
        {
          ...store,
          jobApplications: [row, ...store.jobApplications],
          jobs: store.jobs.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j)),
        },
        "careers.kastros",
        `Application: ${fullName} → ${job.title} (${jobId})`,
      ),
      result: ok(),
    };
  });

  if ("error" in result) {
    await deleteStoredFiles([saved.ref, eduSaved?.ref, certSaved?.ref]);
    return result;
  }

  revalidatePath("/recruiting");
  revalidatePath(`/apply/${jobId}`);
  return result;
}

export async function addDocument(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const name = String(formData.get("name") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const sensitivity = String(formData.get("sensitivity") ?? "").trim() || "Internal";
  const employeeEmailRaw = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  if (!name || !owner) return { error: "Fill required fields." };

  const upload = formData.get("documentFile");
  let storedRef: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    if (!isAllowedLibraryDocumentFile(upload)) {
      return { error: "File type not allowed. Use PDF, Word, PowerPoint, or an image (PNG, JPG, WebP)." };
    }
    try {
      const saved = await saveFormDataFile(upload);
      if (saved) storedRef = saved.ref;
    } catch {
      return { error: "Could not save uploaded file." };
    }
  }

  const result = await mutateStore<ActionResult>((store) => {
    let employeeEmail: string | null = null;
    if (employeeEmailRaw) {
      const match = store.employees.find((e) => e.email.toLowerCase() === employeeEmailRaw);
      if (!match) return { next: store, result: { error: "Employee email for document link must match a current employee." } };
      employeeEmail = match.email;
    }
    return {
      next: audit(
        {
          ...store,
          documents: [
            {
              id: `doc-${randomUUID()}`,
              name,
              owner,
              sensitivity,
              createdByEmail: session.email,
              employeeEmail,
              storedRef,
            },
            ...store.documents,
          ],
        },
        session.email,
        `Registered document: ${name}${employeeEmail ? ` (${employeeEmail})` : " (company-wide)"}${storedRef ? " with file" : ""}`,
      ),
      result: ok(),
    };
  });
  if ("error" in result) {
    await deleteStoredFile(storedRef);
    return result;
  }
  revalidatePath("/documents");
  revalidatePath("/employees");
  return ok();
}

export async function deleteDocument(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can delete documents." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const snapshot = await readStore();
  const ref = snapshot.documents.find((d) => d.id === id)?.storedRef ?? null;
  await mutateStore((store) => ({
    next: audit({ ...store, documents: store.documents.filter((d) => d.id !== id) }, session.email, `Deleted document ${id}`),
    result: ok(),
  }));
  await deleteStoredFile(ref);
  revalidatePath("/documents");
  revalidatePath("/employees");
  return ok();
}

export async function acknowledgePolicy(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return { error: "Missing policy." };
  await mutateStore((store) => {
    const exists = store.policyAcknowledgements.some((a) => a.policyId === policyId && a.employeeEmail.toLowerCase() === session.email.toLowerCase());
    if (exists) return { next: store, result: ok() };
    return {
      next: audit(
        {
          ...store,
          policyAcknowledgements: [
            { id: `ack-${randomUUID()}`, policyId, employeeEmail: session.email, acknowledgedAt: new Date().toISOString() },
            ...store.policyAcknowledgements,
          ],
        },
        session.email,
        `Acknowledged policy ${policyId}`,
      ),
      result: ok(),
    };
  });
  revalidatePath("/documents");
  revalidatePath("/employees");
  return ok();
}

/** HR/CEO records that an employee has acknowledged a policy (e.g. on paper). */
export async function recordPolicyAcknowledgementForEmployee(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Forbidden." };
  const policyId = String(formData.get("policyId") ?? "");
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  if (!policyId || !employeeEmail) return { error: "Missing policy or employee." };
  const result = await mutateStore<ActionResult>((store) => {
    const employee = store.employees.find((e) => e.email.toLowerCase() === employeeEmail);
    if (!employee) return { next: store, result: { error: "Employee not found." } };
    if (!store.policies.some((p) => p.id === policyId)) return { next: store, result: { error: "Policy not found." } };
    const exists = store.policyAcknowledgements.some(
      (a) => a.policyId === policyId && a.employeeEmail.toLowerCase() === employeeEmail,
    );
    if (exists) return { next: store, result: { error: "Already acknowledged for this employee." } };
    return {
      next: audit(
        {
          ...store,
          policyAcknowledgements: [
            {
              id: `ack-${randomUUID()}`,
              policyId,
              employeeEmail: employee.email,
              acknowledgedAt: new Date().toISOString(),
            },
            ...store.policyAcknowledgements,
          ],
        },
        session.email,
        `Recorded policy acknowledgement for ${employeeEmail}`,
      ),
      result: ok(),
    };
  });
  revalidatePath("/documents");
  revalidatePath("/employees");
  return result;
}

export async function createCase(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "ceo"].includes(session.role)) return { error: "Only HR and CEO can open cases." };
  const topic = String(formData.get("topic") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "Other");
  const type = typeRaw === "Conflict of Interest" || typeRaw === "Code of Conduct" ? typeRaw : "Other";
  if (!topic) return { error: "Enter a topic." };
  const refNum = Math.floor(1000 + Math.random() * 9000);
  await mutateStore((store) => ({
    next: audit(
      {
        ...store,
        cases: [{ id: `case-${randomUUID()}`, reference: `CASE-${refNum}`, topic, status: "Open", opened: new Date().toISOString().slice(0, 10), openedByEmail: session.email, type, restrictedTo: ["hr_admin", "ceo"] }, ...store.cases],
      },
      session.email,
      `Opened case ${topic}`,
    ),
    result: ok(),
  }));
  revalidatePath("/cases");
  return ok();
}

export async function updateCaseStatus(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !["hr_admin", "ceo"].includes(session.role)) return { error: "Forbidden." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !status) return { error: "Invalid." };
  await mutateStore((store) => ({
    next: audit({ ...store, cases: store.cases.map((c) => (c.id === id ? { ...c, status } : c)) }, session.email, `Case ${id} -> ${status}`),
    result: ok(),
  }));
  revalidatePath("/cases");
  return ok();
}

export async function upsertGoal(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "").trim() || "H1 2026";
  const progressPct = Math.min(100, Math.max(0, Number(formData.get("progressPct") ?? "0")));
  const ownerEmailRaw = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  if (!title) return { error: "Title required." };
  let ownerEmail = ownerEmailRaw || session.email.toLowerCase();
  if (!hasExecAccess(session.role) && ownerEmail !== session.email.toLowerCase()) return { error: "Forbidden." };
  if (id) {
    await mutateStore((s) => ({
      next: audit({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, title, cycle, progressPct, ownerEmail } : g)) }, session.email, `Updated goal ${id}`),
      result: ok(),
    }));
  } else {
    await mutateStore((s) => ({
      next: audit({ ...s, goals: [{ id: `g-${randomUUID()}`, ownerEmail, title, progressPct, cycle }, ...s.goals] }, session.email, `Created goal for ${ownerEmail}`),
      result: ok(),
    }));
  }
  revalidatePath("/performance");
  return ok();
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  await mutateStore((s) => ({
    next: audit({ ...s, goals: s.goals.filter((x) => x.id !== id) }, session.email, `Deleted goal ${id}`),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}

export async function addPerformanceReview(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !hasExecAccess(session.role)) return { error: "Only HR Admin or CEO can add review records." };
  const employeeEmail = String(formData.get("employeeEmail") ?? "").trim().toLowerCase();
  const department = String(formData.get("department") ?? "").trim();
  const criteriaType = String(formData.get("criteriaType") ?? "Technical");
  const grade = String(formData.get("grade") ?? "C");
  const comments = String(formData.get("comments") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "H1 2026").trim();
  if (!employeeEmail || !department) return { error: "Missing fields." };
  await mutateStore((s) => ({
    next: audit(
      {
        ...s,
        reviews: [
          {
            id: `rev-${randomUUID()}`,
            employeeEmail,
            managerEmail: String(formData.get("managerEmail") ?? "").trim().toLowerCase() || session.email,
            department,
            criteriaType: criteriaType === "Leadership" || criteriaType === "Operations" ? criteriaType : "Technical",
            grade: grade === "A" || grade === "B" || grade === "C" || grade === "D" ? grade : "C",
            comments,
            cycle,
          },
          ...s.reviews,
        ],
      },
      session.email,
      `Added performance review for ${employeeEmail}`,
    ),
    result: ok(),
  }));
  revalidatePath("/performance");
  return ok();
}
