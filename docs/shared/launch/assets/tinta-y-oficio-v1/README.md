# Tinta y oficio

Identidad visual para Foundry, Foreman, Hush, Razor y Flint. Paquete de 30 PNG para las cabeceras de GitHub y la identidad visual de los plugins.

| Archivo por marca | Dimensiones | Fondo |
| --- | --- | --- |
| icon-on-light.png / icon-on-dark.png | 1024 x 1024 | Transparente, RGBA |
| logo-on-light.png / logo-on-dark.png | 1400 x 420 | Transparente, RGBA |
| banner-light.png / banner-dark.png | 2172 x 724 | Marfil / carbon, RGB |

`on-light` usa tinta oscura para superficies claras; `on-dark` usa tinta clara para superficies oscuras. Cada pareja de iconos y logos comparte exactamente la misma silueta y canal alfa. Los banners mantienen su fondo y composicion.

Los PNG son rasterizados, no archivos vectoriales. Consulte index.html para comparar las variantes. manifest.json incluye dimensiones, modos y SHA-256.

## Procedencia

Dibujos generados con la herramienta integrada image_gen; su modelo exacto no esta expuesto y no se atribuyen a Sunflare 2.5. Transparencia, limpieza, composicion y variantes de color procesadas localmente con Python con autorizacion del propietario.

En el repositorio, source/ conserva las diez entradas originales, sources.json registra los prompts y build.py reproduce los PNG con Pillow y NumPy. Los originales RGB con fondos simulados quedan fuera del ZIP de entrega.
