---
description: Validar RF/RNF y criterios sin confundir tests con aceptación.
---

Carga el Skill `sdd` y aplica su contexto mínimo y fase Validation.
Entradas: $ARGUMENTS (<ID> y entorno/alcance de comprobaciones autorizado).
Identifica inequívocamente la spec; pregunta si hay ambigüedad. Comprueba bases
aprobadas y coincidentes, tareas terminadas, instrucciones, Git y efectos de tests.
Lee sus artefactos y evidencia pertinente. Crea/revisa solo `validation.md` y
resultados de pruebas autorizados; MEMORY solo según el Skill. No corrijas código
ni cambies tasks. Comprueba RF/RNF/criterios y distingue FAIL de NO COMPROBADO.
Tests verdes no equivalen a aceptación; una prueba obligatoria no ejecutada
impide completitud. Presenta dictamen y STOP para aceptación explícita del
propietario; no la emitas ni ejecutes otros commands o fases.
