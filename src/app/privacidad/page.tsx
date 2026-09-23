import type { Metadata } from "next";
import Link from "next/link";

import { SitePage } from "@/components/sitio";

import { CONTACTO, DIRECCION_Y_TELEFONO, DOMICILIO, POLITICA_VERSION, POLITICA_VIGENCIA } from "./datos";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

const SECTIONS: Array<[string, string[]]> = [
  ["Responsable", [
    "VIGÍA, prototipo de auditoría técnico-jurídica de sistemas con IA. Domicilio: " + DOMICILIO + ". Correo: " +
      CONTACTO + ". " + DIRECCION_Y_TELEFONO,
    "Área responsable de la atención de peticiones, consultas y reclamos: coordinación de protección de datos, en el correo indicado.",
    "VIGÍA es responsable del tratamiento de los datos del abogado usuario y del representante legal que acepta el acuerdo. Respecto del código del cliente y de los datos personales que contenga, actúa como encargado de la empresa auditada (Decreto 1074 de 2015, art. 2.2.2.25.5.2).",
    "VIGÍA no recolecta datos sensibles ni datos de niños, niñas o adolescentes.",
  ]],
  ["Qué datos tratamos y para qué", [
    "Abogados usuarios: nombre, correo, tarjeta profesional, firma y contraseña (guardada con scrypt, nunca en claro). Finalidad: gestionar la cuenta e identificar al abogado que firma cada hallazgo.",
    "Representante legal del cliente: nombre, número de cédula y fecha de aceptación. Finalidad única: acreditar que autorizó las pruebas (art. 269A de la Ley 1273 de 2009).",
    "Código del cliente: se analiza en un entorno aislado, se enmascaran llaves y datos personales antes de mostrarlos y se borra a los 90 días; queda solo su huella SHA-256. VIGÍA actúa como encargado del cliente (Decreto 1074 de 2015, art. 2.2.2.25.5.2).",
  ]],
  ["Con quién se comparten", [
    "Encargados de VIGÍA: Vercel (alojamiento de la aplicación) y Supabase (base de datos), ambos en Estados Unidos, país con nivel adecuado de protección según la Circular Única de la Superintendencia de Industria y Comercio (Circular Externa 005 de 2017, adicionada por la Circular Externa 008 de 2017). Con cada uno existe contrato de transmisión bajo sus términos de servicio, con las obligaciones mínimas del art. 2.2.2.25.5.2 del Decreto 1074 de 2015.",
    "La autoridad de sellado de tiempo recibe solo el hash del informe, que no contiene datos personales. No vendemos ni cedemos datos.",
  ]],
  ["Derechos del titular", [
    "Conocer, actualizar, rectificar y suprimir sus datos, revocar la autorización, pedir prueba de ella y presentar quejas ante la Superintendencia de Industria y Comercio (art. 8 de la Ley 1581 de 2012).",
  ]],
  ["Cómo ejercer sus derechos", [
    "Envíe su consulta o reclamo a " + CONTACTO + " indicando su nombre, número de documento, la descripción de los hechos y una dirección de respuesta. Si el reclamo está incompleto, se le pedirá completarlo dentro de los cinco (5) días siguientes; si no lo hace en dos (2) meses se entiende desistido (art. 15 de la Ley 1581 de 2012).",
    "Consultas: diez (10) días hábiles, prorrogables cinco (5). Reclamos: quince (15) días hábiles, prorrogables ocho (8). Desde la recepción del reclamo y dentro de los dos (2) días hábiles siguientes, el registro queda marcado con la leyenda «reclamo en trámite».",
    "Si no obtiene respuesta, puede presentar queja ante la Superintendencia de Industria y Comercio.",
  ]],
  ["Seguridad y conservación", [
    "Sesiones con cookie httpOnly que expiran a las 8 horas, contraseñas con scrypt, enlaces del portal del cliente con secreto aleatorio.",
    "Período de vigencia de las bases de datos: los datos de la cuenta del abogado se conservan mientras la cuenta exista y durante los cinco (5) años siguientes a su cierre, por razones contables y de defensa jurídica; los datos del representante legal, por el mismo período, como prueba de la autorización; el código cargado, 90 días (Decreto 1074 de 2015, art. 2.2.2.25.2.8).",
  ]],
];

/** La política de tratamiento de VIGÍA, sujeta a los mismos requisitos que audita (Decreto 1074 de 2015, art. 2.2.2.25.3.1). */
export default function PrivacidadPage() {
  return (
    <SitePage actual="/privacidad" className="mx-auto w-full max-w-[720px] space-y-6 px-5 pb-16 pt-8">
      <div>
        <h1 className="sitio-titulo">Política de tratamiento de datos personales</h1>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          Versión {POLITICA_VERSION}, vigente desde el {POLITICA_VIGENCIA}. Ley 1581 de 2012 y Decreto 1074 de 2015,
          art. 2.2.2.25.3.1 (Decreto 1377 de 2013, art. 13).
        </p>
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
    </SitePage>
  );
}
