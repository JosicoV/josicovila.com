---
name: sdd
description: Procedimiento SDD para especificar, aclarar, planificar, descomponer, implementar una tarea y validar cambios con gates humanos explícitos.
slash: false
---

# Harness SDD

## Autoridad y contexto mínimo

Este Skill aporta procedimiento, no requisitos ni autorizaciones. Los commands
son entradas explícitas del usuario y no barreras técnicas de permisos.

Las rutas del proyecto mencionadas aquí son relativas a la raíz del repositorio,
no al directorio de este Skill. Identifica esa raíz antes de resolverlas.

Carga este Skill al ejecutar un command SDD o trabajar explícitamente sobre sus
artefactos. Lee `docs/constitution.md`, `AGENTS.md` y `MEMORY.md`; después solo
los artefactos de la operación y las instrucciones del área afectada. Consulta
código, contratos, otras specs y documentación únicamente cuando sean relevantes.
No cargues todas las specs históricas ni todo `docs-local/` como contexto inicial.

- Constitution: autoridad normativa superior; reutilizar, no recrear ni enmendar.
- AGENTS: reglas operativas y autorizaciones; una spec no las exceptúa.
- Spec aprobada: requisitos funcionales; plan/tasks los desarrollan.
- MEMORY: estado y contexto, nunca aprobación ni lista de tareas autorizadas.
- Documentación de área: instrucciones y contratos aplicables, subordinados a
  las reglas superiores. Ante contradicción relevante, pregunta y STOP.
- `docs-local/`: antecedentes sin autoridad vigente; no convertir instrucciones
  históricas en encargos actuales ni reconstruir specs retrospectivas.

Antes de escribir, revisa `git status` y el diff pertinente; protege originales,
derivados y cambios preexistentes. Antes de ejecutar herramientas identifica
escrituras, datos reales y efectos externos. Usa comandos documentados del área.
No corrijas asuntos pendientes por iniciativa propia. No otorgues permisos de
Git, publicación, producción o acciones destructivas: aplica AGENTS y los límites
del encargo. Si el usuario pide solo lectura, no escribas ni siquiera MEMORY.

## Identidad, estructura y tamaño

Cada capacidad/cambio funcional coherente usa `specs/NNN-nombre/` con:

- `spec.md`: WHAT / WHY, sin arquitectura, stack, archivos ni implementación.
- `plan.md`: HOW, sin implementación completa.
- `tasks.md`: descomposición, ejecución y evidencia por tarea.
- `validation.md`: informe final independiente y aceptación humana.

Crea cada artefacto cuando corresponda a la fase expresamente solicitada; no
materialices anticipadamente documentos vacíos. No crees `.gitkeep`, specs
ficticias ni documentos adicionales sin autorización.

Numera globalmente desde 001: mayor ID existente más uno, sin reutilizar ni
renumerar IDs. Usa nombres kebab-case. Para una spec nueva, confirma propósito
y nombre; si no existe `specs/`, créalo solo al autorizar una primera spec real.

Pueden coexistir specs en diferentes fases. Cada operación debe identificar
inequívocamente su spec: preferir `/sdd-<fase> <ID>` y
`/sdd-implement <ID> <T-ID>`. Si falta ID, infiere únicamente desde contexto
vigente inequívoco; ante ambigüedad pregunta y STOP. Nunca elijas por iniciativa
propia. Aprobada, en ejecución y seleccionada para una operación son conceptos
distintos; no existe una única spec activa global.

Una spec no equivale a una función de código. Más de aproximadamente diez tareas
es una señal para evaluar división, no una regla automática. Propón dividir por
resultados funcionales independientes y aceptables por separado; el propietario
decide. Las tareas buscan 20–30 minutos cuando sea razonable, sin cuotas rígidas.

## Revisiones, aprobaciones y gates

Usa control compacto en cada artefacto:

- Revisión: N
- Estado: borrador / pendiente de aprobación / aprobado
- Aprobación: pendiente

