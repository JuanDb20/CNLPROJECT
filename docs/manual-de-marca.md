# Manual de marca — VIGÍA

Base de trabajo, no un documento cerrado. Recoge lo que hoy está implementado en
`src/app/globals.css` y fija las reglas para que la identidad no se desarme
cuando varias personas toquen la interfaz.

Regla que ordena todo lo demás: **en VIGÍA el color no decora, significa**. Si un
elemento no comunica una de las categorías de abajo, va en gris.

---

## 1. La idea

VIGÍA hace dos cosas opuestas y las hace en ese orden: **ataca** un sistema de IA
y después produce una **prueba** que un abogado firma. Esa oposición es la marca.

| | Naranja | Azul |
|---|---|---|
| Qué nombra | Lo ofensivo: el equipo rojo, el ataque, la acción | Lo normativo: la norma citada, la firma, la prueba |
| Dónde aparece | Acción principal, marca, hallazgo en curso | Artículo citado, trazabilidad, documento |
| Token | `brand` | `legal` |

Los dos acentos **nunca se mezclan en un mismo elemento**. Un botón naranja con
borde azul no existe: sería decir que una acción es también una norma.

---

## 2. Color

### Superficies

Cuatro niveles de elevación sobre negro. Nunca se salta un nivel.

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#0b0c0d` | Fondo de la página |
| `surface` | `#141517` | Tarjetas |
| `surface-muted` | `#1a1b1d` | Bloques dentro de una tarjeta |
| `surface-raised` | `#202225` | Lo que flota sobre otra tarjeta |
| `line` | `#26282b` | Bordes y divisores |
| `line-strong` | `#37393c` | Bordes que deben verse |

### Texto

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#f2f1ee` | Títulos y texto principal |
| `ink-soft` | `#c9c7c2` | Párrafos largos |
| `ink-muted` | `#8f8d89` | Texto de apoyo |
| `ink-faint` | `#858380` | Metadatos y notas al pie |

`ink-faint` es el gris más claro admitido: mantiene 4,5:1 sobre `canvas`,
`surface` y `surface-muted` (WCAG AA). **No agregar grises por debajo de este.**

### Acentos

| Token | Valor | Uso |
|---|---|---|
| `brand` | `#e2732a` | Acción principal, marca |
| `brand-strong` | `#c95f1d` | Estado *hover* de la acción principal |
| `brand-dim` | `#8a4715` | Trazos y bordes de apoyo |
| `brand-bright` | `#f59355` | Solo sobre fondos oscuros saturados |
| `brand-soft` | `#241a11` | Fondo de un bloque de marca |
| `legal` | `#7ba7dd` | Norma citada, trazabilidad |
| `legal-strong` | `#5b8ac4` | *Hover* de un enlace normativo |
| `legal-dim` | `#2f4a68` | Bordes de bloques normativos |
| `legal-soft` | `#121b26` | Fondo de un bloque normativo |

### Severidad

Estos cuatro colores están reservados. **No usarlos con ningún otro sentido**:
si aparece rojo en la pantalla, hay un hallazgo crítico.

| Token | Valor | Significado |
|---|---|---|
| `critical` | `#e5534b` | Hallazgo crítico |
| `warning` | `#e2a33d` | Advertencia |
| `info` | `#6b96cf` | Informativo |
| `safe` | `#34a06b` | Resuelto, firmado, verificado |

---

## 3. Tipografía

Una sola familia de sistema para texto y una monoespaciada para todo lo que sea
dato verificable. La monoespaciada no es un recurso estético: marca **lo que se
puede comprobar** (un hash, una ruta de archivo, una cita normativa, un NIT).

| Uso | Tamaño | Peso |
|---|---|---|
| Título de página | 22 px | 600 |
| Titular de la página pública | 34 px móvil / 50 px escritorio | 600 |
| Título de tarjeta | 15 px | 600 |
| Texto corrido | 12,5–13,5 px | 400 |
| Apoyo | 11,5–12 px | 400 |
| Metadato y mono | 10–11 px | 400–500 |
| Etiqueta mono en versalitas | 10 px, `tracking-wider` | 500 |

Los tamaños se escriben en píxeles exactos (`text-[12.5px]`) y no con la escala
de Tailwind, porque la densidad de esta interfaz está calibrada a medio punto.

---

## 4. La marca

`MarkIcon` en `src/components/ui.tsx`: un hexágono con un acceso (`>`) dentro.
No es un escudo ni un candado —los dos clichés del sector— sino una insignia de
puesto de vigilancia con una terminal adentro.

Reglas:

- Tamaño mínimo 24 px. Por debajo, el acceso interior se cierra.
- Solo en `brand` sobre fondo oscuro, o en `ink` cuando la marca deba ser neutra.
- Nunca deformarlo, rotarlo ni rellenarlo.
- Dentro de una auditoría abierta la marca **late con el estado real** de la
  ejecución (`MarkState` en `src/components/shell.tsx`). Fuera de ahí es estática.
- El logotipo acompaña a la marca en versalitas con `tracking-[0.14em]`, con el
  descriptor debajo en mono a 9 px.

**Pendiente del equipo:** David pidió que el logo se decida entre todos. El
hexágono actual funciona como marca de trabajo; si se rediseña, solo hay que
reemplazar `MarkIcon` y el resto de la interfaz lo hereda.

---

## 5. Movimiento

El movimiento informa; no adorna.

| Pieza | Qué comunica | Dónde |
|---|---|---|
| `portal` | Apertura de sesión | Solo al entrar a la aplicación |
| `mark` | Estado de la ejecución en curso | Cabecera de una auditoría |
| `stagger` | Llegada del contenido tras el portal | Interior de la aplicación |
| `reveal` | Aparición al entrar en pantalla | Página pública |
| `scanline` | El escáner recorriendo el código | Maqueta del hero |

Todo lo anterior se desactiva con `prefers-reduced-motion: reduce`, y el
contenido queda visible: nunca se oculta algo que después no pueda aparecer.

---

## 6. Escritura

- **Español de Colombia.** Norma citada por su nombre completo la primera vez
  («Ley 1581 de 2012»), abreviada después.
- **Nunca prometer lo que VIGÍA no hace.** No «garantiza cumplimiento», no
  «certifica». Propone; el abogado firma.
- **Una idea por bloque.** Si un párrafo necesita un «además», va en otro bloque
  o en una zona desplegable.
- **Las normas europeas siempre marcadas como referencia comparada**, nunca como
  derecho vigente en Colombia.
- **Sin jerga de producto de IA.** «Potenciado por IA», «revoluciona», «insights»
  y similares están prohibidos: son justamente lo que hace que el producto suene
  como cualquier otro.

---

## 7. Qué falta

- [ ] Decidir el logo definitivo entre todos.
- [ ] Elegir el eslogan (opciones redactadas en `docs/marca-eslogan.md`).
- [ ] Reemplazar los marcadores del equipo en `src/app/landing.tsx`.
- [ ] Definir el uso de la marca en fondo claro (hoy solo existe en oscuro).
