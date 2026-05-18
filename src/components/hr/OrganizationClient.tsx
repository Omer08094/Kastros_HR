"use client";

import type { BusinessUnitRecord, DepartmentRecord, JobDescription, SubDepartmentRecord } from "@/lib/store/types";
import { BUSINESS_UNITS } from "@/lib/store/types";
import { Field, FileField, SelectField, TextareaField } from "@/components/Field";
import { Card } from "@/components/Card";
import {
  deleteBusinessUnit,
  deleteDepartment,
  deleteJobDescription,
  deleteSubDepartment,
  upsertBusinessUnit,
  upsertDepartment,
  upsertJobDescription,
  upsertSubDepartment,
} from "@/lib/store/hr-actions-extra";
import { EmptyState, GhostButton, PrimaryButton, StatusBanner, useAction } from "./ModuleHelpers";

export function OrganizationClient({
  businessUnits,
  departments,
  subDepartments,
  jobDescriptions,
}: {
  businessUnits: BusinessUnitRecord[];
  departments: DepartmentRecord[];
  subDepartments: SubDepartmentRecord[];
  jobDescriptions: JobDescription[];
}) {
  const { pending, error, success, run } = useAction();

  return (
    <div className="space-y-6">
      <StatusBanner error={error} success={success} />

      <Card title="Business units" eyebrow="Locations">
        <form className="flex flex-wrap items-end gap-3" action={(fd) => run(upsertBusinessUnit(fd), "Business unit saved.")}>
          <SelectField name="name" label="Business unit" required options={BUSINESS_UNITS as readonly string[]} />
          <PrimaryButton pending={pending}>Save business unit</PrimaryButton>
        </form>

        {businessUnits.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No business units yet" description="Add your first business unit above." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Name</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {businessUnits.map((b) => (
                  <tr key={b.id} className="text-kastros-ink">
                    <td className="py-2 pr-3 font-medium">{b.name}</td>
                    <td className="py-2">
                      <form action={(fd) => run(deleteBusinessUnit(fd))}>
                        <input type="hidden" name="id" value={b.id} />
                        <GhostButton pending={pending}>Delete</GhostButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Departments" eyebrow="Structure">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action={(fd) => run(upsertDepartment(fd), "Department saved.")}>
          <Field name="name" label="Department name" required />
          <SelectField
            name="businessUnitId"
            label="Business unit"
            options={businessUnits.map((b) => ({ value: b.id, label: b.name }))}
          />
          <Field name="headEmail" label="Head email" kind="email" />
          <div className="sm:col-span-2">
            <TextareaField name="notes" label="Notes" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton pending={pending}>Save department</PrimaryButton>
          </div>
        </form>

        {departments.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No departments yet" description="Add the first department above." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Name</th>
                  <th className="pb-3 pr-3 font-medium">BU</th>
                  <th className="pb-3 pr-3 font-medium">Head</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {departments.map((d) => (
                  <tr key={d.id} className="text-kastros-ink">
                    <td className="py-2 pr-3">{d.name}</td>
                    <td className="py-2 pr-3 text-xs">
                      {businessUnits.find((b) => b.id === d.businessUnitId)?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">{d.headEmail ?? "—"}</td>
                    <td className="py-2">
                      <form action={(fd) => run(deleteDepartment(fd))}>
                        <input type="hidden" name="id" value={d.id} />
                        <GhostButton pending={pending}>Delete</GhostButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Sub-departments" eyebrow="Specialisations" >
        <p className="text-xs text-kastros-sage mb-3">e.g. Cotton Trading, Soybean, Rice — assigned under a parent department.</p>
        <form className="grid gap-3 sm:grid-cols-3" action={(fd) => run(upsertSubDepartment(fd), "Sub-department saved.")}>
          <Field name="name" label="Sub-department name" required placeholder="e.g. Cotton Trading" />
          <SelectField
            name="departmentId"
            label="Parent department *"
            required
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Field name="notes" label="Notes" />
          <div className="sm:col-span-3">
            <PrimaryButton pending={pending}>Save sub-department</PrimaryButton>
          </div>
        </form>

        {subDepartments.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No sub-departments yet" description="Add commodity desks or specialisations above." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Name</th>
                  <th className="pb-3 pr-3 font-medium">Parent dept</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {subDepartments.map((s) => (
                  <tr key={s.id} className="text-kastros-ink">
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3 text-xs">{departments.find((d) => d.id === s.departmentId)?.name ?? "—"}</td>
                    <td className="py-2">
                      <form action={(fd) => run(deleteSubDepartment(fd))}>
                        <input type="hidden" name="id" value={s.id} />
                        <GhostButton pending={pending}>Delete</GhostButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Job descriptions" eyebrow="Roles">
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(fd) => run(upsertJobDescription(fd), "Job description saved.")}
        >
          <Field name="designationNumber" label="Designation number" required placeholder="e.g. KST-OPS-01" />
          <Field name="title" label="Job title" required />
          <SelectField
            name="departmentId"
            label="Department"
            span2
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <FileField
            name="attachment"
            label="Attachment (optional)"
            span2
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.ppt,.pptx"
          />
          <div className="sm:col-span-2">
            <TextareaField name="summary" label="Summary" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <TextareaField name="responsibilities" label="Responsibilities" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <TextareaField name="requirements" label="Requirements" rows={3} />
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton pending={pending}>Save job description</PrimaryButton>
          </div>
        </form>

        {jobDescriptions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No job descriptions yet"
              description="Add a role above. The designation number can be linked on each employee profile."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-kastros-sand text-xs uppercase tracking-wide text-kastros-sage">
                  <th className="pb-3 pr-3 font-medium">Designation #</th>
                  <th className="pb-3 pr-3 font-medium">Title</th>
                  <th className="pb-3 pr-3 font-medium">Department</th>
                  <th className="pb-3 pr-3 font-medium">File</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-kastros-sand">
                {jobDescriptions.map((j) => (
                  <tr key={j.id} className="text-kastros-ink">
                    <td className="py-2 pr-3 font-mono text-xs">{j.designationNumber}</td>
                    <td className="py-2 pr-3">{j.title}</td>
                    <td className="py-2 pr-3 text-xs">
                      {departments.find((d) => d.id === j.departmentId)?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {j.attachmentRef ? (
                        <a className="text-kastros-brandBlue underline" href={`/api/hr-file/${j.attachmentRef}`} target="_blank" rel="noreferrer">
                          {j.attachmentName ?? "Open"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      <form action={(fd) => run(deleteJobDescription(fd))}>
                        <input type="hidden" name="id" value={j.id} />
                        <GhostButton pending={pending}>Delete</GhostButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
