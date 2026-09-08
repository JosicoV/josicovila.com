# Integración con JV Studio — contrato v1

> **FORMATO v1 CONGELADO el 2026-09-08.** No admite ya cambios incompatibles.
> Esta página es el contrato con JV Studio.
>
> §30 sigue vigente: este proyecto **no** modifica el DAW ni toca el
> `InstrumentFactory` actual hasta que se solicite expresamente. Lo que cambia es
> que el material ya está listo: 13 instrumentos construidos, verificados y
> aprobados por escucha, con el formato congelado.

## Qué se entrega

Únicamente:

```text
dist/
manifests/schema/instrument-manifest-v1.schema.json
docs/integration.md
```

## Qué NO necesita saber JV Studio

VSCO, VCSL, Salamander, Iowa, el procesamiento original ni el pipeline interno.
Toda la información necesaria vive en el `manifest.json` de cada instrumento.

## Contrato

Cada instrumento es un directorio autónomo:

```text
dist/<id>/v<major>/
├── manifest.json      ← el contrato
├── LICENSE.txt        ← se distribuye con el instrumento
├── build-report.json  ← trazabilidad, no lo consume el motor
└── samples/
```

## Cómo lo consumiría un InstrumentFactory genérico

1. Leer `manifest.json`. Rechazar si `schemaVersion != 1`.
2. Precargar `samples[]` resolviendo cada `file` relativo al manifest.
3. Al recibir una nota (`midi`, `velocity`):
   - elegir la capa cuyo `[velocityMin, velocityMax]` contiene `velocity`;
   - dentro de esa capa, elegir el sample cuyo `[loNote, hiNote]` contiene `midi`;
   - transponer por `midi - rootMidi` semitonos (`playbackRate = 2 ** (semis/12)`).
4. Aplicar `playback.attack` / `playback.release` como envolvente del motor y
   `playback.gainDb` como ganancia del instrumento.

`loNote`/`hiNote` ya están precalculados: el motor no necesita buscar el sample
más cercano ni decidir puntos de corte.

## El catálogo v1

| `id` | Nombre | Categoría | Samples | Size | Capas | Rango | Ch |
|---|---|---|---:|---:|---|---|---:|
| `jv-chamber-strings` | JV Chamber Strings | ensemble | 36 | 5.60 MB | p/f | C2-D6 | 2 |
| `jv-clarinet` | JV Clarinet | woodwinds | 30 | 4.41 MB | pp/mf/ff | D3-D6 | 2 |
| `jv-concert-flute` | JV Concert Flute | woodwinds | 19 | 2.32 MB | p/f | C4-C7 | 2 |
| `jv-concert-flute-vib` | JV Concert Flute (Vibrato) | woodwinds | 10 | 0.99 MB | mf | C4-C7 | 2 |
| `jv-french-horn` | JV French Horn | brass | 24 | 2.49 MB | pp/mf/ff | C2-C4 | 2 |
| `jv-glockenspiel` | JV Glockenspiel | mallets | 18 | 0.57 MB | pp/mf/ff | G5-C8 | 2 |
| `jv-grand-piano` | JV Grand Piano | piano | 90 | 14.56 MB | pp/mf/ff | A0-C8 | 2 |
| `jv-oboe` | JV Oboe | woodwinds | 18 | 2.81 MB | p/f | A#3-F6 | 2 |
| `jv-soft-piano` | JV Soft Piano | piano | 90 | 14.17 MB | pp/p/mp | A0-C8 | 2 |
| `jv-solo-cello` | JV Solo Cello | strings | 134 | 2.60 MB | pp/mf/ff | C2-A5 | 1 |
| `jv-solo-violin` | JV Solo Violin | strings | 30 | 6.46 MB | p/f | G3-C7 | 2 |
| `jv-trombone` | JV Trombone | brass | 27 | 4.01 MB | pp/mf/ff | D#2-F4 | 2 |
| `jv-trumpet` | JV Trumpet | brass | 20 | 2.89 MB | p/f | F3-C6 | 2 |
| | **13 instrumentos** | | **546** | **63.9 MB** | | | |

Los `id` son **estables**: son el contrato. Cambiarlos exige `schemaVersion` 2.

Ruta de cada uno: `dist/<id>/v1/manifest.json`.

### Atribución obligatoria

Dos instrumentos vienen de **Salamander Grand Piano V3 (CC BY 3.0)** y **exigen
crédito** al distribuirse: `jv-grand-piano` y `jv-soft-piano`. El texto exacto
está en su `manifest.json` (`source.attribution`) y en el `LICENSE.txt` que
acompaña a cada uno. No es opcional.

El resto son CC0 o de uso sin restricciones; se acreditan por política del
proyecto, no por obligación legal. Ver [`../licenses/ATTRIBUTIONS.md`](../licenses/ATTRIBUTIONS.md).

### Particularidades a tener en cuenta

- **`jv-solo-cello` es MONO** (`audio.channels: 1`); los otros doce son estéreo.
  Viene de University of Iowa, cuyo material pre-2012 es mono. Se prefirió su
  dinámica de 3 capas y su nota-por-semitono al estéreo.
- **Ningún instrumento transpone más de 4 semitonos.** El peor es
  `jv-glockenspiel` (6 notas muestreadas); los pianos y el cello, 1 semitono.
