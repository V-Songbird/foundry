# Auditoría de reconciliación de Foundry — 2026-09-08

**Resultado: la organización local está avanzada, pero todavía no está lista para cerrar la integración y publicarse.** Hay contradicciones entre las reglas antiguas, las nuevas ubicaciones, los releases y las protecciones de GitHub. Varios controles pasan porque comprueban una parte del sistema, no el resultado de un clon independiente.

La revisión fue de diagnóstico. No se corrigió código, no se cambiaron reglas de GitHub y no se crearon commits del proyecto. Solo se generaron este informe y evidencias locales en `.scratch/repo-audit/`.

## Alcance y comprobaciones

- 826 archivos de código, configuración y documentación examinados en la raíz, los tres plugins, sus seis checkouts de plataforma, tres portadas preparadas y Flint.
- 597 referencias locales examinadas. Se excluyeron dependencias, cachés, transcripciones, ejecuciones masivas y variantes congeladas del recorrido general.
- 130 tests de `scripts/git-hooks/` ejecutados: todos pasan.
- Los tres pares de README pasan la comparación local.
- Los catálogos pasan su comprobación de pins locales.
- Dos proyecciones de paquetes con los archivos que Git incluiría pasan el validador de plugins, pero reproducen problemas de documentación descritos abajo.
- GitHub se consultó mediante operaciones de lectura: ramas, protecciones clásicas, rulesets y un ancla renderizada.
- Roadmap: 292 entradas, 0 errores y las mismas 5 advertencias previas. La tarea 301 continúa en `awaiting_acceptance`.

No se ejecutaron benchmarks con modelos ni se revalidó la activación de hooks en clientes reales. Tampoco se realizó una auditoría exhaustiva de secretos o licencias del archivo experimental.

## Hallazgos que deben resolverse antes de integrar

### F01 — P1: la política pública acordada todavía no está aplicada

Evidencia:

- `.gitignore:21` sigue excluyendo todo `/docs/*`.
- `.claude/rules/benchmark-data.md` sigue ordenando no publicar registros.
- `.claude/hooks/assay-benchmark-records-guard.js:27` rechaza operaciones de publicación sobre ciertos resultados.
- `check-reference-names.js` continúa tratando los nombres de referencias como privados fuera de README, incompatible con investigaciones públicas y atribuidas.
- `razor/.gitignore:4` ignora el nuevo `docs/SETUP.md`; todavía permite expresamente el antiguo `CODEX-HANDOFF.md`, que fue retirado.

La proyección versionable de Razor contiene 90 archivos y **no contiene SETUP.md**, aunque README, CONTRIBUTING y SETTINGS lo enlazan. La de Foreman tampoco incorpora la evidencia trasladada a `docs/` de Foundry. El escaneo encontró 265 referencias a destinos ignorados, principalmente dentro del árbol documental central; son referencias, no 265 archivos distintos.

Acción: aplicar conjuntamente las exclusiones, la política de publicación y sus hooks. Incluir las guías y la investigación que deben publicarse, conservar fuera los temporales y datos personales reales y eliminar excepciones de rutas retiradas. Un commit de las eliminaciones actuales sin sus destinos documentales dejaría la migración incompleta en un clon.

### F02 — P1: el flujo de release y dos agentes todavía usan el port mecánico antiguo

Evidencia:

- `.agents/skills/cut-release/SKILL.md:20` se declara experimental y advierte que no se sigan las rutas siguientes; aun así, continúa siendo una skill disponible.
- Sus líneas 24, 41, 59 y 65 usan `.Codex-plugin/marketplace.json`, que no es el catálogo Codex de Foundry.
- Ambas variantes de cut-release ejecutan `git push origin main` dentro del plugin, aunque el código de la edición está en Claude o Codex.
- `.codex/agents/manifest-curator.toml:21–27` conserva URLs `code.Codex.com`, rutas `.Codex-plugin` y reglas del esquema de Claude adaptadas por sustitución de nombres.
- `.codex/agents/roadmap-implementer.toml:18–19` remite a ese catálogo y a `.Codex/rules/public-docs.md`, inexistente.
- `.claude/rules/plugin-layout.md:52` presenta al catálogo Claude como dueño de todas las versiones, mientras `CONTRIBUTING.md:121` define correctamente la versión nativa en `.codex-plugin/plugin.json`.

