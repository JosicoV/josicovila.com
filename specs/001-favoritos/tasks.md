# Tasks — SPEC 001: Favoritos en josicovila.com

## Control

**Spec:** r1 — APPROVED  
**Diseño técnico:** r1 — APPROVED  
**Tasks:** r1 — APPROVED  
**Ejecución:** no iniciada

Los IDs siguientes identifican tareas aprobadas. La aprobación de este artefacto no autoriza ejecutarlas todas en bloque.

Cada tarea requiere autorización individual.

---

## T-001 — Identidad estable del catálogo

**Dependencias:** ninguna.
**Estado:** bloqueada; implementación no iniciada.

### Alcance

Asignar un `favoriteId` explícito, único e inmutable a cada entrada del catálogo.

Propagarlo al:

- HTML de álbumes;
- contrato de búsqueda literal;
- contrato de búsqueda semántica.

### Archivos previstos

- catálogo PHP;
- `app/index.php`;
- ambos endpoints de búsqueda;
- tests pertinentes.

### Hecho cuando

- Todas las entradas tienen IDs únicos y no vacíos.
- Distintas entradas mantienen IDs independientes.
- Álbumes y ambos tipos de búsqueda entregan la misma identidad para una entrada.
- Cambiar título, ruta o posición, conservando la entrada, no modifica su ID.
- Los contratos existentes de reproducción y búsqueda permanecen compatibles.

### Verificación

- pruebas de unicidad;
- pruebas de propagación;
- pruebas de estabilidad;
- regresión del consumo del catálogo.

### Evidencia y bloqueo

- El propietario reconfirmó explícitamente el gate para ejecutar exclusivamente T-001 y delegarla a Implementer.
- Implementer intentó `git --no-optional-locks status --short --branch --untracked-files=all`; la herramienta respondió `Permission denied: shell` y el comando no se ejecutó.
- Implementer se detuvo sin escribir archivos. No se ejecutaron pruebas ni se inició RED/GREEN; la denegación no constituye RED.
- Coordinator comprobó que el estado Git posterior a la delegación conserva las mismas entradas preexistentes.
- Único archivo actualizado por Coordinator: este `tasks.md`, para registrar el resultado; sin cambios de alcance, dependencias o criterios.
- Pendiente resolver la discrepancia de permisos de Implementer para las comprobaciones Git autorizadas; después deberán confirmarse infraestructura y comandos concretos de pruebas.
- Ningún criterio de T-001 se declara verificado. T-002 no autorizada ni iniciada.

### Reanudación autorizada — resultado bloqueado

- El propietario autorizó reanudar exclusivamente T-001 tras informar de la corrección manual del matching Git del perfil Implementer. Coordinator comprobó spec, plan y tasks r1 aprobados y la ausencia de dependencias; no se modifican esas bases ni se autoriza T-002.
- El bloqueo Git anterior queda resuelto: Implementer ejecutó `git --no-optional-locks status --short --branch --untracked-files=all` y las comprobaciones de diff autorizadas.
- Resultado: **T-001_BLOCKED**; implementación no iniciada. Implementer no escribió archivos ni ejecutó pruebas; RED/GREEN no iniciado, sin confundir el bloqueo con RED.
- Fuentes concretas identificadas: `app/includes/musica.estructura-datos.php`, `app/index.php`, `app/includes/ajax.searchSongs.php` y `app/includes/ajax.semanticSearch.php`. No quedó confirmada la ubicación de los tests.
- Infraestructura inspeccionada: pytest configurado en `services/music-intelligence-v2/pyproject.toml`; `PhpArrayParser` en `src/music_intelligence_v2/catalog.py` interpreta arrays, pero no ejecuta el HTML ni los endpoints PHP. Implementer identificó la necesidad de ejecución PHP aislada para comprobar la propagación efectiva y los contratos.
- Nuevo bloqueo: PHP no está contemplado en el perfil Implementer. No se intentó ejecutarlo, envolverlo ni sustituirlo mediante otro runner. Los comandos exactos y sus efectos no quedaron definidos: faltan ubicación/contenido de tests, ejecutable PHP y aislamiento del endpoint semántico, que contiene una petición cURL al servicio de búsqueda.
- Comprobaciones declaradas por Implementer: status inicial/final coincidentes; `git --no-pager --no-optional-locks diff --no-ext-diff --no-textconv` con solo cambios preexistentes; la variante `--cached` vacía; la variante `--check` sin errores, con avisos LF/CRLF preexistentes.
- Coordinator comprobó status posterior idéntico a su baseline y diff vacío de las cuatro fuentes previstas. No hay cambios de producto atribuibles a esta reanudación. Única escritura de cierre: este `tasks.md`; los cambios preexistentes se conservan.
- Aspectos no comprobados: todos los criterios funcionales de T-001, propagación ejecutada, estabilidad y regresión. Ninguna prueba ejecutada ni aceptación declarada.
- Decisión humana pendiente: concretar una configuración/autorización posterior específica para pruebas PHP locales aisladas y reconfirmar la reanudación. Coordinator no modifica perfiles ni amplía permisos. STOP; T-002 no iniciada.

