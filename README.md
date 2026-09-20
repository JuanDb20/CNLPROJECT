# VIGÍA — Equipo rojo legal y técnico para IA

Prototipo funcional para el Concurso Nacional de Legal Tech "Germán Cavelier" 2026-2.

VIGÍA audita aplicaciones de IA generadas por *vibecoding*: ejecuta pruebas
adversariales en un entorno aislado y autorizado, traduce cada falla técnica a la
norma que incumple y propone el parche. VIGÍA propone el análisis jurídico; lo
firma un abogado identificado con su tarjeta profesional. El entregable es el
**Informe de auditoría técnico-jurídica: evidencia para el principio de
responsabilidad demostrada (Decreto 1074 de 2015, arts. 2.2.2.25.6.1 y
2.2.2.25.6.2)**, encadenado por hash con la evidencia del ataque, del retesteo y
de la firma, y con sello de tiempo RFC 3161 de un tercero. No acredita
conformidad: no lo expide un organismo acreditado por la ONAC.

## Ejecutar

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev     # http://localhost:3000
```

Para el build de producción:

```bash
npm run build && npm start
```

### Persistencia

Sin variables de entorno el estado vive en memoria y se pierde al reiniciar, que
es lo cómodo en local. En Vercel cada ruta puede correr en una instancia
distinta, así que el despliegue necesita un almacén compartido. VIGÍA usa uno
clave-valor y elige en este orden:

1. **Supabase (Postgres)** — lo que corre hoy en producción. Una sola tabla:

   ```sql
   create table public.kv_store (
     key text primary key,
     value text not null,
     expires_at timestamptz
   );
   alter table public.kv_store enable row level security;  -- sin políticas: solo la service role
   ```

   Variables: `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`) y
   `SUPABASE_SERVICE_ROLE_KEY`. El acceso es por PostgREST con la service role.
   `expires_at` marca el vencimiento (el código cargado, a los 90 días), y la
   rutina diaria `GET /api/cron/keepalive` lo **borra de verdad** con un `DELETE`:
   en Postgres una fila vencida no desaparece sola. Esa misma rutina escribe y
   relee una clave para que el proyecto de Supabase no se pause por inactividad.
   Se programa en `vercel.json` y, si se define `CRON_SECRET`, exige
   `Authorization: Bearer <CRON_SECRET>`.

2. **Redis por API REST** — opcional. Con `KV_REST_API_URL` y `KV_REST_API_TOKEN`
   (o los equivalentes `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`),
   VIGÍA los prefiere sobre Supabase. Aquí el TTL sí caduca solo, así que la
   purga no hace nada.

3. **Memoria** — el resto de los casos.

## Uso

1. **Crear cuenta de abogado** (nombre, correo y contraseña) o **Ingresar**. La
   tarjeta profesional se pide al firmar el primer hallazgo y queda guardada en la
   cuenta. Cada abogado solo ve sus propias auditorías.
2. **Mis auditorías → Nueva auditoría.** Registrar al cliente (razón social, NIT,
   representante legal, sector) y cargar el código del sistema de IA en un `.zip`
   de hasta 4 MB, o indicar un repositorio público de GitHub. VIGÍA lo lee en
   memoria, ignora `node_modules`, `.git` y los binarios, y fija la versión
   auditada con su SHA-256.
3. **Paso 1 — Alcance.** El representante legal acepta las cuatro cláusulas del
   acuerdo de white hat desde el **portal del cliente** (enlace secreto, sin cuenta,
   con nombre y cédula). Si el acuerdo se firmó por fuera de VIGÍA, el abogado las
   marca. Sin ellas el botón de continuar queda deshabilitado: el art. 269A de la
   Ley 1273 de 2009 sanciona el acceso «por fuera de lo acordado», y VIGÍA, que
   actúa como encargado, suscribe el contrato de transmisión.
4. **Paso 2 — Configuración.** Proveedores de IA detectados en el código, con país,
   rol y si el país está en la lista de la SIC. Seleccionar los marcos normativos.
5. **Paso 3 — Ejecución.** Los cuatro módulos corren las 61 pruebas sobre el código (y, si el
   cliente lo autorizó, la inspección de solo lectura del despliegue) y la consola recibe
   la traza por SSE.
6. **Paso 4 — Mapa de riesgos** y **paso 5 — Detalle**: cada hallazgo muestra la
   prueba, la línea exacta del código que lo sustenta, la trazabilidad normativa,
   el análisis jurídico y el parche propuesto.
7. **Paso 6 — Remediación.** Cargar la versión corregida del código (.zip o
   repositorio), retestear, firmar cada hallazgo (tarjeta profesional y salvedad
   opcional) y expedir el informe. Con el informe expedido, el abogado puede
   borrar el código cargado: queda su SHA-256, que es lo que ata el informe a esa
   versión exacta.
8. **Informe** (`/informe/:id`): documento para imprimir o guardar en PDF desde el
   navegador. El representante legal lo ve en su portal cuando se expide.
9. **Verificación pública** (`/verificar?q=<identificador o hash>`): sin sesión,
   cualquiera comprueba el hash, el hash del informe anterior, el sello de tiempo
   y los firmantes, con las instrucciones para validar el sello con `openssl ts
   -verify`. Acredita integridad y fecha cierta, no veracidad del contenido
   (Ley 527 de 1999, arts. 10 y 11).
10. **Autoauditoría** (`/transparencia`): VIGÍA corre su propio catálogo sobre su
    propio código. El resultado lo genera `npm run autoauditoria`, que reescribe
    `src/app/transparencia/resultado.json`; hay que correrlo antes de cada
    despliegue.

El caso de prueba para ensayar el sistema está fuera de este repositorio, en
`caso-prueba/` (un `.zip` con el código de una fintech ficticia y su guía).

## Arquitectura

```
src/
  domain/      Tipos, catálogo normativo, catálogo de pruebas y puntuación. Sin dependencias.
  engine/      Orquestador de módulos y ciclo de remediación.
  server/      Cuentas y sesiones, lectura del .zip y repositorio (Supabase, Redis o memoria).
  app/api/v1/  API REST versionada.
  app/         Pantallas (React Server Components) y acciones de servidor.
  components/  Sistema visual.
