# VIGÍA — Red Team IA para cumplimiento legal

Prototipo funcional para el Concurso Nacional de Legal Tech "Germán Cavelier" 2026-2.

VIGÍA audita aplicaciones de IA generadas por *vibecoding*: ejecuta pruebas
adversariales en un entorno aislado y autorizado, traduce cada falla técnica a la
norma que incumple y propone el parche. El entregable no es un informe narrativo,
sino un certificado de conformidad encadenado por hash con la evidencia del
ataque y del retesteo.

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

No hay variables de entorno ni base de datos: el MVP corre con estado en memoria.

## Recorrido de la demostración

1. En la portada, **Iniciar auditoría de demostración**. Se abre una auditoría
   sobre *Fintrex*, una fintech colombiana ficticia con un asistente de chat
   generado por vibecoding.
2. **Paso 1 — Alcance.** Conectar el repositorio y aceptar las tres cláusulas
   obligatorias del acuerdo de white hat. Sin ellas el botón de continuar queda
   deshabilitado: la autorización es una precondición, no un trámite.
3. **Paso 2 — Configuración.** Seleccionar los marcos normativos. Deseleccionar
   un marco desactiva los módulos que solo lo cubrían y suprime sus hallazgos.
4. **Paso 3 — Ejecución en vivo.** Los cuatro módulos avanzan y la consola recibe
   la traza por SSE. Dura unos 16 segundos.
5. **Paso 4 — Mapa de riesgos.** 14 hallazgos, puntuación 64 (riesgo medio),
   filtrables por marco y ordenados por severidad.
6. **Paso 5 — Detalle.** Abrir `VGI-042`: evidencia del jailbreak, trazabilidad
   normativa artículo por artículo, análisis jurídico y diff del parche.
   **Generar pull request seguro**.
7. **Paso 6 — Remediación.** Ejecutar el retesteo adversarial, firmar el hallazgo
   (la firma solo se habilita con el retesteo en verde) y expedir el certificado.
   La puntuación sube de 64 a 73 de forma trazable.

## Arquitectura

```
src/
  domain/      Tipos, catálogo normativo, escenario y puntuación. Sin dependencias.
  engine/      Orquestador de módulos y ciclo de remediación.
  server/      Repositorio y bus de eventos detrás de interfaces.
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

Este MVP usa un motor determinista: el catálogo de hallazgos vive en
`src/domain/scenarios.ts` y el orquestador los emite al ritmo de cada módulo.
Esto tiene dos ventajas deliberadas — la demostración no depende de un LLM en
vivo, y el mismo catálogo sirve de suite de regresión cuando se conecte el motor
real, porque cada hallazgo declara la prueba que lo produce.

La puntuación es una función pura: penaliza cada hallazgo abierto (crítico 9,
advertencia 3,5, informativo 0,5 sobre 100) y sube solo cuando la remediación
queda firmada tras un retesteo en verde.

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/v1/runs` | Abre una auditoría |
| `GET` | `/api/v1/runs/:id` | Estado y puntuación |
| `POST` | `/api/v1/runs/:id/alcance` | `conectar-repositorio`, `aceptar-clausula`, `autorizar` |
| `PATCH` | `/api/v1/runs/:id/configuracion` | Marcos y minimización |
| `POST` | `/api/v1/runs/:id/ejecucion` | Encola la ejecución |
| `GET` | `/api/v1/runs/:id/eventos` | Flujo de eventos (SSE) |
| `POST` | `/api/v1/runs/:id/hallazgos/:hid/remediacion` | `abrir-pr`, `retestear`, `firmar` |
| `POST` | `/api/v1/runs/:id/certificado` | Expide el certificado |
| `GET` | `/api/v1/normativa` | Catálogo normativo |

## Marcos evaluados

Ley 1581 de 2012 y Decreto 1377 de 2013 · Ley 1266 de 2008 ·
Reglamento (UE) 2024/1689 (EU AI Act) · Reglamento (UE) 2016/679 (RGPD) ·
OWASP Top 10 for LLM Applications · patrones de diseño abusivos
(EDPB 03/2022, Ley 1480 de 2011).

## Aviso

Prototipo de demostración. Los hallazgos corresponden a un escenario ficticio y
no constituyen asesoría jurídica.
