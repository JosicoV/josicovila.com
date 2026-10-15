---
description: Consultar el estado de una operación SDD en solo lectura.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Status, en SOLO LECTURA.
Entradas: $ARGUMENTS (<ID>, preferentemente).
Identifica inequívocamente la spec; sin ID solo infiere desde contexto inequívoco.
Si hay ambigüedad pregunta; si no existen specs informa la ausencia y STOP.
Lee sus artefactos existentes, instrucciones pertinentes y Git; no cargues todas
las specs históricas. Informa revisiones, aprobaciones, fase, bloqueos y siguiente gate.
No modifiques archivos ni MEMORY, crees artefactos, emitas aprobaciones o ejecutes
otros commands. STOP tras el informe; consultar estado no autoriza avanzar.
