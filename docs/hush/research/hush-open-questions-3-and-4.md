# Preguntas 3 y 4, explicadas a fondo

Local. Escrito 2026-08-29, después de verificar cada afirmación contra el código y los registros.

---

# Pregunta 3 — la línea 221 del README y el recordatorio por turno

## Qué es el canal, en cristiano

Claude Code no te entrega el estilo una sola vez al empezar. **En cada turno tuyo inyecta un
recordatorio corto**, un `<system-reminder>`, que dice exactamente esto:

```
<nombre del estilo> output style is active. Remember to follow the specific guidelines for this style.
```

Lo saqué del binario y lo confirmé en vivo. El código es este:

```js
output_style: (e) => {
  if (e.style.length > C3e) { log("…suppressing its per-turn reminder"); return [] }
  return hs([ xe({ content: `${Mv(e.style)} output style is active. ` +
             `${e.turnReminder ?? "Remember to follow the specific guidelines for this style."}`,
             isMeta: true }) ])
}
```

`C3e = 256`, así que el nombre puede llegar a 256 caracteres. Probé un nombre de 113 caracteres y
apareció entero, en dos sitios: en el recordatorio y como encabezado `# Output Style: <nombre>`.
Y probé tres turnos encadenados con `--continue`: salieron **tres** recordatorios. Se reinyecta en
cada turno y sobrevive al resume.

## Dónde está el problema

El recordatorio **solo se dispara si la clave `outputStyle` está puesta en `settings.json`**:

```js
async function uYn(){ if((vn()?.outputStyle||"default")==="default") return []; … }
```

hush se puede activar de dos maneras:

| ruta | ¿se ve el estilo? | ¿hay recordatorio por turno? |
| --- | --- | --- |
| `"outputStyle": "hush:Hush"` en settings | sí | **sí** |
| solo `force-for-plugin: true` en el frontmatter | sí | **no** |

Las dos entregan el cuerpo del estilo igual. La diferencia es únicamente ese recordatorio.

## La parte que YO tenía mal, y la corrijo

En la primera pasada dije que `/hush:pick-style` mataba el canal. **Es falso, y lo verifiqué.**
`activate-style.js:135` llama a `stripOutputStyle(p, name)` donde `name` sale del **frontmatter**,
o sea `Hush` a secas. Y `activate-style.js:52` solo borra la clave si el valor **coincide exacto**
con ese nombre:

```js
if (data.outputStyle.trim().toLowerCase() !== targetName.trim().toLowerCase()) return false;
delete data.outputStyle;
```

`"hush:Hush"` no es igual a `"Hush"`, así que **la clave documentada nunca se borra**. Prueba viva:
mi propio `~/.claude/settings.json:61` sigue teniendo `"outputStyle": "hush:Hush"` después de toda
esta campaña.

Solo se borraría si alguien escribió a mano un `"outputStyle": "Hush"` pelado.

## Entonces, ¿qué queda realmente por decidir?

Esto, y es una sola frase del README. **Línea 221:**

> Once it takes you can delete those lines again. `/hush:pick-style` swaps voices for you after that.

Le estamos diciendo al usuario que borre la clave. Si la borra:

- El estilo **sigue funcionando**, porque `force-for-plugin` lo ata igual.
- Pero **pierde el recordatorio por turno**.
- Y **todos los benchmarks corren con la clave puesta**, vía
  `benchmarks/hush/settings-hush.json`. O sea: los números publicados describen la configuración
  *con* recordatorio.

**El resultado es que esa frase invita al usuario a una configuración que nunca hemos medido.**

## La recomendación, y su costo

Borrar esa frase. Dos razones:

1. Lo que el usuario corre pasa a ser exactamente lo que medimos.
2. No cuesta nada y no cambia el producto, solo la instrucción.

El costo de borrarla: al usuario le queda una línea en `settings.json` que parece redundante,
porque el plugin ya se ata solo. Es un poco feo y es todo.

