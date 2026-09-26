import type { Metadata } from "next";
import Link from "next/link";

import { SitePage } from "@/components/sitio";
import { Panel } from "@/components/ui";

import {
  CONTACTO,
  DIRECCION_Y_TELEFONO,
  DOMICILIO,
  POLITICA_VERSION,
  POLITICA_VIGENCIA,
  RESPONSABLE,
} from "./datos";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

/** Un párrafo, una lista de viñetas o una ficha de pares «rótulo: texto». */
type Bloque = string | string[] | { ficha: Array<[string, string]> };

/* Todo lo que dice esta política sale del código (src/server/auth.ts, store.ts,
   inspeccion.ts; src/engine; src/domain/check-kit.ts). Si el código cambia, esto
   también: una política que no describe el tratamiento real induce a error al
   titular (Ley 1581 de 2012, art. 4 lit. d). */

const RESUMEN = [
  "Tratamos los datos de los abogados que usan VIGÍA y del representante legal que autoriza cada auditoría, solo para prestar el servicio y dejar prueba de lo hecho.",
  "El código que carga el abogado puede traer datos de terceros. Sobre esos datos VIGÍA es encargado de la empresa auditada: los usa solo para la auditoría y borra el código a los 90 días.",
  "No vendemos datos, no usamos analítica ni publicidad y no enviamos datos ni código a ningún modelo de inteligencia artificial.",
  "Los datos se guardan en Estados Unidos, con Vercel y Supabase. Estados Unidos figura en la lista de países con nivel adecuado de protección de la Superintendencia de Industria y Comercio.",
  `Para conocer, corregir o borrar sus datos, o revocar su autorización, escriba a ${CONTACTO}.`,
];

