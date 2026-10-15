# SPEC 001 — Propuesta de diseño técnico

**Base:** SPEC 001 r1, aprobada con P-001 a P-005 resueltas.  
**Estado del diseño:** APPROVED.  
**Cambios realizados durante diseño:** ninguno.

## 1. Arquitectura actual relevante

Architect identificó tres representaciones de canciones:

| Contexto | Fuente |
|---|---|
| Álbumes visibles | PHP renderiza el catálogo en `app/index.php:178–223`. |
| Resultados de búsqueda y listas del hero | JavaScript genera filas `.result` en `app/js/js.js`. |
| Motor oculto del reproductor | `ajax.buscarCanciones.php` entrega canciones que el reproductor carga por AJAX. |

El catálogo principal es:

`app/includes/musica.estructura-datos.php`

La búsqueda literal consume directamente ese catálogo.

La búsqueda semántica empareja resultados del índice con entradas del catálogo mediante la ruta de audio.

Su `trackId` pertenece al índice y a la telemetría; el reproductor sigue usando álbum e índice de canción.

### Hallazgo importante

La cola actual conserva referencias a filas DOM en:

`app/js/js.js:895–939`

Reemplazar una lista puede afectar a esa cola.

Además, reproducir resultados activa telemetría.

Se verificó directamente:

- el renderizado de álbumes;
- el contrato semántico;
- el acoplamiento de cola/reproducción.

El resto de evidencias procede de inspección estática de Architect.

---

## 2. Diseño propuesto

Separar cuatro responsabilidades:

### Catálogo

Responsable de:

- identidad estable;
- metadatos vigentes de cada canción.

### Módulo local de Favoritos

Responsable de:

- pertenencia;
- orden;
- validación;
- persistencia local.

### Interfaz

Responsable de:

- corazones;
- mensajes;
- lista de Favoritos;
- sincronización visual.

### Reproducción

Responsable de:

- adaptación acotada del comportamiento existente;
- integración de Favoritos sin introducir un reproductor alternativo.

Se propone una sección **Favoritos** dentro de la página, con acceso visible mediante navegación interna.

Abrir Favoritos:

- no reemplazará los resultados del buscador;
- no cargará audio automáticamente.

El módulo de Favoritos no tendrá acceso directo a:

- reproductor;
- red;
- Analytics;
- telemetría.

---

## 3. Modelo de datos y persistencia

### 3.1 Identificador

Se aprueba añadir un:

`favoriteId`

explícito, único e inmutable a cada entrada del catálogo.

No se utilizarán como identidad única:

- título;
- código de canción aislado;
- posición;
- identidad canónica del buscador;
- ruta del archivo de audio.

Motivos:

- el título puede repetirse;
- Architect encontró códigos de canción duplicados;
- la posición puede cambiar;
- la identidad del buscador puede agrupar versiones que deben permanecer independientes;
- la ruta puede cambiar si se mueve el archivo.

El `favoriteId` se conservará aunque cambien:

- título;
- traducción;
- ruta;
- posición;
- orden del catálogo.

Cada entrada distinta del catálogo mantendrá un ID independiente.

### Contrato de estabilidad

Una vez asignado un `favoriteId` a una canción publicada, ese ID no deberá cambiar por:

- renombrados;
- traducciones;
- cambios de ruta;
- reordenaciones;
- cambios de posición.

---

### 3.2 Almacenamiento

Se utilizará una única clave local con estructura versionada y simple:

```json
{
  "version": 1,
  "ids": [
    "entrada-mas-reciente",
    "entrada-anterior"
  ]
}
```

Reglas:

- añadir una canción nueva → insertar al principio;
- añadir una entrada ya existente → no duplicarla ni moverla;
- quitar una canción → eliminar su ID;
- quitar y volver a añadir → pasa de nuevo al principio;
- no se duplicarán metadatos en almacenamiento;
- los metadatos se resolverán siempre desde el catálogo actual;
- entradas retiradas del catálogo se omitirán visualmente;
- inicialmente se conservará su referencia almacenada.

### Fallo de persistencia

La secuencia será:

`calcular cambio → intentar persistir → confirmar estado`

Solo después de una escritura correcta se confirmará el cambio al usuario.