scripts/       Autoauditoría (corre el catálogo sobre el propio código de VIGÍA).
```

Cuatro decisiones sostienen la escalabilidad sin complicar el MVP:

- **El catálogo normativo es dato, no código.** `src/domain/compliance.ts`
  declara hoy **8 marcos y 52 obligaciones** citables. Incorporar una jurisdicción
  nueva es añadir entradas, no tocar el motor. Se expone completo en
  `GET /api/v1/normativa`.
- **Los módulos están registrados, no codificados en el flujo.**
  `src/engine/modules.ts` es un registro de **4 módulos** (análisis estático,
  revisión de herramientas del agente y prompt del sistema, consentimiento e
  interfaz, transparencia); cada entrada corresponde uno a uno con un worker que
  consumiría de una cola en la arquitectura objetivo.
- **La interfaz lee el repositorio, no el orquestador.** La ejecución se lanza con
  `POST /runs/:id/ejecucion`, que retorna de inmediato y sigue corriendo con
  `after()`; el progreso llega por SSE desde `GET /runs/:id/eventos`, que lee el
  repositorio cada segundo. Mover el orquestador a un worker externo (cola de
  trabajos) no cambia una línea del cliente.
- **La persistencia está detrás de una interfaz.** `AccountRepository` y
  `AuditRepository` en `src/server/store.ts` guardan JSON en un almacén
  clave-valor con tres adaptadores intercambiables (Supabase por PostgREST, Redis
  por REST, memoria). Cambiar de uno a otro es una variable de entorno: no afecta
  al dominio, al motor ni a la UI.

## Motor de análisis

`src/domain/checks.ts` es el catálogo base y concatena los catálogos por dimensión
(`src/domain/checks-*.ts`): **61 pruebas** en total. Cada prueba declara qué busca en
el código cargado, las obligaciones que se incumplen si lo encuentra, el análisis
jurídico y el parche que propone. Un hallazgo solo aparece si su prueba encuentra
la falla, y la evidencia es la línea exacta del código (con llaves y números de
documento enmascarados). Un código sin fallas produce cero hallazgos.

En este MVP la detección es por patrones de texto. El motor completo (árbol
sintáctico, LLM y pruebas dinámicas contra el entorno de pruebas del cliente)
sustituye la función `detect` de cada prueba sin tocar el resto del catálogo ni la
interfaz.

**El retesteo es real.** El abogado carga la versión corregida del código y VIGÍA
vuelve a correr el catálogo completo sobre ella: un hallazgo pasa solo si su
prueba ya no lo encuentra, y si sigue apareciendo queda registrado el archivo y la
línea. La versión corregida tiene que ser el mismo proyecto —se exige que comparta
al menos la mitad de las rutas del original—, porque subir un repositorio ajeno
haría pasar todas las pruebas sin haber corregido nada. La firma solo se habilita
con el retesteo en verde.

**La cadena de hash es por abogado.** Cada informe se encadena al hash del informe
anterior expedido por el mismo abogado (`certificado:ultimo:<ownerId>`), no a una
cadena global entre clientes: encadenar al informe de otro cliente lo haría
inverificable para el destinatario, que nunca va a ver ese documento. El hash es
el SHA-256 completo (64 hexadecimales) y lleva sello de tiempo RFC 3161.

La puntuación es una función pura: penaliza cada hallazgo abierto (crítico 9,
advertencia 3,5, informativo 0,5 sobre 100) y sube solo cuando la remediación
queda firmada tras un retesteo en verde. Es un índice de priorización, no una
estimación de la multa, que la SIC gradúa con los criterios del art. 24 de la
Ley 1581.

## API

Todas las rutas de auditorías exigen la sesión del abogado (cookie `vigia_sesion`)
y responden 404 si la auditoría es de otro usuario.

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/v1/runs` | Auditorías del abogado de la sesión |
| `POST` | `/api/v1/runs` | Abre una auditoría (multipart: `cliente`, `nit`, `representante`, `sector`, `sistema`, y `codigo` .zip o `repositorio` URL pública de GitHub) |
| `GET` | `/api/v1/runs/:id` | Estado y puntuación |
| `POST` | `/api/v1/runs/:id/alcance` | `aceptar-clausula`, `autorizar` |
| `PATCH` | `/api/v1/runs/:id/configuracion` | Marcos y minimización |
| `POST` | `/api/v1/runs/:id/ejecucion` | Encola la ejecución |
| `GET` | `/api/v1/runs/:id/eventos` | Flujo de eventos (SSE) |
| `POST` | `/api/v1/runs/:id/version-corregida` | multipart con `codigo` (.zip) o `repositorio`: registra la versión corregida y retestea contra ella |
| `POST` | `/api/v1/runs/:id/hallazgos/:hid/remediacion` | `abrir-pr` (genera el parche), `retestear`, `firmar` (firma el abogado autenticado; en el cuerpo, `professionalCard` obligatoria y `salvedad` opcional) |
| `POST` | `/api/v1/runs/:id/certificado` | Expide el informe |
| `DELETE` | `/api/v1/runs/:id/codigo` | Borra el código cargado (original y versión corregida). Solo con el informe ya expedido |
| `GET` | `/api/v1/normativa` | Catálogo normativo: marcos y obligaciones citables |

