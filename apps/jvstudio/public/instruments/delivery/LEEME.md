# JV Instrument Library v1 — entrega para JV Studio

**17 instrumentos · 789 samples · 71.5 MB** · entrega del 2026-09-13

## Qué hay aquí

| | |
|---|---|
| `dist/` | El material. Un directorio autónomo por instrumento |
| `schema/` | El JSON Schema v1 **congelado** y la documentación del formato |
| `docs/integration.md` | **El contrato.** Cómo consumirlo, y el presupuesto de carga |
| `licenses/` | Licencias y atribuciones |
| `CATALOGO.md` | Los 17 instrumentos con todos sus datos |
| `NOTA-TECNICA.md` | **Particularidades conocidas.** Leer antes de integrar |
| `index.json` | El catálogo, legible por máquina |

## Por dónde empezar

1. **`docs/integration.md`** — cómo lo consume un `InstrumentFactory`, y sobre
   todo el presupuesto de carga: *14,56 MB de OGG se expanden a ~399 MB de PCM
   al decodificar*. El cuello de botella no es la descarga.
2. **`NOTA-TECNICA.md`** — seis particularidades conocidas y aceptadas.
3. **`CATALOGO.md`** — qué hay y con qué parámetros.

## Tres cosas que no conviene saltarse

- **`jv-grand-piano` y `jv-soft-piano` exigen atribución** (CC BY 3.0). El texto
  está en su `manifest.json` y en su `LICENSE.txt`. No es opcional.
- **`dist/<id>/v1/` es inmutable.** Si un instrumento cambia, sube su `version` y
  estrena carpeta. Por eso se puede cachear indefinidamente.
- **Los `gainDb` son un conjunto**, no valores sueltos: salen de igualar los 17
  a −26,5 LUFS. Cambiar uno rompe el balance.

## Verificar la entrega

```bash
python tools/verify_dist.py dist/*/v1      # schema + checksums + cobertura
```

Los 17 instrumentos validan contra el schema congelado y sus SHA-256 coinciden.
