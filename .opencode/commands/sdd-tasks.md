---
description: Descomponer un plan aprobado en tareas pequeñas y trazables.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Tasks.
Entradas: $ARGUMENTS (<ID>).
Identifica inequívocamente la spec; pregunta si hay ambigüedad. Comprueba spec
y plan aprobados, revisiones coincidentes, autorización, instrucciones y Git.
Crea/revisa únicamente `tasks.md` con dependencias, RF/RNF y Hecho cuando,
preservando evidencia existente. MEMORY solo según el Skill.
No implementes ni crees validation. Si la descomposición requiere decisiones
no cubiertas, pregunta y STOP. Presenta tasks para aprobación explícita y STOP.
No emitas aprobaciones ni ejecutes otros commands; no autoriza implementar.
