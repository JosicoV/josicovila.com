# Catálogo JV Instrument Library v1

**17 instrumentos · 789 samples · 71.5 MB**
Entrega del 2026-09-13. Formato `schemaVersion: 1`, congelado.

Todos aprobados por escucha crítica y equilibrados a **−26,5 LUFS**
(ITU-R BS.1770) con 0,09 LU de dispersión entre ellos.

## Catálogo

| `id` | Nombre | Categoría | Rango | Canales | Samples | Capas | Tamaño | Licencia |
|---|---|---|---|---|---:|---|---:|---|
| `jv-french-horn` | JV French Horn | brass | C2–C4 | estéreo | 24 | pp/mf/ff | 2.49 MB | CC0-1.0 |
| `jv-trombone` | JV Trombone | brass | D#2–F4 | estéreo | 27 | pp/mf/ff | 4.01 MB | CC0-1.0 |
| `jv-trumpet` | JV Trumpet | brass | F3–C6 | estéreo | 20 | p/f | 2.89 MB | CC0-1.0 |
| `jv-chamber-strings` | JV Chamber Strings | ensemble | C2–D6 | estéreo | 36 | p/f | 5.60 MB | CC0-1.0 |
| `jv-glockenspiel` | JV Glockenspiel | mallets | G5–C8 | estéreo | 18 | pp/mf/ff | 0.57 MB | CC0-1.0 |
| `jv-marimba` | JV Marimba | mallets | F2–C7 | estéreo | 30 | pp/mf/ff | 0.38 MB | CC0-1.0 |
| `jv-grand-piano` | JV Grand Piano | piano | A0–C8 | estéreo | 90 | pp/mf/ff | 14.56 MB | CC-BY-3.0 ⚠️ |
| `jv-soft-piano` | JV Soft Piano | piano | A0–C8 | estéreo | 90 | pp/p/mp | 14.17 MB | CC-BY-3.0 ⚠️ |
| `jv-double-bass` | JV Double Bass | strings | A0–A4 | mono | 85 | pp/p/mf/f/ff | 3.21 MB | CC0-1.0 |
| `jv-electric-bass` | JV Electric Bass | strings | C#1–D#4 | mono | 56 | pp/mf/f/ff | 2.29 MB | CC0-1.0 |
| `jv-electric-guitar` | JV Electric Guitar | strings | C#2–D6 | mono | 72 | pp/mf/f/ff | 1.68 MB | CC0-1.0 |
| `jv-solo-cello` | JV Solo Cello | strings | C2–A5 | mono | 134 | pp/mf/ff | 2.60 MB | LicenseRef-UIowa-MIS |
| `jv-solo-violin` | JV Solo Violin | strings | G3–C7 | estéreo | 30 | p/f | 6.46 MB | CC0-1.0 |
| `jv-clarinet` | JV Clarinet | woodwinds | D3–D6 | estéreo | 30 | pp/mf/ff | 4.41 MB | CC0-1.0 |
| `jv-concert-flute` | JV Concert Flute | woodwinds | C4–C7 | estéreo | 19 | p/f | 2.32 MB | CC0-1.0 |
| `jv-concert-flute-vib` | JV Concert Flute (Vibrato) | woodwinds | C4–C7 | estéreo | 10 | mf | 0.99 MB | CC0-1.0 |
| `jv-oboe` | JV Oboe | woodwinds | A#3–F6 | estéreo | 18 | p/f | 2.81 MB | CC0-1.0 |
| | **17 instrumentos** | | | | **789** | | **71.5 MB** | |

⚠️ = **exige atribución**. Ver la sección siguiente.

## Atribución obligatoria

Solo **2** de los 17 la exigen, ambos de **Salamander Grand Piano V3 (CC BY 3.0)**:

- `jv-grand-piano` — JV Grand Piano
- `jv-soft-piano` — JV Soft Piano

El texto exacto está en `source.attribution` de su `manifest.json` y en el
`LICENSE.txt` que acompaña a cada instrumento. **No es opcional**: CC BY exige
crédito e indicar que el material se modificó.

El resto son CC0 o de uso sin restricciones. Se acreditan por política del
proyecto, no por obligación legal — ver `licenses/ATTRIBUTIONS.md`.

## Fuentes

| Fuente | Licencia | Instrumentos |
|---|---|---:|
| Karoryfer Samples | CC0-1.0 | 3 |
| Salamander Grand Piano V3 | CC-BY-3.0 | 2 |
| University of Iowa Musical Instrument Samples | LicenseRef-UIowa-MIS | 1 |
| VSCO 2 Community Edition | CC0-1.0 | 9 |
| Versilian Community Sample Library (VCSL) | CC0-1.0 | 2 |

## Parámetros de reproducción

Valores recomendados que el motor debe aplicar. `gainDb` es el resultado de la
pasada de equilibrio: **cambiar uno rompe el balance de los diecisiete**.

| `id` | attack | release | gainDb | Transp. máx. |
|---|---:|---:|---:|---:|
| `jv-chamber-strings` | 0.05 s | 0.6 s | -3.8 dB | 2 st |
| `jv-clarinet` | 0.03 s | 0.3 s | -4.9 dB | 2 st |
| `jv-concert-flute` | 0.03 s | 0.25 s | -4.7 dB | 3 st |
| `jv-concert-flute-vib` | 0.03 s | 0.25 s | +0.3 dB | 2 st |
| `jv-double-bass` | 0.02 s | 0.4 s | +2.3 dB | 1 st |
| `jv-electric-bass` | 0.001 s | 0.5 s | -1.6 dB | 1 st |
| `jv-electric-guitar` | 0.001 s | 0.4 s | -0.1 dB | 1 st |
| `jv-french-horn` | 0.04 s | 0.5 s | -5.8 dB | 2 st |
| `jv-glockenspiel` | 0.001 s | 0.6 s | -6.6 dB | 4 st |
| `jv-grand-piano` | 0.002 s | 1.2 s | -11.7 dB | 1 st |
| `jv-marimba` | 0.001 s | 0.5 s | -2.9 dB | 3 st |
| `jv-oboe` | 0.03 s | 0.3 s | -6.8 dB | 2 st |
| `jv-soft-piano` | 0.002 s | 1.2 s | -7.3 dB | 1 st |
| `jv-solo-cello` | 0.02 s | 0.4 s | -0.5 dB | 1 st |
| `jv-solo-violin` | 0.02 s | 0.35 s | -7.7 dB | 2 st |
| `jv-trombone` | 0.03 s | 0.4 s | -4.5 dB | 3 st |
| `jv-trumpet` | 0.02 s | 0.3 s | -10.7 dB | 2 st |

