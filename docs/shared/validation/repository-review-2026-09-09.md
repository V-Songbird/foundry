# Revisión general de Foundry — 2026-09-09

La estructura está avanzada, pero todavía no está lista para cerrar la reconciliación. Esta revisión actualiza el diagnóstico anterior: no deben tratarse como pendientes los problemas que ya fueron corregidos. No se modificaron productos, ramas ni configuración remota durante esta revisión.

## Evidencia actual

- 836 archivos mantenidos y 594 referencias locales revisados en Foundry, seis ediciones, tres portadas preparadas y Flint. Dependencias, cachés y archivos experimentales masivos quedaron fuera del recorrido.
- 158 tests de mantenimiento pasan. La primera ejecución restringida falló al leer referencias Git; la repetición en el entorno normal pasa completa.
- Los tres pares de README pasan la comparación de contenido común y columnas de benchmarks.
- Los siete tests de carga y ejecución segura de los probes históricos de Hush pasan.
- Los 435 archivos protegidos de producto coinciden con la línea base.
- Ningún comando Node localizado por el escáner en workflows apunta a un archivo ausente. Esto no acredita que todo el workflow pueda ejecutarse o satisfacer las protecciones remotas.

## Pendientes prioritarios

| Prioridad | Hallazgo confirmado | Condición para cerrarlo |
| --- | --- | --- |
| Alta | El hook de tests exige `.claude-plugin/plugin.json` y supone que el plugin está inmediatamente debajo de Foundry. Omite Foreman/Codex, Razor/Codex y worktrees profundos. | Probar resolución de ambos manifiestos y de todos los checkouts; verificar el evento nativo de cada cliente y el presupuesto de ejecución. |
| Alta | La comparación de README en CI usa el candidato frente a la rama anterior de la otra edición. Dos cambios comunes coordinados pueden bloquearse mutuamente. | Validar pares de revisiones candidatas y comprobar después el par integrado, sin retirar la coordinación. |
| Alta | La regla local de main exige cuatro archivos y prohíbe CI. El diagnóstico remoto anterior encontró `test` obligatorio en main. | Resolver una comprobación satisfacible para las portadas y reconsultar los rulesets antes de publicar. No asumir que un check de Foundry satisface el del subrepositorio. |
| Alta | Foundry y los nueve worktrees de plugins contienen trabajo sin consolidar. | Inventariar e integrar cada árbol por separado, verificar destinos de mudanzas y actualizar pins solo a revisiones verificadas. Un commit de Foundry no conserva los archivos modificados dentro de sus submódulos. |
| Media | `foreman/CODEX.md` tiene dos enlaces a documentación fuera del paquete; ambos CHANGELOG de Foreman conservan `benchmarks/`, retirado del plugin. | Usar destinos públicos verificables o revisiones históricas explícitas y validar desde paquetes independientes. |
| Media | ADR propios de Foreman y Hush siguen bajo `docs/<plugin>/adr` en Foundry. | Clasificarlos por edición, trasladar los específicos al plugin y ajustar índices y referencias del roadmap. |
| Media | `ROADMAP.jsonl` y `.foreman/config.json` siguen ignorados. Dos referencias documentales dependen del roadmap. | Definir qué planificación/configuración compartida debe sobrevivir a un clon y separar solo el estado temporal. |
| Media | Las copias del control de nombres y su búsqueda de referencias no están conciliadas con la investigación pública y los worktrees. | Retirar la restricción obsoleta o delimitar su propósito real; verificar todas las copias mantenidas, no solo los tres checkouts principales. |
| Media | El cálculo de anclas de `check-readme-nav.js` elimina Unicode y colapsa espacios; tampoco asigna sufijos a encabezados repetidos. | Corregir el validador y probar anclas entrantes, sin cambiar enlaces válidos para acomodarlos a un algoritmo incorrecto. |

## Referencias ausentes y referencias históricas

El escáner encontró 18 destinos ausentes: dos enlaces activos de CHANGELOG, 15 referencias en investigación/evidencia histórica y un enlace de plantilla que se resuelve correctamente en su destino de instalación. No son 18 defectos equivalentes.

Entre las referencias históricas figuran las antiguas carpetas `plugins/foreman-codex` y `plugins/razor-codex`, componentes retirados de Hush, enlaces relativos de snapshots de README y tres imágenes de un README de terceros. Deben fijarse a su contexto histórico o marcarse como no disponibles; no sustituirse automáticamente por archivos actuales que describen otro comportamiento.

Merecen atención especial los dos artefactos enlazados desde `docs/foreman/validation/NANOTASKS-DOGFOOD.md`: el informe conserva afirmaciones de evidencia cuyos archivos no están en los destinos indicados. Recuperar los originales o declarar su ausencia, sin reconstruir resultados.

Las dos anclas candidatas del escaneo siguen siendo los falsos positivos ya documentados en la auditoría previa. Los 96 candidatos de imports requieren interpretación: gran parte pertenece a código de fixtures dentro de strings. No se contabilizan como 96 fallos de ejecución.

## Problemas anteriores que ya no deben figurar como abiertos

- `/docs/*` dejó de estar ignorado y Razor permite distribuir `docs/SETUP.md`.
- Las instrucciones de release y los agentes de manifiestos/roadmap ya tienen cuerpos reconciliados; desaparecieron las sustituciones mecánicas antiguas de rutas Codex.
- El guard de versiones ya permite la versión del manifiesto Codex y no prohíbe publicar resultados por su ubicación.
- Los probes históricos de Hush tienen carga comprobada, selección explícita de una fuente compatible y ayuda sin iniciar mediciones.

Publicar investigación sigue requiriendo distinguir documentos propios de copias literales ajenas: quedan materiales de terceros por revisar, incluidos `fable-field-guide-unknowns.md` y `voice-reference-readme.md`. Esto no justifica volver a ocultar toda la investigación.

## Orden de cierre

1. Cerrar propiedad documental, enlaces distribuibles y continuidad del roadmap.
2. Conciliar hooks de desarrollo, políticas y copias entre las seis ediciones.
3. Resolver validación de pares candidatos y CI de las portadas.
4. Repetir validación sobre árboles independientes que contengan solo lo distribuible.
5. Preparar integración por repositorio y revisión, y comprobar de nuevo ramas/protecciones remotas antes de publicar.
6. Retirar worktrees y respaldos únicamente después de conservar y verificar todo su contenido necesario.

Flint permanece fuera de la limpieza y sin cambios. Hush/Codex continúa declarado como no instalable; no es un paquete averiado que deba completarse como parte de esta reorganización.

## Alcance de esta revisión

La configuración remota se cita como evidencia de la auditoría anterior; no se volvió a consultar GitHub en esta revisión local. Tampoco se ejecutaron benchmarks pagados, pruebas de activación en clientes reales ni una auditoría exhaustiva de secretos/licencias. Las evidencias actuales están en `.scratch/repo-audit/scan-current.json`, `scan-current.log` y `current-maintenance-tests.log`.
