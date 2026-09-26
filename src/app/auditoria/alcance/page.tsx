import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { confirmarAlcance } from "@/app/actions";
import { Clausulas } from "@/components/clausulas";
import { CopyButton } from "@/components/copy-button";
import { Card, Panel, buttonClass, cx, fieldClass } from "@/components/ui";
import { formatDate } from "@/domain/format";
import { requireRun } from "@/server/session";

import { Pasos } from "./pasos";
import { RefrescarAlVolver } from "./refrescar";

export const metadata = { title: "Alcance y autorización" };

export const dynamic = "force-dynamic";

const BASE = "/auditoria/alcance";

/**
 * Paso 1: alcance y autorización, en tres pantallas seguidas (?paso=1, 2 y 3):
 * qué se audita, el acuerdo con el cliente y la autorización. Una cosa a la vez.
 *
 * El número de pantalla solo decide qué se muestra. El servidor sigue siendo la
 * autoridad: `authorizeScope` exige las cláusulas obligatorias aceptadas, se
 * llegue como se llegue a la tercera pantalla.
 */
export default async function AlcancePage({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string }>;
}) {
  const run = await requireRun();
  const { paso } = await searchParams;
  const actual = paso === "2" ? 2 : paso === "3" ? 3 : 1;
  const { client, source, clauses, clientAcceptance, authorizedAt, liveUrl } = run.scope;
  const h = await headers();
  const clientLink = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/cliente/${run.id}/${run.scope.clientToken}`;

  const canContinue = clauses.every((c) => !c.required || c.accepted);

  /* Constancia de la aceptación en el portal, con el nombre y la cédula de quien aceptó. */
  const aceptadoPor = clientAcceptance
    ? `Aceptado por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) desde el portal del cliente, el ${formatDate(clientAcceptance.at, { time: true })}`
    : null;

  let titulo: string;
  let frase: string;
  let contenido: ReactNode;

  if (actual === 1) {
    /* Ficha completa del caso: es lo único que hay que revisar en esta pantalla. */
    const ficha: Array<[string, ReactNode]> = [
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
      [
        "Código",
        <>
          <span className="font-mono text-[12.5px]">{source.fileName}</span> · {source.fileCount}{" "}
          archivos · {Math.max(1, Math.round(source.bytes / 1024))} KB
        </>,
      ],
      [
        "Huella SHA-256",
        <>
          <span className="break-all font-mono text-[11.5px]">{source.sha256}</span>
          <span className="mt-1 block text-[12px] text-ink-muted">
            Si el código cambia, cambia la huella: así queda fijada la versión exacta que se audita.
          </span>
        </>,
      ],
      [
        "Aplicación publicada",
        liveUrl ? (
          <>
            <span className="break-all font-mono text-[12px]">{liveUrl}</span>
            <span className="mt-1 block text-[12px] text-ink-muted">
              Solo se consulta en lectura, en las direcciones que fija el acuerdo.
            </span>
          </>
        ) : null,
      ],
    ];

    titulo = "Cliente y código";
    frase = "Revisa que sean el cliente y la versión del código que se van a auditar.";
    contenido = (
      <>
        <Card>
          <p className="text-[18px] font-semibold leading-tight text-ink">{client.name}</p>
          {client.system ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{client.system}</p>
          ) : null}
          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-5 text-[13px] sm:grid-cols-[auto_1fr]">
            {ficha.filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="sm:contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="min-w-0 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <Link href={`${BASE}?paso=2`} className={buttonClass("primary")}>
            Siguiente
          </Link>
        </div>
      </>
    );
  } else if (actual === 2) {
    titulo = "Acuerdo con el cliente";
    frase =
      "VIGÍA no ejecuta ninguna prueba sin autorización escrita del cliente, y las que ejecuta corren en un entorno aislado, sin tocar bases de datos activas ni datos reales.";
    contenido = (
      <>
        {aceptadoPor ? (
          <Panel tone="safe">
            <p className="text-[12.5px] leading-relaxed text-safe">{aceptadoPor}</p>
          </Panel>
        ) : null}
        <Card>
          <Clausulas
            clauses={clauses}
            bloqueadas={clientAcceptance !== null || authorizedAt !== null}
          />
        </Card>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
          <Link href={`${BASE}?paso=1`} className={buttonClass("secondary")}>
            Volver
          </Link>
          {canContinue ? (
            <Link href={`${BASE}?paso=3`} className={buttonClass("primary")}>
              Siguiente
            </Link>
          ) : (
            /* Camino alterno: que el representante legal acepte en línea, con su nombre y cédula. */
            <Link href={`${BASE}?paso=3`} className={buttonClass("ghost")}>
              Prefiero enviarlo al representante legal →
            </Link>
          )}
        </div>
      </>
    );
  } else {
    const enlace = (
      <div className="rounded-[8px] border border-line bg-surface-muted p-4">
        <div className="flex gap-2">
          <input
            readOnly
            value={clientLink}
            aria-label="Enlace del portal del cliente"
            className={cx(fieldClass, "flex-1 font-mono text-[11px]")}
          />
          <CopyButton value={clientLink} className="mt-1" />
        </div>
        <a
          href={clientLink}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-block text-[12px] text-brand hover:underline"
        >
          Abrir el portal del cliente ↗
        </a>
      </div>
    );

    titulo = "Autorización";
    frase = authorizedAt
      ? `VIGÍA quedó autorizada para analizar el código el ${formatDate(authorizedAt, { time: true })}`
      : clientAcceptance
        ? "El representante legal aceptó el acuerdo. Al confirmar, VIGÍA queda autorizada para analizar el código."
        : canContinue
          ? "Al confirmar declaras que el representante legal firmó este acuerdo, y VIGÍA queda autorizada para analizar el código."
          : `Envía este enlace a ${client.legalRepresentative}: allí lee el acuerdo y lo acepta con su nombre y cédula.`;
    contenido = (
      <>
        {canContinue ? (
          /* Lo que se autoriza, como el pie de firma de un contrato: partes, objeto y acuerdo. */
          <Card>
            <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-[auto_1fr]">
              <div className="sm:contents">
                <dt className="text-ink-muted">Cliente</dt>
                <dd className="text-ink">
                  {client.name} · NIT {client.nit}
                </dd>
              </div>
              <div className="sm:contents">
                <dt className="text-ink-muted">Código</dt>
                <dd className="min-w-0 text-ink">
                  <span className="font-mono text-[12.5px]">{source.fileName}</span> · huella{" "}
                  <span className="font-mono text-[12px]">{source.sha256.slice(0, 16)}…</span>
                </dd>
              </div>
              <div className="sm:contents">
                <dt className="text-ink-muted">Acuerdo</dt>
                <dd className={aceptadoPor ? "text-safe" : "text-ink"}>
                  {aceptadoPor ?? `${clauses.length} cláusulas aceptadas`}
                </dd>
              </div>
            </dl>
          </Card>
        ) : (
          <>
            {enlace}
            <p className="text-[12.5px] text-ink-muted">
              Si ya firmó el acuerdo por fuera de VIGÍA,{" "}
              <Link href={`${BASE}?paso=2`} className="text-brand hover:underline">
                acepta tú las cláusulas
              </Link>
              .
            </p>
          </>
        )}
        {canContinue && !clientAcceptance && !authorizedAt ? (
          <details className="text-[12.5px]">
            <summary className="cursor-pointer list-none text-ink-muted transition-colors hover:text-ink">
              <span aria-hidden className="mr-1.5">›</span>
              ¿Aún no lo firma? Envíaselo para que lo acepte en línea
            </summary>
            <div className="mt-3">{enlace}</div>
          </details>
        ) : null}
        {/* Acepta en su portal, en otra pestaña: al volver, esta pantalla ya lo sabe. */}
        {!clientAcceptance && !authorizedAt ? <RefrescarAlVolver /> : null}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
          <Link href={`${BASE}?paso=2`} className={buttonClass("secondary")}>
            Volver
          </Link>
          {authorizedAt ? (
            <Link href="/auditoria/configuracion" className={buttonClass("primary")}>
              Continuar
            </Link>
          ) : (
            <form action={confirmarAlcance}>
              <button
                type="submit"
                disabled={!canContinue}
                className={buttonClass("primary", true)}
              >
                Confirmar y continuar
              </button>
            </form>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="max-w-[780px] space-y-6">
      <Pasos base={BASE} nombres={["Cliente y código", "Acuerdo", "Autorización"]} actual={actual} />
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-ink-muted">{frase}</p>
      </div>
      {contenido}
    </div>
  );
}
