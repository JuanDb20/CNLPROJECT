import { Card, Label } from "./ui";

/** Modo aprendizaje: explica el hallazgo como una cadena de razonamiento en lenguaje llano. */
export function LearningCard({
  hecho,
  norma,
  riesgo,
  remedio,
}: {
  hecho: string;
  norma: string;
  riesgo: string;
  remedio: string;
}) {
  const steps = [
    { label: "Hecho", detail: hecho },
    { label: "Norma", detail: norma },
    { label: "Riesgo", detail: riesgo },
    { label: "Remedio", detail: remedio },
  ];
  return (
    <Card>
      <Label>Cadena de razonamiento</Label>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.label} className="flex gap-3">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-[11px] font-medium text-brand"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-ink">{step.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
