# Formato de manifest — JV Instrument v1

Schema: [`schema/instrument-manifest-v1.schema.json`](schema/instrument-manifest-v1.schema.json)
(JSON Schema 2020-12).

## Principio de diseño

> El manifest debe contener **toda** la información necesaria (§17).

JV Studio no debe conocer VSCO, VCSL, Salamander ni Iowa, ni interpretar nombres
de archivo, ni deducir el mapeo de notas. Lee `samples[]` y ya tiene el mapa
completo: archivo, nota raíz, rango de velocity y, opcionalmente, el rango de
notas que cubre por transposición.

Esto es lo que permite construir después un `InstrumentFactory` genérico.

## Diferencias con el borrador de §16

| §16 | v1 | Motivo |
|---|---|---|
| — | `version` obligatorio | §20 exige versionado por instrumento |
| — | `range` | El motor necesita saber el rango útil sin recorrer `samples[]` |
| — | `samples[]` con `sha256` | §19 exige checksums de los archivos finales |
| `source.license: "CC-BY-3.0"` | igual, pero validado contra un enum | Solo 4 licencias permitidas (§3, §4) |
| — | `source.attributionRequired` + `attribution` | Hace la obligación de Salamander explícita y verificable |
| — | `totals`, `build` | Trazabilidad y comparación de variantes (§11) |

## Invariantes que el pipeline valida

1. `velocityLayers` cubre 1..127 **sin solapes ni huecos**.
2. Todo `sample.velocityMin/Max` coincide exactamente con una capa declarada.
3. `range.lowestMidi <= range.highestMidi` y coincide con el mínimo/máximo de `samples[]`.
4. `sha256` de cada archivo coincide con el archivo realmente escrito en `dist/`.
5. Si `source.attributionRequired` es `true`, `source.attribution` no está vacío.

## Evolución

`schemaVersion` es un entero. Cualquier cambio **incompatible** lo incrementa y
crea un nuevo archivo de schema; los cambios compatibles (campos opcionales
nuevos) se documentan aquí sin tocar la versión.

### Historial

- **v1 — CONGELADO el 2026-09-08.** No admite más cambios incompatibles.
  Congelado tras construir 13 instrumentos de cuatro fuentes distintas y
  aprobarlos por escucha. `engine` queda cerrado a `"sampler"`.

#### Qué se aprendió antes de congelar

El formato aguantó cuatro fuentes con convenciones muy distintas sin necesitar
cambios incompatibles. Los dos únicos campos que hubo que añadir fueron
aditivos y salieron de problemas reales:

- **`input.note_offset`** (en el config, no en el manifest) — porque VSCO 2 CE
  etiqueta una octava por debajo del sonido real en todos sus instrumentos menos
  uno, y VCSL hace lo mismo con el glockenspiel. El manifest siempre declara la
  nota **sonante**, que es lo que el motor necesita.
- **`samples[].file` con patrón restringido** — un `#` en la ruta abría el
  fragmento de la URL y daba 404. Los sostenidos van como `s`.

Lo que **no** cupo en v1 y espera a v2: los kits de percusión, que necesitan
mapeo pieza-por-tecla en vez de transposición. Ver
[`../docs/PROPUESTA-DRUMKIT.md`](../docs/PROPUESTA-DRUMKIT.md).

#### Cambios compatibles posteriores a la congelación

- **2026-09-08 — `source.key` admite `karoryfer`.** Autorizada como quinta fuente
  (ver `licenses/KARORYFER.md`). Ampliar este enum **no rompe la congelación**:
  ningún manifest existente deja de validar y ningún consumidor lee el formato
  de otra manera. Los enums de `source.key` y `source.license` codifican
  **política del proyecto** (§4), no el contrato de formato con JV Studio.
- **2026-09-08 — `category` admite `guitar` y `bass`.**
  **REVERTIDO el 2026-09-13 por decisión del usuario:** la guitarra y el bajo
  eléctricos van bajo `strings`. `category` vuelve a sus diez valores originales.
  El episodio deja una lección útil: un enum de `category` es un contrato de
  agrupación con la interfaz de JV Studio, así que conviene cerrarlo antes de que
  alguien empiece a leerlo, no después.

#### Cómo evolucionar sin romper v1

`engine` es la bisagra. Un consumidor de v1 debe **rechazar limpiamente**
cualquier `engine` que no conozca, en vez de asumir `sampler`. Con eso, añadir
`drumkit` en v2 no rompe nada de lo ya entregado.

## Ejemplo mínimo

```json
{
  "schemaVersion": 1,
  "id": "jv-grand-piano",
  "name": "JV Grand Piano",
  "version": "1.0.0",
  "category": "piano",
  "engine": "sampler",
  "source": {
    "key": "salamander",
    "name": "Salamander Grand Piano V3",
    "author": "Alexander Holm",
    "license": "CC-BY-3.0",
    "attributionRequired": true,
    "attribution": "Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0), modified.",
    "modifications": ["trim", "fade", "peak normalize", "ogg vorbis"]
  },
  "audio": { "format": "ogg", "codec": "vorbis", "sampleRate": 44100, "channels": 2 },
  "playback": { "attack": 0.002, "release": 1.2, "gainDb": -4 },
  "range": { "lowest": "C4", "highest": "C4", "lowestMidi": 60, "highestMidi": 60 },
  "velocityLayers": [{ "name": "mf", "velocityMin": 1, "velocityMax": 127 }],
  "samples": [
    {
      "file": "samples/C4-mf.ogg",
      "root": "C4",
      "rootMidi": 60,
      "layer": "mf",
      "velocityMin": 1,
      "velocityMax": 127,
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
```
