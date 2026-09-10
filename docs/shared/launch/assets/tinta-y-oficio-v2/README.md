> Historical design archive. Use [the approved brand kit](../ember-brand-kit/README.md) for current graphics. These originals are retained for provenance.

# Tinta y oficio v2

Revisión solicitada: banners claros sobre blanco puro y Social preview de
1280 × 640 px. Iconos, logos y banners oscuros conservan los PNG aprobados de v1.
Siete PNG por marca; el manifiesto registra dimensiones, modo y SHA-256.

`build.py` usa Python, Pillow y NumPy y lee `../tinta-y-oficio-v1/` sin modificarlo.
Neutraliza el tinte marfil y convierte las zonas claras de papel a blanco,
conservando los trazos del original. Compone el Social preview sin recortar el
dibujo. Regenera la comparativa, el manifiesto y el ZIP de v2.

Para tarjetas de Codex, usar `icon-on-light.png` y `icon-on-dark.png` en `logo`
y `logoDark`; el lettering de `logo-on-*.png` queda para formatos amplios.
Subir `social-preview.png` al ajuste Social preview de GitHub: copiarlo al
repositorio o enlazarlo en el README no modifica ese ajuste.

La generación original y su procedencia se documentan en
[la guía compartida](../../tinta-y-oficio.md). No se generó un dibujo nuevo en v2.

## Publicación

El 2026-09-09 se subió `social-preview.png` en los ajustes de Foundry, Foreman,
Hush, Razor y Flint. Se comprobó visualmente cada imagen guardada en GitHub.
Los heroes y demos originales se restauraron en main, Claude y Codex de
Foreman, Hush y Razor, con atribución explícita de las sesiones Claude.
