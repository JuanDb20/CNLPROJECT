import Link from "next/link";

import { SitePage } from "@/components/sitio";
import { Card, Mono, Panel, SeverityBadge, Tag } from "@/components/ui";
import { formatDate } from "@/domain/format";
import type { Severity } from "@/domain/types";

import resultado from "./resultado.json";

interface Hallazgo {
  code: string;
  title: string;
  severity: Severity;
  locations: string[];
}

/**
 * VIGÍA se audita a sí misma con su propio catálogo de pruebas. El resultado es
 * un archivo generado (`npm run autoauditoria`), no una declaración escrita a mano.
 */
export const metadata = { title: { absolute: "VIGÍA se audita a sí misma" } };

export default function TransparenciaPage() {
  const { fecha, sha256, archivos, avisosOsv } = resultado;
  // El JSON es generado: cuando no hay hallazgos, el array viene vacío y sin tipo.
  const hallazgos = resultado.hallazgos as Hallazgo[];

  return (
    <SitePage actual="/transparencia" className="mx-auto w-full max-w-[760px] space-y-6 px-5 pb-16 pt-8">

      <div>
        <h1 className="sitio-titulo">
          VIGÍA se audita a sí misma
        </h1>
        <p className="sitio-bajada">
          El mismo catálogo de pruebas que VIGÍA corre sobre el código de sus clientes
          se corre sobre el código de VIGÍA. Exigir a otros lo que uno no cumple no es
          una auditoría, es un folleto.
        </p>
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11.5px] text-ink-muted">Última ejecución</dt>
            <dd className="mt-0.5 text-[13px] text-ink">{formatDate(fecha, { time: true })}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-ink-muted">Archivos analizados</dt>
            <dd className="mt-0.5 text-[13px] text-ink">{archivos}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-ink-muted">Hallazgos</dt>
            <dd className="mt-0.5 text-[13px] text-ink">{hallazgos.length}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-ink-muted">Avisos de dependencias (OSV)</dt>
            <dd className="mt-0.5 text-[13px] text-ink">{avisosOsv}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11.5px] text-ink-muted">SHA-256 del código analizado</dt>
            <dd className="mt-1">
              <Mono>{sha256}</Mono>
            </dd>
          </div>
        </dl>
      </Card>

      {hallazgos.length === 0 ? (
        <Panel tone="safe">
          <p className="text-[12.5px] text-safe">
            Ninguna de las pruebas del catálogo encuentra una falla en el código de VIGÍA.
          </p>
        </Panel>
      ) : (
        <Card>
          <ul className="space-y-3">
            {hallazgos.map((h) => (
              <li key={h.code} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag>{h.code}</Tag>
                  <SeverityBadge severity={h.severity} />
                  <span className="text-[12.5px] font-medium text-ink">{h.title}</span>
                </div>
                <Mono className="mt-1.5">{h.locations.join("\n")}</Mono>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Retención</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          El código que carga el abogado se borra a los 90 días y queda solo su SHA-256,
          que es lo que ata el informe a esa versión exacta; una rutina diaria borra del
          almacenamiento lo que ya venció. El expediente de la auditoría (hallazgos,
          firmas e informe) se conserva según la{" "}
          <Link href="/privacidad" className="underline underline-offset-2">
            política de tratamiento de datos
          </Link>
          . El abogado puede además borrar el código a mano en cuanto se expide el informe.
        </p>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Este resultado no se escribe a mano: lo genera{" "}
        <code className="font-mono">npm run autoauditoria</code>, que corre el catálogo
        sobre el código fuente y reescribe el archivo que ves aquí. Se regenera antes de
        cada despliegue, de modo que la fecha y el SHA-256 corresponden a la versión
        publicada.
      </p>
    </SitePage>
  );
}
