# Phase 1 — informe de revisión humana rápida

## Estado

- Juicios únicos completados: 45/45.
- Filas candidatas representadas: 80.
- Criterio principal: relevancia humana de 0 a 3.

## Ranking

| Posición | Sistema | Media | Excelentes | ≥2 | Débiles | Irrelevantes | Pistas distintas |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | MuQ-MuLan · Segmento | 2.750 | 15/20 | 20/20 | 0/20 | 0/20 | 10 |
| 2 | MuQ-MuLan · Híbrido | 2.650 | 14/20 | 19/20 | 1/20 | 0/20 | 10 |
| 3 | FIGMA · Segmento | 2.650 | 15/20 | 18/20 | 2/20 | 0/20 | 4 |
| 4 | FIGMA · Híbrido | 2.650 | 15/20 | 18/20 | 2/20 | 0/20 | 4 |

## Conclusión provisional

- Candidato recomendado para la siguiente fase: **MuQ-MuLan · Segmento**.
- Obtiene 2.750/3 de media, 20/20 resultados buenos o excelentes y 0 resultados débiles.
- La ventaja sobre el segundo puesto es de 0.100 puntos; es pequeña, pero el ganador evita por completo resultados débiles en esta muestra.
- MuQ-MuLan devuelve 10 pistas top 1 distintas frente a 4 de FIGMA, una ventaja práctica de diversidad.
- Para este proyecto personal no es necesario ampliar ahora al top 2; conviene validar de nuevo al indexar las 115 pistas.

## Resumen por modelo y modo

- Modelo `figma`: media 2.650 sobre 40 resultados.
- Modelo `muq_mulan`: media 2.700 sobre 40 resultados.
- Modo `hybrid`: media 2.650 sobre 40 resultados.
- Modo `segment`: media 2.700 sobre 40 resultados.

## Comparaciones pareadas por consulta

| Sistema A | Sistema B | Gana A | Gana B | Empates | Δ medio A−B |
|---|---|---:|---:|---:|---:|
| FIGMA · Segmento | FIGMA · Híbrido | 0 | 0 | 20 | +0.000 |
| FIGMA · Segmento | MuQ-MuLan · Segmento | 5 | 5 | 10 | -0.100 |
| FIGMA · Segmento | MuQ-MuLan · Híbrido | 5 | 4 | 11 | +0.000 |
| FIGMA · Híbrido | MuQ-MuLan · Segmento | 5 | 5 | 10 | -0.100 |
| FIGMA · Híbrido | MuQ-MuLan · Híbrido | 5 | 4 | 11 | +0.000 |
| MuQ-MuLan · Segmento | MuQ-MuLan · Híbrido | 1 | 0 | 19 | +0.100 |

## Resultados débiles

- **MuQ-MuLan · Híbrido** — `fantasy flute without epic orchestra` → Marching Through City Gates (0–25 s): 1/3.
- **FIGMA · Segmento** — `epic music` → Raven Lullaby (42–67 s): 1/3.
- **FIGMA · Segmento** — `fantasy flute without epic orchestra` → Quest for Avalon (0–25 s): 1/3.
- **FIGMA · Híbrido** — `epic music` → Raven Lullaby (42–67 s): 1/3.
- **FIGMA · Híbrido** — `fantasy flute without epic orchestra` → Quest for Avalon (0–25 s): 1/3.

## Límites

- La muestra mide top 1 en 20 consultas inglesas y 15 pistas; no evalúa todavía el catálogo completo.
- Las similitudes internas de modelos distintos no se comparan entre sí; el ranking usa únicamente juicio humano.
- Los criterios complementarios tienen poca cobertura: instrumento 3/45, ánimo 1/45 y contradicción 0/45.
- Una ampliación al top 2 queda como validación opcional si se necesita más confianza antes de integrar.
