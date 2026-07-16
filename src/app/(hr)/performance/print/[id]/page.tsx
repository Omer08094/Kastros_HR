import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/hr/PrintButton";
import { getSession } from "@/lib/auth";
import { buildPmdfPrintHtml } from "@/lib/pmdf-print-html";
import { canAccessPmdfForm } from "@/lib/pmdf-access";
import { readStore } from "@/lib/store/persist";

export default async function PmdfPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const store = await readStore();
  const form = store.pmdfForms.find((f) => f.id === id);
  if (!form) return notFound();

  const cycle = store.performanceCycles.find((c) => c.id === form.cycleId);
  if (!cycle) return notFound();

  if (!canAccessPmdfForm(store, session, form)) redirect("/access-denied?from=/performance");

  const html = buildPmdfPrintHtml(cycle, form);

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 print:px-0 print:py-0">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <style>{`
        @media print {
          nav, header, footer { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
