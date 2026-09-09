# Tinta y oficio: guía de producción

Identidad compartida de Foundry y sus plugins. Esta guía documenta la producción
del paquete [v1](assets/tinta-y-oficio-v1/README.md) y sirve para ampliar la familia.
Los recursos son PNG rasterizados; no son vectores ni fuentes tipográficas.

## Dirección visual

Trazo vivo de tinta, bordes de pincel seco, siluetas compactas y espacios negativos
claros. Un símbolo reconocible por producto, con un acento cromático propio.
Los nombres usan lettering caligráfico en minúsculas. Evitar iniciales genéricas,
escudos, degradados, brillos y detalles que desaparezcan a 32 px.

| Marca | Silueta | Acento sobre claro / oscuro |
| --- | --- | --- |
| Foundry | Crisol inclinado, vertido y gota separados | `#BE5D27` / `#E3A165` |
| Foreman | Cinta verde plegada, dos pliegues ascendentes y base curva | `#21553B` / `#9EC8AC` |
| Hush | Dos trazos curvos, superior grueso e inferior azul, cuña abierta | `#2C75A5` / `#79B6DE` |
| Razor | Hoja diagonal con muesca escalonada y recorte rectangular rojo | `#BF4935` / `#EB8D79` |
| Flint | Dos facetas asimétricas y brasa central | `#C18423` / `#E8BD66` |

Tinta principal: `#181917` sobre claro y `#EEE9DE` sobre oscuro. Foreman usa verde
para todo el símbolo. Fondo oscuro del banner: `#191C1B`; el claro conserva el
papel marfil generado en v1. Desde [v2](assets/tinta-y-oficio-v2/README.md),
el fondo claro es blanco puro. La geometría no cambia con el tema.

## Cómo se produjo v1

Se eligió la dirección Tinta y oficio mediante láminas comparativas y se refinaron
las siluetas. Se generaron cinco iconos independientes y cinco banners claros
tomando como referencia la lámina aprobada. Los prompts exactos se conservan en
[sources.json](assets/tinta-y-oficio-v1/sources.json) y las diez entradas en
[source/](assets/tinta-y-oficio-v1/source/). Las láminas exploratorias previas no
están incluidas en ese registro; los prompts describen sus símbolos de referencia.
La [comparativa final](assets/tinta-y-oficio-v1/preview-alpha.png) y la
[comparativa de banners](assets/tinta-y-oficio-v1/preview-banners.png) son las
referencias locales para futuras ampliaciones.

Se utilizó la herramienta integrada `image_gen`. No expuso un selector ni el nombre
exacto del modelo: no se puede atribuir esta producción a Sunflare 2.5. Volver a
ejecutar un prompt no garantiza repetir el dibujo; conservar los originales es
lo que permite reproducir el procesamiento posterior.

Los iconos generados eran RGB con una cuadrícula pintada, pese a solicitar alfa.
El propietario autorizó explícitamente usar Python para eliminar esos fondos,
limpiar los recortes y exportar las variantes. El
[build.py](assets/tinta-y-oficio-v1/build.py) conserva los originales y:

1. Separa tinta y pigmento por luminosidad y diferencia entre canales; limita
   la máscara a las proximidades del trazo para descartar el fondo simulado.
2. Extrae el lettering de los banners mediante recortes por marca y máscaras.
   Elimina fragmentos conectados al borde y pequeños restos de ornamento en Foreman.
3. Recolorea las máscaras para ambos temas. Compone los logos con símbolo y nombre.
4. Conserva el banner claro y deriva el oscuro mediante recoloración del mismo
   original, manteniendo la composición y parte de la textura.
5. Exporta los PNG, calcula SHA-256 y verifica que cada pareja de icono o logo
   tenga exactamente el mismo canal alfa.

Los umbrales, recortes y limpieza de Foreman y Razor están ajustados a estas
entradas. **No son un eliminador universal de fondos.** No aplicarlos ciegamente
a otro dibujo: podrían borrar pigmentos claros, puntos o trazos separados.
El lettering proviene de los banners; no se utilizó una fuente para los nombres.
Segoe UI solo se usa en los rótulos de la lámina de revisión.

## Reproducir y ampliar

Desde la raíz del repositorio, con Python, Pillow y NumPy disponibles:

```sh
python docs/shared/launch/assets/tinta-y-oficio-v1/build.py
```

La producción original usó Pillow 12.3.0 y NumPy 2.3.5. El script sobrescribe
los derivados de v1 y su manifiesto; no modifica `source/`. Su lámina de revisión
usa fuentes de Windows en `C:/Windows/Fonts`. Los PNG de producto no dependen de
esas fuentes. El HTML, la comparativa de banners y el ZIP se montaron por separado;
este comando no los actualiza. Regenerarlos si cambian los PNG. Los hashes pueden
variar entre versiones de las herramientas.

Para un nuevo plugin, trabajar en una carpeta nueva bajo `docs/shared/launch/assets/`.
Elegir una metáfora vinculada a su función, distinta de las cinco siluetas existentes.
Usar las comparativas como referencia visual y sustituir marca, símbolo y acento
en los prompts registrados. Un punto de partida:

> Crea un símbolo para {marca}, que {función}, dentro de la familia Tinta y oficio
> de las referencias adjuntas. Metáfora: {símbolo}. Tinta con pincel seco, silueta
> compacta y legible a 32 px, espacio negativo abierto y acento {color}. Sin letras
> ni fondo pintado. Entrega un único icono con transparencia alfa real.

