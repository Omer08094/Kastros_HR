import type { EmployeeIntakeDefaults } from "@/components/hr/employee-intake-fields";
import type { JobApplication, JobPosting } from "@/lib/store/types";

/** Defaults for “Add team member” when opened from an approved application. */
export function mapJobApplicationToOnboardingDefaults(app: JobApplication, job: JobPosting): EmployeeIntakeDefaults {
  const emp = app.employmentType && ["Permanent", "Temporary", "Contractual", "Intern"].includes(app.employmentType) ? app.employmentType : undefined;

  return {
    name: app.fullName,
    fatherName: app.fatherName ?? "",
    email: app.email,
    title: app.roleTitle ?? job.title,
    department: app.intakeDepartment ?? "",
    location: app.intakeLocation ?? job.location,
    employmentType: emp ?? "Permanent",
    joiningDate: app.intakeJoiningDate ?? "",
    probationMonths: app.intakeProbationMonths ?? 3,
    companyPhone: app.companyPhone ?? "",
    personalPhone: app.phone,
    emergencyContactName: app.emergencyContactName ?? "",
    emergencyContactRelation: app.emergencyContactRelation ?? "",
    emergencyContactPhone: app.emergencyContactPhone ?? "",
    familyRelationName: app.familyRelationName ?? "",
    familyRelationType: app.familyRelationType ?? "",
    familyRelationFirm: app.familyRelationFirm ?? "",
    familyLinked: app.familyLinked === true ? "yes" : "no",
    reportsToEmail: app.reportsToEmail ?? "",
    eduTitle: app.eduTitle ?? "",
    eduInstitute: app.eduInstitute ?? "",
    eduYear: app.eduYear ?? "",
    certTitle: app.certTitle ?? "",
    certIssuer: app.certIssuer ?? "",
    certYear: app.certYear ?? "",
  };
}
