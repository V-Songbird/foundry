# Continuidad de identidad visual — 2026-09-09

## Estado: pausado por el propietario

No ejecutar las correcciones siguientes hasta que el usuario pida continuar.
Este documento y sus adjuntos guardan la continuidad; no representan cambios ya
aplicados. No hay procesos de publicación pendientes de esta tarea.

## Próximo trabajo solicitado

1. Restaurar los heroes originales de los plugins. El usuario destacó Razor
   cortando código/texto y Hush representando las sesiones como una onda que se
   silencia. Revisar también Foreman. Distinguir `hero.svg`, `demo.svg` y
   `mascot.svg`: conservar la mascota no equivale a conservar los otros dos.
2. En las tarjetas de plugins de Codex, usar solo la figura, sin lettering.
   Actualmente `composerIcon` apunta al icono, pero `interface.logo` y `logoDark`
   apuntan a las composiciones con nombre: la tarjeta muestra ese nombre minúsculo
   e ilegible. Cambiar esos campos a las variantes de icono sin texto; comprobar
   la tarjeta instalada, no solo la existencia del archivo. Mantener los logos
   completos para otros usos donde tengan espacio.
3. Actualizar el **Social preview de GitHub**, que es un ajuste del repositorio
   distinto del banner del README. No se actualizó en la entrega anterior.
   La captura de Razor muestra el diseño antiguo. Revisar Foundry y todos los
   plugins. Preparar el formato apropiado y subirlo por una capacidad compatible;
   no afirmar que cambiar el README actualiza este ajuste. La captura recomienda
   1280 × 640 px (mínimo 640 × 320).
4. Cambiar el fondo marfil de los banners claros por blanco. Conservar los dibujos
   aprobados y las variantes oscuras salvo nueva indicación. Actualizar derivados,
   comparativas, manifiestos, ZIP y guía/skill si cambian sus especificaciones.

El usuario ordenó pausar **antes** de realizar estos puntos. No generar arte,
reinstalar, publicar ni modificar heroes durante esta pausa.

## Evidencia del usuario

- [Tarjetas instaladas de Codex con lettering ilegible](assets/branding-resume-2026-09-09/codex-plugin-cards.png)
- [Social preview antiguo de Razor](assets/branding-resume-2026-09-09/github-social-preview.png)

Son copias de las capturas aportadas, conservadas fuera de X:/Temp.

## Qué pasó con los heroes

Se retiraron sus referencias al reorganizar los README, antes del cambio de
logos. Razor: commit `9a43278` (Claude), `609b73e` (Codex). Hush: `44c7bee`
(Claude). Se dejó `assets/mascot.svg` como única animación enlazada.
En main se eliminaron assets al reducir el árbol a una página de presentación.
`assets/hero.svg` y `assets/demo.svg` siguen en las ediciones Claude.

Los heroes/demos incluyen resultados concretos de benchmarks Claude: Razor
muestra líneas de código evitadas; Hush, palabras e intervenciones por sesión.
Recuperar su contexto y evidencia sin presentarlos como mediciones Codex.
Se puede identificar explícitamente evidencia Claude al mostrarla en otra página;
no inventar resultados equivalentes. Revisar los bloques de excepción y los
verificadores antes de integrar. El usuario autorizó restaurar los heroes, no
reescribir sus resultados ni ejecutar benchmarks pagados.

## Estado publicado al pausar

- Foundry PR #7 integrada: `dd4e1b7f77fb69246207c4e15bb726bb7a13f06b`.
- Foreman Codex `5b3adf27795adffd4746fa765d8297b2cf07a014`, versión `3.0.3-codex.1`.
- Foreman Claude `6b89423b467186cce27127e8c735cd207e9a2ba3`, versión de catálogo `2.6.2`.
- Hush Claude `85b55d4fee7710937e165adc8e41936d7a3f4c29`, versión de catálogo `1.11.7`.
- Hush Codex `e3c32c930631d509ca3f9836a7353c0192d443ce`, sigue sin paquete instalable.
- Razor Codex `7f82dc54995c1cbbbee2cfffe34bbf42621e2467`, versión `1.5.10-codex.1`.
- Razor Claude `4030c4851fd59054b73ad3a9570a0f1b2ba4306c`, versión de catálogo `1.5.10`.
- Las páginas main de los cuatro plugins se publicaron también.
- [Registro de commits, PR y rutas de trabajo](assets/branding-resume-2026-09-09/published-targets.json).

Foreman y Razor están instalados en
`C:/Users/Songbird/.codex/plugins/cache/foundry/<plugin>/<version>/`.
Se verificaron sus tres campos visuales contra la fuente byte a byte y su alfa.
Eso no comprobaba legibilidad en la tarjeta: la captura del usuario evidencia
el problema restante. No editar directamente esa caché; actualizar fuente,
versión/pin y reinstalar cuando corresponda.

CI final de Foundry pasó: Benchmark instruments, Plugin README parity,
Main selectors y validate. Pasó la paridad final de las seis ediciones.
Las protecciones default y platform-Claude/Codex permanecieron activas; no se
cambiaron permisos. Al retomar, verificar otra vez el estado remoto.

## Recursos y precauciones para retomar

- [Guía de producción](tinta-y-oficio.md), skill `tinta-y-oficio` idéntica en
  `.agents/skills/` y `.claude/skills/`.
- Originales, prompts y script: `docs/shared/launch/assets/tinta-y-oficio-v1/`.
  No atribuir las imágenes a Sunflare: la herramienta integrada no expuso el modelo.
  El usuario autorizó procesamiento local con Python en esta tarea.
- Usar `coordinate-readmes` y `plugin-creator` según el cambio. El checker de main
  tiene una lista cerrada de archivos: restaurar heroes requiere actualizarla
  y coordinar sus copias en las páginas principales, además del generador si procede.
- `check-platform-marketplaces.js` ya admite iconos PNG y SVG. Mantener validación
  de existencia dentro del paquete y pines completos de commits publicados.
- Rama root al pausar: `codex/tinta-y-oficio-assets`, ya publicada e integrada por
  squash. No volver a publicar su historial como una nueva entrega sin partir
  de main integrado. No escribir directamente en main.
- Existen worktrees de presentación en `.scratch/branding/<plugin>-main` y de
  plataforma en `.claude/worktrees/platform-isolation/`. Pueden seguir sobre
  ramas candidatas anteriores al squash: inspeccionar antes de reutilizar.
- Hay un archivo ajeno sin seguimiento: `benchmarks/hush/style-study-20260909.cjs`.
  No incluirlo, moverlo ni borrarlo como parte de identidad visual.
- El usuario conserva la actualización instalada de Claude. Sí autorizó bumps y
  pines publicados de Claude; no ejecutar su instalación. Dijo haber actualizado
  Claude, pero no se verificó su versión instalada.
- No hace falta repetir el aviso de que la sesión cambió de tema: ya se emitió.

Para continuar: leer este documento, comprobar ramas/estado y retomar los cuatro
puntos solicitados, sin rehacer la producción v1 ni la publicación ya completada.
