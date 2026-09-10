---
name: tinta-y-oficio
description: Crear o actualizar iconos, logos, banners sociales y de README, gráficos y animaciones de Ember para Foundry con el estilo aprobado de tinta plana. Usar para esta familia visual, no para marcas ajenas ni diseño de interfaces.
---

# Foundry: tinta plana

Skill de desarrollo compartida por Claude y Codex. No se distribuye dentro de los plugins.

Lee `docs/shared/launch/tinta-y-oficio.md` desde Foundry antes de producir activos. Es la guía canónica y sustituye las instrucciones anteriores de pincel seco. Las fuentes aprobadas están en `docs/shared/launch/assets/ember-brand-kit/source/`; el generador está en la misma carpeta del kit, `build.cjs`.

Conserva siluetas suaves, rellenos planos y contornos de tinta ligeramente irregulares. Sin pincel seco, degradados, brillo ni chispas decorativas. Foundry es un yunque; Hush, un globo con una raya; Foreman, una cinta plegada; Razor, una hoja con muesca; Flint, una sola piedra. Foundry y Flint no llevan chispa. No volver a conceptos rechazados ni regenerar las fuentes aprobadas con un modelo de imagen.

Los colores de marca son idénticos en claro y oscuro; solo cambian tinta y fondo. Usa los valores de la guía. Mantén la geometría y el alfa de iconos/logos iguales entre temas. Conserva la legibilidad a 32 px.

Por marca entrega ambos temas y fuentes SVG: social 1280×640 (recomendado), banner README 2172×724, logo transparente 1400×420 e icono PNG transparente 1024×1024. Son ocho PNG por marca. Usa el generador con Node y Sharp disponibles; `NODE_PATH` permite indicar un runtime instalado. Consulta la guía para fuentes tipográficas, reproducibilidad, manifiesto y validación. No atribuyas reproducción byte a byte a un entorno con fuentes o renderer distintos.

Para Ember y evidencia, usa sus generadores separados en `assets/ember-approved` y `assets/graphics-ink`. Conserva las respuestas originales, datos y tiempos medidos; no confundir una ilustración con un replay. Los ocho PNG de identidad no se exigen a una animación SVG.

La integración coordina main y ediciones existentes mediante `coordinate-readmes`. Subir el social preview de GitHub es una acción separada de editar README. Generar un kit no publica ni autoriza merges. Conserva originales e historia, mantén investigación fuera de plugins instalables y revisa los PNG reales en ambos temas.

Mantén este archivo idéntico en `.agents/skills/tinta-y-oficio/SKILL.md` y `.claude/skills/tinta-y-oficio/SKILL.md`.

Al publicar, revisar también las imágenes incrustadas en documentación y materiales de lanzamiento. Ejecutar `node scripts/git-hooks/check-graphic-references.js`: los gráficos visibles deben apuntar a derivados mantenidos; los originales de benchmark se conservan como enlaces de procedencia, no como imágenes de presentación fijadas a un commit antiguo. Los fixtures, registros y archivos de diseño históricos se preservan.
