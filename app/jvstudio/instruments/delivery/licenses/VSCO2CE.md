# VSCO 2 Community Edition

| Campo | Valor |
|---|---|
| Nombre | VSCO 2 Community Edition (Versilian Studios Chamber Orchestra 2) |
| Autor | Versilian Studios / Sam Gossner |
| Licencia | CC0 1.0 (dominio público) |
| SPDX | `CC0-1.0` |
| URL original | https://github.com/sgossner/VSCO-2-CE (distribución WAV original) |
| Fecha de descarga | 2026-09-08 (solo `Strings/Solo Violin/Arco Vib`) |

## Obligaciones

**Ninguna.** Verificado leyendo el archivo `LICENSE` del repositorio: es el
texto íntegro de CC0 1.0 Universal. No exige atribución ni conservar avisos.
Uso comercial, redistribución y modificación permitidos sin condiciones.

El `Readme.txt` añade dos **peticiones** —no condiciones, que CC0 no admite—:
no vender los samples sueltos, y acreditar a Versilian Studios / Sam Gossner y a
Ivy Audio / Simon Dalzell. Ninguna choca con este proyecto. El mismo readme
confirma expresamente el caso de uso: *"designed for the creation of personal
sample libraries for all purposes, both educational and commercial"*.

Aun así, la política de este proyecto es **acreditar siempre la fuente** en
[ATTRIBUTIONS.md](ATTRIBUTIONS.md) y en el `manifest.json`, por trazabilidad y
cortesía (ver §18 de la especificación).

Atribución de cortesía:

```text
Samples from VSCO 2 Community Edition by Versilian Studios (CC0 1.0).
```

## Uso previsto en este proyecto

- strings
- brass
- woodwinds
- orchestral percussion
- ensembles

## Notas de preparación

Verificado contra la descarga real (ver `sources/vsco2/PROVENANCE.md`):

- **El repositorio ES la distribución WAV cruda** (2,33 GB), no un espejo del
  SFZ. Se puede descargar por carpetas con la API de contenidos de GitHub, sin
  clonar nada. Las *releases* de GitHub NO llevan assets adjuntos.
- Raíz: `Brass`, `Keys`, `Miscellania Raw`, `Percussion`, `Strings`,
  `VSCO 1 Percussion`, `Woodwinds`.
- Un archivo por nota, **sin loop points**.
- Convenciones de nombre por instrumento y articulación; el pipeline necesita un
  `input.pattern` específico por instrumento (ver `instruments/*/config.yml`).
- **Dinámicas según instrumento; no todos tienen 3 capas.** El Solo Violin trae
  solo `p` y `f`.
- Afinación del Solo Violin verificada por FFT: etiquetado correcto, sin offset.
