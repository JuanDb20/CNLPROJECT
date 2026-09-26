"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RuleChip, SeverityBadge, buttonClass, cx } from "@/components/ui";
import type { FrameworkId, Severity } from "@/domain/types";

/** Estado simplificado de remediación para filtrar: agrupa `propuesta`/`pr-abierto` en "abierto". */
export type RiskState = "abierto" | "retesteado" | "firmado";

export interface RiskRow {
  id: string;
  code: string;
  severity: Severity;
  title: string;
  summary: string;
  signed: boolean;
  state: RiskState;
  frameworks: FrameworkId[];
  chips: Array<{ kind: string; label: string }>;
}

export interface FilterOption {
  id: FrameworkId | "todos";
  label: string;
}

const SEVERITY_FILTERS: Array<{ id: Severity | "todos"; label: string }> = [
  { id: "todos", label: "Toda severidad" },
  { id: "critico", label: "Crítico" },
  { id: "advertencia", label: "Advertencia" },
  { id: "informativo", label: "Informativo" },
];

const STATE_FILTERS: Array<{ id: RiskState | "todos"; label: string }> = [
  { id: "todos", label: "Todo estado" },
  { id: "abierto", label: "Abierto" },
  { id: "retesteado", label: "Retesteado" },
  { id: "firmado", label: "Firmado" },
];

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.id === active;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={isActive}
            className={cx(
              "rounded-[6px] border px-2.5 py-1.5 font-mono text-[10.5px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              isActive
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
  const [severity, setSeverity] = useState<Severity | "todos">("todos");
  const [state, setState] = useState<RiskState | "todos">("todos");

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (active === "todos" || row.frameworks.includes(active)) &&
          (severity === "todos" || row.severity === severity) &&
          (state === "todos" || row.state === state),
      ),
    [rows, active, severity, state],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup label="Filtrar por marco" options={filters} active={active} onChange={setActive} />
          <FilterGroup label="Filtrar por severidad" options={SEVERITY_FILTERS} active={severity} onChange={setSeverity} />
          <FilterGroup label="Filtrar por estado" options={STATE_FILTERS} active={state} onChange={setState} />
        </div>
        <p className="text-[11px] text-ink-muted">
          Orden: alta severidad y riesgo jurídico primero
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-muted">
          Ningún hallazgo del marco seleccionado.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-2.5 py-3 sm:flex-nowrap sm:py-4"
            >
              <div className="w-full sm:w-[108px] sm:shrink-0">
                <SeverityBadge severity={row.severity} />
                <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                  {row.code}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-medium leading-snug text-ink">
                  {row.title}
                </h2>
                {/* Dos líneas como máximo: la lista es para escoger cuál abrir,
                    no para leer el hallazgo entero. El texto completo está en su
                    detalle. */}
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                  {row.summary}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.chips.map((chip) => (
                    <RuleChip
                      key={`${row.id}-${chip.label}`}
                      kind={chip.kind}
                      label={chip.label}
                    />
                  ))}
                </div>
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
          ))}
        </ul>
      )}
    </div>
  );
}
