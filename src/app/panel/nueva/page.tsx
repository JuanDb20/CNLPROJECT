import Link from "next/link";

import { crearAuditoria, crearAuditoriaEjemplo } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Panel, buttonClass, fieldClass } from "@/components/ui";

import { AreaDesplegable, AutorizacionSitio } from "./campos-sistema";
import { ClienteCampos } from "./cliente-campos";

/* Sectores limitados a cinco (Sara, 27-oct): los que el equipo justifica a
   fondo —qué se exige en cada uno, qué normas lo rigen y quién vigila—. Entre
   paréntesis, la autoridad de vigilancia. El texto sigue siendo libre para el
   motor: src/domain/sectores.ts elige el paquete normativo por palabra clave. */
const SECTORS = [
  "Financiero, fintech y seguros (Superfinanciera y SIC)",
  "Salud (Supersalud)",
  "Comercio electrónico (SIC)",
  "Telecomunicaciones (MinTIC, CRC y SIC)",
  "Redes sociales y plataformas digitales (SIC)",
];

const FINTREX_SECTOR = SECTORS[0];

export const metadata = { title: "Nueva auditoría" };

export default async function NuevaAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    caso?: string;
    cliente?: string;
    nit?: string;
    representante?: string;
    sector?: string;
    sistema?: string;
    repositorio?: string;
    despliegue?: string;
    formalizacion?: string;
  }>;
}) {
  const sp = await searchParams;
  const { error } = sp;
  const isFintrex = sp.caso === "fintrex";
  const defaults = {
    cliente: sp.cliente ?? (isFintrex ? "Fintrex S.A.S." : ""),
    nit: sp.nit ?? (isFintrex ? "902.999.990-6" : ""),
    representante: sp.representante ?? (isFintrex ? "María Fernanda Ríos" : ""),
    sector: sp.sector ?? (isFintrex ? FINTREX_SECTOR : ""),
    sistema:
      sp.sistema ??
      (isFintrex
        ? "Portal de clientes con vinculación digital (selfie y cédula) y asistente de chat"
        : ""),
    repositorio: sp.repositorio ?? "",
    despliegue: sp.despliegue ?? "",
    formalizacion: sp.formalizacion ?? "registrada",
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link
          href="/panel"
          className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          <span aria-hidden>←</span> Mis auditorías
        </Link>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-ink">
          Nueva auditoría
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Registra la empresa y carga el código del proyecto que se va a revisar.
        </p>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            ¿Solo estás probando el sistema? Abre una auditoría con un cliente y un
            código de ejemplo (con fallas reales, no precalculadas) sin llenar nada.
          </p>
          <form action={crearAuditoriaEjemplo}>
            <SubmitButton variant="secondary" pendingText="Abriendo el ejemplo…">
              Usar datos de ejemplo
            </SubmitButton>
          </form>
        </div>
      </Panel>

      {error ? (
        <Panel tone="critical" role="alert" tabIndex={-1} autoFocus className="outline-none">
          <p className="text-[12.5px] text-critical">
            {error === "1"
              ? "No se pudo abrir la auditoría. Revisa que el cliente, el NIT (con su dígito de verificación) y el representante legal estén completos, y que el código sea un .zip de hasta 4 MB con archivos de texto o un repositorio público de GitHub."
              : error}
          </p>
        </Panel>
      ) : null}

      <form action={crearAuditoria} className="space-y-5">
        <Card>
          <CardHeader
            step="1."
            title="Cliente"
            description="Responsable del tratamiento. Sus datos encabezan el acuerdo de alcance y el informe."
          />
          <ClienteCampos
            sectores={SECTORS}
            defaults={{
              cliente: defaults.cliente,
              nit: defaults.nit,
              representante: defaults.representante,
              sector: defaults.sector,
              formalizacion: defaults.formalizacion,
            }}
          />
        </Card>

        {/* Paso 2 con el nombre y los textos que propuso Sara (27-oct), revisados
            contra lo que hace el código: zip.ts excluye node_modules, .git, .next,
            dist, build y los binarios; la huella es el SHA-256 del .zip; del
            repositorio se descarga la rama principal; el sitio solo recibe GET. */}
        <Card>
          <CardHeader
            step="2."
            title="Arquitectura de análisis automatizado y entorno de ejecución"
            description="VIGÍA analiza el código en memoria dentro de un entorno aislado, sin establecer conexiones con los sistemas de producción."
          />
          <div className="space-y-5">
            <label className="block text-[12px] text-ink-soft">
              ¿Qué hace el sistema? <span className="text-ink-faint">(opcional)</span>
              <AreaDesplegable
                name="sistema"
                maxLength={1000}
                placeholder="Asistente de chat para clientes, vinculación digital con selfie y cédula…"
                defaultValue={defaults.sistema}
              />
            </label>
            <div>
              <label className="block text-[12px] text-ink-soft">
                <span className="font-semibold text-ink">Carga del proyecto</span>{" "}
                <span className="text-ink-faint">(.zip, hasta 4 MB)</span>
                <input
                  name="codigo"
                  type="file"
                  accept=".zip,application/zip"
                  aria-describedby="f-codigo-help"
                  className="mt-1 block w-full rounded-[7px] border border-dashed border-line-strong bg-surface-muted px-3 py-3 text-[12.5px] text-ink-soft file:mr-3 file:rounded-[6px] file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:text-canvas"
                />
              </label>
              <span id="f-codigo-help" className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-muted">
                Comprime la carpeta de tu proyecto en un archivo .zip y súbela a VIGÍA. El sistema
                excluirá automáticamente los archivos y carpetas que no necesita revisar (librerías
                descargadas, historial de versiones, imágenes y otros binarios) y generará una
                huella digital (SHA-256) para identificar exactamente la versión analizada.
              </span>
            </div>
            <div>
              <label className="block text-[12px] text-ink-soft">
                <span className="font-semibold text-ink">Repositorio público de GitHub</span>{" "}
                <span className="text-ink-faint">(opcional si cargaste el .zip)</span>
                <input
                  name="repositorio"
                  type="url"
                  placeholder="https://github.com/organizacion/proyecto"
                  pattern="https://github\.com/[\w.\-]+/[\w.\-]+/?"
                  defaultValue={defaults.repositorio}
                  aria-describedby="f-repositorio-help"
                  className={fieldClass}
                />
              </label>
              <span id="f-repositorio-help" className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-muted">
                Si tu proyecto está publicado en GitHub como repositorio público, puedes compartir su
                enlace. VIGÍA descargará automáticamente su versión principal. Si proporcionas tanto
                el archivo .zip como el enlace de GitHub, se utilizará el repositorio. Hace falta al
                menos uno de los dos.
              </span>
            </div>
            <AutorizacionSitio defaultValue={defaults.despliegue} />
          </div>
        </Card>

        <p className="text-[11px] text-ink-faint">
          <span className="text-critical">*</span> Campo obligatorio
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/panel" className={buttonClass("secondary")}>
            Cancelar
          </Link>
          <SubmitButton>Crear auditoría</SubmitButton>
        </div>
      </form>
    </div>
  );
}
