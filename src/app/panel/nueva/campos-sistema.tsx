"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { fieldClass } from "@/components/ui";

/**
 * Caja de texto «desplegable» (Sara, 27-oct: «detalles de fina coquetería»):
 * cerrada ocupa dos renglones; al entrar se despliega y luego crece con lo que
 * se escriba, sin barra de desplazamiento ni manija de arrastre.
 */
export function AreaDesplegable({
  name,
  defaultValue,
  placeholder,
  maxLength,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [abierta, setAbierta] = useState(Boolean(defaultValue));

  const ajustar = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(ajustar, [abierta]);

  return (
    <textarea
      ref={ref}
      name={name}
      rows={abierta ? 4 : 2}
      maxLength={maxLength}
      placeholder={placeholder}
      defaultValue={defaultValue}
      onFocus={() => setAbierta(true)}
      onBlur={(e) => setAbierta(Boolean(e.currentTarget.value.trim()))}
      onInput={ajustar}
      data-abierta={abierta || undefined}
      className={`${fieldClass} area-desplegable resize-none overflow-hidden`}
    />
  );
}

/** Dominio sin «www.» para comparar lo que escribe la persona con la URL. */
function dominio(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" || !u.hostname.includes(".")) return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Enlace del sitio web (opcional) y, si se llena, la autorización explícita
 * para revisarlo: casilla «Autorizo» y confirmación escribiendo el dominio
 * (Sara pidió «un autorizo con captcha o algo así»). Escribir el dominio sirve
 * de comprobación humana y, sobre todo, deja claro qué sitio exacto se autoriza.
 * El servidor repite las dos comprobaciones (orchestrator.ts). La cláusula del
 * acuerdo de alcance que acepta el representante legal sigue siendo necesaria.
 */
export function AutorizacionSitio({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [confirmacion, setConfirmacion] = useState("");
  const host = dominio(url);
  const coincide =
    host !== null &&
    confirmacion.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") === host;

  return (
    <div>
      <label className="block text-[12px] text-ink-soft">
        <span className="font-semibold text-ink">Enlace del sitio web</span>{" "}
        <span className="text-ink-faint">(opcional)</span>
        <input
          name="despliegue"
          type="url"
          placeholder="https://portal.cliente.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={300}
          aria-describedby="f-despliegue-help"
          className={fieldClass}
        />
      </label>
      <span id="f-despliegue-help" className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-muted">
        Si el proyecto ya tiene un sitio web público, puedes compartir su dirección. VIGÍA hará
        únicamente consultas de lectura a páginas y recursos públicos específicos para revisar la
        información visible, las configuraciones expuestas y las características de seguridad del
        sitio. No modificará información ni hará cambios en el sistema. Para autorizar esta revisión,
        el representante legal deberá aceptar además la cláusula correspondiente del acuerdo.
      </span>

      {host ? (
        <div className="aparece mt-3 rounded-[10px] border border-brand bg-brand-soft p-4">
          <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink">
            <input type="checkbox" name="autorizoDespliegue" required className="mt-1 size-4 accent-[var(--color-brand)]" />
            <span>
              <strong>Autorizo</strong>, en nombre de la empresa, que VIGÍA consulte en modo de solo
              lectura las páginas públicas de <span className="font-mono text-[12px]">{host}</span>.
            </span>
          </label>
          <label className="mt-3 block text-[12px] text-ink-soft">
            Para confirmar, escribe el dominio del sitio:{" "}
            <span className="select-all rounded-[4px] bg-surface px-1.5 py-0.5 font-mono text-[11.5px] text-ink">{host}</span>
            <span className="relative mt-1 block">
              <input
                name="confirmaDominio"
                required
                autoComplete="off"
                spellCheck={false}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                pattern={`(https?://)?(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?`}
                title={`Escribe ${host}`}
                aria-describedby="f-confirma-estado"
                className={`${fieldClass} mt-0 pr-9 font-mono`}
              />
              <span
                id="f-confirma-estado"
                aria-live="polite"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] transition-opacity ${
                  coincide ? "text-safe opacity-100" : "opacity-0"
                }`}
              >
                {coincide ? "✓" : ""}
                <span className="sr-only">{coincide ? "El dominio coincide" : ""}</span>
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
