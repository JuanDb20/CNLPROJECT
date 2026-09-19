import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/shell";
import { POLITICA_VERSION } from "@/server/auth";

export const metadata: Metadata = { title: "Política de tratamiento de datos · VIGÍA" };

// ponytail: buzón por definir; debe ser uno real antes de publicar (los titulares ejercen sus derechos por aquí).
const CONTACTO = "privacidad@vigia.test";

const SECTIONS: Array<[string, string[]]> = [
  ["Responsable", [
    "VIGÍA, prototipo de auditoría técnico-legal de sistemas con IA. Canal de atención: " + CONTACTO + ".",
  ]],
  ["Qué datos tratamos y para qué", [
    "Abogados usuarios: nombre, correo, tarjeta profesional, firma y contraseña (guardada con scrypt, nunca en claro). Finalidad: gestionar la cuenta e identificar al abogado que firma cada hallazgo.",
    "Representante legal del cliente: nombre, número de cédula y fecha de aceptación. Finalidad única: acreditar que autorizó las pruebas (art. 269A de la Ley 1273 de 2009).",
    "Código del cliente: se analiza en un entorno aislado, se enmascaran llaves y datos personales antes de mostrarlos y se borra a los 90 días; queda solo su huella SHA-256. VIGÍA actúa como encargado del cliente (Decreto 1074 de 2015, art. 2.2.2.25.5.2).",
  ]],
  ["Con quién se comparten", [
    "Proveedores que alojan el servicio y su base de datos (Vercel y Upstash, en Estados Unidos, país con nivel adecuado según la SIC). La autoridad de sellado de tiempo recibe solo el hash del informe, que no contiene datos personales. No vendemos ni cedemos datos.",
  ]],
  ["Derechos del titular", [
    "Conocer, actualizar, rectificar y suprimir sus datos, revocar la autorización, pedir prueba de ella y presentar quejas ante la Superintendencia de Industria y Comercio (art. 8 de la Ley 1581 de 2012).",
    "Consultas: respuesta en máximo 10 días hábiles. Reclamos: 15 días hábiles (arts. 14 y 15 de la Ley 1581). Se atienden en " + CONTACTO + ".",
  ]],
  ["Seguridad y conservación", [
    "Sesiones con cookie httpOnly que expiran a las 8 horas, contraseñas con scrypt, enlaces del portal del cliente con secreto aleatorio. Los datos de la cuenta se conservan mientras exista; el código cargado, 90 días.",
  ]],
];

/** Política de tratamiento de VIGÍA: el auditor de protección de datos cumple lo que audita (Decreto 1377 de 2013, art. 13). */
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-[720px] space-y-6 px-5 py-10">
      <Logo />
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Política de tratamiento de datos personales</h1>
        <p className="mt-1 text-[12.5px] text-ink-muted">Versión {POLITICA_VERSION}. Ley 1581 de 2012 y Decreto 1377 de 2013.</p>
      </div>
      {SECTIONS.map(([title, paragraphs]) => (
        <section key={title}>
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {paragraphs.map((p) => (
            <p key={p} className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p}</p>
          ))}
        </section>
      ))}
      <Link href="/" className="inline-block text-[12.5px] text-ink-muted underline">Volver</Link>
    </main>
  );
}
