import type { Metadata } from "next";

import { SitePage } from "@/components/sitio";
import { CHECK_CODES } from "@/domain/checks";
import { FRAMEWORKS, RULES } from "@/domain/compliance";
import type { DocumentoId } from "@/domain/documentos";

import type { Area } from "./tree";
import { AreasTree } from "./tree";

export const metadata: Metadata = {
  title: "Mapa de funcionalidades",
  robots: { index: false, follow: false },
};

/* Dos cifras que sí dicen algo (qué tan a fondo prueba) y, en vez de contar
   normas y documentos, sus nombres: a un abogado le dice más «Ley 1581» que
   «8 normas». Las cifras y las normas salen del catálogo. */
const ESTADISTICAS = [
  { valor: String(CHECK_CODES.length), etiqueta: "pruebas automáticas de cumplimiento" },
  { valor: String(RULES.length), etiqueta: "obligaciones legales que verifica" },
];

/* Record por DocumentoId: si se agrega o quita un documento, esto no compila. */
const DOCUMENTOS: Record<DocumentoId, string> = {
  politica: "Política de tratamiento de datos",
  aviso: "Aviso de privacidad",
  autorizacion: "Autorización para el tratamiento de datos",
  transmision: "Contrato de transmisión de datos",
  "consultas-reclamos": "Procedimiento de consultas y reclamos",
  "ficha-transparencia": "Ficha de transparencia del sistema de IA",
};

