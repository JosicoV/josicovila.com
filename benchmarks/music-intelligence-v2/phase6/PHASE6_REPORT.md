# Fase 6 — Búsqueda híbrida (literal + semántica)

Validación local. No se ha desplegado nada ni se ha tocado el frontend.

## El problema

MuQ-MuLan relaciona audio con descripciones. De los títulos no sabe nada, así
que buscar por nombre era prácticamente aleatorio:

| Consulta | Título esperado | Puesto (sólo semántica) |
| --- | --- | --- |
| `guide` | The Guide Girl | 5 |
| `avalon` | Quest for Avalon | 6 |
| `edge` | The edge of the unknown | fuera del top-8 |
| `dragon rage` | Dragon Rage | fuera del top-8 |
| `pegasus` | Pegasus | fuera del top-8 |

## Resultado

| Métrica | Sólo semántica | Híbrida |
| --- | --- | --- |
| Título esperado en el puesto 1 | 0/12 | **12/12** |
| Título esperado en el top 3 | 2/12 | 12/12 |
| Título esperado en el top 8 | 9/12 | 12/12 |
| Solape del top-5 en consultas descriptivas | — | **1.00** |
| Consultas descriptivas que cambian de primero | — | **0/6** |

Las 12 búsquedas por título pasan al primer puesto y **ninguna consulta
descriptiva se mueve**. No hay que elegir entre una cosa y la otra.

## Cómo se decide el peso de cada señal

La intención se clasifica por la consulta (identificador / mixta / descriptiva)
y después **se corrige con lo que hay en el catálogo**, en los dos sentidos:

- Si algún título coincide **exactamente**, se trata como identificador aunque
  la consulta sea larga. Sin esto, teclear entero `the edge of the unknown`
  (cinco palabras) se leería como una descripción.
- Si **ningún** título cubre la consulta entera, una consulta corta se rebaja a
  mixta. Sin esto, `dark guide` premiaba a cualquier título con la palabra
  `dark` sin que ninguno fuera el buscado.

Esa corrección fue lo que subió el solape semántico de 0,967 a 1,00.

## Recuento dinámico

`limit` es un máximo, no una cuota. Comparación de las tres estrategias sobre
las 28 consultas:

| Estrategia | Media de resultados | Devuelve menos de 8 |
| --- | --- | --- |
| absoluta | 6,43 | 10/28 |
| **relativa** (elegida) | **3,68** | **24/28** |
| codo | 4,04 | 16/28 |

La relativa es la única que distingue bien los dos casos. La absoluta devuelve
8 casi siempre; la del codo cortaba a 1 una consulta descriptiva (`epic
orchestral music with choir`), que es justo lo que no se quiere.

### Mínimo por intención

Bajar el umbral general para que las descriptivas devolvieran más no funciona:

| ratio | efecto |
| --- | --- |
| 0,55 | descriptivas 4-8, títulos 1 |
| 0,45 | descriptivas 5-8 |
| 0,35 | casi todo a 8 |
| 0,25 | todo a 8 |

De 0,45 hacia abajo el filtro deja de existir. El problema tampoco era el
listón: era que **un único resultado en una búsqueda descriptiva se siente
roto** —la promesa es descubrir— mientras que en una búsqueda por título es
exactamente lo correcto.

Se resuelve con un mínimo distinto según la intención, sin rebajar la calidad
en todas las búsquedas:

```text
identificador → 1
mixta         → 3
descriptiva   → 4
```

Resultado sobre las 28 consultas:

| Intención | Consultas | Media | Rango |
| --- | --- | --- | --- |
| identificador | 13 | 1,1 | 1-2 |
| mixta | 4 | 6,2 | 4-8 |
| descriptiva | 11 | 6,0 | 4-8 |

## Latencia

| Etapa | Sólo semántica | Híbrida |
| --- | --- | --- |
| Embedding de texto (MuQ) | 22,21 ms | 20,19 ms |
| Recuperación | 0,53 ms | 0,49 ms |
| Reranking | 0,12 ms | **4,93 ms** |
| **Total** | **22,90 ms** | **25,66 ms** |

El coste literal es de ~5 ms sobre 115 pistas, una cuarta parte de lo que
cuesta el embedding. No hace falta optimizar nada.

## Español

| Consulta | Idioma | Se busca | Primero |
| --- | --- | --- | --- |
| `guide` | en | `guide` | The Guide Girl |
| `musica oscura pero tranquila` | es | `dark but quiet music` | The dark side |
| `musica medieval suave con flauta` | es | `gentle medieval music with flute` | Live |

La coincidencia literal usa la consulta **original**, no la traducida: los
títulos del catálogo están en inglés y traducirlos rompería el emparejamiento.
La ruta semántica sigue pasando por OPUS-MT sin cambios.

## Material para revisión humana

- `hybrid_comparison.json` — las 28 consultas en los dos modos, con todas las
  puntuaciones internas y los cortes que daría cada estrategia.
- `human_review_hybrid.csv` — 448 filas con las columnas `human_relevance` y
  `notes` en blanco para rellenar.

## Ajustes recomendados antes de producción

1. **Validar que una búsqueda por título devuelva un solo resultado.** Es
   correcto según el criterio de la fase, pero conviene verlo en pantalla: quizá
   se prefieran 2 o 3. Se ajusta con `relative_ratio` (0,55 ahora).
2. **`dragon` devuelve 2 resultados** habiendo tres títulos con esa palabra.
   Revisar si es el comportamiento deseado.
3. Los pesos están todos en `service/hybrid.py`, en `WEIGHTS`. No hay números
   sueltos por el código.
