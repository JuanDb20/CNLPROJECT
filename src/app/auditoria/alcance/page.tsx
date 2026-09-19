import { alternarClausula, confirmarAlcance } from "@/app/actions";
import {
  Card,
  CardHeader,
  CheckIcon,
  Label,
  Panel,
  Tag,
  buttonClass,
  cx,
} from "@/components/ui";
import { requireRun } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AlcancePage() {
  const run = await requireRun();
  const { client, source, clauses, signatories, dataMinimizationEnabled } = run.scope;

  const pendingRequired = clauses.filter((c) => c.required && !c.accepted).length;
  const canContinue = pendingRequired === 0;
  const clientRows = [
    ["Cliente", client.name],
    ["NIT", client.nit],
    ["Representante legal", client.legalRepresentative],
    ["Sector", client.sector],
    ["Sistema auditado", client.system],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Autorización del alcance y del repositorio
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Establece los límites operativos y la legalidad del equipo rojo
        </p>
      </div>

      {/* Declaración de consentimiento */}
      <Panel tone="neutral" className="flex gap-3">
        <span aria-hidden className="mt-0.5 shrink-0 text-ink-faint">
          <svg viewBox="0 0 16 16" className="size-4">
            <circle
              cx="8"
              cy="8"
              r="6.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M8 5.2v3.4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11" r="0.75" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink">
            Declaración de consentimiento explícito y entorno aislado
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Las pruebas de hacking ético se ejecutan estrictamente en entornos aislados.
            VIGÍA no interactúa con ramas de producción ni con bases de datos activas, y
            no ejecuta ninguna prueba sin la autorización escrita del cliente.
          </p>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* 1. Repositorio */}
        <Card>
          <CardHeader
            step="1."
            title="Cliente y código cargado"
            tag="Cadena de custodia"
            tagTone="brand"
            description="Versión del sistema que VIGÍA analiza. El hash SHA-256 fija exactamente qué código se auditó."
          />

          <div className="rounded-[8px] border border-line bg-surface-muted p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] font-medium text-ink">
                  {source.fileName}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {source.fileCount} archivos de código ·{" "}
                  {Math.max(1, Math.round(source.bytes / 1024))} KB
                </p>
                <p className="mt-1 break-all font-mono text-[10.5px] text-ink-faint">
                  SHA-256 {source.sha256}
                </p>
              </div>
              <Tag tone="safe">Cargado</Tag>
            </div>
          </div>

          <dl className="mt-4 grid gap-x-4 gap-y-2 text-[12px] sm:grid-cols-[auto_1fr]">
            {clientRows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-[8px] border border-line bg-surface-muted p-3.5">
            <p className="text-[12px] font-semibold text-ink">
              Filtro de minimización de datos{" "}
              {dataMinimizationEnabled ? (
                <span className="font-normal text-safe">activo</span>
              ) : (
                <span className="font-normal text-critical">inactivo</span>
              )}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
              Al cargar el código, VIGÍA anonimiza credenciales, llaves de API y
              datos sensibles del cliente antes de iniciar cualquier análisis técnico.
            </p>
          </div>
        </Card>

        {/* 2. Acuerdo de alcance */}
        <Card className="flex flex-col">
          <CardHeader
            step="2."
            title="Acuerdo de alcance jurídico (white hat)"
            tag="Requerido"
            tagTone="required"
            description="Valida las credenciales legales y los límites de responsabilidad operativa para el equipo rojo técnico."
          />

          <ul className="space-y-2.5">
            {clauses.map((clause) => (
              <li key={clause.id}>
                <form
                  action={async () => {
                    "use server";
                    await alternarClausula(clause.id, !clause.accepted);
                  }}
                >
                  <button
                    type="submit"
                    aria-pressed={clause.accepted}
                    className="group flex w-full items-start gap-2.5 rounded-[6px] p-1 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span
                      aria-hidden
                      className={cx(
                        "mt-px grid size-[17px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                        clause.accepted
                          ? "border-safe bg-safe text-canvas"
                          : "border-line-strong bg-surface text-transparent group-hover:border-ink-faint",
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-snug text-ink">
                        {clause.label}
                        {clause.required ? (
                          <span className="text-critical"> *</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                        {clause.detail}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-[8px] border border-line bg-surface-muted p-3.5">
            <Label>Firmantes autorizados</Label>
            <ul className="grid gap-2 sm:grid-cols-2">
              {signatories.map((s) => (
                <li key={s.id} className="text-[11.5px] text-ink-soft">
                  {s.role}
                </li>
              ))}
            </ul>
          </div>

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
            {!canContinue ? (
              <p className="mt-2 text-[11px] text-ink-muted">
                Faltan {pendingRequired} cláusula(s) obligatoria(s).
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
