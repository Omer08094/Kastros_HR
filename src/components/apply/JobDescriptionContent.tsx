"use client";

import { useEffect, useState } from "react";
import { isRichHtmlDescription, stripHtmlForPlainText } from "@/lib/job-description-html";

const proseClass =
  "job-description-rich text-sm leading-relaxed text-kastros-ink [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-kastros-forest [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-kastros-forest [&_h3:first-child]:mt-0 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_li]:leading-relaxed [&_a]:font-medium [&_a]:text-kastros-forest [&_a]:underline [&_strong]:font-semibold [&_strong]:text-kastros-forest";

export function JobDescriptionContent({ text, className = "" }: { text: string; className?: string }) {
  const trimmed = text.trim();
  const [safeHtml, setSafeHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!trimmed || !isRichHtmlDescription(trimmed)) {
      setSafeHtml(null);
      return;
    }
    let cancelled = false;
    void import("@/lib/sanitize-job-html").then(({ sanitizeJobDescriptionHtml }) => {
      if (!cancelled) setSafeHtml(sanitizeJobDescriptionHtml(trimmed));
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  if (!trimmed) return null;

  if (!isRichHtmlDescription(trimmed)) {
    return (
      <div className={`whitespace-pre-wrap text-sm leading-relaxed text-kastros-ink ${className}`.trim()}>{trimmed}</div>
    );
  }

  if (!safeHtml) {
    return (
      <div className={`whitespace-pre-wrap text-sm leading-relaxed text-kastros-ink ${className}`.trim()}>
        {stripHtmlForPlainText(trimmed)}
      </div>
    );
  }

  return (
    <div className={`${proseClass} ${className}`.trim()} dangerouslySetInnerHTML={{ __html: safeHtml }} />
  );
}