Una vez elegida la silueta, generar el banner con ese mismo símbolo a la izquierda,
el nombre exacto en lettering minúsculo a la derecha y un gesto de pincel del color
de acento en el extremo. Mantener separación suficiente para extraer el nombre
sin arrastrar el ornamento. Conservar cada prompt y entrada, y registrar qué
herramienta/modelo se pudo verificar. Preferir recolorear la misma máscara para
los temas en vez de generar dos dibujos independientes.

Reutilizar las funciones del script cuando encajen; adaptar en la carpeta nueva
los parámetros y recortes que necesite el nuevo original. Si la herramienta limita
la edición local, respetar sus permisos: la autorización registrada de v1 no es
una autorización permanente para cualquier operación futura.

## Entrega y revisión

Cada marca tiene seis archivos:

| Archivos | Tamaño | Modo |
| --- | --- | --- |
| `icon-on-light.png`, `icon-on-dark.png` | 1024 × 1024 | RGBA |
| `logo-on-light.png`, `logo-on-dark.png` | 1400 × 420 | RGBA |
| `banner-light.png`, `banner-dark.png` | 2172 × 724 | RGB |

Comprobar alfa real, zonas totalmente transparentes y opacas, esquinas transparentes
y bordes suavizados. Comparar las máscaras de ambos temas byte a byte. Revisar sobre
marfil y carbón, a tamaño completo y con iconos a 32 px: sin cuadrícula residual,
halos, letras cortadas ni fragmentos de ornamento. Verificar la escritura del nombre,
la coherencia del símbolo en icono/logo/banner y la distinción entre marcas.

Guardar manifiesto con dimensiones, modo y hashes, comparativas y un ZIP de entrega
con los seis PNG por marca y sus instrucciones. Mantener originales y prompts en
Foundry, fuera del paquete instalable del plugin. La publicación debe usar los
mismos recursos en main, Claude y Codex cuando esas ediciones existan; preparar
una propuesta no implica reemplazar automáticamente la identidad publicada.

## Integración en interfaces y GitHub

En tarjetas de Codex, `composerIcon`, `logo` y `logoDark` usan la figura sin
lettering: el nombre ya aparece junto al icono. Reservar el logo con nombre
para composiciones amplias. Los banners claros usan blanco desde v2.

El Social preview es un ajuste independiente de GitHub. Subir el PNG
`social-preview.png` de 1280 × 640 de cada marca y verificar la vista previa
guardada. Un banner en el README no actualiza este ajuste.

Conservar los heroes y demos originales al renovar identidad. Cuando muestran
sesiones o resultados de Claude, identificarlos explícitamente; no atribuirlos
a Codex. Conservar la mascota no sustituye las demostraciones del producto.

## Ember: dirección aprobada el 2026-09-09

Referencia aprobada: [Hush](assets/ember-approved/hush.svg). Familia: [Foreman](assets/ember-approved/foreman.svg) y [Razor](assets/ember-approved/razor.svg). Fuentes originales y generador están en esa carpeta.

- Ember conserva la silueta naranja redonda, rostro amable y llama expresiva. No usar corteza oscura, fisuras, aspecto rocoso ni brillos de esquina: perdían ternura. Rellenos planos y contorno de tinta; mejillas discretas.
- Globos, pill del nombre, teclado, carpeta y tarjetas comparten contornos orgánicos, asimetrías pequeñas y trazos estables. Sin brillos decorativos ni sombras de volumen.
- Hush azul: #2C75A5 / #79B6DE. Foreman verde: #21553B / #9EC8AC. Razor rojo: #BF4935 / #EB8D79. El pill del nombre, los detalles y los acentos gráficos del README siguen esa misma pareja claro/oscuro. Ember sigue naranja. Los colores semánticos de datos, errores y estados no son acentos de marca.
- Conservar el relato propio: Hush pasa del tecleo estresado al trabajo tranquilo; Foreman reúne papeles en un plan; Razor retira extras. No convertir todos los relatos en Hush recoloreado.
- Conservar literalmente las respuestas, etiquetas y referencias del original; no traducirlas ni reescribirlas por estética. La coreografía de mascota es ilustrativa y no representa tiempos de benchmark.
- Texto quieto durante la lectura, centrado verticalmente en su globo, con pausa final legible. Movimiento continuo, sin desaparición de manos entre estados. SVG autónomo, temas claro/oscuro y alternativa de movimiento reducido.
- Revisar visualmente la escena y el texto. Validar igualdad del contenido textual y paletas, además de paridad entre ediciones. Los banners y la evidencia gráfica se conservan; no regenerar datos para una renovación estética.

Esta dirección sustituye el color verde histórico de Razor en ADR 0006 y su tratamiento visual anterior. La familia PNG de iconos/banners mantiene su entrega existente; las escenas SVG tienen su propio flujo, sin exigir seis PNG. El formato C fue elegido para la futura reorganización del README; su integración editorial permanece separada de esta aplicación de arte.

## Gráficos de evidencia: tinta sin alterar datos

La dirección aprobada se extiende a los otros gráficos de Foundry. Referencia y generador: assets/graphics-ink/. Renovar marcos, pills y cajas con contornos irregulares y rellenos planos sin sombras. Mantener intactos texto, geometría de marcas medidas, escalas y nodos de animación de replays. Los colores de estado conservan su significado; los acentos de marca siguen azul/verde/rojo. El generador compara nodos de texto, animación y marcas contra fuentes conservadas antes de escribir. Banners, logos e iconos de Tinta y oficio se mantienen como identidad aprobada.

## Integration: C layout and dark artwork

The approved art now accompanies the example-led C layout in the root and plugin READMEs. Shipped SVGs automatically select the dark palette using prefers-color-scheme; fixed dark exports in assets/dark-previews/ allow independent review. Dark banners already exist and are preserved. The C order is governed by the shared README template and coordinate-readmes skill.