Si falla la persistencia:

- se mantiene el estado anterior;
- se informa claramente del error;
- no se muestra una confirmación falsa.

Datos corruptos o versiones desconocidas:

- no se sobrescribirán silenciosamente;
- producirán un resultado de error identificable.

---

## 4. Archivos afectados previstos

| Archivo | Cambio previsto | Motivo |
|---|---|---|
| `app/includes/musica.estructura-datos.php` | Incorporar IDs estables | Identidad independiente de título, ruta y posición |
| `app/index.php` | Controles, acceso, sección y mensajes | Integración visible |
| `app/includes/ajax.searchSongs.php` | Propagar ID | Coherencia en búsqueda literal |
| `app/includes/ajax.semanticSearch.php` | Propagar ID desde catálogo | Coherencia en búsqueda semántica |
| `app/js/favorites.js` | Nuevo módulo de estado y persistencia | Aislar responsabilidades |
| `app/js/js.js` | Integración visual y adaptación de reproducción | Reutilizar comportamiento existente |
| `app/js/i18n.js` | Textos y etiquetas EN/ES | Mensajes y accesibilidad |
| `app/css/hero.css` | Controles, foco y disposición responsive | Integración visual |
| Tests, ubicación por confirmar | Cobertura específica | Verificación posterior |

No se proponen cambios en:

- servicios Python;
- índices;
- configuración;
- motor de audio.

---

## 5. Flujo funcional

### 5.1 Marcado

Flujo aprobado:

`control → calcular cambio → persistir → confirmar estado → actualizar representaciones → anunciar resultado`

Si la persistencia falla:

- conservar estado anterior;
- mostrar error;
- no confirmar visualmente un estado persistente inexistente.

---

### 5.2 Renderizado

Flujo aprobado:

`renderizar lista → consultar estado común → representar corazón y estado accesible`

Cualquier lista renderizada debe consultar el mismo estado compartido de Favoritos.

---

### 5.3 Reproducción desde Favoritos

Flujo aprobado:

`resolver canciones disponibles → capturar cola ordenada → usar reproducción existente`

La cola será una **instantánea** al iniciar la reproducción desde Favoritos.

Quitar favoritos posteriormente:

- no modifica esa cola;
- no interrumpe la canción actual;
- no altera la posición de reproducción.

---

## 6. Integración con reproducción

La reproducción desde Favoritos reutilizará el comportamiento actual del reproductor.

No se creará un segundo modelo de reproducción.

Se aprueba separar:

- lista visible;
- cola activa.

La cola no deberá depender de que las filas DOM originales sigan existiendo.

Esto permitirá que:

- una canción pueda quitarse de Favoritos;
- una fila pueda desaparecer;
- la cola capturada siga funcionando.

Deben conservarse:

- siguiente;
- anterior;
- fin de cola;
- repetición;
- aleatorio.

Los controles de favorito deberán quedar explícitamente excluidos de los handlers de reproducción.

Marcar o desmarcar:

- no reproduce;
- no pausa;
- no reanuda;
- no cambia canción;
- no modifica posición;
- no modifica cola.

---

## 7. Eventos y DOM

Para evitar duplicación de listeners:

- utilizar delegación de eventos donde resulte apropiado;
- o garantizar inicialización única.

Los renderizados repetidos de:

- álbumes;
- buscador;
- listas dinámicas;
- Favoritos;

no deberán multiplicar listeners ni activaciones.

Al eliminar una canción de Favoritos, el foco deberá trasladarse de forma accesible a:

- el control siguiente;
- el anterior;
- o el estado vacío,

según corresponda.

---

## 8. Accesibilidad

El control de favorito será preferentemente un botón nativo.

Deberá disponer de:

- nombre accesible;
- estado favorito/no favorito comunicado;
- foco visible;
- operación mediante teclado.

No dependerá únicamente:

- del color;
- del icono.

No deberá introducir controles interactivos anidados.

---

## 9. Privacidad

El módulo de Favoritos no debe transmitir:

- pertenencia a favoritos;
- orden;
- conteo;
- lista;
- contexto de Favoritos;

a:

- servidor;
- Analytics;
- telemetría.