Solo tras aprobación explícita del propietario, transcribe fecha y alcance,
vinculados a la revisión, por ejemplo:
`Aprobación: AAAA-MM-DD — spec rN aprobada; autorizado preparar plan`.
No repitas un campo Propietario. El agente puede transcribir una aprobación
explícita recibida, nunca emitirla, inferirla de tests verdes o aprobar una fase.
Ante una aprobación ambigua pregunta y STOP. Aprobar contenido y autorizar la
siguiente operación son actos distintos, aunque puedan constar en un mensaje.

Incrementa revisión ante cambios sustantivos del contenido aprobado. Registra
brevemente qué cambió y qué aprobación quedó sustituida; la nueva revisión queda
con aprobación pendiente. No arrastres aprobaciones a contenido nuevo. El plan
referencia la revisión de spec; tasks referencia spec y plan; validation identifica
las revisiones y el estado evaluados. Progreso/evidencia por tarea no obliga a
reaprobar una lista intacta; cambiar alcance o dependencias sí exige revisión.
Resultados nuevos de validación no heredan una aceptación final anterior.

Ciclo obligatorio, sin encadenamiento automático:

1. Constitution vigente → Specification: redactar borrador WHAT / WHY; STOP.
2. Clarification: detectar y preguntar; esperar respuestas; actualizar solo
   decisiones explícitas; STOP para aprobación de la spec aclarada.
3. Planning: exige spec aprobada y encargo de plan; STOP para aprobación del plan.
4. Tasks: exige spec y plan aprobados y vigentes; STOP para aprobación de tasks.
5. Implementation: exige los tres aprobados, bases coincidentes, dependencias
   satisfechas y autorización de UNA tarea; STOP al terminar o bloquearse.
6. Siguiente tarea: únicamente nueva invocación/autorización, nunca por continuidad.
7. Validation: exige tareas terminadas y alcance de comprobaciones autorizado;
   emitir dictamen y STOP para aceptación humana final.
8. Mantenimiento/cambio: requisitos nuevos vuelven primero a spec, aclaración
   cuando proceda y nueva aprobación; luego reevaluar plan/tasks antes de código.

Ninguna fase queda aprobada automáticamente. Terminar una fase NO autoriza la
siguiente. Un agente no ejecuta otro command por iniciativa propia. Al cerrar,
informa artefactos, resultados, límites y próxima parada; revisa diff,
`git diff --check` y status sin mezclar cambios ajenos.

## Comportamiento por fase y escrituras permitidas

Las escrituras siguientes solo aplican dentro del encargo autorizado. Ninguna
fase puede modificar Constitution, AGENTS, el Skill o commands por el mero hecho
de invocarse. MEMORY puede actualizarse mínimamente al cambiar materialmente el
estado y estar dentro del alcance autorizado de cierre; status nunca la escribe.
No conviertas MEMORY en diario, procedimiento ni índice exhaustivo de specs.

### Specification

Entradas: necesidad, usuarios, objetivo, límites y nombre/ID de nueva spec.
Crear solo `spec.md`. Expresa WHAT / WHY y criterios observables. Marca decisiones
no resueltas con `[NECESITA ACLARACIÓN]`; no inventes requisitos ni aprobación.
No sobrescribas una spec existente: los cambios de requisitos van por Change.

### Clarification

Lee la spec y referencias relevantes. Busca ambigüedades, contradicciones,
edge cases, decisiones abiertas, conflictos normativos y requisitos no
verificables. Referencia RF/RNF/pregunta e impacto. Puede presentar alternativas
y consecuencias, pero nunca escoger silenciosamente soluciones de producto.
Pregunta al propietario y espera. Escribe únicamente preguntas, respuestas
explícitas y requisitos aclarados en `spec.md`. Tras resolver bloqueos, presenta
la revisión para aprobación y STOP; no prepares plan.

### Planning

