import type { Metadata } from "next";
import { TrainingManual } from "@/components/help/TrainingManual";

export const metadata: Metadata = {
  title: "How To — Training Manual",
  description:
    "Kastros HR training modules: login, leave, expenses, documents, org chart, and HR administration. Public how-to guide — no sign-in required.",
  robots: { index: true, follow: true },
};

export default function TrainingManualHowToPage() {
  return <TrainingManual />;
}
