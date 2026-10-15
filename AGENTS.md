# AGENTS.md

## Autoridad
- `docs/constitution.md` es la autoridad normativa superior del proyecto.
- AGENTS.md gobierna la forma de trabajo, límites operativos y autorizaciones; la spec aprobada gobierna los requisitos funcionales.
- Ninguno sustituye al otro: una spec no permite saltarse reglas operativas y AGENTS.md no permite inventar o modificar requisitos.
- Plan/tasks desarrollan la spec aprobada; MEMORY.md aporta contexto y estado, no sustituye requisitos, reglas ni autorizaciones.
- docs-local/ conserva antecedentes sin autoridad vigente; ante contradicciones no resolubles, detente y consulta al propietario.

## Al empezar
- Lee la Constitution, este archivo y MEMORY.md cuando exista, antes de iniciar trabajo relevante.
- Para cambios funcionales significativos, identifica la spec activa y comprueba su aprobación explícita.
- Consulta el plan/tasks, instrucciones locales, documentación y comandos del área afectada según la tarea.
- Ejecuta `git status` y revisa el diff aplicable antes de modificar; identifica los cambios preexistentes.

## Forma de trabajo
- Trabaja únicamente dentro del alcance aprobado y los permisos asignados; no inventes requisitos ni amplíes tareas.
- Solicita aclaración antes de resolver decisiones de producto o incertidumbres relevantes no cubiertas.
- Protege originales y trabajo preexistente; distingue tus cambios y no sobrescribas ni reviertas trabajo ajeno.
- Identifica fuentes de verdad, derivados y artefactos generados antes de editarlos; modifica la fuente autoritativa y evita divergencias entre copias o derivados.
- Al afectar datos, contratos o dependencias, revisa privacidad, compatibilidad, procedencia y obligaciones de licencia.

## Validación
- Ejecuta comprobaciones adecuadas al cambio y al riesgo; usa las instrucciones del área, no comandos supuestos.
- Antes de ejecutar herramientas, identifica si escriben archivos, usan datos reales o afectan sistemas externos.
- Informa qué pruebas ejecutaste, sus resultados y qué quedó sin comprobar; distingue validación automática y humana.
- Al terminar, revisa `git diff`, `git diff --check` y `git status`; informa archivos cambiados, fallos y límites.

## Git y acciones sensibles
- `git add` no requiere autorización adicional dentro de una tarea autorizada: incluye solo cambios del alcance aprobado, no preexistentes ni ajenos por accidente.
- Al preparar cambios, revisa `git diff --cached` cuando corresponda.
- Commit y push requieren autorización humana explícita e independiente; autorizar un commit no autoriza un push.
- Un push que pueda activar auto-deploy debe tratarse también como posible acción sobre producción; su autorización debe contemplar expresamente esos efectos antes de ejecutarlo.
- Antes de publicar en este repositorio público, revisa todos los commits que se enviarán: su contenido debe estar autorizado para hacerse público y no exponer accidentalmente secretos, credenciales, datos personales, material restringido o artefactos locales.
- Producción, despliegues, modificaciones sensibles de datos reales y acciones sensibles o destructivas requieren autorización explícita y alcance identificado; autorizar una no autoriza las siguientes.
- No uses reset, checkout, restore, clean ni equivalentes para descartar trabajo sin autorización específica.

## SDD y memoria
- No implementes cambios funcionales significativos sin spec aprobada explícitamente por el propietario.
- Correcciones menores, mantenimiento y documentación pueden no requerir spec completa, pero sí alcance autorizado.
- Ninguna fase queda aprobada automáticamente; espera cuando el avance requiera aprobación del propietario.
- Ante cambios de requisitos, actualiza primero la spec y obtén aprobación; después ajusta plan/tasks y finalmente código.
- Cuando exista, mantén MEMORY.md compacto: estado actual, decisiones relevantes, aprendizajes/errores que no repetir y próximos pasos; no un diario.
- Actualizar MEMORY.md forma parte del cierre de una fase SDD si cambia materialmente el estado y está dentro del alcance autorizado; propón trasladar reglas permanentes a AGENTS.md y no crees documentos por iniciativa propia.
