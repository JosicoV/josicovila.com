---
description: Implementar una sola tarea autorizada y detenerse.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Implementation.
Entradas: $ARGUMENTS (<ID> <T-ID>); identifica spec y UNA tarea inequívocamente.
Comprueba spec/plan/tasks aprobados y vigentes, bases coincidentes, dependencias,
autorización de esa tarea, instrucciones, Git y efectos de las comprobaciones.
Modifica solo fuentes/tests/derivados autorizados de la tarea y su evidencia/estado
en `tasks.md`; MEMORY solo según el Skill. No cambies spec/plan/validation.
Aplica test → RED → implementación mínima → GREEN → regresión → evidencia
→ marcar tarea → STOP, con las excepciones justificadas del Skill.
Ante bloqueo pregunta y STOP. No emitas aprobaciones, amplíes alcance, corrijas
pendientes ajenos ni ejecutes otra tarea/command sin nueva invocación/autorización.
