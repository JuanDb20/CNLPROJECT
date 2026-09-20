import Link from "next/link";
import { notFound } from "next/navigation";

import { Informe } from "@/components/informe";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/server/auth";
import { ownedRun } from "@/server/http";

import "../print.css";

export const metadata = { title: "Informe de auditoría" };

export const dynamic = "force-dynamic";

export default async function InformePage({ params }: { params: Promise<{ runId: string }> }) {
  await requireUser();
  const run = await ownedRun((await params).runId);
  if (!run) notFound();

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/auditoria/remediacion" className="text-[13px] text-neutral-700 hover:text-neutral-950">
          ← Volver a la auditoría
        </Link>
        <PrintButton />
      </div>
      <Informe run={run} />
    </main>
  );
}
