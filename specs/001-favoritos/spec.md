# SPEC 001 — Favoritos en josicovila.com

**Revisión:** 1  
**Estado:** APPROVED  
**Aprobación:** explícita del propietario  
**Entrega original:** aprobada en conversación antes de su formalización en repositorio.

## 1. Objetivo

Permitir que los visitantes anónimos guarden canciones como favoritas y vuelvan a encontrarlas y reproducirlas desde una lista dedicada, conservando sus selecciones localmente sin alterar el funcionamiento del reproductor.

## 2. Alcance

La funcionalidad comprende:

- Listas de canciones de álbumes.
- Resultados del buscador musical.
- Una nueva vista Favoritos.
- Marcado, desmarcado, representación visual y persistencia local.
- Coherencia del estado de una misma canción entre esas vistas.

No requiere una cuenta ni identificación del visitante.

## 3. Requisitos funcionales

### RF-001 — Marcar y desmarcar

Cada canción presentada en un álbum o resultado de búsqueda deberá disponer de un control que permita añadirla a favoritos y quitarla.

**Criterios:**

- **CA-001.1:** activar el control de una canción no favorita la convierte en favorita.
- **CA-001.2:** activar el control de una canción favorita elimina esa selección.
- **CA-001.3:** ambas acciones se realizan sin recargar la página.

### RF-002 — Estado visual

El control deberá distinguir claramente los estados favorito y no favorito, preferentemente mediante un corazón.

**Criterios:**

- **CA-002.1:** ambos estados son visualmente distinguibles.
- **CA-002.2:** después de una acción completada, el control refleja el nuevo estado sin exigir navegación ni recarga.

### RF-003 — Acceso a Favoritos

Deberá existir un acceso claro e identificable a la vista Favoritos.

**Criterio:**

- **CA-003.1:** el visitante puede localizar y abrir Favoritos desde las vistas de álbumes y resultados de búsqueda.

### RF-004 — Lista de Favoritos

Favoritos deberá mostrar las canciones guardadas y permitir reproducirlas y eliminarlas de favoritos.

**Criterios:**

- **CA-004.1:** todas las canciones marcadas aparecen en Favoritos.
- **CA-004.2:** una misma canción no aparece duplicada por haberse marcado desde distintos contextos.
- **CA-004.3:** el visitante puede iniciar la reproducción de una canción desde Favoritos.
- **CA-004.4:** quitar una canción desde Favoritos elimina su selección y actualiza la lista sin recarga.

### RF-005 — Estado vacío

Cuando no haya canciones favoritas, la vista deberá mostrar un mensaje comprensible.

**Criterios:**

- **CA-005.1:** abrir Favoritos sin selecciones guardadas muestra el estado vacío.
- **CA-005.2:** quitar la última canción muestra ese mismo estado.

### RF-006 — Persistencia local

Las selecciones deberán conservarse localmente en el navegador, sin autenticación.

**Criterios:**

- **CA-006.1:** recargar la página conserva las selecciones.
- **CA-006.2:** cerrar y reabrir el navegador conserva las selecciones mientras su almacenamiento local siga disponible y no haya sido eliminado.
- **CA-006.3:** navegar entre secciones del sitio no elimina las selecciones.
- **CA-006.4:** desmarcar una canción permanece efectivo después de recargar o reabrir el navegador.

### RF-007 — Coherencia e identidad

El estado favorito deberá corresponder a la identidad estable de la canción, no únicamente a su título visible.

**Criterios:**

- **CA-007.1:** marcar o desmarcar una canción se refleja coherentemente en álbumes, buscador y Favoritos.
- **CA-007.2:** dos canciones distintas con el mismo título pueden mantener estados independientes.
- **CA-007.3:** presentar la misma canción en contextos distintos no crea selecciones independientes.

## 4. Requisitos no funcionales

### RNF-001 — Independencia del reproductor

Marcar o desmarcar no deberá interrumpir ni modificar la reproducción actual, su posición o su cola.

**Criterios:**

- **CA-N001.1:** durante la reproducción, marcar o desmarcar no cambia la canción ni reinicia o desplaza su posición.
- **CA-N001.2:** estas acciones no pausan ni reanudan el reproductor.
- **CA-N001.3:** la cola permanece idéntica antes y después de esas acciones, incluida la eliminación desde Favoritos.

La acción explícita de reproducir desde Favoritos queda diferenciada del marcado o desmarcado.

### RNF-002 — Privacidad y ámbito local

Los favoritos no deberán almacenarse en servidor ni sincronizarse entre dispositivos o navegadores. Las selecciones no deberán enviarse a Analytics ni a la telemetría existente.

**Criterios:**

