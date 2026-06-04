"use client";

import { RichTextEditor } from "@/components/hr/RichTextEditor";

export function JobDescriptionField({
  name = "description",
  defaultValue = "",
  placeholder,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <RichTextEditor name={name} defaultValue={defaultValue} placeholder={placeholder} />
      <p className="text-xs text-kastros-sage">
        Type and format directly — like Word or Google Docs. What you see is what candidates see on the apply page.
      </p>
    </div>
  );
}
