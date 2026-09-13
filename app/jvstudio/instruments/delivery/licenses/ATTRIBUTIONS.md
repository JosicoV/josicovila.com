# Atribuciones — JV Instrument Library

Este archivo es el registro maestro de procedencia. Todo instrumento publicado en
`dist/` debe aparecer aquí, y su `LICENSE.txt` se genera a partir de estos datos.

## Fuentes autorizadas

Solo estas cuatro. Ninguna otra librería entra en el proyecto sin revisión previa (§4).

| Fuente | Licencia | Atribución obligatoria | Documento |
|---|---|---|---|
| VSCO 2 Community Edition | CC0-1.0 | No (se acredita por política) | [VSCO2CE.md](VSCO2CE.md) |
| VCSL | CC0-1.0 | No (se acredita por política) | [VCSL.md](VCSL.md) |
| Salamander Grand Piano V3 | CC-BY-3.0 | **Sí** | [SALAMANDER.md](SALAMANDER.md) |
| University of Iowa MIS | Uso sin restricciones | No (se acredita por política) | [IOWA.md](IOWA.md) |

## Fuentes explícitamente excluidas

No incorporar muestras de Spitfire LABS, Pianobook, Philharmonia ni otros bancos
gratuitos no auditados.

> gratis para producir música **≠** redistribuible dentro de un sampler / DAW

## Instrumentos publicados

### JV Grand Piano — v1.0.0 · `dist/jv-grand-piano/v1/`

- **Fuente:** Salamander Grand Piano V3
- **Autor:** Alexander Holm
- **Licencia:** CC-BY-3.0 — **atribución obligatoria**
- **URL original:** https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPianoV3+20161209_44khz16bit.tar.xz
- **Fecha de descarga:** 2026-09-08
- **SHA-256 de la descarga:** `58750eb1366761e187f71ddb9b932355ea894d28ec4331e74ab8acb44c819936`
- **Modificaciones:** trim de silencio inicial y final; fade in 2 ms / fade out 30 ms;
  normalización de pico por instrumento; conversión a OGG Vorbis 44,1 kHz.

Texto de atribución que debe acompañar a cualquier distribución:

```text
Salamander Grand Piano V3 by Alexander Holm, licensed under CC BY 3.0
(https://creativecommons.org/licenses/by/3.0/).
Modified for the JV Instrument Library.
```

### JV Grand Piano (Light) — v1.0.0 · `dist/jv-grand-piano-light/v1/` ✅

Misma fuente, misma licencia, misma atribución y mismas modificaciones que el
anterior, más: reducción de 16 capas de velocity a 3.

> **Variante aprobada a nivel sonoro (2026-09-08) y congelada.** Es la entrada
> del catálogo para el piano. La Standard de arriba se conserva solo como
> referencia de comparación.

### JV Glockenspiel — v1.0.0 · `dist/jv-glockenspiel/v1/`

- **Fuente:** Versilian Community Sample Library (VCSL) — `Idiophones/Struck Idiophones/Glockenspiel`
- **Autor:** Versilian Studios y colaboradores
- **Licencia:** CC0-1.0 — **sin atribución obligatoria**; se acredita por política propia
- **URL original:** https://github.com/sgossner/VCSL
- **Fecha de descarga:** 2026-09-08 (solo esa carpeta: 18 archivos, 16,39 MiB)
- **Modificaciones:** trim de silencio; fade in 1 ms / fade out 20 ms;
  normalización de pico por instrumento (+20,4 dB); conversión a OGG Vorbis
  44,1 kHz; **reetiquetado de notas +12 semitonos** para declarar la nota sonante.

Atribución de cortesía:

```text
Samples from the Versilian Community Sample Library (VCSL), CC0 1.0.
```

### JV Solo Violin — v1.0.0 · `dist/jv-solo-violin/v1/`

- **Fuente:** VSCO 2 Community Edition (WAV original) — `Strings/Solo Violin/Arco Vib`
- **Autor:** Versilian Studios / Sam Gossner, con aportaciones de Ivy Audio / Simon Dalzell
- **Licencia:** CC0-1.0 — **sin atribución obligatoria**; se acredita por política propia
  y porque el readme de la fuente lo pide expresamente
- **URL original:** https://github.com/sgossner/VSCO-2-CE
- **Fecha de descarga:** 2026-09-08 (solo esa articulación: 30 archivos, 70,91 MiB)
- **Checksums:** `sources/_checksums_solo_violin.md`
- **Modificaciones:** trim de silencio; fade in 5 ms / fade out 40 ms;
  normalización RMS por instrumento (+2,9 dB); conversión a OGG Vorbis 44,1 kHz.

### JV Concert Flute — v1.0.0 · `dist/jv-concert-flute/v1/` y `dist/jv-concert-flute-vib/v1/`

- **Fuente:** VSCO 2 Community Edition (WAV original) — `Woodwinds/Flute/susNV` y `Woodwinds/Flute/susvib`
- **Autor:** Versilian Studios / Sam Gossner, con aportaciones de Ivy Audio / Simon Dalzell
- **Licencia:** CC0-1.0 — sin atribución obligatoria
- **URL original:** https://github.com/sgossner/VSCO-2-CE
- **Fecha de descarga:** 2026-09-08 (solo esas dos articulaciones: 32 archivos, 70,73 MiB)
- **Checksums:** `sources/_checksums_concert_flute.md`
- **Modificaciones:** trim de silencio; fade in 5 ms / fade out 40 ms;
  normalización RMS por instrumento; conversión a OGG Vorbis 44,1 kHz;
  **reetiquetado de notas +12 semitonos** para declarar la nota sonante.

> Dos variantes en comparación A/B; la que se descarte se eliminará de `dist/`
> y de esta lista.

Atribución de cortesía (común a los tres instrumentos de VSCO 2 CE):

```text
Samples from VSCO 2 Community Edition by Versilian Studios / Sam Gossner
(CC0 1.0), with contributions from Ivy Audio / Simon Dalzell.
```