### Decisión del propietario — permisos PHP mínimos pendientes

- El propietario acepta el diagnóstico de infraestructura y mantiene exclusivamente T-001 autorizada; T-002 no iniciada. No se implementará todavía T-001.
- Autoriza preparar una ampliación del perfil Implementer con efecto ASK exclusivamente para estas cuatro cadenas:
  - `php -n -l app/includes/musica.estructura-datos.php`
  - `php -n -l app/index.php`
  - `php -n -l app/includes/ajax.searchSongs.php`
  - `php -n -l app/includes/ajax.semanticSearch.php`
- No autoriza `php *` ni un runner PHP genérico. El pytest focalizado ya está cubierto por `pytest *` con efecto ask y no requiere ampliación adicional. Coordinator no modifica perfiles; el parche de permisos queda pendiente de aplicación fuera de este encargo.
- Implementer deberá diseñar un test PHP autónomo y aislado de T-001 que compruebe existencia de `favoriteId`, valores no vacíos, unicidad global, independencia entre entradas, propagación a contratos comprobables aisladamente y estabilidad contractual de IDs.
- El test no realizará llamadas reales de red, no dependerá de servicios externos ni modificará producción; no escribirá fuera de artefactos temporales o del mecanismo normal del runner, si alguno. Composer/PHPUnit no se requieren salvo necesidad demostrada.
- Antes de la primera ejecución: definir ruta definitiva, mostrar contenido o diseño suficiente para revisar aislamiento y efectos, proponer cadena exacta y detenerse si no está contemplada en el perfil. Solo posteriormente podrá añadirse, si procede, una excepción ASK exacta para ese test; no queda autorizada aquí.
- RED previsto: el test funcional falla por ausencia de IDs o propagación, no por problemas de entorno. GREEN previsto: la misma prueba pasa después de implementar únicamente T-001. Los cuatro lints son comprobaciones GREEN complementarias, no sustituyen el test funcional.
- Gate pendiente: el perfil debe disponer de los cuatro lints y deben estar definidos el test funcional y su comando exacto antes de implementar. Sin ejecución de pruebas ni cambios de producto en este registro; bases r1 y criterios de la tarea intactos.
- Estado de esta decisión: **T-001_AWAITING_PHP_PERMISSION_PATCH**. STOP.

---

## T-002 — Estado y persistencia local

**Dependencias:** T-001.

### Alcance

Crear `favorites.js` con:

- lectura validada;
- consulta de pertenencia;
- incorporación;
- eliminación.

Sin:

- DOM de listas;
- reproducción;
- red.

### Hecho cuando

- Utiliza una única estructura versionada.
- No duplica metadatos.
- Conserva orden reciente primero.
- Evita duplicados.
- Solo confirma cambios después de una escritura correcta.
- Los fallos de lectura/escritura producen resultados de error identificables.
- Datos corruptos producen error identificable.
- Versiones desconocidas producen error identificable.
- No sobrescribe silenciosamente datos inválidos.
- No modifica otras claves.
- No accede al reproductor.
- No transmite información.

### Verificación

