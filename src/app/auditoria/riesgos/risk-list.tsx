"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Label, RuleChip, SeverityBadge, buttonClass, cx, fieldClass } from "@/components/ui";
import type { FrameworkId, Severity } from "@/domain/types";

export interface RiskRow {
  id: string;
  code: string;
  severity: Severity;
  title: string;
  summary: string;
  signed: boolean;
  frameworks: FrameworkId[];
  chips: Array<{ kind: string; label: string }>;
}

export interface FilterOption {
  id: FrameworkId | "todos";
  label: string;
}

/** Encabezados de la lista, en el mismo orden en que ya llegan las filas (ver sortFindings). */
const SEVERITY_GROUPS: Array<{ id: Severity; heading: string }> = [
  { id: "critico", heading: "Críticos" },
  { id: "advertencia", heading: "Advertencias" },
  { id: "informativo", heading: "Informativos" },
];

function RiskCard({ row }: { row: RiskRow }) {
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2.5 py-3 sm:flex-nowrap sm:py-4">
      <div className="w-full sm:w-[108px] sm:shrink-0">
        <SeverityBadge severity={row.severity} />
        <p className="mt-1.5 font-mono text-[10px] text-ink-faint">{row.code}</p>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-[13.5px] font-medium leading-snug text-ink">{row.title}</h2>
        {/* Una línea: la lista es para escoger cuál abrir, no para leer el
            hallazgo entero. El texto completo está en su detalle. */}
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-muted sm:line-clamp-1">
          {row.summary}
        </p>
        {row.chips[0] ? (
          <div className="mt-2">
            <RuleChip kind={row.chips[0].kind} label={row.chips[0].label} />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {row.signed ? (
          <span className="rounded-[5px] bg-safe-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-safe">
            Firmado
          </span>
        ) : null}
        <Link
          href={`/auditoria/hallazgos/${row.id}`}
          aria-label={`Ver hallazgo ${row.code}: ${row.title}`}
          className={cx(buttonClass("secondary"), "px-3 py-1.5 text-[12px]")}
        >
          Ver hallazgo
        </Link>
      </div>
    </li>
  );
}

export function RiskList({
  rows,
  filters,
}: {
  rows: RiskRow[];
  filters: FilterOption[];
}) {
  const [active, setActive] = useState<FrameworkId | "todos">("todos");

  const visible = useMemo(
    () => rows.filter((row) => active === "todos" || row.frameworks.includes(active)),
    [rows, active],
  );

  /* Un solo filtro (marco normativo); la severidad ya se lee de los
     encabezados de grupo, no hace falta un segundo control para eso. */
  const groups = SEVERITY_GROUPS.map((group) => ({
    ...group,
    rows: visible.filter((row) => row.severity === group.id),
  })).filter((group) => group.rows.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <label htmlFor="filtro-norma" className="text-[12px] text-ink-muted">
          Mostrar hallazgos de:
        </label>
        <select
          id="filtro-norma"
          value={active}
          onChange={(e) => setActive(e.target.value as FrameworkId | "todos")}
          className={cx(fieldClass, "mt-0 w-auto")}
        >
          {filters.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-muted">
          Ningún hallazgo del marco seleccionado.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="pt-4 first:pt-0">
              <Label>
                {group.heading} · {group.rows.length}
              </Label>
              <ul className="divide-y divide-line">
                {group.rows.map((row) => (
                  <RiskCard key={row.id} row={row} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
