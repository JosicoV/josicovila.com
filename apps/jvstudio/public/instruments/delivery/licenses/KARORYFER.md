# Karoryfer Samples

| Campo | Valor |
|---|---|
| Nombre | Karoryfer Samples (Karoryfer Lecolds) |
| Autor | D. Smolken y colaboradores |
| Licencia | CC0 1.0 Universal |
| SPDX | `CC0-1.0` |
| Repositorios | https://github.com/sfzinstruments (`karoryfer.*`) |
| Tienda / página | https://shop.karoryfer.com |
| Fecha de autorización | 2026-09-08 |
| Auditoría | [`../docs/AUDITORIA-FUENTES-2026-09.md`](../docs/AUDITORIA-FUENTES-2026-09.md) |

## Obligaciones

**Ninguna.** Verificado leyendo el archivo de licencia de cada repositorio: es el
texto íntegro de CC0 1.0 Universal. Uso comercial, redistribución y modificación
permitidos sin condiciones.

Los readme añaden:

> «Royalty-free for all commercial and non-commercial use.
> Copyright 2014 Karoryfer Lecolds.»

No es una restricción: es la declaración de intención habitual junto a CC0.

Aun así, política del proyecto: **acreditar siempre la fuente**.

```text
Samples from Karoryfer Samples (karoryfer.com), CC0 1.0.
```

## Librerías auditadas

| Librería | Instrumento | Estado |
|---|---|---|
| **Emilyguitar** | Epiphone SG, grabada directa | ✅ en uso — `jv-electric-guitar` |
| **Growlybass** | Squier Jazz Bass, grabado directo | ✅ en uso — `jv-electric-bass` |
| Fashionbass | Jazz Bass brillante, rango extendido | auditada, no usada |
| Meatbass | Contrabajo Otto Rubner 1958 | auditada, no usada — única con loops |
| Black & Green Guitars | Dos hollowbody | auditada, no usada |
| Black & Blue Basses | Dos bajos de 5 cuerdas | auditada, no usada |

Las seis son CC0 verificado. Las cuatro no usadas quedan como candidatas para
una eventual v2 con round-robin: hoy el schema descartaría entre el 78 % y el
92 % de su material.

## Trampas encontradas al verificar

1. **La página de Black & Green solo dice «released under CC license»**, sin
   variante. El repositorio sí contiene CC0 1.0 íntegro. No fiarse de la web.
2. **Black & Blue tiene el archivo de licencia en minúscula** (`license`), así
   que una comprobación automática que busque `LICENSE` da 404 y podría
   interpretarse como ausencia de licencia.

## Notas de preparación

- Todo el material de Karoryfer es **MONO**, 44,1 kHz, 24 bit (Fashionbass en
  float32). Es la contrapartida frente a fuentes estéreo.
- Grabado **directo, sin amplificador ni efectos**: permite añadir después
  nuestra propia cadena de proceso.
- **El bajo se etiqueta una octava por encima de lo que suena** (convención de
  notación del bajo). Requiere `note_offset: -12`. Verificado por FFT.
- Nomenclatura `nota_capa_rr.wav`, con la nota al principio del nombre: el
  patrón del pipeline es `{note}_{layer}_{any}.wav`.
