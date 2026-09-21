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
        <div className="flex flex-wrap items-center gap-4">
          {/* Dos acciones y no tres: el calendario .ics compite con las descargas
              y obliga a importar un archivo para leer algo que ahora está dentro
              del propio informe (sección 10). El endpoint sigue existiendo en
              /api/v1 para quien lo quiera. */}
          <a
            href={`/api/v1/runs/${run.id}/informe`}
            className="text-[13px] text-neutral-700 underline hover:text-neutral-950"
          >
            Descargar en Word
          </a>
          <PrintButton />
        </div>
      </div>
      <Informe run={run} />
    </main>
  );
}