Acción: reconciliar realmente el release por plataforma y sus revisores. No basta cambiar mayúsculas: cambian el catálogo, la propiedad de la versión, la rama que se publica y el esquema. El release debe integrar el commit correcto y un pin verificable, con una versión efectiva nueva cuando corresponda.

### F03 — P1: los hooks de desarrollo no cubren el nuevo diseño

Pruebas reproducidas sin editar archivos del producto:

| Prueba | Resultado |
| --- | --- |
| Detectar Foreman/Codex para ejecutar tests tras una edición | `null` |
| Detectar Razor/Codex | `null` |
| Detectar Hush/Claude | detectado |
| Enviar una escritura sintética de un manifiesto Codex válido al guard de versiones | `deny` |
| Nudge de manifiesto con Write | emite contexto |
| Nudge con apply_patch | no emite contexto |

`run-tests-on-edit.js:52` exige `.claude-plugin/plugin.json`, precisamente el manifiesto que retiramos de las ediciones Codex. Los matchers siguen limitados a Edit/Write y a la forma antigua de `file_path`. La resolución supone además un plugin inmediatamente debajo de la raíz, sin contemplar los worktrees profundos. La configuración declarada en el repo es de Claude; no hay una adaptación equivalente de estos hooks de proyecto para Codex en esos archivos.

El guard de versiones es real y está registrado en `settings.local.json`: `assay-benchmark-records-guard.js:35` rechaza cualquier `version` en `plugin.json`, incluida la que Codex necesita. El validador oficial sí acepta los manifiestos nativos exportados.

También hay un presupuesto de 25 segundos para la suite completa en `run-tests-on-edit.js:76`, frente a una ejecución reciente de Foreman de 48,9 segundos. Corregir la detección sin revisar ese límite puede producir falsos fallos por tiempo.

Acción: detección de ambas clases de manifiesto, resolución de worktrees, política de versión por plataforma y adaptación de eventos/payloads. Verificar después llamadas positivas y negativas reales en cada cliente. No restaurar manifiestos ajenos para hacer funcionar el hook antiguo.

### F04 — P1: las protecciones de GitHub no coinciden con los workflows nuevos

Los cuatro repositorios tienen un ruleset activo llamado `default`. La respuesta 404 de la API de protección clásica no significa que estén desprotegidos: utilizan rulesets.

| Repositorio | Alcance actual | Check obligatorio |
| --- | --- | --- |
| Foundry | rama por defecto | validate |
| Foreman | rama por defecto | test |
| Hush | rama por defecto | test |
| Razor | rama por defecto | test |

Consecuencias:

- Las futuras ramas Claude/Codex no quedan cubiertas por una regla limitada a la rama por defecto.
- Los checks nuevos de layout, README, portadas y benchmarks no están incorporados como requisitos equivalentes.
- La portada de cuatro archivos elimina el workflow que produce `test`, pero el ruleset de main sigue exigiéndolo.
- Un workflow ejecutado en Foundry no produce automáticamente el check requerido sobre el commit de otro repositorio.

Acción: diseñar y aplicar una migración de protecciones antes de publicar las portadas. Resolver si main admite un workflow mínimo de documentación o si un control externo registrará el estado en el repositorio y commit correctos. Conservar las protecciones útiles; no resolver el problema con un bypass silencioso.

Referencia: [checks obligatorios de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging).

### F05 — P1: la paridad de README puede bloquear mutuamente dos PRs

`.github/PLUGIN_README_PARITY_WORKFLOW.yml:35–36` compara cada candidato contra la punta actual de la otra rama. Reproduje un cambio idéntico del texto común en ambas ediciones:

| Comparación | Resultado |
| --- | --- |
| Par actual | pasa |
| Candidato Claude contra Codex anterior | falla |
| Candidato Codex contra Claude anterior | falla |
| Los dos candidatos entre sí | pasa |

Si este check se vuelve obligatorio, ninguno de los dos PRs puede entrar primero. La recomendación anterior de publicar ambos y repetir el primer check no resuelve por sí sola un flujo protegido de PRs.

Acción: admitir una validación de pares candidatos, o validar contra un contrato común versionado. Mantener una comprobación final del par integrado. La exigencia de coordinación debe permitir actualizar contenido común sin desactivar protecciones.

## Correcciones necesarias para cerrar la reconciliación

### F06 — P2: las copias de hooks divergen y pierden su referencia compartida