- pruebas del modelo;
- orden;
- persistencia;
- errores simulados.

---

## T-003 — Controles accesibles en álbumes

**Dependencias:** T-001 y T-002.

### Alcance

Integrar el módulo y añadir controles de favorito en las listas de álbumes, con mensajes y estilos mínimos.

### Archivos previstos

- `app/index.php`;
- `app/js/js.js`;
- `app/js/i18n.js`;
- `app/css/hero.css`.

### Hecho cuando

- Añadir y quitar actualiza el estado sin recarga.
- El control tiene nombre accesible.
- El estado favorito/no favorito queda comunicado.
- Existe foco visible.
- Funciona mediante teclado.
- El handler de reproducción excluye explícitamente el control.
- Los errores de almacenamiento se comunican sin confirmación falsa.
- La inicialización no duplica listeners.

### Verificación

- interacción;
- accesibilidad;
- ausencia de llamadas de reproducción al marcar/desmarcar.

---

## T-004 — Estado coherente en listas dinámicas

**Dependencias:** T-003.

### Alcance

Incorporar controles a:

- resultados de búsqueda;
- listas dinámicas del hero.

Sincronizar todas las representaciones mediante el estado común.

### Archivos previstos

- `app/js/js.js`;
- ajustes específicos de estilos o traducciones cuando proceda.

### Hecho cuando

- Los resultados literales muestran el estado correcto.
- Los resultados semánticos muestran el estado correcto.
- Una lista recién renderizada refleja favoritos existentes.
- Cambiar una selección actualiza sus demás representaciones.
- Los renderizados repetidos no multiplican activaciones.
- Los controles no disparan reproducción.
- Los controles no reemplazan la cola.

### Verificación

- búsquedas sucesivas;
- renderizados sucesivos;
- cambios entre contextos;
- regresión de eventos.

---

## T-005 — Vista Favoritos y navegación interna

**Dependencias:** T-004.

### Alcance

Añadir:

- acceso visible;
- sección independiente;
- reutilización de elementos de presentación donde corresponda.

La reproducción se habilita en T-007.

### Archivos previstos

- `app/index.php`;
- `app/js/js.js`;
- `app/js/i18n.js`;
- `app/css/hero.css`.

### Hecho cuando

- Abrir Favoritos no reemplaza resultados.
- Abrir Favoritos no carga audio.
- La lista muestra entradas disponibles en orden reciente primero.
- Referencias retiradas se omiten sin borrado automático.
- El vacío normal y la imposibilidad de consultar almacenamiento no se confunden.
- Se puede quitar una entrada desde la vista.
- La eliminación conserva un foco accesible.
- Quitar entradas no modifica la cola activa.

### Verificación

- orden;
- eliminación;
- vacío;
- referencias retiradas;
- navegación;
- foco.

---

## T-006 — Separación de cola y lista visible

**Dependencias:** T-005.

### Alcance

Adaptar de forma acotada el manejo de cola para permitir una instantánea de descriptores sin depender de filas DOM que puedan eliminarse.

### Archivos previstos

- `app/js/js.js`;
- tests de reproducción pertinentes.

### Hecho cuando

- La cola puede avanzar sin depender de la permanencia de las filas originales.
- Cambiar Favoritos no modifica una cola ya capturada.
- Se conserva siguiente.
- Se conserva anterior.
- Se conserva fin de cola.
- Se conserva repetición.
- Se conserva aleatorio.
- No se introduce un modelo alternativo de reproducción.

### Verificación

- regresión de listas actuales;
- eliminación de filas mientras existe una cola activa.

---

## T-007 — Reproducción desde Favoritos y privacidad

**Dependencias:** T-006.

### Alcance

Habilitar reproducción desde Favoritos utilizando:

- adaptador existente;
- instantánea ordenada de cola.

Impedir que la integración transmita:

- selecciones;
- condición de favorita;
- orden;
- conteo;
- contexto de Favoritos.

### Archivos previstos

- `app/js/js.js`;
- tests pertinentes.

### Hecho cuando