const SECCIONES: Array<[string, Bloque[]]> = [
  ["Quién es el responsable", [
    `Responsable del tratamiento: ${RESPONSABLE}. Domicilio: ${DOMICILIO}. Correo: ${CONTACTO}. ${DIRECCION_Y_TELEFONO}`,
    `Persona o área que atiende peticiones, consultas y reclamos: Protección de datos personales de VIGÍA, en el correo ${CONTACTO} (Decreto 1074 de 2015, art. 2.2.2.25.4.4).`,
  ]],
  ["En qué calidad trata VIGÍA cada dato", [
    "Como responsable, porque decide para qué y cómo se usan: los datos de los abogados usuarios, los del representante legal que acepta el acuerdo de alcance y los datos de seguridad del ingreso.",
    "Como encargado, porque los trata por cuenta de otro: los datos personales que vengan dentro del código cargado o en las páginas públicas del despliegue que la empresa autorice inspeccionar. La responsable de esos datos es la empresa auditada. VIGÍA los trata solo para la auditoría y según el acuerdo de alcance, que hace las veces de contrato de transmisión (Decreto 1074 de 2015, art. 2.2.2.25.5.2), con los deberes que el art. 18 de la Ley 1581 de 2012 impone a los encargados.",
    "El abogado solo debe cargar código que la empresa le haya autorizado a compartir. Las pruebas empiezan únicamente cuando consta que la empresa aceptó el acuerdo de alcance: en su portal o, si lo firmó por fuera de VIGÍA, porque el abogado lo registra.",
  ]],
  ["Qué datos tratamos, para qué y por cuánto tiempo", [
    "Estas son todas las bases de datos de VIGÍA. Cada dato se conserva solo mientras sirve a su finalidad (Decreto 1074 de 2015, art. 2.2.2.25.2.8).",
    { ficha: [
      ["De quién", "Abogados usuarios."],
      ["Qué datos", "Nombre, correo electrónico, firma o despacho (opcional) y contraseña. Al firmar su primer hallazgo, el número de tarjeta profesional, que el abogado declara y VIGÍA no verifica contra el registro oficial. Además, la constancia de aceptación de esta política: versión, fecha y hora."],
      ["Para qué", "Crear y administrar la cuenta; identificar al abogado que firma cada hallazgo en el acuerdo de alcance, en el portal del cliente, en el informe y en la verificación pública; y probar la autorización."],
      ["Cuánto tiempo", "Mientras la cuenta exista. Si el abogado pide cerrarla, se suprimen su correo, su contraseña y su despacho; su nombre y su tarjeta profesional siguen solo en los expedientes de sus auditorías, por el plazo de estos."],
    ] },
    { ficha: [
      ["De quién", "Representante legal de la empresa auditada."],
      ["Qué datos", "Nombre (lo anota el abogado al abrir la auditoría y el representante lo confirma), número de cédula, fecha y hora de la aceptación y huella SHA-256 del texto aceptado."],
      ["Para qué", "Finalidad única: acreditar que la empresa autorizó las pruebas (Ley 1273 de 2009, art. 269A) y qué texto aceptó. Los ven el abogado, el representante en su portal y quien reciba el informe."],
      ["Cuánto tiempo", "Cinco (5) años contados desde la última actuación en la auditoría, que normalmente es la expedición del informe."],
    ] },
    { ficha: [
      ["De quién", "Quien intenta ingresar."],
      ["Qué datos", "Correo con el que se intenta ingresar, número de intentos fallidos e identificador aleatorio de la sesión."],
      ["Para qué", "Bloquear el ingreso por 15 minutos después de cinco intentos fallidos y mantener abierta la sesión."],
      ["Cuánto tiempo", "Intentos fallidos: 15 minutos desde el último. Sesión: 8 horas, o hasta que el abogado salga."],
    ] },
    { ficha: [
      ["De quién", "Expediente de cada auditoría."],
      ["Qué datos", "Razón social, NIT, sector y descripción del sistema de la empresa; la consulta de su matrícula en el registro mercantil (RUES); los datos del representante legal; los hallazgos con su evidencia, hasta cuatro líneas de código por hallazgo, ya enmascaradas; los documentos jurídicos generados; las firmas del abogado (nombre, tarjeta profesional, salvedad y fecha); la traza de la ejecución y el informe con su huella y su sello de tiempo."],
      ["Para qué", "Prestar la auditoría, entregar el informe a la empresa y conservar la prueba de lo hecho y de quién lo firmó."],
      ["Cuánto tiempo", "Cinco (5) años contados desde la última actuación en la auditoría. Las líneas de evidencia enmascaradas se conservan con el expediente aunque el código completo ya se haya borrado."],
    ] },
    { ficha: [
      ["De quién", "Personas cuyos datos vengan en el código cargado."],
      ["Qué datos", "Los que contenga el .zip que carga el abogado, o el repositorio público de GitHub que indica, y la versión corregida para el retesteo: por ejemplo, datos de clientes, empleados o usuarios de la empresa."],
      ["Para qué", "Correr las pruebas y el retesteo. Aquí VIGÍA es encargado de la empresa auditada."],
      ["Cuánto tiempo", "Noventa (90) días desde la carga; una rutina diaria elimina lo vencido. El abogado puede borrar el código antes, en cuanto se expide el informe. Del código completo queda solo su huella SHA-256, que ata el informe a esa versión exacta; las líneas de evidencia enmascaradas siguen en el expediente."],
    ] },
    { ficha: [
      ["De quién", "Personas cuyos datos aparezcan en el despliegue público, solo si la empresa autoriza inspeccionarlo."],
      ["Qué datos", "Lo que devuelven las páginas públicas del sitio declarado: encabezados, cookies que fija el sitio y contenido."],
      ["Para qué", "Verificar, en solo lectura y sin credenciales, lo que el sistema expone en internet. Aquí VIGÍA también es encargado de la empresa."],
      ["Cuánto tiempo", "Se lee en memoria durante el análisis y no se guarda. Solo pasan al expediente los fragmentos enmascarados que sustentan un hallazgo."],
    ] },
    { ficha: [
      ["De quién", "Abogados firmantes, en la verificación pública de informes."],
      ["Qué datos", "Identificador del informe, fechas, huellas, puntuaciones, número de hallazgos, y nombre y tarjeta profesional de los abogados firmantes. No muestra la empresa, el representante legal ni el código."],
      ["Para qué", "Que cualquiera que tenga el identificador o la huella del informe compruebe en /verificar que no fue alterado y quién lo firmó."],
      ["Cuánto tiempo", "El mismo del expediente."],
    ] },
    { ficha: [
      ["De quién", "Visitantes del sitio."],
      ["Qué datos", "VIGÍA no les pide datos. El proveedor de alojamiento procesa los datos técnicos de cada conexión (dirección IP, navegador y dirección de la página pedida) para servir el sitio y protegerlo."],
      ["Para qué", "Operar y proteger el servicio."],
      ["Cuánto tiempo", "El que fijen los términos del proveedor. VIGÍA no guarda esos datos en su base de datos."],
    ] },
    "La cuenta de prueba («probar sin registrarse») no pide ningún dato personal; lo que se escriba en sus auditorías recibe el mismo trato que en cualquier otra. Cerrar una cuenta o suprimir un expediente antes de su plazo se pide al correo de contacto, con el procedimiento descrito más abajo.",
  ]],
  ["Datos sensibles y de niños, niñas y adolescentes", [
    "VIGÍA no pide datos sensibles (Ley 1581 de 2012, art. 5) ni datos de niños, niñas o adolescentes (art. 7), y ningún servicio depende de entregarlos.",
    "Si el código cargado los contiene, por ejemplo registros biométricos o datos reales de usuarios, VIGÍA los trata solo como encargado y solo para la auditoría. Recomendamos no cargar copias de bases de datos, respaldos ni archivos con registros reales: VIGÍA audita código, no registros de personas.",
  ]],
  ["Cómo obtenemos y probamos la autorización", [
    "Abogados: al crear la cuenta marcan la casilla de autorización, que no viene marcada. VIGÍA guarda la versión de la política aceptada con la fecha y la hora (Decreto 1074 de 2015, arts. 2.2.2.25.2.4 y 2.2.2.25.2.5).",
    "Representante legal: acepta desde su portal con su nombre y su cédula, junto al aviso de para qué se usan y de sus derechos; queda la fecha, la hora y la huella del texto aceptado.",
    "Datos dentro del código: los recolectó la empresa auditada, que es quien debe contar con la autorización de sus titulares. VIGÍA los trata por cuenta de ella y dentro de la finalidad de la auditoría (Decreto 1074 de 2015, art. 2.2.2.25.5.2).",
  ]],
  ["Con quién compartimos los datos", [
    [
      "Vercel Inc. (Estados Unidos): aloja y ejecuta la aplicación.",
      "Supabase Inc. (Estados Unidos): presta la base de datos.",
    ],
    "Ambos actúan como encargados de VIGÍA. Es una transmisión internacional (Decreto 1074 de 2015, arts. 2.2.2.25.5.1 y 2.2.2.25.5.2) a un país que figura en la lista de países con nivel adecuado de protección de la Superintendencia de Industria y Comercio (Circular Única, Título V, capítulo 3, num. 3.2). Supabase se obliga, en el acuerdo de tratamiento de datos que hace parte de sus términos de servicio, a tratar los datos solo por instrucción de VIGÍA, a protegerlos y a guardar confidencialidad; Vercel los trata bajo sus términos de servicio.",
    "Servicios que VIGÍA consulta sin enviarles datos de los usuarios:",
    [
      "La autoridad de sellado de tiempo, que recibe solo la huella del informe.",
      "Las bases públicas de vulnerabilidades (OSV) y de licencias (registro de npm), que reciben nombres y versiones de librerías.",
      "GitHub, del que se descarga el repositorio público que indique el abogado.",
      "El portal de datos abiertos del Estado (datos.gov.co), que recibe el NIT de la empresa para consultar su matrícula en el RUES, información del registro mercantil, que es público.",
    ],
    "La empresa auditada recibe el informe, con los datos del representante legal y de los abogados firmantes. Las copias que el abogado descargue quedan bajo su responsabilidad.",
    "Las autoridades públicas, cuando los pidan en ejercicio de sus funciones legales o por orden judicial (Ley 1581 de 2012, arts. 10 lit. a y 13).",
    "No vendemos ni cedemos datos, no los usamos para publicidad y no se los enviamos a ningún proveedor de inteligencia artificial, ni para entrenar modelos ni para nada más: las pruebas de VIGÍA son reglas fijas que corren dentro de la propia aplicación.",
  ]],
  ["Cookies", [
    [
      "vigia_sesion: mantiene la sesión del abogado. Solo la lee el servidor y vence a las 8 horas.",
      "vigia_run: recuerda qué auditoría tiene abierta el abogado. Solo la lee el servidor y se borra al cerrar el navegador.",
      "vigia_modo: recuerda si está activo el modo aprendizaje. Se crea solo si el usuario lo activa y vence a los 30 días.",
    ],
    "Son cookies propias, de sesión o de preferencia. No usamos cookies de analítica ni de publicidad ni scripts de terceros, y las fuentes tipográficas se sirven desde este mismo sitio. Si el proveedor de alojamiento activa su protección contra tráfico automatizado, puede fijar una cookie técnica suya.",
  ]],
  ["Cómo protegemos los datos", [
    [
      "El sitio se sirve solo por HTTPS.",
      "Contraseñas: se guarda solo una huella calculada con scrypt y una sal aleatoria por usuario; nadie puede leer la contraseña.",
      "Sesión: identificador aleatorio en una cookie que los scripts del navegador no pueden leer y que solo viaja por HTTPS.",
      "Ingreso: bloqueo de 15 minutos después de cinco intentos fallidos.",
      "Acceso: cada auditoría solo la ve el abogado que la abrió. El representante legal entra con un enlace secreto aleatorio que los buscadores no indexan. El enlace no vence, y quien lo tenga puede ver el acuerdo, la aceptación y el informe: el abogado debe enviarlo solo al representante.",
      "Base de datos: tabla con seguridad a nivel de fila activa y sin permisos públicos; solo el servidor de VIGÍA, con una llave que nunca llega al navegador, puede leerla o escribirla.",
      "Enmascaramiento: antes de mostrar o guardar la evidencia, VIGÍA reemplaza por [ENMASCARADO] las llaves y los tokens de acceso, las contraseñas y los secretos escritos en el código, las cadenas de conexión con usuario y clave, los correos electrónicos y los números de 5 a 12 cifras, como cédulas, teléfonos o cuentas. No detecta nombres ni direcciones físicas.",
      "Inspección del despliegue: solo lectura, sin credenciales y con bloqueo de direcciones internas o privadas.",
      "Integridad: cada informe se encadena por su huella con el anterior del mismo abogado y lleva un sello de tiempo de un tercero (RFC 3161), que recibe solo la huella.",
    ],
    "Si un incidente de seguridad pone en riesgo los datos, VIGÍA lo informará a la Superintendencia de Industria y Comercio (Ley 1581 de 2012, arts. 17 lit. n y 18 lit. k) y, si afecta datos que venían en el código, a la empresa auditada, por medio del abogado.",
  ]],
  ["Sus derechos", [
    "Como titular, usted puede (Ley 1581 de 2012, art. 8):",
    [
      "Conocer, actualizar y rectificar sus datos.",
      "Pedir prueba de la autorización que otorgó.",
      "Saber, si lo pide, qué uso se ha dado a sus datos.",
      "Presentar quejas ante la Superintendencia de Industria y Comercio, después de agotar la consulta o el reclamo ante VIGÍA (art. 16).",
      "Revocar la autorización o pedir que se supriman sus datos. No procede mientras exista un deber legal o contractual de permanecer en la base de datos (Decreto 1074 de 2015, art. 2.2.2.25.2.6); por ejemplo, el registro de una aceptación mientras sea la prueba de que la empresa autorizó las pruebas.",
      "Acceder gratis a sus datos, al menos una vez cada mes calendario y cada vez que esta política cambie de forma sustancial (Decreto 1074 de 2015, art. 2.2.2.25.4.2).",
    ],
    "Pueden ejercerlos el titular, sus causahabientes, su representante o apoderado, o quien actúe por estipulación a favor de otro (Decreto 1074 de 2015, art. 2.2.2.25.4.1).",
  ]],
  ["Cómo ejercer sus derechos", [
    `Escriba a ${CONTACTO} con su nombre y número de documento, lo que pide, los hechos en que se funda, una dirección o un correo para responderle y los documentos que quiera hacer valer. Si actúa por otra persona, acredite la representación. Podemos pedirle que acredite su identidad; a los abogados usuarios les pedimos escribir desde el correo de su cuenta.`,
    "Consultas (saber qué datos tenemos y cómo los usamos): se responden en máximo diez (10) días hábiles desde su recibo. Si no es posible, le diremos por qué y la nueva fecha, que no pasará de cinco (5) días hábiles más (Ley 1581 de 2012, art. 14).",
    "Reclamos (corregir, actualizar o suprimir datos, revocar la autorización o señalar un incumplimiento): si el reclamo llega incompleto, dentro de los cinco (5) días siguientes a su recibo le pediremos completarlo; si pasan dos (2) meses desde ese requerimiento sin que lo complete, se entenderá que desistió. Recibido el reclamo completo, en máximo dos (2) días hábiles su registro queda marcado con la leyenda «reclamo en trámite» hasta que se decida. La respuesta llega en máximo quince (15) días hábiles contados desde el día siguiente a su recibo; si no es posible, le diremos por qué y la nueva fecha, que no pasará de ocho (8) días hábiles más (Ley 1581 de 2012, art. 15).",
    "Si su solicitud es sobre datos que venían en el código de una empresa auditada, VIGÍA la tramita junto con esa empresa, que es la responsable: le da traslado por medio del abogado que abrió la auditoría en máximo dos (2) días hábiles y se lo informa a usted (Ley 1581 de 2012, arts. 15 y 18 lit. e).",
  ]],
  ["Vigencia y cambios", [
    `Esta política rige desde el ${POLITICA_VIGENCIA} (versión ${POLITICA_VERSION}) y reemplaza la versión 1.0 del 19 de septiembre de 2026.`,
    "Las bases de datos de VIGÍA estarán vigentes mientras VIGÍA preste el servicio, con los plazos de conservación indicados arriba para cada dato.",
    "Si cambia algo sustancial, como quién es el responsable o para qué se usan los datos, lo publicaremos aquí y lo avisaremos por correo a los titulares registrados antes de aplicarlo; si cambian las finalidades, pediremos una nueva autorización (Decreto 1074 de 2015, arts. 2.2.2.25.2.2 y 2.2.2.25.3.1).",
    "Registro Nacional de Bases de Datos: deben inscribirse las sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT y las personas jurídicas de naturaleza pública (Decreto 1074 de 2015, art. 2.2.2.26.1.2). VIGÍA no está en esos supuestos; si llega a estarlo, inscribirá sus bases.",
  ]],
];