Lee spec aprobada, fuentes de verdad, contratos, código e instrucciones relevantes.
Escribe solo `plan.md`. Diseña responsabilidades, contratos, lógica, UI, datos,
compatibilidad y tests con trazabilidad RF/RNF. Justifica nuevas dependencias por
finalidad, mantenibilidad, coste, seguridad y licencia. Si falta una decisión de
producto, pregunta y STOP: no la resuelvas técnicamente para eludir la spec.

### Tasks

Lee spec y plan aprobados y verifica sus revisiones. Escribe solo `tasks.md`:
tareas pequeñas con dependencias, RF/RNF, criterios y Hecho cuando. Las tareas
preparatorias referencian los requisitos que habilitan, sin inventar RF.
No implementes ni crees el informe final. Presenta tasks para aprobación y STOP.

### Implementation

Lee spec/plan/tasks aprobados de la operación, evidencia pertinente e instrucciones
del área. Verifica T-ID, dependencias y que el alcance solicitado sea una tarea.
Escribe únicamente fuentes/tests/derivados autorizados de esa tarea y su estado
y evidencia en `tasks.md`; no modifiques requisitos, plan ni validación final.

Cuando permita tests:
test → RED por ausencia del comportamiento → implementación mínima → GREEN
→ regresión pertinente → evidencia → marcar tarea → STOP.

Un error de entorno no demuestra RED. Si el test ya pasa, no fabriques RED:
investiga la cobertura existente, informa y aclara antes de cambios innecesarios.
Si RED/GREEN no aplica, justifica y usa verificación adecuada. No marques hecha
una tarea cuyo criterio no se ha cumplido. Ante bloqueo registra evidencia y STOP.

No refactorices fuera de alcance, corrijas pendientes, añadas funcionalidad,
amplíes requisitos ni ejecutes la siguiente tarea. En JV Studio respeta fuentes
frente a build generado y ayuda bilingüe; en el buscador identifica entradas
funcionales, contratos y recursos locales. Ejecuta builds solo tras revisar sus
escrituras y permisos; no edites manualmente derivados para evitar la fuente.

### Validation

Lee spec/plan/tasks vigentes y validation previo si existe. Verifica tareas hechas
y revisiones coincidentes. Escribe solo `validation.md` y resultados de pruebas
necesarios y autorizados; no cambies código ni marques tareas durante esta fase.
Antes de ejecutar pruebas verifica entorno, recursos y efectos. Solicita permiso
si exceden el alcance; no accedas a producción ni datos sensibles implícitamente.

Comprueba RF por RF y cada criterio, RNF y edge cases, integración/regresión,
UI y revisión humana aplicables. Separa pruebas realizadas, resultados históricos
y pruebas propuestas; PASS, FAIL y NO COMPROBADO no son intercambiables.
Tests verdes NO equivalen a aceptación funcional. Una prueba obligatoria no
ejecutada impide declarar completitud. No presentes como probado algo no probado.
No corrijas fallos durante Validation; informa y STOP para una tarea autorizada.

El cierre requiere requisitos y criterios satisfechos, RNF pertinentes comprobados,
tareas hechas, ausencia de fallos bloqueantes, validación humana necesaria y
aceptación explícita del propietario de la base evaluada. El agente emite dictamen
técnico, nunca aceptación. No cierres automáticamente tras emitir el informe.

### Change y mantenimiento

Entradas: ID, motivo y delta solicitado. Lee artefactos de esa spec y código
relevante para analizar impacto. Para cambiar requisitos, escribe la revisión
propuesta en `spec.md`, preservando un resumen del alcance anterior y cambios.
Deja aprobación pendiente. En plan/tasks/validation existentes solo señala que
dependen de una base anterior y requieren reevaluación; no los rediseñes ni borres
evidencia histórica. Pregunta ante decisiones no cubiertas y STOP para aprobación.

