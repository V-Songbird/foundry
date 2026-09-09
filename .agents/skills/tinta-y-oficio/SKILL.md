---
name: tinta-y-oficio
description: Crear o ampliar los iconos, logos y banners de Foundry y sus plugins con la identidad Tinta y oficio, variantes clara/oscura y transparencia real. Usar para esta familia visual, no para diseño de interfaces ni marcas ajenas.
---

# Tinta y oficio

Skill de desarrollo de Foundry, compartida por Claude y Codex; no se distribuye
dentro de cada plugin.

Lee `docs/shared/launch/tinta-y-oficio.md` desde la raíz de Foundry antes de producir
activos. Allí están las siluetas, paletas, prompts de partida, procedencia, tamaños
y comprobaciones. Abre las comparativas enlazadas para ver los trazos reales.
Los prompts exactos y originales de v1 están junto a su `build.py`.

Para ampliar la familia, parte de la función del plugin y elige una silueta propia,
compacta y visible a 32 px. Conserva el pincel seco, el lettering minúsculo y un
acento por marca. Respeta cualquier concepto ya aprobado. Genera icono y banner
coherentes usando referencias; deriva los temas de la misma geometría.

Usa la herramienta de imagen disponible conforme a sus instrucciones y permisos.
Registra el modelo solo si se puede verificar. Una cuadrícula visible no prueba
transparencia: inspecciona el modo y el canal alfa. Si hace falta procesamiento
local, reutiliza las funciones de v1 cuando encajen, con parámetros adaptados al
nuevo original; sus recortes y umbrales no son universales.

Entrega seis PNG por marca según la guía, con revisión visual sobre ambos fondos,
comprobación de alfa idéntico entre temas, manifiesto, prompts y originales.
Trabaja en una carpeta nueva de `docs/shared/launch/assets/` para conservar v1.
No copies investigación ni originales al plugin instalable. Al integrar una
identidad publicada, coordina la misma marca en main y las ediciones existentes.

Mantén este archivo idéntico en `.claude/skills/tinta-y-oficio/SKILL.md` y
`.agents/skills/tinta-y-oficio/SKILL.md`; la guía compartida contiene los detalles.
