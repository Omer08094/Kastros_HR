"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { MANUAL_PATH } from "@/lib/help/manual-content";

/** Fixed help launcher — opens the public training manual in a new tab. */
export function FloatingHelpButton() {
  return (
    <Link
      href={MANUAL_PATH}
      target="_blank"
      rel="noopener noreferrer"
      title="Open Kastros HR how-to manual (new tab)"
      aria-label="Help — open how-to manual in a new tab"
      className="fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-kastros-forest text-white shadow-lg ring-2 ring-white transition hover:bg-kastros-forest/90 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kastros-brandGreen"
    >
      <CircleHelp className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
