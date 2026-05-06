import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyJobForm } from "@/components/apply/ApplyJobForm";
import { readStore } from "@/lib/store/persist";
import type { Metadata } from "next";

type Props = { params: Promise<{ jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const store = await readStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) return { title: "Role not found" };
  return { title: `Apply · ${job.title}` };
}

export default async function ApplyPage({ params }: Props) {
  const { jobId } = await params;
  const store = await readStore();
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) notFound();

  return (
    <div className="min-h-dvh bg-kastros-cream">
      <header className="border-b border-kastros-sand bg-white/90 px-6 py-4 backdrop-blur">
        <Link href="/login" className="font-display text-lg font-semibold text-kastros-forest">
          Kastros
        </Link>
        <p className="mt-1 text-sm text-kastros-sage">Careers — apply without signing in</p>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ApplyJobForm job={job} />
      </main>
    </div>
  );
}
