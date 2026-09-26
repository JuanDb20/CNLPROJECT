import Link from "next/link";

import { SitePage } from "@/components/sitio";
import { Card, Mono, Panel, RuleChip, SeverityBadge, Tag } from "@/components/ui";
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
          Esta página existe porque un auditor que no se deja revisar no es confiable. El mismo
          catálogo de pruebas que VIGÍA corre sobre el código de sus clientes se corre, sin
          cambios, sobre el código de VIGÍA, y el resultado se publica tal como sale, sin editar.
          Exigirles a otros lo que uno no cumple no es una auditoría: es un folleto.
        </p>
      </div>

      <Card>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Resultado de la última autoauditoría</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
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
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-[11.5px] text-ink-muted">SHA-256 del código analizado</dt>
            <dd className="mt-1">
              <Mono>{sha256}</Mono>
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2.5 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
          <p>
            <strong className="font-medium text-ink-soft">SHA-256</strong> es la huella digital del
            código: un identificador único que resulta de procesar todo el texto fuente de VIGÍA. Si
            una sola letra cambiara, la huella sería otra por completo. Sirve para demostrar, meses
            después, que este resultado corresponde exactamente a esta versión de VIGÍA y no a otra.
            Ojo: <strong className="font-medium text-ink-soft">no es la misma huella</strong> que se
            conserva del código de cada cliente auditado — esa es distinta para cada auditoría; vea
            «Retención» más abajo.
          </p>
          <p>
            <strong className="font-medium text-ink-soft">Avisos de dependencias (OSV)</strong> son
            alertas públicas de seguridad, no sobre código que escribió VIGÍA, sino sobre las piezas
            de software de terceros (bibliotecas de código ajeno) que VIGÍA usa para funcionar. Se
            consultan en OSV.dev, una base de datos pública y gratuita que reúne alertas de GitHub y
            de otras fuentes oficiales. Si esa base no responde en el momento de la consulta, el
            resultado igual queda en cero avisos: cero no siempre significa "sin alertas conocidas",
            a veces significa "no se pudo consultar ese día".
          </p>
        </div>
      </Card>

      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Hallazgos</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
          Un hallazgo es una prueba puntual del catálogo que le encontró una falla al código, con la
          norma colombiana que esa falla incumple. Cuando hay hallazgos, cada fila muestra su código
          interno, qué tan grave es y el archivo y la línea exactos donde está.
        </p>
      </div>

      {hallazgos.length === 0 ? (
        <Panel tone="safe">
          <p className="text-[12.5px] text-safe">
            Ninguna de las pruebas del catálogo le encuentra una falla al código de VIGÍA en esta
            ejecución. Esto no es una certificación de un tercero independiente: es el resultado de
            que VIGÍA se examine con su propio catálogo — vea los límites de esta autoauditoría, abajo.
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
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Retención: qué pasa con el código que se carga</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          Cuando un abogado carga el código de un cliente para auditarlo, esto es lo que ocurre con
          ese código, en orden:
        </p>
        <ol className="mt-3 space-y-2.5">
          <li className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <span aria-hidden className="shrink-0 text-ink-faint">1.</span>
            <span>
              Al cargarlo, VIGÍA calcula la huella digital (SHA-256) de ese código — distinta de la
              que se ve arriba, que es la de VIGÍA, no la de ningún cliente — y guarda el archivo en
              su almacenamiento.
            </span>
          </li>
          <li className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <span aria-hidden className="shrink-0 text-ink-faint">2.</span>
            <span>
              Antes de mostrar cualquier fragmento de ese código en pantalla — por ejemplo, como
              evidencia de un hallazgo — VIGÍA reemplaza automáticamente las llaves de acceso,
              contraseñas, tokens, correos y números de documento (cédula, NIT) que encuentre por la
              palabra [ENMASCARADO]. Esto ocurre cada vez que algo se muestra; el archivo que queda
              guardado no se modifica por este enmascaramiento.
            </span>
          </li>
          <li className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <span aria-hidden className="shrink-0 text-ink-faint">3.</span>
            <span>
              A los 90 días exactos desde la carga, contados por el sistema, el archivo se borra — el
              original y, si lo hay, el corregido. Queda únicamente su huella SHA-256 dentro del
              expediente de la auditoría: no permite reconstruir el código, pero sí demostrar después
              que el informe correspondía exactamente a esa versión. Este límite lo exige la ley de
              datos personales:{" "}
              <RuleChip kind="Jurídica" label="Decreto 1074/2015 art. 2.2.2.25.2.8 (Decreto 1377/2013 art. 11)" />
              {" "}— los datos personales solo se pueden tratar mientras sean razonablemente necesarios
              para la finalidad que justificó tratarlos; cumplida esa finalidad, deben suprimirse.
            </span>
          </li>
          <li className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <span aria-hidden className="shrink-0 text-ink-faint">4.</span>
            <span>
              El abogado puede adelantar este borrado a mano en cualquier momento, apenas se expida el
              informe, sin esperar los 90 días.
            </span>
          </li>
        </ol>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
          Lo que sí se conserva más allá de esos 90 días es el expediente de la auditoría — los
          hallazgos, la evidencia ya enmascarada, las firmas del abogado y el informe expedido —, no
          el código en sí. Ese expediente sigue los plazos de la{" "}
          <Link href="/privacidad" className="underline underline-offset-2">
            política de tratamiento de datos
          </Link>
          .
        </p>
      </Card>

      <Card>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Qué no garantiza esta autoauditoría</h2>
        <ul className="mt-2 space-y-2">
          {[
            "Solo encuentra lo que su propio catálogo de pruebas sabe buscar — el mismo catálogo que VIGÍA les aplica a sus clientes. Un problema fuera de ese catálogo no aparece aquí, igual que no aparecería en la auditoría de un cliente.",
            "Es una foto del código en el momento exacto en que se corrió (arriba, «Última ejecución»), no vigilancia continua. Un cambio posterior al código no se refleja hasta la próxima vez que se corra.",
            "Los avisos de dependencias dependen de que la base pública OSV.dev responda en el momento de la consulta; si no responde, el resultado no lo distingue de «sin alertas».",
            "Es un autoexamen: lo corre y lo publica el mismo equipo que construye VIGÍA, sin que un tercero independiente lo certifique. No reemplaza una auditoría externa ni el criterio de un abogado revisando un caso concreto.",
            "Revisa el código fuente, no la infraestructura donde corre en producción (servidor, base de datos, proveedores) ni la forma en que cada abogado configura o usa el sistema en la práctica.",
          ].map((linea) => (
            <li key={linea} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
              <span aria-hidden className="text-brand">·</span>
              {linea}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Este resultado no se escribe a mano: lo genera{" "}
        <code className="font-mono">npm run autoauditoria</code>, un script que corre el catálogo
        sobre el código fuente y reescribe el archivo que ve aquí. El equipo lo vuelve a correr antes
        de publicar cada nueva versión, para que la fecha y la huella SHA-256 correspondan a la
        versión que está en línea.
      </p>
    </SitePage>
  );
}