const AREAS: Area[] = [
  {
    id: "alcance",
    numero: "01",
    titulo: "Cargar y autorizar el caso",
    subtitulo: "El punto de partida: quién es el cliente y qué autoriza",
    imagen: "/mapa/vigia-01-alcance.png",
    alt:
      "Pantalla de alcance y autorización: ficha del cliente con su NIT y representante legal, " +
      "el código cargado con su huella digital, y las cláusulas del acuerdo de alcance jurídico.",
    practica:
      "Antes de tocar una sola línea de código, el representante legal de la empresa recibe un " +
      "enlace, lee en lenguaje claro qué se va a hacer y lo autoriza él mismo desde su celular, " +
      "sin necesitar una cuenta.",
    capacidades: [
      "Carga el código del sistema en un archivo comprimido, o directamente desde un repositorio público " +
        "(el lugar en internet donde los desarrolladores guardan el código, como GitHub)",
      "Verifica automáticamente si la empresa está registrada en el Registro Mercantil",
      "Deja fijada con una huella digital exactamente qué versión del código se revisó, para que nadie pueda alegar después que se cambió algo",
      "Genera un acuerdo de autorización en español corriente, explicando qué se va a hacer, qué no se va a tocar y por qué",
      "El representante legal lo acepta desde un enlace propio, con su nombre y su cédula, sin crear ninguna cuenta",
      "Enmascara automáticamente las contraseñas y llaves de acceso que aparezcan en el código antes de que cualquier persona las vea",
    ],
  },
  {
    id: "deteccion",
    numero: "02",
    titulo: "Detectar el sistema automáticamente",
    subtitulo: "Entiende solo qué construyó la empresa y con qué reglas debe cumplir",
    imagen: "/mapa/vigia-02-configuracion.png",
    alt:
      "Pantalla de configuración: los proveedores de inteligencia artificial detectados en el " +
      "código, su país de procesamiento, y las normas aplicables según el sector de la empresa.",
    practica:
      "El sistema se entera solo de que el chat usa un modelo de IA alojado en Estados Unidos y " +
      "otro en China, y ya sabe qué exigirle a cada uno, sin que nadie se lo tenga que explicar.",
    capacidades: [
      "Identifica qué proveedores de inteligencia artificial usa el sistema y en qué modelo específico",
      "Señala en qué país procesa los datos cada proveedor y si ese país cumple los estándares de protección exigidos",
      "Aplica automáticamente el conjunto de normas que corresponde según el sector de la empresa: financiero, salud, educación, comercio y otros",
      "Muestra, con la fuente y la fecha de verificación, qué dice cada proveedor sobre si usa las conversaciones para entrenar sus propios modelos",
      "Deja seleccionar o quitar cualquiera de las normas antes de correr el análisis",
    ],
  },
  {
    id: "ejecucion",
    numero: "03",
    titulo: "Poner a prueba el sistema, incluido el que ya está publicado",
    subtitulo: "Revisa el código y, si se autoriza, también el sitio real",
    imagen: "/mapa/vigia-05-ejecucion-vivo.png",
    alt:
      "Pantalla de ejecución en vivo con el progreso por módulo y la traza detallada de cada " +
      "prueba ejecutada.",
    practica:
      "El código puede verse perfecto en el repositorio y aun así el sitio real estar exponiendo " +
      "un archivo con llaves de acceso: el sistema revisa las dos cosas por separado.",
    capacidades: [
      `Corre un catálogo de ${CHECK_CODES.length} pruebas sobre el código en un entorno aislado, sin tocar nunca la información real de los clientes de la empresa`,
      "Muestra el avance en vivo, prueba por prueba, con una traza detallada de cada paso",
      "Si el cliente lo autoriza de forma expresa, también revisa el sitio público ya publicado: archivos sensibles expuestos, protecciones de seguridad ausentes, cómo quedan guardadas las cookies",
      "La revisión del sitio publicado es de solo lectura: nunca envía datos, nunca inicia sesión, nunca modifica nada",
      "Deja registrada cada dirección que consultó y con qué resultado",
    ],
  },
  {
    id: "riesgos",
    numero: "04",
    titulo: "Hallazgos con respaldo jurídico",
    subtitulo: "Cada falla técnica, traducida al artículo exacto que incumple",
    imagen: "/mapa/vigia-03-riesgos.png",
    alt:
      "Mapa de riesgos con la puntuación de cumplimiento, el conteo de hallazgos por gravedad " +
      "y la lista de hallazgos con su norma asociada.",
    practica:
      "Un hallazgo no dice solo «esto está mal»: dice qué artículo de qué ley se está " +
      "incumpliendo y por qué, como si un abogado ya lo hubiera redactado.",
    capacidades: [
      "Traduce cada falla técnica a la norma jurídica que incumple, con el texto completo del artículo",
      "Da una puntuación de cumplimiento y un nivel de riesgo fácil de leer de un vistazo",
      "Clasifica cada hallazgo por gravedad: crítico, advertencia o informativo",
      "Permite filtrar por norma, por gravedad o por si ya fue corregido y firmado",
      "Genera con un clic un borrador de evaluación de impacto de privacidad, listo para revisar",
    ],
  },
  {
    id: "documentos",
    numero: "05",
    titulo: "Documentos legales listos para firmar",
    subtitulo: "Cuando lo que falta no es una corrección de código, sino un documento",
    imagen: "/mapa/vigia-04-documentos.png",
    alt:
      "Pantalla de documentos jurídicos generados para la empresa, cada uno con su ruta de " +
      "publicación y las opciones de descarga.",
    practica:
      "Si a la empresa le falta la política de tratamiento de datos, el sistema no solo lo " +
      "señala: se la entrega redactada, con los datos de su propio sistema ya puestos.",
    capacidades: [
      "Redacta la política de tratamiento de datos con los seis contenidos que exige la ley",
      "Redacta el aviso de privacidad, el texto de autorización y la ficha de transparencia del sistema de IA",
      "Redacta las cláusulas del contrato con cada proveedor de inteligencia artificial detectado",
      "Redacta el procedimiento de consultas y reclamos, con los plazos legales ya incluidos",
      "Ningún documento lo escribe una IA generativa: sale de plantillas fijas rellenadas con lo que el código realmente dice, así que el mismo código siempre produce el mismo texto",
      "Se descarga en Word, listo para que un abogado lo revise, ajuste y firme",
    ],
  },
  {
    id: "remediacion",
    numero: "06",
    titulo: "Corregir y volver a comprobar",
    subtitulo: "No basta con decir que ya se corrigió: hay que probarlo otra vez",
    imagen: "/mapa/vigia-06-remediacion.png",
    alt:
      "Pantalla de remediación con el parche propuesto y el panel para cargar el código corregido " +
      "y volver a probarlo, paso previo a que el abogado pueda firmar el hallazgo.",
    practica:
      "El equipo de desarrollo corrige el código, lo vuelve a subir, y el sistema le confirma si " +
      "la corrección de verdad funcionó: no le basta con que alguien diga que ya quedó.",
    capacidades: [
      "Propone el cambio de código exacto que corrige cada falla, línea por línea",
      "Vuelve a correr la misma prueba sobre la versión corregida, en un entorno aislado",
      "Marca cada hallazgo como corregido, no corregido o pendiente, sin ambigüedad",
      "El abogado revisa la evidencia y firma cada hallazgo con su propia tarjeta profesional antes de que cuente como resuelto",
      "Permite agregar una salvedad o un matiz al análisis antes de firmar",
    ],
  },
  {
    id: "informe",
    numero: "07",
    titulo: "El informe final, verificable por cualquiera",
    subtitulo: "Un documento que se puede comprobar meses después, sin pedirle nada a nadie",
    imagen: "/mapa/vigia-07-informe.png",
    alt:
      "Borrador del informe de auditoría técnico-jurídica, con los datos del cliente, el alcance " +
      "de la autorización y la identificación de la versión de código analizada, antes de que el " +
      "abogado lo expida.",
    practica:
      "Meses después, cualquiera —un juez, la autoridad, un cliente nuevo— puede pegar el código " +
      "del informe en una página pública y comprobar que sigue siendo exactamente el mismo " +
      "documento que se firmó ese día.",
    capacidades: [
      "Expide un informe completo con los hallazgos, la evidencia y las firmas del abogado",
      "Encadena el informe con una huella digital y un sello de tiempo de un tercero independiente",
      "Cualquiera puede verificar en una página pública, sin necesitar cuenta, que el informe no se alteró",
      "Genera automáticamente un calendario con los plazos legales que le aplican a la empresa",
      "Se exporta completo a Word, con todos los anexos y documentos generados",
    ],
  },
  {
    id: "transparencia",
    numero: "08",
    titulo: "Transparencia y confianza",
    subtitulo: "El sistema se exige a sí mismo lo mismo que le exige a los demás",
    imagen: "/mapa/vigia-08-transparencia.png",
    alt:
      "Página de transparencia: el sistema audita su propio código con su propio catálogo de " +
      "pruebas y publica el resultado.",
    practica:
      "Antes de auditar a nadie más, el sistema se audita a sí mismo con su propio catálogo de " +
      "pruebas y publica el resultado, para no pedirle a otros lo que él mismo no cumple.",
    capacidades: [
      "Corre su propio catálogo de pruebas sobre su propio código y publica el resultado en una página abierta al público",
      "Borra el código de cada cliente a los 90 días; conserva su huella digital y el expediente de la auditoría (hallazgos con la evidencia enmascarada, firmas e informe)",
      "Publica su política de tratamiento de datos completa, en español corriente",
      "Nunca usa un modelo de lenguaje para generar los hallazgos ni los documentos: siempre el mismo código produce exactamente el mismo resultado",
    ],
  },
];

