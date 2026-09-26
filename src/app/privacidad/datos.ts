/* Identificación del responsable y vigencia de la política de tratamiento. Están
   aparte porque el portal del cliente (correo) y el registro (versión aceptada, en
   src/server/auth.ts) citan los mismos. */

/* PENDIENTE (decide Juan): la política debe identificar al responsable con nombre o
   razón social, dirección y teléfono (Decreto 1074 de 2015, art. 2.2.2.25.3.1 num. 1),
   pero la evaluación del concurso es anónima y el manual enlaza este sitio. Mientras
   se decide, se usa la denominación del proyecto. */
export const RESPONSABLE = "VIGÍA, prototipo de auditoría técnico-jurídica de sistemas con IA";

// PENDIENTE: buzón real antes de la entrega. Un dominio .test no recibe correo.
export const CONTACTO = "privacidad@vigia.test";

export const DOMICILIO = "Bogotá D.C., Colombia";

export const DIRECCION_Y_TELEFONO =
  "La dirección física y el teléfono de atención se publican en esta página al inicio de " +
  "operaciones; mientras tanto el canal único de atención es el correo indicado.";

/* Cambiar la versión cada vez que cambie el texto: el registro guarda cuál aceptó
   cada abogado. La 1.0 (19-sep-2026) queda en el historial de git. */
export const POLITICA_VERSION = "2.0";

export const POLITICA_VIGENCIA = "25 de septiembre de 2026";
