import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type { Severity } from "@/domain/types";

/* Primitivas de interfaz. Sin estado y sin lógica de dominio: solo el sistema
   visual derivado de los sketches, para que las pantallas se lean como
   composición y no como CSS. */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export { cx };

/* ------------------------------ Tarjetas ------------------------------ */

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cx(
        "rounded-[12px] border border-line bg-surface p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  step,
  title,
  tag,
  tagTone = "neutral",
  description,
}: {
  step?: string;
  title: string;
  tag?: string;
  tagTone?: "neutral" | "brand" | "required" | "safe";
  description?: string;
}) {
  return (
    <header className="mb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">
          {step ? <span className="text-ink-muted">{step} </span> : null}
          {title}
        </h2>
        {tag ? <Tag tone={tagTone}>{tag}</Tag> : null}
      </div>
      {description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------ Etiquetas ----------------------------- */

const TAG_TONES = {
  neutral: "bg-canvas text-ink-soft border-line",
  brand: "bg-brand-soft text-brand border-brand-soft",
  required: "bg-warning-soft text-warning border-warning-soft",
  safe: "bg-safe-soft text-safe border-safe-soft",
  critical: "bg-critical-soft text-critical border-critical-soft",
} as const;

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TAG_TONES;
}) {
  return (
    <span
      className={cx(
        "rounded-[5px] border px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-wider",
        TAG_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  critico: "bg-critical-soft text-critical",
  advertencia: "bg-warning-soft text-warning",
  informativo: "bg-info-soft text-info",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critico: "Crítico",
  advertencia: "Advertencia",
  informativo: "Informativo",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-[5px] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
        SEVERITY_STYLE[severity],
      )}
    >
      {SEVERITY_TEXT[severity]}
    </span>
  );
}

/** Chip de trazabilidad normativa: "Jurídica / Ley 1581 Art. 5". */
export function RuleChip({ kind, label }: { kind: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-canvas px-2 py-1 font-mono text-[10px] text-ink-soft">
      <span className="text-ink-faint">{kind}</span>
      <span aria-hidden>/</span>
      <span>{label}</span>
    </span>
  );
}

/* ------------------------------- Botones ------------------------------ */

const BUTTON_VARIANTS = {
  primary:
    "bg-ink text-canvas hover:bg-ink-soft disabled:bg-line-strong disabled:text-canvas",
  brand:
    "bg-brand text-canvas hover:bg-brand-strong disabled:bg-line-strong disabled:text-canvas",
  secondary:
    "border border-line bg-surface text-ink-soft hover:bg-surface-muted disabled:text-ink-faint",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export const buttonClass = (variant: ButtonVariant = "primary", full = false) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:cursor-not-allowed",
    full && "w-full",
    BUTTON_VARIANTS[variant],
  );

/* ----------------------------- Formularios ---------------------------- */

export const fieldClass =
  "mt-1 w-full rounded-[7px] border border-ink-faint bg-surface px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/* -------------------------------- Texto ------------------------------- */

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">
      {children}
    </p>
  );
}

export function Panel({
  children,
  tone = "neutral",
  className,
  ...rest
}: {
  children: ReactNode;
  tone?: "neutral" | "critical" | "safe" | "brand";
  className?: string;
} & ComponentPropsWithoutRef<"div">) {
  const tones = {
    neutral: "border-line bg-surface-muted",
    critical: "border-critical-soft bg-critical-soft",
    safe: "border-safe-soft bg-safe-soft",
    brand: "border-brand-soft bg-brand-soft",
  } as const;
  return (
    <div className={cx("rounded-[8px] border p-3.5", tones[tone], className)} {...rest}>
      {children}
    </div>
  );
}

export function Mono({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "critical" | "safe" | "added" | "removed";
  className?: string;
}) {
  const tones = {
    neutral: "text-ink-soft",
    critical: "text-critical",
    safe: "text-safe",
    added: "text-safe",
    removed: "text-critical",
  } as const;
  return (
    <code
      className={cx(
        "block font-mono text-[11px] leading-[1.7] whitespace-pre-wrap break-words",
        tones[tone],
        className,
      )}
    >
      {children}
    </code>
  );
}

/* ------------------------------- Progreso ----------------------------- */

export function ProgressBar({
  value,
  tone = "ink",
}: {
  value: number;
  tone?: "ink" | "brand";
}) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "ink" ? "bg-ink" : "bg-brand",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------- Iconos ------------------------------- */

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cx("size-4", className)}>
      <path
        d="M3.5 8.4l3 3 6-6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca de VIGÍA: insignia hexagonal con un acceso (>>) — no un escudo genérico. */
export function MarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 489 405" aria-hidden className={cx("size-4", className)}>
      {/* La V de la marca: trazo en el color del texto y remate verde azulado. */}
      <path
        d="M.5 46H130.5L248.75 260.9A60 60 0 0 0 301.3 292H328.15L282.8 374.4A58.1 58.1 0 0 1 181.2 374.4Z"
        fill="currentColor"
      />
      <path
        d="M388.3 0H488.75L382.6 193H252.6L344.5 25.9A50 50 0 0 1 388.3 0Z"
        className="fill-brand-bright"
      />
    </svg>
  );
}
