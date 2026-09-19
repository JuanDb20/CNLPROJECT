import Link from "next/link";

import { crearAuditoria, crearAuditoriaEjemplo } from "@/app/actions";
import { Card, CardHeader, Panel, buttonClass, fieldClass } from "@/components/ui";

const SECTORS = [
  "Financiero y fintech (Superfinanciera)",
  "Seguros (Superfinanciera)",
  "Salud (Supersalud)",
  "Comercio electrónico y retail (SIC)",
  "Servicios públicos domiciliarios (SSPD)",
  "Transporte (Supertransporte)",
  "Vigilancia y seguridad privada (Supervigilancia)",
  "Economía solidaria (Supersolidaria)",
  "Sociedades e industria (Supersociedades)",
  "Educación (Mineducación)",
  "Telecomunicaciones (MinTIC/CRC)",
  "Sector público",
  "Otro",
];

export default async function NuevaAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
          Registra al cliente y carga el código del sistema de IA que vas a auditar.
        </p>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            ¿Solo estás probando el sistema? Abre una auditoría con un cliente y un
            código de ejemplo (con fallas reales, no precalculadas) sin llenar nada.
          </p>
          <form action={crearAuditoriaEjemplo}>
            <button type="submit" className={buttonClass("secondary")}>
              Usar datos de ejemplo
            </button>
          </form>
        </div>
      </Panel>

      {error ? (
        <Panel tone="critical">
          <p className="text-[12.5px] text-critical">
            No se pudo abrir la auditoría. Revisa que el cliente, el NIT (con su dígito de verificación) y el representante
            legal estén completos, y que el código sea un .zip de hasta 4 MB con archivos
            de texto o un repositorio público de GitHub.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[12px] text-ink-soft sm:col-span-2">
              Razón social
              <input name="cliente" required minLength={2} maxLength={200} className={fieldClass} />
            </label>
            <label className="block text-[12px] text-ink-soft">
              NIT
              <input
                name="nit"
                required
                minLength={5}
                maxLength={30}
                placeholder="902.999.990-6"
                className={fieldClass}
              />
            </label>
            <label className="block text-[12px] text-ink-soft">
              Sector
              <select name="sector" className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Selecciona
                </option>
                {SECTORS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-ink-soft sm:col-span-2">
              Representante legal
              <input
                name="representante"
                required
                minLength={3}
                maxLength={200}
                className={fieldClass}
              />
              <span className="mt-1 block text-[11px] text-ink-faint">
                Firma la autorización de las pruebas en el paso de alcance.
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader
            step="2."
            title="Sistema de IA y código"
            description="VIGÍA analiza el código en memoria y en un entorno aislado. No se conecta a producción."
          />
          <div className="space-y-4">
            <label className="block text-[12px] text-ink-soft">
              ¿Qué hace el sistema? <span className="text-ink-faint">(opcional)</span>
              <textarea
                name="sistema"
                rows={3}
                maxLength={1000}
                placeholder="Asistente de chat para clientes, vinculación digital con selfie y cédula…"
                className={fieldClass}
              />
            </label>
            <label className="block text-[12px] text-ink-soft">
              Código fuente (.zip, hasta 4 MB)
              <input
                name="codigo"
                type="file"
                accept=".zip,application/zip"
                className="mt-1 block w-full rounded-[7px] border border-dashed border-line-strong bg-surface-muted px-3 py-3 text-[12.5px] text-ink-soft file:mr-3 file:rounded-[6px] file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:text-canvas"
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-ink-faint">
                Comprime la carpeta del proyecto. VIGÍA ignora node_modules, .git y los
                archivos binarios, y calcula el SHA-256 del .zip para fijar la versión
                auditada.
              </span>
            </label>
            <label className="block text-[12px] text-ink-soft">
              O repositorio público de GitHub
              <input
                name="repositorio"
                type="url"
                placeholder="https://github.com/organizacion/proyecto"
                pattern="https://github\.com/[\w.\-]+/[\w.\-]+/?"
                className={fieldClass}
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-ink-faint">
                VIGÍA descarga la rama principal. Si llenas los dos, se usa el repositorio.
              </span>
            </label>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/panel" className={buttonClass("secondary")}>
            Cancelar
          </Link>
          <button type="submit" className={buttonClass("brand")}>
            Crear auditoría
          </button>
        </div>
      </form>
    </div>
  );
}