Después de nueva aprobación, plan/tasks se reevaluarán únicamente mediante
operaciones explícitas posteriores; implementar exige volver a cumplir los gates.
Si el cambio es solo técnico, sin variar WHAT / WHY, no inventes requisitos:
presenta el impacto y STOP para autorizar revisión de plan/tasks. Correcciones
menores o documentación pueden no necesitar spec completa según AGENTS, pero
siempre requieren alcance autorizado y validación; no generes specs vacías.

### Status

Solo lectura de la spec seleccionada y sus artefactos existentes, más contexto
mínimo. Informa revisiones, aprobaciones, fase, dependencias, bloqueos, evidencia
y siguiente gate; distingue falta de evidencia de fallo demostrado. No crea
documentos, actualiza MEMORY, selecciona otra spec ni avanza fases. Si no hay
ninguna spec y no se indicó ID, informa esa ausencia y STOP.

## Plantillas

Son plantillas reutilizables, no specs reales ni autorizaciones. Sustituye los
marcadores únicamente en la fase autorizada. Mantén IDs RF/RNF/CA/T estables;
no renumeres silenciosamente ni reutilices IDs retirados. En secciones opcionales
usa No aplica con justificación; no inventes contenidos para rellenarlas.

### spec.md — WHAT / WHY

```markdown
# NNN — Nombre de la capacidad

## Control
- Revisión: 1
- Estado: borrador
- Aprobación: pendiente

## Contexto y objetivo
Problema, valor esperado y resultado deseado; no implementación.

## Usuarios afectados
Actores y situaciones relevantes.

## Historias / casos de uso
### CU-001 — Nombre (cuando corresponda)
- Actor:
- Situación y acción:
- Resultado esperado:

## Requisitos funcionales
### RF-001 — Nombre
- Requisito:
- Justificación:
- Casos de uso relacionados:
- Criterios de aceptación verificables:
  - CA-001.1: condición y resultado observable.

## Requisitos no funcionales
### RNF-001 — Nombre
- Condición exigida y ámbito:
- Criterio verificable:

## Edge cases
- EC-001: situación, comportamiento esperado y RF/RNF relacionado.

## Fuera de alcance
Exclusiones explícitas.

## Criterio de finalización
Condiciones funcionales y de aceptación necesarias para cerrar.

## Preguntas abiertas
- P-001 — [NECESITA ACLARACIÓN]
  - Pregunta e impacto en RF/RNF:
  - Respuesta del propietario: pendiente

## Decisiones funcionales aclaradas
Respuestas explícitas, fecha y requisitos afectados.

## Cambios relevantes
Resumen compacto de revisiones sustantivas y aprobaciones sustituidas.
```

No incluir arquitectura, stack, nombres de archivos ni detalles de implementación.
Usa EARS cuando aclare: El sistema deberá…; Cuando X, deberá Y; Mientras X,
deberá Y; Si ocurre X, deberá Y; Donde esté habilitada X, deberá Y. No lo fuerces.
Los criterios pueden usar Dado/Cuando/Entonces; evita términos sin medida o
condición observable. Plataformas objetivo y compatibilidad observable sí son
requisitos; elegir tecnología pertenece al plan.

### plan.md — HOW

