---
description: Revisar requisitos y detenerse para nueva aprobación.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Change y mantenimiento.
Entradas: $ARGUMENTS (<ID>, motivo y delta solicitado).
Identifica inequívocamente la spec; pregunta si hay ambigüedad. Comprueba alcance
autorizado, revisiones, aprobaciones, instrucciones y Git; lee solo contexto relevante.
Para requisitos, modifica solo `spec.md` como nueva revisión pendiente; en
plan/tasks/validation existentes solo señala necesidad de reevaluación, sin
rediseñar ni borrar evidencia. MEMORY solo según el Skill.
Para cambios puramente técnicos, informa impacto y espera autorización de revisar
plan/tasks. Pregunta por decisiones abiertas. STOP para aclaración/nueva aprobación;
no la emitas, implementes ni encadenes commands. Ningún avance queda autorizado.
