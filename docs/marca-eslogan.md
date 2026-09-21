# Eslogan — opciones para decidir en equipo

David señaló que el eslogan actual («Auditoría adversarial de IA, con evidencia
que un abogado puede firmar») dice demasiado de una vez y usa vocabulario
genérico de aplicación de IA. Tiene razón en las dos cosas.

Este documento existe para que la decisión se tome comparando, no improvisando.
**No hay que elegir la que suene mejor en voz alta: hay que elegir la que un
abogado que nunca oyó hablar de VIGÍA entienda en dos segundos.**

---

## Cómo evaluar

Cuatro pruebas. Una opción que falla dos ya está descartada.

1. **Prueba del reemplazo.** Cambia «VIGÍA» por el nombre de cualquier otra
   startup de IA. ¿Sigue teniendo sentido? Entonces no dice nada nuestro.
2. **Prueba del abogado.** ¿Un abogado de 55 años que no sabe qué es un *prompt*
   entiende qué vendemos?
3. **Prueba del aliento.** ¿Se dice de una sola vez, sin coma que obligue a
   respirar?
4. **Prueba de la promesa.** ¿Promete algo que el producto realmente hace? No
   podemos decir «garantizamos cumplimiento»: VIGÍA propone, el abogado firma.

---

## Las opciones

### A · Riesgo regulatorio

> **Prueba tu IA antes de que lo haga la SIC.**
>
> *Bajada:* Cargas el código. VIGÍA lo ataca, cita la norma que incumple y un
> abogado firma el informe.

Es la única que nombra a la autoridad. Concreta, colombiana, imposible de
confundir con otro producto. Riesgo: vende por miedo, y ante un jurado académico
el miedo puede leerse como oportunismo.

**Pasa las cuatro pruebas.**

---

### B · La evidencia como producto

> **Evidencia, no opiniones.**
>
> *Bajada:* Auditoría adversarial de sistemas de IA, con cadena de custodia,
> norma citada y firma de abogado.

Sobria y memorable. Nombra el diferencial real: lo escaso no es detectar fallas,
es producir prueba oponible. Riesgo: por sí sola no dice que se trata de IA; la
bajada tiene que cargar con todo.

**Falla parcialmente la prueba del abogado** (sin la bajada no se entiende el
objeto).

---

### C · El vacío que se llena

> **Tu IA ya opera. ¿Alguien la leyó con la ley en la mano?**
>
> *Bajada:* VIGÍA audita el código de tu sistema de IA y entrega el informe que
> tu abogado revisa y firma.

La pregunta obliga a responderla mentalmente, y la respuesta honesta de casi
cualquier empresa es «no». Riesgo: es la más larga de todas.

**Falla la prueba del aliento.**

---

### D · La versión implementada hoy

> **Auditamos el código de tu IA. Firma un abogado.**
>
> *Bajada:* VIGÍA lee el código de tu sistema de inteligencia artificial, señala
> qué norma incumple y produce el informe que tu abogado revisa y firma.

Dos frases cortas que contienen el producto entero: qué se hace y quién responde.
Es la que quedó puesta en la página pública mientras el equipo decide, porque es
la que menos compromete. Riesgo: correcta pero poco memorable; nadie la repite
en un pasillo.

**Pasa las cuatro pruebas, sin entusiasmar.**

---

### E · El nombre trabajando

> **Vigilamos la IA que ya está adentro.**
>
> *Bajada:* Auditoría del código de tus sistemas de inteligencia artificial, con
> el artículo que incumple y la firma de un abogado.

Aprovecha el nombre: un vigía mira hacia afuera, pero el problema está adentro.
Riesgo: «vigilamos» puede leerse como monitoreo permanente, que no es lo que el
producto hace.

**Falla la prueba de la promesa.**

---

### F · Traducción

> **Del código al artículo.**
>
> *Bajada:* VIGÍA traduce lo que hace tu sistema de IA a la norma que le aplica,
> y deja el informe listo para firma.

La más corta y la más elegante. Nombra exactamente la operación del producto:
una traducción entre dos lenguajes que hoy nadie traduce. Riesgo: «artículo» es
ambiguo fuera de un contexto jurídico.

**Pasa las cuatro pruebas** si el público es jurídico.

---

### G · Responsabilidad demostrada

> **Que puedas demostrarlo.**
>
> *Bajada:* Auditoría de sistemas de IA con la evidencia que exige el principio
> de responsabilidad demostrada.

Habla el idioma exacto de la norma colombiana (Decreto 1074 de 2015, art.
2.2.2.25.6.1). Un abogado de datos personales la entiende de inmediato. Riesgo:
fuera de ese nicho no significa nada.

**Falla la prueba del abogado** con público general; la pasa con público experto.

---

### H · La pregunta del jurado

> **¿Quién firma tu IA?**
>
> *Bajada:* VIGÍA audita el código, cita la norma y deja el informe listo para
> que lo firme un abogado.

Tres palabras. Instala la idea de que alguien tiene que responder por el sistema,
que es la tesis del proyecto. Riesgo: «firmar una IA» no es una expresión que
exista todavía; hay que enseñarla.

**Pasa la prueba del aliento y la del reemplazo; la del abogado depende de la bajada.**

---

## Recomendación

Si la decisión es para **el concurso**: **F — «Del código al artículo.»** El
jurado es jurídico, así que la ambigüedad de «artículo» desaparece, y es la única
que nombra la operación del producto en cuatro palabras.

Si la decisión es para **vender después**: **A — «Prueba tu IA antes de que lo
haga la SIC.»** Es la que un gerente de riesgo recuerda y repite.

**Lo que hay que evitar en todo caso:** volver a una fórmula con dos comas y tres
ideas. Ese fue el problema que señaló David.

---

## Cómo cambiarlo

Una sola edición, en `src/app/landing.tsx`:

```ts
const TITULAR = "…";
const BAJADA  = "…";
```

Conviene revisar también el descriptor bajo el logotipo («Equipo rojo legal», en
`src/components/shell.tsx`), que hoy funciona como eslogan de apoyo.