Rutas públicas, sin sesión:

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/verificar?q=<id o hash>` | Verificación de un informe: hash, hash anterior, sello de tiempo, firmantes |
| `GET` | `/transparencia` | Resultado de la autoauditoría de VIGÍA sobre su propio código |
| `GET` | `/api/cron/keepalive` | Rutina diaria (`vercel.json`): despierta la base y borra lo vencido. Con `CRON_SECRET` definido exige `Authorization: Bearer <CRON_SECRET>` |

## Marcos evaluados

El eje es el derecho colombiano:

- Ley 1581 de 2012 y Decreto 1074 de 2015 (compila el Decreto 1377 de 2013):
  deber de seguridad, datos sensibles, autorización, transmisión y transferencia.
- Decreto 1377 de 2013, arts. 26 y 27 (responsabilidad demostrada).
- Circular Única de la SIC, Título V, num. 3.2 (países con nivel adecuado; EE. UU.
  desde la Circular Externa 008 de 2017) y Circular Externa 002 de 2024
  (tratamiento de datos personales con IA).
- Ley 1266 de 2008 (habeas data financiero) y Ley 1480 de 2011 (consumidor: arts. 23,
  47, 50 y 51).
- Propiedad intelectual: Decisión Andina 351 de 1993, Ley 23 de 1982 (modificada por la
  Ley 1915 de 2018) y las licencias de cada dependencia.
- Accesibilidad: Ley 1618 de 2013 (art. 14), Resolución 1519 de 2020 de MinTIC y NTC 5854
  (obligatorias para entidades públicas; buena práctica para privados).
- Estándar técnico: OWASP Top 10:2025 y OWASP Top 10 for LLM Applications 2025.
- Referencia comparada, no reportada como incumplimiento: Reglamento (UE)
  2024/1689 (AI Act), Reglamento (UE) 2016/679 (RGPD) y Directrices EDPB 03/2022.

## Rama de ideas: VIGÍA como auditor legal integral

La rama `ideas/auditor-legal-integral` (no desplegada) añade, sobre la base anterior:

- **Parche de tipo `documento`**: cuando la corrección no es código sino un documento,
  VIGÍA lo redacta a partir del código auditado (política de tratamiento con los seis
  contenidos mínimos, aviso de privacidad, cláusulas de transmisión por proveedor,
  procedimiento de consultas y reclamos, ficha de transparencia del sistema de IA). Sin
  IA generativa: plantillas en `src/domain/documentos.ts`. Se revisan, retestean y firman
  como cualquier parche; `/auditoria/documentos` los lista y se descargan en Word.
- **Coherencia política ↔ código** (VGI-089/090, `src/domain/checks-coherencia.ts`):
  contrasta la política publicada con lo que hace el código (proveedores y países,
  biometría, crédito, terceros, plazos) y propone los párrafos que faltan.
- **Inventario de tratamientos** (`/auditoria/inventario`, `src/domain/inventario.ts`):
  registro de actividades derivado del código, exportable a CSV y anexado al informe.
- **Base curada de proveedores de IA** (`src/domain/proveedores.ts`): entrenamiento por
  defecto, retención y retención cero, verificados con fecha y fuente.
- **Calendario de obligaciones** (`GET /api/v1/runs/:id/calendario`, iCalendar) y
  **exportación a Word** del informe y de cada documento (`src/server/docx.ts`, sin
  dependencias).
- **Paquetes por sector** (`src/domain/sectores.ts`), **consumidor y comercio electrónico**,
  **gobernanza del sistema de IA** y **accesibilidad** de la app auditada
  (`checks-consumidor.ts`, `checks-gobernanza.ts`, `checks-inclusion.ts`).
- **Otros backends** (reglas de Firebase, Prisma, Drizzle, Mongo) y **licencias y origen
  del código** (registro de npm, términos de las herramientas de IA generadora).
- **Inspección de solo lectura del despliegue** declarado en el alcance (campo opcional
  del formulario; cláusula específica del acuerdo; guardas anti-SSRF en
  `src/server/inspeccion.ts`; pruebas VGI-115 a VGI-123).

## Aviso

VIGÍA propone el análisis jurídico; la responsabilidad profesional es del abogado
que firma cada hallazgo. El informe es evidencia del principio de responsabilidad
demostrada frente a la SIC: no acredita conformidad ni lo expide un organismo
acreditado por la ONAC.