export default function MapaPage() {
  return (
    <SitePage actual="/mapa" className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-8 sm:px-6">
      <div>
        <h1 className="sitio-titulo">
          Mapa de funcionalidades
        </h1>
        <p className="sitio-bajada">
          Qué es capaz de hacer VIGÍA, explicado sin tecnicismos. Cada área se puede abrir para
          ver el detalle, con una pantalla real del sistema funcionando.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {ESTADISTICAS.map((s) => (
          <div
            key={s.etiqueta}
            className="rounded-[12px] border border-line bg-surface p-4 sm:p-5"
          >
            <p className="text-[26px] font-semibold tracking-tight text-brand">{s.valor}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-muted">{s.etiqueta}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-[12px] border border-line bg-surface p-4 sm:p-5 lg:col-span-1">
          <p className="text-[13px] font-semibold text-ink">Normas que revisa</p>
          <ul className="mt-2 space-y-1 text-[12.5px] leading-snug text-ink-muted">
            {Object.values(FRAMEWORKS).map((f) => (
              <li key={f.id}>
                <span className="font-medium text-ink">{f.shortName}</span> · {f.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 rounded-[12px] border border-line bg-surface p-4 sm:p-5 lg:col-span-1">
          <p className="text-[13px] font-semibold text-ink">Documentos que redacta, listos para firmar</p>
          <ul className="mt-2 space-y-1 text-[12.5px] leading-snug text-ink-muted">
            {Object.values(DOCUMENTOS).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <AreasTree areas={AREAS} />
      </div>
    </SitePage>
  );
}
