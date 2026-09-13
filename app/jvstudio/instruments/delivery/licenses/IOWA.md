# University of Iowa — Musical Instrument Samples (MIS)

| Campo | Valor |
|---|---|
| Nombre | University of Iowa Electronic Music Studios — Musical Instrument Samples |
| Autor | Lawrence Fritts / University of Iowa Electronic Music Studios |
| Licencia declarada | Uso sin restricciones (*"free of copyright restrictions"*) |
| SPDX | `LicenseRef-UIowa-MIS` (no es una licencia estándar) |
| URL original | *(pendiente de verificar antes de la descarga — ver `sources/sources.yml`)* |
| Fecha de descarga | *(pendiente)* |

## Obligaciones

La fuente declara uso sin restricciones. **No** es una licencia estándar con texto
formal, por lo que §3.4 de la especificación exige conservar de todos modos:

- fuente
- URL
- fecha de descarga
- información disponible sobre autoría/origen

Todo ello se registra en `sources/iowa/PROVENANCE.md` y se copia al
`manifest.json` de cada instrumento derivado.

Atribución de cortesía:

```text
Samples from the University of Iowa Electronic Music Studios
Musical Instrument Samples (MIS), released free of copyright restrictions.
```

## Uso previsto en este proyecto

- violin
- cello
- flute
- clarinet
- brass
- otros instrumentos acústicos

## Notas de preparación — IMPORTANTE

Los archivos de Iowa **no son un sample por nota**. Cada archivo AIFF contiene
una secuencia de varias notas cromáticas grabadas seguidas (p. ej.
`Violin.arco.mono.ff.sulG.A3B3.aiff` = de A3 a B3 en un solo archivo), a menudo
en 44.1 kHz / 16 bit estéreo o mono.

Consecuencias para el pipeline:

1. Requiere un paso de **segmentación** (detección de onsets / silencios) previo
   al procesado normal.
2. La asignación de nota se deduce del rango indicado en el nombre del archivo
   más el orden cromático de los segmentos, y **debe verificarse a oído**.

Esto no está implementado en el pipeline v0. Antes de usar Iowa para
JV Solo Violin o JV Concert Flute hay que añadir `tools/split_iowa.py`.
Alternativa: usar VSCO 2 CE, que ya viene con un archivo por nota.