- **CA-N002.1:** añadir, quitar y consultar favoritos no transmite las selecciones a servicios externos ni al servidor.
- **CA-N002.2:** no se generan eventos de Analytics o telemetría que comuniquen esas selecciones.
- **CA-N002.3:** otro navegador o dispositivo no recibe automáticamente los favoritos guardados.

### RNF-003 — Accesibilidad mínima

El control deberá ser operable con teclado y comunicar su finalidad y estado mediante tecnologías de asistencia.

**Criterios:**

- **CA-N003.1:** puede alcanzarse y activarse mediante teclado.
- **CA-N003.2:** muestra un indicador de foco visible.
- **CA-N003.3:** dispone de un nombre accesible que permite identificar la acción y la canción.
- **CA-N003.4:** su estado favorito/no favorito puede conocerse sin depender únicamente del color o del icono.

## 5. Comportamiento y estados

| Situación | Comportamiento esperado |
|---|---|
| Canción no favorita | Control en estado no favorito; permite guardarla. |
| Canción favorita | Control en estado favorito; permite quitarla. |
| Marcado o desmarcado completado | Cambio inmediato y coherente en los contextos afectados. |
| Favoritos con canciones | Lista con reproducción y eliminación disponibles. |
| Favoritos sin canciones | Estado vacío comprensible. |
| Recarga, reapertura o navegación | Se recuperan las selecciones conservadas localmente. |
| Eliminación del almacenamiento por el usuario | No se exige recuperar las selecciones eliminadas. |
| Almacenamiento no disponible | Debe informarse claramente de que no pueden conservarse los favoritos y no aparentar un guardado persistente exitoso. |
| Canción retirada del catálogo | Se omite de la lista visible de Favoritos sin obligación de borrar automáticamente su referencia almacenada. |

## 6. Decisiones de producto resueltas

### P-001 — Almacenamiento no disponible

Si el navegador impide guardar favoritos o falla la persistencia:

- debe informarse claramente al usuario;
- no debe aparentarse que el favorito quedó guardado de forma persistente;
- el estado confirmado debe corresponder únicamente a una escritura exitosa.

### P-002 — Canción retirada del catálogo

Si una canción guardada deja de estar disponible:

- se omitirá de la lista visible de Favoritos;
- no será obligatorio eliminar automáticamente su referencia almacenada;
- Architect podrá proponer una estrategia segura de limpieza si resulta conveniente.

### P-003 — Orden de Favoritos

Favoritos se mostrará en **orden de incorporación**, con las canciones añadidas más recientemente primero.

### P-004 — Reproducción desde Favoritos

Reproducir una canción desde Favoritos deberá seguir el mismo comportamiento de reproducción y cola que las listas musicales actuales.

La prohibición de modificar la cola mediante marcado o desmarcado permanece firme.

### P-005 — Versiones de una canción

Cualquier entrada distinta del catálogo deberá tratarse como favorita independiente.

No se fusionarán automáticamente:

- versiones EN/ES;
- variantes;
- canciones con títulos iguales o similares.

## 7. Fuera de alcance

Quedan fuera de esta SPEC:

- Autenticación.
- Backend o almacenamiento servidor de favoritos.
- Sincronización cloud.
- Sincronización entre dispositivos.
- Sincronización entre navegadores.
- Sincronización reactiva entre pestañas abiertas.
- Playlists personalizadas.
- Compartir favoritos.
- Recomendaciones.
- Estadísticas de favoritos.
- Importación y exportación.
- Ordenación manual.
- Envío de selecciones a Analytics o telemetría.

## 8. Criterio de aceptación de la SPEC

La funcionalidad será aceptable cuando:

- se hayan verificado los criterios de RF-001 a RF-007;
- se hayan verificado los criterios de RNF-001 a RNF-003;
- se respeten las decisiones P-001 a P-005;
- no se introduzca alcance fuera de SPEC;
- el propietario realice la aceptación final de la funcionalidad implementada.

Aprobar esta SPEC no equivale a aprobar un diseño técnico, autorizar implementación ni aceptar una funcionalidad terminada.

## 9. Decisiones diferidas a Architect

Tras la aprobación funcional, corresponderá a Architect proponer y justificar:

- El identificador estable de canción.
- El mecanismo y formato de persistencia local.
- La integración con navegación, listas y reproductor existentes.
- La actualización coherente del estado visual.
- La reutilización de elementos existentes.
- La ubicación técnica de la nueva vista y sus controles.
- Los mecanismos concretos de accesibilidad y comprobación.

Estas decisiones no podrán alterar los requisitos funcionales aprobados.

## 10. Estado de aprobación

**SPEC 001 r1: APPROVED**

Las decisiones P-001 a P-005 fueron resueltas y aprobadas por el propietario antes de la formalización en repositorio.

La aprobación de esta SPEC habilita la fase de diseño técnico, pero no constituye por sí sola autorización de implementación.
