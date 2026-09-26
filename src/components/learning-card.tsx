/** Modo aprendizaje: el hallazgo como razonamiento jurídico, de los hechos al remedio. */
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
    <ol className="space-y-3 rounded-[8px] border border-brand-soft bg-brand-soft p-3.5">
      {steps.map((step) => (
        <li key={step.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{step.label}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}
