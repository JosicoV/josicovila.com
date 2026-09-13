# Salamander Grand Piano V3

| Campo | Valor |
|---|---|
| Nombre | Salamander Grand Piano V3 |
| Autor | Alexander Holm |
| Licencia | CC BY 3.0 |
| SPDX | `CC-BY-3.0` |
| URL original | https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPianoV3+20161209_44khz16bit.tar.xz |
| Fecha de descarga | 2026-09-08 |
| SHA-256 | `58750eb1366761e187f71ddb9b932355ea894d28ec4331e74ab8acb44c819936` |
| Instrumento | Yamaha C5 Grand |

## Obligaciones

**Requiere atribución.** Esta es la única de las cuatro fuentes autorizadas que
impone una obligación activa: cualquier distribución de material derivado
(incluidos los `dist/` que acaben dentro de JV Studio) debe conservar el crédito.

Texto de atribución a incluir en `LICENSE.txt` de cada instrumento derivado y en
[ATTRIBUTIONS.md](ATTRIBUTIONS.md):

```text
Salamander Grand Piano V3 by Alexander Holm.
Licensed under Creative Commons Attribution 3.0 (CC BY 3.0).
https://creativecommons.org/licenses/by/3.0/
Modified for the JV Instrument Library (trim, fade, normalización, conversión de formato).
```

Permitido bajo CC BY 3.0: uso comercial, redistribución, modificación y obras
derivadas, siempre que se dé crédito y se indique si se hicieron cambios.

## Modificaciones realizadas

Se registran automáticamente en el `manifest.json` de cada instrumento derivado,
bajo `source.modifications`.

## Notas de preparación

Verificado contra la descarga real (ver `sources/salamander/PROVENANCE.md`):

- Formato original: WAV, disponible en 44.1 kHz / 16 bit (usado) y 48 kHz / 24 bit.
- 641 archivos: 480 de nota (30 notas × 16 capas), 88 de release, 65 de
  resonancia simpática, 4 de pedal.
- Muestreo cada 3 semitonos: A0, C1, D#1, F#1, A1 … A7, C8.
- Nomenclatura `<nota>v<capa>.wav` con `#` literal, p. ej. `D#1v3.wav`.
- Ver §11 de la especificación: hay que preparar variantes Light / Standard / High
  y compararlas antes de decidir la definitiva. Construidas Standard (5 capas) y
  Light (3); pendiente la escucha — `docs/reviews/jv-grand-piano.md`.
