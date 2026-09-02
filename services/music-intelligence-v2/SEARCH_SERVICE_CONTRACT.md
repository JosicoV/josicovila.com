# Contrato del servicio de búsqueda — v1.0

Contrato público del servicio aislado `music-intelligence-v2`. Es
deliberadamente agnóstico del modelo: el frontend no debe conocer MuQ-MuLan,
los embeddings ni la aritmética interna de reranking.

`contract_version` acompaña a toda respuesta. Un cambio incompatible sube esa
versión; añadir campos opcionales, no.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Estado del índice y de los modelos. |
| `POST` | `/search` | Búsqueda en lenguaje natural. |
| `POST` | `/suggest` | Contrato definido, todavía inactivo. |

Cualquier otra ruta responde `404 not_found`; un método incorrecto sobre una
ruta válida responde `405 method_not_allowed`.

## `GET /health`

`200` cuando índice, modelo de recuperación y traductor están cargados.
`503` en cualquier otro caso. No expone rutas locales ni variables de entorno.

```json
{
  "status": "ok",
  "contract_version": "1.0",
  "index_loaded": true,
  "model_ready": true,
  "translator_ready": true,
  "index_version": "muq-segment-20260827T213721+0000",
  "catalogue_tracks": 115,
  "catalogue_segments": 1429
}
```

## `POST /search`

### Petición

```json
{
  "query": "música tranquila y melancólica",
  "language": "auto",
  "limit": 8
}
```

| Campo | Requerido | Por defecto | Reglas |
| --- | --- | --- | --- |
| `query` | sí | — | Texto no vacío, máximo 300 caracteres. |
| `language` | no | `auto` | `auto`, `en` o `es`. |
| `limit` | no | `8` | Entero entre 1 y 10. |

Cuerpo máximo: 16 KiB.

### Respuesta

```json
{
  "contract_version": "1.0",
  "index_version": "muq-segment-20260827T213721+0000",
  "query_original": "música tranquila y melancólica",
  "detected_language": "es",
  "query_normalized_en": "quiet and melancholy music",
  "translation_used": true,
  "catalogue_fit": "clear",
  "limit": 8,
  "results": [
    {
      "rank": 1,
      "track_id": "ijustcantsayfarewell-live",
      "composition_id": "composition-live",
      "title": "Live",
      "album": "I just can't say Farewell",
      "album_cover_url": "musica/DISCOS/Ijustcantsayfarewell.jpg",
      "audio_url": "musica/IJustCantSayFarewell/Live.mp3",
      "duration_seconds": 146.001,
      "alternate_versions": 1,
      "match": { "best_segment_start": 62.5, "best_segment_end": 87.5 }
    }
  ]
}
```

`audio_url` y `album_cover_url` son relativos y siguen la convención que ya usa
el reproductor de producción (`musica/${ruta}`, `musica/DISCOS/${imagen}`).

`alternate_versions` indica cuántas versiones equivalentes de esa composición
existen en el índice pero se han suprimido del ranking visible. Nunca se
devuelven puntuaciones, embeddings ni identificadores de checkpoint.

`catalogue_fit` es una orientación para redactar la interfaz, no una
probabilidad ni una orden de filtrado. Vale `clear` cuando la consulta tiene un
encaje absoluto suficiente o una coincidencia fuerte de título, y `closest`
cuando el servicio conserva los resultados pero sólo puede ofrecer lo más
cercano dentro de esta discografía. En ambos casos el ranking y su número de
resultados permanecen intactos.

## `POST /suggest`

Acepta el mismo contrato que `/search` y admite además `query` vacío, porque un
cuadro de sugerencias se dispara con la entrada en blanco.

```json
{ "query_original": "bel", "available": false, "suggestions": [] }
```

Mientras `available` sea `false` el frontend no debe mostrar sugerencias.

## Errores

Formato único y estable. El detalle técnico se registra, nunca se devuelve.

```json
{ "error": { "code": "empty_query", "message": "Field 'query' is required and must not be empty." } }
```

| Código | HTTP | Causa |
| --- | --- | --- |
| `malformed_request` | 400 | Cuerpo ausente o JSON inválido. |
| `empty_query` | 400 | `query` ausente, vacío o no textual. |
| `query_too_long` | 400 | `query` supera 300 caracteres. |
| `limit_out_of_bounds` | 400 | `limit` fuera de 1..10 o no entero. |
| `unsupported_language` | 400 | `language` distinto de `auto`/`en`/`es`. |
| `not_found` | 404 | Ruta desconocida. |
| `method_not_allowed` | 405 | Método incorrecto para una ruta válida. |
| `payload_too_large` | 413 | Cuerpo mayor de 16 KiB. |
| `index_not_loaded` | 503 | El servicio arrancó sin índice. |
| `incompatible_index` | 503 | El índice no es compatible con este build. |
| `model_unavailable` | 503 | MuQ-MuLan no disponible o respuesta inválida. |
| `translation_failed` | 503 | OPUS-MT no disponible o traducción vacía. |
| `internal_error` | 500 | Fallo no clasificado. Nunca expone traza. |

## Tubería de ejecución

```text
validar entrada
→ detectar idioma (o usar el declarado)
→ si es español: OPUS-MT es→en
→ embedding de texto con MuQ-MuLan
→ máximo por pista sobre 1.429 segmentos
→ estimar el ajuste global a la discografía sin filtrar resultados
→ agrupar por composition_id, conservar la mejor versión
→ diversificar hasta el top-10 interno
→ recortar a `limit` (8 por defecto)
```

## Registro

Una línea JSON por petición en stderr: `request_id`, `timestamp`,
`detected_language`, `translation_used`, `translation_ms`, `embedding_ms`,
`retrieval_ms`, `total_ms`, `result_count`, `index_version`,
`suppressed_versions`. Nunca se registran embeddings. El texto del usuario solo
se registra con `--log-queries`, desactivado por defecto.