- **Ningún sample tiene loop points.** Los sostenidos duran 10-17 s; una nota
  mantenida más allá se queda sin sonido.
- **Dos flautas a propósito**: `jv-concert-flute` (2 capas, más versátil) y
  `jv-concert-flute-vib` (con vibrato, 1 capa). La fuente no ofrece las dos cosas
  a la vez y ambas convencieron.

## Lo que NO cambia nunca dentro de una versión

`dist/<id>/v1/` es **inmutable**. Si un instrumento cambia, sube su `version` y
estrena carpeta. Por eso se puede cachear indefinidamente (`Cache-Control:
immutable`), y por eso los `sha256` del manifest siguen siendo válidos siempre.

⚠️ El Lab hace lo contrario a propósito (`Cache-Control: no-store`) para oír
siempre el último build. JV Studio debe hacer lo opuesto.

## Presupuesto de carga y memoria — LEER ANTES DE INTEGRAR

Medido sobre `jv-grand-piano` (90 samples, 14,56 MB) en Chromium, 2026-09-08:

| Alcance | Archivos | Tiempo | PCM en RAM |
|---|---|---|---|
| Instrumento completo | 90 | 4 734 ms | **398,7 MB** |
| Un rango de una octava aprox. (30 samples) | 30 | 1 591 ms | 133,2 MB |
| Una sola nota | 1 | 336 ms | ~4,4 MB |

> **14,56 MB en disco se convierten en ~399 MB de PCM al decodificar. Factor ×27.**

Es la consecuencia de que los samples de piano conservan la cola natural
completa (12–23 s cada uno). **El cuello de botella no es la descarga, es la
memoria y el tiempo de decodificación.**

Precargar el instrumento entero al abrir un proyecto no es viable, y con varios
instrumentos a la vez menos aún.

### Estrategia acordada

Decisión de 2026-09-08: **los samples están aprobados y congelados**. El
rendimiento se resuelve en el motor, no degradando el material.

1. **Lazy loading.** Cargar y decodificar cada sample al primer uso. Coste: unos
   336 ms la primera vez que suena una nota nueva; cero después.
2. **Precarga por rango.** Anticipar la región del teclado que se va a usar —las
   notas presentes en la pista MIDI, o unas octavas alrededor de la última
   tocada— en lugar del instrumento completo.
3. **Caché.** Reutilizar los `AudioBuffer` entre reproducciones, y servir
   `dist/` con cabeceras de caché largas. Los archivos son inmutables: el
   versionado va en la ruta (`/v1/`), así que se pueden cachear indefinidamente.
   ⚠️ El Lab hace lo contrario a propósito (`Cache-Control: no-store`) para oír
   siempre el último build.

Solo si esto resulta insuficiente se reconsiderará modificar los samples
(recortar colas, bajar bitrate, Opus). Ver
[`reviews/jv-grand-piano.md`](reviews/jv-grand-piano.md).

### Descartar buffers

Con el factor ×27, conviene poder liberar memoria: un LRU sobre los
`AudioBuffer`, con el rango activo protegido. Volver a decodificar cuesta
~336 ms por sample, así que descartar el rango en uso sale caro.

## Notas de diseño relevantes para el motor

- **El release no está horneado** en los samples (§15). El decaimiento natural
  sí; la liberación de tecla la aplica el motor con `playback.release`.
- **Los niveles ya son coherentes entre instrumentos** (§14) mediante
  normalización por instrumento más `playback.gainDb`. El motor no debería
  aplicar normalización adicional.
- **Las capas de velocity cubren 1..127 sin huecos ni solapes**, garantizado por
  el pipeline. La selección de capa nunca es ambigua ni falla.
- **Formato de audio:** OGG Vorbis en 44.1 kHz. Decodifica en todos los
  navegadores objetivo salvo Safari antiguo; si hiciera falta un fallback, el
  pipeline puede reconstruir el mismo instrumento en `wav` o `opus` cambiando
  una línea del config, con manifest e `id` idénticos.

## Verificación antes de integrar

```bash
# los checksums del manifest deben coincidir con los archivos entregados
python tools/verify_dist.py dist/<id>/v1
python tools/verify_dist.py dist/*/v1        # todo el catalogo
```

## Descubrimiento de instrumentos

`dist/index.json` lista los 13 con nombre, ruta, rango, capas y peso. Lo genera
`tools/serve_lab.py` al arrancar y **no forma parte del schema congelado**: es una
conveniencia del Lab. Si JV Studio lo quiere como contrato, conviene decidir su
forma y versionarlo aparte; mientras tanto, la fuente de verdad es el conjunto de
carpetas `dist/<id>/v1/`.

## Preguntas abiertas

- **¿Streaming o precarga?** Con el factor ×27 a PCM, la respuesta práctica es
  lazy loading por nota (ver el presupuesto de carga). Queda por decidir si el
  motor precarga por rango de pista o bajo demanda.
- **Round-robin.** Ningún instrumento lo tiene, y el schema v1 no lo expresa.
  Repetir una nota reproduce el mismo archivo. Si suena mecánico en uso real, es
  candidato claro para v2 (la propuesta de drumkit ya lo incluye).
