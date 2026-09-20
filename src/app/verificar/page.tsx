import Link from "next/link";

import { Logo } from "@/components/shell";
import { Card, Mono, Panel, buttonClass, fieldClass } from "@/components/ui";
import { formatDate } from "@/domain/format";
import { repository } from "@/server/store";

/**
 * Verificación pública de un informe. No exige sesión y no revela de quién es
 * la auditoría: solo lo que hace falta para comprobar que el documento no se
 * alteró y que existía en la fecha del sello.
 */
export const metadata = { title: "Verificar un informe" };

export const dynamic = "force-dynamic";

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-2.5 sm:grid sm:grid-cols-[210px_1fr] sm:gap-4">
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-ink sm:mt-0">{children}</dd>
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
    <div id="contenido" role="main" className="mx-auto w-full max-w-[760px] space-y-6 px-5 py-12">
      <Link href="/" aria-label="VIGÍA, inicio" className="inline-block">
        <Logo />
      </Link>

      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Verificar un informe
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-ink-muted">
          Escribe el identificador del informe (VGI-INF-…) o su hash. La verificación
          acredita la integridad del documento y su fecha cierta; no acredita que su
          contenido sea veraz (Ley 527 de 1999, arts. 10 y 11).
        </p>
      </div>

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
            No existe ningún informe con ese identificador o hash.
          </p>
        </Panel>
      ) : null}

      {cert ? (
        <>
          <Card>
            <dl className="text-[12.5px]">
              <Dato label="Informe">{cert.id}</Dato>
              <Dato label="Fecha de expedición">
                {formatDate(cert.issuedAt, { time: true })}
              </Dato>
              <Dato label="Hash del informe">
                <Mono>{cert.hash}</Mono>
              </Dato>
              <Dato label="Hash del informe anterior">
                <Mono>{cert.previousHash}</Mono>
              </Dato>
              <Dato label="Sello de tiempo">
                {cert.timestamp
                  ? `${cert.timestamp.tsa} · ${formatDate(cert.timestamp.at, { time: true })}`
                  : "Sin sello: la autoridad de estampado no respondió al expedirlo"}
              </Dato>
              <Dato label="Puntuación antes / después">
                {cert.scoreBefore} → {cert.scoreAfter}
              </Dato>
              <Dato label="SHA-256 del código auditado">
                <Mono>{cert.sourceSha256}</Mono>
              </Dato>
              <Dato label="SHA-256 de la versión corregida">
                {cert.retestSha256 ? <Mono>{cert.retestSha256}</Mono> : "No se cargó"}
              </Dato>
              <Dato label="Hallazgos firmados">
                {cert.signedCount} de {cert.findingsCount}
              </Dato>
              <Dato label="Abogados firmantes">
                {cert.signers.length > 0 ? cert.signers.join(" · ") : "No registrados"}
              </Dato>
            </dl>
          </Card>

          <Card>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Cómo verificar el sello con openssl
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              Guarda el hash de arriba en <code className="font-mono">hash.txt</code> (sin
              salto de línea final) y el sello del informe, en base64, decodificado en{" "}
              <code className="font-mono">sello.tsr</code>. Los certificados de la
              autoridad de estampado están en freetsa.org/files.
            </p>
            <Mono className="mt-3 rounded-[8px] border border-line bg-surface-muted p-3">
              {`printf '%s' "<hash>" > hash.txt
openssl ts -verify -data hash.txt -in sello.tsr \\
  -CAfile cacert.pem -untrusted tsa.crt`}
            </Mono>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
              Un <code className="font-mono">Verification: OK</code> prueba que ese hash
              existía en la fecha del sello y que el documento no cambió desde entonces.
              Cada informe se encadena además al hash del informe anterior del mismo
              abogado, de modo que alterar uno rompe la cadena.
            </p>
          </Card>
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
    </div>
  );
}
