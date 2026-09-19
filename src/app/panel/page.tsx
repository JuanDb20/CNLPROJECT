import Link from "next/link";

import { abrirAuditoria, crearAuditoriaEjemplo } from "@/app/actions";
import { Card, Tag, buttonClass } from "@/components/ui";
import { formatDate } from "@/domain/format";
import { scoreRun } from "@/domain/scoring";
import type { RunStatus } from "@/domain/types";
import { requireUser } from "@/server/auth";
import { repository } from "@/server/store";

export const dynamic = "force-dynamic";

const STATUS: Record<RunStatus, { label: string; tone: "neutral" | "brand" | "required" | "safe" }> = {
  borrador: { label: "Alcance pendiente", tone: "required" },
  configurado: { label: "Por configurar", tone: "required" },
  ejecutando: { label: "En ejecución", tone: "brand" },
  analizado: { label: "Análisis listo", tone: "brand" },
  remediando: { label: "En remediación", tone: "brand" },
  certificado: { label: "Informe expedido", tone: "safe" },
};

const ANALYZED: RunStatus[] = ["analizado", "remediando", "certificado"];

export default async function PanelPage() {
  const user = await requireUser();
  const runs = await repository.listByOwner(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Mis auditorías</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {user.firm || "Ejercicio independiente"} · {runs.length}{" "}
            {runs.length === 1 ? "auditoría" : "auditorías"}
          </p>
        </div>
        <Link href="/panel/nueva" className={buttonClass("brand")}>
          Nueva auditoría
        </Link>
      </div>

      {runs.length === 0 ? (
        <Card>
          <p className="text-[13.5px] font-medium text-ink">Aún no tienes auditorías</p>
          <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-muted">
            Registra al cliente y carga el código de su sistema de IA en un archivo .zip.
            VIGÍA lo analiza en un entorno aislado y te entrega los hallazgos, con la norma
            que incumple cada uno, para que los revises y los firmes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/panel/nueva" className={buttonClass("secondary")}>
              Abrir la primera auditoría
            </Link>
            <form action={crearAuditoriaEjemplo}>
              <button type="submit" className={buttonClass("ghost")}>
                O usa datos de ejemplo
              </button>
            </form>
          </div>
        </Card>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[12px] border border-line bg-surface">
          {runs.map((run) => {
            const status = STATUS[run.status];
            const date = formatDate(run.createdAt);
            return (
              <li key={run.id}>
                <form action={abrirAuditoria.bind(null, run.id)}>
                  <button
                    type="submit"
                    className="grid w-full gap-2 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {run.scope.client.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                        NIT {run.scope.client.nit} · {run.scope.source.fileName} · {date}
                      </span>
                    </span>
                    <span className="text-[12px] text-ink-soft">
                      {ANALYZED.includes(run.status)
                        ? `${run.findings.length} hallazgos · puntuación ${scoreRun(run).score}`
                        : "Sin análisis"}
                    </span>
                    <span>
                      <Tag tone={status.tone}>{status.label}</Tag>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