const texto = "text-[13px] leading-relaxed text-ink-soft";

function Contenido({ bloque }: { bloque: Bloque }) {
  if (typeof bloque === "string") return <p className={`mt-1.5 ${texto}`}>{bloque}</p>;
  if (Array.isArray(bloque)) {
    return (
      <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${texto}`}>
        {bloque.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  return (
    <dl className="mt-2.5 space-y-1.5 rounded-[8px] border border-line p-3">
      {bloque.ficha.map(([rotulo, valor]) => (
        <div key={rotulo} className="sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-3">
          <dt className="text-[12.5px] font-semibold text-ink">{rotulo}</dt>
          <dd className={texto}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

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
      <Panel>
        <h2 className="text-[14px] font-semibold text-ink">En pocas palabras</h2>
        <ul className={`mt-1.5 list-disc space-y-1 pl-5 ${texto}`}>
          {RESUMEN.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
      <nav aria-label="Contenido de la política">
        <ol className="list-decimal space-y-0.5 pl-5 text-[12.5px] text-ink-muted">
          {SECCIONES.map(([titulo], i) => (
            <li key={titulo}>
              <a href={`#s${i + 1}`} className="underline underline-offset-2">{titulo}</a>
            </li>
          ))}
        </ol>
      </nav>
      {SECCIONES.map(([titulo, bloques], i) => (
        <section key={titulo} id={`s${i + 1}`}>
          <h2 className="text-[14px] font-semibold text-ink">{i + 1}. {titulo}</h2>
          {bloques.map((bloque, j) => <Contenido key={j} bloque={bloque} />)}
        </section>
      ))}
      <Link href="/" className="inline-block text-[12.5px] text-ink-muted underline">Volver</Link>
    </SitePage>
  );
}