```markdown
# Plan — NNN Nombre

## Control
- Revisión: 1
- Estado: borrador
- Aprobación: pendiente
- Basado en spec: rN

## Alcance técnico
RF/RNF desarrollados y límites de la spec.

## Arquitectura afectada y situación actual
Fuentes de verdad, derivados y restricciones existentes.

## Componentes, archivos y responsabilidades
| Componente/archivo | Responsabilidad | Cambio previsto | RF/RNF |
|---|---|---|---|

## Contratos e interfaces
Entradas, salidas, errores, límites y validación.

## Lógica y flujo
Funciones de lógica pura cuando proceda; pseudocódigo, no código completo.

## Estrategia UI
Estados, interacción, errores, accesibilidad e idiomas.

## Estrategia de datos
Origen, finalidad, persistencia, privacidad, retención, procedencia y licencias.

## Compatibilidad y migración
Formatos, consumidores, transición y recuperación cuando corresponda.

## Decisiones técnicas justificadas
| Decisión | Justificación | Alternativas rechazadas y motivo |
|---|---|---|

## Estrategia de tests
Unitarios, integración, regresión, UI y validación humana.
Comandos documentados del área, recursos necesarios y efectos de ejecución.

## Trazabilidad
| RF/RNF | Solución propuesta | Criterio | Verificación prevista |
|---|---|---|---|

## Riesgos y bloqueos
Incertidumbres y decisiones pendientes.

## Cambios relevantes
Revisiones sustantivas, bases sustituidas e impacto.
```

### tasks.md — descomposición y evidencia por tarea

```markdown
# Tasks — NNN Nombre

## Control
- Revisión: 1
- Estado: borrador
- Aprobación: pendiente
- Basado en spec: rN
- Basado en plan: rM
- Ejecución: no iniciada / en curso / pausada / pendiente de aceptación / cerrada

## Orden y dependencias
Orden permitido; no autoriza ejecutar todas las tareas.

## T-001 — Resultado pequeño y concreto
- Estado: pendiente / en curso / bloqueada / hecha
- RF/RNF:
- Criterios de aceptación relacionados:
- Dependencias:
- Alcance:
- Fuera de esta tarea:
- Estimación orientativa: 20–30 minutos cuando resulte razonable
- Verificación prevista:
- Hecho cuando:
  - Resultado observable y comprobaciones necesarias superadas.
- Evidencia al cerrar:
  - Test/comprobación, entorno y resultado:
  - RED/GREEN o justificación de no aplicación:
  - Regresión pertinente:
  - Archivos afectados:
  - Límites o bloqueos:

## Cambios relevantes
Cambios de descomposición/dependencias y bases sustituidas.
```

Repite la sección de tarea solo según el plan aprobado. El informe final no vive
en tasks: usa `validation.md`. Una tarea hecha no implica aceptación de la spec.

### validation.md — evaluación final independiente

```markdown
# Validation — NNN Nombre

## Control
- Revisión: 1
- Estado: borrador
- Aprobación: pendiente

## Base evaluada
- Spec: rN
- Plan: rM
- Tasks: rK
- Estado Git evaluado: commit, cambios pendientes relevantes y límites
- Entorno, versiones y recursos disponibles:

## Matriz funcional RF por RF
| RF | Criterio de aceptación | Evidencia | Resultado | Límites |
|---|---|---|---|---|

## Requisitos no funcionales
| RNF | Criterio | Evidencia | Resultado | Límites |
|---|---|---|---|---|

## Edge cases
| EC | RF/RNF | Comprobación y evidencia | Resultado | Límites |
|---|---|---|---|---|

## Pruebas ejecutadas
| Comando/comprobación | Entorno | Resultado | Evidencia |
|---|---|---|---|

## Integración y regresión
Resultados, evidencia y límites.

## UI
Estados/interacciones comprobados; No aplica justificado cuando corresponda.

## Validación humana
Qué revisó el propietario, resultado explícito y qué sigue pendiente.

## Fallos
Requisito/criterio afectado, evidencia e impacto.

## Aspectos no comprobados
Pruebas pendientes/bloqueadas, recursos ausentes y motivos.

## Dictamen técnico y completitud
- Cumple / no cumple / evidencia insuficiente:
- Condiciones de finalización satisfechas:
- Condiciones pendientes:
- Pruebas obligatorias no ejecutadas:

## Aceptación explícita del propietario
Pendiente. Tras recibirla, transcribir fecha, revisión del informe y base aceptada
en Aprobación; no atribuirse aceptación ni autorización de publicar/desplegar.

## Cambios relevantes
Cambios de base/evidencia y aceptaciones anteriores sustituidas.
```
