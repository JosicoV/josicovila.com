# Benchmark de Music Intelligence v2

Área aislada para comparar candidatos de búsqueda musical antes de seleccionar un modelo.

## Principios

- Usar primero una muestra representativa de 10 a 20 pistas.
- Evaluar consultas en inglés y español.
- Separar datos de entrada, ejecuciones y resultados revisados.
- Mantener resultados reproducibles y comparables.
- No conectar el benchmark con producción.

## Estructura

- `queries/`: consultas y expectativas de relevancia.
- `fixtures/`: metadatos mínimos de la muestra de pistas.
- `scripts/`: futuros ejecutores y herramientas de evaluación.
- `runs/`: salidas crudas de cada candidato; no se versionan.
- `reports/`: comparativas y conclusiones revisadas.

## Fuente funcional de consultas

`queries/search_benchmark_v2.json` es la fuente funcional versionable de la
batería completa: una lista JSON UTF-8 ordenada de 60 consultas inglesas y
10 españolas. Cada registro contiene exactamente cuatro campos:

- `query_id`: identificador estable (`en001`–`en060`, `es061`–`es070`).
- `text`: texto original, sin normalizar, traducir ni reformular.
- `category`: categoría efectiva de la extracción histórica.
- `language`: `en` o `es`.

Se obtuvo mediante los extractores existentes de `docs/SEARCH_BENCHMARK_V2.md`,
conservando íntegramente sus registros y orden. Ese Markdown permanece intacto
como documento histórico/humano; ya no es necesario para los tests de consultas
ni para la preparación predeterminada.

**Peculiaridad histórica:** las consultas inglesas 41–60 mantienen la categoría
`Style mixtures`. El extractor solo reconocía encabezados `##`, mientras que
las secciones adversarial y conversacional usaban `#`. No se ha corregido esa
clasificación para no alterar los metadatos ni las comparaciones históricas.

`phase2/queries_en.json` y `phase2/queries_es.json` son las salidas derivadas por
idioma de `services/music-intelligence-v2/prepare_phase2.py`, no una segunda
fuente editable. Se mantienen sus rutas y estructura para los consumidores
existentes. Esta separación no modifica esos artefactos históricos.

`--query-source` utiliza por defecto la nueva fuente JSON; `--query-format json`
es el valor predeterminado. Para una extracción histórica explícita puede usarse
`--query-format markdown --query-source <archivo.md>`. No hay autodetección de
formato ni fallback a documentación local. Los comandos antiguos con un
`--query-source` Markdown deben añadir `--query-format markdown`.

Los tests de consultas solo requieren la fuente funcional y archivos
versionados. El test del catálogo de audio y los benchmarks completos siguen
necesitando sus recursos locales independientes; esta separación no los aporta.
