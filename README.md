# VIGÍA — Equipo rojo legal y técnico para IA

Prototipo funcional para el Concurso Nacional de Legal Tech "Germán Cavelier" 2026-2.

VIGÍA audita aplicaciones de IA generadas por *vibecoding*: ejecuta pruebas
adversariales en un entorno aislado y autorizado, traduce cada falla técnica a la
norma que incumple y propone el parche. VIGÍA propone el análisis jurídico; lo
firma un abogado identificado con su tarjeta profesional. El entregable es un
informe de responsabilidad demostrada (arts. 26 y 27 del Decreto 1377 de 2013),
encadenado por hash con la evidencia del ataque, del retesteo y de la firma. No es
un certificado de conformidad acreditado.

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

No hay variables de entorno ni base de datos: el MVP corre con estado en memoria
(cuentas, sesiones y auditorías se pierden al reiniciar el servidor).

## Uso

1. **Crear cuenta de abogado** (nombre, tarjeta profesional, correo y contraseña)
   o **Ingresar**. Cada abogado solo ve sus propias auditorías.
2. **Mis auditorías → Nueva auditoría.** Registrar al cliente (razón social, NIT,
   representante legal, sector) y cargar el código del sistema de IA en un `.zip`
   de hasta 10 MB. VIGÍA lo lee en memoria, ignora `node_modules`, `.git` y los
   binarios, y fija la versión auditada con su SHA-256.
3. **Paso 1 — Alcance.** Aceptar las cuatro cláusulas obligatorias del acuerdo de
   white hat. Sin ellas el botón de continuar queda deshabilitado: el art. 269A de
   la Ley 1273 de 2009 sanciona el acceso «por fuera de lo acordado», y VIGÍA, que
   actúa como encargado, suscribe el contrato de transmisión.
4. **Paso 2 — Configuración.** Proveedores de IA detectados en el código, con país,
   rol y si el país está en la lista de la SIC. Seleccionar los marcos normativos.
5. **Paso 3 — Ejecución.** Los cuatro módulos recorren el código y la consola recibe
   la traza por SSE.
6. **Paso 4 — Mapa de riesgos** y **paso 5 — Detalle**: cada hallazgo muestra la
   prueba, la línea exacta del código que lo sustenta, la trazabilidad normativa,
   el análisis jurídico y el parche propuesto.
7. **Paso 6 — Remediación.** Retesteo, firma del abogado revisor (nombre, tarjeta
   profesional y salvedad opcional) e informe de responsabilidad demostrada.

El caso de prueba para ensayar el sistema está fuera de este repositorio, en
`caso-prueba/` (un `.zip` con el código de una fintech ficticia y su guía).

## Arquitectura

```
src/
  domain/      Tipos, catálogo normativo, catálogo de pruebas y puntuación. Sin dependencias.
  engine/      Orquestador de módulos y ciclo de remediación.
  server/      Cuentas y sesiones, lectura del .zip, repositorio y bus de eventos.
  app/api/v1/  API REST versionada.
  app/         Pantallas (React Server Components) y acciones de servidor.
  components/  Sistema visual.
```

Cuatro decisiones sostienen la escalabilidad sin complicar el MVP:

- **El catálogo normativo es dato, no código.** `src/domain/compliance.ts`
  declara marcos y obligaciones citables. Incorporar una jurisdicción nueva es
  añadir entradas, no tocar el motor. Se expone en `GET /api/v1/normativa`.
- **Los módulos están registrados, no codificados en el flujo.**
  `src/engine/modules.ts` es un registro; cada entrada corresponde uno a uno con
  un worker que consumiría de una cola en la arquitectura objetivo.
- **La interfaz consume un bus, no el orquestador.** La ejecución se lanza con
  `POST /runs/:id/ejecucion`, que retorna de inmediato, y el progreso llega por
  SSE desde `GET /runs/:id/eventos`. Mover el orquestador a un worker externo
  (cola de trabajos + Redis Pub/Sub) no cambia una línea del cliente.
- **La persistencia está detrás de una interfaz.** `AuditRepository` y
  `EventBus` en `src/server/store.ts` tienen implementación en memoria;
  sustituirlas por Postgres y Redis no afecta al dominio, al motor ni a la UI.

## Motor de análisis

`src/domain/checks.ts` es el catálogo de pruebas. Cada prueba declara qué busca en
el código cargado, las obligaciones que se incumplen si lo encuentra, el análisis
jurídico y el parche que propone. Un hallazgo solo aparece si su prueba encuentra
la falla, y la evidencia es la línea exacta del código (con llaves y números de
documento enmascarados). Un código sin fallas produce cero hallazgos.

En este MVP la detección es por patrones de texto. El motor completo (árbol
sintáctico, LLM y pruebas dinámicas contra el entorno de pruebas del cliente)
sustituye la función `detect` de cada prueba sin tocar el resto del catálogo ni la
interfaz. El retesteo todavía se marca como superado al ejecutarlo; hacerlo real
es parte de ese motor.

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
| `POST` | `/api/v1/runs` | Abre una auditoría (multipart: `cliente`, `nit`, `representante`, `sector`, `sistema`, `codigo` .zip) |
| `GET` | `/api/v1/runs/:id` | Estado y puntuación |
| `POST` | `/api/v1/runs/:id/alcance` | `aceptar-clausula`, `autorizar` |
| `PATCH` | `/api/v1/runs/:id/configuracion` | Marcos y minimización |
| `POST` | `/api/v1/runs/:id/ejecucion` | Encola la ejecución |
| `GET` | `/api/v1/runs/:id/eventos` | Flujo de eventos (SSE) |
| `POST` | `/api/v1/runs/:id/hallazgos/:hid/remediacion` | `abrir-pr` (genera el parche), `retestear`, `firmar` (con `abogado`, `tarjetaProfesional` y `salvedad` opcional) |
| `POST` | `/api/v1/runs/:id/certificado` | Expide el informe de responsabilidad demostrada |
| `GET` | `/api/v1/normativa` | Catálogo normativo |

## Marcos evaluados

El eje es el derecho colombiano:

- Ley 1581 de 2012 y Decreto 1074 de 2015 (compila el Decreto 1377 de 2013):
  deber de seguridad, datos sensibles, autorización, transmisión y transferencia.
- Decreto 1377 de 2013, arts. 26 y 27 (responsabilidad demostrada).
- Circular Única de la SIC, Título V, num. 3.2 (países con nivel adecuado; EE. UU.
  desde la Circular Externa 008 de 2017) y Circular Externa 002 de 2024
  (tratamiento de datos personales con IA).
- Ley 1266 de 2008 (habeas data financiero) y Ley 1480 de 2011 (consumidor).
- Estándar técnico: OWASP Top 10:2025 y OWASP Top 10 for LLM Applications 2025.
- Referencia comparada, no reportada como incumplimiento: Reglamento (UE)
  2024/1689 (AI Act), Reglamento (UE) 2016/679 (RGPD) y Directrices EDPB 03/2022.

## Aviso

VIGÍA propone el análisis jurídico; la responsabilidad profesional es del abogado
que firma cada hallazgo. El informe no es un certificado de conformidad acreditado.