La reproducción desde Favoritos puede reutilizar los mecanismos normales existentes del reproductor, pero la condición de favorita de una canción no debe convertirse en información transmitida.

Debe evitarse que una búsqueda anterior provoque una atribución indebida de contexto de Favoritos a telemetría.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación aprobada |
|---|---|
| Pulsar corazón activa reproducción de la fila | Excluir explícitamente controles de favorito de handlers de reproducción |
| Eliminar una fila altera la cola | Separar cola activa y lista visible |
| Listeners duplicados tras renderizados | Delegación de eventos o inicialización única |
| Telemetría heredada de búsqueda anterior | Separar atribución y no transmitir selección/contexto de Favoritos |
| Renombrado de canciones rompe favoritos | `favoriteId` explícito e inmutable |
| Recursos antiguos en caché | Versionar módulo y comprobar compatibilidad de contratos |
| Almacenamiento inaccesible o corrupto | Error visible y ausencia de pérdida silenciosa |
| Foco perdido al eliminar una fila | Mover foco al siguiente, anterior o estado vacío |

---

## 11. Estrategia de pruebas aprobada

Las pruebas deberán cubrir:

- añadir favorito desde álbum;
- quitar favorito desde álbum;
- añadir desde búsqueda literal;
- añadir desde búsqueda semántica;
- estado correcto en listas recién renderizadas;
- coherencia entre álbum, búsqueda y Favoritos;
- orden reciente primero;
- ausencia de duplicados;
- persistencia tras recarga;
- persistencia tras cierre/reapertura;
- persistencia tras navegación;
- independencia entre entradas con mismo título;
- independencia entre variantes/versiones;
- estado vacío;
- referencia retirada del catálogo;
- eliminación desde Favoritos;
- eliminación de la canción actualmente en reproducción;
- reproducción desde Favoritos;
- siguiente/anterior;
- repetición;
- aleatorio;
- marcado/desmarcado sin cambios en audio, posición, pausa o cola;
- teclado;
- nombres accesibles;
- estado accesible;
- foco tras eliminación;
- fallos de almacenamiento;
- datos corruptos;
- compatibilidad/versionado de recursos;
- renderizados AJAX sucesivos;
- ausencia de listeners duplicados;
- ausencia de transmisión de selecciones a servidor;
- ausencia de eventos de Analytics o telemetría asociados a Favoritos;
- móvil;
- títulos largos.

### Prueba específica de estabilidad del identificador

Debe verificarse expresamente que cambiar:

- título;
- ruta;
- posición;

sin cambiar la identidad de la entrada no altera su `favoriteId`.

---

## 12. Orden conceptual de integración

El orden aprobado es:

**Identidad → persistencia → controles y sincronización → vista accesible → reproducción y privacidad → comprobaciones de regresión**

Este orden es conceptual.

La descomposición formal en Tasks se realiza en el artefacto posterior `tasks.md`.

---

## 13. Decisiones técnicas cerradas

Quedan aprobadas:

1. `favoriteId` explícito, único e inmutable.
2. Sección interna independiente de Favoritos.
3. Persistencia confirmada únicamente tras escritura correcta.
4. Cola de reproducción capturada como instantánea.
5. Separación entre lista visible y cola activa.
6. Módulo `favorites.js` independiente.
7. Metadatos resueltos desde catálogo actual.
8. No duplicar metadatos en almacenamiento.
9. No borrar automáticamente referencias de canciones retiradas.
10. Reutilizar reproductor existente.
11. No transmitir estado de Favoritos.
12. No sincronizar reactivamente pestañas abiertas.

---

## 14. Límites y fuera de alcance técnico

Este diseño no incluye:

- autenticación;
- backend de Favoritos;
- base de datos;
- sincronización cloud;
- sincronización entre dispositivos;
- sincronización reactiva entre pestañas abiertas;
- playlists múltiples;
- recomendaciones;
- estadísticas;
- importación/exportación;
- ordenación manual;
- cambios en servicios Python;
- cambios en índices;
- cambios en motor de audio;
- refactorizaciones amplias no necesarias.

---

## 15. Estado de aprobación

**Diseño técnico r1: APPROVED**

La aprobación del diseño autoriza la formalización del plan técnico y la posterior preparación de Tasks.

No constituye autorización de implementación.
