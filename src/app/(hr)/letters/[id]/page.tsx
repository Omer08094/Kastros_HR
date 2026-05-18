import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/Card";
import { PrintButton } from "@/components/hr/PrintButton";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { hasExecAccess } from "@/lib/roles";

function fmt(date: string): string {
  try {
    return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return date;
  }
}

function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default async function LetterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasExecAccess(session.role)) redirect("/access-denied?from=/letters");
  const { id } = await params;
  const store = await readStore();
  const letter = store.letters.find((l) => l.id === id);
  if (!letter) return notFound();
  const employee = store.employees.find((e) => e.email === letter.employeeEmail);

  return (
    <PageShell title={`${letter.type} letter`} subtitle={`${employee?.name ?? letter.employeeEmail} · ${fmt(letter.effectiveDate)}`}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card title={`Kastros — ${letter.type} letter`} eyebrow="Print-ready">
          <article className="space-y-4 text-sm leading-relaxed text-kastros-ink">
            <p className="text-xs uppercase tracking-wide text-kastros-sage">Date issued: {fmt(letter.issuedDate)}</p>
            <p>
              <strong>{employee?.name ?? letter.employeeEmail}</strong>
              <br />
              {employee?.title} · {employee?.department}
              <br />
              {employee?.businessUnit ?? ""}
            </p>
            <p>Dear {employee?.name?.split(" ")[0] ?? "Colleague"},</p>

            {letter.type === "Promotion" || letter.type === "Redesignation" ? (
              <>
                <p>
                  We are pleased to inform you that, effective <strong>{fmt(letter.effectiveDate)}</strong>, you are
                  {letter.type === "Promotion" ? " promoted from" : " redesignated from"}{" "}
                  <strong>{letter.oldTitle ?? "(current role)"}</strong>{" "}
                  {letter.oldDepartment ? `(${letter.oldDepartment})` : ""} to{" "}
                  <strong>{letter.newTitle ?? "(new role)"}</strong>{" "}
                  {letter.newDepartment ? `(${letter.newDepartment})` : ""}.
                </p>
                {letter.newSalary ? (
                  <p>
                    Your revised gross salary will be{" "}
                    <strong>{money(letter.newSalary, letter.currency)}</strong>{" "}
                    {letter.oldSalary ? <>(previously {money(letter.oldSalary, letter.currency)})</> : null}.
                  </p>
                ) : null}
                {letter.notes ? <p>{letter.notes}</p> : null}
                <p>Welcome to your new chapter at Kastros. We are confident you will continue to make us proud.</p>
              </>
            ) : letter.type === "Termination" ? (
              <>
                <p>
                  This letter serves as formal notice that your employment with Kastros is terminated effective{" "}
                  <strong>{fmt(letter.terminationLastWorkingDate ?? letter.effectiveDate)}</strong>.
                </p>
                <p>
                  <strong>Reason:</strong> {letter.terminationReason ?? "As communicated to you."}
                </p>
                {letter.terminationSettlementNotes ? (
                  <p>
                    <strong>Settlement / handover:</strong> {letter.terminationSettlementNotes}
                  </p>
                ) : null}
                {letter.notes ? <p>{letter.notes}</p> : null}
                <p>
                  Please return all company property and complete the exit process with HR. Your final settlement will
                  be processed in accordance with applicable law and company policy.
                </p>
              </>
            ) : (
              <>
                <p>
                  We are pleased to confirm your appointment as a <strong>{letter.type}</strong> under the program{" "}
                  <strong>{letter.programTitle}</strong>, effective <strong>{fmt(letter.effectiveDate)}</strong>{" "}
                  {letter.durationMonths ? <>for a duration of <strong>{letter.durationMonths} months</strong></> : null}.
                </p>
                {letter.stipend ? (
                  <p>
                    Your monthly stipend will be <strong>{money(letter.stipend, letter.currency)}</strong>.
                  </p>
                ) : null}
                {letter.notes ? <p>{letter.notes}</p> : null}
                <p>Welcome to your new chapter at Kastros. We are confident you will continue to make us proud.</p>
              </>
            )}

            <p>
              Warm regards,
              <br />
              {letter.issuedByEmail}
              <br />
              Kastros HR
            </p>
          </article>
          <div className="mt-4 flex justify-end">
            <PrintButton />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
