import Link from "next/link";

import { DescargasDocumento, Documento } from "@/components/documento";
import { Card, CardHeader, Label, Panel, buttonClass, cx } from "@/components/ui";
import { documentosGenerados } from "@/domain/documentos";
import type { RemediationStatus } from "@/domain/types";
import { requireAnalyzedRun } from "@/server/session";

export const dynamic = "force-dynamic";

const ESTADO: Record<RemediationStatus, { label: string; style: string }> = {
  propuesta: { label: "Propuesto", style: "bg-canvas text-ink-muted" },
  "pr-abierto": { label: "Parche generado", style: "bg-warning-soft text-warning" },
  retesteado: { label: "Retesteado", style: "bg-info-soft text-info" },
  firmado: { label: "Firmado", style: "bg-safe-soft text-safe" },
};

export default async function DocumentosPage() {
  const run = await requireAnalyzedRun();
  const documentos = documentosGenerados(run);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Documentos jurídicos generados
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          VIGÍA propone, el abogado firma
        </p>
      </div>

      <Card>
        <CardHeader
          title={`${documentos.length} documento${documentos.length === 1 ? "" : "s"} para ${run.scope.client.name}`}
          tag="Sin IA generativa"
          tagTone="brand"
          description="Cuando la falla es que falta un documento, el parche no es un diff: es el documento. VIGÍA lo redacta con plantillas normativas fijas y lo prellena con lo que leyó del código auditado —razón social y NIT, proveedores de IA con su país, categorías de datos del esquema, puntos de recolección—. Lo que no está en el código queda marcado como pendiente para que lo diligencie el abogado, que revisa, ajusta y firma: el documento no sustituye su juicio profesional."
        />

        {documentos.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Esta auditoría no produjo hallazgos documentales: el repositorio ya publica los
            documentos que VIGÍA sabe revisar, o no trata datos personales que los exijan.
          </p>
        ) : (
          <ul className="space-y-4">
            {documentos.map((doc) => (
              <li key={doc.code} className="rounded-[8px] border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-ink-faint">{doc.code}</p>
                    <p className="mt-1 text-[13.5px] font-medium leading-snug text-ink">
                      {doc.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-ink-muted">
                      {doc.target}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 rounded-[5px] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                      ESTADO[doc.status].style,
                    )}
                  >
                    {ESTADO[doc.status].label}
                  </span>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-[12.5px] text-ink-muted transition-colors hover:text-ink">
                    Leer el borrador
                  </summary>
                  <Panel tone="neutral" className="mt-2 max-h-[420px] overflow-y-auto">
                    <Documento lines={doc.lines} />
                  </Panel>
                </details>

                {/* El id del hallazgo es su código en minúsculas (ver runChecks). */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DescargasDocumento
                    code={doc.code}
                    lines={doc.lines}
                    runId={run.id}
                    findingId={doc.code.toLowerCase()}
                  />
                  <Link
                    href={`/auditoria/hallazgos/${doc.code.toLowerCase()}`}
                    className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
                  >
                    Ver el hallazgo que lo motiva →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Label>Qué falta para que estos documentos sirvan</Label>
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-ink-soft">
          <li>
            · Diligenciar los campos resaltados: VIGÍA no inventa lo que no está en el
            código.
          </li>
          <li>
            · Publicar cada documento en la ruta indicada y volver a cargar el código: el
            retesteo comprueba que la prueba que lo motivó ya no encuentra la falla.
          </li>
          <li>
            · Firmar el hallazgo, que es lo que lleva el documento al informe de auditoría
            técnico-jurídica.
          </li>
        </ul>
        <Link href="/auditoria/remediacion" className={cx(buttonClass("primary"), "mt-4")}>
          Volver a remediación y firma
        </Link>
      </Card>
    </div>
  );
}