Las copias de `check-reference-names.js` en Foreman/Codex, Hush/Claude y Razor/Codex coinciden con la raíz y encuentran la lista. Las de los worktrees Foreman/Claude y Razor/Claude son distintas y `loadBlocklist()` devuelve vacío. Conservan `docs/research` y solo buscan en el directorio actual o su padre.

Copiar el archivo nuevo no basta para worktrees profundos: también hay que resolver correctamente la raíz de Foundry. Los tests actuales de copias miran los tres checkouts principales, no toda la matriz de ramas.

Acción: tras decidir la política pública de F01, unificar los controles que permanezcan y probarlos desde todos los worktrees. Evitar mantener activamente copias de una restricción que la nueva política retire.

### F07 — P2: tres entradas de experimentos de Hush tienen imports rotos

La resolución de módulos devuelve `MODULE_NOT_FOUND`:

- `benchmarks/hush/experiments/output-probes/hush-corpus-probe.js:25`: `../hush/hooks/compress-tool-output.js`.
- `benchmarks/hush/experiments/output-probes/hush-flatten-probe.js:26`: el mismo destino.
- `benchmarks/hush/experiments/output-probes/hush-delta-smoke.js:29`: `./runner/metrics.js`.

Son imports ejecutables, no ejemplos de una fixture. Quedaron pendientes al mover las carpetas. `node --check` solo demostró que la sintaxis era válida; no resolvió sus dependencias.

Acción: corregir su resolución y comprobar la compatibilidad con la revisión de Hush que realmente necesitan. Si solo son históricos, dejarlo explícito y proporcionar su contexto reproducible. Probar la carga sin iniciar sesiones pagadas.

### F08 — P2: hay enlaces válidos en el workspace pero no en el paquete

- `foreman/CODEX.md:160` y `:178` enlazan `../docs/foreman/validation/NANOTASKS-DOGFOOD.md`. Ese destino queda fuera del repositorio del plugin. La proyección independiente de 132 archivos reproduce su ausencia.
- `foreman/CHANGELOG.md:682` y el CHANGELOG Claude equivalente, línea 663, conservan enlaces a `benchmarks/`, ya retirado del plugin.
- Los enlaces de Razor a SETUP.md dependen del archivo ignorado descrito en F01.

Acción: utilizar destinos públicos de Foundry para investigaciones externas, después de publicarlos. Corregir enlaces actuales o fijarlos a una referencia histórica explícita cuando se trate de un CHANGELOG. Validar un clon/proyección independiente, no solo la existencia del destino desde Foundry.

### F09 — P2: los ADR específicos no siguen aún la última distribución acordada

`docs/foreman/adr/` conserva NANOTASKS-RECONCILED.md y SCOPE.md; el ADR propio de Hush permanece en `docs/hush/adr/`. No existen las correspondientes carpetas `docs/adr/` dentro de los plugins.

La investigación extensa ya está centralizada, pero falta aplicar la decisión posterior de que los ADR propios acompañen al plugin. Los ADR generales de Foundry sí deben permanecer en la raíz.

Acción: clasificar cada decisión por alcance y edición, mover las específicas y ajustar enlaces y punteros `doc` del roadmap conservando su historia. No copiar todas las decisiones a ambas ramas sin comprobar su alcance.

### F10 — P2: el validador de anclas no reproduce completamente GitHub

`scripts/git-hooks/check-readme-nav.js:33` elimina caracteres no ASCII y colapsa espacios. Para la cabecera `Archived entries — .foreman/archive.jsonl`, calcula una forma con un solo guion entre entries y foreman; GitHub devuelve `user-content-archived-entries--foremanarchivejsonl`, con dos.

Las dos referencias de roadmap-schema.md que el escaneo preliminar marcó como sospechosas son correctas. Verifiqué el HTML renderizado por la API de GitHub. No hay que modificarlas para satisfacer un algoritmo incorrecto.

