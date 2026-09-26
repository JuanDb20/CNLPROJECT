import Link from "next/link";

import { SitePage } from "@/components/sitio";
import { Card, Label, Mono, Panel, buttonClass, fieldClass } from "@/components/ui";
import { formatDate } from "@/domain/format";
import { repository } from "@/server/store";

/**
 * Verificación pública de un informe. No exige sesión y no revela de quién es
 * la auditoría: solo lo que hace falta para comprobar que el documento no se
 * alteró y que existía en la fecha del sello.
 *
 * Piensa en quien la usa: no es el abogado que audita, es quien RECIBE una
 * copia del informe (el cliente, un tercero, la SIC, un juez) y no tiene cómo
 * saber si es genuina. Por eso cada dato técnico va acompañado de qué prueba,
 * en el idioma de quien verifica, no en el de quien construye VIGÍA.
 */
export const metadata = { title: "Verificar un informe" };

export const dynamic = "force-dynamic";

function Dato({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line py-2.5 sm:grid sm:grid-cols-[210px_1fr] sm:gap-4">
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-ink sm:mt-0">
        {children}
        {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">{hint}</p> : null}
      </dd>
    </div>
  );
}

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const consulta = (q ?? "").trim();
  const cert = consulta ? await repository.findCertificate(consulta) : null;

  return (
    <SitePage actual="/verificar" className="mx-auto w-full max-w-[760px] space-y-6 px-5 pb-16 pt-8">

      <div>
        <h1 className="sitio-titulo">
          Verificar un informe
        </h1>
        <p className="sitio-bajada">
          Sirve para comprobar que un informe de auditoría de VIGÍA es el mismo que expidió
          el abogado, sin alterar, y que ya existía en la fecha que indica ("fecha cierta").
          Úsala cuando te llegue una copia del informe —de tu cliente, de un colega o de un
          tercero— y quieras confirmarlo antes de presentarla ante la SIC, un juez o una
          contraparte: no acredita que lo que dice el informe sea correcto, solo que nadie lo
          tocó después de firmado (Ley 527 de 1999, arts. 10 y 11).
        </p>
      </div>

      <Card>
        <Label>Antes de buscar</Label>
        <ol className="space-y-2 pl-4 text-[12.5px] leading-relaxed text-ink-soft [&>li]:list-decimal [&>li]:pl-1">
          <li>
            Abre el documento que te llegó y busca, al final, el bloque «Integridad»: ahí
            están el identificador del informe (empieza por{" "}
            <code className="font-mono">VGI-INF-</code>) y su huella digital (hash).
          </li>
          <li>Copia uno de los dos —no hace falta los dos— y pégalo abajo.</li>
          <li>
            Compara: si coincide con lo que muestra VIGÍA, el informe es genuino y nadie lo
            tocó. Si algo no coincide, o la búsqueda no encuentra nada, no confíes en esa copia.
          </li>
        </ol>
      </Card>

      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-[12px] text-ink-soft">
            Identificador o hash
            <input
              name="q"
              defaultValue={consulta}
              required
              maxLength={120}
              placeholder="VGI-INF-6525DAD35A93"
              className={fieldClass}
            />
          </label>
          <button type="submit" className={buttonClass("brand")}>
            Verificar
          </button>
        </form>
      </Card>

      {consulta && !cert ? (
        <Panel tone="critical">
          <p className="text-[12.5px] text-critical">
            No encontramos ningún informe con ese identificador o hash.
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-critical">
            Revisa que lo copiaste completo y sin espacios, tal como aparece en el documento.
            Si lo copiaste bien y aun así no aparece, tómalo como una señal de alerta: ese
            documento puede no haber salido de VIGÍA, o alguien pudo alterarlo después de
            expedido.
          </p>
        </Panel>
      ) : null}

      {cert ? (
        <>
          <Card>
            <dl className="text-[12.5px]">
              <Dato label="Número del informe">{cert.id}</Dato>
              <Dato label="Fecha de expedición">
                {formatDate(cert.issuedAt, { time: true })}
              </Dato>
              <Dato
                label="Huella digital de este informe (hash)"
                hint="Resume todo el contenido del informe —el resultado, los hallazgos firmados y el puntaje—. Si alguien cambia algo después de expedido, así sea una coma, esta huella cambia por completo: por eso sirve para detectar alteraciones."
              >
                <Mono>{cert.hash}</Mono>
              </Dato>
              <Dato
                label="Huella del informe anterior de este abogado (cadena de hash)"
                hint="Cada informe queda encadenado al anterior que expidió el mismo abogado, como los eslabones de una cadena. Si este es su primer informe, aquí solo hay ceros."
              >
                <Mono>{cert.previousHash}</Mono>
              </Dato>
              <Dato
                label="Sello de fecha y hora de un tercero independiente (sello de tiempo)"
                hint={
                  cert.timestamp
                    ? "Una autoridad ajena a VIGÍA y al abogado certifica que el informe ya existía en ese momento exacto: sirve, por ejemplo, para probar que algo ya estaba corregido antes de un incidente."
                    : "La fecha de expedición queda igual registrada en VIGÍA; lo único que falta es ese respaldo adicional de un tercero."
                }
              >
                {cert.timestamp ? (
                  <>
                    {cert.timestamp.tsa} · {formatDate(cert.timestamp.at, { time: true })}{" "}
                    <a
                      download={`${cert.id}.tsr`}
                      href={`data:application/timestamp-reply;base64,${cert.timestamp.token}`}
                      className="underline underline-offset-2"
                    >
                      descargar sello
                    </a>
                  </>
                ) : (
                  "Sin sello: la autoridad de estampado no respondió al expedirlo"
                )}
              </Dato>
              <Dato
                label="Puntaje de cumplimiento (antes → después de corregir)"
                hint="Va de 0 a 100 y solo sube cuando el abogado firma una corrección después de que VIGÍA la vuelve a probar. No es una estimación de la multa: la SIC gradúa las sanciones con sus propios criterios (art. 24, Ley 1581 de 2012)."
              >
                {cert.scoreBefore} → {cert.scoreAfter}
              </Dato>
              <Dato
                label="Huella digital del código auditado (SHA-256)"
                hint="Identifica exactamente esa versión del código, línea por línea: si algo cambia, la huella cambia. VIGÍA no publica el código aquí, solo la prueba de cuál versión se revisó."
              >
                <Mono>{cert.sourceSha256}</Mono>
              </Dato>
              <Dato label="Huella digital del código ya corregido">
                {cert.retestSha256 ? (
                  <Mono>{cert.retestSha256}</Mono>
                ) : (
                  "No se cargó una versión corregida antes de firmar"
                )}
              </Dato>
              <Dato
                label="Fallas firmadas por el abogado"
                hint="Cuántas de las fallas que encontró VIGÍA revisó y asumió como propias el abogado firmante, de un total de las detectadas. Las demás no desaparecen: el cliente las ve todas —firmadas y pendientes— en el informe completo."
              >
                {cert.signedCount} de {cert.findingsCount}
              </Dato>
              <Dato
                label="Abogado(s) firmante(s) (nombre y tarjeta profesional)"
                hint={
                  <>
                    Quien firma responde profesionalmente por ese análisis (arts. 28 y 34,
                    Ley 1123 de 2007). Dato autodeclarado: VIGÍA no lo verifica contra el
                    Registro Nacional de Abogados.{" "}
                    <a
                      href="https://vigenciaspublicas.ramajudicial.gov.co/Certificados.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-ink"
                    >
                      Consultar vigencia en el registro oficial ↗
                    </a>
                  </>
                }
              >
                {cert.signers.length > 0 ? cert.signers.join(" · ") : "No registrados"}
              </Dato>
            </dl>
          </Card>

          {cert.timestamp ? (
            <Card>
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                Comprobarlo tú mismo, sin depender de esta página (opcional)
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                Lo de arriba ya te lo confirma VIGÍA. Si además quieres una prueba
                independiente —sin fiarte de lo que muestra este sitio—, puedes verificar el
                sello directamente con la autoridad externa que lo emitió. Esto es para el
                área técnica de quien lo pida, no para el abogado.
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
                Guarda el hash de arriba en <code className="font-mono">hash.txt</code> (sin
                salto de línea final) y el sello que descargaste arriba (o el que traiga tu
                copia, decodificado de base64) en <code className="font-mono">sello.tsr</code>.
                Los certificados de la autoridad de estampado están en freetsa.org/files.
              </p>
              <Mono className="mt-3 rounded-[8px] border border-line bg-surface-muted p-3">
                {`printf '%s' "<hash>" > hash.txt
openssl ts -verify -data hash.txt -in sello.tsr \\
  -CAfile cacert.pem -untrusted tsa.crt`}
              </Mono>
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
                Un <code className="font-mono">Verification: OK</code> confirma que ese hash ya
                existía en la fecha del sello y que el documento no cambió desde entonces. Cada
                informe además queda encadenado al hash del informe anterior del mismo abogado:
                alterar uno rompe la cadena hacia adelante.
              </p>
            </Card>
          ) : null}
        </>
      ) : null}

      <p className="text-[12px] text-ink-muted">
        <Link href="/privacidad" className="underline underline-offset-2">
          Política de tratamiento de datos
        </Link>
        {" · "}
        <Link href="/transparencia" className="underline underline-offset-2">
          VIGÍA se audita a sí misma
        </Link>
      </p>
    </SitePage>
  );
}
