import { headers } from "next/headers";

import { confirmarAlcance } from "@/app/actions";
import { Clausulas } from "@/components/clausulas";
import { CopyButton } from "@/components/copy-button";
import {
  Card,
  CardHeader,
  Panel,
  Tag,
  buttonClass,
  cx,
  fieldClass,
} from "@/components/ui";
import { formatDate } from "@/domain/format";
import { requireRun } from "@/server/session";

export const metadata = { title: "Alcance y autorización" };

export const dynamic = "force-dynamic";

/**
 * Paso 1: alcance y autorización.
 *
 * La pantalla responde dos preguntas y nada más: qué se va a auditar y con qué
 * permiso. El detalle registral del cliente y la letra pequeña del entorno
 * viven en zonas desplegables, porque son consulta, no decisión. Lo único que
 * el abogado decide aquí es aceptar cada cláusula, y eso exige haber abierto su
 * texto (ver components/clausulas.tsx).
 */
export default async function AlcancePage() {
  const run = await requireRun();
  const { client, source, clauses, signatories, dataMinimizationEnabled, clientAcceptance, liveUrl } =
    run.scope;
  const h = await headers();
  const clientLink = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/cliente/${run.id}/${run.scope.clientToken}`;

  const canContinue = clauses.filter((c) => c.required && !c.accepted).length === 0;

  /* Detalle registral: se consulta, no se decide. Va dentro de un desplegable. */
  const fichaCliente = [
    ["NIT", client.nit],
    ["Representante legal", client.legalRepresentative],
    ["Sector", client.sector],
    [
      "Registro mercantil",
      client.rues
        ? `${client.rues.name} · matrícula ${client.rues.status.toLowerCase()} · renovada en ${client.rues.renewed} (RUES)`
        : client.rues === null
          ? "El NIT no aparece en el RUES (datos abiertos de Confecámaras)"
          : "",
    ],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Alcance y autorización
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Qué código se audita y con qué permiso
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* ------------------------- 1. Resumen del caso ------------------------- */}
        <Card>
          <CardHeader
            step="1."
            title="Resumen del caso"
            tag="Cadena de custodia"
            tagTone="brand"
          />

          <p className="text-[16px] font-semibold leading-tight text-ink">{client.name}</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            {[client.sector, client.legalRepresentative].filter(Boolean).join(" · ")}
          </p>

          {client.system ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{client.system}</p>
          ) : null}

          <div className="mt-4 rounded-[8px] border border-line bg-surface-muted p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] font-medium text-ink">
                  {source.fileName}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {source.fileCount} archivos ·{" "}
                  {Math.max(1, Math.round(source.bytes / 1024))} KB
                </p>
              </div>
              <Tag tone="safe">Cargado</Tag>
            </div>
            <p className="mt-2.5 break-all border-t border-line pt-2.5 font-mono text-[10px] leading-relaxed text-ink-faint">
              SHA-256 {source.sha256}
            </p>
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-faint">
            Esa huella fija la versión auditada: cualquier cambio posterior en el código
            exige una auditoría nueva.
          </p>

          <details className="group mt-4 border-t border-line pt-3.5">
            <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
              <span aria-hidden className="mr-1.5 inline-block transition-transform group-open:rotate-90">
                ›
              </span>
              Ficha del cliente y tratamiento de los datos
            </summary>

            <dl className="mt-3.5 grid gap-x-4 gap-y-2 text-[12px] sm:grid-cols-[auto_1fr]">
              {fichaCliente.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-ink-soft">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-3.5 text-[11.5px] leading-relaxed text-ink-muted">
              Minimización de datos{" "}
              {dataMinimizationEnabled ? (
                <span className="text-safe">activa</span>
              ) : (
                <span className="text-critical">inactiva</span>
              )}
              : VIGÍA enmascara credenciales, llaves de API y datos personales del cliente
              antes de cualquier análisis.
            </p>

            {liveUrl ? (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-muted">
                Despliegue declarado:{" "}
                <span className="break-all font-mono text-[11px] text-ink-soft">{liveUrl}</span>.
                Solo se consulta si se acepta la cláusula que lo autoriza.
              </p>
            ) : null}
          </details>
        </Card>

        {/* ------------------------ 2. Acuerdo de alcance ------------------------ */}
        <Card className="flex flex-col">
          <CardHeader
            step="2."
            title="Acuerdo de alcance"
            tag="Requerido"
            tagTone="required"
            description="Sin autorización escrita, VIGÍA no ejecuta ninguna prueba. Cada cláusula se acepta después de abrir su texto."
          />

          <Clausulas clauses={clauses} bloqueadas={clientAcceptance !== null} />

          {clientAcceptance ? (
            <Panel tone="safe" className="mt-5">
              <p className="text-[12px] leading-relaxed text-safe">
                Aceptado por {clientAcceptance.name} (C.C. {clientAcceptance.idNumber}) desde el
                portal del cliente, el {formatDate(clientAcceptance.at, { time: true })}
              </p>
            </Panel>
          ) : (
            <details className="mt-5 rounded-[8px] border border-line bg-surface-muted p-3.5">
              <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
                <span aria-hidden className="mr-1.5">›</span>
                Enviar el acuerdo al representante legal
              </summary>
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  value={clientLink}
                  aria-label="Enlace del portal del cliente"
                  className={cx(fieldClass, "flex-1 font-mono text-[11px]")}
                />
                <CopyButton value={clientLink} className="mt-1" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                {client.legalRepresentative} lee el acuerdo allí y lo acepta con su nombre y
                cédula. Si ya se firmó por fuera de VIGÍA, marca tú las cláusulas.
              </p>
            </details>
          )}

          <details className="mt-3 text-[12px]">
            <summary className="cursor-pointer list-none text-ink-muted transition-colors hover:text-ink">
              <span aria-hidden className="mr-1.5">›</span>
              Firmantes autorizados ({signatories.length})
            </summary>
            <ul className="mt-2.5 space-y-1.5">
              {signatories.map((s) => (
                <li key={s.id} className="text-[11.5px] text-ink-soft">
                  {s.role}
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-auto pt-5">
            <form action={confirmarAlcance}>
              <button
                type="submit"
                disabled={!canContinue}
                className={buttonClass("primary", true)}
              >
                Confirmar alcance y continuar
              </button>
            </form>
          </div>
        </Card>
      </div>

      <p className="max-w-[78ch] text-[11.5px] leading-relaxed text-ink-faint">
        Las pruebas corren en un entorno aislado: VIGÍA no se conecta a bases de datos
        activas ni a infraestructura productiva.
      </p>
    </div>
  );
}