- Elegir una canción reproduce mediante el mecanismo existente.
- La cola refleja la lista disponible al iniciar esa reproducción.
- Quitar la canción actual no altera la instantánea.
- Quitar otra entrada no altera la instantánea.
- Quitar todas las favoritas no altera la instantánea.
- Ninguna de esas acciones interrumpe el audio.
- No se transmite pertenencia a Favoritos.
- No se transmite orden.
- No se transmite conteo.
- No se transmite contexto de Favoritos.
- Una búsqueda anterior no provoca atribución indebida de Favoritos a telemetría.
- Los mecanismos normales de reproducción permanecen compatibles con la privacidad aprobada.

### Verificación

- reproducción;
- controles de cola;
- observación de solicitudes/eventos en entorno autorizado.

---

## T-008 — Recuperación de estado y compatibilidad de recursos

**Dependencias:** T-007.

### Alcance

Cubrir recuperación y compatibilidad sin añadir sincronización reactiva entre pestañas.

### Archivos previstos

- `app/js/favorites.js`;
- `app/js/js.js`;
- `app/index.php`.

### Hecho cuando

- Recarga recupera estado y orden.
- Cierre y reapertura recuperan estado y orden.
- El retorno mediante navegación recupera estado y orden.
- La inicialización no duplica listeners.
- Recursos incompatibles no causan confirmaciones falsas.
- Datos incompatibles no causan pérdida silenciosa.
- El versionado del módulo/formato queda tratado de forma segura.
- No se introduce sincronización remota.
- No se introduce sincronización reactiva entre pestañas abiertas.

Una pestaña nueva o recargada podrá leer correctamente el estado persistido existente, pero no es requisito reaccionar en tiempo real a cambios producidos desde otra pestaña ya abierta.

### Verificación

- recarga;
- reapertura;
- retorno de navegación;
- compatibilidad de recursos;
- compatibilidad de datos;
- ausencia de listeners duplicados.

---

## T-009 — Cobertura integrada y regresión final

**Dependencias:** T-008.

### Alcance

Completar la cobertura del comportamiento aprobado y registrar resultados.

No constituye:

- la fase independiente de Validation;
- aceptación humana final.

### Hecho cuando

Se comprueban:

- añadir;
- quitar;
- orden;
- persistencia;
- coherencia entre contextos;
- reproducción desde Favoritos;
- estado vacío;
- entradas retiradas;
- estabilidad de `favoriteId` ante cambios de título, ruta y posición;
- variantes independientes;
- accesibilidad;
- almacenamiento fallido;
- que marcar/desmarcar no afecta audio;
- que no afecta posición;
- que no afecta pausa;
- que no afecta cola;
- privacidad;
- ausencia de listeners duplicados.

Se identifican expresamente:

- verificaciones manuales;
- verificaciones no ejecutadas;
- limitaciones conocidas.

### Verificación

- pruebas automatizadas pertinentes;
- comprobaciones de navegador autorizadas;
- móvil;
- títulos largos.

---

# Condiciones comunes de ejecución

Para cada tarea autorizada:

1. Confirmar archivos y comprobaciones permitidos antes de ejecutarla.
2. Proteger cambios preexistentes.
3. Usar RED/GREEN cuando corresponda.
4. Justificar cuando RED/GREEN no aplique.
5. Registrar:
   - resultados;
   - archivos afectados;
   - límites;
   - bloqueos.
6. Detenerse al terminar.
7. No iniciar automáticamente la siguiente tarea.
8. No instalar dependencias sin autorización.
9. No ampliar refactorizaciones sin autorización.
10. La ubicación de tests y los comandos concretos deberán confirmarse con la infraestructura existente antes de ejecutarlos.

---

# Autorización vigente de ejecución

Tras la aprobación de Tasks se autorizó exclusivamente:

**T-001 — Identidad estable del catálogo**

Esa autorización quedó suspendida mientras faltaban los artefactos formales SDD.

La formalización de `tasks.md` no debe iniciar T-001 automáticamente.

Tras crear y verificar `tasks.md`, debe solicitarse o confirmarse de nuevo el gate de ejecución antes de modificar código.

---

# Estado

**Tasks r1: APPROVED**

No se ha iniciado implementación.