Acción: usar un cálculo compatible con GitHub, incluyendo Unicode y títulos duplicados, y ampliar la prueba a referencias entrantes entre archivos. Referencia comprobada: [esquema publicado en la revisión auditada](https://github.com/V-Songbird/foreman/blob/4eb352c2fc3664f80f8d989a81ca37a9dd7d3a5b/roadmap-schema.md#archived-entries--foremanarchivejsonl).

## Integración y decisiones todavía pendientes

### Persistencia del trabajo

Hay cambios sin consolidar en nueve worktrees de plugins y en Foundry. En la raíz hay 17 elementos tracked modificados y 561 archivos versionables todavía untracked; los documentos ignorados no están incluidos en esos 561. Las ramas de portadas `main-front-page` siguen pendientes de integración.

No limpiar `.claude/worktrees` ni `.scratch` antes de conservar los cambios de cada rama y verificar las migraciones. Un commit de Foundry no incorpora los cambios internos de los submódulos ni de sus otros worktrees.

### Publicación y pins

GitHub sigue mostrando únicamente main en Foreman, Hush y Razor. Los catálogos pasan la comprobación contra refs locales, pero sus pins todavía describen commits anteriores al trabajo pendiente. Ese resultado no acredita publicación ni incluye las modificaciones del working tree.

Primero deben integrarse y publicarse las ediciones, después las portadas y los pins de Foundry, con el flujo de CI/protecciones ya resuelto. Revisar las versiones efectivas de los paquetes antes de considerar que una instalación existente recibirá el cambio.

### Portabilidad y conservación

- El prefijo de ramas codex/ choca en Windows con la rama Codex existente. Hace falta documentar y usar un prefijo alternativo en esos subrepos.
- `git worktree list` muestra el checkout primario de los submódulos como su gitdir, aunque `rev-parse --show-toplevel` devuelve la ruta correcta. La localización de archivos debe contrastar ambos datos; no leer README desde `.git/modules/<plugin>`.
- Hay rutas de máquina en herramientas de investigación, por ejemplo el valor por defecto E:/claude-bench-config en `bench-config-dir.js`. Clasificar qué herramientas deben ser portables y qué experimentos requieren un checkout/revisión explícitos.
- El roadmap y `.foreman/` siguen ignorados. Definir qué parte de la continuidad/configuración debe acompañar un clon, sin publicar automáticamente todo el estado temporal.
- Quedan referencias históricas a archivos retirados y a evidencias que ya no estaban disponibles antes de estas mudanzas. En particular, revisar los dos artefactos de nanotareas que el informe antiguo dice conservar. Recuperarlos o declarar su ausencia; no reconstruir mediciones a partir de memoria.
- Al abrir research, revisar atribuciones y las copias marcadas como texto ajeno. Esta auditoría no da por verificadas sus condiciones de publicación.

### Advertencias del roadmap

Persisten las cinco ya conocidas: source no normalizado en 082, ausencia de evidencia histórica en 085 y 267, similitud entre 070/072 y fableEnabled desconocido para el lector Codex. No deduplicar ni inventar evidencia para obtener un informe sin advertencias. La tarea 301 permanece pendiente de aceptación, independiente de esta auditoría.

## Orden recomendado de cierre

1. Conservar el inventario y los respaldos; mantener intactos los worktrees con cambios.
2. Aplicar la política pública y la ubicación definitiva de documentos/ADRs, incluidas sus exclusiones.
3. Reconciliar release, agentes de manifiestos y hooks de desarrollo por plataforma.
4. Corregir enlaces, imports y resolución de worktrees; comprobar todas las copias.
5. Resolver los pares de PRs y la transición de checks obligatorios de GitHub.
6. Validar seis ediciones y tres portadas desde árboles independientes con solo archivos distribuibles; ejecutar los controles offline pertinentes.
7. Integrar cada rama, publicar las ediciones, comprobar sus destinos, integrar las portadas y actualizar pins/versiones de Foundry.
8. Confirmar los checks efectivos y limpiar ramas/worktrees solo después de preservar todo el trabajo.

## Falsos positivos y límites del escaneo

De los 18 destinos ausentes detectados, 15 están en investigación o copias históricas, dos son los enlaces del CHANGELOG y uno pertenece a una plantilla cuyo enlace se resuelve al copiarla al plugin. Este último no requiere corregir la plantilla hacia su propia carpeta.

Los 99 candidatos de require() no resueltos incluyen mayormente código de fixtures generado dentro de strings. No se consideran 99 defectos. Se confirmaron específicamente los tres imports de F07. Las dos anclas preliminares se descartaron como errores del documento y dieron lugar a F10.

Hush/Codex sigue intencionalmente sin paquete instalable; no se contó como una avería de layout. Flint quedó fuera de la conversión de main y permanece sin cambios.

Evidencias locales: `.scratch/repo-audit/scan.json`, `probes.json`, `github-rules.json`, `root-tests.log`, `roadmap-doctor.json` y las proyecciones bajo `export/`.
