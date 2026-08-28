# Telemetría y feedback de relevancia

Señales anónimas de búsqueda y escucha en ficheros JSONL. Sin base de datos.

**Nada de esto altera el ranking.** Se recoge para poder diseñar y medir un
reranker más adelante, con datos reales en la mano.

## Dónde se guarda

```text
data/music-intelligence-v2/telemetry/
  2026-08-28.jsonl        un fichero por día, UTC
  2026-08-29.jsonl
  exports/                generado por telemetry_export.py
```

**Ese directorio no es alcanzable desde la web.** No hace falta ninguna regla de
Apache: el contenedor web sólo monta `app/`, `data/musica` y `data/3Dassets`, así
que los ficheros de telemetría no existen dentro de él. Verificado: todas las
rutas devuelven 404.

Quien escribe es el servicio de búsqueda, nunca el navegador ni PHP. El
frontend manda el evento a `includes/ajax.telemetry.php`, que lo reenvía al
servicio; el servicio lo valida, lo completa y lo añade a su fichero. Ninguna
respuesta de la API menciona rutas, usuarios ni trazas.

## Qué se recoge

| | |
| --- | --- |
| `anon_session_id` | Aleatorio, en `sessionStorage`. Muere al cerrar la pestaña. |
| `search_id` | Aleatorio, uno por búsqueda. |
| Consulta | Texto literal, idioma, intención y longitud. |
| Instantánea | Qué resultados se mostraron, con sus puntuaciones. |
| Comportamiento | Clic, escucha, salto rápido, repetición. |
| Feedback | `Sí` / `No` explícito. |

**Nunca**: nombre, correo, cuenta, IP, huella del navegador ni ubicación.

### Sobre el identificador de sesión

Vive en `sessionStorage`, no en `localStorage` ni en una cookie. Es una
decisión deliberada: al no persistir entre visitas no constituye seguimiento
persistente, así que **no requiere consentimiento** y el banner de cookies
actual no necesita cambios.

Si algún día se moviera a `localStorage` para poder analizar visitas
recurrentes, habría que añadirlo al banner y a `privacy-policy.html` **antes**
de activarlo, y no escribir nada hasta que el usuario acepte.

### Sobre el texto de las consultas

`--store-raw-query` guarda lo que el usuario escribió. Está activado porque sin
el texto el conjunto de datos no sirve para reentrenar el ranking: no se sabría
a qué pregunta responde cada juicio.

La contrapartida es la retención: **90 días por defecto**. No es opcional, es lo
que justifica haberlo activado.

```bash
python telemetry_cleanup.py --dry-run    # qué borraría
python telemetry_cleanup.py --apply      # lo borra
```

Configurable con `TELEMETRY_RETENTION_DAYS`. Por defecto **simula**: borrar datos
no debe poder ocurrir por teclear de más.

## Cómo se activa

Está **desactivada por defecto**. Hay que pedirla:

```bash
python serve.py --telemetry --store-raw-query
```

Sin `--telemetry` el servicio no escribe nada, `/events` responde
`telemetry_unavailable` y la respuesta de búsqueda trae `search_id: null`, con
lo que el frontend no envía eventos.

## Herramientas

```bash
python telemetry_check.py     # integridad: líneas corruptas, ids repetidos
python telemetry_report.py    # resumen legible
python telemetry_export.py    # conjunto de datos en JSON y CSV
python telemetry_cleanup.py   # retención
```

Todas son operaciones **offline**: ninguna se ejecuta durante una búsqueda.

## Append-only y estado final

Las líneas antiguas no se reescriben nunca. Si alguien pulsa `No` y luego `Sí`,
quedan los dos eventos y es la exportación la que decide que el estado final es
`Sí`. Reglas de consolidación:

- **Feedback**: gana el más reciente.
- **Escucha**: se conserva la más LARGA, no la suma. Quien oye 30 s, salta y
  vuelve 20 s no ha escuchado 50 s; el máximo describe mejor cuánto aguantó.
  Las repeticiones se cuentan aparte, en `replayed`.

## Concurrencia

Hay un cerrojo por instancia y se abre en modo append. Suficiente mientras
escriba un único proceso, que es el caso: el contenedor de búsqueda es el único
que toca ese directorio.

**Limitación conocida**: si algún día escribieran varios procesos haría falta un
cerrojo de fichero real (`fcntl` / `msvcrt`). No está implementado por no añadir
complejidad que hoy no se usa.

## Fiabilidad

La telemetría **no es crítica**. Si falla la escritura, la búsqueda devuelve sus
resultados igual y el reproductor sigue sonando; sólo se pierde el evento. El
frontend ignora los errores del endpoint y nunca espera su respuesta.

## Copias de seguridad

Los ficheros son de sólo-añadir y diarios, así que archivar los días ya
cerrados es suficiente:

```bash
tar czf telemetria-2026-08.tar.gz data/music-intelligence-v2/telemetry/2026-08-*.jsonl
```

El fichero del día en curso sigue creciendo; conviene archivarlo al día
siguiente.

## Permisos en producción

Cuando se despliegue habrá que asegurar que:

- el contenedor de búsqueda puede **añadir** a ese directorio,
- el proceso de copia puede **leerlo**,
- el contenedor web **no lo monta** (hoy no lo hace, y así debe seguir).

Nada de permisos world-writable.

## Migración futura

JSONL es el formato de hoy, no una restricción eterna. Todos los eventos llevan
`schema_version`, así que si el volumen creciera:

```text
JSONL → importador → SQLite / PostgreSQL
```

sigue siendo posible sin perder el histórico.