**Lo que NO recomiendo, y quiero que quede claro:** meter instrucciones dentro del nombre del
estilo. Sí cabe, sí llega, y sí se repite cada turno. Pero el ledger ya midió que el cuerpo del
estilo entregado fuera del slot **no vincula** (mensaje final de 76 a 255 palabras en Opus), y bajo
tu propia vara hush ya va **32 de 32** en Opus. No queda nada que comprar ahí.

---

# Pregunta 4 — ¿el número de silencio estricto se queda en la página?

## Los dos números, y en qué se diferencian

| | qué cuenta | Opus 5, hush | sin plugin |
| --- | --- | --- | --- |
| **silencio estricto** | cero palabras antes de la respuesta | 16 de 32 | 0 de 32 |
| **como mucho un mensaje** | una línea de apertura y ya | **32 de 32** | 10 de 32 |

## Por qué el estricto es un número frágil, con los datos delante

El ledger ya decía que el silencio es una **curva de longitud**, no una constante. Lo recalculé
ahora mismo sobre `rm300`, partiendo las 32 sesiones de hush por cuántas llamadas a herramientas
hizo cada una:

| llamadas a herramientas | n | cero palabras | como mucho un mensaje |
| --- | --- | --- | --- |
| 7–10 | 11 | 36% | **100%** |
| 11–15 | 8 | 75% | **100%** |
| 16–25 | 10 | 60% | **100%** |
| 26 o más | 3 | **0%** | **100%** |

Léelo así: **el número estricto va del 75% al 0% según lo larga que sea la sesión. El de un mensaje
es 100% en todas las bandas.**

Eso significa una cosa muy concreta y muy incómoda: **el día que la suite se vuelva más pesada, el
número estricto baja solo, sin que hush haya empeorado en nada.** Ya nos pasó una vez. La versión
retirada del póster decía "81 de 85" sobre una suite con 35 sesiones de cero herramientas; la suite
actual tiene diez sesiones de 26 llamadas o más, y por eso el mismo hush "cayó" a 15 de 32. No fue
una regresión. Fue otra suite.

El de un mensaje no tiene ese problema. Es categórico: o habló una vez, o habló más.

## Mi recomendación, en tres partes

1. **El titular y el póster van con "un mensaje como mucho".** 32 de 32 contra 10 de 32, y la peor
   sesión de Claude sin plugin rompiendo once veces. Es el número más fuerte y el único estable.
2. **El estricto se queda, pero como columna, no como titular.** Sigue siendo verdad y sigue siendo
   bonito: en la mitad de las sesiones hush no dijo absolutamente nada, y Claude solo nunca lo
   logró. Como dato de apoyo vale; como promesa de portada, no.
3. **Junto a la columna va la frase que la protege**, una línea, sin metodología: que ese número se
   mueve con lo larga que sea la sesión. Eso te cubre el día que baje.

## Lo que perderías si lo quitas del todo

El estricto es el número más emocional que tiene la página. "No dijo ni una palabra" pega más que
"dijo una sola frase". Quitarlo entero es más honesto de lo necesario y regala el mejor gancho.

Por eso: **titular categórico, columna emocional, y una frase que explique la columna.**

---

## Lo que ya está corriendo mientras lees esto

- **Batch `rm310`**, tu decisión 1: Opus 5, 2 brazos, las 8 tareas publicadas, 4 repeticiones, 64
  sesiones, ~$37. Mide el estilo 1.11.0 **completo**, incluida la regla del plan que arrancó toda
  esta campaña, contra Claude sin plugin, en un mismo lote. De ahí salen todas las cifras nuevas de
  la portada.
- **El re-juicio de ~$3**, tu decisión 2, entra después. Los lotes van en serie: dos a la vez
  queman la ventana de sesiones, y eso ya nos costó 47 corridas rotas una vez.
