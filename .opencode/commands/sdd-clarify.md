---
description: Detectar ambigüedades y aclarar una spec con decisiones explícitas.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Clarification.
Entradas: $ARGUMENTS (<ID> y respuestas del propietario, si existen).
Identifica inequívocamente la spec; ante ID ambiguo pregunta y espera. Comprueba
que existe, su revisión, instrucciones y Git. Lee referencias solo si relevantes.
Modifica únicamente `spec.md`: preguntas y decisiones recibidas, requisitos
aclarados y control de revisión/aprobación. MEMORY solo según el Skill.
No elijas soluciones de producto, emitas aprobaciones ni prepares plan.
STOP ante preguntas o al presentar la revisión para aprobación explícita.
No ejecutes otros commands ni avances automáticamente de fase.
